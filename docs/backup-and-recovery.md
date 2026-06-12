# ExodoFlow AI — Backup e Recuperação

> Procedimentos para proteger e restaurar dados. Ambiente local (Supabase Docker)
> e caminho para produção (Supabase Cloud).
>
> ⚠️ **REGRA DE OURO:** **NÃO** correr `supabase db reset` num ambiente com dados
> reais — apaga auth/users, sessões, onboarding, branding, marcações e consentimentos.
> Para alterações de schema usar sempre `supabase migration up` (ver §5).

## 1. Exportar a base de dados local (Supabase Docker)

O Postgres corre no container `supabase_db_exodoflowIA`. Dump completo:

```bash
# Dump lógico completo (schema + dados) para um ficheiro .sql
docker exec -t supabase_db_exodoflowIA pg_dumpall -U postgres > backup_$(date +%Y%m%d_%H%M).sql

# OU apenas a base 'postgres' (mais pequeno), com formato custom (restauro selectivo)
docker exec -t supabase_db_exodoflowIA pg_dump -U postgres -d postgres -Fc > exodoflow_$(date +%Y%m%d).dump
```

Guardar o ficheiro fora do container (já fica no host pela redirecção `>`).

## 2. Restaurar a base de dados

```bash
# A partir de um dump .sql (pg_dumpall)
cat backup_AAAAMMDD_HHMM.sql | docker exec -i supabase_db_exodoflowIA psql -U postgres

# A partir de um .dump (formato custom) — restauro para a base 'postgres'
docker exec -i supabase_db_exodoflowIA pg_restore -U postgres -d postgres --clean --if-exists < exodoflow_AAAAMMDD.dump
```

> Restaurar **não** é `db reset`. O restauro repõe um estado conhecido; o reset apaga tudo e re-semeia dados de teste.

## 3. Exportar o Storage (logótipos dos tenants)

Os logótipos vivem no bucket `tenant-logos` (pasta por `tenant_id`). Em local, o
Storage do Supabase guarda os ficheiros no volume Docker. Para exportar:

```bash
# Listar/baixar via CLI do Supabase Storage (ou via API REST com a service_role, server-side)
# Alternativa simples em dev: copiar o volume do container de storage
docker cp supabase_storage_exodoflowIA:/var/lib/storage ./backup-storage
```

> Em produção (Supabase Cloud) o Storage é replicado e tem backups do próprio Supabase.

## 4. Restaurar o Storage

```bash
docker cp ./backup-storage/. supabase_storage_exodoflowIA:/var/lib/storage
```

Se um logótipo se perder, não é crítico: a UI usa `<img>` resiliente (a imagem
simplesmente não aparece, não derruba a página) e o owner pode re-carregar o logo.

## 5. Aplicar migrações SEM db reset (fluxo normal)

```bash
npx supabase migration up        # aplica as migrações pendentes (incremental, preserva dados)
npx supabase migration list      # ver o que está aplicado vs. local
```

Para criar uma alteração de schema: adicionar um ficheiro numerado em
`supabase/migrations/` e correr `migration up`. **Nunca** `db reset` com dados reais.

Após migrações que mudem colunas, **regenerar os tipos** (ver `docs/observability.md` §7):
`SUPABASE_ACCESS_TOKEN=<dummy> npx supabase gen types typescript --local > /tmp/db.ts` → validar → copiar.

## 6. Mover para o Supabase Cloud

1. Criar projeto no Supabase Cloud; guardar `URL`, `anon key`, `service_role key`.
2. `npx supabase link --project-ref <ref>`.
3. `npx supabase db push` (aplica as migrações ao Cloud) — **não** correr o seed.
4. Criar o superadmin e os primeiros owners com **senhas fortes** (ver `docs/ADMIN.md`).
5. Configurar variáveis de ambiente no deploy (Vercel): `NEXT_PUBLIC_SUPABASE_URL`,
   `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`.
6. Definir `site_url` e `additional_redirect_urls` no Auth do Cloud (domínio real)
   — necessário para o reset de password funcionar.
7. Ativar os backups automáticos / PITR do projeto Supabase.

## 7. Se perder o Docker local

Os dados locais são **descartáveis** (ambiente de dev). Para recriar do zero:

```bash
npx supabase start
npx supabase db reset      # SÓ em dev/local vazio — aplica migrações + seed de teste
```

Se tinha um backup (§1), restaurar com §2 em vez do reset.

## 8. Se auth/users "quebrarem"

- Sessão corrompida de um utilizador: janela anónima ou `/dev/diagnostics` → `forceLogout()`.
- Refresh tokens inválidos após um reset acidental: os utilizadores fazem login de novo.
- Profile sem tenant (exceto superadmin) viola `profiles_tenant_required` — corrigir o profile.
- Ver `docs/incident-response.md` para os sintomas concretos.

## 9. Checklist antes de produção

- [ ] Backups automáticos/PITR ativos no Supabase Cloud.
- [ ] Procedimento de restauro **testado** pelo menos uma vez (não confiar sem testar).
- [ ] Senhas de seed (`test1234`, `admin12345`) **não** usadas; superadmin com senha forte.
- [ ] `site_url` + redirect URLs do Auth apontam ao domínio real (reset de password).
- [ ] Variáveis de ambiente e `service_role` **só** no servidor, por ambiente.
- [ ] `supabase db reset` **proibido** em produção (documentado e sabido pela equipa).
