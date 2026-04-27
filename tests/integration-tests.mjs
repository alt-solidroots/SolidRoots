// Minimal integration tests for authentication, per-user data, and input handling
import path from 'path'

// Polyfill Response if running under Node without fetch API
class SimpleResponse {
  constructor(body, init = {}) {
    this.status = init.status ?? 200
    this.headers = init.headers ?? {}
    if (typeof body === 'string') this._body = body
    else this._body = JSON.stringify(body)
  }
  async json() {
    try { return JSON.parse(this._body) } catch { return null }
  }
  async text() { return this._body }
}
globalThis.Response = SimpleResponse

async function run() {
  // Import modules
const loginMod = await import(`file://${path.resolve('functions/api/login.js')}`)
const meMod = await import(`file://${path.resolve('functions/api/me.js')}`)
const submitMod = await import(`file://${path.resolve('functions/api/submit.js')}`)
const { verifyJwt } = await import(`file://${path.resolve('functions/utils/auth.js')}`)

  // Simple in-memory/mock DB for tests
  const mockRows = [
    { id: 1, user_id: 'user-123', type: 'buyer', email: 'u@example.com', phone: '+1', answers: '{}', created_at: '2020-01-01' },
  ]
  const mockDB = {
    prepare: (_q) => ({
      bind: (arg) => ({
        all: async () => ({ results: mockRows.filter(r => r.user_id === arg) })
      }),
    }),
  }

  // 1) Register a user
  const regMod = await import(`file://${path.resolve('functions/api/register.js')}`)
  const regCtx = { request: { json: async () => ({ user_id: 'user-123', password: 'pass123', email: 'u@example.com' }) }, env: { DB: mockDB, JWT_SECRET: 'secret' } }
  const regResp = await regMod.onRequestPost(regCtx)
  // 2) Login with password
  const loginCtx = { request: { json: async () => ({ user_id: 'user-123', password: 'pass123' }) }, env: { JWT_SECRET: 'secret' } }
  const loginResp = await loginMod.onRequestPost(loginCtx)
  const loginData = await loginResp.json()
  const token = loginData?.token
  if (!token) throw new Error('Login failed: token not produced')
  console.log('Login token produced')

  // 3) Call /api/me with token
  const meReq = { request: { headers: { get: (name)=> name==='Authorization' ? `Bearer ${token}` : null }, url: '/api/me' }, env: { JWT_SECRET: 'secret', DB: mockDB } }
  const meResp = await meMod.onRequestGet(meReq)
  const meBody = await meResp.json()
  if (!meBody || !meBody.data) throw new Error('Me endpoint failed to return data')
  console.log('Me endpoint returned data for user')

  // 4) Submit payload for user via /api/submit with token
  const fakeSubmitBody = { type: 'buyer', email: 'u@example.com', phone: '+12', answers: { q: 'a' } }
  const submitModFn = submitMod.onRequestPost
  const submitReq = {
    request: {
      json: async () => fakeSubmitBody,
      headers: { get: (name)=> name==='Authorization' ? `Bearer ${token}` : null }
    },
    env: { JWT_SECRET: 'secret', DB: mockDB }
  }
  // This will call verifyJwt and use userId from token
  const submitResp = await submitModFn(submitReq)
  const submitData = await submitResp.json()
  if (submitResp.status !== 200 || !submitData?.success) throw new Error('Submit failed')
  console.log('Submit endpoint succeeded with per-user ownership')
  console.log('All basic integration tests passed')
}
try { await run() } catch (e) { console.error('Tests failed:', e); process.exit(1) }
