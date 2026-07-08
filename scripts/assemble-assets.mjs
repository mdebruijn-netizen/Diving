// Collect the built front-ends into apps/api/public/{web,judge,admin} so the
// API Worker serves them as static assets from one origin (one deploy).
import { cp, mkdir, rm } from 'node:fs/promises';

const out = 'apps/api/public';
await rm(out, { recursive: true, force: true });
await mkdir(out, { recursive: true });

for (const app of ['web', 'judge', 'admin']) {
  await cp(`apps/${app}/dist`, `${out}/${app}`, { recursive: true });
  console.log(`assembled apps/${app}/dist -> ${out}/${app}`);
}
