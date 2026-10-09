import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

/**
 * AES-256-GCM for secrets stored in the database (payment provider tokens).
 * The key comes from APP_ENCRYPTION_KEY; changing it makes stored secrets
 * unreadable, so studios would need to re-enter them.
 */
function key(): Buffer {
  const secret = process.env.APP_ENCRYPTION_KEY;
  if (!secret || secret.length < 32) {
    throw new Error('APP_ENCRYPTION_KEY must be set (at least 32 characters)');
  }
  return createHash('sha256').update(secret).digest();
}

export function encryptSecret(plain: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key(), iv);
  const data = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return [iv, cipher.getAuthTag(), data]
    .map((b) => b.toString('base64'))
    .join('.');
}

export function decryptSecret(stored: string): string {
  const [iv, tag, data] = stored
    .split('.')
    .map((p) => Buffer.from(p, 'base64'));
  const decipher = createDecipheriv('aes-256-gcm', key(), iv);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(data), decipher.final()]).toString(
    'utf8',
  );
}
