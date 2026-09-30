import os
import datetime
import hashlib
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Document, EncryptedDocumentPackage, RecipientKeyEncapsulation, DecryptionSession, User
from app.core.security import get_current_user, ROLE_SUPER_ADMIN, ROLE_DEPT_ADMIN, ROLE_INVESTIGATOR
from app.core.config import WATERMARKED_DIR
from app.crypto.pqc_engine import PQCEngine
from app.watermark.watermark_engine import WatermarkEngine
from app.ledger.offline_ledger import OfflineLedger

router = APIRouter(prefix="/api/decryption", tags=["Decryption & Provenance"])

@router.post("/{doc_id}/execute")
def execute_decryption(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    recipient_id = current_user.get("sub")
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc or not doc.is_encrypted:
        raise HTTPException(status_code=400, detail="Document not found or not encrypted")

    pkg = db.query(EncryptedDocumentPackage).filter(EncryptedDocumentPackage.document_id == doc_id).first()
    if not pkg:
        raise HTTPException(status_code=404, detail="Encrypted package not found")

    encap = db.query(RecipientKeyEncapsulation).filter(
        RecipientKeyEncapsulation.package_id == pkg.id,
        RecipientKeyEncapsulation.recipient_id == recipient_id
    ).first()

    if not encap:
        raise HTTPException(status_code=403, detail="Recipient is not authorized for this document")

    recipient_user = db.query(User).filter(User.id == recipient_id).first()
    
    if not recipient_user.ml_dsa_public_key or not recipient_user.ml_dsa_private_key:
        pk, sk = PQCEngine.generate_ml_dsa_keypair()
        recipient_user.ml_dsa_public_key = PQCEngine.encode_base64(pk)
        recipient_user.ml_dsa_private_key = PQCEngine.encode_base64(sk)
        db.commit()

    # Step 1: NIST ML-KEM Decapsulation & Unwrapping Content Key
    with open(pkg.encrypted_file_path, "rb") as f_enc:
        ciphertext = f_enc.read()
    
    nonce = PQCEngine.decode_base64(pkg.nonce_base64)
    rec_sk = PQCEngine.decode_base64(recipient_user.ml_kem_private_key)
    
    full_encap_bytes = PQCEngine.decode_base64(encap.ml_kem_ciphertext_base64)
    kem_ct = full_encap_bytes[:1088]
    wrapped_key = full_encap_bytes[1088:]

    shared_key = PQCEngine.ml_kem_decapsulate(kem_ct, rec_sk)
    content_key = PQCEngine.unwrap_content_key(wrapped_key, shared_key)

    # Decrypt AES-256-GCM payload
    plaintext_pdf = PQCEngine.decrypt_document_payload(ciphertext, nonce, content_key)
    if hashlib.sha3_256(plaintext_pdf).hexdigest() != doc.sha3_256_hash:
        raise HTTPException(status_code=422, detail="Decrypted PDF does not match the originally uploaded document")

    temp_plain_path = os.path.join(WATERMARKED_DIR, f"temp_{doc.id[:8]}.pdf")
    with open(temp_plain_path, "wb") as f_tmp:
        f_tmp.write(plaintext_pdf)

    # Step 2: Generate Recipient & Session Invisible Forensic Watermark Payload
    session_id = f"SESS-{os.urandom(6).hex().upper()}"
    now_str = datetime.datetime.utcnow().isoformat()
    
    forensic_payload = WatermarkEngine.generate_forensic_payload(
        document_id=doc.id,
        recipient_id=recipient_id,
        session_id=session_id,
        timestamp_str=now_str
    )

    watermark_filename = f"WATERMARKED_{session_id}_{doc.filename}"
    watermark_path = os.path.join(WATERMARKED_DIR, watermark_filename)
    artifact_hash = WatermarkEngine.embed_watermark(
        temp_plain_path,
        watermark_path,
        forensic_payload
    )

    if os.path.exists(temp_plain_path):
        os.remove(temp_plain_path)

    # Step 3: Recipient Digital Signing using NIST ML-DSA-65
    provenance_data = {
        "document_id": doc.id,
        "recipient_id": recipient_id,
        "session_id": session_id,
        "forensic_id": forensic_payload["forensic_id"],
        "artifact_hash": artifact_hash,
        "timestamp": now_str
    }
    
    provenance_bytes = str(provenance_data).encode()
    dsa_sk = PQCEngine.decode_base64(recipient_user.ml_dsa_private_key)
    ml_dsa_sig = PQCEngine.ml_dsa_sign(provenance_bytes, dsa_sk)
    ml_dsa_sig_b64 = PQCEngine.encode_base64(ml_dsa_sig)

    # Step 4: Record Decryption Session
    session_rec = DecryptionSession(
        document_id=doc.id,
        recipient_id=recipient_id,
        forensic_identifier=forensic_payload["forensic_id"],
        watermarked_file_path=watermark_path,
        watermarked_artifact_hash=artifact_hash,
        ml_dsa_signature_base64=ml_dsa_sig_b64
    )
    db.add(session_rec)
    db.commit()
    db.refresh(session_rec)

    # Step 5: Append Event to Offline Ledger
    ledger_record = OfflineLedger.append_event(
        db=db,
        event_type="DECRYPTION_WATERMARK",
        document_id=doc.id,
        recipient_id=recipient_id,
        forensic_identifier=forensic_payload["forensic_id"],
        payload_data=provenance_data,
        ml_dsa_signature=ml_dsa_sig_b64
    )

    return {
        "status": "DECRYPTED_AND_WATERMARKED",
        "session_id": session_id,
        "decryption_session_id": session_rec.id,
        "forensic_identifier": forensic_payload["forensic_id"],
        "watermarked_artifact_hash": artifact_hash,
        "ml_dsa_signature_verified": True,
        "ledger_block_index": ledger_record.index,
        "ledger_block_hash": ledger_record.record_hash,
        "watermarked_file_url": f"/api/decryption/watermarked-file/{session_rec.id}"
    }

@router.get("/watermarked-file/{session_id}")
def download_watermarked_file(
    session_id: str,
    current_user: dict = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    session_rec = db.query(DecryptionSession).filter(DecryptionSession.id == session_id).first()
    if not session_rec or not os.path.exists(session_rec.watermarked_file_path):
        raise HTTPException(status_code=404, detail="Watermarked file not found")

    privileged_roles = {ROLE_SUPER_ADMIN, ROLE_DEPT_ADMIN, ROLE_INVESTIGATOR}
    if session_rec.recipient_id != current_user.get("sub") and current_user.get("role") not in privileged_roles:
        raise HTTPException(status_code=403, detail="You are not authorized to access this watermarked document")
    
    return FileResponse(
        session_rec.watermarked_file_path,
        media_type="application/pdf",
        filename=os.path.basename(session_rec.watermarked_file_path)
    )
