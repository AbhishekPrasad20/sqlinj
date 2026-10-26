// Mode badge and VULNERABLE/SECURE toggle in the header, shared by every page.

function renderMode(mode) {
  const badge = document.getElementById('mode-badge');
  badge.textContent = mode;
  badge.className = `badge ${mode}`;

  const toggle = document.getElementById('mode-toggle');
  toggle.dataset.next = mode === 'vulnerable' ? 'secure' : 'vulnerable';
  toggle.textContent = `Switch to ${toggle.dataset.next}`;
}

document.getElementById('mode-toggle').addEventListener('click', async (event) => {
  const res = await fetch('/api/mode', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mode: event.currentTarget.dataset.next }),
  });
  renderMode((await res.json()).mode);
});

fetch('/api/mode')
  .then((res) => res.json())
  .then(({ mode }) => renderMode(mode));
