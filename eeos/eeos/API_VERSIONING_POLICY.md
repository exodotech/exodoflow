# API Versioning Policy

**Estado:** Ativo · **Owner:** CTO / API Guild · **Aplica-se a:** toda a API pública e APIs entre serviços
**Última revisão:** 2026-06

## Estratégia

Versionamento **por URI** na API pública: `/v1`, `/v2`, … Versão major apenas; minor/patch nunca aparecem no URI.

```
https://api.empresa.com/v1/tenants/{id}/invoices
```

APIs internas (serviço-a-serviço) versionam por contrato (schema no repositório `api-contracts`, validado em CI) e seguem expand-and-contract em vez de novas versões de URI.

## O que é breaking change (exige nova versão major)

- Remover ou renomear endpoint, campo de resposta ou parâmetro.
- Mudar tipo, formato ou semântica de um campo existente.
- Tornar obrigatório um parâmetro antes opcional.
- Alterar códigos de status ou códigos de erro documentados ([Error Catalog](./ERROR_CATALOG.md)).
- Reduzir limites (rate limits, tamanhos máximos) abaixo do documentado.
- Alterar comportamento de autenticação/autorização.

## O que NÃO é breaking change (permitido na mesma versão)

- Adicionar endpoints, campos de resposta, parâmetros opcionais, valores novos em enums **documentados como extensíveis**.
- Correções de bugs que repõem o comportamento documentado.
- Mudanças de performance sem alteração de contrato.

> Clientes devem ser tolerantes a campos desconhecidos (ignorar, não falhar). Isto faz parte dos nossos termos de API.

## Ciclo de vida de uma versão

| Fase | Significado | Duração mínima |
|---|---|---|
| **Active** | Versão recomendada, recebe features | — |
| **Deprecated** | Funciona, só recebe fixes de segurança | **12 meses** |
| **Sunset** | Desligada; responde `410 Gone` com link de migração | — |

Mantemos no máximo **2 versões major ativas em simultâneo** (a atual + a deprecated).

## Processo de deprecação (obrigatório)

1. **RFC aprovada** justificando a quebra ([RFC Process](./RFC_PROCESS.md)).
2. **Anúncio** com ≥ 12 meses de antecedência: changelog, email aos clientes afetados, banner na documentação.
3. **Headers** em todas as respostas da versão deprecated:
   ```
   Deprecation: true
   Sunset: Sat, 30 Jun 2027 00:00:00 GMT
   Link: <https://docs.empresa.com/migrations/v1-v2>; rel="deprecation"
   ```
4. **Guia de migração** publicado no dia do anúncio, com mapeamento campo-a-campo e exemplos.
5. **Monitorização de adoção:** dashboard com tráfego por versão e por cliente. Sunset só avança quando tráfego da versão antiga < 1% ou todos os clientes enterprise migraram (o que for mais tarde, com decisão do CTO).
6. **Sunset:** 30 dias antes, brownouts programados (janelas de 5 min com `410`) anunciados, para detetar clientes não migrados.

## Compatibilidade e contratos

- Schemas OpenAPI são a fonte de verdade, versionados em `api-contracts`.
- CI corre *contract diff* em cada PR; mudanças breaking sem bump de versão **bloqueiam o merge**.
- Cada versão major tem suite de testes de contrato própria que corre em todos os deploys.
