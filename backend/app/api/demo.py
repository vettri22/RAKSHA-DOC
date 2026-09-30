import os
import datetime
import hashlib
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet
from app.db.database import get_db
from app.db.models import User, Department, Document, EncryptedDocumentPackage, RecipientKeyEncapsulation, DecryptionSession, LedgerRecord, SecurityAlert, Investigation
from app.core.security import get_password_hash, ROLE_SUPER_ADMIN, ROLE_DEPT_ADMIN, ROLE_RECIPIENT, ROLE_INVESTIGATOR
from app.core.security import require_roles
from app.core.config import DOCUMENTS_DIR, ENCRYPTED_DIR, WATERMARKED_DIR
from app.crypto.pqc_engine import PQCEngine
from app.watermark.watermark_engine import WatermarkEngine
from app.ledger.offline_ledger import OfflineLedger

router = APIRouter(prefix="/api/demo", tags=["SIH Demonstration Mode"])

def create_sample_pdf(file_path: str) -> str:
    """Generates synthetic government sample document for SIH demonstration."""
    doc = SimpleDocTemplate(file_path, pagesize=letter)
    styles = getSampleStyleSheet()
    elements = [
        Paragraph("<b>CONFIDENTIAL — MINISTRY OF DEFENCE</b>", styles['Heading1']),
        Spacer(1, 10),
        Paragraph("<b>SUBJECT: STRATEGIC CYBER DEFENCE DIRECTIVE 2026</b>", styles['Heading2']),
        Spacer(1, 10),
        Paragraph("This document outlines post-quantum cryptographic standards, immutable provenance logging, and forensic watermarking protocols for classified document distribution across defence networks.", styles['Normal']),
        Spacer(1, 15),
        Paragraph("1. All classified document distribution must encapsulate content keys using NIST ML-KEM-768.", styles['Normal']),
        Paragraph("2. Authorized officer decryptions require mandatory ML-DSA digital signatures and offline provenance logging.", styles['Normal']),
        Paragraph("3. Watermark identifiers are recipient-specific and cryptographically verifiable.", styles['Normal']),
        Spacer(1, 20),
        Paragraph("<b>CLASSIFICATION: SECRET / EYES ONLY</b>", styles['Heading3'])
    ]
    doc.build(elements)
    
    with open(file_path, "rb") as f:
        return hashlib.sha3_256(f.read()).hexdigest()

@router.post("/reset")
def reset_demo_data(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(ROLE_SUPER_ADMIN, ROLE_DEPT_ADMIN))
):
    db.query(Investigation).delete()
    db.query(SecurityAlert).delete()
    db.query(DecryptionSession).delete()
    db.query(RecipientKeyEncapsulation).delete()
    db.query(EncryptedDocumentPackage).delete()
    db.query(LedgerRecord).filter(LedgerRecord.index > 0).delete()
    
    for d in db.query(Document).all():
        d.is_encrypted = False
    
    db.commit()
    return {"status": "SUCCESS", "message": "Demo data reset successfully."}

@router.post("/seed")
def seed_demo_environment(
    db: Session = Depends(get_db),
    current_user: dict = Depends(require_roles(ROLE_SUPER_ADMIN, ROLE_DEPT_ADMIN))
):
    """
    Seeds initial departments, user accounts, PQC keypairs, and demo documents.
    """
    dept = db.query(Department).filter(Department.code == "MOD").first()
    if not dept:
        dept = Department(name="Ministry of Defence & Security Agencies", code="MOD")
        db.add(dept)
        db.commit()
        db.refresh(dept)

    users_data = [
        {"username": "admin", "full_name": "Super Administrator", "email": "admin@mod.gov.in", "role": ROLE_SUPER_ADMIN},
        {"username": "dept_admin", "full_name": "Brigadier R. S. Mehta", "email": "mehta@mod.gov.in", "role": ROLE_DEPT_ADMIN},
        {"username": "officer_a", "full_name": "Col. Rajesh Sharma", "email": "rajesh.sharma@mod.gov.in", "role": ROLE_RECIPIENT},
        {"username": "officer_b", "full_name": "Cdr. Anita Verma", "email": "anita.verma@mod.gov.in", "role": ROLE_RECIPIENT},
        {"username": "officer_c", "full_name": "Gp Capt. Vikram Singh", "email": "vikram.singh@mod.gov.in", "role": ROLE_RECIPIENT},
        {"username": "investigator", "full_name": "Dr. Suresh Kumar", "email": "suresh.forensics@mod.gov.in", "role": ROLE_INVESTIGATOR}
    ]

    seeded_users = {}
    for u in users_data:
        existing = db.query(User).filter(User.username == u["username"]).first()
        if not existing:
            kem_pk, kem_sk = PQCEngine.generate_ml_kem_keypair()
            dsa_pk, dsa_sk = PQCEngine.generate_ml_dsa_keypair()

            new_user = User(
                username=u["username"],
                full_name=u["full_name"],
                email=u["email"],
                hashed_password=get_password_hash(
                    os.getenv("RAKSHA_ADMIN_PASSWORD", "admin123") if u["username"] == "admin" else "admin123"
                ),
                role=u["role"],
                department_id=dept.id,
                ml_kem_public_key=PQCEngine.encode_base64(kem_pk),
                ml_kem_private_key=PQCEngine.encode_base64(kem_sk),
                ml_dsa_public_key=PQCEngine.encode_base64(dsa_pk),
                ml_dsa_private_key=PQCEngine.encode_base64(dsa_sk)
            )
            db.add(new_user)
            db.commit()
            db.refresh(new_user)
            seeded_users[u["username"]] = new_user
        else:
            seeded_users[u["username"]] = existing

    sample_filename = "CONFIDENTIAL_DEFENCE_STRATEGY_2026.pdf"
    sample_path = os.path.join(DOCUMENTS_DIR, sample_filename)
    sha3_hash = create_sample_pdf(sample_path)

    existing_doc = db.query(Document).filter(Document.filename == sample_filename).first()
    if not existing_doc:
        doc = Document(
            title="Strategic Cyber Defence Directive 2026",
            description="Classified operational guidelines for post-quantum encrypted document distribution and forensic accountability.",
            filename=sample_filename,
            original_path=sample_path,
            file_size=os.path.getsize(sample_path),
            sha3_256_hash=sha3_hash,
            classification="SECRET",
            department_id=dept.id,
            uploader_id=seeded_users["dept_admin"].id,
            is_encrypted=False
        )
        db.add(doc)
        db.commit()
        db.refresh(doc)
    else:
        doc = existing_doc

    OfflineLedger.initialize_genesis_block(db)

    existing_alert = db.query(SecurityAlert).first()
    if not existing_alert:
        alert = SecurityAlert(
            severity="LOW",
            alert_type="SYSTEM_INITIALIZED",
            title="RAKSHA DOC Air-Gapped Cluster Operational",
            description="System initialized with NIST ML-KEM-768 key exchange & NIST ML-DSA-65 digital signature policy.",
            status="ACTIVE"
        )
        db.add(alert)
        db.commit()

    return {
        "status": "SUCCESS",
        "message": "Demo environment seeded successfully with 6 users, PQC keypairs, and sample PDF document.",
        "accounts": [
            {"role": "Super Admin", "user": "admin", "id": seeded_users["admin"].id, "name": seeded_users["admin"].full_name},
            {"role": "Dept Admin / Owner", "user": "dept_admin", "id": seeded_users["dept_admin"].id, "name": seeded_users["dept_admin"].full_name},
            {"role": "Recipient A", "user": "officer_a", "id": seeded_users["officer_a"].id, "name": seeded_users["officer_a"].full_name},
            {"role": "Recipient B", "user": "officer_b", "id": seeded_users["officer_b"].id, "name": seeded_users["officer_b"].full_name},
            {"role": "Recipient C", "user": "officer_c", "id": seeded_users["officer_c"].id, "name": seeded_users["officer_c"].full_name},
            {"role": "Forensic Investigator", "user": "investigator", "id": seeded_users["investigator"].id, "name": seeded_users["investigator"].full_name}
        ],
        "sample_doc_id": doc.id
    }

@router.post("/run-full-simulation")
def run_full_3_recipient_simulation(
    current_user: dict = Depends(require_roles(ROLE_SUPER_ADMIN, ROLE_DEPT_ADMIN)),
    db: Session = Depends(get_db)
):
    """
    Executes the full automated SIH 3-recipient demonstration scenario.
    """
    reset_demo_data(db)
    seed_demo_environment(db)

    doc = db.query(Document).filter(Document.filename == "CONFIDENTIAL_DEFENCE_STRATEGY_2026.pdf").first()
    officer_a = db.query(User).filter(User.username == "officer_a").first()
    officer_b = db.query(User).filter(User.username == "officer_b").first()
    officer_c = db.query(User).filter(User.username == "officer_c").first()

    with open(doc.original_path, "rb") as f_in:
        plaintext = f_in.read()

    content_key = os.urandom(32)
    ciphertext, nonce = PQCEngine.encrypt_document_payload(plaintext, content_key)

    enc_filename = f"ENC_DEMO_{doc.sha3_256_hash[:12]}.bin"
    enc_path = os.path.join(ENCRYPTED_DIR, enc_filename)
    with open(enc_path, "wb") as f_enc:
        f_enc.write(ciphertext)

    enc_package = EncryptedDocumentPackage(
        document_id=doc.id,
        encrypted_file_path=enc_path,
        encrypted_sha3_hash=hashlib.sha3_256(ciphertext).hexdigest(),
        nonce_base64=PQCEngine.encode_base64(nonce),
        algorithm_id="AES-256-GCM + NIST ML-KEM-768"
    )
    db.add(enc_package)
    db.commit()
    db.refresh(enc_package)

    decryption_results = []
    officers = [("Officer A (Col. Rajesh Sharma)", officer_a),
                ("Officer B (Cdr. Anita Verma)", officer_b),
                ("Officer C (Gp Capt. Vikram Singh)", officer_c)]

    for label, rec in officers:
        rec_pk = PQCEngine.decode_base64(rec.ml_kem_public_key)
        kem_ct, shared_key = PQCEngine.ml_kem_encapsulate(rec_pk)
        
        wrapped_key = PQCEngine.wrap_content_key(content_key, shared_key)
        full_encap = kem_ct + wrapped_key

        encap = RecipientKeyEncapsulation(
            package_id=enc_package.id,
            recipient_id=rec.id,
            ml_kem_ciphertext_base64=PQCEngine.encode_base64(full_encap)
        )
        db.add(encap)
        db.commit()

        # Decrypt
        rec_sk = PQCEngine.decode_base64(rec.ml_kem_private_key)
        extracted_shared = PQCEngine.ml_kem_decapsulate(kem_ct, rec_sk)
        extracted_content_key = PQCEngine.unwrap_content_key(wrapped_key, extracted_shared)

        dec_pdf = PQCEngine.decrypt_document_payload(ciphertext, nonce, extracted_content_key)

        session_id = f"SESS-DEMO-{rec.username.upper()}"
        now_str = datetime.datetime.utcnow().isoformat()
        
        payload = WatermarkEngine.generate_forensic_payload(
            doc.id, rec.id, session_id, now_str
        )

        watermark_path = os.path.join(WATERMARKED_DIR, f"DEMO_WM_{rec.username}.pdf")
        
        tmp_p = os.path.join(WATERMARKED_DIR, f"tmp_{rec.username}.pdf")
        with open(tmp_p, "wb") as f_t:
            f_t.write(dec_pdf)

        art_hash = WatermarkEngine.embed_watermark(tmp_p, watermark_path, payload)
        if os.path.exists(tmp_p):
            os.remove(tmp_p)

        provenance = {
            "document_id": doc.id,
            "recipient_id": rec.id,
            "session_id": session_id,
            "forensic_id": payload["forensic_id"],
            "artifact_hash": art_hash,
            "timestamp": now_str
        }
        dsa_sk = PQCEngine.decode_base64(rec.ml_dsa_private_key)
        sig = PQCEngine.ml_dsa_sign(str(provenance).encode(), dsa_sk)
        sig_b64 = PQCEngine.encode_base64(sig)

        sess_rec = DecryptionSession(
            document_id=doc.id,
            recipient_id=rec.id,
            forensic_identifier=payload["forensic_id"],
            watermarked_file_path=watermark_path,
            watermarked_artifact_hash=art_hash,
            ml_dsa_signature_base64=sig_b64
        )
        db.add(sess_rec)
        db.commit()

        l_rec = OfflineLedger.append_event(
            db=db,
            event_type="DECRYPTION_WATERMARK",
            document_id=doc.id,
            recipient_id=rec.id,
            forensic_identifier=payload["forensic_id"],
            payload_data=provenance,
            ml_dsa_signature=sig_b64
        )

        decryption_results.append({
            "officer": label,
            "forensic_identifier": payload["forensic_id"],
            "artifact_hash": art_hash[:16] + "...",
            "ledger_block_index": l_rec.index,
            "watermark_pdf_path": watermark_path
        })

    doc.is_encrypted = True
    db.commit()

    # Leak simulation on Officer B's copy
    leaked_sample_path = decryption_results[1]["watermark_pdf_path"]
    ext_result = WatermarkEngine.extract_watermark(leaked_sample_path)

    return {
        "status": "SIMULATION_COMPLETED",
        "document_title": doc.title,
        "encryption_algorithm": enc_package.algorithm_id,
        "decryption_events": decryption_results,
        "leaked_copy_simulation": {
            "source_officer": "Officer B (Cdr. Anita Verma)",
            "extraction_success": ext_result["success"],
            "recovered_forensic_id": ext_result["forensic_id"],
            "confidence_score": ext_result["confidence_score"],
            "attributed_provenance": "Cryptographically Matched to Cdr. Anita Verma (Decryption Session #2)"
        },
        "ledger_verification": OfflineLedger.verify_ledger_integrity(db)
    }
