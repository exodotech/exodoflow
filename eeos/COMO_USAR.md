# COMO USAR ESTE KIT

Kit de governance de engenharia para projetos novos. Copia o conteúdo desta pasta para a **raiz do repositório** e segue os 4 passos abaixo. Tempo total: ~20 minutos por projeto.

## O que está incluído

```
CLAUDE.md                     ← lido automaticamente pelo Claude Code
AGENTS.md                     ← lido por Codex/GPT, Cursor, Gemini CLI e outros (standard aberto)
GEMINI.md                     ← lido pelo Gemini CLI (versões que ainda não leem AGENTS.md)
docs/eeos/                    ← as 11 políticas + índice (fonte de verdade)
.github/
  pull_request_template.md    ← checklist da Definition of Done em todo o PR
  workflows/ci.yml            ← CI que aplica as políticas (o "guarda")
commitlint.config.js          ← enforcement dos Conventional Commits
rfcs/0000-template.md         ← template para grandes mudanças
adrs/                         ← registo de decisões de arquitetura
```

Os três ficheiros de instrução (CLAUDE/AGENTS/GEMINI) têm o **mesmo conteúdo**. Em sistemas que suportem symlinks, podes manter só um real:
`ln -sf CLAUDE.md AGENTS.md && ln -sf CLAUDE.md GEMINI.md`

## Setup por projeto novo (obrigatório)

**1. Personalizar o CLAUDE.md (5 min)** — editar no topo:
   - A frase "O projeto": o que ESTA aplicação faz, em 2-3 frases.
   - A secção "Stack": a stack real (o kit vem afinado para Next.js + Supabase; se a stack for outra, ajustar as regras 1, 2, 4 e 9, que são específicas de Supabase/RLS).
   - A "Estrutura do repositório": refletir as pastas reais.
   - Replicar as edições em AGENTS.md e GEMINI.md (ou usar symlinks).

**2. Ativar o enforcement (10 min)**
   ```bash
   npm i -D @commitlint/cli @commitlint/config-conventional husky
   npx husky init
   echo 'npx --no -- commitlint --edit "$1"' > .husky/commit-msg
   ```
   - Garantir que o `package.json` tem os scripts: `lint`, `type-check`, `test`, `build`.
   - Confirmar que o workflow `.github/workflows/ci.yml` corre no primeiro PR.
   - Ativar branch protection no `main`: PR obrigatório + CI verde obrigatório.

**3. Ativar atualizações automáticas (5 min)** — instalar Renovate ou Dependabot no repositório (ver `docs/eeos/DEPENDENCY_UPDATE_POLICY.md`). Sem isto, o objetivo de 5-10 anos morre no primeiro ano.

**4. Ajustar políticas com placeholders de negócio** — `DATA_RETENTION_POLICY.md` (confirmar prazos com DPO/jurista) e `ERROR_CATALOG.md` (manter só os domínios que o projeto tem).

## O que dá longevidade de 5-10 anos (por ordem de importância)

1. **CI a verde obrigatório** — regras verificadas por máquinas, não por memória.
2. **Dependências sempre atualizadas** — software parado apodrece; Renovate + SLAs da policy.
3. **Testes como rede de segurança** — são o que permite mudar código com confiança daqui a 5 anos.
4. **Stack aborrecida** — Postgres, TypeScript, standards web. Evitar tecnologia da moda no caminho crítico.
5. **Decisões registadas** — RFCs/ADRs respondem ao "porque é que isto é assim?" quando ninguém da equipa original estiver presente.
6. Os documentos em si — são o mapa, não o motor.

## Manutenção do próprio kit

- Rever `docs/eeos/` a cada 6 meses (data no topo de cada documento).
- Melhorias descobertas num projeto: atualizar o kit-mãe e propagar aos outros projetos.
- Mudanças de regra passam pelo RFC Process — incluindo neste kit.
