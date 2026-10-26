/*
 * SQL Injection Lab: authentication bypass.
 * IT-30001 Cyber Security, IIIT Allahabad, Autumn 2026.
 *
 * A deliberately vulnerable login. The query that checks credentials can be
 * switched at runtime between a VULNERABLE version (string concatenation) and a
 * SECURE version (parameterised), so the same payload can be shown succeeding
 * and then failing.
 *
 *   npm start      # http://localhost:3000, starts in VULNERABLE mode
 *
 * Binds to 127.0.0.1 only. Never expose it to a network.
 */
const crypto = require('node:crypto');
const path = require('node:path');
const express = require('express');
const session = require('express-session');

const { openDatabase } = require('./db');
const { authenticate } = require('./sqli');

function createApp({ mode = 'vulnerable' } = {}) {
  const app = express();
  const db = openDatabase();
  app.locals.mode = mode;

  app.use(express.static(path.join(__dirname, 'public')));
  app.use(express.json());
  app.use(
    session({
      name: 'lab.sid',
      secret: crypto.randomBytes(32).toString('hex'),
      resave: false,
      saveUninitialized: false,
      cookie: { httpOnly: true, sameSite: 'lax' },
    }),
  );

  app.get('/api/mode', (req, res) => res.json({ mode: app.locals.mode }));

  app.post('/api/mode', (req, res) => {
    const { mode } = req.body ?? {};
    if (mode !== 'vulnerable' && mode !== 'secure') {
      return res.status(400).json({ error: 'mode must be "vulnerable" or "secure"' });
    }
    app.locals.mode = mode;
    console.log(`[mode]  switched to ${mode.toUpperCase()}`);
    res.json({ mode });
  });

  app.post('/api/login', (req, res, next) => {
    const { username = '', password = '' } = req.body ?? {};
    const result = authenticate(db, app.locals.mode, String(username), String(password));
    const details = { mode: app.locals.mode, sql: result.sql, params: result.params, error: result.error };

    if (!result.user) {
      console.log(`[login] REJECTED  mode=${app.locals.mode}  username=${JSON.stringify(username)}`);
      return res.status(401).json({ ok: false, ...details });
    }
    req.session.regenerate((err) => {
      if (err) return next(err);
      req.session.user = { username: result.user.username, role: result.user.role };
      console.log(`[login] ACCEPTED  mode=${app.locals.mode}  username=${JSON.stringify(username)}  ->  ${result.user.username}`);
      res.json({ ok: true, user: req.session.user, ...details });
    });
  });

  app.get('/api/me', (req, res) => {
    if (!req.session.user) return res.status(401).json({ error: 'not logged in' });
    res.json({ user: req.session.user });
  });

  // Admin-only data: shows what an attacker gains by bypassing the login as admin.
  app.get('/api/users', (req, res) => {
    if (req.session.user?.role !== 'admin') return res.status(403).json({ error: 'admins only' });
    res.json({ users: db.prepare('SELECT id, username, email, role FROM users ORDER BY id').all() });
  });

  app.post('/api/logout', (req, res, next) => {
    req.session.destroy((err) => (err ? next(err) : res.json({ ok: true })));
  });

  return app;
}

if (require.main === module) {
  const port = Number(process.env.PORT) || 3000;
  createApp().listen(port, '127.0.0.1', () => {
    console.log(`\n  SQL Injection Lab  ->  http://localhost:${port}   (mode: VULNERABLE)\n`);
  });
}

module.exports = { createApp };
