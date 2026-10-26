/*
 * SQL injection, Variant 1: authentication bypass.
 * Write-up: docs/sqli-auth-bypass.md
 *
 * The login check builds its SQL by string concatenation, so a quote in the
 * username ends the string literal and the rest of the input is parsed as SQL.
 * Typing  admin'--  as the username comments out the password check and logs
 * in as admin without knowing the password.
 *
 * Mitigation implemented: parameterised query (buildLoginQuerySecure).
 */
const { hashPassword } = require('./db');

function buildLoginQueryVulnerable(username, password) {
  // VULNERABLE: user input is concatenated straight into the SQL text. With
  // username  admin'--  the statement becomes
  //   SELECT ... WHERE username = 'admin'--' AND password_hash = '...'
  // and everything after -- (the password check) is a comment.
  const sql =
    "SELECT id, username, role FROM users WHERE username = '" + username +
    "' AND password_hash = '" + hashPassword(password) + "'";
  return { sql, params: [] };
}

function buildLoginQuerySecure(username, password) {
  // MITIGATION: parameterised query. The SQL text is fixed and compiled first;
  // the values are bound afterwards through the ? placeholders, so a quote or
  // -- inside them is only part of a (non-existent) username, never SQL.
  const sql = 'SELECT id, username, role FROM users WHERE username = ? AND password_hash = ?';
  return { sql, params: [username, hashPassword(password)] };
}

function authenticate(db, mode, username, password) {
  const build = mode === 'secure' ? buildLoginQuerySecure : buildLoginQueryVulnerable;
  const { sql, params } = build(username, password);
  try {
    return { sql, params, user: db.prepare(sql).get(...params) ?? null, error: null };
  } catch (err) {
    // The raw database error is returned to support the demo: it confirms the
    // injection point. "Safe errors" is covered as a theory mitigation.
    return { sql, params, user: null, error: err.message };
  }
}

module.exports = { authenticate, buildLoginQueryVulnerable, buildLoginQuerySecure };
