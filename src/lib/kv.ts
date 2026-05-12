const SESSION_TTL_SECONDS = 60 * 60 * 24 * 7;

export interface SessionPayload {
  userId: number;
}

export async function putSession(
  kv: KVNamespace,
  token: string,
  payload: SessionPayload,
): Promise<void> {
  await kv.put(`session:${token}`, JSON.stringify(payload), {
    expirationTtl: SESSION_TTL_SECONDS,
  });
}

export async function getSession(
  kv: KVNamespace,
  token: string,
): Promise<SessionPayload | null> {
  const raw = await kv.get(`session:${token}`);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionPayload;
  } catch {
    return null;
  }
}

export async function deleteSession(
  kv: KVNamespace,
  token: string,
): Promise<void> {
  await kv.delete(`session:${token}`);
}
