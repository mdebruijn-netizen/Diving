import { useMemo, useState } from 'react';
import { DISCIPLINES, type Discipline, parseSheetInput, validateSheet } from './view-model';

/**
 * Dive-sheet validation tool: a coach enters a dive list (one "code position"
 * per line) and sees, live, whether it is legal for a category — count, group
 * coverage, unknown dives, duplicates and DD cap — checked against the official
 * FINA table. Catches illegal sheets before the meet, not at poolside.
 */
export function App() {
  const [discipline, setDiscipline] = useState<Discipline>('springboard-3m');
  const [diveCount, setDiveCount] = useState(6);
  const [distinctGroups, setDistinctGroups] = useState(4);
  const [maxTotalDd, setMaxTotalDd] = useState<number | ''>('');
  const [text, setText] = useState('101 B\n201 B\n301 B\n401 B\n5253 B\n105 B');

  const result = useMemo(
    () =>
      validateSheet(discipline, parseSheetInput(text), {
        diveCount,
        requireDistinctGroups: distinctGroups,
        maxTotalDd: maxTotalDd === '' ? undefined : maxTotalDd,
      }),
    [discipline, text, diveCount, distinctGroups, maxTotalDd],
  );

  return (
    <main className="admin">
      <h1>Dive-sheet validatie</h1>
      <div className="config">
        <label>
          Onderdeel
          <select value={discipline} onChange={(e) => setDiscipline(e.target.value as Discipline)}>
            {DISCIPLINES.map((d) => (
              <option key={d} value={d}>
                {d}
              </option>
            ))}
          </select>
        </label>
        <label>
          Aantal sprongen
          <input type="number" value={diveCount} onChange={(e) => setDiveCount(Number(e.target.value))} />
        </label>
        <label>
          Min. groepen
          <input
            type="number"
            value={distinctGroups}
            onChange={(e) => setDistinctGroups(Number(e.target.value))}
          />
        </label>
        <label>
          Max. totaal-DD
          <input
            type="number"
            value={maxTotalDd}
            onChange={(e) => setMaxTotalDd(e.target.value === '' ? '' : Number(e.target.value))}
          />
        </label>
      </div>

      <textarea
        rows={8}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Eén sprong per regel: code positie (bv. 5253 B)"
      />

      <section className={result.valid ? 'verdict ok' : 'verdict bad'}>
        <strong>{result.valid ? '✓ Geldige lijst' : '✗ Lijst ongeldig'}</strong>
        <span> — totaal DD {result.totalDd.toFixed(1)}</span>
      </section>

      {result.issues.length > 0 && (
        <ul className="issues">
          {result.issues.map((issue, i) => (
            <li key={i}>
              <code>{issue.code}</code>
              {issue.diveIndex !== undefined ? ` (regel ${issue.diveIndex + 1})` : ''}: {issue.message}
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}
