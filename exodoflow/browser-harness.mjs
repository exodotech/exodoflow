// Browser harness — conduz o Chromium via Playwright para inspecionar a app a
// correr localmente. Faz login com uma conta de teste e tira screenshots das
// rotas pedidas, para revisão visual (o Claude lê os PNGs gerados).
//
// Uso:
//   node browser-harness.mjs <perfil> <rota1> [rota2 ...]
//   node browser-harness.mjs owner /dashboard /dashboard/financas
//   node browser-harness.mjs admin  /admin /admin/empresas
//
// Perfis disponíveis: owner | manager | admin
// Screenshots gravados em ./.harness-shots/<rota-sanitizada>.png
import { chromium } from 'playwright'
import { mkdir } from 'node:fs/promises'
import { join } from 'node:path'

const BASE = process.env.HARNESS_BASE_URL ?? 'http://localhost:3000'
const OUT  = '.harness-shots'

const CONTAS = {
  owner:   { email: 'owner@clinica-aurora.pt',   password: 'test1234',   destino: '/dashboard' },
  manager: { email: 'manager@clinica-aurora.pt', password: 'test1234',   destino: '/dashboard' },
  admin:   { email: 'admin@exodoflow.pt',         password: 'admin12345', destino: '/admin' },
}

const [perfilArg, ...rotas] = process.argv.slice(2)
const perfil = CONTAS[perfilArg]
if (!perfil) {
  console.error(`Perfil inválido "${perfilArg}". Use: owner | manager | admin`)
  process.exit(1)
}
if (rotas.length === 0) rotas.push(perfil.destino)

function sanitizar(rota) {
  return (rota.replace(/^\//, '') || 'home').replace(/[^a-z0-9]+/gi, '-')
}

const erros = []

const browser = await chromium.launch({ headless: true })
const ctx = await browser.newContext({ viewport: { width: 1366, height: 900 }, locale: 'pt-PT' })
const page = await ctx.newPage()

// Captura erros de consola e de página (úteis para detetar runtime errors)
page.on('console', (m) => { if (m.type() === 'error') erros.push(`console: ${m.text()}`) })
page.on('pageerror', (e) => erros.push(`pageerror: ${e.message}`))

await mkdir(OUT, { recursive: true })

// ── Login ────────────────────────────────────────────────────────────────────
console.log(`[harness] login como ${perfilArg} (${perfil.email})`)
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' })
await page.fill('input[type="email"]', perfil.email)
await page.fill('input[type="password"]', perfil.password)
await page.click('button[type="submit"]')

// Esperar sair do /login (redireciona para dashboard/admin/onboarding)
try {
  await page.waitForURL((url) => !url.pathname.startsWith('/login'), { timeout: 15000 })
  console.log(`[harness] autenticado → ${new URL(page.url()).pathname}`)
} catch {
  console.error('[harness] FALHA no login — continua na página de login')
  await page.screenshot({ path: join(OUT, 'login-falha.png') })
  await browser.close()
  process.exit(2)
}

// ── Screenshots das rotas ──────────────────────────────────────────────────────
for (const rota of rotas) {
  try {
    await page.goto(`${BASE}${rota}`, { waitUntil: 'networkidle', timeout: 20000 })
    await page.waitForTimeout(700) // deixar animações/queries assentar
    const ficheiro = join(OUT, `${sanitizar(rota)}.png`)
    await page.screenshot({ path: ficheiro, fullPage: true })
    const final = new URL(page.url()).pathname
    const nota = final === rota ? '' : `  (redirecionado → ${final})`
    console.log(`[harness] ✓ ${rota} → ${ficheiro}${nota}`)
  } catch (e) {
    console.error(`[harness] ✗ ${rota}: ${e.message}`)
    erros.push(`rota ${rota}: ${e.message}`)
  }
}

await browser.close()

if (erros.length) {
  console.log('\n[harness] ERROS DETETADOS:')
  for (const e of erros) console.log(`  - ${e}`)
  process.exit(1)
}
console.log('\n[harness] concluído sem erros de consola.')
