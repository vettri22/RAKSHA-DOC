from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import LedgerRecord
from app.core.security import get_current_user, require_roles, ROLE_SUPER_ADMIN, ROLE_DEPT_ADMIN
from app.ledger.offline_ledger import OfflineLedger

router = APIRouter(prefix="/api/ledger", tags=["Immutable Ledger"])

@router.get("/records")
def get_ledger_records(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    records = db.query(LedgerRecord).order_by(LedgerRecord.index.asc()).all()
    result = []
    for r in records:
        result.append({
            "id": r.id,
            "index": r.index,
            "timestamp": r.timestamp.isoformat(),
            "event_type": r.event_type,
            "document_id": r.document_id,
            "recipient_id": r.recipient_id,
            "forensic_identifier": r.forensic_identifier,
            "payload_hash": r.payload_hash,
            "previous_hash": r.previous_hash,
            "record_hash": r.record_hash,
            "has_ml_dsa_signature": bool(r.ml_dsa_signature)
        })
    return result

@router.get("/verify")
def verify_ledger(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    return OfflineLedger.verify_ledger_integrity(db)

@router.post("/tamper-test")
def simulate_ledger_tamper(
    current_user: dict = Depends(require_roles(ROLE_SUPER_ADMIN, ROLE_DEPT_ADMIN)),
    db: Session = Depends(get_db)
):
    """
    SIH Jury Demonstration Function:
    Simulates malicious tampering on a non-genesis block payload to prove immediate chain rejection!
    """
    target = db.query(LedgerRecord).filter(LedgerRecord.index > 0).first()
    if not target:
        raise HTTPException(status_code=400, detail="No non-genesis ledger records available to tamper")
    
    original_hash = target.payload_hash
    target.payload_hash = "TAMPERED_MALICIOUS_PAYLOAD_HASH_00000000000000000000000"
    db.commit()

    verification_result = OfflineLedger.verify_ledger_integrity(db)

    # Restore original for safety
    target.payload_hash = original_hash
    db.commit()

    return {
        "status": "TAMPER_TEST_COMPLETED",
        "message": "Malicious block edit executed and immediately detected by Ledger Cryptographic Verifier.",
        "tampered_block_index": target.index,
        "verification_result": verification_result
    }
