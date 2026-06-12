// Serviço de auditoria — regista acções críticas em audit_logs (append-only).
// A escrita passa pelo RPC SECURITY DEFINER record_audit_log: o cliente não
// insere directamente (RLS só permite SELECT) e não pode forjar tenant/actor.
//
// PRINCÍPIO: a auditoria NUNCA deve quebrar a operação principal. Qualquer falha
// é registada no logger e engolida — o utilizador não vê erro por causa do log.
//
// PRIVACIDADE: passar apenas identificadores e contexto não-sensível em metadata.
// Nunca telefone/e-mail/NIF/tokens em claro (usar maskPII no logger se preciso).
import { createClient } from '@/lib/supabase/client'
import { logger }       from '@/lib/logger'

// Acções auditáveis (string estável — fácil de filtrar no painel de auditoria)
export type AuditAction =
  | 'client.create' | 'client.update' | 'client.delete' | 'client.convert'
  | 'guest.create'
  | 'booking.create' | 'booking.cancel' | 'booking.reschedule'
  | 'service.create' | 'service.delete'
  | 'resource.create' | 'resource.delete'
  | 'team.role_change' | 'team.suspend' | 'team.reactivate' | 'team.create'
  | 'company.update' | 'branding.update'
  | 'whatsapp.send' | 'whatsapp.assign' | 'whatsapp.status' | 'whatsapp.note'
  | 'finance.create' | 'finance.update' | 'finance.delete'
  | 'booking.payment'

interface AuditOpts {
  table?:    string
  recordId?: string | null
  metadata?: Record<string, unknown>
}

// Linha do trilho de auditoria (para o painel /dashboard/auditoria)
export interface AuditLogRow {
  id:         string
  action:     string
  table_name: string | null
  record_id:  string | null
  actor_id:   string | null
  metadata:   Record<string, unknown> | null
  created_at: string
}

// Lê o trilho de auditoria do tenant (RLS: só owner/manager têm SELECT).
// Ordenado do mais recente para o mais antigo. Filtro opcional por acção.
export async function listarAuditoria(opts: { action?: string; limit?: number } = {}): Promise<AuditLogRow[]> {
  const supabase = createClient()
  let query = supabase
    .from('audit_logs')
    .select('id, action, table_name, record_id, actor_id, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 200)

  if (opts.action) query = query.eq('action', opts.action)

  const { data, error } = await query
  if (error) throw new Error(`Erro ao listar auditoria: ${error.message}`)
  return (data ?? []) as AuditLogRow[]
}

export async function registarAuditoria(action: AuditAction, opts: AuditOpts = {}): Promise<void> {
  try {
    const supabase = createClient()
    const { error } = await supabase.rpc('record_audit_log', {
      p_action:     action,
      p_table_name: opts.table ?? undefined,
      p_record_id:  opts.recordId ?? undefined,
      p_metadata:   (opts.metadata ?? {}) as never,
    })
    if (error) {
      logger.warn('Falha ao registar auditoria (operação principal não afectada)', {
        action, erro: error.message,
      })
    } else {
      logger.audit(`Auditoria: ${action}`, { action, entity: opts.table, entity_id: opts.recordId })
    }
  } catch (e) {
    // Auditoria nunca bloqueia o fluxo principal
    logger.warn('Excepção ao registar auditoria', { action, erro: e instanceof Error ? e.message : String(e) })
  }
}
