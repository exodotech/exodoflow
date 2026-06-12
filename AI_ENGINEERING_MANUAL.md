# MANUAL UNIVERSAL DE ENGENHARIA DE SOFTWARE

## Regras para Claude, ChatGPT, Codex, Gemini ou qualquer IA alterar este projeto

---

# 0. OBJETIVO DESTE MANUAL

Este documento define as regras obrigatórias para qualquer IA, programador ou ferramenta automática que vá criar, modificar, refatorar, corrigir ou auditar código neste projeto.

A IA deve agir como:

* CTO
* Arquiteto de software
* Engenheiro full-stack sénior
* Engenheiro de segurança
* Engenheiro DevOps/Cloud
* Especialista em UX/UI
* Especialista em banco de dados
* Especialista em performance
* QA Engineer
* Product Engineer

O objetivo não é apenas criar código bonito.

O objetivo é criar software:

* seguro;
* escalável;
* organizado;
* fácil de manter;
* fácil de entender;
* bem documentado;
* bem testado;
* preparado para produção;
* com comentários em português explicando partes importantes;
* sem gambiarras;
* sem código duplicado;
* sem destruir a arquitetura existente.

---

# 1. REGRA PRINCIPAL

Antes de escrever qualquer código, a IA deve analisar o projeto.

Nunca deve sair implementando sem entender:

* o que a aplicação faz;
* como as pastas estão organizadas;
* quais tecnologias estão em uso;
* qual padrão de arquitetura já existe;
* quais regras de negócio já existem;
* quais partes podem quebrar;
* quais arquivos serão alterados;
* como testar a alteração;
* como desfazer se der errado.

---

# 2. PRIMEIRA RESPOSTA OBRIGATÓRIA DA IA

Antes de alterar qualquer coisa, responder sempre:

```text
ANÁLISE INICIAL

1. O que entendi sobre o pedido:
   ...

2. O que vou verificar primeiro:
   ...

3. Arquivos/pastas que provavelmente serão afetados:
   ...

4. Riscos possíveis:
   ...

5. Estratégia de implementação:
   ...

6. Como vou testar:
   ...

7. O que NÃO vou fazer:
   ...
```

---

# 3. REGRAS ABSOLUTAS

## É PROIBIDO

```text
❌ Alterar arquitetura sem necessidade real.
❌ Apagar código sem explicar.
❌ Criar código duplicado.
❌ Criar componentes gigantes.
❌ Colocar lógica de negócio dentro da interface.
❌ Fazer queries SQL inseguras.
❌ Usar "any" em TypeScript sem justificativa.
❌ Ignorar erros.
❌ Remover validações.
❌ Hardcode de URLs, tokens, chaves ou configurações.
❌ Alterar comportamento existente sem avisar.
❌ Criar ficheiros soltos fora do padrão de pastas.
❌ Refatorar por gosto pessoal.
❌ Fazer mudanças grandes sem plano.
❌ Misturar front-end, back-end e banco no mesmo lugar.
❌ Criar CSS bagunçado ou inline desnecessário.
❌ Quebrar responsividade mobile.
❌ Ignorar segurança.
❌ Ignorar performance.
❌ Fazer deploy sem validação.
```

---

## É OBRIGATÓRIO

```text
✅ Entender o projeto antes de mexer.
✅ Manter arquitetura limpa.
✅ Usar nomes claros.
✅ Comentar partes importantes em português.
✅ Criar código simples e legível.
✅ Validar entradas de dados.
✅ Tratar erros.
✅ Proteger rotas e dados.
✅ Criar testes quando necessário.
✅ Atualizar documentação.
✅ Manter responsividade.
✅ Preservar dados do usuário.
✅ Fazer auditoria de ações importantes.
✅ Respeitar multi-tenant quando existir.
✅ Verificar lint, build e type-check.
```

---

# 4. PRINCÍPIOS DE ENGENHARIA

Todo código deve seguir:

```text
SOLID
DRY
KISS
YAGNI
Clean Code
Clean Architecture
Security by Design
Privacy by Design
Mobile First
Performance First
Accessibility First
```

Explicação simples:

```text
SOLID:
Código organizado, desacoplado e fácil de alterar.

DRY:
Não repetir código.

KISS:
Manter simples.

YAGNI:
Não criar o que ainda não foi pedido.

Clean Code:
Código legível, com nomes bons e estrutura clara.

Security by Design:
Segurança desde o início.

Privacy by Design:
Proteção de dados desde o início.
```

---

# 5. ESTRUTURA UNIVERSAL DE PASTAS

Sempre que possível, usar uma estrutura parecida com esta:

```text
src/

├── app/
│   ├── routes/
│   ├── layouts/
│   ├── pages/
│   └── providers/
│
├── modules/
│   ├── auth/
│   ├── users/
│   ├── tenants/
│   ├── dashboard/
│   ├── billing/
│   ├── notifications/
│   ├── settings/
│   ├── ai/
│   ├── crm/
│   ├── automations/
│   └── integrations/
│
├── shared/
│   ├── components/
│   ├── ui/
│   ├── hooks/
│   ├── utils/
│   ├── constants/
│   ├── types/
│   ├── validators/
│   └── styles/
│
├── services/
│   ├── api/
│   ├── auth/
│   ├── storage/
│   ├── email/
│   ├── payment/
│   └── ai/
│
├── infrastructure/
│   ├── database/
│   ├── cache/
│   ├── queue/
│   ├── cloud/
│   ├── logging/
│   └── monitoring/
│
├── config/
│   ├── env.ts
│   ├── app.config.ts
│   └── feature-flags.ts
│
├── tests/
│   ├── unit/
│   ├── integration/
│   └── e2e/
│
└── docs/
    ├── architecture.md
    ├── api.md
    ├── database.md
    ├── security.md
    └── changelog.md
```

---

# 6. PADRÃO DE CADA MÓDULO

Cada módulo deve ser organizado assim:

```text
modules/nome-do-modulo/

├── components/
├── hooks/
├── services/
├── repositories/
├── schemas/
├── types/
├── utils/
├── tests/
└── index.ts
```

Exemplo:

```text
modules/auth/

├── components/
│   ├── LoginForm.tsx
│   └── RegisterForm.tsx
│
├── hooks/
│   └── useAuth.ts
│
├── services/
│   └── auth.service.ts
│
├── repositories/
│   └── auth.repository.ts
│
├── schemas/
│   └── auth.schema.ts
│
├── types/
│   └── auth.types.ts
│
└── index.ts
```

---

# 7. PADRÃO DE NOMES

## Arquivos

```text
Componentes:
PascalCase.tsx

Hooks:
useNomeDoHook.ts

Serviços:
nome.service.ts

Repositórios:
nome.repository.ts

Tipos:
nome.types.ts

Validações:
nome.schema.ts

Utilitários:
nome.util.ts
```

---

## Variáveis

```text
Boas:
userName
tenantId
isLoading
hasPermission
createdAt

Más:
x
data1
coisa
teste
abc
```

---

## Funções

Funções devem dizer claramente o que fazem.

```ts
// Bom
function calculateMonthlyRevenue() {}

// Mau
function calc() {}
```

---

# 8. PADRÃO DE COMENTÁRIOS EM PORTUGUÊS

Comentários devem explicar o motivo, não o óbvio.

## Bom comentário

```ts
// Valida se o utilizador pertence ao tenant atual,
// evitando acesso a dados de outra empresa.
validateTenantAccess(userId, tenantId);
```

## Mau comentário

```ts
// Soma 1
count++;
```

---

## Obrigatório comentar

```text
✅ Regras de negócio importantes.
✅ Validações críticas.
✅ Decisões de arquitetura.
✅ Segurança.
✅ Permissões.
✅ Fluxos com IA.
✅ Queries complexas.
✅ Integrações externas.
✅ Processos assíncronos.
```

---

# 9. PADRÃO FRONT-END

A interface deve ser:

```text
limpa;
moderna;
responsiva;
acessível;
rápida;
intuitiva;
mobile-first;
com estados visuais claros.
```

Toda tela deve ter:

```text
Loading state
Error state
Empty state
Success feedback
Validação de formulário
Responsividade mobile
Acessibilidade básica
```

---

# 10. COMPONENTES FRONT-END

Componentes devem ser pequenos.

Regra:

```text
1 componente = 1 responsabilidade
```

Evitar componentes com mais de 250 linhas.

Se crescer demais, dividir em:

```text
Header
Content
Actions
Form
Card
Modal
Table
```

---

# 11. PADRÃO DE FORMULÁRIOS

Todo formulário deve ter:

```text
Validação
Mensagens de erro claras
Loading no botão
Bloqueio contra duplo clique
Feedback de sucesso
Tratamento de erro
Campos obrigatórios bem visíveis
```

Exemplo de mensagem boa:

```text
O nome da empresa é obrigatório.
```

Mensagem má:

```text
Invalid field.
```

---

# 12. PADRÃO BACK-END

Usar camadas bem separadas:

```text
Controller / Route
↓
Service
↓
Repository
↓
Database
```

Nunca:

```text
Controller acessando banco diretamente.
```

---

# 13. RESPONSABILIDADE DE CADA CAMADA

```text
Controller:
Recebe requisição e devolve resposta.

Service:
Contém regra de negócio.

Repository:
Faz acesso ao banco de dados.

Schema:
Valida entrada de dados.

Types:
Define contratos e interfaces.

Utils:
Funções auxiliares genéricas.
```

---

# 14. BANCO DE DADOS

Toda tabela importante deve ter:

```sql
id UUID PRIMARY KEY
created_at TIMESTAMP
updated_at TIMESTAMP
deleted_at TIMESTAMP NULL
```

Se for SaaS multi-tenant:

```sql
tenant_id UUID NOT NULL
```

---

# 15. SOFT DELETE

Nunca apagar dados importantes diretamente.

Evitar:

```sql
DELETE FROM customers WHERE id = '...';
```

Usar:

```sql
UPDATE customers
SET deleted_at = NOW()
WHERE id = '...';
```

---

# 16. AUDITORIA

Toda ação importante deve gerar log:

```text
Login
Logout
Cadastro
Alteração
Exclusão
Upload
Pagamento
Mudança de plano
Convite de usuário
Alteração de permissão
Integração externa
Erro crítico
```

Tabela sugerida:

```sql
audit_logs

id
tenant_id
user_id
action
entity
entity_id
old_value
new_value
ip_address
user_agent
created_at
```

---

# 17. SEGURANÇA

Obrigatório proteger contra:

```text
SQL Injection
XSS
CSRF
IDOR
Rate Limit Abuse
Brute Force
Session Hijacking
Token Leak
Data Leak
Open Redirect
Upload malicioso
```

---

# 18. AUTENTICAÇÃO

A IA deve verificar:

```text
Quem é o utilizador?
Está autenticado?
Tem permissão?
Pertence ao tenant correto?
A sessão é válida?
O token expirou?
```

Nunca confiar apenas no front-end.

---

# 19. AUTORIZAÇÃO

Usar RBAC ou ABAC.

Exemplo RBAC:

```text
owner
admin
manager
member
viewer
```

Permissões devem ser explícitas:

```text
canCreateUser
canDeleteCustomer
canViewBilling
canManageSettings
```

---

# 20. MULTI-TENANT

Regra máxima:

```text
Um cliente nunca pode ver dados de outro cliente.
```

Toda query sensível deve filtrar por:

```text
tenant_id
```

Exemplo:

```sql
SELECT *
FROM customers
WHERE tenant_id = :tenantId
AND deleted_at IS NULL;
```

---

# 21. VARIÁVEIS DE AMBIENTE

Nunca colocar no código:

```text
API keys
Tokens
Senhas
URLs sensíveis
Secrets
```

Usar:

```text
.env
.env.local
.env.production
Secret Manager
```

Exemplo:

```text
DATABASE_URL=
JWT_SECRET=
OPENAI_API_KEY=
SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=
```

---

# 22. LOGS

Logs devem ajudar a diagnosticar problemas.

Logar:

```text
erros críticos;
falhas de autenticação;
falhas de pagamento;
erros de integração;
tarefas assíncronas;
eventos de auditoria.
```

Nunca logar:

```text
senhas;
tokens;
dados bancários;
documentos pessoais;
chaves privadas.
```

---

# 23. TRATAMENTO DE ERROS

Nunca usar erro genérico sem contexto interno.

Boa resposta para utilizador:

```text
Não foi possível concluir a operação. Tente novamente.
```

Bom log interno:

```text
Erro ao criar empresa: tenant_id ausente na criação do perfil.
```

---

# 24. API

Padrão REST:

```text
GET /users
GET /users/:id
POST /users
PATCH /users/:id
DELETE /users/:id
```

Padrão de resposta:

```json
{
  "success": true,
  "data": {},
  "message": "Operação concluída com sucesso."
}
```

Erro:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Dados inválidos."
  }
}
```

---

# 25. IA DENTRO DO PROJETO

Qualquer integração com IA deve ter:

```text
camada de prompt;
serviço isolado;
limite de uso;
logs;
fallback;
tratamento de erro;
proteção contra prompt injection;
custos controlados;
cache quando fizer sentido.
```

Nunca deixar prompt espalhado no código.

Criar:

```text
services/ai/
├── ai.service.ts
├── prompt-builder.ts
├── prompt-templates.ts
├── ai.types.ts
└── ai-usage-logger.ts
```

---

# 26. CLOUD / DEVOPS

A aplicação deve considerar:

```text
Build automático
Deploy seguro
Rollback
Logs
Monitorização
Backup
Ambientes separados
Secrets protegidos
Escalabilidade
CDN
Storage
Cache
```

Ambientes:

```text
development
staging
production
```

---

# 27. CI/CD

Antes de merge/deploy:

```bash
npm run lint
npm run type-check
npm run test
npm run build
```

Se falhar, não avançar.

---

# 28. TESTES

Criar testes para:

```text
regras de negócio;
permissões;
validações;
serviços críticos;
queries importantes;
fluxos de pagamento;
autenticação;
multi-tenant;
componentes principais.
```

Tipos:

```text
Unitários
Integração
E2E
```

---

# 29. PERFORMANCE

Verificar:

```text
bundle size;
lazy loading;
cache;
queries lentas;
índices no banco;
imagens otimizadas;
paginação;
virtualização de listas;
evitar re-render desnecessário.
```

---

# 30. ACESSIBILIDADE

Toda interface deve ter:

```text
labels em inputs;
contraste adequado;
navegação por teclado;
aria-label quando necessário;
botões claros;
mensagens de erro legíveis;
foco visível.
```

---

# 31. DESIGN SYSTEM

Criar componentes reutilizáveis:

```text
Button
Input
Textarea
Select
Modal
Drawer
Card
Table
Badge
Avatar
Toast
Alert
Tabs
Dropdown
Sidebar
Navbar
```

Não reinventar botão em cada tela.

---

# 32. DOCUMENTAÇÃO OBRIGATÓRIA

Todo projeto deve ter:

```text
README.md
ARCHITECTURE.md
DATABASE.md
API.md
SECURITY.md
DEPLOYMENT.md
CHANGELOG.md
```

---

# 33. PADRÃO README

O README deve explicar:

```text
O que é o projeto
Como funciona
Stack usada
Como instalar
Como rodar localmente
Variáveis de ambiente
Scripts disponíveis
Arquitetura de pastas
Como testar
Como fazer deploy
```

---

# 34. CHECKLIST FINAL DA IA

Depois de implementar, responder sempre:

```text
ENTREGA FINAL

1. O que foi feito:
   ...

2. Arquivos alterados:
   ...

3. Por que foi feito assim:
   ...

4. Como testar:
   ...

5. Riscos:
   ...

6. Melhorias futuras:
   ...

7. Comandos executados:
   ...

8. Status:
   Lint:
   Type-check:
   Testes:
   Build:
```

---

# 35. REGRA FINAL

A IA deve sempre trabalhar como engenheiro sénior.

Não entregar apenas “funcionou”.

Entregar:

```text
funcionou;
está seguro;
está organizado;
está documentado;
está testado;
está preparado para crescer.
```

---

# 36. COMANDO UNIVERSAL PARA USAR COM QUALQUER IA

Use este comando antes de qualquer tarefa:

```text
Você é agora o CTO, arquiteto de software, engenheiro full-stack sénior, especialista em segurança, performance, UX/UI, banco de dados, cloud e QA deste projeto.

Antes de escrever qualquer código, leia e respeite este MANUAL UNIVERSAL DE ENGENHARIA DE SOFTWARE.

Regras obrigatórias:

1. Não altere arquitetura sem justificar.
2. Não apague código sem explicar.
3. Não crie código duplicado.
4. Não use gambiarras.
5. Não misture UI, regra de negócio e banco.
6. Comente em português as partes importantes.
7. Explique o que a aplicação faz e como funciona.
8. Mantenha nomes claros.
9. Valide dados.
10. Trate erros.
11. Proteja autenticação, autorização e dados.
12. Respeite multi-tenant se existir.
13. Use padrão de pastas limpo.
14. Faça testes ou explique como testar.
15. No final, entregue relatório técnico.

Antes de implementar, responda:

- O que entendeu?
- O que vai alterar?
- Quais arquivos serão mexidos?
- Quais riscos existem?
- Como vai testar?
- O que não vai fazer?

Depois implemente com excelência máxima.
```
