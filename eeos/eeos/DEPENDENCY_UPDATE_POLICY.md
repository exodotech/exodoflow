# Dependency Update Policy

**Estado:** Ativo · **Owner:** Security + Platform · **Tooling:** Renovate/Dependabot + scanner SCA em CI
**Última revisão:** 2026-06

## Classificação e SLAs

A severidade segue **CVSS v3.1** do advisory, ajustada pela exploitabilidade real (existe exploit público? o código vulnerável é alcançável na nossa utilização?).

| Severidade | Critério | SLA de remediação | Ação |
|---|---|---|---|
| **Crítica** | CVSS ≥ 9.0, ou exploit ativo em vulnerabilidade alcançável | **24 horas** | Trata-se como incidente: patch imediato, hotfix release; se não há patch, mitigar (WAF, desativar feature, pin de versão segura) |
| **Alta** | CVSS 7.0–8.9 | **7 dias** | Prioridade sobre trabalho de feature |
| **Média** | CVSS 4.0–6.9 | **30 dias** | Entra no sprint seguinte |
| **Baixa** | CVSS < 4.0 | Próximo ciclo trimestral | Agrupada nas atualizações de rotina |

O relógio do SLA começa na **publicação do advisory**, não na sua descoberta interna.

## Atualizações de rotina (sem CVE)

- **Patch/minor:** PRs automáticos do Renovate, agrupados semanalmente; merge automático se a suite de testes passa e a dependência tem boa reputação de releases.
- **Major:** PR manual, com leitura do changelog e plano de migração; tratadas trimestralmente em "dependency week" para evitar acumulação.
- Lockfiles obrigatórios e committed; builds são reprodutíveis.

## Regras para adicionar dependências novas

Antes de adicionar uma dependência, o autor verifica e o reviewer confirma:

1. Manutenção ativa (commits/releases nos últimos 12 meses) e mais de um maintainer, ou aceitamos explicitamente o risco.
2. Licença compatível (allowlist: MIT, Apache-2.0, BSD, ISC; **proibido** AGPL em código distribuído sem aprovação do CTO).
3. Justifica-se face ao custo (não adicionar biblioteca para 10 linhas de código).
4. Scan SCA limpo no momento da adição.

## Supply chain

- Scanner SCA corre em **todo o PR e diariamente** sobre `main`; vulnerabilidade crítica/alta nova = build de PR falha.
- Proibido instalar dependências fora do registry oficial sem pin de hash.
- Versões fixadas por lockfile; `latest` proibido em produção e em CI.
- Imagens Docker base: atualizadas mensalmente e rebuild automático quando a base recebe patch de segurança.

## Fim de vida (EOL)

Runtimes e frameworks (Node, Postgres, etc.) nunca podem passar da data de EOL em produção. Plano de upgrade inicia-se **6 meses antes** do EOL, com issue criada automaticamente.

## Exceções

Vulnerabilidade sem fix disponível e sem mitigação viável: registar exceção com avaliação de risco escrita, aprovação de Security, e revisão a cada 30 dias. Exceções não expiram em silêncio.
