import { AppShell, type NavItem } from '@aquameet/ui';
import { useHashRoute, type Session } from './auth';
import { Dashboard, Stub, Validate } from './screens';
import { Categories, Competitions, Participants, Registrations } from './manage';
import { Enrollment } from './enroll';
import { Billing } from './billing';
import { Schedule } from './schedule';
import { StartLists } from './startlists';

const NAV: NavItem[] = [
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard', href: '#/' },
  { id: 'events', label: 'Competitions', icon: 'trophy', href: '#/events' },
  { id: 'participants', label: 'Participants', icon: 'users', href: '#/participants' },
  { id: 'categories', label: 'Categories', icon: 'layers', href: '#/categories' },
  { id: 'schedule', label: 'Schedule', icon: 'layers', href: '#/schedule' },
  { id: 'enroll', label: 'Entries', icon: 'clipboard', href: '#/enroll' },
  { id: 'startlists', label: 'Start lists', icon: 'clipboard', href: '#/startlists' },
  { id: 'registrations', label: 'Sign-ups', icon: 'users', href: '#/registrations' },
  { id: 'sheets', label: 'Sheet checker', icon: 'clipboard', href: '#/sheets' },
  { id: 'live', label: 'Live', icon: 'broadcast', href: '#/live' },
  { id: 'billing', label: 'Plan & Billing', icon: 'settings', href: '#/billing' },
  { id: 'settings', label: 'Settings', icon: 'settings', href: '#/settings' },
];

export function Console({ session, onSignOut }: { session: Session; onSignOut: () => void }) {
  const hash = useHashRoute();
  const route = hash.replace(/^#\//, '') || 'dashboard';
  const active = NAV.find((n) => n.id === route) ?? NAV[0]!;

  const screen = (() => {
    switch (route) {
      case 'enroll':
        return <Enrollment />;
      case 'registrations':
        return <Registrations />;
      case 'sheets':
        return <Validate />;
      case 'events':
        return <Competitions />;
      case 'participants':
        return <Participants />;
      case 'categories':
        return <Categories />;
      case 'schedule':
        return <Schedule />;
      case 'startlists':
        return <StartLists />;
      case 'live':
        return <Stub title="Live control" icon="broadcast" description="Open dives, follow the judges and drive the scoreboard during the meet." />;
      case 'billing':
        return <Billing />;
      case 'settings':
        return <Stub title="Settings" icon="settings" description="Organization profile, subscription and team members." />;
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
