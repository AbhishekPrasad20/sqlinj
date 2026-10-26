// Sends the login form to /api/login and shows the SQL the server ran.
// Everything is written with textContent, so this page never interprets
// server data as HTML.

const form = document.getElementById('login-form');
const result = document.getElementById('result');

function show(element, text) {
  element.textContent = text;
  element.hidden = !text;
}

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const res = await fetch('/api/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: form.username.value, password: form.password.value }),
  });
  const data = await res.json();

  document.getElementById('query-card').hidden = false;
  show(document.getElementById('query'), data.sql);
  show(
    document.getElementById('params'),
    data.params.length ? `Bound values for ?: ${data.params.map((p) => JSON.stringify(p)).join(', ')}` : '',
  );
  show(document.getElementById('db-error'), data.error ? `Database error: ${data.error}` : '');

  result.className = `flash ${data.ok ? 'success' : 'error'}`;
  result.replaceChildren();
  if (data.ok) {
    const link = document.createElement('a');
    link.href = 'dashboard.html';
    link.textContent = 'Open dashboard';
    result.append(`Logged in as ${data.user.username} (role: ${data.user.role}). `, link);
  } else {
    result.append('Invalid username or password.');
  }
  result.hidden = false;
});
