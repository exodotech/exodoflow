// Logout central e à prova de sessão corrompida.
// TODOS os botões de logout devem usar forceLogout — nada de implementações próprias.
//
// Garantias:
//  - signOut({ scope: 'local' }) limpa a sessão do browser sem depender do servidor;
//  - nunca bloqueia mais de 1.5s (Promise.race) — se signOut pendurar, segue;
//  - limpa chaves sb-* do localStorage/sessionStorage;
//  - redireciona SEMPRE via window.location (hard navigation limpa todo o estado React);
//  - funciona mesmo com refresh token inválido e em desktop/mobile.
import { createClient } from '@/lib/supabase/client'
import { logger }       from '@/lib/logger'

export async function forceLogout(): Promise<void> {
  // 1. Terminar sessão local — com timeout para nunca pendurar
  try {
    const supabase = createClient()
    await Promise.race([
      supabase.auth.signOut({ scope: 'local' }),
      new Promise((resolve) => setTimeout(resolve, 1500)),
    ])
  } catch (e) {
    logger.warn('signOut falhou no forceLogout — continua para limpeza', {
      erro: e instanceof Error ? e.message : String(e),
    })
  }

  // 2. Limpar restos de sessão no localStorage/sessionStorage
  try {
    if (typeof window !== 'undefined') {
      for (const store of [window.localStorage, window.sessionStorage]) {
        for (const k of Object.keys(store)) {
          if (k.startsWith('sb-') || k.includes('supabase')) store.removeItem(k)
        }
      }
    }
  } catch {
    /* storage indisponível — ignora */
  }

  // 3. CRÍTICO: expirar os cookies sb-* — é o que o middleware/servidor lê.
  //    Sem isto, voltar a /dashboard reabre autenticado (o cookie persistia).
  try {
    if (typeof document !== 'undefined') {
      for (const c of document.cookie.split(';')) {
        const name = c.split('=')[0].trim()
        if (name.startsWith('sb-') || name.includes('supabase')) {
          document.cookie = `${name}=; Max-Age=0; path=/`
          document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/`
        }
      }
    }
  } catch {
    /* sem acesso a cookies — ignora */
  }

  // 4. Redirect garantido — hard navigation descarta todo o estado autenticado
  if (typeof window !== 'undefined') {
    window.location.assign('/login')
  }
}
