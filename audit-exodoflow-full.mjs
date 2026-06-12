#!/usr/bin/env node
// audit-exodoflow-full.mjs
// Auditor completo do projecto ExodoFlow AI — Fase 0 até fase actual
// Uso: node audit-exodoflow-full.mjs

import { readFileSync, existsSync, readdirSync, statSync } from 'fs';
import { join, extname } from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname  = dirname(__filename);

// ── Paths principais ──────────────────────────────────────────────────────────
const ROOT       = __dirname;
const APP        = join(ROOT, 'exodoflow');
const SRC        = join(APP, 'src');
const SUPABASE   = join(ROOT, 'supabase');
const MIGRATIONS = join(SUPABASE, 'migrations');

// Directórios ignorados em pesquisas recursivas
const IGNORE = new Set(['node_modules', '.next', 'dist', 'build', '.git', '.vercel', '.turbo', '.temp', '.branches']);

// ── Estado do relatório ───────────────────────────────────────────────────────
let totalOK   = 0;
let totalFail = 0;
const problems = [];

// ── Utilitários ───────────────────────────────────────────────────────────────

function readSafe(path) {
  try { return readFileSync(path, 'utf-8'); }
  catch { return ''; }
}

function exists(path) {
  return existsSync(path);
}

function isDir(path) {
  try { return statSync(path).isDirectory(); }
  catch { return false; }
}

function collectFiles(dir, exts = null) {
  const results = [];
  if (!exists(dir)) return results;
  function walk(d) {
    let entries;
    try { entries = readdirSync(d, { withFileTypes: true }); }
    catch { return; }
    for (const e of entries) {
      if (IGNORE.has(e.name)) continue;
      const full = join(d, e.name);
      if (e.isDirectory()) { walk(full); }
      else if (!exts || exts.includes(extname(e.name).toLowerCase())) {
        results.push(full);
      }
    }
  }
  walk(dir);
  return results;
}

function catFiles(dir, exts = null) {
  return collectFiles(dir, exts).map(f => readSafe(f)).join('\n');
}

function anyFileContains(dir, pattern, exts = null) {
  for (const f of collectFiles(dir, exts)) {
    if (pattern.test(readSafe(f))) return true;
  }
  return false;
}

function getMigrations() {
  return catFiles(MIGRATIONS, ['.sql']);
}

// Extrai o DDL de uma tabela específica (entre CREATE TABLE nome ( ... );)
function extractTableDDL(sql, tableName) {
  const re = new RegExp(
    `CREATE TABLE(?:\\s+IF NOT EXISTS)?\\s+${tableName}\\s*\\([\\s\\S]*?\\);`,
    'im'
  );
  const m = sql.match(re);
  return m ? m[0] : '';
}

// ── Funções de output ─────────────────────────────────────────────────────────

function check(label, passed, fix = '') {
  if (passed) {
    console.log(`  ✅ ${label}`);
    totalOK++;
  } else {
    console.log(`  ❌ ${label}`);
    if (fix) console.log(`     💡 ${fix}`);
    totalFail++;
    problems.push({ label, fix });
  }
}

function section(title) {
  console.log(`\n${'─'.repeat(72)}`);
  console.log(`  ${title}`);
  console.log(`${'─'.repeat(72)}`);
}

// ─────────────────────────────────────────────────────────────────────────────
// INÍCIO DA AUDITORIA
// ─────────────────────────────────────────────────────────────────────────────
console.log('\n' + '═'.repeat(72));
console.log('  AUDITORIA COMPLETA — ExodoFlow AI');
console.log('  ' + new Date().toISOString());
console.log('═'.repeat(72));

// ═══════════════════════════════════════════════════════════════════════════
// FASE 0 — Setup Inicial
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 0 — Setup Inicial');

const appPkgPath = join(APP, 'package.json');
check(
  'package.json em exodoflow/',
  exists(appPkgPath),
  'Criar exodoflow/package.json com todas as dependências obrigatórias.'
);

const appPkg  = exists(appPkgPath) ? JSON.parse(readSafe(appPkgPath)) : {};
const allDeps = { ...(appPkg.dependencies || {}), ...(appPkg.devDependencies || {}) };

check(
  'script lint definido',
  !!(appPkg.scripts?.lint),
  'Adicionar "lint": "eslint ." em exodoflow/package.json → scripts.'
);

check(
  'script build definido',
  !!(appPkg.scripts?.build),
  'Adicionar "build": "next build" em exodoflow/package.json → scripts.'
);

check(
  '.env.example na raiz do projecto',
  exists(join(ROOT, '.env.example')),
  'Criar .env.example com NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY.'
);

const requiredDeps = [
  ['next',                     'npm i next'],
  ['typescript',               'npm i -D typescript'],
  ['tailwindcss',              'npm i -D tailwindcss'],
  ['@supabase/supabase-js',    'Instalar: cd exodoflow && npm i @supabase/supabase-js'],
  ['@supabase/ssr',            'Instalar: cd exodoflow && npm i @supabase/ssr'],
  ['zod',                      'npm i zod'],
  ['react-hook-form',          'npm i react-hook-form'],
  ['@hookform/resolvers',      'npm i @hookform/resolvers'],
  ['@tanstack/react-query',    'npm i @tanstack/react-query'],
  ['date-fns',                 'npm i date-fns'],
  ['class-variance-authority', 'npm i class-variance-authority'],
  ['lucide-react',             'npm i lucide-react'],
  ['clsx',                     'npm i clsx'],
  ['tailwind-merge',           'npm i tailwind-merge'],
];

for (const [dep, fix] of requiredDeps) {
  check(`Dependência: ${dep}`, !!allDeps[dep], fix);
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 1 — Estrutura do Projecto
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 1 — Estrutura do Projecto');

const estrutura = [
  [join(SRC, 'app'),               'src/app',             'Criar exodoflow/src/app/ com layout.tsx e page.tsx.'],
  [join(SRC, 'components'),        'src/components',      'Criar exodoflow/src/components/ com design-system e layout.'],
  [join(SRC, 'lib'),               'src/lib',             'Criar exodoflow/src/lib/ com utilitários partilhados.'],
  [join(SRC, 'services'),          'src/services',        'Criar exodoflow/src/services/ com camada de acesso a dados (Supabase queries).'],
  [join(SRC, 'hooks'),             'src/hooks',           'Criar exodoflow/src/hooks/ com custom React hooks.'],
  [join(SRC, 'types'),             'src/types',           'Criar exodoflow/src/types/ com tipos TypeScript do domínio.'],
  [join(SRC, 'lib', 'supabase'),   'src/lib/supabase',    'Criar exodoflow/src/lib/supabase/client.ts e server.ts com @supabase/ssr.'],
  [join(SRC, 'lib', 'validators'), 'src/lib/validators',  'Criar exodoflow/src/lib/validators/ com schemas Zod (booking, client, service).'],
  [MIGRATIONS,                     'supabase/migrations',  'Criar supabase/migrations/ com ficheiros SQL numerados.'],
];

for (const [path, label, fix] of estrutura) {
  check(`Directório: ${label}`, isDir(path), fix);
}

check(
  'components.json (shadcn/ui) existe',
  exists(join(APP, 'components.json')),
  'Criar components.json em exodoflow/ para configurar shadcn/ui (aliases, tailwind, rsc).'
);

// ═══════════════════════════════════════════════════════════════════════════
// FASE 2 — Stack Obrigatória
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 2 — Stack Obrigatória');

check(
  'Next.js instalado e configurado',
  !!allDeps['next'] && exists(join(APP, 'next.config.ts')),
  'Verificar next.config.ts e package.json em exodoflow/.'
);

check(
  'TypeScript configurado (tsconfig.json)',
  exists(join(APP, 'tsconfig.json')),
  'Criar tsconfig.json em exodoflow/ com path alias @/*.'
);

check(
  'Tailwind CSS configurado (tailwind.config.ts)',
  exists(join(APP, 'tailwind.config.ts')) || exists(join(APP, 'tailwind.config.js')),
  'Criar tailwind.config.ts em exodoflow/.'
);

const srcContent = catFiles(SRC, ['.tsx', '.ts']);
check(
  'Shadcn/UI ou equivalente (CVA + cn utility)',
  srcContent.includes('cva(') && srcContent.includes('cn('),
  'Instalar shadcn/ui: cd exodoflow && npx shadcn@latest init'
);

check(
  'Supabase client.ts configurado',
  exists(join(SRC, 'lib', 'supabase', 'client.ts')) ||
  exists(join(SRC, 'lib', 'supabase', 'index.ts')),
  'Criar src/lib/supabase/client.ts com createBrowserClient do @supabase/ssr.'
);

check(
  'Supabase server.ts configurado',
  exists(join(SRC, 'lib', 'supabase', 'server.ts')),
  'Criar src/lib/supabase/server.ts com createServerClient do @supabase/ssr.'
);

check(
  'Zod schemas em src/lib/validators/',
  isDir(join(SRC, 'lib', 'validators')) &&
  collectFiles(join(SRC, 'lib', 'validators'), ['.ts', '.tsx']).length > 0,
  'Criar src/lib/validators/booking.ts, client.ts e service.ts com schemas Zod.'
);

check(
  'React Hook Form em uso no código',
  anyFileContains(SRC, /useForm|FormProvider|Controller/, ['.tsx', '.ts']),
  'Usar react-hook-form com useForm() + zodResolver() nos formulários.'
);

check(
  'TanStack Query em uso no código',
  anyFileContains(SRC, /useQuery|useMutation|QueryClient/, ['.tsx', '.ts']),
  'Criar QueryClientProvider no layout e usar useQuery/useMutation nos serviços.'
);

check(
  'date-fns em uso ou instalado',
  anyFileContains(SRC, /from ['"]date-fns/, ['.tsx', '.ts']) || !!allDeps['date-fns'],
  'Importar funções de date-fns para formatação de datas.'
);

// ═══════════════════════════════════════════════════════════════════════════
// FASE 3 — Base de Dados Supabase/PostgreSQL
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 3 — Base de Dados Supabase/PostgreSQL');

const sql = getMigrations();

const tabelasObrigatorias = [
  'tenants', 'plans', 'profiles', 'clients', 'services',
  'resources', 'resource_availability', 'resource_blocks',
  'bookings', 'booking_resources',
  'whatsapp_conversations', 'whatsapp_messages',
  'ai_contexts', 'legal_consents', 'audit_logs',
  'daily_metrics', 'feature_flags',
];

for (const tabela of tabelasObrigatorias) {
  check(
    `Tabela: ${tabela}`,
    new RegExp(`CREATE TABLE(?:\\s+IF NOT EXISTS)?\\s+${tabela}\\b`, 'i').test(sql),
    `Criar migration com: CREATE TABLE ${tabela} (...) — verificar 0002_tables.sql.`
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 4 — Segurança
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 4 — Segurança');

check(
  'RLS activado (ENABLE ROW LEVEL SECURITY)',
  /ENABLE ROW LEVEL SECURITY/i.test(sql),
  'Adicionar ALTER TABLE <tabela> ENABLE ROW LEVEL SECURITY em migration.'
);

check(
  'Políticas RLS definidas (CREATE POLICY)',
  /CREATE POLICY/i.test(sql),
  'Criar políticas RLS para cada tabela com tenant_id.'
);

check(
  'tenant_id = auth_tenant_id() nas políticas',
  /tenant_id\s*=\s*auth_tenant_id\(\)/i.test(sql),
  'Garantir que políticas filtram por tenant_id = auth_tenant_id().'
);

check(
  'auth.jwt() usado para extrair tenant_id',
  /auth\.jwt\(\)/i.test(sql),
  'Criar função auth_tenant_id() que lê de auth.jwt() → app_metadata → tenant_id.'
);

// service_role NÃO deve ser exposta ao browser. A exposição real acontece de
// duas formas: (1) prefixo NEXT_PUBLIC_ (vai para o bundle), ou (2) uso dentro
// de um Client Component. Uso server-only (Route Handlers, .ts sem 'use client')
// é legítimo — ex: src/lib/supabase/admin.ts usado em /api/admin/criar-empresa.
check(
  'service_role não exposta no frontend',
  (() => {
    const arquivos = collectFiles(SRC, ['.ts', '.tsx', '.js', '.jsx']);
    const exposta = arquivos.some((file) => {
      const f = readSafe(file);
      // (1) Prefixo público — seria embebido no browser
      if (/NEXT_PUBLIC_SUPABASE_SERVICE_ROLE/i.test(f)) return true;
      // (2) Segredo dentro de um Client Component
      const isClient = /^['"]use client['"]/m.test(f);
      if (isClient && /SUPABASE_SERVICE_ROLE_KEY/.test(f)) return true;
      return false;
    });
    return !exposta;
  })(),
  'A service_role não pode ter prefixo NEXT_PUBLIC_ nem ser usada em Client Components.'
);

// bookings NÃO deve ter resource_id (design correcto: usa booking_resources)
const bookingsDDL = extractTableDDL(sql, 'bookings');
check(
  'bookings.resource_id ausente (correcto: usa booking_resources)',
  bookingsDDL.length > 0 && !/\bresource_id\b/i.test(bookingsDDL),
  'Remover resource_id directo de bookings. Usar tabela booking_resources (muitos-para-muitos).'
);

// ═══════════════════════════════════════════════════════════════════════════
// FASE 5 — Agenda
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 5 — Agenda (Disponibilidade e Marcações)');

check(
  'Função get_available_slots() existe',
  /CREATE.*FUNCTION.*get_available_slots/i.test(sql),
  'Criar função get_available_slots() que calcula slots livres por recurso e serviço.'
);

check(
  'resource_availability: start_time e end_time',
  /start_time\s+TIME/i.test(sql) && /end_time\s+TIME/i.test(sql),
  'Adicionar start_time TIME e end_time TIME em resource_availability.'
);

check(
  'resource_blocks: bloqueios excepcionais',
  /CREATE TABLE.*resource_blocks/i.test(sql),
  'Criar tabela resource_blocks para férias, formações e equipamento avariado.'
);

check(
  'booking_resources: relação muitos-para-muitos',
  /CREATE TABLE.*booking_resources/i.test(sql),
  'Criar tabela booking_resources para ligar bookings a múltiplos recursos.'
);

check(
  'bookings.start_at TIMESTAMPTZ',
  /start_at\s+TIMESTAMPTZ/i.test(sql),
  'Adicionar start_at TIMESTAMPTZ NOT NULL em bookings.'
);

check(
  'bookings.end_at TIMESTAMPTZ',
  /end_at\s+TIMESTAMPTZ/i.test(sql),
  'Adicionar end_at TIMESTAMPTZ NOT NULL em bookings.'
);

check(
  'Timezone no cálculo de slots (TIMEZONE())',
  /TIMEZONE\s*\(/i.test(sql),
  'Usar TIMEZONE() em get_available_slots() para converter hora local em UTC.'
);

// Verificar valores de status de bookings
const statusValues = [
  ['pending',   'PENDING'],
  ['confirmed', 'CONFIRMED'],
  ['cancelled', 'CANCELLED/CANCELED'],
  ['no_show',   'NO_SHOW/NOSHOW'],
  ['completed', 'COMPLETED'],
];
for (const [val, label] of statusValues) {
  check(
    `Status booking: '${label}'`,
    sql.includes(`'${val}'`),
    `Adicionar '${val}' no CHECK constraint do campo status em bookings.`
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 6 — Mobile-first
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 6 — Mobile-first');

check(
  'BottomNav (navegação móvel)',
  anyFileContains(SRC, /BottomNav|bottom[\-_]nav/i, ['.tsx', '.ts']),
  'Criar componente BottomNav visível apenas em mobile (< lg).'
);

check(
  'SidebarDesktop (navegação desktop)',
  anyFileContains(SRC, /SidebarDesktop|sidebar[\-_]desktop/i, ['.tsx', '.ts']),
  'Criar componente SidebarDesktop visível apenas em ≥ lg.'
);

check(
  'MobileCardList (listas em mobile)',
  anyFileContains(SRC, /MobileCardList|mobile[\-_]card/i, ['.tsx', '.ts']),
  'Criar MobileCardList para listas de itens em ecrãs pequenos.'
);

check(
  'DataTableWrapper (tabelas adaptadas)',
  anyFileContains(SRC, /DataTableWrapper|DataTable/i, ['.tsx', '.ts']),
  'Criar DataTableWrapper que oculta tabela em mobile e mostra cards.'
);

check(
  'Inputs touch-friendly (h-11 / min-h-[44px])',
  anyFileContains(SRC, /\bh-11\b|\bh-12\b|min-h-\[44px\]|py-3/, ['.tsx', '.ts', '.css']),
  'Garantir inputs com min-height 44px para toque confortável (h-11 no Tailwind).'
);

// ═══════════════════════════════════════════════════════════════════════════
// FASE 7 — Formulários e Validação
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 7 — Formulários e Validação');

check('zod instalado',           !!allDeps['zod'],                    'cd exodoflow && npm i zod');
check('react-hook-form instalado', !!allDeps['react-hook-form'],       'cd exodoflow && npm i react-hook-form');
check('@hookform/resolvers instalado', !!allDeps['@hookform/resolvers'], 'cd exodoflow && npm i @hookform/resolvers');
check('@tanstack/react-query instalado', !!allDeps['@tanstack/react-query'], 'cd exodoflow && npm i @tanstack/react-query');

check(
  'Schemas Zod em src/lib/validators/',
  isDir(join(SRC, 'lib', 'validators')) &&
  collectFiles(join(SRC, 'lib', 'validators'), ['.ts']).length > 0,
  'Criar src/lib/validators/booking.ts, client.ts e service.ts.'
);

// ═══════════════════════════════════════════════════════════════════════════
// FASE 8 — WhatsApp Simulator
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 8 — WhatsApp Simulator');

check(
  'Tabela whatsapp_conversations existe',
  /CREATE TABLE.*whatsapp_conversations/i.test(sql),
  'Criar tabela whatsapp_conversations no banco.'
);

check(
  'Tabela whatsapp_messages existe',
  /CREATE TABLE.*whatsapp_messages/i.test(sql),
  'Criar tabela whatsapp_messages no banco.'
);

check(
  'payload JSONB (estrutura idêntica ao webhook real)',
  /payload\s+JSONB/i.test(sql),
  'Adicionar payload JSONB em whatsapp_messages para guardar webhook Meta API completo.'
);

check(
  'wa_message_id (ID da mensagem WhatsApp)',
  /wa_message_id/i.test(sql),
  'Adicionar wa_message_id TEXT em whatsapp_messages.'
);

check(
  'processed_status em whatsapp_messages',
  /processed_status/i.test(sql),
  'Adicionar processed_status TEXT DEFAULT \'pending\' em whatsapp_messages (valores: pending, processed, failed).'
);

check(
  'Directório components/features/whatsapp-simulator',
  isDir(join(SRC, 'components', 'features', 'whatsapp-simulator')),
  'Criar src/components/features/whatsapp-simulator/ com estrutura de simulador.'
);

// ═══════════════════════════════════════════════════════════════════════════
// FASE 9 — RGPD / LGPD
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 9 — RGPD / LGPD');

check(
  'Tabela legal_consents existe',
  /CREATE TABLE.*legal_consents/i.test(sql),
  'Criar tabela legal_consents imutável para registo de consentimentos.'
);

check(
  "Tipo 'privacy_policy' em legal_consents",
  /privacy_policy/i.test(sql),
  "Adicionar 'privacy_policy' no CHECK constraint de consent_type em legal_consents."
);

check(
  'Campo marketing_consent em clients',
  /marketing_consent/i.test(sql),
  'Adicionar marketing_consent BOOLEAN NOT NULL DEFAULT FALSE em clients.'
);

check(
  'Função anonymize_client() existe',
  /CREATE.*FUNCTION.*anonymize_client/i.test(sql),
  'Criar função anonymize_client() SECURITY DEFINER para direito ao apagamento RGPD/LGPD.'
);

check(
  'Campo nif em clients (dado sensível RGPD)',
  /\bnif\b.*TEXT|TEXT.*\bnif\b/i.test(sql),
  'Adicionar nif TEXT em clients (NIF Portugal / CPF Brasil).'
);

check(
  'deleted_at em tabelas principais (soft delete)',
  (sql.match(/\bdeleted_at\b/g) || []).length >= 3,
  'Adicionar deleted_at TIMESTAMPTZ em clients, tenants, services, resources.'
);

check(
  'is_anonymized em clients',
  /is_anonymized/i.test(sql),
  'Adicionar is_anonymized BOOLEAN NOT NULL DEFAULT FALSE em clients.'
);

check(
  'gdpr_consent_at em clients',
  /gdpr_consent_at/i.test(sql),
  'Adicionar gdpr_consent_at TIMESTAMPTZ em clients para data de consentimento RGPD.'
);

// ═══════════════════════════════════════════════════════════════════════════
// FASE 10 — SaaS Comercial (Planos)
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 10 — SaaS Comercial (Planos)');

check(
  'Tabela plans existe',
  /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+plans\b/i.test(sql),
  'Criar tabela plans com campos de preço e limites.'
);

check(
  'Tabela feature_flags existe',
  /CREATE TABLE.*feature_flags/i.test(sql),
  'Criar tabela feature_flags por tenant para activar funcionalidades sem deploy.'
);

check(
  'plan_id em tenants (FK para plans)',
  /plan_id.*REFERENCES.*plans/i.test(sql),
  'Adicionar plan_id UUID REFERENCES plans(id) em tenants.'
);

check(
  'trial_ends_at em tenants',
  /trial_ends_at/i.test(sql),
  'Adicionar trial_ends_at TIMESTAMPTZ em tenants para período de teste gratuito.'
);

check(
  'max_resources em plans',
  /max_resources/i.test(sql),
  'Adicionar max_resources INTEGER em plans.'
);

check(
  'max_users em plans',
  /max_users/i.test(sql),
  'Adicionar max_users INTEGER em plans para limitar utilizadores por tenant.'
);

check(
  'max_messages em plans (limite WhatsApp)',
  /max_messages/i.test(sql),
  'Adicionar max_messages INTEGER em plans para limitar mensagens WhatsApp por mês.'
);

// ═══════════════════════════════════════════════════════════════════════════
// FASE 11 — Observabilidade
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 11 — Observabilidade');

check(
  'Tabela audit_logs existe',
  /CREATE TABLE.*audit_logs/i.test(sql),
  'Criar tabela audit_logs imutável para auditoria de acções.'
);

check(
  'Componente LoadingState existe',
  anyFileContains(SRC, /LoadingState|loading.state/i, ['.tsx', '.ts']),
  'Criar componente LoadingState para indicar carregamento de dados.'
);

check(
  'Componente ErrorState existe',
  anyFileContains(SRC, /ErrorState|error.state/i, ['.tsx', '.ts']),
  'Criar componente ErrorState para mostrar erros ao utilizador.'
);

check(
  'EmptyState para listas vazias',
  anyFileContains(SRC, /EmptyState|empty.state/i, ['.tsx', '.ts']),
  'Criar componente EmptyState para listas sem resultados.'
);

check(
  'Tratamento de erros no código frontend',
  anyFileContains(SRC, /\bcatch\s*[\({]|onError\b|isError\b/, ['.tsx', '.ts']),
  'Adicionar try/catch e handlers de erro nos serviços e hooks.'
);

check(
  'Comentários em português no código',
  anyFileContains(SRC,
    /\/\/\s*(?:Cria|Retorna|Verifica|Busca|Actualiza|Filtra|Obtém|Define|Calcula|Exibe|Mostra|Guarda|Componente|Hook|Tipo|Interface|Serviço|Importa)/i,
    ['.tsx', '.ts']
  ),
  'Adicionar comentários em português explicando a lógica (convenção do projecto).'
);

// ═══════════════════════════════════════════════════════════════════════════
// FASE 12 — Internacionalização PT/BR + Communication Engine
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 12 — Internacionalização PT/BR + Communication Engine');

// i18n helpers
check(
  'src/lib/i18n/locale.ts existe',
  exists(join(SRC, 'lib', 'i18n', 'locale.ts')),
  'Criar src/lib/i18n/locale.ts com SupportedLocale, countryToLocale, isBrazil.'
);

check(
  'src/lib/i18n/currency.ts existe',
  exists(join(SRC, 'lib', 'i18n', 'currency.ts')),
  'Criar src/lib/i18n/currency.ts com formatCurrency e getCurrencyCode.'
);

check(
  'src/lib/i18n/date.ts existe',
  exists(join(SRC, 'lib', 'i18n', 'date.ts')),
  'Criar src/lib/i18n/date.ts com formatDate, formatDateTime, formatDateInTimezone.'
);

check(
  'src/lib/i18n/labels.ts existe',
  exists(join(SRC, 'lib', 'i18n', 'labels.ts')),
  'Criar src/lib/i18n/labels.ts com getLabels() diferenciando PT/BR (marcação/agendamento, etc.).'
);

check(
  'src/lib/i18n/tax-id.ts existe',
  exists(join(SRC, 'lib', 'i18n', 'tax-id.ts')),
  'Criar src/lib/i18n/tax-id.ts com getTaxIdLabel, formatTaxId, normalizeTaxId, validateTaxIdBasic.'
);

check(
  'getTaxIdLabel() diferencia NIF/CPF por locale',
  (() => {
    const f = readSafe(join(SRC, 'lib', 'i18n', 'tax-id.ts'));
    return f.includes('NIF') && f.includes('CPF') && f.includes('pt-BR');
  })(),
  'getTaxIdLabel() deve retornar "NIF" para pt-PT e "CPF" para pt-BR.'
);

check(
  'getLabels() diferencia marcação/agendamento',
  (() => {
    const f = readSafe(join(SRC, 'lib', 'i18n', 'labels.ts'));
    return f.includes('marcação') && f.includes('agendamento') && f.includes('pt-BR');
  })(),
  'getLabels() deve retornar terminologia correcta para PT e BR.'
);

// Identificação fiscal genérica na tabela clients
check(
  'Migration 0007: campo tax_id em clients',
  /ADD COLUMN IF NOT EXISTS\s+tax_id/i.test(sql),
  'Adicionar tax_id TEXT em clients via migration 0007.'
);

check(
  'Migration 0007: campo tax_id_type em clients',
  /ADD COLUMN IF NOT EXISTS\s+tax_id_type/i.test(sql),
  'Adicionar tax_id_type TEXT CHECK(nif|cpf|cnpj|other) em clients via migration 0007.'
);

// Communication engine — tabelas
check(
  'Tabela communication_channels existe',
  /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+communication_channels\b/i.test(sql),
  'Criar tabela communication_channels via migration 0007.'
);

check(
  'Tabela communication_templates existe',
  /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+communication_templates\b/i.test(sql),
  'Criar tabela communication_templates via migration 0007.'
);

check(
  'Tabela communication_logs existe',
  /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+communication_logs\b/i.test(sql),
  'Criar tabela communication_logs via migration 0007.'
);

check(
  'communication_logs.status inclui simulated',
  /simulated/.test(sql),
  "Adicionar 'simulated' no CHECK constraint de communication_logs.status."
);

check(
  'communication_templates: event_type com booking_created',
  /booking_created/i.test(sql),
  "Adicionar 'booking_created' no CHECK de communication_templates.event_type."
);

check(
  'RLS em communication_channels',
  /ENABLE ROW LEVEL SECURITY[\s\S]*?communication_channels|communication_channels[\s\S]*?ENABLE ROW LEVEL SECURITY/i.test(sql),
  'Activar RLS em communication_channels.'
);

check(
  'RLS em communication_logs',
  /ENABLE ROW LEVEL SECURITY[\s\S]*?communication_logs|communication_logs[\s\S]*?ENABLE ROW LEVEL SECURITY/i.test(sql),
  'Activar RLS em communication_logs.'
);

// Communication service + tipos
check(
  'src/services/communication.ts existe',
  exists(join(SRC, 'services', 'communication.ts')),
  'Criar src/services/communication.ts com listarCanais, listarTemplates, criarLog, simularEnvio.'
);

check(
  'simularEnvioComunicacao() implementada',
  (() => {
    const f = readSafe(join(SRC, 'services', 'communication.ts'));
    return f.includes('simularEnvioComunicacao');
  })(),
  'Implementar simularEnvioComunicacao() em src/services/communication.ts.'
);

check(
  'prepararMensagemTemplate() implementada',
  (() => {
    const f = readSafe(join(SRC, 'services', 'communication.ts'));
    return f.includes('prepararMensagemTemplate');
  })(),
  'Implementar prepararMensagemTemplate() com interpolação de {{placeholders}}.'
);

check(
  'src/types/domain/communication.ts existe',
  exists(join(SRC, 'types', 'domain', 'communication.ts')),
  'Criar src/types/domain/communication.ts com todos os tipos do motor de comunicação.'
);

check(
  'CommunicationLog tipado com status simulated',
  (() => {
    const f = readSafe(join(SRC, 'types', 'domain', 'communication.ts'));
    return f.includes('simulated') && f.includes('CommunicationLog');
  })(),
  'Garantir que CommunicationLog inclui status simulated.'
);

// Integração booking → comunicação (no hook, não no serviço)
check(
  'useCriarBooking integra simularEnvioComunicacao',
  (() => {
    const f = readSafe(join(SRC, 'hooks', 'useBookings.ts'));
    return f.includes('simularEnvioComunicacao');
  })(),
  'useCriarBooking.onSuccess deve chamar simularEnvioComunicacao (não dentro de criarBooking).'
);

check(
  'Integração comunicação está no hook (NÃO dentro do serviço criarBooking)',
  (() => {
    const bookingService = readSafe(join(SRC, 'services', 'bookings.ts'));
    return !bookingService.includes('simularEnvioComunicacao');
  })(),
  'IMPORTANTE: simularEnvioComunicacao NÃO deve estar em services/bookings.ts (vai no hook).'
);

// ═══════════════════════════════════════════════════════════════════════════
// FASE 13 — Roles e Permissões
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 13 — Roles e Permissões');

// Migration 0008
check(
  'Migration 0008 existe',
  exists(join(MIGRATIONS, '0008_roles_permissions.sql')),
  'Criar supabase/migrations/0008_roles_permissions.sql.'
);

check(
  'Roles owner/manager/receptionist/staff na migration',
  (() => {
    const f = readSafe(join(MIGRATIONS, '0008_roles_permissions.sql'));
    return f.includes('manager') && f.includes('receptionist') && f.includes('staff') && f.includes('owner');
  })(),
  'Adicionar todos os roles (owner, manager, receptionist, staff) na migration 0008.'
);

check(
  'Migration 0008: data migration admin → manager',
  (() => {
    const f = readSafe(join(MIGRATIONS, '0008_roles_permissions.sql'));
    return /UPDATE profiles SET role = .manager. WHERE role = .admin./i.test(f);
  })(),
  'Adicionar UPDATE profiles SET role = manager WHERE role = admin na migration 0008.'
);

check(
  'Migration 0008: profile_id em resources',
  (() => {
    const f = readSafe(join(MIGRATIONS, '0008_roles_permissions.sql'));
    return f.includes('profile_id') && f.includes('resources');
  })(),
  'Adicionar profile_id UUID REFERENCES profiles(id) em resources.'
);

check(
  'Migration 0008: STAFF só vê bookings dos seus recursos',
  (() => {
    const f = readSafe(join(MIGRATIONS, '0008_roles_permissions.sql'));
    return f.includes('bookings_select_staff_own_resource') || f.includes('booking_select_staff');
  })(),
  'Criar policy bookings_select_staff_own_resource com filtro por resources.profile_id.'
);

check(
  'Migration 0008: STAFF não pode criar bookings',
  (() => {
    const f = readSafe(join(MIGRATIONS, '0008_roles_permissions.sql'));
    return f.includes('bookings_insert_non_staff') || /bookings.*insert.*receptionist/i.test(f);
  })(),
  'Criar policy que restringe INSERT em bookings a owner/manager/receptionist.'
);

check(
  'Migration 0008: STAFF não pode apagar clientes',
  (() => {
    const f = readSafe(join(MIGRATIONS, '0008_roles_permissions.sql'));
    return /clients_delete.*manager.*owner|clients.*delete.*manager/i.test(f);
  })(),
  'Criar policy clients_delete que restringe a owner/manager.'
);

check(
  'Migration 0008: conversas restritas a owner/manager/receptionist',
  (() => {
    const f = readSafe(join(MIGRATIONS, '0008_roles_permissions.sql'));
    return /wa_conversations.*roles|wa_messages.*roles/i.test(f);
  })(),
  'Criar policies wa_conversations e wa_messages com restrição por role.'
);

// TypeScript types
check(
  'src/types/domain/permission.ts existe',
  exists(join(SRC, 'types', 'domain', 'permission.ts')),
  'Criar src/types/domain/permission.ts com AppRole, Permission e ROLE_PERMISSIONS.'
);

check(
  'AppRole inclui manager e receptionist',
  (() => {
    const f = readSafe(join(SRC, 'types', 'domain', 'permission.ts'));
    return f.includes('manager') && f.includes('receptionist') && f.includes('AppRole');
  })(),
  'Definir AppRole com owner, manager, receptionist, staff.'
);

check(
  'ROLE_PERMISSIONS definido',
  (() => {
    const f = readSafe(join(SRC, 'types', 'domain', 'permission.ts'));
    return f.includes('ROLE_PERMISSIONS');
  })(),
  'Definir ROLE_PERMISSIONS: Record<AppRole, ReadonlyArray<Permission>>.'
);

check(
  'Permission type inclui permissões granulares de agenda/clients/services',
  (() => {
    const f = readSafe(join(SRC, 'types', 'domain', 'permission.ts'));
    return f.includes('agenda.view') && f.includes('clients.create') && f.includes('services.manage');
  })(),
  'Definir Permission com permissões granulares para agenda, clients, services, etc.'
);

// Permission helper
check(
  'src/lib/permissions/index.ts existe',
  exists(join(SRC, 'lib', 'permissions', 'index.ts')),
  'Criar src/lib/permissions/index.ts com canAccess() e helpers.'
);

check(
  'canAccess() implementado',
  (() => {
    const f = readSafe(join(SRC, 'lib', 'permissions', 'index.ts'));
    return f.includes('canAccess');
  })(),
  'Implementar canAccess(role, permission) em src/lib/permissions/index.ts.'
);

check(
  'isManagerOrAbove() implementado',
  (() => {
    const f = readSafe(join(SRC, 'lib', 'permissions', 'index.ts'));
    return f.includes('isManagerOrAbove');
  })(),
  'Implementar isManagerOrAbove() helper em src/lib/permissions/index.ts.'
);

// Hook
check(
  'src/hooks/usePermissions.ts existe',
  exists(join(SRC, 'hooks', 'usePermissions.ts')),
  'Criar src/hooks/usePermissions.ts.'
);

check(
  'usePermissions() expõe can(), role e helpers de role',
  (() => {
    const f = readSafe(join(SRC, 'hooks', 'usePermissions.ts'));
    return f.includes('usePermissions') && f.includes('can:') && f.includes('isOwner') && f.includes('isStaff');
  })(),
  'usePermissions() deve expor can(), role, isOwner, isManager, isReceptionist, isStaff.'
);

// Componentes
check(
  'PermissionGate existe',
  exists(join(SRC, 'components', 'design-system', 'PermissionGate', 'PermissionGate.tsx')),
  'Criar PermissionGate component.'
);

check(
  'AccessDenied existe',
  exists(join(SRC, 'components', 'design-system', 'AccessDenied', 'AccessDenied.tsx')),
  'Criar AccessDenied component.'
);

// Protecção na UI
check(
  'Páginas de serviços protegida com usePermissions',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dashboard', 'servicos', 'page.tsx'));
    return f.includes('usePermissions') && f.includes('AccessDenied');
  })(),
  'Adicionar guarda de permissão na página de serviços.'
);

check(
  'Página de recursos protegida com usePermissions',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dashboard', 'recursos', 'page.tsx'));
    return f.includes('usePermissions') && f.includes('AccessDenied');
  })(),
  'Adicionar guarda de permissão na página de recursos.'
);

check(
  'Página de configurações protegida com usePermissions',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dashboard', 'configuracoes', 'page.tsx'));
    return f.includes('usePermissions') && f.includes('AccessDenied');
  })(),
  'Adicionar guarda de permissão na página de configurações.'
);

check(
  'Botão Novo Cliente oculto para STAFF via can()',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dashboard', 'clientes', 'page.tsx'));
    return f.includes("can('clients.create')");
  })(),
  "Ocultar botão Novo Cliente via can('clients.create')."
);

check(
  'Botão Novo Serviço oculto via can(services.manage)',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dashboard', 'servicos', 'page.tsx'));
    return f.includes("can('services.manage')");
  })(),
  "Ocultar botão Novo Serviço via can('services.manage')."
);

check(
  'Nav filtrada por permissão no SidebarDesktop',
  (() => {
    const f = readSafe(join(SRC, 'components', 'layout', 'SidebarDesktop', 'SidebarDesktop.tsx'));
    return f.includes('permission') && f.includes('usePermissions');
  })(),
  'Filtrar itens de navegação por permission no SidebarDesktop.'
);

check(
  'Nav filtrada por permissão no BottomNav',
  (() => {
    const f = readSafe(join(SRC, 'components', 'layout', 'BottomNav', 'BottomNav.tsx'));
    return f.includes('permission') && f.includes('usePermissions');
  })(),
  'Filtrar itens de navegação por permission no BottomNav.'
);

check(
  'Billing restrito a isManagerOrAbove na página de configurações',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dashboard', 'configuracoes', 'page.tsx'));
    return f.includes('isManagerOrAbove') || f.includes('isOwner');
  })(),
  'Restringir secção de plano/billing a owner/manager na página de configurações.'
);

check(
  'profile.ts usa AppRole (não role string literal)',
  (() => {
    const f = readSafe(join(SRC, 'types', 'domain', 'profile.ts'));
    return f.includes('AppRole') && !f.includes("'admin'");
  })(),
  "Actualizar ProfileRole para AppRole — remover 'admin' e 'viewer'."
);

check(
  'NavItem tem campo permission opcional',
  (() => {
    const f = readSafe(join(SRC, 'types', 'ui', 'nav.ts'));
    return f.includes('permission') && f.includes('Permission');
  })(),
  'Adicionar permission?: Permission em NavItem.'
);

// ═══════════════════════════════════════════════════════════════════════════
// FASE 14 — Onboarding Multi-Tenant PT/BR
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 14 — Onboarding Multi-Tenant PT/BR');

// Migration 0009
check(
  'Migration 0009 existe',
  exists(join(MIGRATIONS, '0009_onboarding.sql')),
  'Criar supabase/migrations/0009_onboarding.sql.'
);

check(
  'Migration 0009: coluna onboarding_completed em tenants',
  /ADD COLUMN IF NOT EXISTS\s+onboarding_completed/i.test(sql),
  'Adicionar onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE a tenants.'
);

check(
  'Migration 0009: coluna onboarding_step em tenants',
  /ADD COLUMN IF NOT EXISTS\s+onboarding_step/i.test(sql),
  'Adicionar onboarding_step SMALLINT a tenants.'
);

check(
  'Migration 0009: coluna country em tenants',
  /ADD COLUMN IF NOT EXISTS\s+country/i.test(sql),
  "Adicionar country TEXT CHECK (country IN ('PT', 'BR')) a tenants."
);

check(
  'Migration 0009: tabela team_invites existe',
  /CREATE TABLE(?:\s+IF NOT EXISTS)?\s+team_invites\b/i.test(sql),
  'Criar tabela team_invites via migration 0009.'
);

check(
  'team_invites: CHECK role in manager/receptionist/staff',
  /team_invites[\s\S]*?role[\s\S]*?manager[\s\S]*?receptionist[\s\S]*?staff|STAFF[\s\S]*?team_invites/i.test(sql),
  "team_invites.role deve ter CHECK (role IN ('manager','receptionist','staff'))."
);

check(
  'team_invites: RLS activado',
  /ENABLE ROW LEVEL SECURITY[\s\S]*?team_invites|team_invites[\s\S]*?ENABLE ROW LEVEL SECURITY/i.test(sql),
  'Activar RLS em team_invites.'
);

check(
  'team_invites: seed de dev marca onboarding_completed = TRUE',
  /UPDATE tenants[\s\S]*?onboarding_completed\s*=\s*TRUE/i.test(sql),
  'Marcar onboarding_completed = TRUE no tenant de seed (0009).'
);

// database.ts
check(
  'database.ts tem team_invites Row',
  (() => {
    const f = readSafe(join(SRC, 'types', 'database.ts'));
    return f.includes('team_invites') && f.includes('invited_by');
  })(),
  'Actualizar src/types/database.ts com tabela team_invites.'
);

check(
  'database.ts tem onboarding_completed em tenants Row',
  (() => {
    const f = readSafe(join(SRC, 'types', 'database.ts'));
    return f.includes('onboarding_completed') && f.includes('onboarding_step') && f.includes('country');
  })(),
  'Actualizar tenants Row em database.ts com onboarding_completed, onboarding_step, country.'
);

// Domain types
check(
  'TenantNiche inclui todos os 6 nichos + outro',
  (() => {
    const f = readSafe(join(SRC, 'types', 'domain', 'tenant.ts'));
    return (
      f.includes('estetica') &&
      f.includes('veterinaria') &&
      f.includes('barbearia') &&
      f.includes('dentista') &&
      f.includes('oficina') &&
      f.includes('fisioterapia')
    );
  })(),
  "Actualizar TenantNiche para incluir: 'estetica'|'veterinaria'|'barbearia'|'dentista'|'oficina'|'fisioterapia'|'outro'."
);

check(
  'TenantCountry definido (PT | BR)',
  (() => {
    const f = readSafe(join(SRC, 'types', 'domain', 'tenant.ts'));
    return f.includes('TenantCountry') && f.includes("'PT'") && f.includes("'BR'");
  })(),
  "Definir TenantCountry = 'PT' | 'BR' em domain/tenant.ts."
);

check(
  'src/types/domain/onboarding.ts existe',
  exists(join(SRC, 'types', 'domain', 'onboarding.ts')),
  'Criar src/types/domain/onboarding.ts com OnboardingState, OnboardingStep, etc.'
);

check(
  'OnboardingState tem todos os campos de passo',
  (() => {
    const f = readSafe(join(SRC, 'types', 'domain', 'onboarding.ts'));
    return (
      f.includes('OnboardingState') &&
      f.includes('empresa') &&
      f.includes('servico') &&
      f.includes('recurso') &&
      f.includes('disponibilidade') &&
      f.includes('equipa')
    );
  })(),
  'OnboardingState deve ter: empresa, niche, servico, recurso, disponibilidade, equipa.'
);

// Validators
check(
  'src/lib/validators/onboarding.ts existe',
  exists(join(SRC, 'lib', 'validators', 'onboarding.ts')),
  'Criar src/lib/validators/onboarding.ts com schemas Zod para todos os passos.'
);

check(
  'step1EmpresaSchema valida country enum',
  (() => {
    const f = readSafe(join(SRC, 'lib', 'validators', 'onboarding.ts'));
    return f.includes('step1EmpresaSchema') && f.includes("'PT'") && f.includes("'BR'");
  })(),
  "step1EmpresaSchema deve validar country: z.enum(['PT', 'BR'])."
);

check(
  'step2NichoSchema valida todos os 6 nichos',
  (() => {
    const f = readSafe(join(SRC, 'lib', 'validators', 'onboarding.ts'));
    return (
      f.includes('step2NichoSchema') &&
      f.includes('estetica') &&
      f.includes('veterinaria') &&
      f.includes('barbearia')
    );
  })(),
  'step2NichoSchema deve incluir todos os 6 nichos.'
);

check(
  'conviteSchema valida staff com resource_id obrigatório',
  (() => {
    const f = readSafe(join(SRC, 'lib', 'validators', 'onboarding.ts'));
    return f.includes('conviteSchema') && f.includes('staff') && f.includes('resource_id');
  })(),
  'conviteSchema deve obrigar resource_id quando role = STAFF.'
);

// Services
check(
  'src/services/onboarding.ts existe',
  exists(join(SRC, 'services', 'onboarding.ts')),
  'Criar src/services/onboarding.ts com funções para cada passo.'
);

check(
  'Criação de empresa (superadmin) deriva locale + timezone + currency do país',
  (() => {
    // FASE 9.9: a derivação país→settings passou de salvarEmpresa (onboarding)
    // para o handler de criação. O owner já não escolhe país no onboarding.
    const route = readSafe(join(SRC, 'app', 'api', 'admin', 'criar-empresa', 'route.ts'));
    return (
      route.includes('country') &&
      route.includes('locale') &&
      route.includes('timezone') &&
      route.includes('currency')
    );
  })(),
  'O handler /api/admin/criar-empresa deve derivar locale/timezone/currency do país.'
);

check(
  'criarPrimeiroRecurso() aceita link_to_profile',
  (() => {
    const f = readSafe(join(SRC, 'services', 'onboarding.ts'));
    return f.includes('criarPrimeiroRecurso') && f.includes('link_to_profile') && f.includes('profile_id');
  })(),
  'criarPrimeiroRecurso() deve vincular resources.profile_id quando link_to_profile = true.'
);

check(
  'finalizarOnboarding() marca onboarding_completed = true',
  (() => {
    const f = readSafe(join(SRC, 'services', 'onboarding.ts'));
    return f.includes('finalizarOnboarding') && f.includes('onboarding_completed');
  })(),
  'finalizarOnboarding() deve fazer UPDATE tenants SET onboarding_completed = true.'
);

// Hooks
check(
  'src/hooks/useOnboarding.ts existe',
  exists(join(SRC, 'hooks', 'useOnboarding.ts')),
  'Criar src/hooks/useOnboarding.ts com hooks TanStack Query para cada passo.'
);

check(
  'useOnboarding expõe useFinalizarOnboarding',
  (() => {
    const f = readSafe(join(SRC, 'hooks', 'useOnboarding.ts'));
    return f.includes('useFinalizarOnboarding') && f.includes('useSalvarEmpresa');
  })(),
  'useOnboarding.ts deve exportar hooks para todos os passos + finalizar.'
);

// Niche templates
check(
  'NICHE_TEMPLATES tem 6 nichos com emoji',
  (() => {
    const f = readSafe(join(SRC, 'lib', 'niche-templates', 'index.ts'));
    return (
      f.includes('estetica') &&
      f.includes('veterinaria') &&
      f.includes('barbearia') &&
      f.includes('dentista') &&
      f.includes('oficina') &&
      f.includes('fisioterapia') &&
      f.includes('emoji')
    );
  })(),
  'NICHE_TEMPLATES deve ter 6 nichos com campo emoji.'
);

check(
  'NICHE_TEMPLATE_MAP exportado para acesso rápido',
  (() => {
    const f = readSafe(join(SRC, 'lib', 'niche-templates', 'index.ts'));
    return f.includes('NICHE_TEMPLATE_MAP');
  })(),
  'Exportar NICHE_TEMPLATE_MAP: Record<TenantNiche, NicheTemplate | undefined>.'
);

// Rotas de onboarding
check(
  'app/onboarding/layout.tsx existe',
  exists(join(SRC, 'app', 'onboarding', 'layout.tsx')),
  'Criar src/app/onboarding/layout.tsx com protecção de auth + redirect.'
);

check(
  'Onboarding layout redireciona STAFF para dashboard',
  (() => {
    const f = readSafe(join(SRC, 'app', 'onboarding', 'layout.tsx'));
    return f.includes("'staff'") && f.includes('redirect');
  })(),
  "Onboarding layout deve redirecionar utilizadores com role 'staff' para /dashboard."
);

check(
  'Onboarding layout redireciona se onboarding_completed = true',
  (() => {
    const f = readSafe(join(SRC, 'app', 'onboarding', 'layout.tsx'));
    return f.includes('onboarding_completed') && f.includes('/dashboard');
  })(),
  'Onboarding layout deve redirecionar para /dashboard se onboarding já concluído.'
);

check(
  'app/onboarding/page.tsx existe',
  exists(join(SRC, 'app', 'onboarding', 'page.tsx')),
  'Criar src/app/onboarding/page.tsx com stepper de 7 passos.'
);

check(
  'OnboardingPage tem os 7 passos',
  (() => {
    const f = readSafe(join(SRC, 'app', 'onboarding', 'page.tsx'));
    return (
      f.includes('Step1Empresa') &&
      f.includes('Step2Nicho') &&
      f.includes('Step3Servico') &&
      f.includes('Step4Recurso') &&
      f.includes('Step5Disponibilidade') &&
      f.includes('Step6Equipa') &&
      f.includes('Step7Resumo')
    );
  })(),
  'OnboardingPage deve incluir todos os 7 step components.'
);

check(
  'OnboardingStepper component existe',
  exists(join(SRC, 'components', 'features', 'onboarding', 'OnboardingStepper.tsx')),
  'Criar src/components/features/onboarding/OnboardingStepper.tsx.'
);

check(
  'Step1Empresa component existe',
  exists(join(SRC, 'components', 'features', 'onboarding', 'steps', 'Step1Empresa.tsx')),
  'Criar Step1Empresa.tsx.'
);

check(
  'Step2Nicho component existe',
  exists(join(SRC, 'components', 'features', 'onboarding', 'steps', 'Step2Nicho.tsx')),
  'Criar Step2Nicho.tsx.'
);

check(
  'Step3Servico component existe',
  exists(join(SRC, 'components', 'features', 'onboarding', 'steps', 'Step3Servico.tsx')),
  'Criar Step3Servico.tsx.'
);

check(
  'Step4Recurso component existe',
  exists(join(SRC, 'components', 'features', 'onboarding', 'steps', 'Step4Recurso.tsx')),
  'Criar Step4Recurso.tsx.'
);

check(
  'Step5Disponibilidade component existe',
  exists(join(SRC, 'components', 'features', 'onboarding', 'steps', 'Step5Disponibilidade.tsx')),
  'Criar Step5Disponibilidade.tsx.'
);

check(
  'Step6Equipa component existe',
  exists(join(SRC, 'components', 'features', 'onboarding', 'steps', 'Step6Equipa.tsx')),
  'Criar Step6Equipa.tsx.'
);

check(
  'Step7Resumo component existe',
  exists(join(SRC, 'components', 'features', 'onboarding', 'steps', 'Step7Resumo.tsx')),
  'Criar Step7Resumo.tsx.'
);

// Dashboard layout — protecção bidirecional
check(
  'Dashboard layout redireciona para /onboarding se não completado',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dashboard', 'layout.tsx'));
    return f.includes('onboarding_completed') && f.includes('/onboarding');
  })(),
  'dashboard/layout.tsx deve redirecionar para /onboarding se onboarding_completed = false.'
);

check(
  'Dashboard layout não redireciona STAFF para onboarding',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dashboard', 'layout.tsx'));
    return f.includes('isStaff') && f.includes("'staff'");
  })(),
  "dashboard/layout.tsx deve verificar role 'staff' e não redirecionar STAFF para onboarding."
);

// ═══════════════════════════════════════════════════════════════════════════
// FASE 15 — Branding por Tenant
// ═══════════════════════════════════════════════════════════════════════════

section('FASE 15 — Branding por Tenant');

// Migration 0010 — bucket de logos
check(
  'Migration 0010 existe (storage tenant-logos)',
  exists(join(ROOT, 'supabase', 'migrations', '0010_storage_tenant_logos.sql')),
  'Criar supabase/migrations/0010_storage_tenant_logos.sql com bucket tenant-logos e RLS.'
);

check(
  'Migration 0010 cria bucket tenant-logos',
  (() => {
    const f = readSafe(join(ROOT, 'supabase', 'migrations', '0010_storage_tenant_logos.sql'));
    return f.includes("'tenant-logos'") && f.includes('storage.buckets');
  })(),
  'Migration 0010 deve criar o bucket tenant-logos em storage.buckets.'
);

check(
  'Migration 0010 tem políticas RLS de storage',
  (() => {
    const f = readSafe(join(ROOT, 'supabase', 'migrations', '0010_storage_tenant_logos.sql'));
    return f.includes('auth_tenant_id') && f.includes('storage.foldername');
  })(),
  'RLS deve usar auth_tenant_id() e storage.foldername para isolar logos por tenant.'
);

// Tipos — BrandingSettings e TenantSettings
check(
  'BrandingSettings interface exportada em domain/tenant.ts',
  (() => {
    const f = readSafe(join(SRC, 'types', 'domain', 'tenant.ts'));
    return f.includes('BrandingSettings') && f.includes('primary_color') && f.includes('theme_mode');
  })(),
  'Adicionar interface BrandingSettings com primary_color, secondary_color, logo_url, theme_mode.'
);

check(
  'TenantSettings.branding opcional',
  (() => {
    const f = readSafe(join(SRC, 'types', 'domain', 'tenant.ts'));
    return f.includes('branding?:') && f.includes('BrandingSettings');
  })(),
  'TenantSettings deve ter branding?: BrandingSettings.'
);

check(
  'ThemeMode exportado em domain/tenant.ts',
  readSafe(join(SRC, 'types', 'domain', 'tenant.ts')).includes("ThemeMode"),
  'Exportar ThemeMode = "light" | "dark" | "system".'
);

check(
  'COLOR_PRESETS exportados em domain/tenant.ts',
  (() => {
    const f = readSafe(join(SRC, 'types', 'domain', 'tenant.ts'));
    return f.includes('COLOR_PRESETS') && f.includes('Azul Profissional');
  })(),
  'Exportar COLOR_PRESETS com 6 presets (Azul Profissional, Rose Gold, etc.).'
);

// Validator
check(
  'validators/branding.ts existe',
  exists(join(SRC, 'lib', 'validators', 'branding.ts')),
  'Criar lib/validators/branding.ts com brandingSettingsSchema.'
);

check(
  'brandingSettingsSchema valida hex color',
  (() => {
    const f = readSafe(join(SRC, 'lib', 'validators', 'branding.ts'));
    return f.includes('brandingSettingsSchema') && f.includes('#[0-9a-fA-F]');
  })(),
  'brandingSettingsSchema deve validar cores hex com regex.'
);

// Serviço
check(
  'services/branding.ts existe',
  exists(join(SRC, 'services', 'branding.ts')),
  'Criar services/branding.ts com salvarBranding, uploadLogo, removerLogo.'
);

check(
  'services/branding.ts não usa service_role',
  (() => {
    const f = readSafe(join(SRC, 'services', 'branding.ts'));
    return !f.includes('service_role') && !f.includes('SUPABASE_SERVICE');
  })(),
  'NUNCA usar service_role no browser. Usar apenas client-side createClient().'
);

check(
  'services/branding.ts usa Storage tenant-logos',
  readSafe(join(SRC, 'services', 'branding.ts')).includes("'tenant-logos'"),
  'uploadLogo deve usar o bucket tenant-logos.'
);

check(
  'services/branding.ts isola por tenant_id no path',
  (() => {
    const f = readSafe(join(SRC, 'services', 'branding.ts'));
    return f.includes('tenant_id') && f.includes('profile.tenant_id');
  })(),
  'O caminho do ficheiro no Storage deve começar com {tenant_id}/.'
);

// Hook
check(
  'hooks/useBranding.ts existe',
  exists(join(SRC, 'hooks', 'useBranding.ts')),
  'Criar hooks/useBranding.ts com useSalvarBranding, useUploadLogo, useRemoverLogo.'
);

// CSS variables
check(
  'globals.css define --tenant-primary',
  readSafe(join(SRC, 'app', 'globals.css')).includes('--tenant-primary'),
  'globals.css deve definir --tenant-primary como variável CSS root.'
);

check(
  'globals.css NÃO define --tenant-secondary (branding simplificado)',
  (() => {
    const css = readSafe(join(SRC, 'app', 'globals.css'));
    // FASE 9.9: branding passou a logo + cor principal apenas.
    return css.includes('--tenant-primary') && !css.includes('--tenant-secondary');
  })(),
  'globals.css deve manter --tenant-primary e não definir --tenant-secondary.'
);

// Button usa CSS var
check(
  'Button primário usa var(--tenant-primary) em vez de bg-blue-600',
  (() => {
    const f = readSafe(join(SRC, 'components', 'design-system', 'Button', 'Button.tsx'));
    return f.includes('--tenant-primary') && !f.includes('bg-blue-600');
  })(),
  'Button primary variant deve usar [background-color:var(--tenant-primary)] em vez de bg-blue-600.'
);

// BrandingProvider
check(
  'providers/BrandingProvider.tsx existe',
  exists(join(SRC, 'providers', 'BrandingProvider.tsx')),
  'Criar providers/BrandingProvider.tsx que aplica CSS vars e classe de tema.'
);

check(
  'BrandingProvider aplica --tenant-primary via setProperty',
  (() => {
    const f = readSafe(join(SRC, 'providers', 'BrandingProvider.tsx'));
    return f.includes('setProperty') && f.includes('--tenant-primary');
  })(),
  'BrandingProvider deve chamar document.documentElement.style.setProperty para as variáveis.'
);

check(
  'BrandingProvider trata tema dark/light/system',
  (() => {
    const f = readSafe(join(SRC, 'providers', 'BrandingProvider.tsx'));
    return f.includes("'dark'") && f.includes("'light'") && f.includes("'system'");
  })(),
  "BrandingProvider deve gerir os três modos de tema: 'dark', 'light', 'system'."
);

// dashboard/layout.tsx usa BrandingProvider
check(
  'dashboard/layout.tsx usa BrandingProvider',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dashboard', 'layout.tsx'));
    return f.includes('BrandingProvider') && f.includes('<BrandingProvider>');
  })(),
  'dashboard/layout.tsx deve envolver o conteúdo com <BrandingProvider>.'
);

// Componentes de branding
check(
  'ColorPicker component existe',
  exists(join(SRC, 'components', 'features', 'branding', 'ColorPicker.tsx')),
  'Criar components/features/branding/ColorPicker.tsx.'
);

check(
  'ThemePicker component existe',
  exists(join(SRC, 'components', 'features', 'branding', 'ThemePicker.tsx')),
  'Criar components/features/branding/ThemePicker.tsx.'
);

check(
  'LogoUpload component existe',
  exists(join(SRC, 'components', 'features', 'branding', 'LogoUpload.tsx')),
  'Criar components/features/branding/LogoUpload.tsx.'
);

check(
  'BrandingPreview component existe',
  exists(join(SRC, 'components', 'features', 'branding', 'BrandingPreview.tsx')),
  'Criar components/features/branding/BrandingPreview.tsx.'
);

check(
  'LogoUpload valida tipo de ficheiro',
  (() => {
    const f = readSafe(join(SRC, 'components', 'features', 'branding', 'LogoUpload.tsx'));
    return f.includes('ACCEPTED_TYPES') && f.includes('image/png');
  })(),
  'LogoUpload deve validar o tipo MIME do ficheiro antes do upload.'
);

check(
  'LogoUpload valida tamanho máximo 2MB',
  (() => {
    const f = readSafe(join(SRC, 'components', 'features', 'branding', 'LogoUpload.tsx'));
    return f.includes('MAX_BYTES') || f.includes('2097152') || f.includes('2 * 1024');
  })(),
  'LogoUpload deve rejeitar ficheiros maiores que 2MB.'
);

// Layout components usam CSS var
check(
  'SidebarDesktop usa var(--tenant-primary) para active nav',
  (() => {
    const f = readSafe(join(SRC, 'components', 'layout', 'SidebarDesktop', 'SidebarDesktop.tsx'));
    return f.includes('--tenant-primary') && !f.includes("'bg-blue-600 text-white'");
  })(),
  'SidebarDesktop deve usar CSS var --tenant-primary para o item activo (não bg-blue-600).'
);

check(
  'SidebarTablet usa var(--tenant-primary) para active nav',
  (() => {
    const f = readSafe(join(SRC, 'components', 'layout', 'SidebarTablet', 'SidebarTablet.tsx'));
    return f.includes('--tenant-primary') && !f.includes("'bg-blue-600 text-white'");
  })(),
  'SidebarTablet deve usar CSS var --tenant-primary para o item activo.'
);

check(
  'BottomNav usa var(--tenant-primary) para active nav',
  (() => {
    const f = readSafe(join(SRC, 'components', 'layout', 'BottomNav', 'BottomNav.tsx'));
    return f.includes('--tenant-primary') && !f.includes('text-blue-600 bg-blue-50');
  })(),
  'BottomNav deve usar CSS var --tenant-primary para o item activo (não text-blue-600 bg-blue-50).'
);

check(
  'SidebarDesktop mostra logo do tenant se disponível',
  (() => {
    const f = readSafe(join(SRC, 'components', 'layout', 'SidebarDesktop', 'SidebarDesktop.tsx'));
    return f.includes('logoUrl') && f.includes('Image') && f.includes('logo_url');
  })(),
  'SidebarDesktop deve mostrar o logo do tenant (settings.branding.logo_url) se disponível.'
);

// Configurações — Branding tab
check(
  'configuracoes/page.tsx tem tab branding',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dashboard', 'configuracoes', 'page.tsx'));
    return f.includes("'branding'") && f.includes('Branding');
  })(),
  "Configurações deve ter tab 'branding' com painel de branding."
);

// Após refactoring EEOS (≤250 linhas), estes componentes vivem em PainelBranding.tsx
check(
  'PainelBranding.tsx usa ColorPicker',
  readSafe(join(SRC, 'components', 'features', 'configuracoes', 'PainelBranding.tsx')).includes('ColorPicker'),
  'PainelBranding deve usar ColorPicker para selecção da cor primária.'
);

// NOTA: ThemePicker foi removido do painel por decisão de produto (TIER 3).
// Nesta fase só o tema claro é suportado; o theme_mode fica fixo em 'light'.
// O check abaixo garante que NÃO regressa enquanto o dark mode não tiver CSS.
check(
  'PainelBranding.tsx não usa ThemePicker (light-only por agora)',
  !readSafe(join(SRC, 'components', 'features', 'configuracoes', 'PainelBranding.tsx')).includes('ThemePicker'),
  'Enquanto o dark mode não estiver implementado, o ThemePicker deve ficar fora do painel.'
);

check(
  'PainelBranding.tsx usa LogoUpload',
  readSafe(join(SRC, 'components', 'features', 'configuracoes', 'PainelBranding.tsx')).includes('LogoUpload'),
  'PainelBranding deve usar LogoUpload para upload do logótipo.'
);

check(
  'PainelBranding.tsx usa BrandingPreview',
  readSafe(join(SRC, 'components', 'features', 'configuracoes', 'PainelBranding.tsx')).includes('BrandingPreview'),
  'PainelBranding deve usar BrandingPreview para pré-visualização.'
);

check(
  'configuracoes/page.tsx branding só acessível a OWNER',
  (() => {
    // Após refactoring: restrição OWNER vive em PainelBranding.tsx; page.tsx passa PainelBranding como componente
    const painel = readSafe(join(SRC, 'components', 'features', 'configuracoes', 'PainelBranding.tsx'));
    return painel.includes('isOwner');
  })(),
  'PainelBranding deve ser restrito a OWNER (isOwner check).'
);

// Step7Resumo — branding opcional
check(
  'Step7Resumo tem secção de branding opcional',
  (() => {
    const f = readSafe(join(SRC, 'components', 'features', 'onboarding', 'steps', 'Step7Resumo.tsx'));
    return f.includes('brandingOpen') && f.includes('ColorPicker');
  })(),
  'Step7Resumo deve ter uma secção opcional de branding (não bloqueia finalização).'
);

check(
  'Step7Resumo branding é não-bloqueante',
  (() => {
    const f = readSafe(join(SRC, 'components', 'features', 'onboarding', 'steps', 'Step7Resumo.tsx'));
    // O botão de finalizar não deve depender de branding
    return f.includes('onFinalizar') && f.includes('Entrar no ExodoFlow AI');
  })(),
  'O botão de finalização não deve ser bloqueado pela secção de branding.'
);

// Segurança
check(
  'Nenhum ficheiro de branding usa service_role',
  (() => {
    const files = [
      join(SRC, 'services', 'branding.ts'),
      join(SRC, 'providers', 'BrandingProvider.tsx'),
      join(SRC, 'hooks', 'useBranding.ts'),
    ];
    return files.every(f => {
      const content = readSafe(f);
      return !content.includes('service_role') && !content.includes('SUPABASE_SERVICE');
    });
  })(),
  'NUNCA usar service_role no browser. Todos os ficheiros de branding devem usar client-side Supabase.'
);

check(
  'Cores não espalhadas no código — sem hex hardcoded nos layouts',
  (() => {
    const sidebar = readSafe(join(SRC, 'components', 'layout', 'SidebarDesktop', 'SidebarDesktop.tsx'));
    const bottom  = readSafe(join(SRC, 'components', 'layout', 'BottomNav', 'BottomNav.tsx'));
    // Não deve conter bg-blue-600 para active state
    return !sidebar.includes("'bg-blue-600 text-white'") && !bottom.includes('text-blue-600 bg-blue-50');
  })(),
  'Layouts não devem ter cores primárias hardcoded (bg-blue-600) para estado activo — usar CSS vars.'
);

// ═══════════════════════════════════════════════════════════════════════════
// TIER 1 — Correções de integridade de dados
// ═══════════════════════════════════════════════════════════════════════════
section('TIER 1 — Integridade de Dados e Dashboard Honesto');

// BUG 1 — dashboard/layout.tsx trata tenantData null
check(
  'dashboard/layout.tsx redireciona quando tenantData é null',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dashboard', 'layout.tsx'));
    // A condição correcta é (!tenantData || !tenantData.onboarding_completed)
    // A condição errada era (tenantData && !tenantData.onboarding_completed)
    return /!\s*tenantData\s*\|\|/.test(f) || /!tenantData\.onboarding_completed/.test(f);
  })(),
  'dashboard/layout.tsx deve redirecionar para /onboarding quando tenantData é null (sem tenant associado).'
);

// BUG 2 — listarClientes filtra soft-deleted
check(
  'listarClientes contém .is(\'deleted_at\', null)',
  (() => {
    const f = readSafe(join(SRC, 'services', 'clients.ts'));
    return /\.is\(['"]deleted_at['"],\s*null\)/.test(f);
  })(),
  "Adicionar .is('deleted_at', null) em listarClientes() para excluir clientes soft-deleted."
);

// BUG 3 — listarRecursos filtra inativos e soft-deleted
check(
  'listarRecursos contém .eq(\'is_active\', true)',
  (() => {
    const f = readSafe(join(SRC, 'services', 'recursos.ts'));
    return /\.eq\(['"]is_active['"],\s*true\)/.test(f);
  })(),
  "Adicionar .eq('is_active', true) em listarRecursos() para excluir recursos inactivos."
);

check(
  'listarRecursos contém .is(\'deleted_at\', null)',
  (() => {
    const f = readSafe(join(SRC, 'services', 'recursos.ts'));
    return /\.is\(['"]deleted_at['"],\s*null\)/.test(f);
  })(),
  "Adicionar .is('deleted_at', null) em listarRecursos() para excluir recursos soft-deleted."
);

// BUG 4 — dashboard não usa MOCK_CONVERSATIONS como dado real
check(
  'dashboard/page.tsx não importa MOCK_CONVERSATIONS',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dashboard', 'page.tsx'));
    return !f.includes('MOCK_CONVERSATIONS');
  })(),
  'Remover importação e uso de MOCK_CONVERSATIONS no dashboard real. Mostrar empty state honesto.'
);

// BUG 5 — dashboard não tem stats hardcoded
check(
  'dashboard/page.tsx sem valor hardcoded "€485"',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dashboard', 'page.tsx'));
    return !f.includes('€485') && !f.includes('485,00');
  })(),
  'Remover o valor fictício "€485,00" do dashboard. Usar cálculo real ou "—".'
);

check(
  'dashboard/page.tsx sem taxa de ocupação hardcoded "78%"',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dashboard', 'page.tsx'));
    return !f.includes('"78%"') && !f.includes("'78%'");
  })(),
  'Remover o valor fictício "78%" do dashboard. Mostrar "—" enquanto não há cálculo fiável.'
);

check(
  'dashboard/page.tsx não tem trend de receita hardcoded',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dashboard', 'page.tsx'));
    // Verifica que não existe trend com valor 12 associado à receita (era o valor falso)
    return !(/value:\s*12,\s*direction:\s*['"]up['"]/.test(f));
  })(),
  'Remover trend fictício de receita (value: 12). Trend só deve aparecer com dados reais.'
);

// ═══════════════════════════════════════════════════════════════════════════
// TIER 2 — Correções de bloqueadores (RLS, signup, booking atómico, estabilidade)
// ═══════════════════════════════════════════════════════════════════════════
section('TIER 2 — RLS, Signup, Booking Atómico e Estabilidade');

const sql0011 = readSafe(join(MIGRATIONS, '0011_signup_trigger.sql'));
const sql0012 = readSafe(join(MIGRATIONS, '0012_fix_rls_and_atomic_booking.sql'));
const seedSql = readSafe(join(SUPABASE, 'seed.sql'));

check(
  'Migration 0011: trigger handle_new_user cria tenant + profile no signup',
  sql0011.includes('handle_new_user') && sql0011.includes('on_auth_user_created'),
  'Criar trigger AFTER INSERT em auth.users que cria tenant + profile + injeta tenant_id no JWT.'
);

check(
  'Migration 0011: trigger salta utilizadores com tenant_id pré-definido (seed)',
  sql0011.includes("? 'tenant_id'"),
  'O trigger deve saltar utilizadores cujo raw_app_meta_data já tem tenant_id (seed/convites).'
);

check(
  'Migration 0012: tenants tem policy de UPDATE para OWNER',
  sql0012.includes('tenants_update_owner') && sql0012.includes('FOR UPDATE'),
  'Sem policy UPDATE em tenants, o onboarding e o branding falham silenciosamente (RLS bloqueia com error=null).'
);

check(
  'Migration 0012: tenants UPDATE tem WITH CHECK',
  /tenants_update_owner[\s\S]*?WITH CHECK/.test(sql0012),
  'WITH CHECK obrigatório para impedir mover o registo para outro tenant.'
);

check(
  'Migration 0012: profiles tem policy SELECT do próprio perfil',
  sql0012.includes('profiles_select_own') && sql0012.includes('auth.uid()'),
  'Sem profiles_select_own, utilizador com JWT sem tenant_id não vê o próprio perfil.'
);

check(
  'Migration 0012: create_booking RPC transacional existe',
  sql0012.includes('CREATE OR REPLACE FUNCTION create_booking') &&
    sql0012.includes('pg_advisory_xact_lock'),
  'criar booking deve ser atómico com advisory lock anti-double-booking.'
);

check(
  'Migration 0012: reschedule_booking RPC transacional existe',
  sql0012.includes('CREATE OR REPLACE FUNCTION reschedule_booking'),
  'reagendar booking deve ser atómico (update + substituição de recursos na mesma transacção).'
);

check(
  'seed.sql: utilizadores têm tenant_id no app_metadata',
  /raw_app_meta_data[\s\S]{0,400}tenant_id/.test(seedSql) || seedSql.includes('"tenant_id":"b1000000'),
  'Sem tenant_id no app_metadata, auth_tenant_id() devolve NULL e o RLS bloqueia tudo para os utilizadores seed.'
);

check(
  'seed.sql: tenants com onboarding_completed = TRUE',
  seedSql.includes('onboarding_completed') && seedSql.includes('TRUE'),
  'Tenants seed sem onboarding concluído causam loop de redirect no login.'
);

check(
  'services/bookings.ts: criarBooking usa RPC create_booking',
  readSafe(join(SRC, 'services', 'bookings.ts')).includes("rpc('create_booking'"),
  'criarBooking deve chamar o RPC transacional, não 2 INSERTs separados.'
);

check(
  'services/bookings.ts: reagendarBooking usa RPC reschedule_booking',
  readSafe(join(SRC, 'services', 'bookings.ts')).includes("rpc('reschedule_booking'"),
  'reagendarBooking deve chamar o RPC transacional.'
);

check(
  'assertMutationSuccess existe',
  exists(join(SRC, 'lib', 'supabase', 'assertMutationSuccess.ts')),
  'Criar helper que rejeita error=null + 0 linhas afectadas como sucesso.'
);

check(
  'services/onboarding.ts usa assertMutationSuccess',
  readSafe(join(SRC, 'services', 'onboarding.ts')).includes('assertMutationSuccess'),
  'Updates do onboarding devem detectar bloqueio RLS (0 linhas) e lançar erro claro.'
);

check(
  'services/branding.ts usa assertMutationSuccess',
  readSafe(join(SRC, 'services', 'branding.ts')).includes('assertMutationSuccess'),
  'Updates do branding devem detectar bloqueio RLS (0 linhas) e lançar erro claro.'
);

check(
  'Criação de empresa faz merge de settings (preserva JSONB, nunca sobrescreve)',
  (() => {
    // FASE 9.9: o merge seguro de settings ao definir país/nicho vive agora no
    // handler de criação (service_role), não no onboarding do owner.
    const route = readSafe(join(SRC, 'app', 'api', 'admin', 'criar-empresa', 'route.ts'));
    return route.includes('settingsAtuais') && route.includes('...settingsAtuais');
  })(),
  'O handler de criação deve carregar settings actuais e fazer spread — nunca sobrescrever o JSONB.'
);

check(
  'day_of_week usa convenção 0-6 no validator',
  (() => {
    const f = readSafe(join(SRC, 'lib', 'validators', 'onboarding.ts'));
    return f.includes('.min(0,') && f.includes('.max(6,');
  })(),
  'Validator deve usar 0=Domingo...6=Sábado (convenção PostgreSQL EXTRACT(DOW)).'
);

check(
  'Step5Disponibilidade usa convenção 0-6',
  (() => {
    const f = readSafe(join(SRC, 'components', 'features', 'onboarding', 'steps', 'Step5Disponibilidade.tsx'));
    return f.includes("0: 'Domingo'") && !f.includes("7: 'Domingo'");
  })(),
  'UI do passo 5 deve mapear 0=Domingo...6=Sábado.'
);

check(
  'LogoUpload não aceita SVG',
  !readSafe(join(SRC, 'components', 'features', 'branding', 'LogoUpload.tsx')).includes('image/svg+xml'),
  'SVG pode conter <script> embebido (XSS armazenado) — apenas PNG/JPEG/WebP.'
);

check(
  'Bucket tenant-logos não permite SVG',
  !readSafe(join(MIGRATIONS, '0010_storage_tenant_logos.sql')).includes('image/svg+xml'),
  'O bucket deve rejeitar SVG no allowed_mime_types (defesa em profundidade).'
);

check(
  'app/error.tsx existe (error boundary de rota)',
  exists(join(SRC, 'app', 'error.tsx')),
  'Criar error boundary para erros de rota não derrubarem a app.'
);

check(
  'app/global-error.tsx existe (error boundary global)',
  exists(join(SRC, 'app', 'global-error.tsx')),
  'Criar error boundary global para erros no root layout.'
);

check(
  '/api/health existe',
  exists(join(SRC, 'app', 'api', 'health', 'route.ts')),
  'Criar health check que verifica app + ligação Supabase.'
);

check(
  'logger existe (src/lib/logger.ts)',
  exists(join(SRC, 'lib', 'logger.ts')),
  'Criar logger central (info/warn/error) preparado para integração futura.'
);

check(
  'listarBookings tem limite',
  /listarBookings[\s\S]*?\.limit\(/.test(readSafe(join(SRC, 'services', 'bookings.ts'))),
  'Listagens sem limite podem carregar dezenas de milhares de linhas.'
);

check(
  'listarClientes tem limite',
  readSafe(join(SRC, 'services', 'clients.ts')).includes('.limit('),
  'Listagens sem limite podem carregar dezenas de milhares de linhas.'
);

check(
  'configuracoes/page.tsx não usa MOCK_TENANT',
  !readSafe(join(SRC, 'app', 'dashboard', 'configuracoes', 'page.tsx')).includes('MOCK_TENANT'),
  'Configurações deve mostrar o tenant real do AuthProvider, não dados fictícios.'
);

check(
  'PainelEmpresa não usa MOCK_TENANT',
  !readSafe(join(SRC, 'components', 'features', 'configuracoes', 'PainelEmpresa.tsx')).includes('MOCK_TENANT'),
  'PainelEmpresa deve mostrar o tenant real do AuthProvider, não dados fictícios.'
);

// ═══════════════════════════════════════════════════════════════════════════
// TIER 3 — Consentimento RGPD, Branding persistente, Cadastro privado
// ═══════════════════════════════════════════════════════════════════════════
section('TIER 3 — Consentimento RGPD, Branding e Cadastro Privado');

// ── Parte 1: Consentimento de marketing ──────────────────────────────────────
const modalCliente = readSafe(join(SRC, 'components', 'features', 'clientes', 'NovoClienteModal.tsx'));

check(
  'Checkbox de marketing não vem pré-marcada',
  modalCliente.includes("marketing_consent: false") ||
    readSafe(join(SRC, 'lib', 'validators', 'client.ts')).includes('.default(false)'),
  'O consentimento de marketing deve começar desmarcado (opt-in explícito).'
);

// O texto centralizou-se em src/lib/consent.ts (fonte única); o modal referencia-o
const consentLib = readSafe(join(SRC, 'lib', 'consent.ts'));

check(
  'Texto de consentimento de marketing está correcto',
  consentLib.includes('comunicações de marketing, promoções e novidades'),
  'O texto deve ser o aprovado: "Aceito receber comunicações de marketing, promoções e novidades por WhatsApp, SMS ou email."'
);

check(
  'Nota separa marketing de comunicações operacionais',
  consentLib.includes('Lembretes e confirmações de marcação'),
  'Deve haver nota explicando que comunicações operacionais não dependem do consentimento de marketing.'
);

check(
  'Marketing não bloqueia o cadastro (campo opcional no schema)',
  (() => {
    const f = readSafe(join(SRC, 'lib', 'validators', 'client.ts'));
    // marketing_consent é boolean com default — nunca .min/.refine que obrigue true
    return f.includes('marketing_consent') && !/marketing_consent[\s\S]{0,80}refine/.test(f);
  })(),
  'O schema não deve obrigar marketing_consent = true.'
);

// ── Parte 2: Branding persistente ────────────────────────────────────────────
check(
  'AuthProvider expõe refreshTenant',
  readSafe(join(SRC, 'providers', 'AuthProvider.tsx')).includes('refreshTenant'),
  'Sem refreshTenant, a cor só muda após F5 (o tenant vive em estado React, não em query).'
);

check(
  'useBranding usa refreshTenant após mutação',
  (() => {
    const f = readSafe(join(SRC, 'hooks', 'useBranding.ts'));
    return f.includes('refreshTenant');
  })(),
  'Os hooks de branding devem chamar refreshTenant() no onSuccess para a UI actualizar logo.'
);

check(
  'BrandingProvider aplica --tenant-primary a partir de settings.branding',
  (() => {
    const f = readSafe(join(SRC, 'providers', 'BrandingProvider.tsx'));
    return f.includes('--tenant-primary') && f.includes('branding?.primary_color');
  })(),
  'BrandingProvider deve ler settings.branding.primary_color e aplicar a CSS var.'
);

check(
  'PainelBranding fixa theme_mode em light (dark não implementado)',
  (() => {
    const f = readSafe(join(SRC, 'components', 'features', 'configuracoes', 'PainelBranding.tsx'));
    return f.includes("theme_mode:      'light'") && !f.includes('ThemePicker');
  })(),
  'Nesta fase só o tema claro é suportado — ThemePicker deve sair do painel.'
);

// ── Parte 3: Cadastro privado + SUPERADMIN ──────────────────────────────────
check(
  'Migration 0013 adiciona role superadmin',
  (() => {
    const f = readSafe(join(MIGRATIONS, '0013_superadmin.sql'));
    return f.includes("'superadmin'") && f.includes('profiles_role_check');
  })(),
  'Criar role superadmin no CHECK de profiles.role.'
);

check(
  'Migration 0013: profiles.tenant_id NULLABLE para superadmin',
  readSafe(join(MIGRATIONS, '0013_superadmin.sql')).includes('ALTER COLUMN tenant_id DROP NOT NULL'),
  'O superadmin não pertence a nenhum tenant — tenant_id tem de aceitar NULL.'
);

check(
  'Migration 0013: superadmin gere tenants (policies globais)',
  (() => {
    const f = readSafe(join(MIGRATIONS, '0013_superadmin.sql'));
    return f.includes('tenants_select_superadmin') &&
           f.includes('tenants_update_superadmin') &&
           f.includes('tenants_insert_superadmin');
  })(),
  'O superadmin precisa de policies SELECT/UPDATE/INSERT globais sobre tenants.'
);

check(
  'AppRole inclui superadmin',
  readSafe(join(SRC, 'types', 'domain', 'permission.ts')).includes("'superadmin'"),
  'O tipo AppRole deve incluir superadmin.'
);

check(
  'superadmin sem permissões operacionais de tenant',
  /superadmin:\s*\[\s*\]/.test(readSafe(join(SRC, 'types', 'domain', 'permission.ts'))),
  'ROLE_PERMISSIONS.superadmin deve ser [] — usa apenas o painel /admin.'
);

check(
  'Página /admin existe e é protegida (só superadmin)',
  exists(join(SRC, 'app', 'admin', 'page.tsx')) &&
    readSafe(join(SRC, 'app', 'admin', 'layout.tsx')).includes("role !== 'superadmin'"),
  'O painel /admin deve existir e redirecionar quem não é superadmin.'
);

check(
  'dashboard/layout redireciona superadmin para /admin',
  readSafe(join(SRC, 'app', 'dashboard', 'layout.tsx')).includes("=== 'superadmin'"),
  'Superadmin não deve aceder ao dashboard de tenant.'
);

check(
  'Registo público bloqueado — enable_signup global false',
  /^\s*enable_signup\s*=\s*false/m.test(readSafe(join(SUPABASE, 'config.toml'))),
  'O signup público deve estar desactivado no GoTrue (enable_signup = false).'
);

check(
  '/register não tem formulário de signUp (página informativa)',
  (() => {
    const f = readSafe(join(SRC, 'app', 'register', 'page.tsx'));
    return f.includes('Acesso por convite') && !f.includes('RegisterForm');
  })(),
  '/register deve ser informativa (acesso por convite), sem formulário de criação.'
);

check(
  'RegisterForm removido (sem signup público no código)',
  !exists(join(SRC, 'components', 'features', 'auth', 'RegisterForm.tsx')),
  'O componente de registo público deve ser removido.'
);

check(
  'seed.sql cria o utilizador superadmin',
  (() => {
    const f = readSafe(join(SUPABASE, 'seed.sql'));
    return f.includes('is_superadmin') && f.includes("'superadmin'");
  })(),
  'O seed deve criar um superadmin para administração inicial.'
);

check(
  'Documentação de administração existe (docs/ADMIN.md)',
  exists(join(ROOT, 'docs', 'ADMIN.md')),
  'Deve haver documentação de como criar tenant + owner pelo painel/Studio.'
);

// ── Gate de tenant suspenso ──────────────────────────────────────────────────
check(
  'dashboard/layout bloqueia tenant suspenso (is_active = false)',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dashboard', 'layout.tsx'));
    return f.includes('is_active === false') && f.includes("redirect('/suspenso')");
  })(),
  'O dashboard deve expulsar o utilizador de um tenant suspenso para /suspenso.'
);

check(
  'Página /suspenso existe com guard próprio',
  (() => {
    const f = readSafe(join(SRC, 'app', 'suspenso', 'page.tsx'));
    // Tem de revalidar is_active e mandar de volta ao dashboard se NÃO estiver suspenso
    return exists(join(SRC, 'app', 'suspenso', 'page.tsx')) &&
           f.includes('is_active') && f.includes("redirect('/dashboard')");
  })(),
  '/suspenso deve revalidar o estado para evitar loop de redirect e uso indevido.'
);

// ── Criar empresa pelo painel admin (admin API server-side) ──────────────────
const routeCriarEmpresa = readSafe(join(SRC, 'app', 'api', 'admin', 'criar-empresa', 'route.ts'));

check(
  'Route Handler /api/admin/criar-empresa existe',
  exists(join(SRC, 'app', 'api', 'admin', 'criar-empresa', 'route.ts')),
  'Criar Route Handler server-side para a criação de empresas.'
);

check(
  'criar-empresa verifica role superadmin antes de agir',
  routeCriarEmpresa.includes("role !== 'superadmin'") && routeCriarEmpresa.includes('403'),
  'O handler deve recusar (403) qualquer utilizador que não seja superadmin.'
);

check(
  'criar-empresa exige sessão autenticada (401)',
  routeCriarEmpresa.includes('getUser()') && routeCriarEmpresa.includes('401'),
  'O handler deve recusar (401) pedidos sem sessão.'
);

check(
  'admin client usa SERVICE_ROLE_KEY server-only (sem NEXT_PUBLIC)',
  (() => {
    const f = readSafe(join(SRC, 'lib', 'supabase', 'admin.ts'));
    return f.includes('SUPABASE_SERVICE_ROLE_KEY') &&
           !f.includes('NEXT_PUBLIC_SUPABASE_SERVICE');
  })(),
  'A service_role deve vir de SUPABASE_SERVICE_ROLE_KEY (sem prefixo NEXT_PUBLIC_).'
);

check(
  'service_role NÃO é importada por Client Components',
  (() => {
    // Procurar createAdminClient/SERVICE_ROLE em qualquer ficheiro com 'use client'
    const offenders = collectFiles(SRC, ['.ts', '.tsx']).filter((file) => {
      const f = readSafe(file);
      const isClient = /^['"]use client['"]/m.test(f);
      const usesService = f.includes('createAdminClient') ||
                          f.includes('SUPABASE_SERVICE_ROLE_KEY');
      // admin.ts não tem 'use client' — só conta ficheiros client que usam o segredo
      return isClient && usesService;
    });
    return offenders.length === 0;
  })(),
  'A service_role nunca pode ser importada/usada num Client Component (vazaria para o browser).'
);

check(
  'CriarEmpresaForm existe no painel admin (/admin/empresas)',
  exists(join(SRC, 'components', 'features', 'admin', 'CriarEmpresaForm.tsx')) &&
    readSafe(join(SRC, 'app', 'admin', 'empresas', 'page.tsx')).includes('CriarEmpresaForm'),
  'O painel /admin/empresas deve usar o formulário de criação de empresa.'
);

// ── Trilho de auditoria de consentimento RGPD ────────────────────────────────
const sql0014 = readSafe(join(MIGRATIONS, '0014_consent_audit_trail.sql'));

check(
  'Migration 0014: trigger de consentimento de marketing existe',
  sql0014.includes('log_marketing_consent') &&
    sql0014.includes('trigger_log_marketing_consent'),
  'Criar trigger que regista cada escolha de marketing_consent em legal_consents.'
);

check(
  'Migration 0014: trigger dispara em INSERT e UPDATE OF marketing_consent',
  /AFTER INSERT OR UPDATE OF marketing_consent ON clients/.test(sql0014),
  'O trigger deve capturar a escolha inicial e cada alteração posterior.'
);

check(
  'Migration 0014: escreve em legal_consents com versão e timestamp',
  sql0014.includes('INSERT INTO legal_consents') &&
    sql0014.includes('current_marketing_consent_version()'),
  'Cada registo deve ter consent_version e consented_at (prova RGPD).'
);

check(
  'legal_consents permanece imutável (sem policy UPDATE/DELETE)',
  (() => {
    // Procurar em todas as migrations por qualquer policy de UPDATE/DELETE em legal_consents
    const todas = [sql, readSafe(join(MIGRATIONS, '0008_roles_permissions.sql')), sql0014].join('\n');
    return !/CREATE POLICY[^;]*legal_consents[^;]*FOR (UPDATE|DELETE)/i.test(todas);
  })(),
  'legal_consents nunca pode ter policy UPDATE/DELETE — é registo legal imutável.'
);

check(
  'Versão de consentimento sincronizada frontend↔BD',
  (() => {
    const fe = readSafe(join(SRC, 'lib', 'consent.ts'));
    const versaoFE = /MARKETING_CONSENT_VERSION\s*=\s*'([^']+)'/.exec(fe)?.[1];
    return versaoFE && sql0014.includes(`'${versaoFE}'`);
  })(),
  'MARKETING_CONSENT_VERSION (frontend) deve coincidir com a versão na migração 0014.'
);

check(
  'Serviço lê o trilho de consentimento (listarConsentimentosCliente)',
  readSafe(join(SRC, 'services', 'clients.ts')).includes('listarConsentimentosCliente'),
  'Deve existir um serviço para consultar o histórico de consentimentos de um cliente.'
);

check(
  'Modal de cliente usa o texto de consentimento centralizado',
  readSafe(join(SRC, 'components', 'features', 'clientes', 'NovoClienteModal.tsx')).includes('MARKETING_CONSENT_TEXT'),
  'O texto de consentimento deve vir de src/lib/consent.ts (fonte única de verdade).'
);

// ── Gestão de equipa (OWNER cria membros via admin API) ──────────────────────
const routeCriarMembro = readSafe(join(SRC, 'app', 'api', 'equipa', 'criar-membro', 'route.ts'));

check(
  'Route Handler /api/equipa/criar-membro existe',
  exists(join(SRC, 'app', 'api', 'equipa', 'criar-membro', 'route.ts')),
  'Criar Route Handler server-side para a criação de membros de equipa.'
);

check(
  'criar-membro restringe a OWNER (team.manage é exclusivo do owner)',
  routeCriarMembro.includes("role !== 'owner'") && routeCriarMembro.includes('403'),
  'Apenas o owner pode criar membros — recusar (403) os restantes.'
);

check(
  'criar-membro usa o tenant_id do PRÓPRIO owner (sem injecção)',
  routeCriarMembro.includes('profile.tenant_id') && routeCriarMembro.includes('const tenantId'),
  'O membro deve herdar o tenant do owner autenticado, nunca um tenant escolhido pelo cliente.'
);

check(
  'criar-membro usa join_tenant_id em user_metadata (timing do trigger)',
  routeCriarMembro.includes('join_tenant_id'),
  'O sinal para o trigger saltar deve ir em user_metadata (app_metadata só é aplicado após o trigger).'
);

check(
  'Trigger de signup salta provisioning com join_tenant_id',
  readSafe(join(MIGRATIONS, '0011_signup_trigger.sql')).includes("raw_user_meta_data ? 'join_tenant_id'"),
  'handle_new_user deve saltar o provisionamento quando o membro entra num tenant existente.'
);

check(
  'Serviço de equipa existe (listar + estado de membro)',
  (() => {
    const f = readSafe(join(SRC, 'services', 'equipa.ts'));
    return f.includes('listarEquipa') && f.includes('definirEstadoMembro');
  })(),
  'Deve existir serviço para listar a equipa e activar/desactivar membros.'
);

check(
  'Página /dashboard/equipa protegida por team.view',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dashboard', 'equipa', 'page.tsx'));
    return exists(join(SRC, 'app', 'dashboard', 'equipa', 'page.tsx')) &&
           f.includes("can('team.view')") && f.includes("can('team.manage')");
  })(),
  'A página de equipa deve exigir team.view e só mostrar gestão a quem tem team.manage.'
);

check(
  'Equipa na navegação (sidebars) com permission team.view',
  (() => {
    const d = readSafe(join(SRC, 'components', 'layout', 'SidebarDesktop', 'SidebarDesktop.tsx'));
    const t = readSafe(join(SRC, 'components', 'layout', 'SidebarTablet', 'SidebarTablet.tsx'));
    return d.includes("/dashboard/equipa") && d.includes("'team.view'") &&
           t.includes("/dashboard/equipa") && t.includes("'team.view'");
  })(),
  'O item Equipa deve aparecer nas sidebars com a permissão team.view.'
);

// ── Perfil próprio + correcção de escalada de privilégios ────────────────────
const sql0015 = readSafe(join(MIGRATIONS, '0015_profile_self_edit_guard.sql'));

check(
  'Migration 0015: trigger impede escalada de privilégios no próprio perfil',
  sql0015.includes('prevent_profile_self_escalation') &&
    sql0015.includes('Não pode alterar a sua própria função'),
  'Sem este trigger, um membro pode fazer UPDATE profiles SET role=owner no seu perfil.'
);

check(
  'Migration 0015: trigger bloqueia role, tenant_id e is_active próprios',
  (() => {
    return sql0015.includes('NEW.role IS DISTINCT FROM OLD.role') &&
           sql0015.includes('NEW.tenant_id IS DISTINCT FROM OLD.tenant_id') &&
           sql0015.includes('NEW.is_active IS DISTINCT FROM OLD.is_active');
  })(),
  'O guard deve cobrir os três campos sensíveis na auto-actualização.'
);

check(
  'Migration 0015: owner/manager vêem membros inactivos (gestão de equipa)',
  sql0015.includes('profiles_select_manager_all'),
  'Sem esta policy, membros desactivados desaparecem da lista e não podem ser reactivados.'
);

check(
  'Serviço de perfil próprio existe (dados + password)',
  (() => {
    const f = readSafe(join(SRC, 'services', 'perfil.ts'));
    return f.includes('atualizarPerfilProprio') && f.includes('alterarPassword');
  })(),
  'Deve existir serviço para o utilizador editar os próprios dados e a palavra-passe.'
);

check(
  'Página /dashboard/perfil existe',
  exists(join(SRC, 'app', 'dashboard', 'perfil', 'page.tsx')),
  'Criar página de conta própria (dados pessoais + alterar palavra-passe).'
);

check(
  'Sidebar liga à página de conta própria',
  readSafe(join(SRC, 'components', 'layout', 'SidebarDesktop', 'SidebarDesktop.tsx')).includes('/dashboard/perfil'),
  'O utilizador deve poder chegar à sua conta a partir da navegação.'
);

check(
  'Validador de perfil não permite editar role/tenant',
  (() => {
    const f = readSafe(join(SRC, 'lib', 'validators', 'perfil.ts'));
    // Procurar campos de schema reais (chave: z.…), ignorando comentários
    return !/\brole\s*:\s*z\./.test(f) && !/\btenant_id\s*:\s*z\./.test(f);
  })(),
  'O schema de perfil próprio não deve incluir role/tenant (defesa adicional ao trigger).'
);

// ── Editar dados da empresa (OWNER) ──────────────────────────────────────────
check(
  'Serviço atualizarDadosEmpresa existe',
  readSafe(join(SRC, 'services', 'tenant.ts')).includes('atualizarDadosEmpresa'),
  'Deve existir serviço para o owner editar os dados da empresa.'
);

check(
  'atualizarDadosEmpresa não sobrescreve settings (preserva branding)',
  (() => {
    const f = readSafe(join(SRC, 'services', 'tenant.ts'));
    // O UPDATE de dados da empresa não deve tocar na coluna settings
    const bloco = f.slice(f.indexOf('atualizarDadosEmpresa'));
    return !/\.update\(\{[\s\S]*?settings\s*:/.test(bloco.slice(0, 600));
  })(),
  'A edição de dados não deve escrever settings — evita apagar branding/locale.'
);

check(
  'atualizarDadosEmpresa trata slug duplicado (23505)',
  readSafe(join(SRC, 'services', 'tenant.ts')).includes("'23505'"),
  'Slug duplicado deve dar mensagem clara, não erro genérico.'
);

check(
  'PainelEmpresa tem modo de edição para owner',
  (() => {
    const f = readSafe(join(SRC, 'components', 'features', 'configuracoes', 'PainelEmpresa.tsx'));
    return f.includes('useAtualizarEmpresa') && f.includes('isOwner') && f.includes('Editar dados');
  })(),
  'PainelEmpresa deve permitir ao owner editar (e não mostrar "em breve").'
);

check(
  'PainelEmpresa já não mostra "em breve"',
  !readSafe(join(SRC, 'components', 'features', 'configuracoes', 'PainelEmpresa.tsx')).includes('em breve'),
  'A edição de empresa está implementada — remover o placeholder "em breve".'
);

// ── Vincular staff a um recurso ──────────────────────────────────────────────
const routeMembro = readSafe(join(SRC, 'app', 'api', 'equipa', 'criar-membro', 'route.ts'));

check(
  'criar-membro: vínculo de recurso valida tenant + tipo + livre',
  (() => {
    // O UPDATE de resources deve confirmar tenant_id, type staff e profile_id null
    return routeMembro.includes("eq('tenant_id', tenantId)") &&
           routeMembro.includes("eq('type', 'staff')") &&
           routeMembro.includes("is('profile_id', null)");
  })(),
  'O vínculo de recurso deve impedir roubar recursos de outro tenant/membro.'
);

check(
  'Serviço listarRecursosVinculaveis filtra staff sem profile_id',
  (() => {
    const f = readSafe(join(SRC, 'services', 'equipa.ts'));
    return f.includes('listarRecursosVinculaveis') &&
           f.includes("eq('type', 'staff')") && f.includes("is('profile_id', null)");
  })(),
  'Só recursos humanos livres devem ser oferecidos para vínculo.'
);

check(
  'CriarMembroForm mostra recurso só quando role=staff',
  (() => {
    const f = readSafe(join(SRC, 'components', 'features', 'equipa', 'CriarMembroForm.tsx'));
    return f.includes("role === 'staff'") && f.includes('Recurso associado');
  })(),
  'O selector de recurso deve aparecer apenas para colaboradores (staff).'
);

// ── Acesso ao perfil no mobile ───────────────────────────────────────────────
check(
  'MobileHeader existe e liga à conta própria',
  (() => {
    const f = readSafe(join(SRC, 'components', 'layout', 'MobileHeader', 'MobileHeader.tsx'));
    return exists(join(SRC, 'components', 'layout', 'MobileHeader', 'MobileHeader.tsx')) &&
           f.includes('/dashboard/perfil') && f.includes('md:hidden');
  })(),
  'No mobile deve haver um header com acesso a /dashboard/perfil.'
);

check(
  'DashboardLayout usa o MobileHeader',
  readSafe(join(SRC, 'components', 'layout', 'DashboardLayout', 'DashboardLayout.tsx')).includes('MobileHeader'),
  'O MobileHeader deve estar montado no layout do dashboard.'
);

// ── CRUD de serviços e recursos (editar + apagar) ────────────────────────────
const sql0016 = readSafe(join(MIGRATIONS, '0016_soft_delete_rpcs.sql'));

check(
  'Migration 0016: RPCs de soft-delete com verificação de tenant + role',
  (() => {
    return sql0016.includes('soft_delete_service') &&
           sql0016.includes('soft_delete_resource') &&
           sql0016.includes("v_role NOT IN ('owner', 'manager')") &&
           sql0016.includes('v_tenant_id IS NULL');
  })(),
  'Os RPCs de soft-delete devem validar tenant e role (owner/manager) antes de apagar.'
);

check(
  'apagarServico usa o RPC soft_delete_service',
  readSafe(join(SRC, 'services', 'servicos.ts')).includes("rpc('soft_delete_service'"),
  'O soft-delete de serviço deve passar pelo RPC (UPDATE directo é bloqueado pela RLS).'
);

check(
  'apagarRecurso usa o RPC soft_delete_resource',
  readSafe(join(SRC, 'services', 'recursos.ts')).includes("rpc('soft_delete_resource'"),
  'O soft-delete de recurso deve passar pelo RPC.'
);

check(
  'ServicoModal trata criar E editar (modo dual)',
  (() => {
    const f = readSafe(join(SRC, 'components', 'features', 'servicos', 'ServicoModal.tsx'));
    return f.includes('modoEdicao') && f.includes('useAtualizarServico') && f.includes('useCriarServico');
  })(),
  'O modal de serviço deve criar e editar conforme receba (ou não) um serviço.'
);

check(
  'RecursoModal trata criar E editar (modo dual)',
  (() => {
    const f = readSafe(join(SRC, 'components', 'features', 'recursos', 'RecursoModal.tsx'));
    return f.includes('modoEdicao') && f.includes('useAtualizarRecurso') && f.includes('useCriarRecurso');
  })(),
  'O modal de recurso deve criar e editar conforme receba (ou não) um recurso.'
);

check(
  'Página de serviços liga editar + apagar',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dashboard', 'servicos', 'page.tsx'));
    return f.includes('abrirEditar') && f.includes('setServicoApagar') && f.includes('ConfirmDialog');
  })(),
  'A página de serviços deve ter acções de editar e apagar com confirmação.'
);

check(
  'Página de recursos: criar funcional (sem "em breve") + editar + apagar',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dashboard', 'recursos', 'page.tsx'));
    return f.includes('abrirCriar') && f.includes('abrirEditar') &&
           f.includes('setRecursoApagar') && !f.includes('em breve');
  })(),
  'A página de recursos deve permitir criar, editar e apagar (sem placeholder "em breve").'
);

check(
  'ConfirmDialog reutilizável existe',
  exists(join(SRC, 'components', 'design-system', 'ConfirmDialog', 'ConfirmDialog.tsx')),
  'Acções destrutivas devem usar um diálogo de confirmação.'
);

check(
  'Validador de recurso existe',
  (() => {
    const f = readSafe(join(SRC, 'lib', 'validators', 'resource.ts'));
    return f.includes('criarRecursoSchema') && f.includes('atualizarRecursoSchema');
  })(),
  'Deve existir validador Zod para criar/actualizar recursos.'
);

// ═══════════════════════════════════════════════════════════════════════════
// FASE — Branding, Configurações da Empresa e Detalhe de Cliente
// ═══════════════════════════════════════════════════════════════════════════
section('FASE — Branding, Configurações da Empresa e Detalhe de Cliente');

const tenantSvc = readSafe(join(SRC, 'services', 'tenant.ts'));

// ── Configurações da empresa editáveis + merge seguro ───────────────────────
check(
  'atualizarDadosEmpresa faz merge seguro de settings (preserva branding)',
  (() => {
    return tenantSvc.includes('settingsAtuais') && tenantSvc.includes('...settingsAtuais');
  })(),
  'A edição da empresa deve carregar e fazer spread de settings — nunca apagar branding/communication.'
);

check(
  'atualizarDadosEmpresa faz merge de address (morada)',
  tenantSvc.includes('addressAtual') && tenantSvc.includes('...addressAtual'),
  'A morada deve ser merged em vez de sobrescrita.'
);

check(
  'atualizarDadosEmpresa preserva locale/moeda/fuso (país imutável)',
  // Substitui o antigo check de derivação: agora o país é fixo, logo o serviço
  // NÃO toca em locale/currency/timezone (apenas faz spread de settings).
  !tenantSvc.includes('countryToLocale') && tenantSvc.includes('...settingsAtuais'),
  'Com o país bloqueado, o serviço não deriva nem reescreve locale/moeda/fuso — preserva-os.'
);

check(
  'Validador de empresa cobre campos operacionais',
  (() => {
    const f = readSafe(join(SRC, 'lib', 'validators', 'empresa.ts'));
    // country e business_type estão deliberadamente FORA (imutáveis)
    return ['website', 'tax_id', 'street', 'city', 'postal_code']
      .every((k) => f.includes(k));
  })(),
  'O formulário de empresa deve incluir website, NIF/CPF e morada (sem país/nicho).'
);

check(
  'PainelEmpresa é editável (form + merge) e usa tenant real',
  (() => {
    const f = readSafe(join(SRC, 'components', 'features', 'configuracoes', 'PainelEmpresa.tsx'));
    return f.includes('useAtualizarEmpresa') && f.includes('useAuth') && !f.includes('MOCK_TENANT');
  })(),
  'PainelEmpresa deve editar dados reais do tenant via formulário.'
);

// ── Detalhe de cliente ───────────────────────────────────────────────────────
check(
  'ClienteDetalheModal existe',
  exists(join(SRC, 'components', 'features', 'clientes', 'ClienteDetalheModal.tsx')),
  'Deve existir um modal de detalhe do cliente.'
);

check(
  'Detalhe de cliente usa listarConsentimentosCliente na UI',
  readSafe(join(SRC, 'components', 'features', 'clientes', 'ClienteDetalheModal.tsx')).includes('listarConsentimentosCliente'),
  'O detalhe deve mostrar o histórico de consentimentos.'
);

check(
  'Detalhe de cliente mostra marcações (listarBookingsPorCliente)',
  (() => {
    const svc = readSafe(join(SRC, 'services', 'bookings.ts'));
    const ui  = readSafe(join(SRC, 'components', 'features', 'clientes', 'ClienteDetalheModal.tsx'));
    return svc.includes('listarBookingsPorCliente') && ui.includes('listarBookingsPorCliente');
  })(),
  'O detalhe deve listar as marcações do cliente.'
);

check(
  'Modal de cliente trata criar E editar (modo dual)',
  (() => {
    const f = readSafe(join(SRC, 'components', 'features', 'clientes', 'NovoClienteModal.tsx'));
    return f.includes('modoEdicao') && f.includes('useAtualizarCliente');
  })(),
  'O modal de cliente deve criar e editar.'
);

check(
  'Soft-delete de cliente via RPC (0017)',
  (() => {
    const mig = readSafe(join(MIGRATIONS, '0017_soft_delete_client.sql'));
    const svc = readSafe(join(SRC, 'services', 'clients.ts'));
    return mig.includes('soft_delete_client') && svc.includes("rpc('soft_delete_client'");
  })(),
  'O soft-delete de cliente deve passar por RPC com verificação de tenant + role.'
);

check(
  'Página de clientes abre o detalhe ao clicar',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dashboard', 'clientes', 'page.tsx'));
    return f.includes('ClienteDetalheModal') && f.includes('setDetalheId');
  })(),
  'Clicar num cliente deve abrir o detalhe.'
);

// ── Logo do tenant não pode derrubar o dashboard ─────────────────────────────
check(
  'next.config autoriza imagens do Supabase Storage (remotePatterns)',
  (() => {
    const f = readSafe(join(APP, 'next.config.ts'));
    return f.includes('remotePatterns') && f.includes('NEXT_PUBLIC_SUPABASE_URL');
  })(),
  'Sem remotePatterns, o next/image lança "hostname not configured" ao carregar o logo.'
);

check(
  'Logos do layout são resilientes (não derrubam a página)',
  (() => {
    // Os 3 componentes de layout que mostram o logo em TODAS as páginas devem
    // usar <img> com onError — uma URL inválida nunca pode crashar o dashboard.
    const files = [
      ['SidebarDesktop', 'SidebarDesktop'],
      ['SidebarTablet',  'SidebarTablet'],
      ['MobileHeader',   'MobileHeader'],
    ];
    return files.every(([dir, name]) => {
      const f = readSafe(join(SRC, 'components', 'layout', dir, `${name}.tsx`));
      // Renderiza o logo via <img onError> e já não usa next/image
      return f.includes('onError') && !f.includes("from 'next/image'");
    });
  })(),
  'Sidebars e MobileHeader devem renderizar o logo com <img onError>, não next/image.'
);

// ═══════════════════════════════════════════════════════════════════════════
// FASE — Testes Automatizados (Vitest)
// ═══════════════════════════════════════════════════════════════════════════
section('FASE — Testes Automatizados');

const pkg = readSafe(join(APP, 'package.json'));

check(
  'Script de teste definido (npm test)',
  /"test"\s*:\s*"vitest/.test(pkg),
  'Adicionar "test": "vitest run" ao package.json.'
);

check(
  'vitest.config.ts existe com alias @/',
  (() => {
    const f = readSafe(join(APP, 'vitest.config.ts'));
    return f.includes('vitest/config') && f.includes("'@'");
  })(),
  'Configurar o Vitest com o alias @/ → src/.'
);

check(
  'Existem testes de lógica pura (permissões, i18n, validadores)',
  (() => {
    return exists(join(SRC, 'lib', 'permissions', 'permissions.test.ts')) &&
           exists(join(SRC, 'lib', 'i18n', 'i18n.test.ts')) &&
           exists(join(SRC, 'lib', 'validators', 'validators.test.ts'));
  })(),
  'Devem existir testes para a lógica crítica (RBAC, derivação de país, validadores).'
);

// ═══════════════════════════════════════════════════════════════════════════
// FASE — País e Nicho imutáveis após criação
// ═══════════════════════════════════════════════════════════════════════════
section('FASE — País e Nicho Bloqueados Após Criação');

const empresaValidator = readSafe(join(SRC, 'lib', 'validators', 'empresa.ts'));
const tenantService    = readSafe(join(SRC, 'services', 'tenant.ts'));
const painelEmpresaTxt = readSafe(join(SRC, 'components', 'features', 'configuracoes', 'PainelEmpresa.tsx'));

check(
  'Migration 0018: trigger bloqueia country/nicho após onboarding',
  (() => {
    const f = readSafe(join(MIGRATIONS, '0018_lock_tenant_market.sql'));
    return f.includes('lock_tenant_market') &&
           f.includes('onboarding_completed = TRUE') &&
           f.includes('NEW.country') && f.includes('NEW.business_type');
  })(),
  'O trigger deve impedir alteração de country/business_type após onboarding_completed.'
);

check(
  'Migration 0018: SUPERADMIN e sistema podem alterar (excepção controlada)',
  (() => {
    const f = readSafe(join(MIGRATIONS, '0018_lock_tenant_market.sql'));
    return f.includes("'superadmin'") && f.includes('auth.uid() IS NOT NULL');
  })(),
  'A excepção deve ser apenas para superadmin / operações de sistema.'
);

check(
  'Validador de empresa NÃO inclui country nem business_type',
  (() => {
    return !/\bcountry\s*:\s*z\./.test(empresaValidator) &&
           !/\bbusiness_type\s*:\s*z\./.test(empresaValidator);
  })(),
  'country e business_type não podem ser editáveis no formulário da empresa.'
);

check(
  'atualizarDadosEmpresa NÃO escreve country/business_type/locale/currency/timezone',
  (() => {
    // Bloco do .update(...) não deve conter esses campos
    const i = tenantService.indexOf('.update({');
    const bloco = i >= 0 ? tenantService.slice(i, i + 400) : '';
    return bloco.length > 0 &&
           !bloco.includes('country:') && !bloco.includes('business_type:') &&
           !bloco.includes('locale') && !bloco.includes('currency') && !bloco.includes('timezone');
  })(),
  'O serviço de edição da empresa não pode tocar em país/nicho nem nos campos derivados.'
);

check(
  'PainelEmpresa mostra país/nicho só leitura com aviso de suporte',
  painelEmpresaTxt.includes('contacte o suporte') &&
    painelEmpresaTxt.includes('CampoBloqueado') &&
    !painelEmpresaTxt.includes("register('country')") &&
    !painelEmpresaTxt.includes("register('business_type')"),
  'País e nicho devem ser só leitura, com a nota "contacte o suporte".'
);

// ═══════════════════════════════════════════════════════════════════════════
// FASE — Gestão de Equipa Avançada
// ═══════════════════════════════════════════════════════════════════════════
section('FASE — Gestão de Equipa Avançada');

const equipaSvc  = readSafe(join(SRC, 'services', 'equipa.ts'));
const equipaPage = readSafe(join(SRC, 'app', 'dashboard', 'equipa', 'page.tsx'));
const sql0019    = readSafe(join(MIGRATIONS, '0019_team_management.sql'));

check(
  'Migration 0019: protege o único proprietário (suspender/despromover/remover)',
  sql0019.includes('protect_last_owner') &&
    sql0019.includes('único proprietário') &&
    /BEFORE UPDATE OR DELETE ON profiles/.test(sql0019),
  'Deve existir trigger que impede deixar o tenant sem proprietário activo.'
);

check(
  'Migration 0019: profiles.last_login_at',
  sql0019.includes('last_login_at'),
  'Deve registar o último acesso dos membros.'
);

check(
  'Serviço de equipa: alterar função (manager/receptionist/staff)',
  equipaSvc.includes('alterarRoleMembro') && equipaSvc.includes('RoleAtribuivel'),
  'O owner deve poder alterar a função de um membro.'
);

check(
  'Serviço de equipa: lista recurso associado e último acesso',
  equipaSvc.includes('resources(name)') && equipaSvc.includes('last_login_at'),
  'A listagem da equipa deve incluir recurso associado e último acesso.'
);

check(
  'LoginForm regista o último acesso',
  readSafe(join(SRC, 'components', 'features', 'auth', 'LoginForm.tsx')).includes('registarUltimoAcesso'),
  'O último acesso deve ser actualizado no login.'
);

check(
  'Página de equipa: modal de alterar função + proteções de owner/self',
  equipaPage.includes('AlterarRoleModal') &&
    equipaPage.includes("m.role !== 'owner'") &&
    equipaPage.includes('m.id !== profile?.id'),
  'A página deve permitir alterar função e proteger owner/próprio utilizador.'
);

// ═══════════════════════════════════════════════════════════════════════════
// FASE — Observabilidade e CI
// ═══════════════════════════════════════════════════════════════════════════
section('FASE — Observabilidade e CI');

const obsTxt = readSafe(join(SRC, 'lib', 'observability.ts'));

check(
  'Camada de observabilidade existe (reportError/reportMessage)',
  obsTxt.includes('export function reportError') && obsTxt.includes('export function reportMessage'),
  'Criar src/lib/observability.ts como ponto único de reporte de erros.'
);

check(
  'Observabilidade é vendor-agnóstica e pronta para Sentry',
  obsTxt.includes('flushToSink') && obsTxt.includes('Sentry'),
  'O envio deve estar isolado num único sink (troca para Sentry num só local).'
);

check(
  'Error boundaries reportam via observability',
  (() => {
    const e = readSafe(join(SRC, 'app', 'error.tsx'));
    const g = readSafe(join(SRC, 'app', 'global-error.tsx'));
    return e.includes('reportError') && g.includes('reportError');
  })(),
  'error.tsx e global-error.tsx devem encaminhar os erros para a observabilidade.'
);

check(
  '.env.example documenta o DSN do Sentry',
  readSafe(join(ROOT, '.env.example')).includes('NEXT_PUBLIC_SENTRY_DSN'),
  'Documentar a variável de DSN do Sentry para activar o envio.'
);

check(
  'Teste de observabilidade existe',
  exists(join(SRC, 'lib', 'observability.test.ts')),
  'Deve existir teste que confirme o encaminhamento de erros.'
);

check(
  'Workflow de CI corre lint + test + build + auditor',
  (() => {
    const ci = readSafe(join(ROOT, '.github', 'workflows', 'ci.yml'));
    return ci.includes('npm run lint') && ci.includes('npm test') &&
           ci.includes('npm run build') && ci.includes('audit-exodoflow-full.mjs');
  })(),
  'Criar .github/workflows/ci.yml que corre toda a verificação de qualidade.'
);

// ── Resiliência de sessão e logout ───────────────────────────────────────────
check(
  'Middleware e dashboard layout resistem a sessão corrompida (try/catch getUser)',
  (() => {
    const mw  = readSafe(join(APP, 'middleware.ts'));
    const lay = readSafe(join(SRC, 'app', 'dashboard', 'layout.tsx'));
    return /try\s*{[\s\S]*?getUser\(\)/.test(mw) && /try\s*{[\s\S]*?getUser\(\)/.test(lay);
  })(),
  'Uma sessão inválida não pode crashar o middleware nem o layout — redireccionar para login.'
);

check(
  'Logout é resiliente (centralizado no forceLogout)',
  // Substituído pelo forceLogout central (ver checks da FASE de estabilidade):
  // a resiliência vive em src/lib/auth/logout.ts, não duplicada em cada botão.
  readSafe(join(SRC, 'lib', 'auth', 'logout.ts')).includes('forceLogout'),
  'A lógica de logout resiliente deve estar centralizada em forceLogout.'
);

check(
  'Nenhum next/image em conteúdo de utilizador (logos via <img>)',
  (() => {
    // Não pode existir IMPORT de next/image (comentários a mencionar são ok)
    const ficheiros = collectFiles(SRC, ['.tsx']);
    return ficheiros.every((f) => !readSafe(f).includes("from 'next/image'"));
  })(),
  'Logos de utilizador devem usar <img> — o optimizer do next/image rejeita IPs privados.'
);

// ── Logout central + estabilidade de páginas ─────────────────────────────────
const logoutLib = readSafe(join(SRC, 'lib', 'auth', 'logout.ts'));

check(
  'forceLogout central existe e é robusto',
  (() => {
    return logoutLib.includes('export async function forceLogout') &&
           logoutLib.includes("scope: 'local'") &&
           logoutLib.includes('Max-Age=0') &&           // expira cookies sb-*
           logoutLib.includes('window.location.assign'); // redirect garantido
  })(),
  'forceLogout deve limpar sessão local, expirar cookies sb-* e redireccionar sempre.'
);

check(
  'Todos os botões de logout usam forceLogout (nada de signOut próprio)',
  (() => {
    const alvos = [
      join(SRC, 'components', 'layout', 'SidebarDesktop', 'SidebarDesktop.tsx'),
      join(SRC, 'components', 'layout', 'SidebarTablet', 'SidebarTablet.tsx'),
      join(SRC, 'components', 'features', 'auth', 'LogoutButton.tsx'),
    ];
    return alvos.every((f) => {
      const t = readSafe(f);
      return t.includes('forceLogout') && !t.includes('auth.signOut');
    });
  })(),
  'Os botões de logout devem usar o forceLogout central, não signOut próprio.'
);

check(
  'Dashboard não é refém das queries (cabeçalho sempre, loading/erro inline)',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dashboard', 'page.tsx'));
    // Não pode haver early-return de LoadingState antes do PageHeader
    return !/if\s*\(\s*loadingBookings\s*\|\|\s*loadingClientes\s*\)\s*return\s*<LoadingState/.test(f) &&
           f.includes('carregando ?') && f.includes('<PageHeader');
  })(),
  'O dashboard deve renderizar o cabeçalho sempre e mostrar loading/erro no corpo.'
);

check(
  'Agenda não é refém das queries (cabeçalho + modais sempre)',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dashboard', 'agenda', 'page.tsx'));
    return !/if\s*\(\s*isLoading\s*\)\s*return\s*<LoadingState/.test(f) &&
           f.includes('isLoading ?') && f.includes('NovaBookingModal');
  })(),
  'A agenda deve manter cabeçalho e modais sempre disponíveis, com loading/erro no corpo.'
);

check(
  '/dev/diagnostics existe e é bloqueado em produção',
  (() => {
    const f = readSafe(join(SRC, 'app', 'dev', 'diagnostics', 'page.tsx'));
    return exists(join(SRC, 'app', 'dev', 'diagnostics', 'page.tsx')) &&
           f.includes("NODE_ENV === 'production'") && f.includes('notFound');
  })(),
  'A página de diagnóstico deve devolver 404 em produção.'
);

check(
  'ConversationList/MessageBubble com timeZone fixo (sem erro de hidratação)',
  (() => {
    const cl = readSafe(join(SRC, 'components', 'features', 'whatsapp-simulator', 'ConversationList.tsx'));
    const mb = readSafe(join(SRC, 'components', 'features', 'whatsapp-simulator', 'MessageBubble.tsx'));
    // não usa new Date() (now) no formato e fixa timeZone
    return !cl.includes('const now = new Date()') && cl.includes("timeZone: 'Europe/Lisbon'") &&
           mb.includes("timeZone: 'Europe/Lisbon'");
  })(),
  'Datas/horas dos simuladores devem ter timeZone fixo — evita erro de hidratação.'
);

// ═══════════════════════════════════════════════════════════════════════════
// FASE 9.9 — HARDENING DE PRODUTO
// (sem db reset como fluxo normal; país/nicho imutáveis no cliente; branding simples)
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 9.9 — Hardening de Produto');

// Bloco isolado para não colidir com identificadores de fases anteriores.
{
// Extrai o corpo de uma função (entre a sua declaração e o próximo export de função)
function fnBody(src, name) {
  const start = src.indexOf(`function ${name}`);
  if (start === -1) return '';
  const after = src.indexOf('\nexport ', start + 1);
  return src.slice(start, after === -1 ? undefined : after);
}

// ── REGRA 1: db reset NÃO é fluxo normal na documentação ─────────────────────
const manualMd = readSafe(join(ROOT, 'MANUAL_E_TESTES.md'));

check(
  'Regra 1: manual usa "supabase migration up" como arranque normal',
  /supabase migration up/.test(manualMd) && /Fluxo normal[\s\S]{0,40}migration up/i.test(manualMd),
  'No MANUAL_E_TESTES.md, o arranque normal deve ser `npx supabase migration up`.'
);

check(
  'Regra 1: bloco de arranque (```bash) não recomenda "db reset"',
  (() => {
    const m = manualMd.match(/```bash[\s\S]*?```/);
    return m ? !/db reset/.test(m[0]) : true;
  })(),
  'O primeiro bloco de comandos de arranque não deve conter `supabase db reset`.'
);

check(
  'Regra 1: manual marca "db reset" como destrutivo / proibido sem autorização',
  /db reset[\s\S]{0,80}(DESTRUTIV|não usar sem autoriza)/i.test(manualMd),
  'Marcar `supabase db reset` como destrutivo e fora do fluxo normal.'
);

// ── REGRA 2: cliente NÃO troca de nicho/template ─────────────────────────────
const onboardingSvc = readSafe(join(SRC, 'services', 'onboarding.ts'));

check(
  'Regra 2: onboarding não reescreve o nicho (sem salvarNicho a gravar business_type)',
  /export async function confirmarNicho/.test(onboardingSvc) &&
  !/salvarNicho/.test(onboardingSvc) &&
  !/business_type/.test(fnBody(onboardingSvc, 'confirmarNicho')),
  'O passo do nicho deve apenas avançar (confirmarNicho), sem gravar business_type.'
);

const step2Nicho = readSafe(join(SRC, 'components', 'features', 'onboarding', 'steps', 'Step2Nicho.tsx'));
check(
  'Regra 2: Step2Nicho é só leitura (sem grelha de selecção de templates)',
  !/NICHE_TEMPLATES\.map/.test(step2Nicho) &&
  /(Definido na cria|imutável|contacte o suporte)/i.test(step2Nicho),
  'O passo do nicho deve mostrar o nicho atribuído (leitura), sem permitir trocar.'
);

const painelTemplates = readSafe(join(SRC, 'components', 'features', 'configuracoes', 'PainelTemplates.tsx'));
check(
  'Regra 2: PainelTemplates é só visualização do template atribuído (sem "Aplicar")',
  !/Aplicar template/i.test(painelTemplates) && /niche/.test(painelTemplates),
  'O painel de templates deve mostrar só o template do nicho, sem aplicar/trocar.'
);

// ── REGRA 3: cliente NÃO troca de país ───────────────────────────────────────
check(
  'Regra 3: onboarding não reescreve o país (salvarEmpresa sem chave country:)',
  !/country\s*:/.test(fnBody(onboardingSvc, 'salvarEmpresa')),
  'salvarEmpresa não deve gravar country — definido na criação da empresa.'
);

const empresaValidator = readSafe(join(SRC, 'lib', 'validators', 'empresa.ts'));
check(
  'Regra 3: validador de edição da empresa não aceita country nem business_type',
  !/country\s*:/.test(empresaValidator) && !/business_type\s*:/.test(empresaValidator),
  'atualizarEmpresaSchema não deve ter campos country/business_type.'
);

const step1Empresa = readSafe(join(SRC, 'components', 'features', 'onboarding', 'steps', 'Step1Empresa.tsx'));
check(
  'Regra 3: Step1Empresa mostra país só leitura (sem setValue("country"))',
  !/setValue\(\s*['"]country['"]/.test(step1Empresa) &&
  /(Definido na cria|Lock)/.test(step1Empresa),
  'O país no onboarding deve ser apenas leitura (sem botões de troca).'
);

const painelLocalizacao = readSafe(join(SRC, 'components', 'features', 'configuracoes', 'PainelLocalizacao.tsx'));
check(
  'Regra 3: PainelLocalizacao não sugere trocar o país no separador Empresa',
  !/altere o país no separador/i.test(painelLocalizacao),
  'O texto de localização deve indicar que o país é definido na criação (suporte).'
);

// ── REGRA 4: branding simplificado (sem secondary_color) ─────────────────────
check(
  'Regra 4: sem referência operacional a secondary_color / --tenant-secondary em src',
  (() => {
    for (const f of collectFiles(SRC, ['.ts', '.tsx', '.css'])) {
      for (const line of readSafe(f).split('\n')) {
        const hit = /secondary_color|tenant-secondary|DEFAULT_SECONDARY/.test(line);
        const isComment = /^\s*\/\/|^\s*\*|removid|removed/.test(line);
        if (hit && !isComment) return false;
      }
    }
    return true;
  })(),
  'Eliminar secondary_color / --tenant-secondary / DEFAULT_SECONDARY_COLOR do código.'
);

const brandingValidator = readSafe(join(SRC, 'lib', 'validators', 'branding.ts'));
check(
  'Regra 4: schema de branding só tem primary_color + logo + theme_mode',
  /primary_color/.test(brandingValidator) && !/secondary_color\s*:/.test(brandingValidator),
  'brandingSettingsSchema não deve incluir secondary_color.'
);

const brandingProvider = readSafe(join(SRC, 'providers', 'BrandingProvider.tsx'));
check(
  'Regra 4: BrandingProvider aplica --tenant-primary e não --tenant-secondary',
  /--tenant-primary/.test(brandingProvider) && !/--tenant-secondary/.test(brandingProvider),
  'O BrandingProvider deve definir apenas a variável --tenant-primary.'
);

const globalsCss = readSafe(join(SRC, 'app', 'globals.css'));
check(
  'Regra 4: globals.css define --tenant-primary e não --tenant-secondary',
  /--tenant-primary/.test(globalsCss) && !/--tenant-secondary/.test(globalsCss),
  'Remover --tenant-secondary de globals.css.'
);

const tenantTypes = readSafe(join(SRC, 'types', 'domain', 'tenant.ts'));
check(
  'Regra 4: interface BrandingSettings (tipos) sem secondary_color',
  !/secondary_color/.test(tenantTypes),
  'Remover secondary_color da interface BrandingSettings.'
);

check(
  'Regra 4: migração 0020 remove settings.branding.secondary_color (não-destrutiva)',
  (() => {
    const m = readSafe(join(MIGRATIONS, '0020_simplify_branding.sql'));
    return /secondary_color/.test(m) && /#-/.test(m) && /UPDATE tenants/i.test(m);
  })(),
  'Criar a migração 0020 que remove apenas a chave branding.secondary_color do JSONB.'
);

// ── REGRA 5: branding/logo/onboarding continuam funcionais ───────────────────
const painelBranding = readSafe(join(SRC, 'components', 'features', 'configuracoes', 'PainelBranding.tsx'));
check(
  'Regra 5: PainelBranding mantém cor principal + upload de logótipo',
  /primary_color/.test(painelBranding) && /LogoUpload/.test(painelBranding),
  'O painel de branding deve manter o seletor de cor principal e o upload de logo.'
);

check(
  'Regra 5: criação de empresa (superadmin) define país + nicho na origem',
  (() => {
    const route = readSafe(join(SRC, 'app', 'api', 'admin', 'criar-empresa', 'route.ts'));
    const adminValidator = readSafe(join(SRC, 'lib', 'validators', 'admin.ts'));
    return /country/.test(route) && /business_type/.test(route) &&
           /country/.test(adminValidator) && /business_type/.test(adminValidator);
  })(),
  'O handler /api/admin/criar-empresa e o validador admin devem definir país+nicho.'
);
} // fim do bloco isolado FASE 9.9

// ═══════════════════════════════════════════════════════════════════════════
// FASE 19 — WHATSAPP CLOUD API 1B (resposta manual outbound, sem IA, sem templates)
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 19 — WhatsApp Cloud API 1B (outbound manual)');

{
const outbound = readSafe(join(SRC, 'services', 'whatsapp-outbound.ts'));
const sendRoute = readSafe(join(SRC, 'app', 'api', 'whatsapp', 'send-message', 'route.ts'));
const waSvc = readSafe(join(SRC, 'services', 'whatsapp.ts'));

check(
  '1B: /api/whatsapp/send-message existe (POST, autenticado, server-side)',
  exists(join(SRC, 'app', 'api', 'whatsapp', 'send-message', 'route.ts')) &&
  /export async function POST/.test(sendRoute) && /getUser\(\)/.test(sendRoute),
  'Deve existir a route POST /api/whatsapp/send-message autenticada.'
);
check(
  '1B: permissão conversas.reply (OWNER/MANAGER/RECEPTIONIST; STAFF não) + tenant da sessão',
  /canAccess\([^)]*'conversas\.reply'\)/.test(sendRoute) &&
  /profile\.tenant_id/.test(sendRoute) && !/body\.tenant_id/.test(sendRoute),
  'O envio deve exigir conversas.reply e usar o tenant da sessão (nunca do browser).'
);
check(
  '1B: envio outbound é server-side e o access_token vem do canal (nunca no browser)',
  /createAdminClient/.test(outbound) && /access_token/.test(outbound) &&
  /graph\.facebook\.com/.test(outbound) &&
  !/^\s*['"]use client['"]/m.test(outbound),
  'O serviço de envio deve correr no servidor e ler o access_token do canal.'
);
check(
  '1B: janela de 24h validada (bloqueia fora da janela)',
  /JANELA_24H_MS/.test(outbound) && /24 \* 60 \* 60 \* 1000/.test(outbound) &&
  /janela de 24h/i.test(outbound),
  'O envio deve validar a janela de 24h e bloquear fora dela.'
);
check(
  '1B: grava mensagem outbound (direction=outbound, sent, não-IA) + communication_log SENT/FAILED',
  /direction:\s*'outbound'/.test(outbound) && /processed_status:\s*'sent'/.test(outbound) &&
  /is_ai_generated:\s*false/.test(outbound) &&
  /communication_logs/.test(outbound) && /status:\s*'failed'/.test(outbound) &&
  /(status:\s*isMock \? 'simulated' : 'sent'|status:\s*'sent')/.test(outbound),
  'Deve gravar a mensagem outbound e um communication_log SENT/SIMULATED/FAILED.'
);
check(
  '1B: modo mock seguro (WHATSAPP_OUTBOUND_MOCK) — sem chamar a Meta',
  /WHATSAPP_OUTBOUND_MOCK/.test(outbound) && /useMock/.test(outbound) &&
  exists(join(ROOT, 'docs', 'whatsapp-phase-1b.md')) &&
  /WHATSAPP_OUTBOUND_MOCK/.test(readSafe(join(ROOT, 'docs', 'whatsapp-phase-1b.md'))),
  'Deve existir o modo mock documentado que não chama a Meta.'
);
check(
  '1B: NÃO chama IA e NÃO usa templates iniciados pelo negócio',
  !/openai|gemini|anthropic|generateContent/i.test(outbound + sendRoute) &&
  !/type:\s*'template'/.test(outbound) && /type:\s*'text'/.test(outbound),
  'A Fase 1B não pode chamar IA nem enviar templates (só texto de sessão).'
);
check(
  '1B: atribuição (assigned_to) + estado da conversa + notas internas (que NÃO viram mensagens)',
  /atribuirConversa/.test(waSvc) && /assigned_to/.test(waSvc) &&
  /definirStatusConversa/.test(waSvc) &&
  /guardarNotaInterna/.test(waSvc) && /internal_notes/.test(waSvc) &&
  !/whatsapp_messages/.test((waSvc.split('guardarNotaInterna')[1] ?? '').split('export')[0]),
  'Devem existir atribuição/estado/notas; as notas nunca podem gerar mensagens WhatsApp.'
);
check(
  '1B: acções geram audit log (enviar/atribuir/estado/nota), sem tokens nos metadados',
  /whatsapp\.send/.test(sendRoute) &&
  /whatsapp\.assign/.test(waSvc) && /whatsapp\.status/.test(waSvc) && /whatsapp\.note/.test(waSvc) &&
  // o access_token nunca é lido pela route (só pelo serviço server-side); a route
  // só o menciona em comentário. Garantir que não vai para os metadados de auditoria.
  !/record_audit_log[\s\S]*access_token/.test(sendRoute),
  'As acções de WhatsApp devem ser auditadas e nunca registar o access_token nos metadados.'
);
check(
  '1B: UI com input de resposta humana + bloqueios (janela/canal/fechada)',
  (() => {
    const page = readSafe(join(SRC, 'app', 'dashboard', 'conversas', 'page.tsx'));
    const chat = readSafe(join(SRC, 'components', 'features', 'whatsapp-simulator', 'ChatWindow.tsx'));
    return /enviarRespostaManual/.test(page) && /canSend/.test(page) && /blockedReason/.test(page) &&
           /Resposta humana/.test(chat);
  })(),
  'A UI deve ter input de resposta humana com bloqueios e o label "Resposta humana".'
);
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 20 — WHATSAPP CLOUD API 1C (templates operacionais, sem IA, sem automação)
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 20 — WhatsApp Cloud API 1C (templates)');

{
const tplSvc    = readSafe(join(SRC, 'services', 'whatsapp-templates.ts'));
const tplRoute  = readSafe(join(SRC, 'app', 'api', 'whatsapp', 'send-template', 'route.ts'));
const tplComp   = readSafe(join(SRC, 'components', 'features', 'agenda', 'EnviarTemplateWhatsApp.tsx'));
const tplHook   = readSafe(join(SRC, 'hooks', 'useWhatsAppTemplates.ts'));
const agendaPg  = readSafe(join(SRC, 'app', 'dashboard', 'agenda', 'page.tsx'));
const tplDoc    = readSafe(join(ROOT, 'docs', 'whatsapp-phase-1c-templates.md'));
const migAll    = getMigrations();

check(
  '1C: /api/whatsapp/send-template existe (POST, autenticado, server-side)',
  exists(join(SRC, 'app', 'api', 'whatsapp', 'send-template', 'route.ts')) &&
  /export async function POST/.test(tplRoute) && /getUser\(\)/.test(tplRoute),
  'Deve existir a route POST /api/whatsapp/send-template autenticada.'
);
check(
  '1C: permissão conversas.reply (OWNER/MANAGER/RECEPTIONIST; STAFF não) + tenant da sessão',
  /canAccess\([^)]*'conversas\.reply'\)/.test(tplRoute) &&
  /profile\.tenant_id/.test(tplRoute) && !/body\.tenant_id/.test(tplRoute),
  'O envio de template deve exigir conversas.reply e usar o tenant da sessão (nunca do browser).'
);
check(
  '1C: campos Meta do template existem na BD (migração 0028)',
  /provider/.test(migAll) && /meta_template_name/.test(migAll) &&
  /meta_language_code/.test(migAll) && /meta_category/.test(migAll) &&
  /meta_status/.test(migAll) && /variables/.test(migAll) &&
  /booking_reminder_2h/.test(migAll) && /booking_reschedule/.test(migAll),
  'A migração 0028 deve adicionar os campos Meta e os novos propósitos de template.'
);
check(
  '1C: envio de template é server-side e o access_token vem do canal (nunca no browser)',
  /createAdminClient/.test(tplSvc) && /access_token/.test(tplSvc) &&
  /graph\.facebook\.com/.test(tplSvc) && /type:\s*'template'/.test(tplSvc) &&
  !/^\s*['"]use client['"]/m.test(tplSvc),
  'O serviço de template deve correr no servidor e ler o access_token do canal.'
);
check(
  '1C: valida booking∈tenant + telefone + template activo + canal activo',
  /\.eq\('tenant_id', input\.tenant_id\)/.test(tplSvc) && /no-booking/.test(tplSvc) &&
  /no-phone/.test(tplSvc) && /no-template/.test(tplSvc) && /no-channel/.test(tplSvc),
  'O envio deve validar marcação do tenant, telefone do cliente, template e canal.'
);
check(
  '1C: grava communication_log para enviado/falhou/não-configurado/canal-inactivo/telefone',
  /communication_logs/.test(tplSvc) &&
  /status:\s*isMock \? 'simulated' : 'sent'/.test(tplSvc) &&
  /Cliente sem telefone/.test(tplSvc) && /Template não configurado/.test(tplSvc) &&
  /Canal WhatsApp inactivo/.test(tplSvc),
  'Deve gravar logs para sucesso e cada bloqueio (sem token).'
);
check(
  '1C: modo mock seguro (WHATSAPP_TEMPLATE_MOCK) — sem chamar a Meta — documentado',
  /WHATSAPP_TEMPLATE_MOCK/.test(tplSvc) &&
  exists(join(ROOT, 'docs', 'whatsapp-phase-1c-templates.md')) &&
  /WHATSAPP_TEMPLATE_MOCK/.test(tplDoc),
  'Deve existir o modo mock documentado que não chama a Meta.'
);
check(
  '1C: agenda tem acções manuais de template (botão WhatsApp + tooltip se inactivo)',
  exists(join(SRC, 'components', 'features', 'agenda', 'EnviarTemplateWhatsApp.tsx')) &&
  /EnviarTemplateWhatsApp/.test(agendaPg) && /channelAtivo/.test(agendaPg) &&
  /WhatsApp não configurado/.test(tplComp) && /useEnviarTemplate/.test(tplHook),
  'A agenda deve mostrar acções manuais de template, desactivadas com tooltip se o canal estiver inactivo.'
);
check(
  '1C: NÃO chama IA e o envio é MANUAL (sem automação/agendamento)',
  !/openai|gemini|anthropic|generateContent/i.test(tplSvc + tplRoute + tplComp) &&
  // automação real: setInterval, cron job ou .schedule( — "reschedule" (propósito) é legítimo
  !/setInterval\(|\bcron\b|\.schedule\(/i.test(tplSvc + tplComp),
  'A Fase 1C não pode chamar IA nem disparar envios automáticos.'
);
check(
  '1C: acção de envio gera audit log (whatsapp.send_template) sem tokens',
  /whatsapp\.send_template/.test(tplRoute) &&
  !/record_audit_log[\s\S]*access_token/.test(tplRoute),
  'O envio de template deve ser auditado e nunca registar o access_token.'
);
check(
  '1C: cada tenant novo nasce com canais (inactivos) + 5 templates WhatsApp',
  (() => {
    const seed   = readSafe(join(SRC, 'services', 'comunicacao-seed.ts'));
    const criar  = readSafe(join(SRC, 'app', 'api', 'admin', 'criar-empresa', 'route.ts'));
    return /semearComunicacaoTenant/.test(seed) &&
           /communication_channels/.test(seed) && /communication_templates/.test(seed) &&
           /booking_confirmation/.test(seed) && /booking_reschedule/.test(seed) &&
           /ignoreDuplicates:\s*true/.test(seed) &&
           /semearComunicacaoTenant\(/.test(criar);
  })(),
  'A criação da empresa deve semear canais e os 5 templates WhatsApp (idempotente).'
);
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 21 — F1: Localização/Fiscalidade PT/BR + Dados da Empresa
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 21 — F1 Localização/Fiscalidade PT/BR + Empresa');

{
const taxId   = readSafe(join(SRC, 'lib', 'i18n', 'tax-id.ts'));
const labels  = readSafe(join(SRC, 'lib', 'i18n', 'labels.ts'));
const market  = readSafe(join(SRC, 'lib', 'i18n', 'market.ts'));
const valEmp  = readSafe(join(SRC, 'lib', 'validators', 'empresa.ts'));
const svcTen  = readSafe(join(SRC, 'services', 'tenant.ts'));
const svcAdm  = readSafe(join(SRC, 'services', 'admin.ts'));
const painelE = readSafe(join(SRC, 'components', 'features', 'configuracoes', 'PainelEmpresa.tsx'));
const novoCli = readSafe(join(SRC, 'components', 'features', 'clientes', 'NovoClienteModal.tsx'));
const detCli  = readSafe(join(SRC, 'components', 'features', 'clientes', 'ClienteDetalheModal.tsx'));
const modalP  = readSafe(join(SRC, 'components', 'features', 'admin', 'AlterarPaisModal.tsx'));
const criar   = readSafe(join(SRC, 'app', 'api', 'admin', 'criar-empresa', 'route.ts'));

check(
  'F1: tax-id país-aware — PT só NIF; BR escolhe CPF (PF) / CNPJ (PJ)',
  /getTaxIdOptions/.test(taxId) && /isTaxIdTypeForCountry/.test(taxId) &&
  /'cpf'.*'cnpj'|cpf[\s\S]*cnpj/.test(taxId) && /defaultTaxIdType/.test(taxId),
  'tax-id.ts deve oferecer NIF para PT e CPF/CNPJ (PF/PJ) para BR, com validação de país.'
);
check(
  'F1: REGRA fiscal sem hardcode "NIF / CPF" na UI (empresa + clientes)',
  !/"NIF \/ CPF"|'NIF \/ CPF'|NIF \/ CPF \/ CNPJ/.test(painelE + novoCli + detCli) &&
  /getTaxIdLabel|fiscalLabel/.test(painelE) && /fiscalLabel/.test(novoCli) && /fiscalLabel/.test(detCli),
  'Os campos fiscais devem usar labels país-aware, sem "NIF / CPF" fixo.'
);
check(
  'F1: labels têm distrito/estado (PT distrito, BR estado)',
  /distrito/.test(labels) && /estado/.test(labels),
  'labels.ts deve distinguir distrito (PT) de estado (BR).'
);
check(
  'F1: novos campos da empresa (instagram/facebook/maps/observações) no validador + serviço',
  /instagram/.test(valEmp) && /facebook/.test(valEmp) && /google_maps_url/.test(valEmp) && /internal_notes/.test(valEmp) &&
  /instagram/.test(svcTen) && /google_maps_url/.test(svcTen) && /internal_notes/.test(svcTen),
  'Os campos operacionais novos devem existir no validador e ser persistidos (settings JSONB).'
);
check(
  'F1: derivação de mercado centralizada (market.ts) e usada no criar-empresa',
  exists(join(SRC, 'lib', 'i18n', 'market.ts')) &&
  /deriveMarketSettings/.test(market) && /deriveMarketSettings/.test(criar) &&
  !/COUNTRY_TIMEZONE|COUNTRY_CURRENCY/.test(criar),
  'O criar-empresa deve usar deriveMarketSettings (sem mapas país→moeda/fuso duplicados).'
);
check(
  'F1: superadmin altera país com confirmação forte (nome) + re-deriva mercado + auditoria',
  /definirPaisTenant/.test(svcAdm) && /tenant\.country_change/.test(svcAdm) &&
  /deriveMarketSettings/.test(svcAdm) &&
  /confirmacao\s*===\s*empresa\.name|empresa\.name\.trim\(\)/.test(modalP),
  'A troca de país (superadmin) deve exigir o nome da empresa, re-derivar moeda/fuso/locale e auditar.'
);
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 18 — WHATSAPP CLOUD API 1A (webhook inbound real, sem envio, sem IA)
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 18 — WhatsApp Cloud API 1A (inbound)');

{
const webhook = readSafe(join(SRC, 'app', 'api', 'whatsapp', 'webhook', 'route.ts'));
const inbound = readSafe(join(SRC, 'lib', 'whatsapp', 'inbound.ts'));
const sig     = readSafe(join(SRC, 'lib', 'whatsapp', 'signature.ts'));
const migAll  = getMigrations();

check(
  '1A: webhook /api/whatsapp/webhook existe (GET handshake + POST inbound)',
  exists(join(SRC, 'app', 'api', 'whatsapp', 'webhook', 'route.ts')) &&
  /export async function GET/.test(webhook) && /export async function POST/.test(webhook),
  'Deve existir /api/whatsapp/webhook com GET (handshake) e POST (inbound).'
);
check(
  '1A: GET valida hub.verify_token e devolve hub.challenge (403 se inválido)',
  /hub\.verify_token/.test(webhook) && /hub\.challenge/.test(webhook) &&
  /WHATSAPP_VERIFY_TOKEN/.test(webhook) && /403/.test(webhook),
  'O GET deve validar o verify_token e devolver o challenge, ou 403.'
);
check(
  '1A: validação da assinatura X-Hub-Signature-256 (HMAC, tempo constante)',
  /verifyMetaSignature/.test(webhook) && /x-hub-signature-256/i.test(webhook) &&
  /createHmac\(\s*'sha256'/.test(sig) && /timingSafeEqual/.test(sig),
  'O POST deve validar a assinatura HMAC-SHA256 em tempo constante.'
);
check(
  '1A: unsigned só em DEV por flag explícita (nunca em produção)',
  /WHATSAPP_WEBHOOK_ALLOW_UNSIGNED_DEV/.test(webhook) &&
  /NODE_ENV === 'production'/.test(webhook) &&
  /(401)/.test(webhook),
  'Sem assinatura só pode ser aceite em dev com a flag; produção bloqueia (401).'
);
check(
  '1A: resolve o tenant pelo phone_number_id (canal whatsapp activo)',
  /phone_number_id/.test(inbound) && /communication_channels/.test(inbound) &&
  /is_active/.test(inbound) && /createAdminClient/.test(inbound),
  'O mapper deve resolver o tenant pelo phone_number_id num canal activo (service_role).'
);
check(
  '1A: mapper grava conversa + mensagem inbound com payload CRU + pending',
  /whatsapp_conversations/.test(inbound) && /whatsapp_messages/.test(inbound) &&
  /direction:\s*'inbound'/.test(inbound) && /payload:/.test(inbound) &&
  /processed_status:\s*'pending'/.test(inbound) && /is_ai_generated:\s*false/.test(inbound),
  'O mapper deve gravar conversa + mensagem inbound (payload cru, pending, não-IA).'
);
check(
  '1A: idempotência por wa_message_id (índice único + check-before-insert + guarda 23505)',
  /uq_wa_messages_tenant_message/.test(migAll) &&
  /ON whatsapp_messages \(tenant_id, wa_message_id\)/.test(migAll) &&
  /eq\('wa_message_id'/.test(inbound) && /result\.duplicates/.test(inbound) && /23505/.test(inbound),
  'Deve haver índice único (tenant_id, wa_message_id) + verificação antes de inserir + guarda de corrida.'
);
check(
  '1A: status callbacks (delivered/read/failed) sem crashar se a msg não existir',
  /value\.statuses/.test(inbound) && /delivered_at/.test(inbound) && /read_at/.test(inbound) &&
  /inexistente/i.test(inbound),
  'Os status callbacks devem actualizar delivered_at/read_at e ignorar mensagens inexistentes.'
);
check(
  '1A: rate-limit no webhook + payload cru guardado',
  /checkRateLimit/.test(webhook) && /payload:/.test(inbound),
  'O webhook deve ter rate-limit e guardar o payload cru para auditoria.'
);
check(
  '1A: NÃO chama IA nesta fase (sem openai/gemini/anthropic no fluxo do webhook)',
  !/openai|gemini|anthropic|generateContent|chat\.completions/i.test(webhook + inbound),
  'A Fase 1A não pode chamar IA.'
);
check(
  '1A: docs/whatsapp-phase-1a.md + fixtures de teste existem',
  exists(join(ROOT, 'docs', 'whatsapp-phase-1a.md')) &&
  exists(join(ROOT, 'tests', 'fixtures', 'whatsapp', 'inbound-text.json')) &&
  exists(join(ROOT, 'tests', 'fixtures', 'whatsapp', 'inbound-duplicate.json')) &&
  exists(join(ROOT, 'tests', 'fixtures', 'whatsapp', 'inbound-status-delivered.json')) &&
  exists(join(ROOT, 'tests', 'fixtures', 'whatsapp', 'unknown-phone-number-id.json')),
  'Devem existir os docs da Fase 1A e as 4 fixtures de teste.'
);
check(
  '1A: UI conversas mostra real se houver + caixa de resposta desativada',
  (() => {
    const page = readSafe(join(SRC, 'app', 'dashboard', 'conversas', 'page.tsx'));
    const chat = readSafe(join(SRC, 'components', 'features', 'whatsapp-simulator', 'ChatWindow.tsx'));
    return /listarConversasReais/.test(page) && /temReais/.test(page) &&
           /próxima fase/i.test(chat) && /disabled/.test(chat);
  })(),
  'A UI deve mostrar conversas reais quando existirem e manter a resposta desativada.'
);
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 17 — SEGURANÇA PRÁTICA: RESET PASSWORD + BACKUP + QA/PERF DOCS
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 17 — Reset Password + Backup + QA/Perf');

{
// ── Reset de password ────────────────────────────────────────────────────────
check(
  'PW: /forgot-password com resetPasswordForEmail e mensagem neutra',
  exists(join(SRC, 'app', 'forgot-password', 'page.tsx')) &&
  (() => {
    const f = readSafe(join(SRC, 'components', 'features', 'auth', 'ForgotPasswordForm.tsx'));
    return /resetPasswordForEmail/.test(f) && /Se este e-mail existir/i.test(f);
  })(),
  'Deve existir /forgot-password que chama resetPasswordForEmail e mostra mensagem neutra.'
);
check(
  'PW: /reset-password define nova senha (updateUser) + trata link expirado + redirect login',
  exists(join(SRC, 'app', 'reset-password', 'page.tsx')) &&
  (() => {
    const r = readSafe(join(SRC, 'components', 'features', 'auth', 'ResetPasswordForm.tsx'));
    return /updateUser\(\s*\{\s*password/.test(r) && /(expirou|inválido|invalido)/i.test(r) && /\/login/.test(r);
  })(),
  'Deve existir /reset-password que usa updateUser({password}), trata token expirado e volta ao login.'
);
check(
  'PW: validação de senha FORTE (8+, 1 letra, 1 número) partilhada',
  (() => {
    const a = readSafe(join(SRC, 'lib', 'validators', 'auth.ts'));
    const p = readSafe(join(SRC, 'lib', 'validators', 'perfil.ts'));
    const forte = /strongPassword/.test(a) && /\[A-Za-z\]/.test(a) && /\[0-9\]/.test(a);
    return forte && /strongPassword/.test(p);  // perfil reutiliza a mesma regra
  })(),
  'A regra de senha forte (letra + número) deve existir e ser reutilizada no perfil.'
);
check(
  'PW: alterar senha logado usa updateUser({password})',
  /updateUser\(\s*\{\s*password/.test(readSafe(join(SRC, 'services', 'perfil.ts'))),
  'O perfil deve permitir alterar a palavra-passe via supabase.auth.updateUser.'
);
check(
  'PW: login tem ligação para /forgot-password',
  /forgot-password/.test(readSafe(join(SRC, 'app', 'login', 'page.tsx'))),
  'A página de login deve ligar a /forgot-password.'
);
check(
  'PW: callback de auth não faz open redirect (next só relativo)',
  (() => {
    const c = readSafe(join(SRC, 'app', 'auth', 'callback', 'route.ts'));
    return /next/.test(c) && /\^\\\/\(\?!\\\/\)/.test(c);  // regex ^/(?!/) anti open-redirect
  })(),
  'O callback deve validar o parâmetro next como caminho relativo (anti open-redirect).'
);

// ── Senha padrão / dev-only ──────────────────────────────────────────────────
check(
  'PW: senhas de seed marcadas DEV ONLY (não usar em produção)',
  (() => {
    const seed = readSafe(join(SUPABASE, 'seed.sql'));
    return /DEV ONLY/i.test(seed) && /(test1234|admin12345)/.test(seed) && /produção/i.test(seed);
  })(),
  'As senhas de teste no seed devem estar marcadas como DEV ONLY com aviso de produção.'
);
check(
  'PW: senha fraca padrão não aparece fora do seed/docs (código-fonte limpo)',
  (() => {
    for (const f of collectFiles(SRC, ['.ts', '.tsx'])) {
      if (/admin12345|test1234/.test(readSafe(f))) return false;
    }
    return true;
  })(),
  'As senhas padrão não podem estar hard-coded no código-fonte da app.'
);

// ── Docs ─────────────────────────────────────────────────────────────────────
check('DOC: backup-and-recovery.md existe',  exists(join(ROOT, 'docs', 'backup-and-recovery.md')),  'Criar docs/backup-and-recovery.md.');
check('DOC: mobile-qa-checklist.md existe',  exists(join(ROOT, 'docs', 'mobile-qa-checklist.md')),  'Criar docs/mobile-qa-checklist.md.');
check('DOC: performance-review.md existe',   exists(join(ROOT, 'docs', 'performance-review.md')),   'Criar docs/performance-review.md.');
check(
  'DOC: backup reforça NÃO usar db reset com dados reais',
  /NÃO.{0,20}db reset|db reset.{0,40}(dados reais|proibid)/i.test(readSafe(join(ROOT, 'docs', 'backup-and-recovery.md'))),
  'O doc de backup deve reforçar a proibição de db reset com dados reais.'
);
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 16 — WHATSAPP FASE 0 (preparação) + HARDENING DE SEGURANÇA
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 16 — WhatsApp Fase 0 + Hardening de Segurança');

{
const migWa = getMigrations();

// ── WhatsApp Fase 0 (sem integração real) ────────────────────────────────────
check(
  'WA0: página Conversas identificada como SIMULADOR (WhatsApp real não ligado)',
  (() => {
    const c = readSafe(join(SRC, 'app', 'dashboard', 'conversas', 'page.tsx'));
    return /SIMULADOR/.test(c) && /ainda não está ligado/i.test(c) && /MOCK_/.test(c);
  })(),
  'A página de conversas deve avisar que é simulador e que o WhatsApp real não está ligado.'
);
check(
  'WA0: secção WhatsApp em Configurações (Não configurado + botão "em breve")',
  (() => {
    const p = readSafe(join(SRC, 'components', 'features', 'configuracoes', 'PainelWhatsApp.tsx'));
    const cfg = readSafe(join(SRC, 'app', 'dashboard', 'configuracoes', 'page.tsx'));
    return /Não configurado/.test(p) && /em breve/i.test(p) && /disabled/.test(p) &&
           /PainelWhatsApp/.test(cfg) && /'whatsapp'/.test(cfg);
  })(),
  'Configurações deve ter a secção WhatsApp com estado Não configurado e botão desactivado.'
);
check(
  'WA0: canal whatsapp existe desactivado por padrão (trigger + backfill)',
  /FUNCTION ensure_whatsapp_channel/.test(migWa) &&
  /VALUES\s*\(NEW\.id,\s*'whatsapp',\s*FALSE\)/i.test(migWa) &&
  /'whatsapp',\s*FALSE FROM tenants/i.test(migWa),
  'Cada tenant deve ter um canal whatsapp com is_active=FALSE (trigger para novos + backfill).'
);
check(
  'WA: outbound/access_token só no SERVIDOR (nunca num componente cliente)',
  (() => {
    // A partir da Fase 1B o envio existe — mas o access_token e o endpoint Graph
    // só podem aparecer em código server-side, NUNCA num ficheiro 'use client'.
    for (const f of collectFiles(SRC, ['.ts', '.tsx'])) {
      const t = readSafe(f);
      const isClient = /^\s*['"]use client['"]/m.test(t);
      if (isClient && /graph\.facebook\.com|access_token/i.test(t)) return false;
    }
    return true;
  })(),
  'graph.facebook.com / access_token nunca podem estar num componente cliente (só server-side).'
);

// ── Hardening de segurança ───────────────────────────────────────────────────
check(
  'SEC: cabeçalhos de segurança no next.config (HSTS, X-Frame-Options, nosniff, Referrer, CSP)',
  (() => {
    const n = readSafe(join(APP, 'next.config.ts'));
    return /async headers\(\)/.test(n) && /Strict-Transport-Security/.test(n) &&
           /X-Frame-Options/.test(n) && /X-Content-Type-Options/.test(n) &&
           /Referrer-Policy/.test(n) && /Content-Security-Policy/.test(n);
  })(),
  'next.config deve aplicar cabeçalhos de segurança (HSTS/X-Frame-Options/nosniff/Referrer/CSP).'
);
check(
  'SEC: guard de RLS — toda a tabela das migrações tem ENABLE ROW LEVEL SECURITY',
  (() => {
    const sql = getMigrations();
    const created = [...new Set([...sql.matchAll(/CREATE TABLE(?:\s+IF NOT EXISTS)?\s+([a-z_][a-z0-9_]*)/gi)].map((m) => m[1].toLowerCase()))];
    const enabled = new Set([...sql.matchAll(/ALTER TABLE\s+([a-z_][a-z0-9_]*)\s+ENABLE ROW LEVEL SECURITY/gi)].map((m) => m[1].toLowerCase()));
    const semRls = created.filter((t) => !enabled.has(t));
    if (semRls.length) console.log('     ⚠ Tabelas SEM RLS: ' + semRls.join(', '));
    return semRls.length === 0;
  })(),
  'Cada tabela criada nas migrações deve ter ALTER TABLE ... ENABLE ROW LEVEL SECURITY (anti-vazamento).'
);
check(
  'SEC: rate-limit do login documentado (GoTrue sign_in_sign_ups) e config presente',
  /\[auth\.rate_limit\]/.test(readSafe(join(SUPABASE, 'config.toml'))) &&
  /sign_in_sign_ups/.test(readSafe(join(SUPABASE, 'config.toml'))),
  'O config.toml deve ter [auth.rate_limit] com sign_in_sign_ups para travar brute-force no login.'
);
check(
  'SEC: checklist de pentest documentada',
  /Checklist de pentest/i.test(readSafe(join(ROOT, 'docs', 'security-checklist.md'))) &&
  /Rodar a password do superadmin/i.test(readSafe(join(ROOT, 'docs', 'security-checklist.md'))),
  'docs/security-checklist.md deve ter a checklist de pentest e o bloqueador da password do superadmin.'
);
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 15 — PAINEL SUPERADMIN (gestão segura, sem PII de clientes)
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 15 — Painel SuperAdmin');

{
const migAll = getMigrations();

// ── Páginas ──────────────────────────────────────────────────────────────────
check('SA: /admin existe',              exists(join(SRC, 'app', 'admin', 'page.tsx')),               'Criar /admin (visão geral).');
check('SA: /admin/empresas existe',     exists(join(SRC, 'app', 'admin', 'empresas', 'page.tsx')),    'Criar /admin/empresas.');
check('SA: /admin/utilizadores existe', exists(join(SRC, 'app', 'admin', 'utilizadores', 'page.tsx')),'Criar /admin/utilizadores.');
check('SA: /admin/sistema existe',      exists(join(SRC, 'app', 'admin', 'sistema', 'page.tsx')),     'Criar /admin/sistema.');

// ── Fundação (0013) ──────────────────────────────────────────────────────────
check(
  'SA: role superadmin + tenant_id NULLABLE (constraint só superadmin)',
  /role IN \('superadmin'/.test(migAll) && /profiles_tenant_required/.test(migAll) &&
  /role = 'superadmin' OR tenant_id IS NOT NULL/.test(migAll),
  'A migração 0013 deve adicionar o role superadmin e permitir tenant_id NULL só para ele.'
);
check(
  'SA: isolamento — só policies de gestão (tenants/profiles), nada em clients/bookings',
  (() => {
    // Não deve existir policy de superadmin que exponha dados operacionais
    return /tenants_select_superadmin/.test(migAll) && /profiles_select_superadmin/.test(migAll) &&
           !/clients_select_superadmin/.test(migAll) && !/bookings_select_superadmin/.test(migAll);
  })(),
  'O superadmin não pode ter policies de leitura sobre clients/bookings (isolamento).'
);

// ── Auditoria system-level (0024) ────────────────────────────────────────────
check(
  'SA: system_audit_logs (append-only) + RPC record_system_audit_log (gated superadmin)',
  /CREATE TABLE IF NOT EXISTS system_audit_logs/.test(migAll) &&
  /FUNCTION record_system_audit_log/.test(migAll) &&
  /auth_user_role\(\) <> 'superadmin'/.test(migAll) &&
  /REVOKE INSERT, UPDATE, DELETE ON system_audit_logs/.test(migAll),
  'Deve existir system_audit_logs append-only e o RPC gated a superadmin.'
);
check(
  'SA: ações admin geram system audit log (criar/suspender/reativar/plano)',
  (() => {
    const svc   = readSafe(join(SRC, 'services', 'admin.ts'));
    const route = readSafe(join(SRC, 'app', 'api', 'admin', 'criar-empresa', 'route.ts'));
    return /record_system_audit_log/.test(svc) && /tenant\.suspend/.test(svc) &&
           /tenant\.reactivate/.test(svc) && /tenant\.plan_change/.test(svc) &&
           /record_system_audit_log/.test(route) && /tenant\.create/.test(route);
  })(),
  'Suspender/reactivar/plano (serviço) e criar empresa (route) devem registar auditoria de sistema.'
);

// ── RPCs seguros: owner na listagem + métricas só contagens ───────────────────
check(
  'SA: admin_list_tenants devolve owner (nome/email) sem PII de clientes',
  (() => {
    const m = migAll;
    // owner_email vem de auth.users; clients/bookings entram só como count(*)
    return /FUNCTION admin_list_tenants/.test(m) && /owner_email/.test(m) &&
           /count\(\*\) FROM clients/.test(m) && /count\(\*\) FROM bookings/.test(m) &&
           !/c\.(phone|email|notes|nif)/.test(m);
  })(),
  'admin_list_tenants deve devolver o owner e contagens — nunca telefone/e-mail/notas de clientes.'
);
check(
  'SA: admin_tenant_metrics devolve só contagens agregadas',
  /FUNCTION admin_tenant_metrics/.test(migAll) && /total_tenants/.test(migAll) &&
  /count\(\*\)/.test(migAll) && !/SELECT .*phone.*FROM clients/.test(migAll),
  'As métricas devem ser apenas contagens, sem dados pessoais.'
);

// ── Segurança da UI ──────────────────────────────────────────────────────────
check(
  'SA: /admin gateado server-side por role === superadmin (não usePermissions)',
  (() => {
    const layout = readSafe(join(SRC, 'app', 'admin', 'layout.tsx'));
    const gated  = /role !== 'superadmin'/.test(layout) && /redirect\('\/dashboard'\)/.test(layout);
    // Nenhuma página /admin deve depender de usePermissions().can() para gatear
    const pages = ['page.tsx', 'empresas/page.tsx', 'utilizadores/page.tsx', 'sistema/page.tsx']
      .map((p) => readSafe(join(SRC, 'app', 'admin', p)));
    const semCan = pages.every((p) => !/usePermissions/.test(p));
    return gated && semCan;
  })(),
  'O /admin deve ser gateado por role no layout (server-side); as páginas não usam usePermissions().can().'
);
check(
  'SA: service_role nunca no cliente (páginas/serviço admin não a referem)',
  (() => {
    const svc = readSafe(join(SRC, 'services', 'admin.ts'));
    const pages = ['page.tsx', 'empresas/page.tsx', 'utilizadores/page.tsx', 'sistema/page.tsx']
      .map((p) => readSafe(join(SRC, 'app', 'admin', p)));
    return !/SERVICE_ROLE/.test(svc) && pages.every((p) => !/SERVICE_ROLE/.test(p) && !/createAdminClient/.test(p));
  })(),
  'O painel admin (cliente) nunca pode referir service_role nem createAdminClient.'
);
check(
  'SA: comentário "Supabase Studio" removido de admin/page.tsx',
  !/Supabase Studio/.test(readSafe(join(SRC, 'app', 'admin', 'page.tsx'))),
  'Remover o comentário desatualizado sobre criar empresas via Supabase Studio.'
);
check(
  'SA: suspensão bloqueia o dashboard com mensagem clara',
  (() => {
    const dash = readSafe(join(SRC, 'app', 'dashboard', 'layout.tsx'));
    const susp = readSafe(join(SRC, 'app', 'suspenso', 'page.tsx'));
    return /is_active === false/.test(dash) && /\/suspenso/.test(dash) && /suspensa/i.test(susp);
  })(),
  'Tenant suspenso deve ser redirigido para /suspenso com mensagem clara.'
);
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 14 — OBSERVABILIDADE / BETA-READINESS
// logger · Sentry-ready · error boundaries · health · auditoria · sistema · docs
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 14 — Observabilidade / Beta-readiness');

{
const obs = readSafe(join(SRC, 'lib', 'observability.ts'));
check(
  'Obs: logger com audit + security + maskPII',
  (() => { const l = readSafe(join(SRC, 'lib', 'logger.ts')); return /audit:/.test(l) && /security:/.test(l) && /export function maskPII/.test(l); })(),
  'O logger central deve ter níveis audit/security e maskPII.'
);
check(
  'Obs: Sentry-ready (isSentryConfigured + NEXT_PUBLIC_SENTRY_DSN, sem crashar sem DSN)',
  /isSentryConfigured/.test(obs) && /NEXT_PUBLIC_SENTRY_DSN/.test(obs) && /reportError/.test(obs),
  'observability.ts deve expor isSentryConfigured() e reportError(), sem depender do DSN para funcionar.'
);
check(
  'Obs: error boundaries (route + global) chamam reportError com retry',
  (() => {
    const e = readSafe(join(SRC, 'app', 'error.tsx'));
    const g = readSafe(join(SRC, 'app', 'global-error.tsx'));
    return /reportError/.test(e) && /onClick=\{reset\}/.test(e) && /\/dashboard/.test(e) &&
           /reportError/.test(g) && /onClick=\{reset\}/.test(g);
  })(),
  'app/error.tsx e app/global-error.tsx devem reportar o erro e oferecer recuperação.'
);
check(
  'Obs: /api/health devolve status + checks (app/database/auth/storage) sem segredos',
  (() => {
    const h = readSafe(join(SRC, 'app', 'api', 'health', 'route.ts'));
    return /status/.test(h) && /database/.test(h) && /auth/.test(h) && /storage/.test(h) &&
           /degraded/.test(h) && /version/.test(h) && !/SERVICE_ROLE/.test(h);
  })(),
  'O health check deve reportar app/database/auth/storage e nunca expor service_role.'
);
check(
  'Obs: painel /dashboard/auditoria (audit.view) lista o trilho',
  exists(join(SRC, 'app', 'dashboard', 'auditoria', 'page.tsx')) &&
  /audit\.view/.test(readSafe(join(SRC, 'app', 'dashboard', 'auditoria', 'page.tsx'))) &&
  /listarAuditoria/.test(readSafe(join(SRC, 'services', 'audit.ts'))),
  'Deve existir /dashboard/auditoria gateado por audit.view, a ler audit_logs.'
);
check(
  'Obs: painel /dashboard/sistema (system.view) mostra health + estado do Sentry',
  exists(join(SRC, 'app', 'dashboard', 'sistema', 'page.tsx')) &&
  /system\.view/.test(readSafe(join(SRC, 'app', 'dashboard', 'sistema', 'page.tsx'))) &&
  /isSentryConfigured/.test(readSafe(join(SRC, 'app', 'dashboard', 'sistema', 'page.tsx'))),
  'Deve existir /dashboard/sistema gateado por system.view, com health e estado do Sentry.'
);
check(
  'Obs: permissões audit.view (owner+manager) e system.view (owner)',
  (() => {
    const p = readSafe(join(SRC, 'types', 'domain', 'permission.ts'));
    return /'audit\.view'/.test(p) && /'system\.view'/.test(p);
  })(),
  'Adicionar as permissões audit.view e system.view ao modelo de permissões.'
);
check(
  'Obs: auditoria e sistema na navegação (sidebar)',
  /dashboard\/auditoria/.test(readSafe(join(SRC, 'components', 'layout', 'SidebarDesktop', 'SidebarDesktop.tsx'))) &&
  /dashboard\/sistema/.test(readSafe(join(SRC, 'components', 'layout', 'SidebarDesktop', 'SidebarDesktop.tsx'))),
  'Os painéis de auditoria e sistema devem aparecer na navegação.'
);
check(
  'Obs: docs de incident-response e observability',
  exists(join(ROOT, 'docs', 'incident-response.md')) && exists(join(ROOT, 'docs', 'observability.md')),
  'Criar docs/incident-response.md e docs/observability.md.'
);
check(
  'Obs: serviços críticos sem console.error solto (usam logger/throw)',
  (() => {
    for (const f of ['clients.ts', 'bookings.ts', 'equipa.ts', 'tenant.ts', 'branding.ts', 'audit.ts']) {
      if (/console\.error/.test(readSafe(join(SRC, 'services', f)))) return false;
    }
    return true;
  })(),
  'Os serviços críticos não devem usar console.error solto — usar logger ou propagar erro.'
);
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 13 — PROFISSIONALIZAÇÃO OPERACIONAL (10.1–10.4)
// País/morada · Cliente visitante · Ficha do cliente · Segurança operacional
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 13 — Profissionalização Operacional (10.1–10.4)');

{
const mig = getMigrations();

// ── 10.1 — País / localização / morada ───────────────────────────────────────
const empresaValid = readSafe(join(SRC, 'lib', 'validators', 'empresa.ts'));
check(
  '10.1: validador de empresa inclui morada completa (address_line2 + region)',
  /address_line2/.test(empresaValid) && /region/.test(empresaValid),
  'atualizarEmpresaSchema deve aceitar address_line2 e region (distrito/estado).'
);
const tenantSvc = readSafe(join(SRC, 'services', 'tenant.ts'));
check(
  '10.1: salvarEmpresa grava morada completa e faz merge seguro de settings/address',
  /address_line2/.test(tenantSvc) && /region/.test(tenantSvc) &&
  /\.\.\.settingsAtuais/.test(tenantSvc) && /\.\.\.addressAtual/.test(tenantSvc),
  'atualizarDadosEmpresa deve gravar address_line2/region e preservar settings/branding.'
);
const painelEmpresa = readSafe(join(SRC, 'components', 'features', 'configuracoes', 'PainelEmpresa.tsx'));
check(
  '10.1: PainelEmpresa usa labels PT/BR (Distrito/Estado, Código postal/CEP)',
  /Distrito/.test(painelEmpresa) && /Estado/.test(painelEmpresa) && /CEP/.test(painelEmpresa),
  'O painel da empresa deve adaptar os labels de morada ao país.'
);

// ── 10.2 — Cliente visitante ─────────────────────────────────────────────────
check(
  '10.2: migração adiciona is_guest + guest_converted_at a clients',
  /is_guest/.test(mig) && /guest_converted_at/.test(mig),
  'Criar migração com colunas is_guest e guest_converted_at em clients.'
);
const clientValid = readSafe(join(SRC, 'lib', 'validators', 'client.ts'));
check(
  '10.2: criarVisitanteSchema (só nome + telefone, sem consentimento)',
  /criarVisitanteSchema/.test(clientValid) && !/marketing_consent/.test(clientValid.split('criarVisitanteSchema')[1] ?? ''),
  'Deve existir um schema de visitante mínimo (nome + telefone).'
);
const clientsSvc = readSafe(join(SRC, 'services', 'clients.ts'));
check(
  '10.2: serviço com criarVisitante (is_guest) + converterVisitante',
  /function criarVisitante/.test(clientsSvc) && /is_guest:\s*true/.test(clientsSvc) &&
  /function converterVisitante/.test(clientsSvc) && /guest_converted_at/.test(clientsSvc),
  'O serviço de clientes deve permitir criar visitante e convertê-lo.'
);
check(
  '10.2: modal de cliente rápido + filtro Visitantes + badge na lista',
  exists(join(SRC, 'components', 'features', 'clientes', 'ClienteRapidoModal.tsx')) &&
  (() => {
    const page = readSafe(join(SRC, 'app', 'dashboard', 'clientes', 'page.tsx'));
    return /visitantes/i.test(page) && /Visitante/.test(page) && /is_guest/.test(page);
  })(),
  'A lista de clientes deve ter filtro Visitantes e badge Visitante/Cliente.'
);
check(
  '10.2: cliente rápido disponível dentro do fluxo de marcação',
  /onCriarVisitante/.test(readSafe(join(SRC, 'components', 'features', 'agenda', 'steps', 'StepClienteServico.tsx'))) &&
  /ClienteRapidoModal/.test(readSafe(join(SRC, 'components', 'features', 'agenda', 'NovaBookingModal.tsx'))),
  'O modal de marcação deve permitir criar um visitante rapidamente.'
);
check(
  '10.2 (RGPD): visitante NÃO gera consentimento de marketing na criação',
  /COALESCE\(NEW\.is_guest, FALSE\)\s*=\s*TRUE/.test(mig) && /log_marketing_consent/.test(mig),
  'O trigger log_marketing_consent deve saltar o registo no INSERT de visitantes.'
);

// ── 10.3 — Ficha completa do cliente ─────────────────────────────────────────
const detalhe = readSafe(join(SRC, 'components', 'features', 'clientes', 'ClienteDetalheModal.tsx'));
check(
  '10.3: ficha do cliente mostra consentimentos + marcações + notas + comunicação',
  /Histórico de consentimento/.test(detalhe) && /Marcações/.test(detalhe) &&
  /Notas internas/.test(detalhe) && /Comunicação/.test(detalhe),
  'A ficha do cliente deve ter dados, consentimentos, marcações, notas e comunicação.'
);
check(
  '10.3: comunicação tem empty state (WhatsApp ainda não activo)',
  /WhatsApp ainda não está ativo|Sem mensagens/.test(detalhe),
  'A secção de comunicação deve ter empty state claro enquanto o WhatsApp não está ligado.'
);

// ── 10.4 — Segurança operacional ─────────────────────────────────────────────
check(
  '10.4: RPC record_audit_log (append-only, tenant/actor do JWT)',
  /FUNCTION record_audit_log/.test(mig) && /SECURITY DEFINER/.test(mig) &&
  /auth_tenant_id\(\)/.test(mig) && /REVOKE UPDATE, DELETE ON audit_logs/.test(mig),
  'Deve existir o RPC record_audit_log e o trilho deve ser append-only.'
);
check(
  '10.4: serviço de auditoria registarAuditoria (falha silenciosa)',
  (() => {
    const a = readSafe(join(SRC, 'services', 'audit.ts'));
    return /registarAuditoria/.test(a) && /record_audit_log/.test(a) && /try/.test(a)
  })(),
  'Deve existir um serviço de auditoria que nunca quebra a operação principal.'
);
check(
  '10.4: auditoria ligada a clientes, marcações, equipa, empresa e branding',
  /registarAuditoria/.test(clientsSvc) &&
  /registarAuditoria/.test(readSafe(join(SRC, 'services', 'bookings.ts'))) &&
  /registarAuditoria/.test(readSafe(join(SRC, 'services', 'equipa.ts'))) &&
  /registarAuditoria/.test(tenantSvc) &&
  /registarAuditoria/.test(readSafe(join(SRC, 'services', 'branding.ts'))),
  'As acções críticas devem registar auditoria.'
);
const loggerSrc = readSafe(join(SRC, 'lib', 'logger.ts'));
check(
  '10.4: logger central com audit + security + maskPII',
  /audit:/.test(loggerSrc) && /security:/.test(loggerSrc) && /maskPII/.test(loggerSrc),
  'O logger deve ter níveis audit/security e mascarar PII.'
);
check(
  '10.4: camada de rate limit preparada e aplicada nos endpoints admin',
  exists(join(SRC, 'lib', 'rate-limit.ts')) &&
  /checkRateLimit/.test(readSafe(join(SRC, 'app', 'api', 'admin', 'criar-empresa', 'route.ts'))) &&
  /checkRateLimit/.test(readSafe(join(SRC, 'app', 'api', 'equipa', 'criar-membro', 'route.ts'))),
  'Deve existir src/lib/rate-limit.ts e estar aplicado em criar-empresa e criar-membro.'
);
check(
  '10.4: docs/security-checklist.md existe',
  exists(join(ROOT, 'docs', 'security-checklist.md')),
  'Criar docs/security-checklist.md com RLS, roles, dados sensíveis, rate limiting e logs.'
);
}

// ═══════════════════════════════════════════════════════════════════════════
// FASE 12 — GESTÃO DE EQUIPA (criação segura, proteções, permissões)
// ═══════════════════════════════════════════════════════════════════════════
section('FASE 12 — Gestão de Equipa');

{
const migracoesSql = getMigrations();

// ── Página e UI ──────────────────────────────────────────────────────────────
const equipaPage = readSafe(join(SRC, 'app', 'dashboard', 'equipa', 'page.tsx'));
check(
  'Página /dashboard/equipa existe e é protegida por permissão (team.view)',
  exists(join(SRC, 'app', 'dashboard', 'equipa', 'page.tsx')) &&
  /can\(\s*['"]team\.view['"]\s*\)/.test(equipaPage) && /AccessDenied/.test(equipaPage),
  'A página de equipa deve exigir team.view e mostrar AccessDenied sem permissão.'
);
check(
  'Equipa: adicionar/gerir membros só com team.manage (owner)',
  /can\(\s*['"]team\.manage['"]\s*\)\s*&&\s*<CriarMembroForm/.test(equipaPage) &&
  /m\.role\s*!==\s*['"]owner['"]/.test(equipaPage) && /m\.id\s*!==\s*profile\?\.id/.test(equipaPage),
  'Só o owner (team.manage) adiciona membros; não pode gerir o owner nem a si próprio na UI.'
);

// ── Route Handler de criação (segurança em camadas) ──────────────────────────
const criarMembroRoute = readSafe(join(SRC, 'app', 'api', 'equipa', 'criar-membro', 'route.ts'));
check(
  'criar-membro: exige sessão + role owner lido da BD (não do cliente)',
  /getUser\(\)/.test(criarMembroRoute) &&
  /profile\?\.role\s*!==\s*['"]owner['"]/.test(criarMembroRoute) &&
  /status:\s*403/.test(criarMembroRoute),
  'O handler deve validar sessão e confirmar role=owner na BD antes de criar.'
);
check(
  'criar-membro: membro herda o tenant do owner (join_tenant_id em user_metadata)',
  /join_tenant_id:\s*tenantId/.test(criarMembroRoute) &&
  /user_metadata/.test(criarMembroRoute),
  'O membro deve entrar no tenant do owner via user_metadata.join_tenant_id.'
);
check(
  'criar-membro: rollback do auth.users se o profile falhar (sem órfãos)',
  /deleteUser\(\s*memberId\s*\)/.test(criarMembroRoute),
  'Se a criação do profile falhar, o utilizador deve ser revertido (deleteUser).'
);
check(
  'criar-membro: vínculo de recurso só staff, do tenant e livre (sem roubo)',
  /\.eq\(\s*['"]tenant_id['"]\s*,\s*tenantId\s*\)/.test(criarMembroRoute) &&
  /\.is\(\s*['"]profile_id['"]\s*,\s*null\s*\)/.test(criarMembroRoute),
  'O vínculo ao recurso deve confirmar tenant + recurso livre antes de ligar.'
);

// ── Trigger de provisionamento: membro NÃO cria tenant novo ──────────────────
check(
  'handle_new_user salta o provisionamento quando há join_tenant_id',
  /raw_user_meta_data\s*\?\s*'join_tenant_id'/.test(migracoesSql) &&
  /handle_new_user/.test(migracoesSql),
  'O trigger de signup deve saltar a criação de tenant quando join_tenant_id existe.'
);

// ── Proteções (triggers BEFORE UPDATE/DELETE) ────────────────────────────────
check(
  'Trigger protect_last_owner impede suspender/despromover/remover o único owner',
  /FUNCTION\s+protect_last_owner/.test(migracoesSql) &&
  /BEFORE UPDATE OR DELETE ON profiles/.test(migracoesSql) &&
  /único proprietário/.test(migracoesSql),
  'Deve existir o trigger protect_last_owner (migração 0019).'
);
check(
  'Trigger prevent_profile_self_escalation impede auto-mudança de role/tenant/is_active',
  /FUNCTION\s+prevent_profile_self_escalation/.test(migracoesSql) &&
  /auth\.uid\(\)\s*=\s*NEW\.id/.test(migracoesSql) &&
  /própria função/.test(migracoesSql),
  'Deve existir o guard de auto-escalada de privilégios (migração 0015).'
);
check(
  'Policy profiles_select_manager_all: owner/manager vêem membros inactivos',
  /profiles_select_manager_all/.test(migracoesSql) &&
  /auth_user_role\(\)\s*IN\s*\(\s*'owner',\s*'manager'\s*\)/.test(migracoesSql),
  'Owner/manager devem ver todos os membros do tenant (incl. inactivos).'
);

// ── Serviço e validador (roles atribuíveis) ──────────────────────────────────
const equipaSvc = readSafe(join(SRC, 'services', 'equipa.ts'));
check(
  'Serviço de equipa: owner NÃO é atribuível; superadmin fora da lista',
  /RoleAtribuivel\s*=\s*['"]manager['"]\s*\|\s*['"]receptionist['"]\s*\|\s*['"]staff['"]/.test(equipaSvc) &&
  /\.neq\(\s*['"]role['"]\s*,\s*['"]superadmin['"]\s*\)/.test(equipaSvc),
  'alterarRoleMembro só deve aceitar manager/receptionist/staff; listar exclui superadmin.'
);
const equipaValidator = readSafe(join(SRC, 'lib', 'validators', 'equipa.ts'));
check(
  'Validador criarMembro: role limitado a manager/receptionist/staff',
  /role:\s*z\.enum\(\[\s*['"]manager['"],\s*['"]receptionist['"],\s*['"]staff['"]\s*\]/.test(equipaValidator),
  'criarMembroSchema não deve permitir criar owner/superadmin.'
);
}

// ═══════════════════════════════════════════════════════════════════════════
// RELATÓRIO FINAL
// ═══════════════════════════════════════════════════════════════════════════
console.log('\n' + '═'.repeat(72));
console.log('  RELATÓRIO FINAL');
console.log('═'.repeat(72));
console.log(`\n  ✅ OK:        ${totalOK}`);
console.log(`  ❌ Problemas: ${totalFail}`);
console.log(`  Total:        ${totalOK + totalFail}\n`);

if (problems.length > 0) {
  console.log('─'.repeat(72));
  console.log('  LISTA DE PROBLEMAS:');
  console.log('─'.repeat(72));
  for (let i = 0; i < problems.length; i++) {
    const p = problems[i];
    console.log(`\n  ${String(i + 1).padStart(2, '0')}. ❌ ${p.label}`);
    if (p.fix) console.log(`      💡 ${p.fix}`);
  }
  console.log('\n');
  process.exit(1);
} else {
  console.log('  Projecto aprovado! Todos os itens estão conformes.\n');
  process.exit(0);
}
