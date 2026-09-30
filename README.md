# RAKSHA DOC
**Secure Document Distribution, Post-Quantum Forensic Watermarking & Immutable Provenance Platform**
*Smart India Hackathon 2026 | PS ID: 26237*
**Team:** VS TECH

---

## 🛡️ Executive Summary

**RAKSHA DOC** is an offline-first, post-quantum secure document distribution, decryption attribution, and digital forensic provenance platform engineered for Indian government departments, Defence ministries, authorized officers, and forensic investigators.

### Key Capabilities Built:
1. **NIST Post-Quantum Cryptography Engine**:
   - **NIST ML-KEM (FIPS 203)**: Key Encapsulation Mechanism for encapsulating AES-256 content keys per recipient.
   - **NIST ML-DSA (FIPS 204)**: Digital Signature Algorithm for signing recipient decryption provenance events.
   - **AES-256-GCM + SHA3-256**: Authenticated payload encryption and cryptographic digests.
2. **Invisible Forensic Watermarking Subsystem**:
   - Multi-layer PDF embedding (Metadata stream + Canvas text micro-positioning + Spatial markers).
   - 128-bit recipient/session forensic identifier with parity error correction & sync markers.
   - Recoverable payload extraction with confidence scoring (0-100%).
3. **Immutable Offline Hash-Linked Blockchain Ledger**:
   - Local SHA3-256 append-only provenance chain with ML-DSA signature verification.
   - 3-Node Quorum consensus simulator (Ministry of Defence, Cabinet Secretariat, National Forensic Bureau).
4. **Forensic Leak Investigation Workbench**:
   - Upload leaked file -> Extract watermark -> Verify ML-DSA signature -> Match offline ledger -> Generate signed court-ready PDF evidence report.
5. **Government Portal & Multilingual i18n**:
   - Light (White/Navy/Saffron/Green accents) & Dark (Deep Navy/Charcoal) government UI themes.
   - Extensible i18n localization in **English**, **Hindi (हिन्दी)**, and **Tamil (தமிழ்)**.
6. **Air-Gapped LAN Operation**:
   - Zero external cloud, RPC, internet API, or public blockchain dependencies.

---

## 🚀 Quick Start Guide

### Prerequisites
- Python 3.11+
- Node.js 20+ & npm

### Running Backend (FastAPI)
```bash
cd backend
python -m venv venv
# Activate venv: source venv/bin/activate (Linux/Mac) or venv\Scripts\activate (Windows)
pip install -r requirements.txt
python -c "from app.main import app; import uvicorn; uvicorn.run(app, host='0.0.0.0', port=8000)"
```

### Running Frontend (React + Vite)
```bash
cd frontend
npm install
npm run dev
```

Open `http://localhost:3000` in your browser.

### Deploy to Render
- In Render, choose **New → Blueprint** and connect this repository; `render.yaml` defines the web service and persistent disk.
- If creating a Web Service manually, use the repository root (`.`) as the Root Directory, select **Docker** as the runtime, set the Dockerfile path to `./Dockerfile`, and the Docker context to `.`. No separate install, build, or output-directory values are needed; the Dockerfile builds the Vite app and runs FastAPI.
- The persistent disk is mounted at `/var/data`; it stores SQLite and uploaded/generated files. Keep it attached to the service.
- On first deployment, retrieve `RAKSHA_ADMIN_PASSWORD` from the Render service environment and use it with username `admin`. Render also generates the stable `RAKSHA_SECRET_KEY`.
- This setup deploys the UI and API on one origin. Do not deploy only the `frontend` folder to Vercel for this configuration.

### First Login & Access Approval
- Local development seeds the super-admin as `admin` / `admin123`. Render generates `RAKSHA_ADMIN_PASSWORD`; use its value from the service's Environment settings for the initial super-admin login.
- Open **Account Access Review**. Review each non-admin sign-in request and approve or deny it; the user must retry sign-in after approval.
- Non-admin users require approval for every new sign-in. The seeded demo super-admin is the only account that does not require approval.
- Four consecutive incorrect passwords lock an account. A super-admin must review and unlock it in **Account Access Review**.
- Only one active device session is allowed per account. A sign-in from another browser/device is denied until a super-admin reviews the request; approving it revokes the previous session.
- Device identity uses a persistent browser ID. Clearing browser storage or using private browsing appears as a new device and requires approval again. This prototype cannot prove hardware identity.

---

## 🔐 Synthetic Demo Accounts
| Role | Username | Password | Rank / Designation |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin` | `admin123` | System Administrator |
| **Dept Admin / Owner** | `dept_admin` | `admin123` | Brigadier R. S. Mehta |
| **Recipient A** | `officer_a` | `admin123` | Col. Rajesh Sharma (Defence Ops) |
| **Recipient B** | `officer_b` | `admin123` | Cdr. Anita Verma (Naval Cryptography) |
| **Recipient C** | `officer_c` | `admin123` | Gp Capt. Vikram Singh (Air Force Cyber) |
| **Investigator** | `investigator` | `admin123` | Dr. Suresh Kumar (Chief Forensic Officer) |

---

## 🏆 SIH Jury Presentation Guide
Navigate to the **SIH Jury Demonstration Mode** menu item in the application, and click **"Run Live 3-Officer Demo Simulation"** to execute the end-to-end multi-recipient encryption, independent watermarked decryptions, leak attribution, and tamper verification scenario in one click!
