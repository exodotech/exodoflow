# Documentos Jurídicos Necessários — ExodoFlow Pro

> ⚠️ **Estes documentos NÃO devem ser gerados como definitivos por IA.** Esta lista é
> apenas um **roadmap técnico** do que precisa de ser redigido e **revisto por
> advogado/jurista** antes de vender para clientes reais ou tratar dados reais.

## Antes de vender / antes de dados reais

| Documento | Para quê | Quem é parte | Estado |
|---|---|---|---|
| **Política de Privacidade** | Transparência aos titulares (LGPD art. 9 / RGPD art. 13–14) | ExodoFlow ↔ utilizadores/titulares | A redigir (jurídico) |
| **Termos de Uso / Serviço** | Regras de uso do SaaS | ExodoFlow ↔ tenant | A redigir (jurídico) |
| **Contrato SaaS / Subscrição** | Comercial, SLA, responsabilidades | ExodoFlow ↔ tenant | A redigir (jurídico) |
| **DPA — Acordo de Tratamento de Dados** | Define ExodoFlow como **operador** e o tenant como **controlador**; instruções, subprocessadores, segurança, devolução/eliminação | ExodoFlow ↔ tenant | **Crítico** — a redigir (jurídico) |
| **Lista de Subprocessadores** | Transparência (ex.: Supabase, Vercel, Meta/WhatsApp, Anthropic) | Anexo do DPA | A compilar |
| **Política de Segurança da Informação** | Controlos técnicos e organizativos | Interno | Parcial — ver [security-checklist.md](security-checklist.md) |
| **Política de Retenção** | Prazos e eliminação | Interno/anexo | Rascunho técnico em [data-retention-policy.md](data-retention-policy.md) |
| **Política de Backup** | Cópias, restauro, eliminação segura | Interno | Base em [backup-and-recovery.md](backup-and-recovery.md) |
| **Política de Cookies** | Se houver cookies não essenciais | ExodoFlow ↔ utilizadores | Ver §Cookies abaixo |
| **Procedimento de Resposta a Incidentes** | Deteção, contenção, notificação | Interno | Existe — [incident-response.md](incident-response.md) |
| **Procedimento de Pedidos de Titulares** | Atender direitos | Interno | Base técnica em [data-subject-rights.md](data-subject-rights.md) |
| **Registo de Operações de Tratamento (ROPA)** | RGPD art. 30 / boa prática LGPD | Interno | Base em [data-inventory.md](data-inventory.md) |

## Subprocessadores prováveis (confirmar e listar no DPA)

- **Supabase** — base de dados, auth, storage.
- **Vercel** — hosting da aplicação.
- **Meta / WhatsApp Cloud API** — mensagens (quando ativado).
- **Anthropic** — assistente de IA (quando `ASSISTANT_MOCK=false`).
- Provedor de email (relatórios) — quando integrado.

> Cada subprocessador precisa de avaliação (localização dos dados, transferências
> internacionais, garantias contratuais) **com revisão jurídica**.

## Cookies / Analytics

Ver [data-inventory.md](data-inventory.md) e a verificação em
[go-no-go-real-data.md](go-no-go-real-data.md). Se não existir analytics/tracking
não essencial, documentar que só há cookies **essenciais** de sessão — caso em que
o esforço de "Política de Cookies" é mínimo (mas confirmar juridicamente).

## Aviso final

Tecnicamente o software pode estar pronto para staging, mas a **venda a clientes
reais exige NEEDS LEGAL REVIEW** — ver decisão em [go-no-go-real-data.md](go-no-go-real-data.md).
