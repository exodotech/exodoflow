# Legal Readiness — ExodoFlow Pro

Estado: **EM PREPARAÇÃO** — requer revisão por advogado antes de aceitar utilizadores reais.

---

## O que está feito (técnico)

| Item | Estado |
|------|--------|
| Páginas `/privacidade` e `/termos` existem e mostram aviso honesto | ✅ |
| Aviso "Documento em revisão jurídica" visível antes de qualquer acesso | ✅ |
| Consentimento RGPD recolhido no registo (legal_consents) | ✅ |
| Auditoria append-only de todas as ações críticas (audit_logs) | ✅ |
| Data Subject Requests: exportar e apagar dados (DSR) | ✅ |
| Anonymize de dados de cliente (fn_anonymize_client) | ✅ |
| Retenção automática de dados apagados (90 dias → purge) | ✅ |
| Isolamento multi-tenant por RLS provado em CI | ✅ |
| Logs estruturados sem dados pessoais sensíveis | ✅ |
| Cookies: apenas técnicos (sessão Supabase) — sem tracking/analytics | ✅ |
| `service_role` nunca exposto ao browser | ✅ |

---

## O que o advogado precisa de redigir / validar

### 1. Política de Privacidade (`/privacidade`)

Mínimo RGPD (Reg. UE 2016/679) / LGPD (Lei 13.709/2018):

- [ ] Identidade e contacto do Responsável pelo Tratamento (Êxodo Tech)
- [ ] Finalidades do tratamento (gerir agenda, enviar lembretes, faturação)
- [ ] Base legal para cada finalidade (contrato, consentimento, obrigação legal)
- [ ] Categorias de dados tratados (nome, email, tel, dados de saúde se clínica)
- [ ] Período de retenção por categoria
- [ ] Transferências internacionais (Supabase EU, Resend EU, Anthropic EUA)
- [ ] Direitos dos titulares (acesso, retificação, apagamento, portabilidade, oposição)
- [ ] Como exercer direitos (email de contacto ou formulário DSR)
- [ ] DPO ou contacto de privacidade
- [ ] Data de última atualização + versioning

**Atenção:** clínicas de estética e fisioterapia tratam dados de saúde (categoria especial, art. 9.º RGPD) — requer base legal reforçada (consentimento explícito ou necessidade de cuidados de saúde).

### 2. Termos e Condições de Utilização (`/termos`)

- [ ] Partes (Êxodo Tech como fornecedor SaaS; tenant como cliente B2B)
- [ ] Objeto e âmbito do serviço
- [ ] Condições de aceitação (owner aceita em nome da empresa)
- [ ] Planos e preços (referência à tabela de preços em vigor)
- [ ] Pagamento e cancelamento (ciclo mensal/anual, reembolsos)
- [ ] Responsabilidades e limitações de responsabilidade
- [ ] Propriedade intelectual (plataforma é da Êxodo Tech; dados dos tenants são deles)
- [ ] Suspensão e rescisão (incumprimento, mora)
- [ ] Lei aplicável e foro competente (Portugal / Lisboa ou Brasil / SP)

### 3. Acordo de Tratamento de Dados (DPA / ATD)

Obrigatório para relação B2B: o ExodoFlow trata dados pessoais **em nome** dos tenants (subcontratante). Artigo 28.º RGPD.

- [ ] Instrução de tratamento: apenas conforme instruções do tenant
- [ ] Medidas de segurança técnicas e organizacionais (MTO)
- [ ] Obrigação de notificação de violações (72h ao tenant; tenant notifica titular)
- [ ] Subcontratantes do ExodoFlow (Supabase, Vercel, Resend, Anthropic) listados
- [ ] Apagamento/devolução de dados no fim do contrato

### 4. Política de Cookies (se analytics forem adicionados)

Atualmente: **sem cookies de terceiros** → banner simples ou dispensa.  
Se Sentry, Google Analytics ou similar for adicionado → requer banner RGPD.

### 5. Aviso Legal (footer / landing)

- [ ] Denominação social completa + NIF da Êxodo Tech
- [ ] Morada registada
- [ ] Capital social (se aplicável)

---

## Riscos identificados antes de lançamento

| Risco | Severidade | Mitigação |
|-------|-----------|-----------|
| Textos legais em branco | **Alta** — ilegal em PT/UE | Advogado antes de aceitar utilizadores |
| Dados de saúde sem base legal explícita | **Alta** | Verificar consentimento explícito no onboarding |
| Transferência para EUA (Anthropic) sem cláusulas adequadas | **Média** | Verificar adequação ou adicionar SCC |
| DPA não assinado com tenants B2B | **Alta** | Criar e incluir no flow de registo |
| CRON de retenção não testado em produção | **Baixa** | Monitorizar primeiro run em staging |

---

## Processo recomendado

1. **Fase staging (agora):** manter aviso "Documento em revisão jurídica". Acesso restrito (equipa interna).
2. **Antes de beta privado:** contratar advogado especializado em RGPD/SaaS para redigir Privacidade + Termos + DPA.
3. **Antes de beta público / aceitar pagamentos:** DPA assinado, cookies verificados, base legal de saúde confirmada.
4. **Anualmente:** revisão dos documentos com o advogado.

---

## Contacto sugerido para advogado

Perfil: especialista em **proteção de dados + contratos SaaS** em Portugal ou Brasil (conforme mercado principal).  
Referências: CNPD (PT), ANPD (BR), certificação CIPP/E ou equivalente.
