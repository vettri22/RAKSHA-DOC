import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from app.db.database import engine, Base, SessionLocal
from app.api import auth, documents, decryption, ledger, forensics, security, demo
from app.core.config import APP_NAME, APP_TAGLINE, DEPARTMENT_NAME

# Create all database tables automatically
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=f"{APP_NAME} — {APP_TAGLINE}",
    description="SIH 2026 PS ID: 26237 | Secure Government Document Distribution, Post-Quantum Forensic Watermarking & Immutable Provenance Platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register API Routers
app.include_router(auth.router)
app.include_router(documents.router)
app.include_router(decryption.router)
app.include_router(ledger.router)
app.include_router(forensics.router)
app.include_router(security.router)
app.include_router(demo.router)

@app.on_event("startup")
def startup_event():
    """Auto-seed demo environment on backend launch."""
    db = SessionLocal()
    try:
        demo.seed_demo_environment(db)
    finally:
        db.close()

@app.get("/api/health")
def health_check():
    return {
        "status": "HEALTHY",
        "app": APP_NAME,
        "tagline": APP_TAGLINE,
        "department": DEPARTMENT_NAME,
        "mode": "Air-Gapped Local Cluster",
        "pqc_algorithms": ["NIST ML-KEM-768 (FIPS 203)", "NIST ML-DSA-65 (FIPS 204)"],
        "cipher": "AES-256-GCM + SHA3-256"
    }

# Mount static built frontend dist directory if available
dist_path = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist"))
if os.path.exists(dist_path):
    app.mount("/assets", StaticFiles(directory=os.path.join(dist_path, "assets")), name="assets")

    @app.get("/{full_path:path}")
    def serve_frontend(full_path: str):
        if full_path.startswith("api"):
            return None
        file_path = os.path.join(dist_path, full_path)
        if os.path.exists(file_path) and os.path.isfile(file_path):
            return FileResponse(file_path)
        return FileResponse(os.path.join(dist_path, "index.html"))
