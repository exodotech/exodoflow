# Inventário de Dados — ExodoFlow Pro

> Mapa técnico das entidades e classificação de privacidade. Base para decisões de
> minimização, retenção e direitos dos titulares. **Não é parecer jurídico** — a
> classificação de "base legal" tem de ser confirmada juridicamente por tenant/país.

Legenda — **Pessoal**: identifica/relaciona-se a pessoa singular. **Sensível**:
categoria especial (saúde, etc.). Acesso por papel via RLS (ver
[privacy-architecture.md](privacy-architecture.md)).

## Entidades principais

| Tabela / campos-chave | Tipo | Pessoal | Sensível | Finalidade | Quem vê (RLS) | Quem edita | Retenção sugerida | Risco / Mitigação |
|---|---|---|---|---|---|---|---|---|
| **tenants** (name, slug, settings.tax_id, address, phone, email) | Dados da empresa cliente | Parcial (contactos) | Não | Operar a conta, faturação, branding | Membros do tenant; superadmin (gestão) | owner | Vida da conta + legal | Baixo. RLS por tenant. |
| **profiles** (full_name, role, tenant_id) | Conta de utilizador da equipa | Sim | Não | Autenticação, permissões | Mesmo tenant | próprio / admin | Enquanto ativo + período legal | Médio. RLS; edição própria com guarda (0015). |
| **clients** (full_name, phone, email, **nif**, is_guest, is_quick, notes) | Cliente final | Sim | nif = identificador fiscal | Agenda, contacto, histórico | Mesmo tenant | staff+ | Definir por tenant (ver retenção) | Médio. RLS; soft-delete (0017); guest sem consentimento (0022). |
| **legal_consents** | Trilho de consentimento | Sim (liga a cliente) | Não | Prova de consentimento (RGPD/LGPD) | Mesmo tenant | sistema (imutável) | Igual ao do cliente + prova | Mitiga risco — registo imutável (0014). |
| **services** (name, price, metadata) | Catálogo | Não | Não | Configurar oferta | Mesmo tenant | admin | Vida da conta | Baixo. |
| **resources** (name, profile_id, commission_percent, metadata) | Profissionais/salas/equipamentos | Parcial (profissional) | Não | Agenda, comissões | Mesmo tenant | admin | Vida da conta | Baixo/Médio. RLS. |
| **resource_availability / resource_blocks** | Horários/ausências | Parcial | Não | Disponibilidade | Mesmo tenant | staff/admin | Vida da conta | Baixo. |
| **bookings** (start_at, status, price_charged, notes, payment_status) | Marcação | Sim (liga cliente/profissional) | Pode revelar saúde por inferência | Operar a agenda | Mesmo tenant | staff+ | Definir (histórico clínico) | Médio. RLS; cancelamento auditado. |
| **booking_resources** | Ligação marcação↔recurso | Indireto | Não | Alocação | Mesmo tenant | staff+ | Igual à marcação | Baixo. |
| **treatment_records** (notes, products) | **Ficha de tratamento** | Sim | **SIM — saúde** | Histórico clínico do cliente | Mesmo tenant | staff+ | Definir (longo, legal de saúde) | **Alto.** RLS; minimizar conteúdo; ver §Atenção. |
| **reviews** (rating, comment) | Avaliação pós-atendimento | Sim (liga cliente) | Opinião | Medir satisfação | Mesmo tenant | staff+ | Média/curta | Baixo/Médio. RLS. |
| **client_packages** | Pacotes de sessões | Sim (liga cliente) | Não | Gestão de pacotes | Mesmo tenant | owner/manager (delete) | Vida do pacote + financeiro | Baixo. RLS. |
| **financial_transactions** | Caixa interno | Parcial (liga cliente) | Financeiro | Controlo de caixa | **owner/manager** | owner/manager | Legal financeira | Médio. RLS por papel; soft-delete. |
| **receipts / receipt_counters** | Recibos | Sim (snapshot emissor/cliente) | Financeiro | Comprovativo de pagamento | **owner/manager** | só via RPC | Legal financeira | Médio. Imutável; emissão via RPC. |
| **waitlist** (contact_name, contact_phone) | Lista de espera | Sim | Não | Encaixar cancelamentos | Mesmo tenant | staff+ | Curta (limpar após encaixe) | Baixo/Médio. RLS. |
| **whatsapp_conversations / whatsapp_messages** | Mensagens | Sim | Pode conter sensível no texto livre | Atendimento | Mesmo tenant | staff+ | Curta/média | Médio. RLS; idempotência (0026). |
| **communication_channels / templates / logs** | Config + envios | Parcial | Não | Comunicação automática | Mesmo tenant | admin | Média | Baixo. |
| **ai_contexts** | Contexto do assistente | Parcial | Possível no texto | Respostas da IA | Mesmo tenant | sistema | Curta | Médio. IA não escreve na agenda. |
| **audit_logs** (action, actor_id, metadata) | Trilho de auditoria | Pseudo (IDs) | Não (sem segredos) | Rastreabilidade | **owner/manager** | sistema (RPC) | Longa (segurança) | Mitiga risco. Sem dados sensíveis no metadata. |
| **system_audit_logs** | Auditoria de plataforma | Pseudo | Não | Operação superadmin | superadmin | sistema | Longa | Baixo. |
| **team_invites** (email) | Convites de equipa | Sim | Não | Onboarding de equipa | Mesmo tenant | admin | Curta (expira) | Baixo. RLS. |
| **plans / feature_flags / daily_metrics** | Config/uso agregado | Não | Não | Planos, métricas | Conforme | superadmin/sistema | Média | Baixo. |
| **Storage `tenant-logos`** | Logo da empresa | Não (asset de marca) | Não | Branding | Público (leitura) | próprio tenant | Vida da conta | Baixo. Bucket público = só logos; 2MB + MIME allowlist (sem SVG); RLS por pasta `{tenant_id}/`. |

## Atenção especial — `treatment_records` (dados de saúde)

- Categoria **sensível** (LGPD art. 5.º II / RGPD art. 9.º). Exige base legal
  reforçada, minimização e acesso estritamente operacional.
- **TODO de minimização:** o campo `notes` é texto livre — orientar a equipa (e/ou
  validar) a **não** registar mais do que o necessário para o tratamento.

## Notas de minimização (TODOs técnicos)

- `clients`: documento pessoal/data de nascimento **não** são recolhidos na V1 —
  manter assim salvo necessidade comprovada.
- `waitlist.contact_phone`: limpar entradas resolvidas/canceladas periodicamente.
- Logos: considerar remoção de metadados/EXIF no upload (melhoria futura; baixo
  risco por serem assets de marca, não fotos de pessoas).
- **Não** existe captura de localização/GPS nem fotos de pessoas neste produto.
