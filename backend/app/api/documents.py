import os
import hashlib
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Document, EncryptedDocumentPackage, RecipientKeyEncapsulation, User, Department
from app.core.security import get_current_user, require_roles, ROLE_SUPER_ADMIN, ROLE_DEPT_ADMIN, ROLE_RECIPIENT
from app.core.config import DOCUMENTS_DIR, ENCRYPTED_DIR
from app.crypto.pqc_engine import PQCEngine
from app.ledger.offline_ledger import OfflineLedger

router = APIRouter(prefix="/api/documents", tags=["Documents"])

class EncryptDistributionRequest(BaseModel):
    recipient_ids: List[str]

@router.post("")
async def upload_document(
    title: str = Form(...),
    description: Optional[str] = Form(None),
    classification: str = Form("CONFIDENTIAL"),
    file: UploadFile = File(...),
    current_user: dict = Depends(require_roles(ROLE_SUPER_ADMIN, ROLE_DEPT_ADMIN)),
    db: Session = Depends(get_db)
):
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF documents are supported in current prototype.")

    file_bytes = await file.read()
    file_size = len(file_bytes)
    sha3_hash = hashlib.sha3_256(file_bytes).hexdigest()

    saved_filename = f"{sha3_hash[:16]}_{file.filename}"
    file_path = os.path.join(DOCUMENTS_DIR, saved_filename)
    
    with open(file_path, "wb") as f:
        f.write(file_bytes)

    doc = Document(
        title=title,
        description=description,
        filename=file.filename,
        original_path=file_path,
        file_size=file_size,
        sha3_256_hash=sha3_hash,
        classification=classification,
        department_id=current_user.get("department_id"),
        uploader_id=current_user.get("sub"),
        is_encrypted=False
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    OfflineLedger.append_event(
        db=db,
        event_type="DOCUMENT_UPLOAD",
        document_id=doc.id,
        recipient_id=current_user.get("sub"),
        forensic_identifier="N/A",
        payload_data={
            "title": doc.title,
            "classification": doc.classification,
            "sha3_256_hash": doc.sha3_256_hash,
            "uploader": current_user.get("username")
        }
    )

    return {
        "id": doc.id,
        "title": doc.title,
        "filename": doc.filename,
        "file_size": doc.file_size,
        "sha3_256_hash": doc.sha3_256_hash,
        "classification": doc.classification,
        "is_encrypted": doc.is_encrypted,
        "created_at": doc.created_at.isoformat()
    }

@router.get("")
def list_documents(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
    result = []
    for d in docs:
        dept_name = d.department.name if d.department else "General"
        pkg = d.encrypted_package
        recipient_count = len(pkg.key_encapsulations) if pkg else 0
        authorized_recipient_ids = {encap.recipient_id for encap in pkg.key_encapsulations} if pkg else set()
        result.append({
            "id": d.id,
            "title": d.title,
            "description": d.description,
            "filename": d.filename,
            "file_size": d.file_size,
            "sha3_256_hash": d.sha3_256_hash,
            "classification": d.classification,
            "department_name": dept_name,
            "is_encrypted": d.is_encrypted,
            "is_authorized_recipient": current_user.get("sub") in authorized_recipient_ids,
            "recipient_count": recipient_count,
            "created_at": d.created_at.isoformat()
        })
    return result

@router.post("/{doc_id}/encrypt-distribute")
def encrypt_and_distribute(
    doc_id: str,
    req: EncryptDistributionRequest,
    current_user: dict = Depends(require_roles(ROLE_SUPER_ADMIN, ROLE_DEPT_ADMIN)),
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == doc_id).first()
    if not doc:
        raise HTTPException(status_code=404, detail="Document not found")
    if doc.is_encrypted or doc.encrypted_package:
        raise HTTPException(status_code=409, detail="This document has already been distributed")

    recipients = db.query(User).filter(
        User.id.in_(req.recipient_ids),
        User.role == ROLE_RECIPIENT,
        User.is_active.is_(True)
    ).all()
    if not recipients:
        raise HTTPException(status_code=400, detail="No valid recipients selected")
    if {recipient.id for recipient in recipients} != set(req.recipient_ids):
        raise HTTPException(status_code=400, detail="Only active recipient accounts can receive documents")

    with open(doc.original_path, "rb") as f_in:
        plaintext = f_in.read()

    # Fresh random content key
    content_key = os.urandom(32)
    ciphertext, nonce = PQCEngine.encrypt_document_payload(plaintext, content_key)

    enc_filename = f"ENC_{doc.sha3_256_hash[:16]}.bin"
    enc_file_path = os.path.join(ENCRYPTED_DIR, enc_filename)
    with open(enc_file_path, "wb") as f_enc:
        f_enc.write(ciphertext)

    enc_sha3 = hashlib.sha3_256(ciphertext).hexdigest()

    enc_package = EncryptedDocumentPackage(
        document_id=doc.id,
        encrypted_file_path=enc_file_path,
        encrypted_sha3_hash=enc_sha3,
        nonce_base64=PQCEngine.encode_base64(nonce),
        algorithm_id="AES-256-GCM + NIST ML-KEM-768"
    )
    db.add(enc_package)
    db.commit()
    db.refresh(enc_package)

    # Encapsulate content key using ML-KEM for EACH recipient
    for rec in recipients:
        if not rec.ml_kem_public_key:
            pk, sk = PQCEngine.generate_ml_kem_keypair()
            rec.ml_kem_public_key = PQCEngine.encode_base64(pk)
            rec.ml_kem_private_key = PQCEngine.encode_base64(sk)
            db.commit()

        rec_pk = PQCEngine.decode_base64(rec.ml_kem_public_key)
        
        # NIST ML-KEM Encapsulation
        kem_ct, shared_key = PQCEngine.ml_kem_encapsulate(rec_pk)
        
        # Wrap document content_key using recipient's shared_key
        wrapped_key = PQCEngine.wrap_content_key(content_key, shared_key)
        
        # Combined encapsulation payload = kem_ct (1088 bytes) + wrapped_key (32 bytes)
        full_encap_bytes = kem_ct + wrapped_key

        encap_record = RecipientKeyEncapsulation(
            package_id=enc_package.id,
            recipient_id=rec.id,
            ml_kem_ciphertext_base64=PQCEngine.encode_base64(full_encap_bytes)
        )
        db.add(encap_record)

    doc.is_encrypted = True
    db.commit()

    OfflineLedger.append_event(
        db=db,
        event_type="DISTRIBUTION",
        document_id=doc.id,
        recipient_id="MULTI_RECIPIENT",
        forensic_identifier="N/A",
        payload_data={
            "document_title": doc.title,
            "recipients_count": len(recipients),
            "algorithm": enc_package.algorithm_id,
            "encrypted_sha3": enc_sha3
        }
    )

    return {
        "status": "SUCCESS",
        "message": f"Document encrypted and distributed to {len(recipients)} recipients using NIST ML-KEM-768.",
        "encrypted_package_id": enc_package.id,
        "recipients_authorized": len(recipients)
    }
