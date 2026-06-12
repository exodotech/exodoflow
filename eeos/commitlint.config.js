// Enforcement de docs/eeos/CONVENTIONAL_COMMITS.md
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always',
      ['feat', 'fix', 'docs', 'style', 'refactor', 'test', 'chore', 'perf', 'build', 'ci', 'revert'],
    ],
    'scope-enum': [2, 'always',
      ['auth', 'billing', 'ai', 'tenant', 'api', 'web', 'infra', 'db', 'docs', 'deps'],
    ],
    'header-max-length': [2, 'always', 72],
  },
};
