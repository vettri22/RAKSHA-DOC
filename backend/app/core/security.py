import time
import hashlib
import datetime
from typing import Optional, Dict, Any
import jwt
from passlib.context import CryptContext
from fastapi import HTTPException, Security, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from app.core.config import SECRET_KEY, ALGORITHM
from app.db.database import get_db
from app.db.models import LoginSession

pwd_context = CryptContext(schemes=["pbkdf2_sha256", "bcrypt"], deprecated="auto")
security_scheme = HTTPBearer()

# Role Constants
ROLE_SUPER_ADMIN = "SUPER_ADMIN"
ROLE_DEPT_ADMIN = "DEPT_ADMIN"
ROLE_RECIPIENT = "RECIPIENT"
ROLE_INVESTIGATOR = "INVESTIGATOR"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        # Fallback simple sha3 verify
        return hashlib.sha3_256(plain_password.encode()).hexdigest() == hashed_password

def get_password_hash(password: str) -> str:
    try:
        return pwd_context.hash(password)
    except Exception:
        return hashlib.sha3_256(password.encode()).hexdigest()

def create_access_token(data: dict, expires_delta: Optional[int] = None) -> str:
    to_encode = data.copy()
    now = int(time.time())
    expire = now + (expires_delta if expires_delta else 86400)
    to_encode.update({"iat": now, "exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> Dict[str, Any]:
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.PyJWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired authentication token",
            headers={"WWW-Authenticate": "Bearer"},
        )

def get_current_user(
    credentials: HTTPAuthorizationCredentials = Security(security_scheme),
    db: Session = Depends(get_db)
) -> Dict[str, Any]:
    token = credentials.credentials
    payload = decode_access_token(token)
    token_id = payload.get("jti")
    session = db.query(LoginSession).filter(
        LoginSession.token_id == token_id,
        LoginSession.user_id == payload.get("sub"),
        LoginSession.active.is_(True)
    ).first()
    if not session or session.expires_at <= datetime.datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid, expired, or revoked authentication session",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return payload

def require_roles(*allowed_roles: str):
    def role_dependency(current_user: Dict[str, Any] = Depends(get_current_user)) -> Dict[str, Any]:
        if current_user.get("role") not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions to access this resource"
            )
        return current_user

    return role_dependency
