// Health check — GET /api/health
// Verifica: app + base de dados + auth + storage. Usado por monitorização externa
// e pela página /dashboard/sistema. NÃO expõe segredos (só nomes de checks).
//
// Estado agregado:
//   ok       — tudo a responder
//   degraded — algo NÃO crítico falhou (storage/auth) mas a BD responde
//   down     — a base de dados não responde (ou faltam variáveis essenciais)
import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

type CheckState = 'ok' | 'fail' | 'skip'

const APP_VERSION = process.env.NEXT_PUBLIC_APP_VERSION ?? '0.1.0'

export async function GET() {
  const checks: Record<'app' | 'database' | 'auth' | 'storage', CheckState> = {
    app:      'ok',
    database: 'skip',
    auth:     'skip',
    storage:  'skip',
  }

  const url     = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  const base = { version: APP_VERSION, timestamp: new Date().toISOString() }

  // Sem variáveis essenciais → down (não dá para falar com o backend)
  if (!url || !anonKey) {
    return NextResponse.json(
      { status: 'down', checks: { ...checks, database: 'fail', auth: 'fail', storage: 'fail' }, ...base,
        error: 'Variáveis de ambiente Supabase em falta' },
      { status: 503 }
    )
  }

  const supabase = createClient(url, anonKey)

  // Base de dados — query mínima (PostgREST responde, mesmo que RLS devolva vazio)
  try {
    const { error } = await supabase.from('plans').select('id').limit(1)
    checks.database = error && error.code === '' ? 'fail' : 'ok'
  } catch { checks.database = 'fail' }

  // Auth — o endpoint GoTrue responde a uma chamada de sessão (sem sessão é ok)
  try {
    const { error } = await supabase.auth.getSession()
    checks.auth = error ? 'fail' : 'ok'
  } catch { checks.auth = 'fail' }

  // Storage — o bucket tenant-logos responde a um list mínimo
  try {
    const { error } = await supabase.storage.from('tenant-logos').list('', { limit: 1 })
    checks.storage = error ? 'fail' : 'ok'
  } catch { checks.storage = 'fail' }

  // Estado agregado: BD é crítica; auth/storage degradam mas não derrubam
  let status: 'ok' | 'degraded' | 'down'
  if (checks.database === 'fail') status = 'down'
  else if (checks.auth === 'fail' || checks.storage === 'fail') status = 'degraded'
  else status = 'ok'

  return NextResponse.json(
    { status, checks, ...base },
    { status: status === 'down' ? 503 : 200 }
  )
}
