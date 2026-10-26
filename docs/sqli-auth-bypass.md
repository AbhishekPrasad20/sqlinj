# SQL Injection, Variant 1: Authentication Bypass

| | |
|---|---|
| Implemented by | `<Your Name>` (`<Roll No.>`) |
| Vulnerable code | [`sqli.js`](../sqli.js), `buildLoginQueryVulnerable()` |
| Mitigation code | [`sqli.js`](../sqli.js), `buildLoginQuerySecure()` |
| Page | http://localhost:3000 (staff login) |
| Stack | Node.js, Express, SQLite (`node:sqlite`), HTML + vanilla JS |

## (a) Vulnerable implementation

Request path: login form ([`public/index.html`](../public/index.html), [`public/login.js`](../public/login.js)) → `POST /api/login` ([`server.js`](../server.js)) → `authenticate()` → `buildLoginQueryVulnerable()` in [`sqli.js`](../sqli.js):

```js
const sql =
  "SELECT id, username, role FROM users WHERE username = '" + username +
  "' AND password_hash = '" + hashPassword(password) + "'";
```

The username typed into the form is pasted between the quotes of a SQL string literal. The server then logs in as whichever row the query returns.

## (b) Working exploit

Mode: **VULNERABLE**. Password: anything, e.g. `x`.

| # | Username payload | Result | Why |
|---|---|---|---|
| 1 | `'` | `Database error: unrecognized token: "…"` | An unmatched quote breaks the SQL, which proves the input reaches the SQL parser unescaped. |
| 2 | **`admin'--`** | **Logged in as admin** | `'` closes the string; `--` turns the password check into a comment. |
| 3 | `' OR 1=1--` | Logged in as admin | The WHERE clause is true for every row; the app takes the first row (id 1, admin). |
| 4 | `' OR 1=1 LIMIT 1 OFFSET 1--` | Logged in as alice | `OFFSET n` selects any other account. |

The query the server actually runs for payload 2 (shown on the page under "Query sent to the database"):

```sql
SELECT id, username, role FROM users WHERE username = 'admin'--' AND password_hash = '2d71…4881'
```

Everything after `--` is ignored, so the database effectively runs `SELECT … WHERE username = 'admin'`. No password is checked.

**Impact:** click *Open dashboard*. The admin area lists every user account, which only administrators may see.

The same request without the browser (Git Bash / Linux / macOS):

```bash
curl -s http://localhost:3000/api/login -H 'Content-Type: application/json' \
     -d "{\"username\":\"admin'--\",\"password\":\"x\"}"
```

> Why not inject into the password field? The password is hashed (SHA-256) *before* it is put into the query, so `' OR '1'='1` in the password field becomes 64 hex characters and no quote survives. The username is the injectable parameter. This does not make the code safe: one unprotected parameter is enough.

## (c) Root cause

User input is **concatenated into the SQL query string**, so the database cannot tell the developer's code from the user's data. A `'` in the input ends the string literal, and the rest of the input is executed as SQL.

## (d) Mitigation implemented: parameterised query

`buildLoginQuerySecure()` in [`sqli.js`](../sqli.js):

```js
const sql = 'SELECT id, username, role FROM users WHERE username = ? AND password_hash = ?';
return { sql, params: [username, hashPassword(password)] };
```

SQLite compiles the SQL text, with its `?` placeholders, *before* it sees any input. The values are bound afterwards as plain data. The structure of the query is fixed, so `admin'--` is treated as a username that literally contains a quote and two dashes. No such user exists, so the login fails.

**Showing that it blocks the same payload:** click **Switch to secure** (top right) and submit `admin'--` / `x` again.

- The page shows **"Invalid username or password."**
- The query box shows the `?` placeholders, with `Bound values for ?: "admin'--", "2d71…"`.
- The server console prints `[login] REJECTED  mode=secure  username="admin'--"`.
- Genuine logins (`alice` / `alice123`) still work.

Screenshot of the blocked attempt: add it as `docs/screenshots/secure-blocked.png`.

## (e) Other mitigations (theory)

**Input validation with allow-lists.** Define what a valid value looks like and reject everything else before it reaches the database. For example, a username must match `^[a-z0-9_]{3,20}$`, so `admin'--` is rejected because `'` and `-` are not allowed. Allow-lists also protect the parts of a query that placeholders cannot hold, such as table names, column names and `ORDER BY` direction: the user picks from a fixed list. This is a second layer, not a replacement for parameterisation, because some legitimate input must contain quotes (O'Brien, free-text fields).

**Least-privilege database accounts.** The application connects with an account that can do only what it needs. Here that is `SELECT` on `users`: no `DROP`/`ALTER`, no access to unrelated tables, and no file or OS features such as MySQL `FILE` or SQL Server `xp_cmdshell`. If an injection does get through, the damage is limited to what that account may do. SQLite has no user accounts; the nearest equivalent is opening the database read-only.

**Safe errors.** Show users a generic message ("Invalid username or password") and write the details to the server log. This lab deliberately returns the raw database error (payload 1), and that error confirmed the injection point and revealed the database engine. Hiding errors does not remove the flaw, because blind SQL injection still works, but it takes away the attacker's easiest feedback.

## Questions and edge cases

**Why is `--` needed?** It is SQL's line comment. It removes the rest of the query: the leftover closing quote and the password check. Without it the stray `'` causes a syntax error. A comment-free payload also works by balancing the quotes: `admin' OR '1'='1` produces `username = 'admin' OR '1'='1' AND password_hash = '…'`. `AND` binds tighter than `OR`, so the clause reads `username = 'admin' OR (…)`, which is true for admin's row. `/*` also works: `bob'/*` logs in as bob.

**Why doesn't `admin'#` work?** `#` is a comment only in MySQL. SQLite uses `--` and `/* */`.

**Why does `' OR 1=1--` log in as admin in particular?** The condition is true for every row, so all users are returned. The code takes the first row (`.get()`), which is id 1, admin. `LIMIT 1 OFFSET n` picks any other row.

**Can you drop the table with `admin'; DROP TABLE users;--`?** Not in this app. `node:sqlite`'s `prepare()` compiles only the first statement and ignores the rest. (Tested: it logs in as admin, and the table is untouched.) With `db.exec()`, or a driver that allows multiple statements (e.g. MySQL with `multipleStatements: true`), stacked queries would run.

**Why use parameters rather than escaping quotes?** Escaping depends on the database dialect and the character encoding, and it is easy to forget in one place. Numeric contexts have no quotes to escape at all (`id = 1 OR 1=1`). Placeholders separate code from data by design: the query's structure is fixed before any input arrives.

**Can every part of a query be parameterised?** No. Placeholders hold values only. Table names, column names and `ORDER BY` must come from an allow-list.

**Does validating in the browser help?** No. An attacker can skip the page and send the request directly (see the `curl` example above). Validation and parameterisation must happen on the server.

**Is the password storage secure?** No. Unsalted SHA-256 is fast and therefore easy to crack offline. It is used here only to keep the demo query readable. Real systems fetch the user by username and verify a slow, salted hash (bcrypt, scrypt or Argon2) in application code.
