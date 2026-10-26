// Every bypass payload must work in VULNERABLE mode and fail in SECURE mode.
//   npm test

const { test } = require('node:test');
const assert = require('node:assert/strict');
const { createApp } = require('../server');

// Starts the lab on a free port and returns a JSON client that keeps the session cookie.
async function startLab(t, mode) {
  const server = createApp({ mode }).listen(0, '127.0.0.1');
  await new Promise((resolve) => server.once('listening', resolve));
  t.after(() => server.close());
  const base = `http://127.0.0.1:${server.address().port}`;

  let cookie = '';
  return async function request(path, body) {
    const res = await fetch(base + path, {
      method: body ? 'POST' : 'GET',
      headers: { 'Content-Type': 'application/json', ...(cookie && { Cookie: cookie }) },
      body: body && JSON.stringify(body),
    });
    const setCookie = res.headers.get('set-cookie');
    if (setCookie) cookie = setCookie.split(';')[0];
    return { status: res.status, body: await res.json() };
  };
}

const login = (request, username, password = 'anything') => request('/api/login', { username, password });

test("vulnerable: admin'-- logs in as admin without the password", async (t) => {
  const request = await startLab(t, 'vulnerable');
  const { status, body } = await login(request, "admin'--");
  assert.equal(status, 200);
  assert.equal(body.user.username, 'admin');
  assert.match(body.sql, /WHERE username = 'admin'--' AND password_hash/);
});

test("vulnerable: ' OR 1=1-- logs in as the first user in the table", async (t) => {
  const request = await startLab(t, 'vulnerable');
  const { body } = await login(request, "' OR 1=1--");
  assert.equal(body.ok, true);
  assert.equal(body.user.username, 'admin');
});

test('vulnerable: LIMIT/OFFSET picks any other account', async (t) => {
  const request = await startLab(t, 'vulnerable');
  const { body } = await login(request, "' OR 1=1 LIMIT 1 OFFSET 1--");
  assert.equal(body.user.username, 'alice');
});

test('vulnerable: bypassing as admin unlocks the admin-only user list', async (t) => {
  const request = await startLab(t, 'vulnerable');
  assert.equal((await request('/api/users')).status, 403);
  await login(request, "admin'--");
  const { status, body } = await request('/api/users');
  assert.equal(status, 200);
  assert.deepEqual(body.users.map((u) => u.username), ['admin', 'alice', 'bob']);
});

test('vulnerable: a lone quote breaks the SQL and returns a database error', async (t) => {
  const request = await startLab(t, 'vulnerable');
  const { status, body } = await login(request, "'");
  assert.equal(status, 401);
  assert.ok(body.error, 'expected a database error message');
});

test('vulnerable: a wrong password without injection is still rejected', async (t) => {
  const request = await startLab(t, 'vulnerable');
  assert.equal((await login(request, 'admin', 'wrong')).status, 401);
});

test('secure: the same payloads are rejected by the parameterised query', async (t) => {
  const request = await startLab(t, 'secure');
  for (const payload of ["admin'--", "' OR 1=1--", "' OR 1=1 LIMIT 1 OFFSET 1--", "'"]) {
    const { status, body } = await login(request, payload);
    assert.equal(status, 401, payload);
    assert.equal(body.error, null, payload);
    assert.deepEqual(body.params[0], payload);
  }
  assert.equal((await request('/api/users')).status, 403);
});

test('secure: genuine credentials still log in', async (t) => {
  const request = await startLab(t, 'secure');
  const { body } = await login(request, 'alice', 'alice123');
  assert.equal(body.ok, true);
  assert.equal(body.user.username, 'alice');
});

test('mode can be switched at runtime', async (t) => {
  const request = await startLab(t, 'vulnerable');
  assert.equal((await login(request, "admin'--")).status, 200);
  await request('/api/mode', { mode: 'secure' });
  assert.equal((await login(request, "admin'--")).status, 401);
});
