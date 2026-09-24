const fetch = (async () => (await import('node-fetch')).default)();
const FormData = (await import('form-data')).default;

async function test() {
  const loginRes = await fetch('http://localhost:5000/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ username: 'admin', password: 'Admin123!' })
  });
  const { token } = await loginRes.json();

  const res = await fetch('http://localhost:5000/api/projects/1', {
    method: 'PUT',
    headers: {
      'Authorization': 'Bearer ' + token,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      project_name: 'Updated Test Project',
      city: 'Updated City',
    }),
  });
  const data = await res.json();
  console.log('Update result:', JSON.stringify(data));

  const delRes = await fetch('http://localhost:5000/api/projects/1', {
    method: 'DELETE',
    headers: { 'Authorization': 'Bearer ' + token },
  });
  const delData = await delRes.json();
  console.log('Delete result:', JSON.stringify(delData));
}

test().catch(e => console.error('Error:', e.message));
