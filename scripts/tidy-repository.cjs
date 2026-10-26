// SPDX-License-Identifier: MPL-2.0
// Keep the current Pages deployment; remove superseded records and the merged V1 branch.
const { execFileSync } = require('node:child_process');
const repo = process.env.GITHUB_REPOSITORY;
const api = (path, args = []) => execFileSync('gh', ['api', path, ...args], { encoding: 'utf8' });
if (repo !== 'JustAJad/anime-samani' || JSON.parse(api('repos/' + repo)).id !== 1432238651)
  throw new Error('Unexpected repository');
const deployments = JSON.parse(
  api(`repos/${repo}/deployments?environment=github-pages&per_page=100`)
);
const states = new Map(
  deployments.map(d => [
    d.id,
    JSON.parse(api(`repos/${repo}/deployments/${d.id}/statuses?per_page=1`))[0]?.state,
  ])
);
const keep = deployments.find(d => states.get(d.id) === 'success');
if (!keep) throw new Error('No successful deployment found; no deployment records removed.');
console.log('Keeping live Pages deployment ' + keep.id);
for (const d of deployments) {
  if (d.id === keep.id || !['inactive', 'failure', 'error', 'success'].includes(states.get(d.id)))
    continue;
  if (states.get(d.id) !== 'inactive')
    api(`repos/${repo}/deployments/${d.id}/statuses`, ['--method', 'POST', '-f', 'state=inactive']);
  api(`repos/${repo}/deployments/${d.id}`, ['--method', 'DELETE']);
  console.log('Removed superseded deployment record ' + d.id);
}
const pr = JSON.parse(api(`repos/${repo}/pulls/1`));
if (!pr.merged || pr.head.ref !== 'v1-refresh')
  throw new Error('V1 PR is not merged; branch retained.');
let ref;
try {
  ref = JSON.parse(api(`repos/${repo}/git/ref/heads/v1-refresh`));
} catch (error) {
  if (String(error.stderr).includes('404')) {
    console.log('Review branch already removed.');
    process.exit(0);
  }
  throw error;
}
if (ref.object.sha !== pr.head.sha) throw new Error('Review branch has new work; branch retained.');
api(`repos/${repo}/git/refs/heads/v1-refresh`, ['--method', 'DELETE']);
console.log('Removed merged review branch.');
