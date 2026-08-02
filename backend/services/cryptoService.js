import crypto from 'crypto';
import 'dotenv/config';

const ALGORITHM = 'aes-256-gcm';
const IV_LENGTH = 16;
const SALT_LENGTH = 64;
const TAG_LENGTH = 16;
const KEY_LENGTH = 32;

// The master key must be 32 bytes for AES-256
// We hash the master key from .env to ensure it is exactly 32 bytes
const MASTER_KEY = crypto.scryptSync(
  process.env.BIOMETRIC_MASTER_KEY || 'default_insecure_key_1234567890',
  'salt_for_biometric_key',
  KEY_LENGTH
);

class CryptoService {
  /**
   * Encrypt a plain text string
   */
  encrypt(plainText) {
    if (!plainText) return null;
    
    const iv = crypto.randomBytes(IV_LENGTH);
    const salt = crypto.randomBytes(SALT_LENGTH);
    
    // We derive a unique key for each encryption using the master key and random salt
    const key = crypto.pbkdf2Sync(MASTER_KEY, salt, 100000, KEY_LENGTH, 'sha512');
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv);
    
    let encrypted = cipher.update(plainText, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    const tag = cipher.getAuthTag();
    
    // Return the format: iv:salt:tag:encrypted
    return `${iv.toString('hex')}:${salt.toString('hex')}:${tag.toString('hex')}:${encrypted}`;
  }

  /**
   * Decrypt an encrypted string
   */
  decrypt(encryptedText) {
    if (!encryptedText) return null;
    
    try {
      const parts = encryptedText.split(':');
      if (parts.length !== 4) throw new Error('Invalid encrypted text format');
      
      const iv = Buffer.from(parts[0], 'hex');
      const salt = Buffer.from(parts[1], 'hex');
      const tag = Buffer.from(parts[2], 'hex');
      const encrypted = parts[3];
      
      const key = crypto.pbkdf2Sync(MASTER_KEY, salt, 100000, KEY_LENGTH, 'sha512');
      
      const decipher = crypto.createDecipheriv(ALGORITHM, key, iv);
      decipher.setAuthTag(tag);
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (err) {
      console.error('[CryptoService] Decryption failed:', err.message);
      return null;
    }
  }
}

export default new CryptoService();
