import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent.parent
STORAGE_DIR = Path(os.getenv("RAKSHA_STORAGE_DIR", str(BASE_DIR / "storage")))

DOCUMENTS_DIR = STORAGE_DIR / "documents"
ENCRYPTED_DIR = STORAGE_DIR / "encrypted"
WATERMARKED_DIR = STORAGE_DIR / "watermarked"
EVIDENCE_DIR = STORAGE_DIR / "evidence"
REPORTS_DIR = STORAGE_DIR / "reports"

for d in [DOCUMENTS_DIR, ENCRYPTED_DIR, WATERMARKED_DIR, EVIDENCE_DIR, REPORTS_DIR]:
    d.mkdir(parents=True, exist_ok=True)

SECRET_KEY = os.getenv("RAKSHA_SECRET_KEY", "raksha-doc-sih-2026-super-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60 * 24  # 24 hours for demo ease

DATABASE_URL = os.getenv("DATABASE_URL", f"sqlite:///{STORAGE_DIR / 'raksha_doc.db'}")

APP_NAME = "RAKSHA DOC"
APP_TAGLINE = "Secure Distribution. Verifiable Provenance. Accountable Access."
DEPARTMENT_NAME = "Ministry of Defence & Security Agencies"
