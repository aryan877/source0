import { createCipheriv, createDecipheriv, randomBytes, scrypt } from 'crypto';
import { promisify } from 'util';

const scryptAsync = promisify(scrypt);

// Get encryption key from environment
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY || 'default-key-change-in-production';

/**
 * Encrypts a string using AES-256-GCM
 * @param text - The text to encrypt
 * @param password - The password to use for encryption (defaults to env var)
 * @returns Base64 encoded encrypted string with format: iv:salt:authTag:encryptedData
 */
export async function encrypt(text: string, password: string = ENCRYPTION_KEY): Promise<string> {
  if (!text) {
    throw new Error('Text to encrypt cannot be empty');
  }

  // Generate random salt and IV
  const salt = randomBytes(16);
  const iv = randomBytes(16);
  
  // Derive key from password and salt
  const key = (await scryptAsync(password, salt, 32)) as Buffer;
  
  // Create cipher
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  
  // Encrypt the text
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  // Get the authentication tag
  const authTag = cipher.getAuthTag();
  
  // Combine IV, salt, authTag, and encrypted data
  const combined = `${iv.toString('base64')}:${salt.toString('base64')}:${authTag.toString('base64')}:${encrypted}`;
  
  return Buffer.from(combined).toString('base64');
}

/**
 * Decrypts a string that was encrypted with the encrypt function
 * @param encryptedData - The Base64 encoded encrypted string
 * @param password - The password used for encryption (defaults to env var)
 * @returns The decrypted plain text
 */
export async function decrypt(encryptedData: string, password: string = ENCRYPTION_KEY): Promise<string> {
  if (!encryptedData) {
    throw new Error('Encrypted data cannot be empty');
  }

  try {
    // Decode base64 and split components
    const combined = Buffer.from(encryptedData, 'base64').toString('utf8');
    const [ivB64, saltB64, authTagB64, encrypted] = combined.split(':');
    
    if (!ivB64 || !saltB64 || !authTagB64 || !encrypted) {
      throw new Error('Invalid encrypted data format');
    }
    
    // Convert back to buffers
    const iv = Buffer.from(ivB64, 'base64');
    const salt = Buffer.from(saltB64, 'base64');
    const authTag = Buffer.from(authTagB64, 'base64');
    
    // Derive key from password and salt
    const key = (await scryptAsync(password, salt, 32)) as Buffer;
    
    // Create decipher
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);
    
    // Decrypt the data
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Checks if a string appears to be encrypted (base64 with our format)
 * @param data - The string to check
 * @returns True if the string appears to be encrypted with our format
 */
export function isEncrypted(data: string): boolean {
  if (!data) return false;
  
  try {
    const decoded = Buffer.from(data, 'base64').toString('utf8');
    const parts = decoded.split(':');
    return parts.length === 4;
  } catch {
    return false;
  }
}

/**
 * Safely encrypts data, handling errors gracefully
 * @param text - The text to encrypt
 * @param password - Optional password override
 * @returns Encrypted string or original string if encryption fails (with error logged)
 */
export async function safeEncrypt(text: string, password?: string): Promise<string> {
  try {
    return await encrypt(text, password);
  } catch (error) {
    console.error('Encryption failed, storing as plaintext:', error);
    return text; // Fallback to plaintext if encryption fails
  }
}

/**
 * Safely decrypts data, handling both encrypted and plaintext data
 * @param data - The data to decrypt (could be encrypted or plaintext)
 * @param password - Optional password override
 * @returns Decrypted string or original string if not encrypted
 */
export async function safeDecrypt(data: string, password?: string): Promise<string> {
  if (!data) return data;
  
  // If it doesn't look encrypted, return as-is
  if (!isEncrypted(data)) {
    return data;
  }
  
  try {
    return await decrypt(data, password);
  } catch (error) {
    console.error('Decryption failed, returning as-is:', error);
    return data; // Fallback to returning the data as-is
  }
}