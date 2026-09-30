# RAKSHA DOC SIH 2026 Jury Demonstration Script & Video Guide
**PS ID: 26237**

## 📹 Video Recording & Live Jury Script (3-5 Minutes)

### Phase 1: Problem Statement & Authentication (0:00 - 0:45)
1. **Intro**: Present RAKSHA DOC tagline: *"Secure Distribution. Verifiable Provenance. Accountable Access."*
2. **Log In**: Log in as Super Admin `admin` (`admin123`), open **Account Access Review**, and approve the `dept_admin` request. Then sign in as Department Administrator `dept_admin` (`admin123`).
3. **Show Header**: Point out the Government Portal UI, Light/Dark theme toggle, Language selector (**English**, **Hindi**, **Tamil**), and Air-Gapped Status badge.

### Phase 2: Document Upload & Post-Quantum Encryption (0:45 - 1:30)
1. Navigate to **Classified Document Vault**.
2. Upload a sample PDF document titled `"Strategic Cyber Defence Directive 2026"`.
3. Show that the backend calculates its SHA3-256 integrity hash.
4. Navigate to **Secure Distribution**.
5. Select the document and check the 3 authorized recipients:
   - **Officer A**: Col. Rajesh Sharma (Director Defence Ops)
   - **Officer B**: Cdr. Anita Verma (Naval Cryptography)
   - **Officer C**: Gp Capt. Vikram Singh (Air Force Cyber)
6. Click **"Encrypt & Distribute (NIST ML-KEM-768)"**. Point out that the content key is encapsulated independently for each officer using NIST FIPS 203 standards!

### Phase 3: Recipient Decryption & Invisible Watermarking (1:30 - 2:30)
1. Log in as **Cdr. Anita Verma** (`officer_b` / `admin123`).
2. Open **My Assigned Documents**.
3. Click **"Decrypt Document (ML-KEM)"**.
4. Point out the output:
   - ML-KEM Key Decapsulation successful.
   - Unique 128-bit invisible forensic watermark payload generated.
   - Decryption provenance record signed using Cdr. Anita Verma's **NIST ML-DSA-65** private key.
   - Event committed to the **Immutable Offline Ledger**.
5. Click **"Open Watermarked Document in PDF Viewer"**. The recipient-specific forensic watermark is embedded without visible text or banners.

### Phase 4: Simulated Leak & Forensic Investigation (2:30 - 3:45)
1. Log in as Forensic Investigator **Dr. Suresh Kumar** (`investigator` / `admin123`).
2. Open **Forensic Investigation Workbench**.
3. Upload the leaked document copy.
4. Click **"Run Forensic Watermark Extraction"**.
5. Show the live results:
   - **Extraction Confidence**: 100.0%
   - **Recovered Forensic ID**: `RAKS-8E6048E9...`
   - **Attributed Officer Match**: **Cdr. Anita Verma** (Naval Cryptography)
   - **NIST ML-DSA Signature**: VERIFIED
   - **Offline Ledger Proof**: VALID (3/3 Witness Quorum Approved)
6. Click **"Download Court-Ready Signed PDF Evidence Report"** to show the generated PDF report.

### Phase 5: Ledger Tamper Detection & Air-Gapped Operation (3:45 - 4:30)
1. Navigate to **Immutable Provenance Ledger Explorer**.
2. Click **"SIH Jury Tamper Test"**.
3. Show that malicious alteration of any block immediately breaks the SHA3-256 chain pointers and is rejected by the 3-node quorum!
4. Conclude demonstration.
