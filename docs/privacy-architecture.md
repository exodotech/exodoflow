# Arquitetura de Privacidade — ExodoFlow Pro

> **Aviso.** Este documento descreve a arquitetura **técnica** de privacidade. Não é
> parecer jurídico. A classificação final de papéis (controlador/operador), bases
> legais e textos contratuais **exigem revisão jurídica** antes de qualquer uso com
> dados reais. Não prometemos conformidade "100% garantida" — esta depende de
> contrato, políticas internas e operação real.

## 0. Sobre o produto (contexto correto)

ExodoFlow Pro é um SaaS **multi-tenant de agenda e gestão para clínicas de estética**
(e nichos próximos). Trata: empresas/tenants, perfis de utilizadores (equipa),
clientes finais, serviços, recursos/profissionais, marcações, finanças internas,
mensagens de WhatsApp, pacotes, fichas de tratamento, avaliações e logs.

> **Não** existe neste produto: rastreio de GPS, check-in/check-out por localização,
> fotos de evidência de serviço, condomínios nem locais de serviço. Controlos
> relativos a esses temas são marcados **N/A** neste repositório.

## 1. Papéis de privacidade (provisório — validar juridicamente)

| Entidade | Papel provável | Notas |
|---|---|---|
| **Empresa cliente (tenant)** | **Controlador** dos dados que carrega: equipa, clientes finais, marcações, fichas de tratamento, finanças. | Decide finalidades e meios do tratamento operacional. |
| **ExodoFlow Pro / Êxodo Tech (como fornecedor SaaS)** | **Operador / Subcontratante** dos dados tratados *em nome* do tenant. | Trata segundo instruções do controlador; requer DPA. |
| **Êxodo Tech (como empresa)** | **Controlador** dos seus próprios dados comerciais: conta, faturação, suporte, relacionamento. | Para estes dados é controlador, não operador. |
| **Membro da equipa (owner/manager/staff/recepção)** | **Titular** dos seus dados pessoais (nome, email, papel). | |
| **Cliente final da clínica** | **Titular**. Pode conter dados **sensíveis de saúde** (ver §3). | |

> A fronteira controlador/operador muda conforme o dado. Validar caso a caso com
> aconselhamento jurídico antes de contrato real.

## 2. Modelo de isolamento multi-tenant (técnico)

- **Chave de isolamento:** `auth_tenant_id()` lê `app_metadata.tenant_id` do JWT.
  O `app_metadata` é definido **server-side** (onboarding) e **não é alterável pelo
  cliente** — base de confiança do isolamento.
- **RLS:** ativa em **todas** as tabelas `public` (29/29), todas com políticas
  (0 tabelas "deny-all" acidentais). Política base: `tenant_id = auth_tenant_id()`.
- **Papéis** (coluna `profiles.role`): `superadmin`, `owner`, `manager`,
  `receptionist`, `staff`. Dados sensíveis (finanças, auditoria) restritos a
  `owner`/`manager` via `auth_user_role()`.
- **Operações privilegiadas** (criar empresa, mudar palavra-passe de owner) correm
  em **Route Handlers server-side** com `service_role`, que **nunca** chega ao
  browser (ver §4).
- **Prova:** `supabase/tests/rls-isolation.test.sql` cria 2 tenants efémeros e
  verifica que A não lê nem escreve dados de B (passa: T1/T2/T3 OK).

## 3. Dados de categoria especial (atenção máxima)

- **`treatment_records`** (fichas de tratamento) pode conter **dados de saúde** —
  categoria sensível na LGPD (art. 5.º, II) e RGPD (art. 9.º). Tratar com base legal
  reforçada, minimização e acesso restrito. Ver inventário em
  [data-inventory.md](data-inventory.md).
- **`clients.nif`** (NIF/CPF/CNPJ) é identificador fiscal — dado pessoal regulado.

## 4. Segredos e fronteira servidor/cliente

- `SUPABASE_SERVICE_ROLE_KEY` **sem** prefixo `NEXT_PUBLIC_`; só lida no servidor.
- `src/lib/supabase/admin.ts` tem guarda `import 'server-only'` → o **build falha**
  se for importado para um bundle de cliente. Verificado: a chave **não** aparece em
  `.next/static`.
- Todos os importadores do cliente admin são Route Handlers/serviços server-side.

## 5. Privacy by design / by default aplicado

- Isolamento por RLS ligado por omissão em cada tabela nova (default-deny).
- Convidados/walk-in (`is_guest`) **não** geram pedido de consentimento (minimização).
- Auditoria não regista segredos nem dados sensíveis (ver `src/lib/logger.ts`).
- Finanças e auditoria escondidas de perfis sem necessidade operacional.

## 6. Pendências (ver docs dedicados)

- [data-inventory.md](data-inventory.md) — inventário e classificação.
- [data-retention-policy.md](data-retention-policy.md) — retenção.
- [data-subject-rights.md](data-subject-rights.md) — direitos dos titulares.
- [legal-documents-needed.md](legal-documents-needed.md) — documentos jurídicos.
- [go-no-go-real-data.md](go-no-go-real-data.md) — critério para dados reais.
- [security-checklist.md](security-checklist.md) — checklist de segurança.
- [incident-response.md](incident-response.md) — resposta a incidentes.
