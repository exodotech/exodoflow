// Encriptação de segredos em REPOUSO (AES-256-GCM).
//
// Porquê: alguns segredos de terceiros (ex.: o access_token do WhatsApp de cada
// empresa) ficam na base de dados. Mesmo com RLS, um dump/backup ou uma fuga de
// SELECT exporia o token em claro. Encriptamos na camada da app com uma chave que
// vive SÓ no ambiente do servidor (Vercel) — nunca na BD. Assim, um dump da BD
// sozinho é inútil sem a chave.
//
// Este módulo usa `node:crypto`, que não existe no browser/edge — qualquer tentativa
// de o importar para o cliente falha no build. É, por natureza, server-only.
import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto'
import { logger } from '@/lib/logger'

const PREFIX = 'enc:v1:'      // marca o formato; permite migrar de versão no futuro
const ALGO   = 'aes-256-gcm'

// Lê e valida a chave (32 bytes) de SECRET_ENCRYPTION_KEY (base64 recomendado, hex aceite).
function getKey(): Buffer | null {
  const raw = process.env.SECRET_ENCRYPTION_KEY
  if (!raw) return null

  let key = Buffer.from(raw, 'base64')
  if (key.length !== 32) {
    const hex = Buffer.from(raw, 'hex')
    if (hex.length === 32) key = hex
  }
  if (key.length !== 32) {
    throw new Error('SECRET_ENCRYPTION_KEY inválida: tem de ser 32 bytes (base64 ou hex). Gere com: openssl rand -base64 32')
  }
  return key
}

// A encriptação de segredos está configurada? (chave presente)
export function isSecretEncryptionConfigured(): boolean {
  return !!process.env.SECRET_ENCRYPTION_KEY
}

// Encripta um valor para armazenar. Sem chave (ex.: dev), guarda em claro com aviso
// — PRODUÇÃO DEVE definir SECRET_ENCRYPTION_KEY.
export function encryptSecret(plain: string): string {
  const key = getKey()
  if (!key) {
    logger.warn('SECRET_ENCRYPTION_KEY ausente — segredo guardado SEM encriptação. Defina a chave em produção.')
    return plain
  }
  const iv     = randomBytes(12)
  const cipher = createCipheriv(ALGO, key, iv)
  const ct     = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()])
  const tag    = cipher.getAuthTag()
  return `${PREFIX}${iv.toString('base64')}:${tag.toString('base64')}:${ct.toString('base64')}`
}

// Desencripta um valor lido. Compatível com valores legados em claro (sem prefixo),
// para não quebrar empresas já ligadas antes desta mudança.
export function decryptSecret(value: string | null | undefined): string {
  if (!value) return ''
  if (!value.startsWith(PREFIX)) return value   // legado/plaintext — devolve como está

  const key = getKey()
  if (!key) {
    throw new Error('SECRET_ENCRYPTION_KEY ausente: impossível desencriptar um segredo encriptado.')
  }
  // 'enc:v1:<iv>:<tag>:<ct>' — base64 não contém ':', por isso split é seguro
  const [, , ivB64, tagB64, ctB64] = value.split(':')
  const iv  = Buffer.from(ivB64,  'base64')
  const tag = Buffer.from(tagB64, 'base64')
  const ct  = Buffer.from(ctB64,  'base64')

  const decipher = createDecipheriv(ALGO, key, iv)
  decipher.setAuthTag(tag)              // GCM: deteta adulteração no final()
  return Buffer.concat([decipher.update(ct), decipher.final()]).toString('utf8')
}

// É um valor já encriptado por este módulo?
export function isEncrypted(value: string | null | undefined): boolean {
  return !!value && value.startsWith(PREFIX)
}
