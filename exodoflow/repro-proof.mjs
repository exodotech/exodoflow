import { chromium } from 'playwright'
const APP = 'http://localhost:3000'
const browser = await chromium.launch()
const page = await (await browser.newContext()).newPage()
const erros = []
page.on('pageerror', (e) => erros.push('PAGEERROR: ' + e.message.slice(0,120)))
page.on('console', (m) => { if (m.type()==='error') erros.push(m.text().slice(0,120)) })

const rotas = ['/dashboard','/dashboard/agenda','/dashboard/clientes','/dashboard/servicos','/dashboard/recursos','/dashboard/conversas','/dashboard/configuracoes']
const sinal = {
  '/dashboard':'Bem-vindo', '/dashboard/agenda':'Hoje|Semana|marcaç|Nenhuma',
  '/dashboard/clientes':'cliente|Total|Marketing', '/dashboard/servicos':'Serviço|Receita|Nenhum',
  '/dashboard/recursos':'Colaborador|Recurso|Nenhum', '/dashboard/conversas':'Conversa|WhatsApp|Nenhum',
  '/dashboard/configuracoes':'Empresa|País|Branding',
}

// LOGIN
await page.goto(`${APP}/login`, { waitUntil:'domcontentloaded' })
await page.fill('input[type=email]','owner@clinica-aurora.pt')
await page.fill('input[type=password]','test1234')
await page.click('button[type=submit]')
await page.waitForURL('**/dashboard',{timeout:25000}).catch(()=>{})
console.log('A) LOGIN →', page.url(), page.url().includes('/dashboard')?'✓':'⚠️')

// AQUECER (compilar) todas as rotas uma vez
console.log('B) a aquecer rotas (compilação dev)…')
for (const r of rotas) { await page.goto(`${APP}${r}`,{waitUntil:'domcontentloaded'}).catch(()=>{}); await page.waitForTimeout(2500) }

// VERIFICAR render real (rotas já compiladas)
console.log('C) VERIFICAÇÃO DE RENDER (rotas quentes):')
let okCount = 0
for (const r of rotas) {
  erros.length = 0
  await page.goto(`${APP}${r}`, { waitUntil:'domcontentloaded' }).catch(()=>{})
  const re = new RegExp(sinal[r], 'i')
  let estado = '⏳ preso a carregar'
  for (let i=0;i<24;i++){
    await page.waitForTimeout(500)
    const t = (await page.locator('body').innerText().catch(()=>'')) || ''
    if (/Algo correu mal|Erro crítico/i.test(t)) { estado='⚠️ ERROR BOUNDARY'; break }
    if (re.test(t)) { estado='✓ renderizou'; okCount++; break }
  }
  console.log(`   ${r.padEnd(26)} ${estado}${erros.length?'  ['+[...new Set(erros)][0]+']':''}`)
}
console.log(`   → ${okCount}/${rotas.length} renderizaram`)

// LOGOUT + re-navegação
console.log('D) LOGOUT:')
await page.goto(`${APP}/dashboard`, { waitUntil:'domcontentloaded' }).catch(()=>{})
await page.waitForTimeout(3000)
await page.getByRole('button',{name:/^Sair$/}).first().click({timeout:5000}).catch(e=>console.log('   click:',e.message))
let foi=false; for(let i=0;i<20;i++){await page.waitForTimeout(500); if(/\/login/.test(page.url())){foi=true;break}}
console.log('   após Sair →', page.url(), foi?'✓':'⚠️')
await page.goto(`${APP}/dashboard`, { waitUntil:'domcontentloaded' }).catch(()=>{})
await page.waitForTimeout(2000)
console.log('   re-/dashboard →', page.url(), /\/login/.test(page.url())?'✓ continua DESLOGADO':'⚠️ reabriu autenticado')
// refresh em /login
await page.goto(`${APP}/login`, { waitUntil:'domcontentloaded' }).catch(()=>{})
await page.waitForTimeout(1000)
console.log('   /login após logout →', page.url(), /\/login/.test(page.url())?'✓ fica em login':'⚠️ saltou p/ dashboard')

await browser.close()
