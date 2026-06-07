import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, Field, Logo } from '@aquameet/ui';
import type { Category, Competition, DiveSheet, Diver, Entry, Gender } from '@aquameet/competition';
import { ageBandLabel, formatDateRange, isDiverEligible, isOwnGroup } from '@aquameet/competition';
import { publicApi, newId } from './public-api';
import { parseSheetInput, validateSheet, type Discipline } from './sheet';

const SHELL: React.CSSProperties = { maxWidth: 760, margin: '0 auto', padding: '40px 20px' };

type OpenCompetition = Pick<Competition, 'id' | 'name' | 'date' | 'endDate' | 'location' | 'registrationDeadline'>;

/* ---------------- Join: pick a competition and register ---------------- */
export function Join() {
  const [comps, setComps] = useState<OpenCompetition[]>([]);
  const [competitionId, setCompetitionId] = useState('');
  const [contactName, setContactName] = useState('');
  const [contactEmail, setContactEmail] = useState('');
  const [clubName, setClubName] = useState('');
  const [token, setToken] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    publicApi.get<OpenCompetition[]>('/competitions').then(setComps).catch(() => setError('Could not load competitions.'));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!competitionId || !contactName.trim() || !contactEmail.trim()) return;
    try {
      const res = await publicApi.post<{ token: string }>('/register', { competitionId, contactName, contactEmail, clubName });
      setToken(res.token);
    } catch {
      setError('Sign-up failed. Is registration still open?');
    }
  };

  if (token) {
    const link = `${window.location.origin}/web/#/r/${token}`;
    return (
      <div className="content" style={SHELL}>
        <Logo />
        <Card title="You're signed up 🎉">
          <p>Keep this personal link — use it to manage your divers and programs, and to follow competition updates later:</p>
          <p><code className="mono" style={{ wordBreak: 'break-all' }}>{link}</code></p>
          <p className="muted">(During the preview we don't send email yet; save the link or click below.)</p>
          <a href={`#/r/${token}`}><Button icon="play">Open my registration</Button></a>
        </Card>
      </div>
    );
  }

  return (
    <div className="content" style={SHELL}>
      <div className="between" style={{ marginBottom: 20 }}><Logo /><Badge tone="info">Sign up</Badge></div>
      <Card title="Sign up for a competition">
        {error ? <p className="muted" style={{ color: 'var(--bad)' }}>{error}</p> : null}
        {comps.length === 0 ? (
          <EmptyState icon="trophy" title="No open registrations" description="There's no competition open for registration right now." />
        ) : (
          <form className="col" onSubmit={submit}>
            <Field label="Competition">
              <select value={competitionId} onChange={(e) => setCompetitionId(e.target.value)}>
                <option value="">— choose competition —</option>
                {comps.map((w) => <option key={w.id} value={w.id}>{w.name} · {formatDateRange(w.date, w.endDate)}{w.location ? ` · ${w.location}` : ''}</option>)}
              </select>
            </Field>
            <Field label="Contact name"><input value={contactName} onChange={(e) => setContactName(e.target.value)} /></Field>
            <Field label="Email"><input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></Field>
            <Field label="Club (optional)"><input value={clubName} onChange={(e) => setClubName(e.target.value)} /></Field>
            <Button type="submit" icon="check">Sign up</Button>
          </form>
        )}
      </Card>
    </div>
  );
}

/* ---------------- Registration page (magic-link scoped) ---------------- */
interface RegData {
  registration: { id: string; status: 'open' | 'submitted'; contactName: string; clubName?: string };
  competition: Competition | undefined;
  categories: Category[];
  divers: Diver[];
  entries: Entry[];
  sheets: Record<string, DiveSheet>;
}

export function RegistrationPage({ token }: { token: string }) {
  const [data, setData] = useState<RegData | null | 'notfound'>(null);

  const reload = () => {
    publicApi.get<RegData>(`/registration/${token}`).then(setData).catch(() => setData('notfound'));
  };
  useEffect(reload, [token]);

  if (data === 'notfound') {
    return (
      <div className="content" style={SHELL}>
        <Logo />
        <Card title="Link not found"><p className="muted">This sign-up link is invalid or expired.</p></Card>
      </div>
    );
  }
  if (!data) return <div className="content" style={SHELL}><Logo /><p className="muted">Loading…</p></div>;

  const locked = data.registration.status === 'submitted';

  return (
    <div className="content" style={SHELL}>
      <div className="between" style={{ marginBottom: 20 }}>
        <Logo />
        {locked ? <Badge tone="good">Submitted</Badge> : <Badge tone="warn">Draft</Badge>}
      </div>

      <Card title={data.competition?.name ?? 'Registration'}>
        <p className="muted" style={{ marginTop: 0 }}>
          {data.registration.clubName ? `${data.registration.clubName} · ` : ''}{data.registration.contactName}
          {data.competition?.date ? ` · ${formatDateRange(data.competition.date, data.competition.endDate)}` : ''}
        </p>
        {locked ? <p>Your registration has been submitted. Changes are no longer possible.</p> : null}
      </Card>

      {data.divers.length === 0 ? (
        <EmptyState icon="users" title="No divers yet" description="Add your first diver below." />
      ) : (
        data.divers.map((d) => (
          <DiverBlock key={d.id} token={token} diver={d} data={data} locked={locked} onChange={reload} />
        ))
      )}

      {!locked ? <AddDiver token={token} onAdded={reload} /> : null}

      {!locked && data.divers.length > 0 ? (
        <Card title="Submit">
          <p className="muted" style={{ marginTop: 0 }}>Done? Submit your registration. After that you can't make changes.</p>
          <Button icon="check" onClick={async () => { await publicApi.post(`/registration/${token}/submit`); reload(); }}>
            Submit registration
          </Button>
        </Card>
      ) : null}
    </div>
  );
}

function AddDiver({ token, onAdded }: { token: string; onAdded: () => void }) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<Gender>('F');
  const [birthYear, setBirthYear] = useState(2012);

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!firstName.trim() || !lastName.trim()) return;
    await publicApi.post(`/registration/${token}/divers`, { firstName: firstName.trim(), lastName: lastName.trim(), gender, birthYear, clubId: '' });
    setFirstName(''); setLastName('');
    onAdded();
  };

  return (
    <Card title="Add diver">
      <form className="col" onSubmit={add}>
        <div className="grid cols-2">
          <Field label="First name"><input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
          <Field label="Last name"><input value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
          <Field label="Gender">
            <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
              <option value="F">Female</option><option value="M">Male</option><option value="X">Other</option>
            </select>
          </Field>
          <Field label="Birth year"><input type="number" value={birthYear} onChange={(e) => setBirthYear(Number(e.target.value))} /></Field>
        </div>
        <Button type="submit" icon="plus">Add diver</Button>
      </form>
    </Card>
  );
}

function DiverBlock({ token, diver, data, locked, onChange }: {
  token: string; diver: Diver; data: RegData; locked: boolean; onChange: () => void;
}) {
  const catById = useMemo(() => new Map(data.categories.map((c) => [c.id, c])), [data.categories]);
  const myEntries = data.entries.filter((e) => e.diverId === diver.id);

  const status = (e: Entry) => {
    const cat = catById.get(e.categoryId);
    const sheet = data.sheets[e.id];
    if (!sheet || sheet.dives.length === 0) return <Badge tone="warn">no sheet</Badge>;
    if (!cat) return <Badge tone="neutral">?</Badge>;
    return validateSheet(cat.disciplineId as Discipline, sheet.dives, cat.rules).valid
      ? <Badge tone="good">valid</Badge> : <Badge tone="bad">invalid</Badge>;
  };

  return (
    <Card
      title={`${diver.firstName} ${diver.lastName}`}
      actions={!locked ? <Button variant="danger" onClick={async () => { await publicApi.del(`/registration/${token}/divers/${diver.id}`); onChange(); }}>Remove</Button> : undefined}
    >
      {myEntries.length > 0 ? (
        <table className="table" style={{ marginBottom: locked ? 0 : 14 }}>
          <thead><tr><th>Category</th><th>Status</th>{!locked ? <th></th> : null}</tr></thead>
          <tbody>
            {myEntries.map((e) => (
              <tr key={e.id}>
                <td>{catById.get(e.categoryId)?.name ?? e.categoryId}</td>
                <td>{status(e)}</td>
                {!locked ? <td style={{ textAlign: 'right' }}><Button variant="danger" onClick={async () => { await publicApi.del(`/registration/${token}/entries/${e.id}`); onChange(); }}>×</Button></td> : null}
              </tr>
            ))}
          </tbody>
        </table>
      ) : <p className="muted">No programs yet.</p>}

      {!locked ? <AddProgram token={token} diver={diver} categories={data.categories} onSaved={onChange} /> : null}
    </Card>
  );
}

function AddProgram({ token, diver, categories, onSaved }: {
  token: string; diver: Diver; categories: Category[]; onSaved: () => void;
}) {
  const [categoryId, setCategoryId] = useState('');
  const [text, setText] = useState('');
  const [saving, setSaving] = useState(false);

  // A diver may enter their own group or an older/harder one — never a younger/easier group.
  const eligible = useMemo(() => categories.filter((c) => isDiverEligible(diver.birthYear, c)), [categories, diver.birthYear]);
  const category = eligible.find((c) => c.id === categoryId);
  const dives = useMemo(() => parseSheetInput(text), [text]);
  const result = useMemo(
    () => (category ? validateSheet(category.disciplineId as Discipline, dives, category.rules) : null),
    [category, dives],
  );
  const canSave = !!category && dives.length > 0 && !!result?.valid && !saving;

  const save = async () => {
    if (!canSave || !category) return;
    setSaving(true);
    try {
      const entryId = newId();
      await publicApi.put(`/registration/${token}/entries/${entryId}`, { diverId: diver.id, categoryId: category.id });
      await publicApi.put(`/registration/${token}/sheets/${entryId}`, { dives });
      setCategoryId(''); setText('');
      onSaved();
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="col" style={{ marginTop: 6, paddingTop: 12, borderTop: '1px solid var(--line-soft)' }}>
      <Field label="Add a program — choose group/event" hint={`Groups for ${diver.firstName} (born ${diver.birthYear}) — own group or older`}>
        {eligible.length === 0 ? (
          <p className="muted">No groups available for this birth year yet.</p>
        ) : (
          <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
            <option value="">— choose group/event —</option>
            {eligible.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.rules.diveCount} dives){isOwnGroup(diver.birthYear, c) ? ' — own group' : ageBandLabel(c) ? ` — ${ageBandLabel(c)}` : ''}
              </option>
            ))}
          </select>
        )}
      </Field>
      {category ? (
        <>
          <Field label="Dives" hint="One per line: code position — e.g. 5253 B">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} placeholder={'101 B\n201 B\n301 B'} />
          </Field>
          {dives.length > 0 && result ? (
            result.valid ? (
              <Badge tone="good">Valid · total DD {result.totalDd.toFixed(1)}</Badge>
            ) : (
              <div className="col" style={{ gap: 6 }}>
                {result.issues.map((iss, i) => (
                  <span key={i} className="dim" style={{ fontSize: '0.9rem' }}>
                    <Badge tone="bad">{iss.code}</Badge> {iss.message}{iss.diveIndex !== undefined ? ` (line ${iss.diveIndex + 1})` : ''}
                  </span>
                ))}
              </div>
            )
          ) : null}
          <Button icon="check" disabled={!canSave} onClick={save}>{saving ? 'Saving…' : 'Save program'}</Button>
        </>
      ) : null}
    </div>
  );
}
