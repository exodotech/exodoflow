# Security Headers

**Estado:** Ativo · **Owner:** Security · **Aplica-se a:** todas as respostas HTTP servidas (app, API, docs, assets)
**Enforcement:** middleware partilhado + teste automático em CI + scan semanal (Mozilla Observatory, alvo: A+)
**Última revisão:** 2026-06

## Configuração obrigatória

### Content-Security-Policy (aplicação web)

```
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'nonce-{NONCE}' 'strict-dynamic';
  style-src 'self' 'nonce-{NONCE}';
  img-src 'self' data: https://cdn.empresa.com;
  font-src 'self' https://cdn.empresa.com;
  connect-src 'self' https://api.empresa.com wss://api.empresa.com;
  frame-ancestors 'none';
  base-uri 'self';
  form-action 'self';
  object-src 'none';
  upgrade-insecure-requests;
  report-uri https://csp-reports.empresa.com/report
```

Regras:
- **Proibido** `unsafe-inline` e `unsafe-eval` em produção. Scripts inline usam nonce gerado por request.
- Novos domínios externos na CSP exigem aprovação de Security via PR a este documento.
- Rollout de alterações: primeiro `Content-Security-Policy-Report-Only` durante ≥ 1 semana, análise de relatórios, depois enforce.

### HSTS

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
```

Domínio submetido à [HSTS preload list](https://hstspreload.org). `max-age` = 2 anos.

### Restantes headers

```
X-Content-Type-Options: nosniff
X-Frame-Options: DENY                          # redundância com frame-ancestors, mantida para browsers antigos
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=(), usb=(), interest-cohort=()
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin     # same-site para assets no CDN
Cache-Control: no-store                        # em respostas com dados pessoais ou de sessão
```

### API (respostas JSON)

```
Content-Security-Policy: default-src 'none'; frame-ancestors 'none'
X-Content-Type-Options: nosniff
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
Cache-Control: no-store
```

CORS na API: allowlist explícita de origens por ambiente; **nunca** `Access-Control-Allow-Origin: *` em endpoints autenticados.

## Headers a remover

`Server`, `X-Powered-By` e qualquer header que revele versões de software são removidos no edge.

## Enforcement

1. **Middleware único** partilhado entre serviços (`@empresa/security-headers`); nenhum serviço define headers de segurança à mão.
2. **Teste de integração** em CI verifica presença e valor exato de cada header em rotas representativas; divergência = build falha.
3. **Scan externo semanal** (Observatory + ssllabs, alvo A+ / A); regressão abre incidente.
4. Relatórios CSP monitorizados; pico de violações dispara alerta.
