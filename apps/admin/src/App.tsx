import { useEffect, useState } from 'react';
import { Logo } from '@aquameet/ui';
import { clearSession, loadSession, saveSession, type Session } from './auth';
import { Login } from './Login';
import { Console } from './Console';
import { OrgProvider } from './org';

const MAGIC = /^#\/magic\/(.+)$/;

export function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());
  const [consuming, setConsuming] = useState(() => MAGIC.test(window.location.hash));

  // Magic-link sign-in: exchange the token in the URL for a session.
  useEffect(() => {
    const m = window.location.hash.match(MAGIC);
    if (!m) return;
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${window.location.origin}/api/auth/magic/consume`, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ token: m[1] }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error('invalid');
        if (cancelled) return;
        const s: Session = { email: data.email, org: data.org, token: data.token, organizationId: data.organizationId, role: data.role };
        saveSession(s);
        setSession(s);
      } catch {
        /* fall through to login */
      } finally {
        window.location.hash = '#/';
        if (!cancelled) setConsuming(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (consuming) {
    return (
      <div className="auth"><div className="panel"><div className="box"><Logo /><p className="muted" style={{ marginTop: 16 }}>Signing you in…</p></div></div></div>
    );
  }

  if (!session) {
    return <Login onLogin={setSession} />;
  }
  return (
    <OrgProvider>
      <Console
        session={session}
        onSignOut={() => {
          clearSession();
          setSession(null);
        }}
      />
    </OrgProvider>
  );
}
