// Serviço de onboarding — operações de cada passo do fluxo inicial
// Cada função persiste o progresso na BD + avança onboarding_step
//
// IMPORTANTE: todos os UPDATE usam .select('id') + assertMutationSuccess.
// Sem isso, um UPDATE bloqueado por RLS devolve error=null e 0 linhas — o
// onboarding "avançava" no ecrã sem gravar nada (bug real corrigido).
import { createClient }   from '@/lib/supabase/client'
import { getTenantId }    from '@/lib/supabase/getTenantId'
import { assertMutationSuccess } from '@/lib/supabase/assertMutationSuccess'
import type { Step1EmpresaInput }         from '@/lib/validators/onboarding'
import type { Step3ServicoInput }         from '@/lib/validators/onboarding'
import type { Step4RecursoInput }         from '@/lib/validators/onboarding'
import type { Step5DisponibilidadeInput } from '@/lib/validators/onboarding'
import type { ConviteInput }              from '@/lib/validators/onboarding'

// Avança o onboarding_step verificando que a linha foi mesmo actualizada
async function avancarStep(tenant_id: string, step: number): Promise<void> {
  const supabase = createClient()
  const { data, error } = await supabase
    .from('tenants')
    .update({ onboarding_step: step })
    .eq('id', tenant_id)
    .select('id')
  assertMutationSuccess(data, error, `avançar onboarding para o passo ${step}`)
}

// ─── PASSO 1: Guardar dados da empresa ───────────────────────────────────────

export async function salvarEmpresa(input: Step1EmpresaInput): Promise<void> {
  const supabase  = createClient()
  const tenant_id = await getTenantId()

  // País, locale, moeda e fuso são definidos na CRIAÇÃO da empresa (superadmin)
  // e ficam imutáveis (trigger lock_tenant_market). Aqui só gravamos os dados
  // editáveis pelo owner — NUNCA tocamos em country nem em settings.
  const { data, error } = await supabase
    .from('tenants')
    .update({
      name:             input.name,
      slug:             input.slug,
      phone:            input.phone || null,
      email:            input.email || null,
      onboarding_step:  1,
    })
    .eq('id', tenant_id)
    .select('id')

  assertMutationSuccess(data, error, 'guardar dados da empresa')
}


// ─── PASSO 2: Confirmar nicho do negócio (somente leitura) ────────────────────

// O nicho é definido na CRIAÇÃO da empresa (superadmin) e é imutável. Este passo
// é apenas de confirmação visual — avança o onboarding sem reescrever business_type.
export async function confirmarNicho(): Promise<void> {
  const tenant_id = await getTenantId()
  await avancarStep(tenant_id, 2)
}


// ─── PASSO 3: Criar primeiro serviço ─────────────────────────────────────────

export async function criarPrimeiroServico(
  input: Step3ServicoInput
): Promise<string> {
  const supabase  = createClient()
  const tenant_id = await getTenantId()

  const { data, error } = await supabase
    .from('services')
    .insert({
      tenant_id,
      name:             input.name,
      description:      input.description || null,
      duration_minutes: input.duration_minutes,
      price:            input.price ?? null,
      color:            input.color,
      is_active:        input.is_active,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar serviço: ${error.message}`)

  await avancarStep(tenant_id, 3)
  return data.id
}


// ─── PASSO 4: Criar primeiro recurso ─────────────────────────────────────────

export async function criarPrimeiroRecurso(
  input: Step4RecursoInput,
  ownerProfileId: string
): Promise<string> {
  const supabase  = createClient()
  const tenant_id = await getTenantId()

  const metadata = input.specialization
    ? { specialization: input.specialization }
    : {}

  // Se link_to_profile = true e tipo = staff, vincular ao profile do owner
  const profile_id =
    input.link_to_profile && input.type === 'staff' ? ownerProfileId : null

  const { data, error } = await supabase
    .from('resources')
    .insert({
      tenant_id,
      name:       input.name,
      type:       input.type,
      color:      input.color,
      metadata,
      profile_id,
      is_active:  true,
    })
    .select('id')
    .single()

  if (error) throw new Error(`Erro ao criar recurso: ${error.message}`)

  await avancarStep(tenant_id, 4)
  return data.id
}


// ─── PASSO 5: Criar disponibilidade do recurso ────────────────────────────────

export async function criarDisponibilidade(
  input: Step5DisponibilidadeInput,
  resourceId: string
): Promise<void> {
  const supabase  = createClient()
  const tenant_id = await getTenantId()

  // day_of_week segue a convenção PostgreSQL DOW: 0=Domingo ... 6=Sábado
  const rows = input.horarios.map((h) => ({
    tenant_id,
    resource_id:  resourceId,
    day_of_week:  h.day_of_week,
    start_time:   h.start_time,
    end_time:     h.end_time,
  }))

  const { error } = await supabase
    .from('resource_availability')
    .insert(rows)

  if (error) throw new Error(`Erro ao criar disponibilidade: ${error.message}`)

  await avancarStep(tenant_id, 5)
}


// ─── PASSO 6: Criar convites de equipa ───────────────────────────────────────
// Envio real de e-mail está marcado como "em breve" — apenas regista na BD

export async function criarConvitesEquipa(
  convites: ConviteInput[],
  invitedBy: string
): Promise<void> {
  const supabase  = createClient()
  const tenant_id = await getTenantId()

  if (convites.length === 0) {
    // Step 6 pode ser pulado — avança mesmo sem convites
    await avancarStep(tenant_id, 6)
    return
  }

  const rows = convites.map((c) => ({
    tenant_id,
    email:       c.email,
    role:        c.role,
    resource_id: c.resource_id ?? null,
    invited_by:  invitedBy,
    status:      'pending' as const,
  }))

  const { error } = await supabase
    .from('team_invites')
    .insert(rows)

  if (error) throw new Error(`Erro ao criar convites: ${error.message}`)

  await avancarStep(tenant_id, 6)
}


// ─── PASSO 7: Finalizar onboarding ───────────────────────────────────────────

export async function finalizarOnboarding(): Promise<void> {
  const supabase  = createClient()
  const tenant_id = await getTenantId()

  const { data, error } = await supabase
    .from('tenants')
    .update({
      onboarding_completed: true,
      onboarding_step:      7,
    })
    .eq('id', tenant_id)
    .select('id')

  assertMutationSuccess(data, error, 'finalizar onboarding')
}


// ─── Carregar estado actual do onboarding ────────────────────────────────────

export async function carregarEstadoOnboarding(): Promise<{
  onboarding_completed: boolean
  onboarding_step:      number
  country:              string
  name:                 string
  business_type:        string
}> {
  const supabase  = createClient()
  const tenant_id = await getTenantId()

  const { data, error } = await supabase
    .from('tenants')
    .select('onboarding_completed, onboarding_step, country, name, business_type')
    .eq('id', tenant_id)
    .single()

  if (error) throw new Error(`Erro ao carregar estado: ${error.message}`)
  return data
}
