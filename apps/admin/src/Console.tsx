import { AppShell, type NavItem } from '@aquameet/ui';
import { useHashRoute, type Session } from './auth';
import { Dashboard, Stub, Validate } from './screens';
import { Categories, Competitions, Participants } from './manage';

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '#/' },
  { id: 'events', label: 'Wedstrijden', icon: 'trophy', href: '#/events' },
  { id: 'participants', label: 'Deelnemers', icon: 'users', href: '#/participants' },
  { id: 'categories', label: 'Categorieën', icon: 'layers', href: '#/categories' },
  { id: 'sheets', label: 'Dive sheets', icon: 'clipboard', href: '#/sheets' },
  { id: 'live', label: 'Live', icon: 'broadcast', href: '#/live' },
  { id: 'settings', label: 'Instellingen', icon: 'settings', href: '#/settings' },
];

export function Console({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const hash = useHashRoute();
  const route = hash.replace(/^#\//, '') || 'dashboard';
  const active = NAV.find((n) => n.id === route) ?? NAV[0]!;

  const screen = (() => {
    switch (route) {
      case 'sheets':
        return <Validate />;
      case 'events':
        return <Competitions />;
      case 'participants':
        return <Participants />;
      case 'categories':
        return <Categories />;
      case 'live':
        return <Stub title="Live bediening" icon="broadcast" description="Open sprongen, volg de jury en stuur het scorebord aan tijdens de wedstrijd." />;
      case 'settings':
        return <Stub title="Instellingen" icon="settings" description="Organisatieprofiel, abonnement en teamleden." />;
      default:
        return <Dashboard session={session} />;
    }
  })();

  return (
    <AppShell nav={NAV} activeId={active.id} title={active.label} user={session.email} onSignOut={onSignOut}>
      {screen}
    </AppShell>
  );
}
