import { useCallback, useEffect, useState } from 'react';
import { authToken, clearSession } from './auth';

const BASE = `${window.location.origin}/api/admin`;

async function http<T>(method: string, path: string, body?: unknown): Promise<T> {
  const headers: Record<string, string> = {};
  if (body !== undefined) headers['content-type'] = 'application/json';
  const token = authToken();
  if (token) headers['authorization'] = `Bearer ${token}`;

  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });
  if (res.status === 401) {
    // Session expired or invalid → bounce to the login screen.
    clearSession();
    window.location.reload();
    throw new Error('unauthorized');
  }
  if (!res.ok) throw new Error(`${method} ${path} → ${res.status}`);
  const text = await res.text();
  return (text ? JSON.parse(text) : null) as T;
}

export const api = {
  list: <T>(path: string) => http<T[]>('GET', path),
  get: <T>(path: string) => http<T>('GET', path),
  put: (path: string, body: unknown) => http<{ ok: boolean }>('PUT', path, body),
  post: <T>(path: string, body?: unknown) => http<T>('POST', path, body),
  del: (path: string) => http<{ ok: boolean }>('DELETE', path),
};

export function newId(): string {
  return crypto.randomUUID();
}

/** Load a collection from the admin API, with a refresh + error/loading state. */
export function useCollection<T>(path: string) {
  const [items, setItems] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setError(null);
    api
      .list<T>(path)
      .then(setItems)
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [path]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return { items, loading, error, refresh };
}
