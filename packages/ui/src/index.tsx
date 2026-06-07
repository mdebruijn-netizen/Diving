import type { ButtonHTMLAttributes, ReactNode } from 'react';

/* ---------------- Icons (inline, no dependency) ---------------- */
export type IconName =
  | 'wave'
  | 'dashboard'
  | 'trophy'
  | 'users'
  | 'layers'
  | 'clipboard'
  | 'broadcast'
  | 'settings'
  | 'check'
  | 'alert'
  | 'plus'
  | 'logout'
  | 'play';

const PATHS: Record<IconName, ReactNode> = {
  wave: <path d="M2 12c2 0 2-2 4-2s2 2 4 2 2-2 4-2 2 2 4 2 2-2 4-2" />,
  dashboard: <path d="M3 3h7v7H3zM14 3h7v4h-7zM14 10h7v11h-7zM3 13h7v8H3z" />,
  trophy: <path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0zM7 4H4v2a3 3 0 0 0 3 3M17 4h3v2a3 3 0 0 1-3 3" />,
  users: <path d="M16 19v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 9a4 4 0 1 0 0-8 4 4 0 0 0 0 8M22 19v-2a4 4 0 0 0-3-3.87M16 1.13A4 4 0 0 1 16 9" />,
  layers: <path d="M12 2 2 7l10 5 10-5zM2 17l10 5 10-5M2 12l10 5 10-5" />,
  clipboard: <path d="M9 2h6a1 1 0 0 1 1 1v1h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2V3a1 1 0 0 1 1-1z" />,
  broadcast: <path d="M5 12a7 7 0 0 1 14 0M8.5 12a3.5 3.5 0 0 1 7 0M12 12v9" />,
  settings: <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.6 1.6 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.6 1.6 0 0 0-2.7 1.1V21a2 2 0 1 1-4 0v-.1A1.6 1.6 0 0 0 7 19.4a1.6 1.6 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.6 1.6 0 0 0-1.1-2.7H1a2 2 0 1 1 0-4h.1A1.6 1.6 0 0 0 2.6 7a1.6 1.6 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.6 1.6 0 0 0 1.8.3H7a1.6 1.6 0 0 0 1-1.5V1a2 2 0 1 1 4 0v.1a1.6 1.6 0 0 0 2.7 1.1l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.6 1.6 0 0 0-.3 1.8V7a1.6 1.6 0 0 0 1.5 1H23a2 2 0 1 1 0 4h-.1a1.6 1.6 0 0 0-1.5 1z" />,
  check: <path d="M20 6 9 17l-5-5" />,
  alert: <path d="M12 9v4M12 17h.01M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />,
  plus: <path d="M12 5v14M5 12h14" />,
  logout: <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />,
  play: <path d="M5 3l14 9-14 9z" />,
};

export function Icon({ name, className }: { name: IconName; className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {PATHS[name]}
    </svg>
  );
}

/* ---------------- Brand ---------------- */
export function Logo() {
  return (
    <span className="brand">
      <span className="mark"><Icon name="wave" /></span>
      <span className="name"><b>Aqua</b><span>Meet</span></span>
    </span>
  );
}

/* ---------------- Button ---------------- */
type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost' | 'danger';
  size?: 'md' | 'lg';
  block?: boolean;
  icon?: IconName;
};
export function Button({ variant = 'primary', size = 'md', block, icon, children, className = '', ...rest }: ButtonProps) {
  const cls = ['btn', `btn-${variant}`, size === 'lg' ? 'btn-lg' : '', block ? 'btn-block' : '', className]
    .filter(Boolean)
    .join(' ');
  return (
    <button className={cls} {...rest}>
      {icon && <Icon name={icon} />}
      {children}
    </button>
  );
}

/* ---------------- Card ---------------- */
export function Card({ title, actions, children, className = '' }: { title?: ReactNode; actions?: ReactNode; children: ReactNode; className?: string }) {
  return (
    <div className={`card ${className}`}>
      {(title || actions) && (
        <div className="card-head">
          {typeof title === 'string' ? <h2>{title}</h2> : title}
          {actions}
        </div>
      )}
      <div className="card-pad">{children}</div>
    </div>
  );
}

/* ---------------- Stat ---------------- */
export function Stat({ label, value, hint, icon }: { label: string; value: ReactNode; hint?: string; icon?: IconName }) {
  return (
    <div className="card stat">
      <div className="between">
        <span className="label">{label}</span>
        {icon && <span className="icon"><Icon name={icon} /></span>}
      </div>
      <div className="value mono">{value}</div>
      {hint && <div className="hint">{hint}</div>}
    </div>
  );
}

/* ---------------- Badge ---------------- */
export function Badge({ tone = 'neutral', children }: { tone?: 'good' | 'warn' | 'bad' | 'info' | 'neutral'; children: ReactNode }) {
  return <span className={`badge ${tone}`}>{children}</span>;
}

/* ---------------- Field ---------------- */
export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
      {hint && <span className="hint">{hint}</span>}
    </label>
  );
}

/* ---------------- Empty state ---------------- */
export function EmptyState({ icon = 'layers', title, description, action }: { icon?: IconName; title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="empty">
      <div className="icon"><Icon name={icon} /></div>
      <h3>{title}</h3>
      {description && <p>{description}</p>}
      {action}
    </div>
  );
}

/* ---------------- App shell ---------------- */
export interface NavItem {
  id: string;
  label: string;
  icon: IconName;
  href: string;
}

export function AppShell({
  nav,
  activeId,
  title,
  user,
  onSignOut,
  children,
}: {
  nav: NavItem[];
  activeId: string;
  title: ReactNode;
  user?: string;
  onSignOut?: () => void;
  children: ReactNode;
}) {
  return (
    <div className="shell">
      <aside className="sidebar">
        <Logo />
        <nav className="nav">
          <span className="nav-label">Organisatie</span>
          {nav.map((item) => (
            <a key={item.id} href={item.href} className={`nav-item ${item.id === activeId ? 'active' : ''}`}>
              <Icon name={item.icon} />
              {item.label}
            </a>
          ))}
        </nav>
        <div className="sidebar-foot col">
          <div className="divider" />
          {user && <span className="muted" style={{ fontSize: '0.84rem', padding: '0 12px' }}>{user}</span>}
          {onSignOut && (
            <a href="#" className="nav-item" onClick={(e) => { e.preventDefault(); onSignOut(); }}>
              <Icon name="logout" /> Uitloggen
            </a>
          )}
        </div>
      </aside>
      <div className="main">
        <header className="topbar">
          <h1>{title}</h1>
          <div className="row">
            <Badge tone="good">Live</Badge>
          </div>
        </header>
        <div className="content">{children}</div>
      </div>
    </div>
  );
}
