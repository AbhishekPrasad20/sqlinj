// Shows who is logged in and, for admins, the admin-only user list:
// the payoff of bypassing the login as admin.

async function loadDashboard() {
  const me = await fetch('/api/me');
  if (!me.ok) {
    window.location.href = '/';
    return;
  }
  const { user } = await me.json();
  document.getElementById('greeting').textContent = `Welcome, ${user.username}`;
  document.getElementById('role').textContent = `Role: ${user.role}`;

  const res = await fetch('/api/users');
  if (!res.ok) {
    document.getElementById('denied-card').hidden = false;
    return;
  }
  const { users } = await res.json();
  const rows = users.map((u) => {
    const tr = document.createElement('tr');
    for (const value of [u.id, u.username, u.email, u.role]) {
      const td = document.createElement('td');
      td.textContent = value;
      tr.append(td);
    }
    return tr;
  });
  document.getElementById('users').replaceChildren(...rows);
  document.getElementById('admin-card').hidden = false;
}

document.getElementById('logout').addEventListener('click', async () => {
  await fetch('/api/logout', { method: 'POST' });
  window.location.href = '/';
});

loadDashboard();
