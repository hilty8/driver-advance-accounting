import { randomBytes, scryptSync, timingSafeEqual } from 'crypto';

export const hashPassword = (password: string) => {
  const salt = randomBytes(16).toString('base64');
  const derived = scryptSync(password, salt, 64).toString('base64');
  return `scrypt$${salt}$${derived}`;
};

export const verifyPassword = (password: string, storedHash: string) => {
  const parts = storedHash.split('$');
  if (parts.length !== 3) return false;
  if (parts[0] !== 'scrypt') return false;
  const salt = parts[1];
  const derived = scryptSync(password, salt, 64).toString('base64');
  return timingSafeEqual(Buffer.from(derived), Buffer.from(parts[2]));
};
