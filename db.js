/*
 * In-memory SQLite database (Node's built-in node:sqlite), freshly seeded
 * every time the server starts.
 */
const crypto = require('node:crypto');
const { DatabaseSync } = require('node:sqlite');

// [username, password, email, role]. id 1 (admin) is the first row in the table.
const USERS = [
  ['admin', 'Adm!n#2026', 'admin@lab.local', 'admin'],
  ['alice', 'alice123', 'alice@lab.local', 'user'],
  ['bob', 'bob123', 'bob@lab.local', 'user'],
];

function hashPassword(password) {
  // Unsalted SHA-256 keeps the demo query readable. Real systems use a slow,
  // salted hash (bcrypt, scrypt, Argon2) and compare it in application code.
  return crypto.createHash('sha256').update(String(password)).digest('hex');
}

function openDatabase() {
  const db = new DatabaseSync(':memory:');
  db.exec(`
    CREATE TABLE users (
      id            INTEGER PRIMARY KEY,
      username      TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      email         TEXT NOT NULL,
      role          TEXT NOT NULL
    )
  `);
  const insert = db.prepare('INSERT INTO users (username, password_hash, email, role) VALUES (?, ?, ?, ?)');
  for (const [username, password, email, role] of USERS) {
    insert.run(username, hashPassword(password), email, role);
  }
  return db;
}

module.exports = { openDatabase, hashPassword };
