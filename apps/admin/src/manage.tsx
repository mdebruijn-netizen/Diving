import { useEffect, useState } from 'react';
import { Badge, Button, Card, EmptyState, Field } from '@aquameet/ui';
import type { Category, Competition, DiveSheet, Diver, Entry, Gender, Registration } from '@aquameet/competition';
import { ageBandLabel, formatDateRange } from '@aquameet/competition';
import { api, newId, useCollection } from './api';
import { DISCIPLINES, validateSheet, type Discipline } from './view-model';

function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="muted" style={{ color: 'var(--bad)' }}>Could not load: {error}. Is the API deployed and the database migration applied?</p>;
}

/* ---------------- Competitions ---------------- */
export function Competitions() {
  const { items, refresh, loading, error } = useCollection<Competition>('/competitions');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [location, setLocation] = useState('');

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const id = newId();
    const start = date || new Date().toISOString().slice(0, 10);
    await api.put(`/competitions/${id}`, {
      id,
      name: name.trim(),
      date: start,
      endDate: endDate && endDate !== start ? endDate : undefined,
      location: location.trim() || undefined,
    });
    setName(''); setDate(''); setEndDate(''); setLocation('');
    refresh();
  };

  const remove = async (id: string) => { await api.del(`/competitions/${id}`); refresh(); };
  const toggleReg = async (w: Competition) => {
    await api.put(`/competitions/${w.id}`, { ...w, registrationOpen: !w.registrationOpen });
    refresh();
  };
  const joinLink = `${window.location.origin}/web/#/join`;

  return (
    <>
      <div className="page-head"><h1>Competitions</h1><p>Create and manage your competitions. Open registration so clubs can sign up via the public link.</p></div>
      <div className="grid cols-2">
        <Card title="New competition">
          <form className="col" onSubmit={add}>
            <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Spring Meet 2026" /></Field>
            <div className="grid cols-2">
              <Field label="Start date"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
              <Field label="End date" hint="Leave empty for a one-day meet"><input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} /></Field>
            </div>
            <Field label="Location"><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Pool…" /></Field>
            <Button type="submit" icon="plus">Add competition</Button>
          </form>
        </Card>

        <Card title="Competitions" actions={<Badge tone="info">{items.length}</Badge>}>
          <ErrorNote error={error} />
          {loading ? <p className="muted">Loading…</p> : items.length === 0 ? (
            <EmptyState icon="trophy" title="No competitions yet" description="Add your first competition on the left." />
          ) : (
            <table className="table">
              <thead><tr><th>Name</th><th>Dates</th><th>Registration</th><th></th></tr></thead>
              <tbody>
                {items.map((w) => (
                  <tr key={w.id}>
                    <td><b>{w.name}</b><br /><span className="muted">{w.location ?? '—'}</span></td>
                    <td className="mono">{formatDateRange(w.date, w.endDate)}</td>
                    <td>{w.registrationOpen ? <Badge tone="good">open</Badge> : <Badge tone="neutral">closed</Badge>}</td>
                    <td style={{ textAlign: 'right' }}>
                      <Button onClick={() => toggleReg(w)}>{w.registrationOpen ? 'Close' : 'Open'}</Button>{' '}
                      <Button variant="danger" onClick={() => remove(w.id)}>Delete</Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {items.some((w) => w.registrationOpen) ? (
            <p className="muted" style={{ marginTop: 12 }}>
              Public sign-up link for clubs: <code className="mono">{joinLink}</code>
            </p>
          ) : null}
        </Card>
      </div>
    </>
  );
}

/* ---------------- Participants ---------------- */
export function Participants() {
  const { items, refresh, loading, error } = useCollection<Diver>('/divers');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<Gender>('F');
  const [birthYear, setBirthYear] = useState(2012);
  const [club, setClub] = useState('');

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    const id = newId();
    await api.put(`/divers/${id}`, { id, firstName: firstName.trim(), lastName: lastName.trim(), gender, birthYear, clubId: club.trim() });
    setFirstName(''); setLastName(''); setClub('');
    refresh();
  };
  const remove = async (id: string) => { await api.del(`/divers/${id}`); refresh(); };

  return (
    <>
      <div className="page-head"><h1>Participants</h1><p>Manage the divers taking part.</p></div>
      <div className="grid cols-2">
        <Card title="New participant">
          <form className="col" onSubmit={add}>
            <div className="grid cols-2">
              <Field label="First name"><input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
              <Field label="Last name"><input value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
              <Field label="Gender">
                <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
                  <option value="F">Female</option>
                  <option value="M">Male</option>
                  <option value="X">Mixed/Other</option>
                </select>
              </Field>
              <Field label="Birth year"><input type="number" value={birthYear} onChange={(e) => setBirthYear(Number(e.target.value))} /></Field>
            </div>
            <Field label="Club"><input value={club} onChange={(e) => setClub(e.target.value)} placeholder="Club name" /></Field>
            <Button type="submit" icon="plus">Add participant</Button>
          </form>
        </Card>

        <Card title="Participants" actions={<Badge tone="info">{items.length}</Badge>}>
          <ErrorNote error={error} />
          {loading ? <p className="muted">Loading…</p> : items.length === 0 ? (
            <EmptyState icon="users" title="No participants yet" description="Add your first diver on the left." />
          ) : (
            <table className="table">
              <thead><tr><th>Name</th><th>Year</th><th>Club</th><th></th></tr></thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id}>
                    <td><b>{d.firstName} {d.lastName}</b> <span className="muted">{d.gender}</span></td>
                    <td className="mono">{d.birthYear}</td>
                    <td className="dim">{d.clubId || '—'}</td>
                    <td style={{ textAlign: 'right' }}><Button variant="danger" onClick={() => remove(d.id)}>Delete</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}

/* ---------------- Categories ---------------- */
export function Categories() {
  const { items, refresh, loading, error } = useCollection<Category>('/categories');
  const competitions = useCollection<Competition>('/competitions');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('F');
  const [ageGroup, setAgeGroup] = useState('12-13');
  const [disciplineId, setDisciplineId] = useState<Discipline>('springboard-3m');
  const [diveCount, setDiveCount] = useState(6);
  const [competitionId, setCompetitionId] = useState('');
  const [minBirthYear, setMinBirthYear] = useState<number | ''>('');
  const [maxBirthYear, setMaxBirthYear] = useState<number | ''>('');

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const id = newId();
    await api.put(`/categories/${id}`, {
      id, name: name.trim(), gender, ageGroup, disciplineId,
      rules: { diveCount },
      competitionId: competitionId || undefined,
      minBirthYear: minBirthYear === '' ? undefined : minBirthYear,
      maxBirthYear: maxBirthYear === '' ? undefined : maxBirthYear,
    });
    setName(''); setMinBirthYear(''); setMaxBirthYear('');
    refresh();
  };
  const remove = async (id: string) => { await api.del(`/categories/${id}`); refresh(); };
  const compName = (cid?: string) => competitions.items.find((c) => c.id === cid)?.name ?? '—';

  return (
    <>
      <div className="page-head"><h1>Categories</h1><p>Gender × age group × event, with dive-sheet rules.</p></div>
      <div className="grid cols-2">
        <Card title="New category">
          <form className="col" onSubmit={add}>
            <Field label="Name"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Girls 12-13 — 3m" /></Field>
            <div className="grid cols-2">
              <Field label="Gender">
                <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
                  <option value="F">Girls</option><option value="M">Boys</option><option value="X">Mixed</option>
                </select>
              </Field>
              <Field label="Age group"><input value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} /></Field>
              <Field label="Event">
                <select value={disciplineId} onChange={(e) => setDisciplineId(e.target.value as Discipline)}>
                  {DISCIPLINES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Number of dives"><input type="number" value={diveCount} onChange={(e) => setDiveCount(Number(e.target.value))} /></Field>
            </div>
            <div className="grid cols-2">
              <Field label="Born from (year)" hint="Oldest birth year in this group"><input type="number" placeholder="e.g. 2016" value={minBirthYear} onChange={(e) => setMinBirthYear(e.target.value === '' ? '' : Number(e.target.value))} /></Field>
              <Field label="Born until (year)" hint="Youngest birth year (optional)"><input type="number" placeholder="e.g. 2017" value={maxBirthYear} onChange={(e) => setMaxBirthYear(e.target.value === '' ? '' : Number(e.target.value))} /></Field>
            </div>
            <Field label="Competition">
              <select value={competitionId} onChange={(e) => setCompetitionId(e.target.value)}>
                <option value="">— none —</option>
                {competitions.items.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </Field>
            <Button type="submit" icon="plus">Add category</Button>
          </form>
        </Card>

        <Card title="Categories" actions={<Badge tone="info">{items.length}</Badge>}>
          <ErrorNote error={error} />
          {loading ? <p className="muted">Loading…</p> : items.length === 0 ? (
            <EmptyState icon="layers" title="No categories yet" description="Add your first category on the left." />
          ) : (
            <table className="table">
              <thead><tr><th>Name</th><th>Event</th><th>Competition</th><th></th></tr></thead>
              <tbody>
                {items.map((cat) => (
                  <tr key={cat.id}>
                    <td><b>{cat.name}</b><br /><span className="muted">{cat.gender} · {cat.ageGroup} · {cat.rules.diveCount} dives{ageBandLabel(cat) ? ` · ${ageBandLabel(cat)}` : ''}</span></td>
                    <td className="dim">{cat.disciplineId}</td>
                    <td className="dim">{compName(cat.competitionId)}</td>
                    <td style={{ textAlign: 'right' }}><Button variant="danger" onClick={() => remove(cat.id)}>Delete</Button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </>
  );
}

/* ---------------- Sign-ups (self-service registrations) ---------------- */
interface RegDetail {
  registration: Registration;
  divers: Diver[];
  entries: Entry[];
  sheets: Record<string, DiveSheet>;
}

export function Registrations() {
  const competitions = useCollection<Competition>('/competitions');
  const categories = useCollection<Category>('/categories');
  const [competitionId, setCompetitionId] = useState('');
  const [regs, setRegs] = useState<Registration[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!competitionId) { setRegs([]); return; }
    setLoading(true);
    api.list<Registration>(`/competitions/${competitionId}/registrations`).then(setRegs).finally(() => setLoading(false));
  }, [competitionId]);

  const catById = new Map(categories.items.map((c) => [c.id, c]));

  return (
    <>
      <div className="page-head"><h1>Sign-ups</h1><p>Self-registered clubs and the programs they submitted, per competition.</p></div>
      <Card title="Competition">
        <Field label="Choose competition">
          <select value={competitionId} onChange={(e) => setCompetitionId(e.target.value)}>
            <option value="">— choose competition —</option>
            {competitions.items.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
          </select>
        </Field>
      </Card>

      {competitionId ? (
        <Card title="Sign-ups" actions={<Badge tone="info">{regs.length}</Badge>}>
          {loading ? <p className="muted">Loading…</p> : regs.length === 0 ? (
            <EmptyState icon="users" title="No sign-ups yet" description="As soon as a club signs up via the public link, it appears here." />
          ) : (
            <div className="col">
              {regs.map((r) => <RegRow key={r.id} reg={r} catById={catById} />)}
            </div>
          )}
        </Card>
      ) : null}
    </>
  );
}

function RegRow({ reg, catById }: { reg: Registration; catById: Map<string, Category> }) {
  const [open, setOpen] = useState(false);
  const [detail, setDetail] = useState<RegDetail | null>(null);

  useEffect(() => {
    if (open && !detail) api.get<RegDetail>(`/registrations/${reg.id}`).then(setDetail);
  }, [open, detail, reg.id]);

  const diverName = (id: string) => {
    const d = detail?.divers.find((x) => x.id === id);
    return d ? `${d.firstName} ${d.lastName}` : id;
  };
  const status = (e: Entry) => {
    const cat = catById.get(e.categoryId);
    const sheet = detail?.sheets[e.id];
    if (!sheet || sheet.dives.length === 0) return <Badge tone="warn">no sheet</Badge>;
    if (!cat) return <Badge tone="neutral">?</Badge>;
    return validateSheet(cat.disciplineId as Discipline, sheet.dives, cat.rules).valid
      ? <Badge tone="good">valid</Badge> : <Badge tone="bad">invalid</Badge>;
  };

  return (
    <div style={{ borderRadius: 12, border: '1px solid var(--line-soft)' }}>
      <button className="row between" onClick={() => setOpen(!open)} style={{ all: 'unset', cursor: 'pointer', width: '100%', boxSizing: 'border-box', padding: '12px 14px' }}>
        <span className="col" style={{ gap: 2 }}>
          <b>{reg.clubName || reg.contactName}</b>
          <span className="muted" style={{ fontSize: '0.84rem' }}>{reg.contactName} · {reg.contactEmail}</span>
        </span>
        <span className="row" style={{ gap: 10 }}>
          {reg.status === 'submitted' ? <Badge tone="good">submitted</Badge> : <Badge tone="warn">draft</Badge>}
        </span>
      </button>
      {open ? (
        <div style={{ padding: '0 14px 14px' }}>
          {!detail ? <p className="muted">Loading…</p> : detail.entries.length === 0 ? (
            <p className="muted">No entries filled in yet.</p>
          ) : (
            <table className="table">
              <thead><tr><th>Diver</th><th>Category</th><th>Status</th></tr></thead>
              <tbody>
                {detail.entries.map((e) => (
                  <tr key={e.id}>
                    <td>{diverName(e.diverId)}</td>
                    <td className="dim">{catById.get(e.categoryId)?.name ?? e.categoryId}</td>
                    <td>{status(e)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      ) : null}
    </div>
  );
}
