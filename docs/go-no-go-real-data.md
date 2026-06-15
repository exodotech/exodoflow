# Critério Go / No-Go para Dados Reais — ExodoFlow Pro

> Define quando o sistema pode passar a tratar **dados reais**. Mesmo que
> tecnicamente aprovado, a **venda a clientes reais** exige **NEEDS LEGAL REVIEW**.

## Regra

> **Não avançar para dados reais** sem validação de: privacidade, isolamento
> multi-tenant, storage com permissões corretas, segredos server-only, e os fluxos
> sensíveis testados (auth, upload de logo, finanças, recibos).

## Checklist técnico (estado atual)

| Item | Estado | Evidência |
|---|---|---|
| RLS ativa em todas as tabelas `public` | ✅ | 29/29 com `rowsecurity=true`, 0 sem políticas (query live DB) |
| Isolamento cross-tenant (leitura e escrita) | ✅ | `supabase/tests/rls-isolation.test.sql` → T1/T2/T3 OK |
| `service_role` nunca no cliente | ✅ | `import 'server-only'` em `admin.ts`; ausente de `.next/static`; sem `NEXT_PUBLIC_` |
| Storage de logos isolado por tenant | ✅ | RLS por pasta `{tenant_id}/`; 2MB + MIME allowlist (sem SVG) |
| Sem analytics/tracking não essencial | ✅ | Sem gtag/posthog/segment/etc.; só cookie de sessão `sb-` |
| Auditoria de ações sensíveis | ✅ | `record_audit_log` (tenant/actor); RLS owner/manager |
| Dados de saúde identificados | ✅ | `treatment_records` marcado sensível (data-inventory) |
| Estrutura de pedidos de titulares | ✅ | `data_subject_requests` (0041) |
| type-check / lint / test / build | ✅ | ver §Comandos |
| Seed/staging só com dados fictícios | ✅ | seed de dev fictício; deploy não aplica seed (deploy.md) |
| **Localização/GPS** | **N/A** | Produto não recolhe localização |
| **Fotos de evidência de pessoas** | **N/A** | Produto não recolhe fotos de pessoas |

## Comandos de verificação

```bash
cd exodoflow
npm run type-check
npm run lint
npm run test
npm run build

# Auditor de conformidade do projeto (na raiz)
node ../audit-exodoflow-full.mjs

# Teste de isolamento multi-tenant (requer o container Postgres local a correr)
docker exec -i supabase_db_exodoflowIA psql -U postgres -d postgres \
  < ../supabase/tests/rls-isolation.test.sql   # esperar ">>> ISOLAMENTO OK <<<"

# Confirmar que o service_role NÃO está no bundle de cliente
grep -rl "service_role" .next/static 2>/dev/null || echo "OK: ausente"
```

## Pré-requisitos antes de STAGING com pessoas reais (mesmo fictícias controladas)

- [ ] Projeto **Supabase de staging separado** do de produção.
- [ ] Seed **apenas fictício** (nomes/emails/telefones fictícios).
- [ ] Sem dados reais de funcionários/clientes em staging.
- [ ] Variáveis e segredos só no painel do host (nunca no repo).
- [ ] Políticas de storage confirmadas no projeto remoto (ver nota da migração 0010).

## Pré-requisitos antes de PRODUÇÃO com clientes reais

- [ ] Todos os itens técnicos acima ✅.
- [ ] **Documentos jurídicos revistos** ([legal-documents-needed.md](legal-documents-needed.md)),
      em especial **DPA** controlador/operador.
- [ ] Política de Privacidade e Termos publicados.
- [ ] Processo de pedidos de titulares e de incidentes operacionalizado.
- [ ] Retenção aprovada ([data-retention-policy.md](data-retention-policy.md)).

## Decisão atual

- **Técnico:** READY FOR STAGING (sem falhas técnicas de privacidade/isolamento
  conhecidas neste repositório).
- **Comercial/Jurídico:** **NEEDS LEGAL REVIEW** — obrigatório antes de vender ou
  tratar dados reais de clientes.
