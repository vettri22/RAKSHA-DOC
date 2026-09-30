# RAKSHA DOC Architecture Specification
**SIH 2026 | PS ID: 26237**

## System Architecture Diagram

```
+-----------------------------------------------------------------------------------+
|                              RAKSHA DOC WEB PORTAL                                |
|          React 18 + Vite + Tailwind CSS + i18n (EN / HI / TA)                    |
+-----------------------------------------------------------------------------------+
                                         |
                                (REST API / JSON)
                                         v
+-----------------------------------------------------------------------------------+
|                             FASTAPI BACKEND SERVICE                               |
|                                                                                   |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  |   PQC ENGINE       |   | WATERMARKING ENGINE   |   |   OFFLINE LEDGER       |  |
|  | - NIST ML-KEM-768  |   | - 128-bit Payload     |   | - SHA3-256 Hash Link   |  |
|  | - NIST ML-DSA-65   |   | - Parity ECC          |   | - ML-DSA Signatures    |  |
|  | - AES-256-GCM      |   | - Confidence Analyzer |   | - 3-Node Quorum        |  |
|  +--------------------+   +-----------------------+   +------------------------+  |
|                                                                                   |
|  +--------------------+   +-----------------------+   +------------------------+  |
|  | FORENSIC LAB       |   | AUTH & SECURITY RBAC  |   | SIGNED REPORT GEN      |  |
|  | - Leak Attribution |   | - Passlib / JWT       |   | - ReportLab PDF Engine |  |
|  +--------------------+   +-----------------------+   +------------------------+  |
+-----------------------------------------------------------------------------------+
                                         |
                         (SQLAlchemy ORM + Local Storage)
                                         v
+-----------------------------------------------------------------------------------+
|                        LOCAL STORAGE & SQLITE DATABASE                            |
|  - storage/documents/      - storage/encrypted/     - storage/watermarked/        |
|  - storage/evidence/       - storage/reports/       - raksha_doc.db               |
+-----------------------------------------------------------------------------------+
```

## Component Interoperability
1. **Document Upload**:
   Document uploaded -> SHA3-256 hash computed -> Plaintext PDF saved in `storage/documents/` -> Upload event committed to Offline Ledger.
2. **Post-Quantum Encryption & Key Encapsulation**:
   Random AES-256 content key generated -> Document payload encrypted via AES-256-GCM -> Content key encapsulated independently for each recipient using their **NIST ML-KEM-768** public key.
3. **Recipient Decryption & Watermarking**:
   Recipient authenticates -> Decapsulates ML-KEM content key -> Decrypts AES-256-GCM payload -> Generates unique 128-bit forensic identifier bound to `(document_id, recipient_id, session_id, timestamp)` -> Embeds watermark -> Signs provenance record using recipient's **NIST ML-DSA-65** private key -> Appends SHA3 block to Offline Ledger.
4. **Forensic Leak Investigation**:
   Leaked PDF/image uploaded -> Watermark recovery engine extracts forensic payload -> Matches recovered ID against offline ledger -> Verifies recipient ML-DSA signature -> Generates court-ready PDF evidence report.
