import datetime
import uuid
from fastapi import APIRouter, Depends, HTTPException, Request, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from app.db.database import get_db
from app.db.models import (
    User, LoginSecurityState, LoginApprovalRequest, LoginSession,
    AuthenticationEvent, SecurityAlert
)
from app.core.security import (
    verify_password, create_access_token, get_current_user,
    require_roles, ROLE_SUPER_ADMIN
)

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

class LoginRequest(BaseModel):
    username: str
    password: str
    device_id: str

class LoginApprovalDecision(BaseModel):
    approved: bool
    note: str = ""

class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: dict

@router.post("/login", response_model=TokenResponse)
def login(req: LoginRequest, request: Request, db: Session = Depends(get_db)):
    now = datetime.datetime.utcnow()
    ip_address = request.client.host if request.client else None
    user_agent = request.headers.get("user-agent", "")[:1000]
    user = db.query(User).filter(User.username == req.username).first()
    if not user:
        db.add(AuthenticationEvent(
            username=req.username, event_type="LOGIN_FAILED", outcome="UNKNOWN_ACCOUNT",
            ip_address=ip_address, user_agent=user_agent, device_id=req.device_id
        ))
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid username or password"
        )

    security_state = db.query(LoginSecurityState).with_for_update().filter(
        LoginSecurityState.user_id == user.id
    ).first()
    if security_state and security_state.is_locked:
        db.add(AuthenticationEvent(
            user_id=user.id, username=user.username, event_type="LOGIN_BLOCKED",
            outcome="ACCOUNT_LOCKED", ip_address=ip_address, user_agent=user_agent,
            device_id=req.device_id
        ))
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED,
            detail="Account locked after repeated failed passwords. Admin review is required."
        )

    if not verify_password(req.password, user.hashed_password):
        if not security_state:
            security_state = LoginSecurityState(user_id=user.id, failed_attempts=0, is_locked=False)
            db.add(security_state)
        security_state.failed_attempts += 1
        locked = security_state.failed_attempts > 3
        if locked:
            security_state.is_locked = True
            security_state.locked_at = now
        db.add(AuthenticationEvent(
            user_id=user.id, username=user.username,
            event_type="LOGIN_LOCKED" if locked else "LOGIN_FAILED",
            outcome="LOCKED" if locked else "INVALID_PASSWORD",
            ip_address=ip_address, user_agent=user_agent, device_id=req.device_id,
            details=f"Failed password attempt {security_state.failed_attempts}"
        ))
        if locked:
            db.add(SecurityAlert(
                severity="HIGH", alert_type="LOGIN_ACCOUNT_LOCKED",
                title=f"Account locked: {user.username}",
                description=f"{user.username} exceeded three failed password attempts from {ip_address or 'unknown IP'}. Admin review and unlock are required.",
                related_user_id=user.id
            ))
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_423_LOCKED if locked else status.HTTP_401_UNAUTHORIZED,
            detail="Account locked after repeated failed passwords. Admin review is required." if locked
            else f"Invalid username or password ({security_state.failed_attempts} of 3 failed attempts)"
        )

    if not user.is_active:
        db.add(AuthenticationEvent(
            user_id=user.id, username=user.username, event_type="LOGIN_BLOCKED",
            outcome="INACTIVE_ACCOUNT", ip_address=ip_address, user_agent=user_agent,
            device_id=req.device_id
        ))
        db.commit()
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is inactive")

    if security_state:
        security_state.failed_attempts = 0
        db.commit()

    active_sessions = db.query(LoginSession).filter(
        LoginSession.user_id == user.id,
        LoginSession.active.is_(True),
        LoginSession.expires_at > now
    ).all()
    other_device_session = next((session for session in active_sessions if session.device_id != req.device_id), None)
    if other_device_session:
        approval = db.query(LoginApprovalRequest).filter(
            LoginApprovalRequest.user_id == user.id,
            LoginApprovalRequest.device_id == req.device_id,
            LoginApprovalRequest.status == "PENDING"
        ).first()
        if not approval:
            approval = LoginApprovalRequest(
                user_id=user.id, username=user.username, device_id=req.device_id,
                ip_address=ip_address, user_agent=user_agent
            )
            db.add(approval)
            db.flush()
            db.add(SecurityAlert(
                severity="HIGH", alert_type="SECOND_DEVICE_LOGIN_BLOCKED",
                title=f"Second-device login requires review: {user.username}",
                description=f"A second device attempted to sign in to {user.username} from {ip_address or 'unknown IP'}. Review request {approval.id}.",
                related_user_id=user.id
            ))
        db.add(AuthenticationEvent(
            user_id=user.id, username=user.username, event_type="SECOND_DEVICE_BLOCKED",
            outcome="ADMIN_REVIEW_REQUIRED", ip_address=ip_address, user_agent=user_agent,
            device_id=req.device_id,
            details=f"An active session already exists on another device; active session started {other_device_session.created_at.isoformat()}"
        ))
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"This account is active on another device. Admin review is required before this device can sign in. Request: {approval.id}"
        )

    approval = None
    if user.role != ROLE_SUPER_ADMIN:
        approval = db.query(LoginApprovalRequest).filter(
            LoginApprovalRequest.user_id == user.id,
            LoginApprovalRequest.device_id == req.device_id,
            LoginApprovalRequest.status.in_(["PENDING", "APPROVED"])
        ).order_by(LoginApprovalRequest.requested_at.desc()).first()
        if not approval:
            approval = LoginApprovalRequest(
                user_id=user.id, username=user.username, device_id=req.device_id,
                ip_address=ip_address, user_agent=user_agent
            )
            db.add(approval)
            db.flush()
            db.add(SecurityAlert(
                severity="HIGH", alert_type="LOGIN_APPROVAL_REQUIRED",
                title=f"Login approval required: {user.username}",
                description=f"{user.username} requested sign-in from {ip_address or 'unknown IP'}. Review request {approval.id}.",
                related_user_id=user.id
            ))
        if approval.status == "PENDING":
            db.add(AuthenticationEvent(
                user_id=user.id, username=user.username, event_type="LOGIN_APPROVAL_PENDING",
                outcome="AWAITING_ADMIN", ip_address=ip_address, user_agent=user_agent,
                device_id=req.device_id, details=f"Approval request {approval.id}"
            ))
            db.commit()
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Admin approval is required before sign-in. Request: {approval.id}"
            )
        approval.status = "USED"
    else:
        admin_approval = db.query(LoginApprovalRequest).filter(
            LoginApprovalRequest.user_id == user.id,
            LoginApprovalRequest.device_id == req.device_id,
            LoginApprovalRequest.status == "APPROVED"
        ).order_by(LoginApprovalRequest.requested_at.desc()).first()
        if admin_approval:
            admin_approval.status = "USED"

    for active_session in active_sessions:
        active_session.active = False
        active_session.revoked_at = now

    token_id = str(uuid.uuid4())
    expires_at = now + datetime.timedelta(days=1)
    db.add(LoginSession(
        user_id=user.id, token_id=token_id, device_id=req.device_id,
        ip_address=ip_address, user_agent=user_agent, expires_at=expires_at
    ))
    db.add(AuthenticationEvent(
        user_id=user.id, username=user.username, event_type="LOGIN_SUCCESS",
        outcome="APPROVED", ip_address=ip_address, user_agent=user_agent,
        device_id=req.device_id
    ))
    db.commit()
    
    token = create_access_token({
        "sub": user.id,
        "username": user.username,
        "role": user.role,
        "department_id": user.department_id,
        "jti": token_id
    }, expires_delta=86400)

    dept_name = user.department.name if user.department else "System"

    return {
        "access_token": token,
        "token_type": "bearer",
        "user": {
            "id": user.id,
            "username": user.username,
            "full_name": user.full_name,
            "email": user.email,
            "role": user.role,
            "department_id": user.department_id,
            "department_name": dept_name,
            "ml_kem_public_key": user.ml_kem_public_key,
            "ml_dsa_public_key": user.ml_dsa_public_key
        }
    }

@router.get("/admin/access-control")
def get_access_control(
    current_user: dict = Depends(require_roles(ROLE_SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    requests = db.query(LoginApprovalRequest).order_by(LoginApprovalRequest.requested_at.desc()).limit(100).all()
    sessions = db.query(LoginSession).filter(LoginSession.active.is_(True)).order_by(LoginSession.created_at.desc()).all()
    events = db.query(AuthenticationEvent).order_by(AuthenticationEvent.created_at.desc()).limit(100).all()
    locked_states = db.query(LoginSecurityState).filter(LoginSecurityState.is_locked.is_(True)).all()
    usernames = {user.id: user.username for user in db.query(User).all()}
    return {
        "requests": [{
            "id": item.id, "user_id": item.user_id, "username": item.username,
            "device_id": item.device_id, "ip_address": item.ip_address,
            "user_agent": item.user_agent, "status": item.status,
            "requested_at": item.requested_at.isoformat(), "review_note": item.review_note
        } for item in requests],
        "active_sessions": [{
            "id": item.id, "user_id": item.user_id, "username": usernames.get(item.user_id, "unknown"),
            "device_id": item.device_id, "ip_address": item.ip_address,
            "user_agent": item.user_agent, "created_at": item.created_at.isoformat(),
            "expires_at": item.expires_at.isoformat()
        } for item in sessions],
        "events": [{
            "id": item.id, "user_id": item.user_id, "username": item.username,
            "event_type": item.event_type, "outcome": item.outcome,
            "ip_address": item.ip_address, "device_id": item.device_id,
            "details": item.details, "created_at": item.created_at.isoformat()
        } for item in events],
        "locked_accounts": [{
            "user_id": item.user_id,
            "username": db.query(User).filter(User.id == item.user_id).first().username,
            "failed_attempts": item.failed_attempts,
            "locked_at": item.locked_at.isoformat() if item.locked_at else None
        } for item in locked_states]
    }

@router.post("/admin/access-requests/{request_id}/review")
def review_login_request(
    request_id: str,
    decision: LoginApprovalDecision,
    request: Request,
    current_user: dict = Depends(require_roles(ROLE_SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    approval = db.query(LoginApprovalRequest).filter(LoginApprovalRequest.id == request_id).first()
    if not approval or approval.status != "PENDING":
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Pending login approval request not found")

    now = datetime.datetime.utcnow()
    approval.status = "APPROVED" if decision.approved else "DENIED"
    approval.reviewed_by_user_id = current_user.get("sub")
    approval.reviewed_at = now
    approval.review_note = decision.note[:1000]

    if decision.approved:
        sessions = db.query(LoginSession).filter(
            LoginSession.user_id == approval.user_id,
            LoginSession.active.is_(True)
        ).all()
        for session in sessions:
            session.active = False
            session.revoked_at = now
        db.add(AuthenticationEvent(
            user_id=approval.user_id, username=approval.username,
            event_type="ADMIN_APPROVED_LOGIN", outcome="APPROVED",
            ip_address=request.client.host if request.client else None,
            device_id=approval.device_id,
            details=f"Reviewed by {current_user.get('username')}: {decision.note[:1000]}"
        ))
    else:
        db.add(AuthenticationEvent(
            user_id=approval.user_id, username=approval.username,
            event_type="ADMIN_DENIED_LOGIN", outcome="DENIED",
            ip_address=request.client.host if request.client else None,
            device_id=approval.device_id,
            details=f"Reviewed by {current_user.get('username')}: {decision.note[:1000]}"
        ))
    db.commit()
    return {"status": approval.status, "request_id": approval.id}

@router.post("/admin/accounts/{username}/unlock")
def unlock_account(
    username: str,
    request: Request,
    current_user: dict = Depends(require_roles(ROLE_SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    user = db.query(User).filter(User.username == username).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Account not found")
    state = db.query(LoginSecurityState).filter(LoginSecurityState.user_id == user.id).first()
    if state:
        state.failed_attempts = 0
        state.is_locked = False
        state.locked_at = None
    db.add(AuthenticationEvent(
        user_id=user.id, username=user.username, event_type="ADMIN_UNLOCKED_ACCOUNT",
        outcome="UNLOCKED", ip_address=request.client.host if request.client else None,
        details=f"Unlocked by {current_user.get('username')}"
    ))
    db.commit()
    return {"status": "UNLOCKED", "username": user.username}

@router.post("/admin/sessions/{session_id}/revoke")
def revoke_login_session(
    session_id: str,
    request: Request,
    current_user: dict = Depends(require_roles(ROLE_SUPER_ADMIN)),
    db: Session = Depends(get_db)
):
    session = db.query(LoginSession).filter(
        LoginSession.id == session_id,
        LoginSession.active.is_(True)
    ).first()
    if not session:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Active login session not found")
    session.active = False
    session.revoked_at = datetime.datetime.utcnow()
    db.add(AuthenticationEvent(
        user_id=session.user_id,
        username=db.query(User).filter(User.id == session.user_id).first().username,
        event_type="ADMIN_REVOKED_SESSION", outcome="REVOKED",
        ip_address=request.client.host if request.client else None,
        device_id=session.device_id,
        details=f"Session revoked by {current_user.get('username')}"
    ))
    db.commit()
    return {"status": "REVOKED", "session_id": session.id}

@router.get("/me")
def get_me(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == current_user["sub"]).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    dept_name = user.department.name if user.department else "System"
    return {
        "id": user.id,
        "username": user.username,
        "full_name": user.full_name,
        "email": user.email,
        "role": user.role,
        "department_id": user.department_id,
        "department_name": dept_name,
        "ml_kem_public_key": user.ml_kem_public_key,
        "ml_dsa_public_key": user.ml_dsa_public_key
    }

@router.post("/logout")
def logout(current_user: dict = Depends(get_current_user), db: Session = Depends(get_db)):
    session = db.query(LoginSession).filter(
        LoginSession.token_id == current_user.get("jti"),
        LoginSession.user_id == current_user.get("sub"),
        LoginSession.active.is_(True)
    ).first()
    if session:
        session.active = False
        session.revoked_at = datetime.datetime.utcnow()
        db.add(AuthenticationEvent(
            user_id=current_user.get("sub"), username=current_user.get("username", "unknown"),
            event_type="LOGOUT", outcome="SUCCESS", device_id=session.device_id,
            details="User ended the active session"
        ))
        db.commit()
    return {"status": "LOGGED_OUT"}
