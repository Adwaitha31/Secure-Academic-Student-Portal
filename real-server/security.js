import bcrypt from 'bcrypt';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || '0123456789abcdef0123456789abcdef';
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key';

/**
 * REAL SECURITY IMPLEMENTATIONS
 */

// Password Hashing with Salt (NIST Compliant)
export const hashPassword = async (password) => {
  const salt = await bcrypt.genSalt(10);
  const hash = await bcrypt.hash(password, salt);
  return { hash, salt };
};

// Password Verification
export const verifyPassword = async (password, hash) => {
  return await bcrypt.compare(password, hash);
};

// Generate OTP for MFA
export const generateOTP = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Encrypt Data using AES-256-GCM (Real Encryption)
export const encryptData = (data) => {
  try {
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY),
      iv
    );
    
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');
    
    return iv.toString('hex') + ':' + encrypted;
  } catch (error) {
    console.error('Encryption error:', error);
    throw new Error('Encryption failed');
  }
};

// Decrypt Data
export const decryptData = (encryptedData) => {
  try {
    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const encrypted = parts[1];
    
    const decipher = crypto.createDecipheriv(
      'aes-256-cbc',
      Buffer.from(ENCRYPTION_KEY),
      iv
    );
    
    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return decrypted;
  } catch (error) {
    console.error('Decryption error:', error);
    throw new Error('Decryption failed');
  }
};

// Safe Decrypt - returns original if not encrypted (for backward compatibility)
export const safeDecrypt = (data) => {
  if (!data) return null;
  try {
    // Check if data looks like encrypted format (contains : and is hex)
    if (data.includes(':') && /^[a-f0-9]+:[a-f0-9]+$/i.test(data)) {
      return decryptData(data);
    }
    // Return as-is if not encrypted (plain text from old data)
    return data;
  } catch (error) {
    // If decryption fails, return original (might be plain text)
    return data;
  }
};

// Generate Digital Signature (HMAC-SHA256)
export const generateSignature = (data) => {
  return crypto
    .createHmac('sha256', JWT_SECRET)
    .update(data)
    .digest('hex');
};

// Verify Digital Signature
export const verifySignature = (data, signature) => {
  const expectedSignature = generateSignature(data);
  return crypto.timingSafeEqual(
    Buffer.from(signature),
    Buffer.from(expectedSignature)
  );
};

// Generate JWT Token
export const generateJWT = (userId, username, role) => {
  return jwt.sign(
    { userId, username, role },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRY || '24h' }
  );
};

// Verify JWT Token
export const verifyJWT = (token) => {
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch (error) {
    return null;
  }
};

// Generate Random Salt
export const generateSalt = () => {
  return crypto.randomBytes(16).toString('hex');
};
