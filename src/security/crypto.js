const crypto = require("crypto");

const IV_LENGTH = 16;
const TAG_LENGTH = 16;
const ALGO = "aes-256-gcm";

function getKey() {
  const raw = process.env.PUBLISH_SECRET_KEY;
  if (!raw || typeof raw !== "string" || raw.length < 32) {
    throw new Error("PUBLISH_SECRET_KEY_MISSING");
  }
  return crypto.createHash("sha256").update(raw).digest();
}

function encryptSecret(plain) {
  const key = getKey();
  const iv = crypto.randomBytes(IV_LENGTH);
  const cipher = crypto.createCipheriv(ALGO, key, iv, { authTagLength: TAG_LENGTH });
  const enc = Buffer.concat([cipher.update(String(plain), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return [iv, tag, enc].map(function (b) { return b.toString("base64"); }).join(":");
}

function decryptSecret(enc) {
  const key = getKey();
  const parts = String(enc).split(":");
  if (parts.length !== 3) {
    throw new Error("Invalid secret format");
  }
  const iv = Buffer.from(parts[0], "base64");
  const tag = Buffer.from(parts[1], "base64");
  const ciphertext = Buffer.from(parts[2], "base64");
  if (iv.length !== IV_LENGTH || tag.length !== TAG_LENGTH) {
    throw new Error("Invalid secret format");
  }
  const decipher = crypto.createDecipheriv(ALGO, key, iv, { authTagLength: TAG_LENGTH });
  decipher.setAuthTag(tag);
  return decipher.update(ciphertext) + decipher.final("utf8");
}

module.exports = { encryptSecret, decryptSecret };
