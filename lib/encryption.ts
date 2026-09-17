import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from "crypto";

const ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 16;
const TAG_LENGTH = 16;

/**
 * Derives a 256-bit encryption key.
 * Prefers a dedicated ENCRYPTION_SECRET or API_KEY_ENCRYPTION_SECRET,
 * falling back to BETTER_AUTH_SECRET (or default fallback) for seamless compatibility.
 */
function getKey(): Buffer {
  const secret =
    process.env.ENCRYPTION_SECRET ||
    process.env.API_KEY_ENCRYPTION_SECRET ||
    process.env.BETTER_AUTH_SECRET ||
    "f478a83d9b074e5088c3f7c191a27e02b79a52de1d8048f385c2c525f0e1ad15";

  return createHash("sha256").update(secret).digest();
}

/**
 * Sanitizes user-provided API key by stripping invisible unicode,
 * zero-width spaces, and control characters before storage/use.
 */
export function sanitizeApiKey(rawKey: string): string {
  if (!rawKey || typeof rawKey !== "string") return "";
  return rawKey
    // Remove zero-width spaces, joiners, BOM
    .replace(/[\u200B-\u200D\uFEFF\u00AD]/g, "")
    // Remove control characters (except standard printable ASCII)
    .replace(/[\x00-\x1F\x7F]/g, "")
    .trim();
}

/**
 * Encrypts sensitive text (such as API keys) using AES-256-GCM authenticated encryption.
 * Output format: iv:tag:ciphertext (all hex-encoded)
 */
export function encrypt(text: string): string {
  const sanitized = sanitizeApiKey(text);
  if (!sanitized) {
    throw new Error("Cannot encrypt empty or invalid text.");
  }

  const key = getKey();
  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ALGORITHM, key, iv);

  let encrypted = cipher.update(sanitized, "utf8", "hex");
  encrypted += cipher.final("hex");

  const tag = cipher.getAuthTag();

  return `${iv.toString("hex")}:${tag.toString("hex")}:${encrypted}`;
}

/**
 * Decrypts AES-256-GCM ciphertext.
 * Validates authentication tag and structure to prevent tampering or corruption errors.
 */
export function decrypt(encryptedText: string): string {
  if (!encryptedText || typeof encryptedText !== "string") {
    throw new Error("Invalid encrypted payload: payload must be a non-empty string.");
  }

  const parts = encryptedText.split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid encrypted payload format: expected iv:tag:ciphertext.");
  }

  const [ivHex, tagHex, ciphertext] = parts;

  // Validate hex format
  const hexRegex = /^[0-9a-fA-F]+$/;
  if (!hexRegex.test(ivHex) || !hexRegex.test(tagHex) || !hexRegex.test(ciphertext)) {
    throw new Error("Invalid encrypted payload: non-hex characters detected.");
  }

  const iv = Buffer.from(ivHex, "hex");
  const tag = Buffer.from(tagHex, "hex");

  if (iv.length !== IV_LENGTH) {
    throw new Error(`Invalid IV length: expected ${IV_LENGTH} bytes.`);
  }
  if (tag.length !== TAG_LENGTH) {
    throw new Error(`Invalid authentication tag length: expected ${TAG_LENGTH} bytes.`);
  }

  try {
    const key = getKey();
    const decipher = createDecipheriv(ALGORITHM, key, iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertext, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  } catch {
    throw new Error(
      "Decryption failed: data was tampered with, corrupted, or encrypted with a different secret key."
    );
  }
}

/**
 * Securely masks an API key for safe display in UI and metadata.
 * Ensures that neither short keys nor long keys reveal sensitive middle fragments.
 */
export function maskApiKey(key: string): string {
  if (!key || typeof key !== "string") return "••••••••";
  const trimmed = key.trim();
  if (trimmed.length <= 8) return "••••••••";
  return `${trimmed.slice(0, 4)}••••••••${trimmed.slice(-4)}`;
}
