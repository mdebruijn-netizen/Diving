import { useState } from 'react';
import { clearSession, loadSession, type Session } from './auth';
import { Login } from './Login';
import { Console } from './Console';

export function App() {
  const [session, setSession] = useState<Session | null>(() => loadSession());

  if (!session) {
    return <Login onLogin={setSession} />;
  }
  return (
    <Console
      session={session}
      onSignOut={() => {
        clearSession();
        setSession(null);
      }}
    />
  );
}
