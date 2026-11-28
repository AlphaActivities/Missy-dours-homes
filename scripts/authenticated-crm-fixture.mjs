import assert from 'node:assert/strict'

export const fixtureEmail = 'crm-qa@example.invalid'
const fixturePassword = 'synthetic browser fixture'
const actorId = '10000000-0000-4000-8000-000000000001'
const recordId = '10000000-0000-4000-8000-000000000002'
const timestamp = '2026-01-05T15:00:00Z'
const name = 'Synthetic QA Lead'
const note = 'Synthetic note survives reload'
const user = { id: actorId, email: fixtureEmail, role: 'authenticated', aud: 'authenticated', app_metadata: {}, user_metadata: {}, created_at: timestamp }
const profile = { id: actorId, auth_user_id: actorId, user_id: actorId, display_name: 'Synthetic QA Owner', name: 'Synthetic QA Owner', role: 'owner', email: fixtureEmail }
const token = ['{"alg":"HS256","typ":"JWT"}', JSON.stringify({ sub: actorId, exp: 2147483647, role: 'authenticated' })].map(value => Buffer.from(value).toString('base64url')).join('.') + '.fixture'
const auth = { access_token: token, refresh_token: 'synthetic-refresh', expires_in: 3600, token_type: 'bearer', user }

export async function authenticatedFixture(browser, origin, client, initialPage, width, debug) {
  const mike = client === 'aksarbenlocksmiths'
  const juan = client === 'Rodents-Extermination'
  const darcy = client === 'Pulse-of-divinity'
  const lead = {
    id: juan ? 42 : recordId, name, email: 'lead@example.invalid', phone: '+12025550101',
    status: darcy ? 'NEW' : 'new', archived: false, created_at: timestamp, updated_at: timestamp,
    follow_up_at: null, notes: '', message: 'Synthetic inquiry', version: 1, contact_method: 'email',
    service: 'Residential', service_name: 'Residential', area: '68102', source: 'synthetic',
    conversation: [], interest: 'Artwork', inquiry_type: 'general', archived_at: null
  }
  const notes = []
  let authenticated = false
  let stage = 'login_form'
  const actions = []
  const blocked = []
  const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block', reducedMotion: 'reduce', timezoneId: 'UTC', locale: 'en-US' })
  try {
    if (debug) console.error('Authenticated fixture viewport', width)
    await context.routeWebSocket('**/*', socket => socket.close())
    await context.route('**/*', async route => {
      const req = route.request()
      const url = new URL(req.url())
      const path = url.pathname
      const method = req.method()
      const get = method === 'GET'
      const json = (value, status = 200, extra = {}) => route.fulfill({ status, json: value, headers: { 'access-control-allow-origin': origin, 'access-control-allow-headers': '*', 'access-control-expose-headers': 'content-range', ...extra } })
      const blockedRequest = () => {
        if (debug && !get) console.error('Blocked fixture request', method, path)
        if (!get && !['HEAD', 'OPTIONS'].includes(method)) blocked.push(method)
        return route.fulfill({ status: 204 })
      }
      const fixtureApi = url.origin === origin && ['/auth/v1/', '/rest/v1/'].some(prefix => path.startsWith(prefix))
      if (url.origin === origin && get && !path.startsWith('/api/') && !fixtureApi) {
        return route.continue({ headers: { ...req.headers(), 'x-engine-fixture': '1' } })
      }
      const fixtureHosts = {
        'Rodents-Extermination': 'nlqsvzbtbspflyozrvds.supabase.co',
        'Pulse-of-divinity': 'fxxrkwitncaraotvkyte.supabase.co'
      }
      const supabase = fixtureApi || url.hostname === fixtureHosts[client]
      if (!(url.origin === origin && path.startsWith('/api/crm/') && mike) && !supabase) return blockedRequest()
      if (method === 'OPTIONS') return json({}, 200, { 'access-control-allow-methods': 'GET, POST, PATCH, OPTIONS' })
      const endpoint = path.split('/').at(-1)
      if (debug) console.error('Fixture', method, path, method === 'PATCH' ? (req.postDataJSON().status ?? 'edit') : '')
      if ((mike && endpoint === 'login') || path === '/auth/v1/token') {
        const input = req.postDataJSON()
        if (method !== 'POST' || input.email !== fixtureEmail || input.password !== fixturePassword) return json({ error: 'fixture identity rejected' }, 401)
        authenticated = true
        actions.push('login')
        return json(mike ? { role: 'staff' } : auth)
      }
      if (!authenticated || (!mike && (path.startsWith('/rest/v1/') || path.startsWith('/functions/v1/') || endpoint === 'user') && req.headers().authorization !== 'Bearer ' + token)) {
        return json({ error: 'fixture sign in required' }, 401)
      }

      if (mike) {
        if (get && endpoint === 'session') return json({ role: 'staff', email: fixtureEmail, user_id: actorId })
        if (get && endpoint === 'queue') return json({ leads: [lead], attention: 0, metrics: {} })
        if (get && endpoint === 'attention') return json({ attention: 0 })
        if (get && endpoint === 'notifications') return json({ attention: 0, active: [], history: [] })
        if (path === '/api/crm/leads/' + recordId) {
          if (get) return json({ lead, events: notes })
          if (method === 'POST') {
            const input = req.postDataJSON()
            if (input.action === 'booked') { lead.status = 'booked'; actions.push('status') }
            if (input.note === note) {
              notes.push({ id: recordId, kind: input.action, note, happened_at: timestamp })
              actions.push('edit')
            }
            lead.version++
            return json(lead)
          }
        }
        if (get) return json({})
        return blockedRequest()
      }

      if (get && path === '/auth/v1/user') return json(user)
      if (get && ['get-me', 'admins'].includes(endpoint)) return json(profile)
      if (get && endpoint === 'dashboard-summary') return json({ summary: {}, recent: [], attention: [], upcoming: [] })
      if (get && endpoint === 'list-leads') {
        const rows = lead.archived === (url.searchParams.get('scope') === 'archived') ? [lead] : []
        return json({ leads: rows, total: rows.length, page: 1, page_size: 25, total_pages: 1 })
      }
      if (get && endpoint === 'get-lead' && url.searchParams.get('id') === recordId) return json(lead)
      if (path === '/functions/v1/update-lead' && method === 'POST') {
        const input = req.postDataJSON()
        if (input.id !== recordId) return json({}, 404)
        if (input.status) { lead.status = input.status; actions.push('status') }
        if (typeof input.archived === 'boolean') {
          lead.archived = input.archived
          lead.archived_at = input.archived ? timestamp : null
          actions.push(input.archived ? 'archive' : 'restore')
        }
        if (input.follow_up_at) { lead.follow_up_at = input.follow_up_at; actions.push('edit') }
        return json(lead)
      }
      if (endpoint === 'leads') {
        if (get || method === 'HEAD') {
          const status = url.searchParams.get('status')
          const rows = !status || (status.startsWith('eq.') && lead.status === status.slice(3)) || (status.startsWith('neq.') && lead.status !== status.slice(4)) ? [lead] : []
          const single = req.headers().accept?.includes('vnd.pgrst.object')
          const range = { 'content-range': rows.length ? '0-0/1' : '*/0' }
          if (method === 'HEAD') return route.fulfill({ status: 200, headers: { ...range, 'access-control-allow-origin': origin, 'access-control-expose-headers': 'content-range' } })
          return json(single ? lead : rows, 200, range)
        }
        if (method === 'PATCH' && url.searchParams.get('id') === 'eq.' + lead.id) {
          const input = req.postDataJSON()
          if (input.status) {
            actions.push(input.status === 'archived' ? 'archive' : lead.status === 'archived' ? 'restore' : 'status')
            lead.status = input.status
          }
          if (typeof input.notes === 'string') {
            if (url.searchParams.get('notes') !== 'eq.' + lead.notes) return json([])
            lead.notes = input.notes
            actions.push('edit')
          }
          if (input.follow_up_at) { lead.follow_up_at = input.follow_up_at; actions.push('edit') }
          if (url.searchParams.has('select')) return json([lead], 200, { 'content-range': '0-0/1' })
          return route.fulfill({ status: 204, headers: { 'content-range': '*/1', 'access-control-allow-origin': origin, 'access-control-expose-headers': 'content-range' } })
        }
      }
      if (path === '/rest/v1/lead_activities' && method === 'POST') {
        if (req.postDataJSON().lead_id !== lead.id) return json({}, 404)
        return json(null, 201)
      }
      if (get || (method === 'POST' && ['/rest/v1/rpc/crm_activity_totals', '/rest/v1/rpc/crm_review_phone_lead_candidates'].includes(path))) return json([])
      return blockedRequest()
    })

    const page = await context.newPage()
    const pageErrors = []
    page.on('pageerror', error => pageErrors.push(error.message))
    page.setDefaultTimeout(9000)
    await page.goto(origin + initialPage)
    await page.locator('input[type=email]').fill(fixtureEmail)
    await page.locator('input[type=password]').fill(fixturePassword)
    await page.getByRole('button', { name: /^(sign in|log in)$/i }).click()
    stage = 'authenticate'
    if (debug) page.on('console', message => { if (message.type() === 'error') console.error(message.text().slice(0, 240)) })
    const wait = locator => locator.waitFor({ state: 'visible' })
    const button = (root, label) => root.getByRole('button', { name: label, exact: true })
    const savePatch = async (control, field, expected) => {
      await Promise.all([
        page.waitForResponse(response => response.ok() && response.request().method() === 'PATCH'
          && response.request().postDataJSON()?.[field] === expected, { timeout: 9_000 }),
        control.press('Enter')
      ])
    }
    const open = async () => {
      if (juan) return page.getByRole('button', { name: 'View details for ' + name }).getByText('View details', { exact: true }).click()
      await page.getByText(name, { exact: true }).filter({ visible: true }).first().click()
    }
    if (mike) {
      await wait(page.getByRole('link', { name: 'History' }).filter({ visible: true }).first())
      await page.goto(origin + '/admin/leads/' + recordId)
      await wait(page.getByRole('heading', { name }))
      await page.getByLabel('Private note').fill(note)
      await page.getByLabel('Next action').selectOption('booked')
      await button(page, 'Save result').click()
      await wait(page.getByText(note, { exact: true }))
      await page.reload()
      await wait(page.getByText(note, { exact: true }))
      await wait(page.locator('dd').filter({ hasText: /^booked$/ }))
    } else {
      await page.locator('input[type=password]').waitFor({ state: 'hidden' })
      stage = 'navigate_leads'
      const listing = juan || darcy ? '/admin/leads/' : '/dashboard/leads'
      if (darcy) {
        await button(page, 'View All Leads').click()
      } else if (!juan) {
        const menu = page.getByRole('button', { name: 'Open sidebar' }).filter({ visible: true }).first()
        if (await menu.isVisible()) await menu.click()
        await page.getByRole('link', { name: 'Leads', exact: true }).filter({ visible: true }).first().click()
      }
      await page.waitForURL(url => url.pathname.replace(/\/$/, '') === listing.replace(/\/$/, ''))
      await open()
      if (juan) {
        const dialog = page.getByRole('dialog', { name: 'Lead details for ' + name })
        await dialog.locator('input[type=datetime-local]').fill('2027-01-05T12:30')
        await Promise.all([
          page.waitForResponse(response => response.ok() && response.request().method() === 'PATCH'
            && response.request().postDataJSON()?.follow_up_at, { timeout: 9_000 }),
          button(dialog, 'Save follow up').click()
        ])
        await savePatch(button(dialog, 'Contacted'), 'status', 'contacted')
        await page.reload()
        await open()
        await wait(dialog.getByRole('button', { name: 'Contacted', exact: true, pressed: true }))
        assert.equal(await dialog.locator('input[type=datetime-local]').inputValue(), '2027-01-05T12:30')
        await savePatch(button(dialog, 'Archived'), 'status', 'archived')
        await button(dialog, 'Close drawer').click()
        await page.reload()
        await button(page, 'Archived').click()
        await open()
        await wait(dialog.getByRole('button', { name: 'Archived', exact: true, pressed: true }))
        await savePatch(button(dialog, 'Contacted'), 'status', 'contacted')
      } else if (darcy) {
        const status = page.getByLabel('Lead status', { exact: true })
        const select = async label => {
          await status.click()
          await page.getByRole('option', { name: label, exact: true }).click()
        }
        await page.locator('#detail-followup').fill('2027-01-05')
        await select('Contacted')
        await button(page, 'Save Changes').click()
        await wait(page.getByText('Saved', { exact: true }))
        await page.reload()
        await open()
        assert.equal(await page.locator('#detail-followup').inputValue(), '2027-01-05')
        assert.match(await status.innerText(), /Contacted/)
        const archive = button(page, 'Archive')
        if (await archive.isVisible()) await archive.click()
        else await select(/^Archived?$/)
        await page.getByRole('dialog', { name: 'Archive confirmation' }).getByRole('button', { name: /^Archive( Lead)?$/ }).click()
        await page.reload()
        await page.getByRole('tab', { name: /^Archived/ }).click()
        await open()
        assert.match(await status.innerText(), /Archived/)
        const restore = button(page, 'Restore')
        if (await restore.isVisible()) await restore.click()
        else await select('Restore')
      } else {
        const dialog = page.getByRole('dialog', { name: 'Lead: ' + name })
        const pickStatus = async label => {
          const trigger = dialog.getByRole('button', { name: /^(new|contacted|archived)$/i })
          await trigger.press('Enter')
          await savePatch(page.getByRole('option', { name: label, exact: true }), 'status', label.toLowerCase())
          await wait(button(dialog, label))
        }
        stage = 'save_note'
        await dialog.getByPlaceholder('Add a private note…').fill(note)
        await Promise.all([
          page.waitForResponse(response => response.ok() && response.request().method() === 'PATCH'
            && response.request().postDataJSON()?.notes?.includes(note), { timeout: 9_000 }),
          button(dialog, 'Save note').press('Enter')
        ])
        await wait(dialog.getByText(note, { exact: true }).first())
        await page.reload()
        await open()
        await wait(dialog.getByText(note, { exact: true }).first())
        stage = 'change_status'
        await pickStatus('Contacted')
        await page.reload()
        await open()
        await wait(button(dialog, 'Contacted'))
        stage = 'archive_lead'
        await pickStatus('Archived')
        await page.reload()
        await button(page, 'Archived').click()
        await open()
        await wait(button(dialog, 'Archived'))
        stage = 'restore_lead'
        await pickStatus('Contacted')
      }
      stage = 'reload_restored_lead'
      await page.reload()
      if (darcy) await page.getByRole('tab', { name: 'All Active', exact: true }).click()
      else await button(page, 'All').click()
      await open()
      assert.equal(lead.archived || lead.status === 'archived', false)
    }
    stage = 'verify_fixture_isolation'
    for (const action of ['login', 'edit', 'status', ...(mike ? [] : ['archive', 'restore'])]) assert(actions.includes(action), 'Fixture action missing: ' + action)
    assert.deepEqual(blocked, [], 'A write outside the fixture allowlist was blocked')
    assert.deepEqual(pageErrors, [], 'CRM browser runtime raised an exception')
    return { width, identity: 'synthetic', login: true, navigation: true, editing: true, savedAfterReload: true, statusChange: true, archiveRestore: mike ? 'not_applicable_history_is_read_only' : true }
  } catch (error) {
    if (debug && context.pages()[0]) console.error((await context.pages()[0].locator('body').ariaSnapshot()).slice(-4200))
    throw Object.assign(error, { qaStage: stage })
  } finally {
    await context.close()
  }
}
