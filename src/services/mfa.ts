// Serviço MFA (2FA por TOTP) — usa a API nativa do Supabase Auth.
// Opt-in: o utilizador inscreve um autenticador; quem tiver fator é desafiado no
// login. Não guarda segredos no nosso lado — o Supabase gere os fatores.
import { createClient } from '@/lib/supabase/client'

export interface FatorTotp {
  id:        string
  friendlyName: string | null
  status:    string   // 'verified' | 'unverified'
}

// Lista os fatores TOTP do utilizador atual.
export async function listarFatores(): Promise<FatorTotp[]> {
  const supabase = createClient()
  const { data, error } = await supabase.auth.mfa.listFactors()
  if (error) throw new Error(error.message)
  return (data?.totp ?? []).map((f) => ({ id: f.id, friendlyName: f.friendly_name ?? null, status: f.status }))
}

// Nível de garantia atual/seguinte (aal1 = só password; aal2 = password + MFA).
export async function nivelMfa(): Promise<{ atual: string | null; proximo: string | null }> {
  const supabase = createClient()
  const { data, error } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (error) throw new Error(error.message)
  return { atual: data?.currentLevel ?? null, proximo: data?.nextLevel ?? null }
}

export interface InscricaoTotp {
  factorId: string
  qrSvg:    string   // QR code (SVG) para o app autenticador
  secret:   string   // chave manual (caso não consiga ler o QR)
  uri:      string
}

// Inicia a inscrição de um novo autenticador TOTP. Devolve o QR a mostrar.
export async function inscreverTotp(friendlyName = 'Autenticador'): Promise<InscricaoTotp> {
  const supabase = createClient()
  const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', friendlyName })
  if (error) throw new Error(error.message)
  return { factorId: data.id, qrSvg: data.totp.qr_code, secret: data.totp.secret, uri: data.totp.uri }
}

// Confirma a inscrição validando um código do app. Eleva a sessão a aal2.
export async function confirmarInscricao(factorId: string, code: string): Promise<void> {
  const supabase = createClient()
  const ch = await supabase.auth.mfa.challenge({ factorId })
  if (ch.error) throw new Error(ch.error.message)
  const vr = await supabase.auth.mfa.verify({ factorId, challengeId: ch.data.id, code })
  if (vr.error) throw new Error(vr.error.message)
}

// Remove um fator (desativa o 2FA desse autenticador).
export async function removerFator(factorId: string): Promise<void> {
  const supabase = createClient()
  const { error } = await supabase.auth.mfa.unenroll({ factorId })
  if (error) throw new Error(error.message)
}

// Desafio no LOGIN: valida o código do fator e eleva a sessão a aal2.
export async function desafiarLogin(factorId: string, code: string): Promise<void> {
  const supabase = createClient()
  const ch = await supabase.auth.mfa.challenge({ factorId })
  if (ch.error) throw new Error(ch.error.message)
  const vr = await supabase.auth.mfa.verify({ factorId, challengeId: ch.data.id, code })
  if (vr.error) throw new Error(vr.error.message)
}
