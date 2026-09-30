# RAKSHA DOC Security Architecture & Cryptographic Policies
**SIH 2026 | PS ID: 26237**

## Cryptographic Controls Implemented

### 1. NIST Post-Quantum Cryptography (PQC) Standards
- **NIST ML-KEM-768 (FIPS 203)**: Key Encapsulation Mechanism used to encapsulate fresh AES-256 content encryption keys for multi-recipient classified document distribution.
- **NIST ML-DSA-65 (FIPS 204)**: Module-Lattice-Based Digital Signature Algorithm used by authorized officers to sign decryption provenance records.

### 2. Symmetric Document Payload Encryption
- **AES-256-GCM**: Authenticated Encryption with Associated Data (AEAD). Uses 96-bit unique nonces and 128-bit authentication tags to prevent plaintext tampering.

### 3. Hashing & Chain Linkage
- **SHA3-256 / SHA3-512**: Used for calculating document content integrity digests, watermark parity checks, and ledger record hash linkage.

### 4. Authentication & Key Store Separation
- Passwords hashed using `pbkdf2_sha256` / `bcrypt`.
- Non-admin sign-ins require explicit super-admin approval; four consecutive password failures lock the account until a super-admin unlocks it.
- Each account has one active browser session. Device IDs are browser-generated identifiers and are not hardware-backed device attestation.
- Private signing keys are stored locally within encrypted key containers under recipient control. Private keys are NEVER transmitted to server endpoints.

---

## Technical Limitations & Deterrence Boundaries
1. **Screen Capture Deterrence**:
   - Web applications running inside standard browsers cannot physically prevent operating-system level screen recording or external camera photography.
   - The PDF contains a recipient-specific invisible forensic watermark for post-leak attribution. It does not visually deter screenshots or external camera photography.
