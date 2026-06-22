// Seam de email transacional — SERVER-SIDE apenas.
// Mock por omissão (regista em log). Real via Resend (fetch, sem SDK) quando
// EMAIL_MOCK=false e RESEND_API_KEY definida. Mantém o mesmo padrão dos outros
// serviços (WhatsApp, billing): funciona simulado e tem seam para o real.
import 'server-only'
import { logger } from '@/lib/logger'

export function emailMock(): boolean {
  return process.env.EMAIL_MOCK !== 'false' || !process.env.RESEND_API_KEY
}

export interface EmailInput {
  to:      string
  subject: string
  html:    string
}

export interface EmailResult { ok: boolean; mock: boolean; id?: string }

// Envia um email. Nunca lança: uma falha de email não pode partir o fluxo
// principal (ex.: criação de membro). Devolve { ok:false } em caso de erro.
export async function enviarEmail({ to, subject, html }: EmailInput): Promise<EmailResult> {
  if (emailMock()) {
    logger.info('Email simulado (EMAIL_MOCK)', { to, subject })
    return { ok: true, mock: true }
  }

  const from = process.env.EMAIL_FROM ?? 'ExodoFlow Pro <no-reply@exodoflow.app>'
  try {
    const res = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ from, to, subject, html }),
    })
    if (!res.ok) {
      logger.warn('Falha ao enviar email', { to, status: res.status })
      return { ok: false, mock: false }
    }
    const data = (await res.json()) as { id?: string }
    return { ok: true, mock: false, id: data.id }
  } catch (e) {
    logger.warn('Exceção ao enviar email', { to, erro: e instanceof Error ? e.message : String(e) })
    return { ok: false, mock: false }
  }
}
