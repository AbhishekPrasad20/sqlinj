# CSRF Attack and Defense Demonstration – Alice Banking Application

**Student Name:** Sayan Samajpati

**Roll Number:**  IIB2024013

---

## Table of Contents
1. [Project Overview](#project-overview)
2. [Architecture](#architecture)
3. [Installation](#installation)
4. [Running the Demo](#running-the-demo)
   - [Vulnerable Mode](#vulnerable-mode)
   - [Secure Mode](#secure-mode)
5. [Demonstration Steps](#demonstration-steps)
   - [Vulnerable Attack](#vulnerable-attack)
   - [Secure Attack & Mitigations](#secure-attack)
6. [Root Cause Explanation](#root-cause)
7. [Implemented Mitigations](#implemented-mitigations)
8. [Other Theoretical Mitigations](#other-mitigations)
9. [Limitations](#limitations)
10. [Ownership Declaration](#ownership-declaration)
11. [Video Script (2‑3 min)](#video-script)
12. [Viva Q&A](#viva-qa)

---

## Project Overview
This repository contains a **self‑contained, Windows‑compatible** web application that demonstrates **Cross‑Site Request Forgery (CSRF)**. Two modes are provided:

* **Vulnerable** – a GET endpoint performs a money transfer without any CSRF protection.
* **Secure** – the GET endpoint is disabled, a synchronizer CSRF token protects POST transfers, and the session cookie uses `SameSite=Strict`.

Both the victim (bank) and attacker sites run locally on different ports, emulating distinct origins.

---

## Architecture
```
localhost:3000  → Victim / Banking Application
    ├─ Login (session‑based)
    ├─ Dashboard (balances, transfer form, history)
    ├─ GET /transfer?to=…&amount=…   (vulnerable only)
    ├─ POST /transfer                (secure only, CSRF‑protected)
    └─ POST /reset                   (reset balances)

localhost:3001  → Attacker Application (unchanged)
    ├─ csrf-get.html   – hidden <img> triggers the GET transfer
    └─ csrf-post.html  – auto‑submitting form (no CSRF token)
```
All communication stays on the local machine; no external services are required.

---

## Installation
> **Prerequisites** – Windows 10/11, PowerShell, **Node.js 20+** (download from https://nodejs.org).

```powershell
# 1️⃣ Clone / copy the repository into a folder, e.g.:
cd C:\Users\%USERNAME%\Documents
git clone <repo‑url> csrf-banking-demo   # or copy the folder manually

# 2️⃣ Open the project folder
cd "C:\Users\AU COMPUTER'S\Pictures\CS\CSRF"

# 3️⃣ Install dependencies
npm install
```
The `concurrently` package is bundled so you can run both servers with one command (`npm run dev`).

---

## Running the Demo
### Vulnerable Mode
```powershell
npm start   # launches victim on http://localhost:3000 in vulnerable mode
```
In a second PowerShell window, start the attacker server:
```powershell
npm run attacker   # launches attacker on http://localhost:3001
```
The victim app will display a **red “MODE: VULNERABLE”** banner.

### Secure Mode
```powershell
npm run start:secure   # launches victim in secure mode (green banner)
```
The attacker server stays the same (`npm run attacker`).

> **Note (PowerShell)** – the scripts set the `MODE` environment variable using `SET`. If you see *command not found* errors, run the script via `cmd /c "SET MODE=vulnerable && npm start"` (or `secure`).

---

## Demonstration Steps
### Vulnerable Attack
| Step | Action | Expected outcome |
|------|--------|------------------|
| 1 | Open `http://localhost:3000` and log in with **alice / alice123** | Dashboard shows Alice $1000, Attacker $0 |
| 2 | Open a new tab → `http://localhost:3001/csrf-get.html` | Hidden image fires `GET /transfer?to=attacker&amount=500` |
| 3 | Return to the dashboard and *refresh* | Alice $500, Attacker $500 |
| 4 | Victim‑server console logs `💸 Transfer: Alice → Attacker $500` | Confirms successful CSRF |

### Secure Attack & Mitigations
| Step | Action | Expected outcome |
|------|--------|------------------|
| 1 | Restart victim with `npm run start:secure` | Dashboard shows **SECURE** banner |
| 2 | Log in again as Alice | Same balances as before (reset if needed) |
| 3 | Visit `http://localhost:3001/csrf-get.html` | Server responds **405 Method Not Allowed**; balances unchanged |
| 4 | Visit `http://localhost:3001/csrf-post.html` | Server responds **403 Forbidden** (missing CSRF token) |
| 5 | Use the **Transfer Funds** form (POST) to send $200 to Attacker | Transfer succeeds; dashboard updates; console logs the transfer |
| 6 | Click **Reset Balances** → balances return to $1000 / $0 | Demonstrates repeatable testing |

---

## Root Cause (Vulnerable Mode)
The vulnerable implementation performs a **state‑changing operation (money transfer) via a GET request** and trusts the session cookie alone:
```js
// vulnerable GET handler (excerpt)
// The application performs a state‑changing operation through GET and relies on the authenticated session
// without verifying whether the user intentionally initiated the transfer.
```
Browsers automatically attach the session cookie to any request for the same origin, allowing a malicious site to trigger the GET request without the user’s knowledge.

---

## Implemented Mitigations (Secure Mode)
| Mitigation | How it is applied |
|------------|-------------------|
| **Reject state‑changing GET** | The `/transfer` GET route now returns **405** and never mutates data. |
| **Synchronizer CSRF token** | Random token (`crypto.randomBytes(32)`) stored in the session, injected into the legitimate form as `<input name="_csrf">`, verified with `crypto.timingSafeEqual`. |
| **SameSite Strict cookie** | In secure mode the session cookie is created with `sameSite: 'strict'` and `httpOnly: true`. |
| **POST for state changes** | Legitimate transfers use POST; the GET endpoint is disabled. |
All three defenses together stop the forged request while preserving normal banking functionality.

---

## Other Theoretical Mitigations
| Technique | Why it works |
|-----------|--------------|
| **Synchronizer CSRF tokens** (already in code) | Unpredictable token bound to the user’s session; attacker cannot read it due to same‑origin policy. |
| **SameSite Strict/Lax cookies** | Prevents browsers from sending the session cookie on cross‑origin requests, breaking the attack vector. |
| **Re‑authentication for sensitive actions** | Requires the user’s password/OTP for high‑value operations, guaranteeing intentionality. |
| **Never use GET for mutations** | GET is defined to be safe‑idempotent; browsers may pre‑fetch it, making it unsafe for state changes. |

---

## Limitations
* **In‑memory data store** – data disappears when the server restarts; suitable for demos only.
* **No TLS** – the demo runs over plain HTTP on localhost; production must use HTTPS.
* **Single user (Alice)** – the demo focuses on CSRF, not multi‑user concurrency.
* **No persistent logging** – logs are printed to the console for simplicity.

---

## Ownership Declaration
| Member Name | Roll Number | Category | Variant Implemented |
|---|---|---|---|
|  Sayan Samajpati |IIB2024013 | CSRF | GET‑based forged action |

---

