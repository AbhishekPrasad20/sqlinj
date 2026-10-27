# Web Server Security: SQL Injection (Variant 1 — Authentication Bypass)

**Course:** IT-30001 Cyber Security  
**Institution:** IIIT Allahabad  
**Semester:** Autumn 2026  
**Project Type:** Group Assignment

## Project Overview

This project demonstrates an **SQL Injection Authentication Bypass** vulnerability using a deliberately vulnerable staff login application built with:

- **Backend:** Node.js and Express.js
- **Database:** SQLite (`node:sqlite`)
- **Frontend:** HTML, CSS, and JavaScript
- **Security Mechanism:** Parameterised SQL queries

The application supports two operating modes:

- **Vulnerable Mode:** Uses string concatenation to construct SQL queries, allowing SQL injection attacks.
- **Secure Mode:** Uses parameterised queries to prevent SQL injection.

A toggle button in the application header allows switching between these modes at runtime, making it possible to demonstrate the same attack succeeding in vulnerable mode and failing in secure mode.

## Ownership Declaration (Table 3)

| Member | Roll Number | Category | Variant Implemented | Code | Mitigation |
|---|---|---|---|---|---|
| Abhishek Prasad | IIB2024002 | SQL Injection | Variant 1: Authentication Bypass | [`sqli.js`](sqli.js), [`server.js`](server.js), [`public/`](public/) | Parameterised Queries |
| Piyush | IIT2024268 | OS Command Injection | Variant 1: In-band (command output returned) | [`app.py`](OS%20Command%20Injection/app.py), [`test_app.py`](OS%20Command%20Injection/test_app.py) | Argument-vector execution with `shell=False` |

## Installation and Setup

### Prerequisites

- Node.js **22.13.0 or newer**
- npm

### Running the Application

1. Clone the repository:

   ```bash
   git clone https://github.com/AbhishekPrasad20/sqlinj.git
   ```

2. Navigate to the project directory:

   ```bash
   cd sqlinj
   ```

3. Install dependencies:

   ```bash
   npm install
   ```

4. Start the server:

   ```bash
   npm start
   ```

5. Open the application in your browser:

   **http://localhost:3000**

The application starts in **VULNERABLE** mode by default. Use the toggle button in the top-right corner to switch between vulnerable and secure modes.

The SQLite database is stored in memory and reinitialised with sample accounts whenever the server restarts.

## Demo Credentials

| Username | Password | Role |
|---|---|---|
| `admin` | `Adm!n#2026` | Administrator |
| `alice` | `alice123` | Staff |
| `bob` | `bob123` | Staff |

These credentials are provided exclusively for local testing and demonstration.

## SQL Injection: Exploit and Mitigation

### Authentication Bypass Demonstration

The application illustrates how improperly constructed SQL queries allow attackers to bypass password verification.

| Mode | Username | Password | Expected Result |
|---|---|---|---|
| Vulnerable | `admin'--` | `anything` | Authentication bypass succeeds; user logs in as admin |
| Secure | `admin'--` | `anything` | Authentication fails with an invalid credentials message |

### Vulnerable Implementation

The vulnerable implementation constructs the SQL query using string concatenation.

```javascript
const query =
  "SELECT * FROM users WHERE username = '" +
  username +
  "' AND password = '" +
  password +
  "'";
```

When the username `admin'--` is supplied, the resulting SQL statement becomes:

```sql
SELECT * FROM users
WHERE username = 'admin'--' AND password = 'anything'
```

The `--` sequence introduces an SQL comment, causing the password verification condition to be ignored.

As a result, the application may authenticate the attacker as the administrator without requiring the correct password.

### Secure Implementation

The secure implementation uses **parameterised queries**, separating SQL instructions from user-supplied input.

```javascript
const query =
  "SELECT * FROM users WHERE username = ? AND password = ?";

const result = db.prepare(query).get(username, password);
```

Here, the malicious username is interpreted as a literal string rather than executable SQL syntax.

Consequently, the authentication bypass attempt fails.

**Note:** These snippets illustrate the SQL injection mechanism. The actual implementations are located in [`sqli.js`](sqli.js).

## Testing

The project includes automated tests using the built-in Node.js test runner (`node:test`).

Run the test suite using:

```bash
npm test
```

The suite contains **nine tests**, verifying that:

- SQL injection payloads successfully bypass authentication in vulnerable mode.
- The same payloads are rejected in secure mode.
- Legitimate user credentials work in both modes.
- Parameterised queries prevent injected SQL from altering authentication logic.

Test implementation: [`tests/sqli.test.js`](tests/sqli.test.js).

## Project Structure

```text
sqlinj/
├── server.js
├── sqli.js
├── db.js
├── package.json
├── package-lock.json
├── README.md
├── .gitignore
│
├── OS Command Injection/
│   ├── app.py
│   ├── test_app.py
│   └── README.md
│
├── public/
│   ├── index.html
│   ├── dashboard.html
│   ├── common.js
│   ├── login.js
│   ├── dashboard.js
│   └── style.css
│
├── tests/
│   └── sqli.test.js
│
└── docs/
    └── sqli-auth-bypass.md
```

### File Responsibilities

| File | Purpose |
|---|---|
| `server.js` | Express application, API routes, sessions, and mode switching |
| `sqli.js` | Vulnerable and secure SQL authentication implementations |
| `db.js` | In-memory SQLite database and sample user initialization |
| `public/` | Frontend login and dashboard interfaces |
| `tests/sqli.test.js` | Automated exploit and mitigation tests |
| `docs/sqli-auth-bypass.md` | Detailed vulnerability analysis and documentation |

## Detailed Report

The complete assignment write-up, covering items **(a)–(e)**, is available here:

**[SQL Injection Authentication Bypass — Technical Report](docs/sqli-auth-bypass.md)**

## OS Command Injection: In-band Variant

The project also includes a local-only Python lab demonstrating the **in-band
OS command injection** variant. The vulnerable endpoint inserts submitted
text into a shell command and returns its output. The mitigated endpoint passes
the text as a separate argument to a fixed executable with `shell=False`, so
shell metacharacters are treated as data.

The demonstration uses a harmless echo payload and binds only to
`127.0.0.1`. Do not expose it to a network or test it against any other system.
Python 3 is required; the lab has no third-party dependencies.

To run it in PowerShell from the repository root:

```powershell
Set-Location ".\OS Command Injection"
python app.py
```

Open **http://127.0.0.1:8000/**, then stop the lab with **Ctrl+C** in
PowerShell. Run its focused tests with:

```powershell
python -m unittest -v test_app
```

See the [OS Command Injection assignment guide](<OS%20Command%20Injection/README.md>)
for the vulnerable and mitigated code paths, demonstration input, explanation
of root cause, and mitigation alternatives.

## Security and Ethical Considerations

**WARNING: This application is intentionally vulnerable.**

- The server binds exclusively to `127.0.0.1`.
- The OS command injection lab also binds exclusively to `127.0.0.1`.
- The application must not be deployed to a public server or exposed to an external network.
- All exploitation demonstrations must be conducted against the local test environment.
- The vulnerable implementation exists exclusively for educational and research purposes.

This project is intended to demonstrate the importance of secure SQL query construction and input handling in web applications.

---

**IIIT Allahabad | IT-30001 Cyber Security | Autumn 2026**

**Author:** Abhishek Prasad (IIB2024002)
