import { createCipheriv, createDecipheriv, randomBytes, scrypt } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);
const ENCRYPTION_KEY = process.env.API_KEY_ENCRYPTION_KEY || "default-key-change-in-production";

export async function encrypt(text: string, password: string = ENCRYPTION_KEY): Promise<string> {
  if (!text) {
    throw new Error("Text to encrypt cannot be empty");
  }

  const salt = randomBytes(16);
  const iv = randomBytes(16);
  const key = (await scryptAsync(password, salt, 32)) as Buffer;
  const cipher = createCipheriv("aes-256-gcm", key, iv);

  let encrypted = cipher.update(text, "utf8", "hex");
  encrypted += cipher.final("hex");

  const authTag = cipher.getAuthTag();
  const combined = `${iv.toString("base64")}:${salt.toString("base64")}:${authTag.toString("base64")}:${encrypted}`;

  return Buffer.from(combined).toString("base64");
}

export async function decrypt(
  encryptedData: string,
  password: string = ENCRYPTION_KEY
): Promise<string> {
  if (!encryptedData) {
    throw new Error("Encrypted data cannot be empty");
  }

  try {
    const combined = Buffer.from(encryptedData, "base64").toString("utf8");
    const [ivB64, saltB64, authTagB64, encrypted] = combined.split(":");

    if (!ivB64 || !saltB64 || !authTagB64 || !encrypted) {
      throw new Error("Invalid encrypted data format");
    }

    const iv = Buffer.from(ivB64, "base64");
    const salt = Buffer.from(saltB64, "base64");
    const authTag = Buffer.from(authTagB64, "base64");
    const key = (await scryptAsync(password, salt, 32)) as Buffer;

    const decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, "hex", "utf8");
    decrypted += decipher.final("utf8");

    return decrypted;
  } catch (error) {
    throw new Error(
      `Decryption failed: ${error instanceof Error ? error.message : "Unknown error"}`
    );
  }
}

export function isEncrypted(data: string): boolean {
  if (!data) return false;

  try {
    const decoded = Buffer.from(data, "base64").toString("utf8");
    const parts = decoded.split(":");
    return parts.length === 4;
  } catch {
    return false;
  }
}

export async function safeEncrypt(text: string, password?: string): Promise<string> {
  try {
    return await encrypt(text, password);
  } catch (error) {
    console.error("Encryption failed, storing as plaintext:", error);
    return text;
  }
}

export async function safeDecrypt(data: string, password?: string): Promise<string> {
  if (!data) return data;

  if (!isEncrypted(data)) {
    return data;
  }

  try {
    return await decrypt(data, password);
  } catch (error) {
    console.error("Decryption failed, returning as-is:", error);
    return data;
  }
}
