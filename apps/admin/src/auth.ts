import { useEffect, useState } from 'react';

export interface Session {
  email: string;
  org: string;
  /** Bearer token for the admin API. */
  token: string;
  organizationId: string;
  role: string;
}

const KEY = 'aquameet.session';

export function loadSession(): Session | null {
  try {
    const raw = localStorage.getItem(KEY);
    const s = raw ? (JSON.parse(raw) as Partial<Session>) : null;
    return s && s.token ? (s as Session) : null;
  } catch {
    return null;
  }
}

/** The current bearer token, if signed in. */
export function authToken(): string | null {
  return loadSession()?.token ?? null;
}

export function saveSession(session: Session): void {
  localStorage.setItem(KEY, JSON.stringify(session));
}

export function clearSession(): void {
  localStorage.removeItem(KEY);
}

/** Tiny hash-based route (no router dependency). */
export function useHashRoute(): string {
  const [hash, setHash] = useState(() => window.location.hash || '#/');
  useEffect(() => {
    const onChange = () => setHash(window.location.hash || '#/');
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);
  return hash;
}
