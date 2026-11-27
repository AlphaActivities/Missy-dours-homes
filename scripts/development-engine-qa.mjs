import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import { createServer } from 'node:http'
import { mkdir, readFile, realpath, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { extname, resolve, sep } from 'node:path'
import { pathToFileURL } from 'node:url'

const configs = {
  aksarbenlocksmiths: { worker: 'aksarben-admin-review', page: '/admin/', embedded: true, types: ['exec', '--no', '--', 'tsc', '-p', 'tsconfig.crm.json'], tests: ['run', 'test:crm'] },
  'Rodents-Extermination': { worker: 'rodents-admin-review', page: '/admin/', types: ['run', 'typecheck'], files: ['tests/submit-lead.test.mjs'] },
  'Missy-dours-homes': { worker: 'missy-crm-review', page: '/dashboard/login', fallback: '/admin.html', types: ['run', 'typecheck'], tests: ['run', 'test:concierge'] },
  'Pulse-of-divinity': { worker: 'divinity-crm-review', page: '/admin/login/', types: ['run', 'typecheck'], tests: ['test'] },
}
const repo = process.env.GITHUB_REPOSITORY?.split('/').at(-1) ?? process.argv[2]
const config = Object.hasOwn(configs, repo) ? configs[repo] : undefined
assert(config, 'Unsupported repository')
const staging = resolve('preview/cloudflare')
const output = resolve(process.env.QA_OUT ?? 'qa-results')
await mkdir(output, { recursive: true })
const result = { repository: repo, commit: process.env.GITHUB_SHA ?? null, worker: config.worker, profile: 'local build and signed-out browser', checks: [], browser: [] }

async function check(name, operation) {
  try {
    const details = await operation()
    result.checks.push({ name, status: 'passed', ...(details ?? {}) })
    console.log(name, 'passed')
    return true
  } catch (error) {
    result.checks.push({ name, status: 'failed', code: error.qaCode ?? 'assertion_or_runtime_failure' })
    if (process.env.QA_LOCAL_DEBUG === "1") console.error(error.message)
    console.log(name, 'failed', error.qaCode ?? 'assertion_or_runtime_failure')
    return false
  }
}

function command(bin, args, cwd = process.cwd()) {
  const run = spawnSync(bin, args, { cwd, encoding: 'utf8', maxBuffer: 12 * 1024 * 1024, timeout: 420_000 })
  if (run.status !== 0) {
    throw Object.assign(new Error('QA command failed'), { qaCode: run.error?.code ?? 'nonzero_exit' })
  }
  return run.stdout
}

const workerSafe = await check('staging target guard', async () => {
  const spec = JSON.parse(await readFile(resolve(staging, 'wrangler.json'), 'utf8'))
  assert.equal(spec.name, config.worker)
  assert(!spec.routes && !spec.route && !spec.env)
  assert.equal(spec.keep_vars, true)
})

const request = JSON.parse(await readFile(resolve('.github/development-engine/request.json'), 'utf8'))
assert(['complete-qa', 'dependency-repair-preview'].includes(request.profile), 'Unsupported QA profile')
if (request.profile === 'dependency-repair-preview') {
  const repaired = workerSafe && await check('compatible dependency repair preview', async () => {
    const repair = spawnSync('npm', ['audit', 'fix', '--package-lock-only', '--ignore-scripts', '--no-fund', '--json'], { encoding: 'utf8', timeout: 180_000, maxBuffer: 12 * 1024 * 1024 })
    assert(!repair.error && [0, 1].includes(repair.status), 'Repair unavailable')
    const report = JSON.parse(repair.stdout ?? '')
    assert(!report.error && report.audit?.metadata?.vulnerabilities, 'Repair report unavailable')
    await writeFile(resolve(output, 'candidate-package.json'), await readFile(resolve('package.json'), 'utf8'))
    await writeFile(resolve(output, 'candidate-package-lock.json'), await readFile(resolve('package-lock.json'), 'utf8'))
    return { persistedToRepository: false, forcedMajorUpgrade: false, remaining: report.audit.metadata.vulnerabilities }
  })
  if (!repaired) {
    await writeFile(resolve(output, 'summary.json'), JSON.stringify(result, null, 2))
    process.exit(1)
  }
}
const acquired = await check('locked staging dependencies', () => { command('npm', ['ci', '--no-audit', '--no-fund'], staging) })
const built = acquired && workerSafe && await check('staging build and archive preparation', () => { command('npm', ['run', 'build'], staging) })
if (built) {
  await check('TypeScript', () => { command('npm', config.types) })
  await check('repository regression tests', () => {
    if (config.tests) command('npm', config.tests)
    else command('node', ['--test', ...config.files])
  })
  await check('Worker bundle dry run', () => {
    command('npx', ['--no-install', 'wrangler', 'deploy', '--dry-run', '--config', 'wrangler.json'], staging)
  })
  await check('dependency security inventory', () => {
    const inventories = []
    for (const [scope, cwd, omit] of [['root-all', process.cwd(), false], ['root-production', process.cwd(), true], ['staging-all', staging, false], ['staging-production', staging, true]]) {
      const audit = spawnSync('npm', ['audit', '--json', '--audit-level=high', ...(omit ? ['--omit=dev'] : [])], { cwd, encoding: 'utf8', timeout: 80_000, maxBuffer: 8 * 1024 * 1024 })
      const report = JSON.parse(audit.stdout ?? '')
      assert(!audit.error && report.metadata?.vulnerabilities && report.vulnerabilities && !report.error, 'Audit unavailable')
      const counts = report.metadata.vulnerabilities
      const advisoryCounts = Object.fromEntries(['info', 'low', 'moderate', 'high', 'critical'].map(key => [key, Number(counts[key] ?? 0)]))
      const advisories = Object.entries(report.vulnerabilities).map(([name, item]) => ({
        name, severity: item.severity, direct: item.isDirect, range: item.range,
        via: item.via.map(v => typeof v === 'string' ? v : { source: v.source, name: v.name, severity: v.severity, range: v.range, url: /^https:\/\/github\.com\/advisories\/GHSA-[a-z0-9-]+$/i.test(v.url ?? '') ? v.url : undefined }),
        fix: typeof item.fixAvailable === 'object' ? { name: item.fixAvailable.name, version: item.fixAvailable.version, isSemVerMajor: item.fixAvailable.isSemVerMajor } : item.fixAvailable
      }))
      const inventory = { scope, advisoryCounts, advisories }
      inventories.push(inventory)
      console.log('Security inventory', JSON.stringify(inventory))
    }
    return { advisoryCounts: inventories[0].advisoryCounts, inventories, needsReview: inventories.some(i => i.advisoryCounts.high + i.advisoryCounts.critical > 0) }
  })
  await check('Chromium responsive smoke', browserSmoke)
} else {
  for (const name of ['TypeScript', 'repository regression tests', 'Worker bundle dry run', 'dependency security inventory', 'Chromium responsive smoke']) {
    result.checks.push({ name, status: 'skipped', reason: 'staging build unavailable' })
  }
}

result.acceptance = {
  profile: request.profile,
  checksPassed: result.checks.filter(item => item.status === 'passed').length,
  checksFailed: result.checks.filter(item => item.status !== 'passed').length,
  securityReviewRequired: result.checks.some(item => item.needsReview === true),
  authenticatedBrowserVerified: false,
  productionDeploymentAuthorized: false,
  releaseReady: false
}
console.log('Engine acceptance', JSON.stringify(result.acceptance))
await writeFile(resolve(output, 'summary.json'), JSON.stringify(result, null, 2) + '\n')
const summary = result.checks.map(item => '* ' + item.name + ' — ' + item.status + (item.needsReview ? ' (security advisories require review)' : '')).join('\n')
if (process.env.GITHUB_STEP_SUMMARY) await writeFile(process.env.GITHUB_STEP_SUMMARY, '## Development Engine QA\n\n' + summary + '\n', { flag: 'a' })
if (result.checks.some(item => item.status !== 'passed')) process.exitCode = 1

async function browserSmoke() {
  const spec = JSON.parse(await readFile(resolve(staging, 'wrangler.json'), 'utf8'))
  const assets = config.embedded ? (await import(pathToFileURL(resolve(staging, 'baseline/worker/assets.mjs')))).assets : null
  const directory = assets ? null : await realpath(resolve(staging, spec.assets.directory))
  const types = { '.html': 'text/html', '.css': 'text/css', '.js': 'text/javascript', '.mjs': 'text/javascript', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.webp': 'image/webp', '.jpg': 'image/jpeg', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.ico': 'image/x-icon' }
  const allowedPaths = new Set([config.page, config.fallback, '/admin/', '/admin', '/admin/index.html', '/admin/login/', '/dashboard/login'].filter(Boolean))
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://localhost').pathname)
      if (pathname.startsWith('/api/') || (!extname(pathname) && !allowedPaths.has(pathname))) {
        response.writeHead(404).end()
        return
      }
      const candidate = pathname.endsWith('/') ? pathname + 'index.html' : pathname
      if (assets) {
        const entry = assets[pathname] ?? assets[candidate] ?? (allowedPaths.has(pathname) ? assets['/admin/index.html'] : null)
        if (!entry) return void response.writeHead(404).end()
        response.writeHead(200, { 'content-type': entry[0] }).end(Buffer.from(entry[1], 'base64'))
        return
      }
      const target = allowedPaths.has(pathname) && config.fallback ? config.fallback : candidate
      const file = await realpath(resolve(directory, '.' + target))
      if (!file.startsWith(directory + sep)) return void response.writeHead(404).end()
      response.writeHead(200, { 'content-type': types[extname(file)] ?? 'application/octet-stream' }).end(await readFile(file))
    } catch {
      response.writeHead(404).end()
    }
  })
  await new Promise(ok => server.listen(0, '127.0.0.1', ok))
  const origin = 'http://127.0.0.1:' + server.address().port
  let browser
  try {
    const { chromium } = createRequire(import.meta.url)(process.env.QA_PLAYWRIGHT ?? 'playwright')
    const customChromium = process.env.QA_CHROMIUM
      ? (await import(pathToFileURL(process.env.QA_CHROMIUM))).default
      : null
    browser = await chromium.launch(customChromium ? { executablePath: await customChromium.executablePath(), args: customChromium.args } : {})
    for (const width of [390, 820, 1440]) {
      const metrics = { width, status: 'failed', consoleErrors: 0, pageErrors: 0, localNetworkErrors: 0, blockingNetworkErrors: 0, failedResourceTypes: {}, externalRequestsBlocked: 0 }
      result.browser.push(metrics)
      const context = await browser.newContext({ viewport: { width, height: 900 }, serviceWorkers: 'block' })
      try {
        await context.route('**/*', route => {
          const request = route.request()
          if (new URL(request.url()).origin === origin && request.method() === 'GET' && !new URL(request.url()).pathname.startsWith('/api/')) return route.continue()
          metrics.externalRequestsBlocked++
          return route.fulfill({ status: 204, body: '' })
        })
        await context.routeWebSocket('**/*', socket => socket.close())
        const page = await context.newPage()
        page.on('pageerror', () => metrics.pageErrors++)
        page.on('console', event => { if (event.type() === 'error') metrics.consoleErrors++ })
        function recordNetworkError(request) {
          if (new URL(request.url()).origin !== origin) return
          const type = request.resourceType()
          metrics.localNetworkErrors++
          metrics.failedResourceTypes[type] = (metrics.failedResourceTypes[type] ?? 0) + 1
          if (['document', 'script', 'stylesheet', 'xhr', 'fetch'].includes(type)) metrics.blockingNetworkErrors++
          if (process.env.QA_LOCAL_DEBUG === '1') console.error(type, new URL(request.url()).pathname)
        }
        page.on('requestfailed', recordNetworkError)
        page.on('response', response => { if (response.status() >= 400) recordNetworkError(response.request()) })
        const response = await page.goto(origin + config.page, { waitUntil: 'networkidle' })
        assert(response?.ok())
        assert.equal(new URL(page.url()).origin, origin)
        await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 15_000 })
        assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), true)
        if (repo === 'Rodents-Extermination') assert.equal(await page.getByText('Live data · Edits save', { exact: true }).count(), 0)
        await page.screenshot({ path: resolve(output, 'signed-out-' + width + '.png'), animations: 'disabled', mask: [page.locator('input, textarea, [contenteditable]')] })
        await page.reload({ waitUntil: 'networkidle' })
        assert.equal(new URL(page.url()).origin, origin)
        await page.locator('input[type="password"]').first().waitFor({ state: 'visible', timeout: 15_000 })
        assert.equal(metrics.pageErrors, 0)
        assert.equal(metrics.blockingNetworkErrors, 0)
        metrics.status = 'passed'
      } catch (error) {
        if (process.env.QA_LOCAL_DEBUG === '1') console.error(error.message)
      } finally {
        await context.close()
      }
    }
    assert.equal(result.browser.filter(item => item.status === 'passed').length, 3)
  } finally {
    await browser?.close()
    await new Promise(ok => server.close(ok))
  }
}
