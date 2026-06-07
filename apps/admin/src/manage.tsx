import { useState } from 'react';
import { Badge, Button, Card, EmptyState, Field } from '@aquameet/ui';
import type { Category, Competition, Diver, Gender } from '@aquameet/competition';
import { api, newId, useCollection } from './api';
import { DISCIPLINES, type Discipline } from './view-model';

function ErrorNote({ error }: { error: string | null }) {
  if (!error) return null;
  return <p className="muted" style={{ color: 'var(--bad)' }}>Kon niet laden: {error}. Is de API gedeployed en de database-migratie gedraaid?</p>;
}

/* ---------------- Wedstrijden ---------------- */
export function Competitions() {
  const { items, refresh, loading, error } = useCollection<Competition>('/competitions');
  const [name, setName] = useState('');
  const [date, setDate] = useState('');
  const [location, setLocation] = useState('');

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const id = newId();
    await api.put(`/competitions/${id}`, { id, name: name.trim(), date: date || new Date().toISOString().slice(0, 10), location: location.trim() || undefined });
    setName(''); setDate(''); setLocation('');
    refresh();
  };

  const remove = async (id: string) => { await api.del(`/competitions/${id}`); refresh(); };

  return (
    <>
      <div className="page-head"><h1>Wedstrijden</h1><p>Maak en beheer je wedstrijden.</p></div>
      <div className="grid cols-2">
        <Card title="Nieuwe wedstrijd">
          <form className="col" onSubmit={add}>
            <Field label="Naam"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Voorjaarswedstrijd 2026" /></Field>
            <div className="grid cols-2">
              <Field label="Datum"><input type="date" value={date} onChange={(e) => setDate(e.target.value)} /></Field>
              <Field label="Locatie"><input value={location} onChange={(e) => setLocation(e.target.value)} placeholder="Zwembad…" /></Field>
            </div>
            <Button type="submit" icon="plus">Wedstrijd toevoegen</Button>
          </form>
        </Card>

        <Card title="Wedstrijden" actions={<Badge tone="info">{items.length}</Badge>}>
          <ErrorNote error={error} />
          {loading ? <p className="muted">Laden…</p> : items.length === 0 ? (
            <EmptyState icon="trophy" title="Nog geen wedstrijden" description="Voeg links je eerste wedstrijd toe." />
          ) : (
            <table className="table">
              <thead><tr><th>Naam</th><th>Datum</th><th>Locatie</th><th></th></tr></thead>
              <tbody>
                {items.map((w) => (
                  <tr key={w.id}>
                    <td><b>{w.name}</b></td>
                    <td className="mono">{w.date}</td>
                    <td className="dim">{w.location ?? '—'}</td>
                    <td style={{ textAlign: 'right' }}><Button variant="danger" onClick={() => remove(w.id)}>Verwijderen</Button></td>
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

/* ---------------- Deelnemers ---------------- */
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
      <div className="page-head"><h1>Deelnemers</h1><p>Beheer de divers die meedoen.</p></div>
      <div className="grid cols-2">
        <Card title="Nieuwe deelnemer">
          <form className="col" onSubmit={add}>
            <div className="grid cols-2">
              <Field label="Voornaam"><input value={firstName} onChange={(e) => setFirstName(e.target.value)} /></Field>
              <Field label="Achternaam"><input value={lastName} onChange={(e) => setLastName(e.target.value)} /></Field>
              <Field label="Geslacht">
                <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
                  <option value="F">Meisje/Vrouw</option>
                  <option value="M">Jongen/Man</option>
                  <option value="X">Gemengd/Overig</option>
                </select>
              </Field>
              <Field label="Geboortejaar"><input type="number" value={birthYear} onChange={(e) => setBirthYear(Number(e.target.value))} /></Field>
            </div>
            <Field label="Club"><input value={club} onChange={(e) => setClub(e.target.value)} placeholder="Clubnaam" /></Field>
            <Button type="submit" icon="plus">Deelnemer toevoegen</Button>
          </form>
        </Card>

        <Card title="Deelnemers" actions={<Badge tone="info">{items.length}</Badge>}>
          <ErrorNote error={error} />
          {loading ? <p className="muted">Laden…</p> : items.length === 0 ? (
            <EmptyState icon="users" title="Nog geen deelnemers" description="Voeg links je eerste diver toe." />
          ) : (
            <table className="table">
              <thead><tr><th>Naam</th><th>Jaar</th><th>Club</th><th></th></tr></thead>
              <tbody>
                {items.map((d) => (
                  <tr key={d.id}>
                    <td><b>{d.firstName} {d.lastName}</b> <span className="muted">{d.gender}</span></td>
                    <td className="mono">{d.birthYear}</td>
                    <td className="dim">{d.clubId || '—'}</td>
                    <td style={{ textAlign: 'right' }}><Button variant="danger" onClick={() => remove(d.id)}>Verwijderen</Button></td>
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

/* ---------------- Categorieën ---------------- */
export function Categories() {
  const { items, refresh, loading, error } = useCollection<Category>('/categories');
  const competitions = useCollection<Competition>('/competitions');
  const [name, setName] = useState('');
  const [gender, setGender] = useState<Gender>('F');
  const [ageGroup, setAgeGroup] = useState('12-13');
  const [disciplineId, setDisciplineId] = useState<Discipline>('springboard-3m');
  const [diveCount, setDiveCount] = useState(6);
  const [competitionId, setCompetitionId] = useState('');

  const add = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const id = newId();
    await api.put(`/categories/${id}`, {
      id, name: name.trim(), gender, ageGroup, disciplineId,
      rules: { diveCount },
      competitionId: competitionId || undefined,
    });
    setName('');
    refresh();
  };
  const remove = async (id: string) => { await api.del(`/categories/${id}`); refresh(); };
  const compName = (cid?: string) => competitions.items.find((c) => c.id === cid)?.name ?? '—';

  return (
    <>
      <div className="page-head"><h1>Categorieën</h1><p>Geslacht × leeftijdsgroep × onderdeel, met sprongregels.</p></div>
      <div className="grid cols-2">
        <Card title="Nieuwe categorie">
          <form className="col" onSubmit={add}>
            <Field label="Naam"><input value={name} onChange={(e) => setName(e.target.value)} placeholder="Meisjes 12-13 — 3m" /></Field>
            <div className="grid cols-2">
              <Field label="Geslacht">
                <select value={gender} onChange={(e) => setGender(e.target.value as Gender)}>
                  <option value="F">Meisjes</option><option value="M">Jongens</option><option value="X">Gemengd</option>
                </select>
              </Field>
              <Field label="Leeftijdsgroep"><input value={ageGroup} onChange={(e) => setAgeGroup(e.target.value)} /></Field>
              <Field label="Onderdeel">
                <select value={disciplineId} onChange={(e) => setDisciplineId(e.target.value as Discipline)}>
                  {DISCIPLINES.map((d) => <option key={d} value={d}>{d}</option>)}
                </select>
              </Field>
              <Field label="Aantal sprongen"><input type="number" value={diveCount} onChange={(e) => setDiveCount(Number(e.target.value))} /></Field>
            </div>
            <Field label="Wedstrijd">
              <select value={competitionId} onChange={(e) => setCompetitionId(e.target.value)}>
                <option value="">— geen —</option>
                {competitions.items.map((w) => <option key={w.id} value={w.id}>{w.name}</option>)}
              </select>
            </Field>
            <Button type="submit" icon="plus">Categorie toevoegen</Button>
          </form>
        </Card>

        <Card title="Categorieën" actions={<Badge tone="info">{items.length}</Badge>}>
          <ErrorNote error={error} />
          {loading ? <p className="muted">Laden…</p> : items.length === 0 ? (
            <EmptyState icon="layers" title="Nog geen categorieën" description="Voeg links je eerste categorie toe." />
          ) : (
            <table className="table">
              <thead><tr><th>Naam</th><th>Onderdeel</th><th>Wedstrijd</th><th></th></tr></thead>
              <tbody>
                {items.map((cat) => (
                  <tr key={cat.id}>
                    <td><b>{cat.name}</b><br /><span className="muted">{cat.gender} · {cat.ageGroup} · {cat.rules.diveCount} sprongen</span></td>
                    <td className="dim">{cat.disciplineId}</td>
                    <td className="dim">{compName(cat.competitionId)}</td>
                    <td style={{ textAlign: 'right' }}><Button variant="danger" onClick={() => remove(cat.id)}>Verwijderen</Button></td>
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
