// Tipos de domínio — Roles e Permissões
// Fonte de verdade para todo o sistema de controlo de acesso

// Roles disponíveis (alinhados com profiles.role na BD)
// superadmin: administrador do SISTEMA (sem tenant) — usa apenas o painel /admin,
// não tem permissões operacionais dentro de nenhum tenant.
export type AppRole = 'superadmin' | 'owner' | 'manager' | 'receptionist' | 'staff'

// Permissões granulares — string literal union para type-safety
export type Permission =
  // Agenda
  | 'agenda.view'           // ver todas as marcações do tenant
  | 'agenda.view_own'       // ver apenas as próprias marcações (STAFF)
  | 'agenda.create'         // criar novas marcações
  | 'agenda.cancel'         // cancelar marcações
  | 'agenda.reschedule'     // reagendar marcações
  | 'agenda.update_status'  // alterar status (confirmar, concluir, no-show)
  | 'agenda.delete'         // apagar marcações (hard delete)
  // Clientes
  | 'clients.view'
  | 'clients.create'
  | 'clients.update'
  | 'clients.delete'        // STAFF e RECEPTIONIST não podem apagar
  // Serviços
  | 'services.view'
  | 'services.manage'       // criar + actualizar + apagar
  // Recursos
  | 'resources.view'
  | 'resources.manage'
  // Conversas (WhatsApp)
  | 'conversas.view'
  | 'conversas.reply'
  // Relatórios
  | 'relatorios.view'
  // Finanças (controlo interno de caixa) — OWNER + MANAGER
  | 'financas.view'
  | 'financas.manage'
  // Configurações
  | 'configuracoes.view'    // ver a página de configurações
  | 'configuracoes.edit'    // alterar configurações operacionais
  // Billing / equipa — apenas OWNER
  | 'billing.view'
  | 'billing.edit'
  | 'team.view'             // ver membros da equipa
  | 'team.manage'           // adicionar/remover membros
  // Observabilidade
  | 'audit.view'            // ver o trilho de auditoria (OWNER + MANAGER)
  | 'system.view'           // ver o estado do sistema/health (OWNER)

// Permissões completas por role
// Usadas pelo helper canAccess() — fonte de verdade para toda a UI
export const ROLE_PERMISSIONS: Record<AppRole, ReadonlyArray<Permission>> = {
  owner: [
    'agenda.view', 'agenda.view_own', 'agenda.create', 'agenda.cancel',
    'agenda.reschedule', 'agenda.update_status', 'agenda.delete',
    'clients.view', 'clients.create', 'clients.update', 'clients.delete',
    'services.view', 'services.manage',
    'resources.view', 'resources.manage',
    'conversas.view', 'conversas.reply',
    'relatorios.view',
    'financas.view', 'financas.manage',
    'configuracoes.view', 'configuracoes.edit',
    'billing.view', 'billing.edit',
    'team.view', 'team.manage',
    'audit.view', 'system.view',
  ],

  manager: [
    'agenda.view', 'agenda.view_own', 'agenda.create', 'agenda.cancel',
    'agenda.reschedule', 'agenda.update_status', 'agenda.delete',
    'clients.view', 'clients.create', 'clients.update', 'clients.delete',
    'services.view', 'services.manage',
    'resources.view', 'resources.manage',
    'conversas.view', 'conversas.reply',
    'relatorios.view',
    'financas.view', 'financas.manage',
    'configuracoes.view', 'configuracoes.edit',
    'team.view',
    'audit.view',
    // SEM: billing.view, billing.edit, team.manage, system.view
  ],

  receptionist: [
    'agenda.view', 'agenda.create', 'agenda.cancel',
    'agenda.reschedule', 'agenda.update_status',
    'clients.view', 'clients.create', 'clients.update',
    // SEM: clients.delete
    'services.view',
    'resources.view',
    'conversas.view', 'conversas.reply',
    // SEM: services.manage, resources.manage, relatorios, billing, team, configuracoes
  ],

  staff: [
    'agenda.view_own',      // ver APENAS as suas marcações
    'agenda.update_status', // alterar status das suas marcações
    'clients.view',         // ver clientes (para contexto nas marcações)
    'services.view',        // ver serviços (para contexto)
    'resources.view',       // ver recursos (para contexto)
    // SEM: criar/editar/apagar qualquer coisa; conversas; relatórios; configurações
  ],

  // SUPERADMIN não tem permissões operacionais de tenant — usa o painel /admin.
  // Lista vazia de propósito: impede acesso acidental ao dashboard de um tenant.
  superadmin: [],
}
