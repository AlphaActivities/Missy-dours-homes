import assert from 'node:assert/strict'

export function hostedFixtureStore(client, width, env = process.env) {
  const origin = 'https://zkmpjxqalntloinlaxmh.supabase.co'
  const email = 'qa.' + client + '@example.invalid'
  assert(['mike', 'juan', 'missy', 'darcy'].includes(client))
  assert(env.QA_SUPABASE_URL === origin && env.QA_EMAIL === email && env.QA_PASSWORD
    && env.QA_SUPABASE_PUBLISHABLE_KEY?.startsWith('sb_publishable_'), 'QA credentials rejected')
  const label = 'Browser QA ' + env.GITHUB_RUN_ID + '/' + env.GITHUB_RUN_ATTEMPT + '/' + width
  let session, filter
  let writes = 0
  let reads = 0
  let isolationChecks = 0
  async function request(path, method, body, schema) {
    const headers = { apikey: env.QA_SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json' }
    if (schema) Object.assign(headers, { Authorization: 'Bearer ' + session.access_token,
      'Accept-Profile': schema, 'Content-Profile': schema, Prefer: 'return=representation' })
    return fetch(origin + path, { method, headers, redirect: 'error', signal: AbortSignal.timeout(7000),
      body: body === undefined ? undefined : JSON.stringify(body) })
  }
  const endpoint = '/rest/v1/persistence_fixture'
  const own = 'qa_' + client
  async function row(method, body) {
    const response = await request(endpoint + (filter ?? ''), method, body, own)
    assert(response.ok, 'QA database HTTP ' + response.status)
    const rows = await response.json()
    assert(rows.length === 1 && rows[0].owner_id === session.user.id, 'QA row ownership rejected')
    return rows[0]
  }
  async function read() {
    const current = await row('GET')
    const snapshot = JSON.parse(current.title)
    assert.equal(snapshot.label, label)
    reads++
    return { ...snapshot.edit, status: current.status, archived: current.archived }
  }
  return {
    async login(initialStatus) {
      const response = await request('/auth/v1/token?grant_type=password', 'POST', { email, password: env.QA_PASSWORD })
      assert(response.ok, 'QA login HTTP ' + response.status)
      session = await response.json()
      assert(session.user?.email === email && session.access_token, 'QA identity rejected')
      if (width === 390) {
        for (const other of ['mike', 'juan', 'missy', 'darcy'].filter(value => value !== client)) {
          const schema = 'qa_' + other
          const visible = await request(endpoint + '?select=id&limit=1', 'GET', undefined, schema)
          assert(visible.ok && (await visible.json()).length === 0, 'QA cross-client read rejected by test')
          const insert = await request(endpoint, 'POST', { title: 'Synthetic denied isolation probe' }, schema)
          assert.equal(insert.status, 403, 'QA cross-client write was not denied')
          isolationChecks += 2
        }
      }
      const created = await row('POST', { title: JSON.stringify({ label, edit: {} }), status: initialStatus, archived: false })
      assert(/^[0-9a-f-]{36}$/i.test(created.id))
      filter = '?id=eq.' + encodeURIComponent(created.id)
    },
    read,
    async save({ status, archived, ...edit }) {
      await row('PATCH', { status, archived, title: JSON.stringify({ label, edit }) })
      writes++
      assert.deepEqual(await read(), { ...edit, status, archived })
    },
    evidence() { return { project: 'zkmpjxqalntloinlaxmh', hostedAuthentication: true, writes, independentReads: reads, isolationChecks } }
  }
}
