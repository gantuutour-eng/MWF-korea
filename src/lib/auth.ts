import {
  putSession,
  getSession,
  deleteSession,
  type SessionPayload,
} from "./kv";
import { getUserById, type UserRow } from "./db";

const PBKDF2_ITERATIONS = 100_000;
const PBKDF2_HASH = "SHA-256";
const SALT_BYTES = 16;
const KEY_BYTES = 32;
const SESSION_COOKIE = "mwa_session";
const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

function toBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

function fromBase64(s: string): Uint8Array {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const key = await derive(password, salt);
  return `pbkdf2$${PBKDF2_ITERATIONS}$${toBase64(salt)}$${toBase64(key)}`;
}

export async function verifyPassword(
  password: string,
  stored: string,
): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  const salt = fromBase64(parts[2]!);
  const expected = fromBase64(parts[3]!);
  const actual = await derive(password, salt, iterations);
  if (actual.length !== expected.length) return false;
  let diff = 0;
  for (let i = 0; i < actual.length; i++) diff |= actual[i]! ^ expected[i]!;
  return diff === 0;
}

async function derive(
  password: string,
  salt: Uint8Array,
  iterations = PBKDF2_ITERATIONS,
): Promise<Uint8Array> {
  const passwordBytes = new TextEncoder().encode(password);
  const key = await crypto.subtle.importKey(
    "raw",
    passwordBytes as BufferSource,
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: salt as BufferSource,
      iterations,
      hash: PBKDF2_HASH,
    },
    key,
    KEY_BYTES * 8,
  );
  return new Uint8Array(bits);
}

export function createSessionToken(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(32));
  return toBase64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function sessionCookie(token: string): string {
  return `${SESSION_COOKIE}=${token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=${SESSION_TTL_SECONDS}`;
}

export function clearSessionCookie(): string {
  return `${SESSION_COOKIE}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

export function readSessionToken(cookieHeader: string | null): string | null {
  if (!cookieHeader) return null;
  for (const pair of cookieHeader.split(";")) {
    const [name, ...rest] = pair.trim().split("=");
    if (name === SESSION_COOKIE) return rest.join("=") || null;
  }
  return null;
}

export async function startSession(
  kv: KVNamespace,
  userId: number,
): Promise<string> {
  const token = createSessionToken();
  await putSession(kv, token, { userId });
  return token;
}

export async function endSession(
  kv: KVNamespace,
  token: string,
): Promise<void> {
  await deleteSession(kv, token);
}

export async function loadCurrentUser(
  db: D1Database,
  kv: KVNamespace,
  cookieHeader: string | null,
): Promise<UserRow | null> {
  const token = readSessionToken(cookieHeader);
  if (!token) return null;
  const session = await getSession(kv, token);
  if (!session) return null;
  return await getUserById(db, session.userId);
}

export type { SessionPayload };
