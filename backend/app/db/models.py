import datetime
import uuid
from sqlalchemy import Column, String, Integer, DateTime, Boolean, Text, ForeignKey, Float
from sqlalchemy.orm import relationship
from app.db.database import Base

def generate_uuid():
    return str(uuid.uuid4())

class Department(Base):
    __tablename__ = "departments"

    id = Column(String, primary_key=True, default=generate_uuid)
    name = Column(String, unique=True, nullable=False)
    code = Column(String, unique=True, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    users = relationship("User", back_populates="department")
    documents = relationship("Document", back_populates="department")

class User(Base):
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=generate_uuid)
    username = Column(String, unique=True, nullable=False)
    email = Column(String, unique=True, nullable=False)
    full_name = Column(String, nullable=False)
    hashed_password = Column(String, nullable=False)
    role = Column(String, nullable=False, default="RECIPIENT")  # SUPER_ADMIN, DEPT_ADMIN, RECIPIENT, INVESTIGATOR
    department_id = Column(String, ForeignKey("departments.id"), nullable=True)
    
    # Post-Quantum Public Keys (ML-KEM & ML-DSA Base64)
    ml_kem_public_key = Column(Text, nullable=True)
    ml_kem_private_key = Column(Text, nullable=True)  # Demo local container encrypted
    ml_dsa_public_key = Column(Text, nullable=True)
    ml_dsa_private_key = Column(Text, nullable=True)  # Demo local container encrypted
    
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    department = relationship("Department", back_populates="users")
    decryption_sessions = relationship("DecryptionSession", back_populates="recipient")

class Document(Base):
    __tablename__ = "documents"

    id = Column(String, primary_key=True, default=generate_uuid)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    filename = Column(String, nullable=False)
    original_path = Column(String, nullable=False)
    file_size = Column(Integer, nullable=False)
    sha3_256_hash = Column(String, nullable=False)
    classification = Column(String, nullable=False)  # PUBLIC, INTERNAL, CONFIDENTIAL, SECRET, TOP_SECRET
    department_id = Column(String, ForeignKey("departments.id"), nullable=False)
    uploader_id = Column(String, ForeignKey("users.id"), nullable=False)
    is_encrypted = Column(Boolean, default=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    department = relationship("Department", back_populates="documents")
    encrypted_package = relationship("EncryptedDocumentPackage", back_populates="document", uselist=False)
    decryption_sessions = relationship("DecryptionSession", back_populates="document")

class EncryptedDocumentPackage(Base):
    __tablename__ = "encrypted_document_packages"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    encrypted_file_path = Column(String, nullable=False)
    encrypted_sha3_hash = Column(String, nullable=False)
    nonce_base64 = Column(String, nullable=False)
    algorithm_id = Column(String, default="AES-256-GCM + ML-KEM-768")
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="encrypted_package")
    key_encapsulations = relationship("RecipientKeyEncapsulation", back_populates="encrypted_package")

class RecipientKeyEncapsulation(Base):
    __tablename__ = "recipient_key_encapsulations"

    id = Column(String, primary_key=True, default=generate_uuid)
    package_id = Column(String, ForeignKey("encrypted_document_packages.id"), nullable=False)
    recipient_id = Column(String, ForeignKey("users.id"), nullable=False)
    ml_kem_ciphertext_base64 = Column(Text, nullable=False)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

    encrypted_package = relationship("EncryptedDocumentPackage", back_populates="key_encapsulations")

class DecryptionSession(Base):
    __tablename__ = "decryption_sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    document_id = Column(String, ForeignKey("documents.id"), nullable=False)
    recipient_id = Column(String, ForeignKey("users.id"), nullable=False)
    forensic_identifier = Column(String, unique=True, nullable=False)
    watermarked_file_path = Column(String, nullable=False)
    watermarked_artifact_hash = Column(String, nullable=False)
    ml_dsa_signature_base64 = Column(Text, nullable=False)
    decryption_timestamp = Column(DateTime, default=datetime.datetime.utcnow)

    document = relationship("Document", back_populates="decryption_sessions")
    recipient = relationship("User", back_populates="decryption_sessions")

class LedgerRecord(Base):
    __tablename__ = "ledger_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    index = Column(Integer, unique=True, nullable=False)
    timestamp = Column(DateTime, default=datetime.datetime.utcnow)
    event_type = Column(String, nullable=False)  # DOCUMENT_UPLOAD, ENCRYPTION, DISTRIBUTION, DECRYPTION_WATERMARK, INVESTIGATION
    document_id = Column(String, nullable=True)
    recipient_id = Column(String, nullable=True)
    forensic_identifier = Column(String, nullable=True)
    payload_hash = Column(String, nullable=False)
    previous_hash = Column(String, nullable=False)
    record_hash = Column(String, nullable=False)
    ml_dsa_signature = Column(Text, nullable=True)

class SecurityAlert(Base):
    __tablename__ = "security_alerts"

    id = Column(String, primary_key=True, default=generate_uuid)
    severity = Column(String, nullable=False)  # LOW, MEDIUM, HIGH, CRITICAL
    alert_type = Column(String, nullable=False)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=False)
    related_document_id = Column(String, nullable=True)
    related_user_id = Column(String, nullable=True)
    status = Column(String, default="ACTIVE")  # ACTIVE, ACKNOWLEDGED, RESOLVED
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class Investigation(Base):
    __tablename__ = "investigations"

    id = Column(String, primary_key=True, default=generate_uuid)
    case_number = Column(String, unique=True, nullable=False)
    title = Column(String, nullable=False)
    investigator_id = Column(String, ForeignKey("users.id"), nullable=False)
    leaked_file_path = Column(String, nullable=False)
    evidence_hash = Column(String, nullable=False)
    status = Column(String, default="IN_PROGRESS")  # IN_PROGRESS, COMPLETED, INCONCLUSIVE
    
    # Forensic Extraction Output
    recovered_forensic_id = Column(String, nullable=True)
    matched_document_id = Column(String, nullable=True)
    matched_recipient_id = Column(String, nullable=True)
    matched_session_id = Column(String, nullable=True)
    extraction_confidence = Column(Float, default=0.0)
    signature_verified = Column(Boolean, default=False)
    ledger_verified = Column(Boolean, default=False)
    report_file_path = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)

class LoginSecurityState(Base):
    __tablename__ = "login_security_states"

    user_id = Column(String, ForeignKey("users.id"), primary_key=True)
    failed_attempts = Column(Integer, nullable=False, default=0)
    is_locked = Column(Boolean, nullable=False, default=False)
    locked_at = Column(DateTime, nullable=True)
    updated_at = Column(DateTime, default=datetime.datetime.utcnow, onupdate=datetime.datetime.utcnow)

class LoginApprovalRequest(Base):
    __tablename__ = "login_approval_requests"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    username = Column(String, nullable=False)
    device_id = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    status = Column(String, nullable=False, default="PENDING")
    requested_at = Column(DateTime, default=datetime.datetime.utcnow)
    reviewed_by_user_id = Column(String, ForeignKey("users.id"), nullable=True)
    reviewed_at = Column(DateTime, nullable=True)
    review_note = Column(Text, nullable=True)

class LoginSession(Base):
    __tablename__ = "login_sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=False)
    token_id = Column(String, unique=True, nullable=False)
    device_id = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    active = Column(Boolean, nullable=False, default=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    revoked_at = Column(DateTime, nullable=True)

class AuthenticationEvent(Base):
    __tablename__ = "authentication_events"

    id = Column(String, primary_key=True, default=generate_uuid)
    user_id = Column(String, ForeignKey("users.id"), nullable=True)
    username = Column(String, nullable=False)
    event_type = Column(String, nullable=False)
    outcome = Column(String, nullable=False)
    ip_address = Column(String, nullable=True)
    user_agent = Column(Text, nullable=True)
    device_id = Column(String, nullable=True)
    details = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.datetime.utcnow)
