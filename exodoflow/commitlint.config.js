// Enforcement de Conventional Commits (ver eeos/eeos/CONVENTIONAL_COMMITS.md).
// Adaptado aos domínios reais do ExodoFlow. Ativar com husky (ver README/PR template).
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'build', 'ci', 'revert'],
    ],
    'scope-enum': [2, 'always',
      [
        'auth', 'tenant', 'agenda', 'clientes', 'servicos', 'recursos',
        'whatsapp', 'onboarding', 'branding', 'equipa', 'admin',
        'api', 'web', 'db', 'docs', 'deps', 'ci',
      ],
    ],
    'header-max-length': [2, 'always', 72],
  },
}
