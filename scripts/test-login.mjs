// Test the full client auth flow
const BASE = 'http://localhost:3001'

// 1. Login
console.log('1. Logging in...')
const loginRes = await fetch(`${BASE}/api/client/auth/login`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ email: 'whitecontenusa@gmail.com', password: 'test1234' }),
})
const loginData = await loginRes.json()
const cookieHeader = loginRes.headers.get('set-cookie') ?? ''
const token = cookieHeader.match(/client-session-token=([^;]+)/)?.[1]
console.log('  Status:', loginRes.status, '| Body:', JSON.stringify(loginData))
console.log('  Token:', token)

// 2. Access portal with valid cookie
console.log('\n2. Accessing portal (valid cookie)...')
const portalRes = await fetch(`${BASE}/cliente/portal/${loginData.sessionId}`, {
  redirect: 'manual',
  headers: { cookie: `client-session-token=${token}` },
})
console.log('  Status (expect 200):', portalRes.status)

// 3. Access wrong session
console.log('\n3. Accessing wrong session...')
const wrongRes = await fetch(`${BASE}/cliente/portal/WRONG-ID`, {
  redirect: 'manual',
  headers: { cookie: `client-session-token=${token}` },
})
console.log('  Status (expect 307):', wrongRes.status)

// 4. Logout
console.log('\n4. Logging out...')
const logoutRes = await fetch(`${BASE}/api/client/auth/logout`, {
  method: 'POST',
  headers: { cookie: `client-session-token=${token}` },
})
const logoutData = await logoutRes.json()
console.log('  Status:', logoutRes.status, '| Body:', JSON.stringify(logoutData))

// 5. Access portal after logout
console.log('\n5. Accessing portal after logout...')
const afterLogoutRes = await fetch(`${BASE}/cliente/portal/${loginData.sessionId}`, {
  redirect: 'manual',
  headers: { cookie: `client-session-token=${token}` },
})
console.log('  Status (expect 307):', afterLogoutRes.status)
