import os
import hashlib
from typing import Optional
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Investigation, DecryptionSession, LedgerRecord, User, Document
from app.core.security import get_current_user, require_roles, ROLE_SUPER_ADMIN, ROLE_DEPT_ADMIN, ROLE_INVESTIGATOR
from app.core.config import EVIDENCE_DIR, REPORTS_DIR
from app.watermark.watermark_engine import WatermarkEngine
from app.ledger.offline_ledger import OfflineLedger
from app.forensics.report_generator import ForensicReportGenerator
from app.crypto.pqc_engine import PQCEngine

router = APIRouter(prefix="/api/forensics", tags=["Forensic Investigation"])

@router.post("/cases")
async def create_investigation_case(
    title: str = Form(...),
    file: UploadFile = File(...),
    current_user: dict = Depends(require_roles(ROLE_SUPER_ADMIN, ROLE_DEPT_ADMIN, ROLE_INVESTIGATOR)),
    db: Session = Depends(get_db)
):
    evidence_bytes = await file.read()
    evidence_hash = hashlib.sha3_256(evidence_bytes).hexdigest()

    case_num = f"CASE-{hashlib.sha3_256(evidence_bytes + os.urandom(8)).hexdigest()[:8].upper()}"
    saved_filename = f"{case_num}_{file.filename}"
    file_path = os.path.join(EVIDENCE_DIR, saved_filename)

    with open(file_path, "wb") as f:
        f.write(evidence_bytes)

    # Step 1: Execute Forensic Watermark Extraction Engine
    extraction = WatermarkEngine.extract_watermark(file_path)

    matched_session = None
    matched_recipient = None
    matched_doc = None
    matched_ledger = None
    sig_verified = False
    ledger_verified = False

    if extraction["success"] and extraction["forensic_id"]:
        recovered_fid = extraction["forensic_id"]
        matched_session = db.query(DecryptionSession).filter(
            DecryptionSession.forensic_identifier == recovered_fid
        ).first()

        if matched_session:
            matched_recipient = matched_session.recipient
            matched_doc = matched_session.document
            
            # Step 2: Verify Recipient ML-DSA Digital Signature
            if matched_recipient and matched_recipient.ml_dsa_public_key:
                pk_bytes = PQCEngine.decode_base64(matched_recipient.ml_dsa_public_key)
                sig_bytes = PQCEngine.decode_base64(matched_session.ml_dsa_signature_base64)
                signed_payload = extraction.get("payload") or {}
                
                provenance_data = {
                    "document_id": matched_doc.id,
                    "recipient_id": matched_recipient.id,
                    "session_id": signed_payload.get("session_id"),
                    "forensic_id": matched_session.forensic_identifier,
                    "artifact_hash": matched_session.watermarked_artifact_hash,
                    "timestamp": signed_payload.get("timestamp")
                }
                provenance_bytes = str(provenance_data).encode()
                sig_verified = PQCEngine.ml_dsa_verify(provenance_bytes, sig_bytes, pk_bytes)

            # Step 3: Verify Ledger Record
            matched_ledger = db.query(LedgerRecord).filter(
                LedgerRecord.forensic_identifier == recovered_fid
            ).first()
            
            if matched_ledger:
                ledger_check = OfflineLedger.verify_ledger_integrity(db)
                ledger_verified = ledger_check["is_valid"]

    # Save Investigation Record
    investigation = Investigation(
        case_number=case_num,
        title=title,
        investigator_id=current_user.get("sub"),
        leaked_file_path=file_path,
        evidence_hash=evidence_hash,
        status="COMPLETED" if extraction["success"] else "INCONCLUSIVE",
        recovered_forensic_id=extraction.get("forensic_id"),
        matched_document_id=matched_doc.id if matched_doc else None,
        matched_recipient_id=matched_recipient.id if matched_recipient else None,
        matched_session_id=matched_session.id if matched_session else None,
        extraction_confidence=extraction.get("confidence_score", 0.0),
        signature_verified=sig_verified,
        ledger_verified=ledger_verified
    )
    db.add(investigation)
    db.commit()
    db.refresh(investigation)

    # Step 4: Generate Signed PDF Evidence Report
    report_filename = f"REPORT_{case_num}.pdf"
    report_path = os.path.join(REPORTS_DIR, report_filename)

    investigator_user = db.query(User).filter(User.id == current_user.get("sub")).first()

    report_hash = ForensicReportGenerator.generate_report(
        output_pdf_path=report_path,
        investigation_data={
            "case_number": case_num,
            "title": title,
            "investigator_name": investigator_user.full_name if investigator_user else "Forensic Officer",
            "evidence_hash": evidence_hash,
            "status": investigation.status
        },
        extraction_data=extraction,
        ledger_data={
            "block_index": matched_ledger.index if matched_ledger else 0,
            "previous_hash": matched_ledger.previous_hash if matched_ledger else "N/A",
            "record_hash": matched_ledger.record_hash if matched_ledger else "N/A",
            "quorum_status": "QUORUM_APPROVED (3/3 Nodes)" if ledger_verified else "QUORUM_REJECTED"
        },
        recipient_data={
            "full_name": matched_recipient.full_name if matched_recipient else "Unattributed / External Leak",
            "role": matched_recipient.role if matched_recipient else "Unknown",
            "department_name": matched_recipient.department.name if matched_recipient and matched_recipient.department else "Ministry of Defence",
            "decryption_time": matched_session.decryption_timestamp.isoformat() if matched_session else "N/A"
        }
    )

    investigation.report_file_path = report_path
    db.commit()

    return {
        "case_id": investigation.id,
        "case_number": case_num,
        "status": investigation.status,
        "evidence_hash": evidence_hash,
        "extraction_results": extraction,
        "attributed_recipient": {
            "id": matched_recipient.id,
            "username": matched_recipient.username,
            "full_name": matched_recipient.full_name,
            "email": matched_recipient.email,
            "role": matched_recipient.role,
            "department": matched_recipient.department.name if matched_recipient and matched_recipient.department else "Defence"
        } if matched_recipient else None,
        "signature_verified": sig_verified,
        "ledger_verified": ledger_verified,
        "report_url": f"/api/forensics/reports/{investigation.id}"
    }

@router.get("/cases")
def list_investigations(
    current_user: dict = Depends(require_roles(ROLE_SUPER_ADMIN, ROLE_DEPT_ADMIN, ROLE_INVESTIGATOR)),
    db: Session = Depends(get_db)
):
    cases = db.query(Investigation).order_by(Investigation.created_at.desc()).all()
    result = []
    for c in cases:
        rec = db.query(User).filter(User.id == c.matched_recipient_id).first() if c.matched_recipient_id else None
        result.append({
            "id": c.id,
            "case_number": c.case_number,
            "title": c.title,
            "status": c.status,
            "evidence_hash": c.evidence_hash,
            "recovered_forensic_id": c.recovered_forensic_id,
            "extraction_confidence": c.extraction_confidence,
            "signature_verified": c.signature_verified,
            "ledger_verified": c.ledger_verified,
            "attributed_officer": rec.full_name if rec else "Unattributed",
            "created_at": c.created_at.isoformat()
        })
    return result

@router.get("/reports/{case_id}")
def download_evidence_report(
    case_id: str,
    current_user: dict = Depends(require_roles(ROLE_SUPER_ADMIN, ROLE_DEPT_ADMIN, ROLE_INVESTIGATOR)),
    db: Session = Depends(get_db)
):
    case = db.query(Investigation).filter(Investigation.id == case_id).first()
    if not case or not case.report_file_path or not os.path.exists(case.report_file_path):
        raise HTTPException(status_code=404, detail="Evidence report not found")
    
    return FileResponse(
        case.report_file_path,
        media_type="application/pdf",
        filename=os.path.basename(case.report_file_path)
    )
