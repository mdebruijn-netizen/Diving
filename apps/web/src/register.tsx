import { useEffect, useMemo, useState } from 'react';
import { Badge, Button, Card, EmptyState, Field, Logo } from '@aquameet/ui';
import type { Category, Competition, DiveSheet, Diver, Entry, Gender } from '@aquameet/competition';
import { publicApi, newId } from './public-api';
import { parseSheetInput, validateSheet, type Discipline } from './sheet';

const SHELL: React.CSSProperties = { maxWidth: 760, margin: '0 auto', padding: '40px 20px' };

type OpenCompetition = Pick<Competition, 'id' | 'name' | 'date' | 'location' | 'registrationDeadline'>;

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
    publicApi.get<OpenCompetition[]>('/competitions').then(setComps).catch(() => setError('Kon wedstrijden niet laden.'));
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!competitionId || !contactName.trim() || !contactEmail.trim()) return;
    try {
      const res = await publicApi.post<{ token: string }>('/register', { competitionId, contactName, contactEmail, clubName });
      setToken(res.token);
    } catch {
      setError('Aanmelden mislukte. Is de inschrijving nog open?');
    }
  };

  if (token) {
    const link = `${window.location.origin}/web/#/r/${token}`;
    return (
      <div className="content" style={SHELL}>
        <Logo />
        <Card title="Je bent aangemeld 🎉">
          <p>Bewaar deze persoonlijke link — hiermee beheer je je divers en programma's, en volg je later de updates van de wedstrijd:</p>
          <p><code className="mono" style={{ wordBreak: 'break-all' }}>{link}</code></p>
          <p className="muted">(In de testfase versturen we nog geen e-mail; bewaar de link of klik hieronder.)</p>
          <a href={`#/r/${token}`}><Button icon="play">Open mijn inschrijving</Button></a>
        </Card>
      </div>
    );
  }

  return (
    <div className="content" style={SHELL}>
      <div className="between" style={{ marginBottom: 20 }}><Logo /><Badge tone="info">Inschrijven</Badge></div>
      <Card title="Aanmelden voor een wedstrijd">
        {error ? <p className="muted" style={{ color: 'var(--bad)' }}>{error}</p> : null}
        {comps.length === 0 ? (
          <EmptyState icon="trophy" title="Geen open inschrijvingen" description="Er staat op dit moment geen wedstrijd open voor inschrijving." />
        ) : (
          <form className="col" onSubmit={submit}>
            <Field label="Wedstrijd">
              <select value={competitionId} onChange={(e) => setCompetitionId(e.target.value)}>
                <option value="">— kies wedstrijd —</option>
                {comps.map((w) => <option key={w.id} value={w.id}>{w.name} · {w.date}{w.location ? ` · ${w.location}` : ''}</option>)}
              </select>
            </Field>
            <Field label="Naam contactpersoon"><input value={contactName} onChange={(e) => setContactName(e.target.value)} /></Field>
            <Field label="E-mail"><input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} /></Field>
            <Field label="Club (optioneel)"><input value={clubName} onChange={(e) => setClubName(e.target.value)} /></Field>
            <Button type="submit" icon="check">Aanmelden</Button>
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
        <Card title="Link niet gevonden"><p className="muted">Deze inschrijflink is ongeldig of verlopen.</p></Card>
      </div>
    );
  }
  if (!data) return <div className="content" style={SHELL}><Logo /><p className="muted">Laden…</p></div>;

  const locked = data.registration.status === 'submitted';

  return (
    <div className="content" style={SHELL}>
      <div className="between" style={{ marginBottom: 20 }}>
        <Logo />
        {locked ? <Badge tone="good">Ingediend</Badge> : <Badge tone="warn">Concept</Badge>}
      </div>

      <Card title={data.competition?.name ?? 'Inschrijving'}>
        <p className="muted" style={{ marginTop: 0 }}>
          {data.registration.clubName ? `${data.registration.clubName} · ` : ''}{data.registration.contactName}
          {data.competition?.date ? ` · ${data.competition.date}` : ''}
        </p>
        {locked ? <p>Je inschrijving is ingediend. Wijzigingen zijn niet meer mogelijk.</p> : null}
      </Card>

      {data.divers.length === 0 ? (
        <EmptyState icon="users" title="Nog geen divers" description="Voeg hieronder je eerste diver toe." />
      ) : (
        data.divers.map((d) => (
          <DiverBlock key={d.id} token={token} diver={d} data={data} locked={locked} onChange={reload} />
        ))
      )}

      {!locked ? <AddDiver token={token} onAdded={reload} /> : null}

      {!locked && data.divers.length > 0 ? (
        <Card title="Indienen">
          <p className="muted" style={{ marginTop: 0 }}>Klaar? Dien je inschrijving in. Daarna kun je niet meer wijzigen.</p>
          <Button icon="check" onClick={async () => { await publicApi.post(`/registration/${token}/submit`); reload(); }}>
            Inschrijving indienen
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
    <Card title="Diver toevoegen">
      <form className="col" onSubmit={add}>
        <div className="grid cols-2">
          <Field label="Voornaam"><input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
          <Field label="Achternaam"><input value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
          <Field label="Geslacht">
            <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
              <option value="F">Meisje/Vrouw</option><option value="M">Jongen/Man</option><option value="X">Overig</option>
            </select>
          </Field>
          <Field label="Geboortejaar"><input type="number" value={birthYear} onChange={(e) => setBirthYear(Number(e.target.value))} /></Field>
        </div>
        <Button type="submit" icon="plus">Diver toevoegen</Button>
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
    if (!sheet || sheet.dives.length === 0) return <Badge tone="warn">geen lijst</Badge>;
    if (!cat) return <Badge tone="neutral">?</Badge>;
    return validateSheet(cat.disciplineId as Discipline, sheet.dives, cat.rules).valid
      ? <Badge tone="good">geldig</Badge> : <Badge tone="bad">ongeldig</Badge>;
  };

  return (
    <Card
      title={`${diver.firstName} ${diver.lastName}`}
      actions={!locked ? <Button variant="danger" onClick={async () => { await publicApi.del(`/registration/${token}/divers/${diver.id}`); onChange(); }}>Verwijderen</Button> : undefined}
    >
      {myEntries.length > 0 ? (
        <table className="table" style={{ marginBottom: locked ? 0 : 14 }}>
          <thead><tr><th>Categorie</th><th>Status</th>{!locked ? <th></th> : null}</tr></thead>
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
      ) : <p className="muted">Nog geen programma's.</p>}

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

  const category = categories.find((c) => c.id === categoryId);
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
      <Field label="Programma toevoegen — kies categorie">
        <select value={categoryId} onChange={(e) => setCategoryId(e.target.value)}>
          <option value="">— kies categorie —</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.rules.diveCount} sprongen)</option>)}
        </select>
      </Field>
      {category ? (
        <>
          <Field label="Sprongen" hint="Eén per regel: code positie — bv. 5253 B">
            <textarea value={text} onChange={(e) => setText(e.target.value)} rows={7} placeholder={'101 B\n201 B\n301 B'} />
          </Field>
          {dives.length > 0 && result ? (
            result.valid ? (
              <Badge tone="good">Geldig · totaal DD {result.totalDd.toFixed(1)}</Badge>
            ) : (
              <div className="col" style={{ gap: 6 }}>
                {result.issues.map((iss, i) => (
                  <span key={i} className="dim" style={{ fontSize: '0.9rem' }}>
                    <Badge tone="bad">{iss.code}</Badge> {iss.message}{iss.diveIndex !== undefined ? ` (regel ${iss.diveIndex + 1})` : ''}
                  </span>
                ))}
              </div>
            )
          ) : null}
          <Button icon="check" disabled={!canSave} onClick={save}>{saving ? 'Opslaan…' : 'Programma opslaan'}</Button>
        </>
      ) : null}
    </div>
  );
}
