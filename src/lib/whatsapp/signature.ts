// Validação da assinatura do webhook da Meta WhatsApp Cloud API.
// A Meta envia `X-Hub-Signature-256: sha256=<hmac>` onde hmac = HMAC-SHA256 do
// CORPO CRU do pedido, com o App Secret. Comparação em tempo constante.
//
// SEGURANÇA: o app_secret vive APENAS no servidor (env WHATSAPP_APP_SECRET) e
// NUNCA é logado nem enviado ao browser.
import crypto from 'node:crypto'

export interface SignatureCheck {
  ok:     boolean
  reason: 'valid' | 'no-secret' | 'no-signature' | 'bad-format' | 'mismatch'
}

// Verifica a assinatura. rawBody tem de ser o texto exacto recebido (não o JSON
// re-serializado — qualquer diferença de bytes invalida o HMAC).
export function verifyMetaSignature(rawBody: string, signatureHeader: string | null, appSecret: string | undefined): SignatureCheck {
  if (!appSecret) return { ok: false, reason: 'no-secret' }
  if (!signatureHeader) return { ok: false, reason: 'no-signature' }

  const prefix = 'sha256='
  if (!signatureHeader.startsWith(prefix)) return { ok: false, reason: 'bad-format' }
  const received = signatureHeader.slice(prefix.length)

  const expected = crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')

  // timingSafeEqual exige buffers do mesmo tamanho
  const a = Buffer.from(received, 'hex')
  const b = Buffer.from(expected, 'hex')
  if (a.length !== b.length) return { ok: false, reason: 'mismatch' }

  return crypto.timingSafeEqual(a, b) ? { ok: true, reason: 'valid' } : { ok: false, reason: 'mismatch' }
}

// Helper para gerar uma assinatura (usado em testes/curl locais).
export function signMetaPayload(rawBody: string, appSecret: string): string {
  return 'sha256=' + crypto.createHmac('sha256', appSecret).update(rawBody, 'utf8').digest('hex')
}
