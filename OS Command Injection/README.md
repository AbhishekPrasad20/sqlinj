# OS Command Injection Assignment

## Selected variant

**OS command injection — In-band (command output returned).**

This is a small, intentionally vulnerable teaching application for the assigned
demonstration. It binds only to `127.0.0.1` and uses a harmless `echo` command.
Run it only on your own computer. Do not expose it to a network, deploy it, or
test it against any other system.

## Run the application

Requires Python 3; no third-party packages are needed.

From this folder:

```powershell
python app.py
```

Open <http://127.0.0.1:8000/>. Stop the server with Ctrl+C.

## Demonstration steps

1. In the **Vulnerable input** field, enter:

   ```text
   hello & echo INJECTED
   ```

   The vulnerable endpoint returns output containing both `hello` and
   `INJECTED`. The `&` makes the shell treat the second `echo` as another
   command.

2. Enter the **same** input in the **Mitigated input** field. The safe endpoint
   returns the literal text `hello & echo INJECTED`; it does not run the
   appended command.

The HTTP endpoints are `/vulnerable?text=...` and `/safe?text=...`. The forms
URL-encode input automatically.

## Assignment explanation

### (a) Vulnerable implementation

In `app.py`, `vulnerable_command()` builds a shell command by concatenating
untrusted input into `echo {message}` and calls `subprocess.run(...,
shell=True)`. The flaw is intentionally limited to a local demonstration with
a harmless echo payload.

### (b) Working exploit

The exact input is `hello & echo INJECTED`. On a shell, `&` separates commands.
The in-band result is the output returned by the vulnerable endpoint, including
the `INJECTED` marker.

### (c) Root cause

The application inserts user-controlled text into a command string that is
interpreted by the operating-system shell. Shell metacharacters in that text
are therefore treated as syntax, not ordinary input.

### (d) Mitigation implemented

`safe_command()` does not invoke a shell. It passes the input as one argument
to a fixed Python process using an argument vector and `shell=False`. The same
input is printed literally rather than interpreted as a second command.

### (e) Other mitigation options (theory)

- **Avoid the shell:** Prefer a library API or direct process invocation that
  does not require shell parsing. This removes shell metacharacters as a route
  to changing command structure.
- **Argument-vector execution:** Pass the executable and each argument
  separately, as this lab does in `safe_command()`. Keep the executable fixed
  and never combine arguments into a shell command string.
- **Allow-list validation:** If an input must select an operation or resource,
  accept only explicitly permitted values and reject everything else. Validation
  is an additional guard, not a replacement for avoiding shell interpretation.
- **Least privilege:** Run the application with only the permissions it needs.
  This limits the impact if a command-injection flaw exists; it does not prevent
  the flaw itself.

## Test the exploit and mitigation

With the Python launcher available, run:

```powershell
python -m unittest -v
```

The tests verify that the harmless injected echo executes in the vulnerable
variant and that the same string remains literal in the safe variant.

## Two-to-three-minute video outline

1. Identify yourself and state that you implemented the in-band OS command
   injection variant.
2. Show the vulnerable code path and explain shell interpretation.
3. Submit `hello & echo INJECTED` to the vulnerable form and show the returned
   output.
4. Explain the root cause in one sentence.
5. Submit the identical input to the safe form and show that it is returned as
   literal text.
6. Point out the argument-vector / `shell=False` fix, then briefly explain
   allow-list validation and least privilege.

Capture your own screenshots or screen recording as required by your course;
none are fabricated or included here.

## Viva preparation

- **Why does the payload work?** `&` is a command separator interpreted by the
  shell because input was concatenated into a shell command.
- **Why is the output in-band?** The endpoint returns the subprocess's standard
  output directly in its HTTP response.
- **What changed in the mitigation?** Input is passed as a single argument to a
  fixed executable, without shell parsing.
- **Does validation alone make shell concatenation safe?** Not reliably.
  Avoiding the shell and using a fixed executable with separate arguments is
  the primary defense.
- **What does least privilege achieve?** It reduces potential impact, but does
  not remove the injection vulnerability.

## Ownership declaration (complete before submission)

| Member name | Roll number | Category | Variant implemented |
|---|---|---|---|
| Piyush | IIT2024268 | OS command injection | In-band (command output returned) |

Add the application source and ownership declaration to the group's public
repository only as instructed by your course. Submit the group recording/link
through the course channel.
