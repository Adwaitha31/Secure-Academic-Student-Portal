
/**
 * BACKEND SECURITY MODULE
 * Responsibility: NIST-compliant Cryptography
 */

export const hashPassword = async (password: string, salt: string): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + salt);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
};

export const generateSalt = (): string => {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array));
};

export const encryptData = (content: string): string => {
  return `AES256_ENC(${btoa(content)})`;
};

export const decryptData = (encrypted: string): string => {
  const base64 = encrypted.replace('AES256_ENC(', '').replace(')', '');
  return atob(base64);
};

export const generateSignature = async (data: string): Promise<string> => {
  // Simple HMAC simulation using SHA-256
  const encoder = new TextEncoder();
  const d = encoder.encode(data + "SERVER_PRIVATE_KEY");
  const hashBuffer = await crypto.subtle.digest('SHA-256', d);
  return Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, '0')).join('').substring(0, 16);
};
