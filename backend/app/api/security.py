from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import Document, DecryptionSession, SecurityAlert, Investigation, User
from app.ledger.offline_ledger import OfflineLedger
from app.core.security import get_current_user, require_roles, ROLE_SUPER_ADMIN, ROLE_DEPT_ADMIN, ROLE_INVESTIGATOR

router = APIRouter(prefix="/api/security", tags=["Security Monitoring"])

@router.get("/dashboard-stats")
def get_dashboard_stats(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    total_docs = db.query(Document).count()
    encrypted_docs = db.query(Document).filter(Document.is_encrypted == True).count()
    total_recipients = db.query(User).filter(User.role == "RECIPIENT").count()
    decryption_events = db.query(DecryptionSession).count()
    active_alerts = db.query(SecurityAlert).filter(SecurityAlert.status == "ACTIVE").count()
    pending_cases = db.query(Investigation).filter(Investigation.status == "IN_PROGRESS").count()

    ledger_health = OfflineLedger.verify_ledger_integrity(db)

    return {
        "total_documents": total_docs,
        "encrypted_documents": encrypted_docs,
        "active_recipients": total_recipients,
        "decryption_events": decryption_events,
        "active_alerts": active_alerts,
        "pending_investigations": pending_cases,
        "ledger_status": ledger_health["status"],
        "ledger_is_valid": ledger_health["is_valid"],
        "total_ledger_records": ledger_health["total_records"],
        "quorum_status": ledger_health["quorum_status"],
        "offline_system_status": "ONLINE (Air-Gapped Local Cluster)"
    }

@router.get("/alerts")
def get_security_alerts(
    current_user: dict = Depends(require_roles(ROLE_SUPER_ADMIN, ROLE_DEPT_ADMIN, ROLE_INVESTIGATOR)),
    db: Session = Depends(get_db)
):
    alerts = db.query(SecurityAlert).order_by(SecurityAlert.created_at.desc()).all()
    result = []
    for a in alerts:
        result.append({
            "id": a.id,
            "severity": a.severity,
            "alert_type": a.alert_type,
            "title": a.title,
            "description": a.description,
            "status": a.status,
            "created_at": a.created_at.isoformat()
        })
    return result
