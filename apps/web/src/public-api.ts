const BASE = `${window.location.origin}/api/public`;

async function http<T>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers: body !== undefined ? { 'content-type': 'application/json' } : undefined,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const publicApi = {
  get: <T>(path: string) => http<T>('GET', path),
  post: <T>(path: string, body?: unknown) => http<T>('POST', path, body ?? {}),
  put: <T>(path: string, body: unknown) => http<T>('PUT', path, body),
  del: <T>(path: string) => http<T>('DELETE', path),
};

export function newId(): string {
  return crypto.randomUUID();
}
