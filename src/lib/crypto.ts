// Lightweight AES-GCM wrapper used to obfuscate GitHub tokens at rest in
// chrome.storage.local.
//
// The key lives next to the ciphertext, so this is not real at-rest
// encryption: anything that can read this extension's storage can recover the
// token. It only keeps the token out of plaintext dumps of storage. Stronger
// protection would need a user-supplied passphrase.

const KEY_STORAGE_KEY = 'gh_workflow_crypto_key_v1';
const ALGO = { name: 'AES-GCM', length: 256 } as const;

async function generateRawKey(): Promise<number[]> {
  const key = await crypto.subtle.generateKey(ALGO, true, ['encrypt', 'decrypt']);
  const raw = await crypto.subtle.exportKey('raw', key);
  return Array.from(new Uint8Array(raw));
}

async function getOrCreateRawKey(): Promise<number[]> {
  const stored = await chrome.storage.local.get(KEY_STORAGE_KEY);
  const existing = stored[KEY_STORAGE_KEY] as number[] | undefined;
  if (existing && existing.length === 32) return existing;
  const fresh = await generateRawKey();
  await chrome.storage.local.set({ [KEY_STORAGE_KEY]: fresh });
  return fresh;
}

async function importKey(raw: number[]): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', new Uint8Array(raw), ALGO, false, [
    'encrypt',
    'decrypt',
  ]);
}

function toBase64(bytes: Uint8Array): string {
  let binary = '';
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function fromBase64(b64: string): Uint8Array {
  const binary = atob(b64);
  const out = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) out[i] = binary.charCodeAt(i);
  return out;
}

export interface Envelope {
  iv: string;
  ciphertext: string;
}

function toArrayBuffer(u8: Uint8Array): ArrayBuffer {
  // Copy into a fresh ArrayBuffer so we never hand SharedArrayBuffer-backed
  // views to WebCrypto (stricter TS lib types disallow it).
  const out = new ArrayBuffer(u8.byteLength);
  new Uint8Array(out).set(u8);
  return out;
}

export async function encryptString(plaintext: string): Promise<Envelope> {
  const raw = await getOrCreateRawKey();
  const key = await importKey(raw);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(plaintext);
  const buf = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(encoded),
  );
  return { iv: toBase64(iv), ciphertext: toBase64(new Uint8Array(buf)) };
}

export async function decryptString(envelope: Envelope): Promise<string> {
  const raw = await getOrCreateRawKey();
  const key = await importKey(raw);
  const iv = fromBase64(envelope.iv);
  const data = fromBase64(envelope.ciphertext);
  const buf = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: toArrayBuffer(iv) },
    key,
    toArrayBuffer(data),
  );
  return new TextDecoder().decode(buf);
}

export async function clearCryptoKey(): Promise<void> {
  await chrome.storage.local.remove(KEY_STORAGE_KEY);
}
