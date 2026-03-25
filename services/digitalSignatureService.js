/**
 * Digital Signature Service
 * Implements RSA digital signatures for document signing and verification
 */

import crypto from 'crypto';
import fs from 'fs';
import path from 'path';

class DigitalSignatureService {
  /**
   * Generate RSA key pair for a user (typically done once during user creation)
   */
  static generateKeyPair() {
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: {
        type: 'spki',
        format: 'pem'
      },
      privateKeyEncoding: {
        type: 'pkcs8',
        format: 'pem'
      }
    });

    return { publicKey, privateKey };
  }

  /**
   * Sign a document with a private key
   */
  static signDocument(document, privateKey) {
    const sign = crypto.createSign('sha256');
    const documentString = typeof document === 'string' ? document : JSON.stringify(document);
    sign.update(documentString);
    const signature = sign.sign(privateKey, 'hex');
    return signature;
  }

  /**
   * Verify a document signature with a public key
   */
  static verifySignature(document, signature, publicKey) {
    try {
      const verify = crypto.createVerify('sha256');
      const documentString = typeof document === 'string' ? document : JSON.stringify(document);
      verify.update(documentString);
      return verify.verify(publicKey, signature, 'hex');
    } catch (err) {
      console.error('Signature verification error:', err);
      return false;
    }
  }

  /**
   * Hash a document (SHA-256)
   */
  static hashDocument(document) {
    const documentString = typeof document === 'string' ? document : JSON.stringify(document);
    return crypto.createHash('sha256').update(documentString).digest('hex');
  }

  /**
   * Store keys securely (in production, use HSM or KMS)
   */
  static storeKeys(userId, publicKey, privateKey) {
    const keysDir = path.join(process.cwd(), '.keys');
    try {
      fs.mkdirSync(keysDir, { recursive: true });
      
      // Store public key (can be shared)
      fs.writeFileSync(
        path.join(keysDir, `${userId}_public.pem`),
        publicKey,
        { mode: 0o644 }
      );

      // Store private key (must be protected)
      fs.writeFileSync(
        path.join(keysDir, `${userId}_private.pem`),
        privateKey,
        { mode: 0o600 } // Read/write for owner only
      );

      return true;
    } catch (err) {
      console.error('Error storing keys:', err);
      return false;
    }
  }

  /**
   * Load keys from storage
   */
  static loadKeys(userId) {
    const keysDir = path.join(process.cwd(), '.keys');
    try {
      const publicKey = fs.readFileSync(
        path.join(keysDir, `${userId}_public.pem`),
        'utf8'
      );
      const privateKey = fs.readFileSync(
        path.join(keysDir, `${userId}_private.pem`),
        'utf8'
      );
      return { publicKey, privateKey };
    } catch (err) {
      console.error('Error loading keys:', err);
      return null;
    }
  }

  /**
   * Create a signed document object with metadata
   */
  static createSignedDocument(document, publicKey, privateKey, signerInfo = {}) {
    const documentHash = this.hashDocument(document);
    const signature = this.signDocument(document, privateKey);
    
    return {
      document: document,
      documentHash: documentHash,
      signature: signature,
      publicKey: publicKey,
      signerInfo: {
        timestamp: new Date().toISOString(),
        ...signerInfo
      },
      verified: false
    };
  }

  /**
   * Verify a signed document object
   */
  static verifySingedDocument(signedDoc) {
    if (!signedDoc || !signedDoc.signature || !signedDoc.publicKey) {
      return { valid: false, error: 'Invalid signed document format' };
    }

    const isValid = this.verifySignature(
      signedDoc.document,
      signedDoc.signature,
      signedDoc.publicKey
    );

    const hash = this.hashDocument(signedDoc.document);
    const hashMatches = hash === signedDoc.documentHash;

    return {
      valid: isValid && hashMatches,
      signatureValid: isValid,
      hashMatches: hashMatches,
      error: isValid && hashMatches ? null : 'Signature verification failed'
    };
  }
}

export default DigitalSignatureService;
