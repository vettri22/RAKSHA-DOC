# RAKSHA DOC Prototype Limitations & Production Roadmap
**SIH 2026 | PS ID: 26237**

## 1. Implemented Prototype Controls
- Full NIST ML-KEM-768 (FIPS 203) key encapsulation & decapsulation.
- Full NIST ML-DSA-65 (FIPS 204) digital signature generation & verification.
- AES-256-GCM authenticated payload encryption.
- 128-bit invisible PDF forensic watermark embedding & extraction with confidence scoring.
- SHA3-256 hash-linked offline blockchain ledger with 3-node quorum consensus.
- Signed PDF court-ready forensic evidence report generation.
- Full UI in English, Hindi, and Tamil with light/dark government themes.

## 2. Technical Limitations & Honest Disclaimers
1. **Screen Capture Deterrence**: Standard web browsers cannot block OS-level screenshots or physical cameras. Invisible watermarks support attribution after a leak but do not provide visual deterrence.
2. **Watermark Match Attribution**: A watermark match proves cryptographic key usage during decryption, but does not prove physical human presence or legal intent.
3. **Single-Host Prototype Consensus**: The initial demo runs witness nodes locally; production deployments should run independent witness servers on separate physical network hosts.
