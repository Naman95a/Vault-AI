/**
 * VaultAI Client-Side Encryption Library
 * 
 * Zero-knowledge encryption using Web Crypto API:
 * - PBKDF2 for key derivation (100,000 iterations)
 * - AES-256-GCM for encryption/decryption
 * 
 * The master password NEVER leaves the browser.
 * The server only stores encrypted ciphertext.
 */

/**
 * Convert a string to an ArrayBuffer
 */
function stringToBuffer(str) {
  return new TextEncoder().encode(str);
}

/**
 * Convert an ArrayBuffer to a string
 */
function bufferToString(buffer) {
  return new TextDecoder().decode(buffer);
}

/**
 * Convert an ArrayBuffer to a hex string
 */
function bufferToHex(buffer) {
  return Array.from(new Uint8Array(buffer))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Convert a hex string to an ArrayBuffer
 */
function hexToBuffer(hex) {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return bytes.buffer;
}

/**
 * Generate a random salt (32 bytes, returned as hex)
 */
export function generateSalt() {
  const salt = crypto.getRandomValues(new Uint8Array(32));
  return bufferToHex(salt);
}

/**
 * Derive an AES-256-GCM key from master password + salt using PBKDF2
 * @param {string} masterPassword - The user's master password
 * @param {string} saltHex - The salt as hex string
 * @returns {Promise<CryptoKey>} The derived AES key
 */
export async function deriveKey(masterPassword, saltHex) {
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    stringToBuffer(masterPassword),
    'PBKDF2',
    false,
    ['deriveKey']
  );

  const salt = hexToBuffer(saltHex);

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    {
      name: 'AES-GCM',
      length: 256,
    },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypt data using AES-256-GCM
 * @param {object} data - The data to encrypt (will be JSON serialized)
 * @param {CryptoKey} key - The AES key derived from master password
 * @returns {Promise<{encryptedData: string, iv: string}>} Encrypted data and IV as hex strings
 */
export async function encryptData(data, key) {
  const iv = crypto.getRandomValues(new Uint8Array(12)); // 96-bit IV for GCM
  const plaintext = stringToBuffer(JSON.stringify(data));

  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    plaintext
  );

  return {
    encryptedData: bufferToHex(ciphertext),
    iv: bufferToHex(iv),
  };
}

/**
 * Decrypt data using AES-256-GCM
 * @param {string} encryptedDataHex - The encrypted data as hex string
 * @param {string} ivHex - The IV as hex string
 * @param {CryptoKey} key - The AES key derived from master password
 * @returns {Promise<object>} The decrypted data object
 */
export async function decryptData(encryptedDataHex, ivHex, key) {
  const ciphertext = hexToBuffer(encryptedDataHex);
  const iv = hexToBuffer(ivHex);

  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: iv,
    },
    key,
    ciphertext
  );

  return JSON.parse(bufferToString(plaintext));
}

/**
 * Calculate password strength score (0-100) and metadata
 * This runs client-side and never sends the actual password anywhere
 * @param {string} password - The password to analyze
 * @returns {object} Strength analysis result
 */
export function analyzePasswordStrength(password) {
  if (!password) return { score: 0, label: 'None', color: '#6b7280', checks: [] };

  let score = 0;
  const checks = [];

  // Length checks
  if (password.length >= 8) { score += 15; checks.push({ pass: true, text: 'At least 8 characters' }); }
  else { checks.push({ pass: false, text: 'At least 8 characters' }); }

  if (password.length >= 12) { score += 10; checks.push({ pass: true, text: 'At least 12 characters' }); }
  else { checks.push({ pass: false, text: 'At least 12 characters' }); }

  if (password.length >= 16) { score += 10; }

  // Character diversity
  if (/[a-z]/.test(password)) { score += 10; checks.push({ pass: true, text: 'Lowercase letters' }); }
  else { checks.push({ pass: false, text: 'Lowercase letters' }); }

  if (/[A-Z]/.test(password)) { score += 10; checks.push({ pass: true, text: 'Uppercase letters' }); }
  else { checks.push({ pass: false, text: 'Uppercase letters' }); }

  if (/[0-9]/.test(password)) { score += 10; checks.push({ pass: true, text: 'Numbers' }); }
  else { checks.push({ pass: false, text: 'Numbers' }); }

  if (/[^a-zA-Z0-9]/.test(password)) { score += 15; checks.push({ pass: true, text: 'Special characters' }); }
  else { checks.push({ pass: false, text: 'Special characters' }); }

  // Pattern penalties
  if (/(.)\1{2,}/.test(password)) { score -= 10; checks.push({ pass: false, text: 'No repeated characters (3+)' }); }
  else { checks.push({ pass: true, text: 'No repeated characters (3+)' }); }

  if (/^(123|abc|qwerty|password|admin)/i.test(password)) { score -= 20; checks.push({ pass: false, text: 'No common patterns' }); }
  else { checks.push({ pass: true, text: 'No common patterns' }); }

  // Entropy bonus
  const uniqueChars = new Set(password).size;
  if (uniqueChars > 10) score += 10;
  if (uniqueChars > 15) score += 10;

  score = Math.max(0, Math.min(100, score));

  let label, color;
  if (score < 30) { label = 'Very Weak'; color = '#ef4444'; }
  else if (score < 50) { label = 'Weak'; color = '#f97316'; }
  else if (score < 70) { label = 'Fair'; color = '#eab308'; }
  else if (score < 85) { label = 'Strong'; color = '#22c55e'; }
  else { label = 'Very Strong'; color = '#10b981'; }

  return { score, label, color, checks, length: password.length, uniqueChars };
}

/**
 * Generate a random password
 * @param {object} options - Generation options
 * @returns {string} Generated password
 */
export function generatePassword(options = {}) {
  const {
    length = 16,
    uppercase = true,
    lowercase = true,
    numbers = true,
    symbols = true,
  } = options;

  let chars = '';
  if (lowercase) chars += 'abcdefghijklmnopqrstuvwxyz';
  if (uppercase) chars += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  if (numbers) chars += '0123456789';
  if (symbols) chars += '!@#$%^&*()_+-=[]{}|;:,.<>?';

  if (!chars) chars = 'abcdefghijklmnopqrstuvwxyz';

  const array = new Uint32Array(length);
  crypto.getRandomValues(array);

  let password = '';
  for (let i = 0; i < length; i++) {
    password += chars[array[i] % chars.length];
  }

  return password;
}

/**
 * Check if a password has been exposed in data breaches using Have I Been Pwned API
 * Uses k-Anonymity: only the first 5 characters of the SHA-1 hash are sent to the API.
 * @param {string} password - The plaintext password
 * @returns {Promise<{pwned: boolean, count: number}>}
 */
export async function checkPwnedPassword(password) {
  if (!password) return { pwned: false, count: 0 };
  
  // 1. Hash the password with SHA-1
  const buffer = stringToBuffer(password);
  const hashBuffer = await crypto.subtle.digest('SHA-1', buffer);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('').toUpperCase();
  
  // 2. Split into prefix (first 5 chars) and suffix (the rest)
  const prefix = hashHex.substring(0, 5);
  const suffix = hashHex.substring(5);
  
  // 3. Query the HIBP API with the prefix
  try {
    const response = await fetch(`https://api.pwnedpasswords.com/range/${prefix}`);
    if (!response.ok) throw new Error('HIBP API error');
    
    const text = await response.text();
    
    // 4. Search the response for our suffix
    const lines = text.split('\n');
    for (const line of lines) {
      const [lineSuffix, count] = line.trim().split(':');
      if (lineSuffix === suffix) {
        return { pwned: true, count: parseInt(count, 10) };
      }
    }
    
    return { pwned: false, count: 0 };
  } catch (error) {
    console.error('Failed to check HIBP:', error);
    return { pwned: false, count: 0, error: true };
  }
}
