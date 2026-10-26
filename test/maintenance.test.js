const { test } = require('node:test'),
  assert = require('node:assert/strict'),
  vm = require('node:vm'),
  fs = require('node:fs');
const source = fs.readFileSync(require.resolve('../scripts/tidy-repository.cjs'), 'utf8');
function simulate({ merged = true, moved = false, success = true } = {}) {
  const writes = [];
  const repo = 'repos/JustAJad/anime-samani';
  const states = {
    43: 'in_progress',
    42: success ? 'success' : 'failure',
    41: 'inactive',
    40: 'failure',
    39: 'success',
  };
  if (!success) states[39] = 'failure';
  const api = (_cmd, args) => {
    assert.equal(args[0], 'api');
    const path = args[1];
    if (args.includes('--method')) {
      writes.push({ path, args });
      return '';
    }
    if (path === repo) return JSON.stringify({ id: 1432238651 });
    if (path.includes('/deployments?'))
      return JSON.stringify([43, 42, 41, 40, 39].map(id => ({ id })));
    if (path.includes('/statuses?'))
      return JSON.stringify([{ state: states[path.match(/deployments\/(\d+)/)[1]] }]);
    if (path.endsWith('/pulls/1'))
      return JSON.stringify({ merged, head: { ref: 'v1-refresh', sha: 'approved' } });
    if (path.endsWith('/git/ref/heads/v1-refresh'))
      return JSON.stringify({ object: { sha: moved ? 'new-work' : 'approved' } });
    throw new Error('Unexpected API read ' + path);
  };
  let error;
  try {
    vm.runInNewContext(source, {
      require: name => (name === 'node:child_process' ? { execFileSync: api } : null),
      process: { env: { GITHUB_REPOSITORY: 'JustAJad/anime-samani' } },
      console: { log() {} },
    });
  } catch (e) {
    error = e;
  }
  return { writes, error };
}
test('publication cleanup retains live/pending deployments and only deletes a merged unchanged branch', () => {
  const result = simulate();
  assert.equal(result.error, undefined);
  for (const id of [42, 43])
    assert.ok(!result.writes.some(w => w.path.includes('/deployments/' + id)));
  for (const id of [39, 40, 41])
    assert.ok(
      result.writes.some(w => w.path.endsWith('/deployments/' + id) && w.args.includes('DELETE'))
    );
  assert.ok(result.writes.some(w => w.path.endsWith('/git/refs/heads/v1-refresh')));
  for (const options of [{ merged: false }, { moved: true }]) {
    const guarded = simulate(options);
    assert.ok(guarded.error);
    assert.ok(!guarded.writes.some(w => w.path.includes('/git/refs/heads/')));
  }
  const unsafe = simulate({ success: false });
  assert.ok(unsafe.error);
  assert.equal(unsafe.writes.length, 0);
});
