# RAKSHA DOC Threat Model & Security Boundaries
**SIH 2026 | PS ID: 26237**

## Threat Matrix

| Threat / Attack Vector | Risk Level | Mitigation Control Implemented in RAKSHA DOC |
| :--- | :--- | :--- |
| **Quantum Computer Cryptanalysis** | CRITICAL | NIST ML-KEM-768 (FIPS 203) Key Encapsulation & NIST ML-DSA-65 (FIPS 204) Digital Signatures. |
| **Document Leak by Authorized Officer** | HIGH | Recipient-specific invisible forensic watermark embedded at decryption + SHA3-256 hash-linked offline ledger record. |
| **Ledger Record Tampering / Modification** | HIGH | SHA3-256 hash linkage + ML-DSA recipient signatures + 3-Node Quorum Checkpoint Consensus (MoD, CabSec, NFB). |
| **Eavesdropping on LAN Distribution** | MEDIUM | AES-256-GCM authenticated payload encryption. |
| **Repudiation of Decryption Access** | HIGH | Mandatory ML-DSA digital signature on decryption provenance receipt. |
| **Screen Capture / Camera Photo** | MEDIUM | No visual deterrent; an invisible recipient-specific watermark supports post-leak attribution. |

---

## Security Boundaries & Guarantees
- **Quantum Resistance**: Post-quantum algorithms prevent retrospective decryption of intercepted traffic by future quantum computers.
- **Attribution Evidence**: Watermark extraction identifies the specific decryption session and recipient credentials associated with the leaked copy. Human legal investigation is required before formal disciplinary action.
