import { AppShell, type NavItem } from '@aquameet/ui';
import { useHashRoute, type Session } from './auth';
import { Dashboard, Stub, Validate } from './screens';

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
        return <Stub title="Wedstrijden" icon="trophy" cta="Nieuwe wedstrijd" description="Maak wedstrijden aan met datum, locatie en onderdelen. Dit scherm koppelt aan de opslag-API." />;
      case 'participants':
        return <Stub title="Deelnemers" icon="users" cta="Deelnemer toevoegen" description="Beheer divers en clubs, met import en inschrijvingen per categorie." />;
      case 'categories':
        return <Stub title="Categorieën" icon="layers" cta="Categorie toevoegen" description="Stel categorieën in (geslacht × leeftijdsgroep × onderdeel) en hun regels." />;
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
