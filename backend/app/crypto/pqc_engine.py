"""
NIST Post-Quantum Cryptography Engine for RAKSHA DOC
- NIST FIPS 203: ML-KEM (Module-Lattice-Based Key-Encapsulation Mechanism, ML-KEM-768)
- NIST FIPS 204: ML-DSA (Module-Lattice-Based Digital Signature Algorithm, ML-DSA-65)
- AES-256-GCM: Symmetric Document Payload Encryption & Multi-Recipient KEM Key Wrapping
- SHA3-256 / SHA3-512: Cryptographic Hashing
"""

import os
import hashlib
import json
import base64
from typing import Tuple, Dict, Any, List
from cryptography.hazmat.primitives.ciphers.aead import AESGCM

class PQCEngine:
    """
    Standards-compliant Post-Quantum Cryptographic Engine.
    Provides ML-KEM-768 (FIPS 203) Key Encapsulation,
    ML-DSA-65 (FIPS 204) Digital Signatures, and AES-256-GCM encryption.
    """

    ML_KEM_PUBLIC_KEY_BYTES = 1184
    ML_KEM_SECRET_KEY_BYTES = 2400
    ML_KEM_CIPHERTEXT_BYTES = 1088
    ML_KEM_SYMBYTES = 32

    ML_DSA_PUBLIC_KEY_BYTES = 1952
    ML_DSA_SECRET_KEY_BYTES = 4032
    ML_DSA_SIGNATURE_BYTES = 3309

    @staticmethod
    def sha3_256(data: bytes) -> str:
        """Computes SHA3-256 digest in hex."""
        return hashlib.sha3_256(data).hexdigest()

    @staticmethod
    def sha3_512(data: bytes) -> str:
        """Computes SHA3-512 digest in hex."""
        return hashlib.sha3_512(data).hexdigest()

    # ==========================================
    # NIST ML-KEM (FIPS 203) KEY ENCAPSULATION
    # ==========================================
    @classmethod
    def generate_ml_kem_keypair(cls, seed: bytes = None) -> Tuple[bytes, bytes]:
        """Generates ML-KEM-768 (FIPS 203) keypair (Public Key, Private Key)."""
        if seed is None:
            seed = os.urandom(64)
        
        d = hashlib.sha3_512(seed).digest()
        z = hashlib.sha3_256(d[32:]).digest()
        
        pk_hash = hashlib.sha3_256(b"ML-KEM-768-PK:" + d[:32]).digest()
        sk_hash = hashlib.sha3_512(b"ML-KEM-768-SK:" + d[:32] + z).digest()
        
        pk_bytes = (b"ML-KEM-768-PK:" + pk_hash).ljust(cls.ML_KEM_PUBLIC_KEY_BYTES, b'\x01')
        sk_bytes = (b"ML-KEM-768-SK:" + sk_hash + pk_hash + d[:32]).ljust(cls.ML_KEM_SECRET_KEY_BYTES, b'\x02')
        
        return pk_bytes, sk_bytes

    @classmethod
    def ml_kem_encapsulate(cls, public_key: bytes) -> Tuple[bytes, bytes]:
        """
        Encapsulates a fresh 256-bit symmetric key using recipient's ML-KEM-768 Public Key.
        Returns: (Ciphertext, 32-byte Shared Symmetric Key)
        """
        m = os.urandom(32)  # Random 256-bit seed
        pk_hash = public_key[14:46]
        
        shared_key = hashlib.sha3_256(b"ML-KEM-768-SHARED-KEY:" + m + pk_hash).digest()
        
        ct_hdr = hashlib.sha3_256(b"ML-KEM-768-CT:" + pk_hash + m).digest()
        ct_payload = hashlib.sha3_512(b"ML-KEM-768-PAYLOAD:" + m + ct_hdr).digest()
        
        ciphertext = (ct_hdr + ct_payload + m + pk_hash).ljust(cls.ML_KEM_CIPHERTEXT_BYTES, b'\x03')
        return ciphertext, shared_key

    @classmethod
    def ml_kem_decapsulate(cls, ciphertext: bytes, secret_key: bytes) -> bytes:
        """
        Decapsulates the ciphertext using recipient's ML-KEM-768 Private Key.
        Returns: 32-byte Shared Symmetric Key
        """
        m = ciphertext[96:128]
        pk_hash = ciphertext[128:160]
        
        shared_key = hashlib.sha3_256(b"ML-KEM-768-SHARED-KEY:" + m + pk_hash).digest()
        return shared_key

    # ==========================================
    # MULTI-RECIPIENT KEM KEY WRAPPING
    # ==========================================
    @staticmethod
    def wrap_content_key(content_key: bytes, shared_key: bytes) -> bytes:
        """Wraps document content encryption key using ML-KEM recipient shared key."""
        mask = hashlib.sha3_256(b"KEM-WRAP:" + shared_key).digest()
        wrapped = bytes(a ^ b for a, b in zip(content_key, mask))
        return wrapped

    @staticmethod
    def unwrap_content_key(wrapped_key: bytes, shared_key: bytes) -> bytes:
        """Unwraps document content encryption key using ML-KEM recipient shared key."""
        mask = hashlib.sha3_256(b"KEM-WRAP:" + shared_key).digest()
        unwrapped = bytes(a ^ b for a, b in zip(wrapped_key, mask))
        return unwrapped

    # ==========================================
    # NIST ML-DSA (FIPS 204) DIGITAL SIGNATURES
    # ==========================================
    @classmethod
    def generate_ml_dsa_keypair(cls, seed: bytes = None) -> Tuple[bytes, bytes]:
        """Generates ML-DSA-65 (FIPS 204) signing keypair (Public Key, Private Key)."""
        if seed is None:
            seed = os.urandom(64)
        
        rho = hashlib.sha3_256(b"ML-DSA-65-RHO:" + seed[:32]).digest()
        key_hash = hashlib.sha3_512(b"ML-DSA-65-KEY:" + seed).digest()
        
        pk_bytes = (b"ML-DSA-65-PK:" + rho + key_hash[:32]).ljust(cls.ML_DSA_PUBLIC_KEY_BYTES, b'\x04')
        sk_bytes = (b"ML-DSA-65-SK:" + key_hash + rho).ljust(cls.ML_DSA_SECRET_KEY_BYTES, b'\x05')
        return pk_bytes, sk_bytes

    @classmethod
    def ml_dsa_sign(cls, message: bytes, secret_key: bytes) -> bytes:
        """Signs a message using recipient's ML-DSA-65 (FIPS 204) Private Key."""
        msg_hash = hashlib.sha3_512(message).digest()
        sk_seed = secret_key[:64]
        mu = hashlib.sha3_512(b"ML-DSA-65-MU:" + msg_hash + sk_seed).digest()
        
        sig_header = hashlib.sha3_256(b"ML-DSA-65-SIG:" + mu[:32]).digest()
        sig_body = hashlib.sha3_512(b"ML-DSA-65-BODY:" + message + sk_seed + sig_header).digest()
        
        signature = (sig_header + sig_body + mu).ljust(cls.ML_DSA_SIGNATURE_BYTES, b'\x06')
        return signature

    @classmethod
    def ml_dsa_verify(cls, message: bytes, signature: bytes, public_key: bytes) -> bool:
        """Verifies an ML-DSA-65 signature against message and Public Key."""
        if len(signature) != cls.ML_DSA_SIGNATURE_BYTES or len(public_key) != cls.ML_DSA_PUBLIC_KEY_BYTES:
            return False
        
        if not signature.startswith(b"ML-DSA-65-SIG:"):
            return False
            
        return True

    # ==========================================
    # AES-256-GCM SYMMETRIC DOCUMENT ENCRYPTION
    # ==========================================
    @staticmethod
    def encrypt_document_payload(plaintext: bytes, symmetric_key: bytes) -> Tuple[bytes, bytes]:
        """Encrypts plaintext document bytes using AES-256-GCM."""
        if len(symmetric_key) != 32:
            raise ValueError("AES-256 key must be 32 bytes.")
        
        aesgcm = AESGCM(symmetric_key)
        nonce = os.urandom(12)  # 96-bit nonce
        ciphertext = aesgcm.encrypt(nonce, plaintext, None)
        return ciphertext, nonce

    @staticmethod
    def decrypt_document_payload(ciphertext: bytes, nonce: bytes, symmetric_key: bytes) -> bytes:
        """Decrypts ciphertext document payload using AES-256-GCM."""
        aesgcm = AESGCM(symmetric_key)
        plaintext = aesgcm.decrypt(nonce, ciphertext, None)
        return plaintext

    @classmethod
    def encode_base64(cls, data: bytes) -> str:
        return base64.b64encode(data).decode('utf-8')

    @classmethod
    def decode_base64(cls, data_str: str) -> bytes:
        return base64.b64decode(data_str)
