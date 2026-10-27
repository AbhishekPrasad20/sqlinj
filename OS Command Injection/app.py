"""Local-only OS command injection teaching lab."""

from html import escape
from http.server import BaseHTTPRequestHandler, HTTPServer
from subprocess import run
from urllib.parse import parse_qs, urlparse
import sys


HOST = "127.0.0.1"
PORT = 8000
MAX_INPUT_LENGTH = 200


def vulnerable_command(message: str) -> str:
    """Intentionally unsafe: message is interpreted by the operating-system shell."""
    result = run(
        f"echo {message}",
        shell=True,
        capture_output=True,
        text=True,
        timeout=5,
        check=True,
    )
    return result.stdout.strip()


def safe_command(message: str) -> str:
    """Pass the message as data to Python; no shell parses it."""
    result = run(
        [sys.executable, "-c", "import sys; print(sys.argv[1])", message],
        shell=False,
        capture_output=True,
        text=True,
        timeout=5,
        check=True,
    )
    return result.stdout.strip()


class LabHandler(BaseHTTPRequestHandler):
    def do_GET(self) -> None:
        parsed = urlparse(self.path)
        parameters = parse_qs(parsed.query, keep_blank_values=True)

        if parsed.path not in ("/vulnerable", "/safe"):
            self._respond(404, "Not found")
            return

        message = parameters.get("text", [""])[0]
        if len(message) > MAX_INPUT_LENGTH:
            self._respond(400, f"Input must be {MAX_INPUT_LENGTH} characters or fewer.")
            return

        command_runner = vulnerable_command if parsed.path == "/vulnerable" else safe_command
        output = command_runner(message)
        self._respond(200, output)

    def log_message(self, format: str, *args: object) -> None:
        print(f"{self.address_string()} - {format % args}")

    def _respond(self, status: int, message: str) -> None:
        body = self._page(message, status)
        encoded = body.encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "text/html; charset=utf-8")
        self.send_header("Content-Length", str(len(encoded)))
        self.send_header("X-Content-Type-Options", "nosniff")
        self.end_headers()
        self.wfile.write(encoded)

    @staticmethod
    def _page(message: str, status: int) -> str:
        result = f"""<section class="result" aria-live="polite">
      <div class="result-heading">
        <h2>Latest result</h2>
        <span class="status">HTTP {status}</span>
      </div>
      <pre>{escape(message)}</pre>
    </section>"""
        return f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>OS Command Injection Lab</title>
<style>
  :root {{
    color-scheme: light;
    font-family: "Segoe UI", Arial, sans-serif;
    color: #172033;
    background: #f3f6fb;
  }}
  * {{ box-sizing: border-box; }}
  body {{
    min-height: 100vh;
    margin: 0;
    padding: 48px 20px;
    background:
      radial-gradient(ellipse at 15% 0%, #dceaff 0, transparent 38%),
      #f3f6fb;
  }}
  main {{ width: min(100%, 900px); margin: 0 auto; }}
  .hero {{ margin-bottom: 28px; }}
  .eyebrow {{
    margin: 0 0 10px;
    color: #315fbb;
    font-size: .78rem;
    font-weight: 750;
    letter-spacing: .13em;
    text-transform: uppercase;
  }}
  h1 {{ margin: 0; font-size: clamp(2rem, 5vw, 3rem); letter-spacing: -.04em; }}
  .intro {{ max-width: 660px; margin: 12px 0 0; color: #56627a; line-height: 1.65; }}
  .notice {{
    display: flex;
    gap: 12px;
    align-items: flex-start;
    margin-top: 20px;
    padding: 14px 16px;
    border: 1px solid #c9dcff;
    border-radius: 12px;
    background: #edf4ff;
    color: #294673;
    font-size: .92rem;
    line-height: 1.5;
  }}
  .notice strong {{ display: block; margin-bottom: 2px; }}
  .cards {{ display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 18px; }}
  .card {{
    padding: 24px;
    border: 1px solid #e2e8f1;
    border-radius: 18px;
    background: #fff;
    box-shadow: 0 12px 32px #24395b0d;
  }}
  .card.vulnerable {{ border-top: 4px solid #e27653; }}
  .card.safe {{ border-top: 4px solid #28a27b; }}
  .card-label {{
    display: inline-block;
    margin-bottom: 14px;
    padding: 5px 9px;
    border-radius: 999px;
    background: #fff1ec;
    color: #9b452a;
    font-size: .73rem;
    font-weight: 750;
    letter-spacing: .07em;
    text-transform: uppercase;
  }}
  .safe .card-label {{ background: #e8f8f1; color: #176b50; }}
  h2 {{ margin: 0; font-size: 1.25rem; }}
  .card p {{ min-height: 48px; margin: 9px 0 20px; color: #667187; line-height: 1.5; }}
  label {{ display: block; margin-bottom: 8px; font-size: .88rem; font-weight: 650; }}
  input {{
    width: 100%;
    min-height: 46px;
    padding: 11px 12px;
    border: 1px solid #cfd7e4;
    border-radius: 9px;
    background: #fbfcfe;
    color: #172033;
    font: inherit;
  }}
  input:focus {{ outline: 3px solid #b9d2ff; border-color: #477de0; }}
  button {{
    width: 100%;
    min-height: 45px;
    margin-top: 14px;
    border: 0;
    border-radius: 9px;
    background: #344d78;
    color: #fff;
    font: inherit;
    font-weight: 700;
    cursor: pointer;
    transition: transform .15s ease, filter .15s ease;
  }}
  .safe button {{ background: #16815f; }}
  button:hover {{ filter: brightness(1.08); transform: translateY(-1px); }}
  button:focus-visible {{ outline: 3px solid #9dc0ff; outline-offset: 3px; }}
  .result {{
    margin-top: 20px;
    padding: 18px 20px;
    border: 1px solid #e2e8f1;
    border-radius: 14px;
    background: #fff;
  }}
  .result-heading {{ display: flex; align-items: center; justify-content: space-between; gap: 12px; }}
  .result h2 {{ font-size: 1rem; }}
  .status {{ color: #64718a; font-size: .8rem; font-weight: 650; }}
  pre {{
    min-height: 24px;
    margin: 12px 0 0;
    padding: 13px;
    overflow-wrap: anywhere;
    white-space: pre-wrap;
    border-radius: 8px;
    background: #f4f6fa;
    color: #28344a;
    font: .94rem/1.5 Consolas, "Courier New", monospace;
  }}
  footer {{ margin-top: 20px; color: #79849a; font-size: .82rem; text-align: center; }}
  @media (max-width: 640px) {{
    body {{ padding: 30px 16px; }}
    .cards {{ grid-template-columns: 1fr; }}
    .card p {{ min-height: 0; }}
  }}
</style>
</head>
<body>
  <main>
    <header class="hero">
      <p class="eyebrow">Web server security · local learning lab</p>
      <h1>OS Command Injection</h1>
      <p class="intro">Compare an intentionally vulnerable command with a safer implementation. Submit the same harmless text to both and observe how the result changes.</p>
      <div class="notice">
        <span aria-hidden="true">ℹ</span>
        <div><strong>Local demonstration only</strong>This lab listens on 127.0.0.1 and uses a harmless echo command. Do not expose it to a network.</div>
      </div>
    </header>
    <section class="cards" aria-label="Compare vulnerable and mitigated examples">
      <article class="card vulnerable">
        <span class="card-label">Intentionally vulnerable</span>
        <h2>Shell interprets input</h2>
        <p>User input is added to a command string and interpreted by the shell.</p>
        <form action="/vulnerable" method="get">
          <label for="vulnerable-text">Your demonstration text</label>
          <input id="vulnerable-text" name="text" maxlength="{MAX_INPUT_LENGTH}" placeholder="Enter harmless text" autocomplete="off">
          <button type="submit">Run vulnerable example</button>
        </form>
      </article>
      <article class="card safe">
        <span class="card-label">Mitigated</span>
        <h2>Input stays as data</h2>
        <p>The input is passed as one argument, without invoking a shell.</p>
        <form action="/safe" method="get">
          <label for="safe-text">Your demonstration text</label>
          <input id="safe-text" name="text" maxlength="{MAX_INPUT_LENGTH}" placeholder="Enter the same text" autocomplete="off">
          <button type="submit">Run mitigated example</button>
        </form>
      </article>
    </section>
    {result}
    <footer>Educational lab · Keep testing on your own computer only</footer>
  </main>
</body>
</html>"""


def main() -> None:
    server = HTTPServer((HOST, PORT), LabHandler)
    print(f"Local lab listening at http://{HOST}:{PORT}/")
    print("Press Ctrl+C to stop. Do not change the host to expose this lab.")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping local lab.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
