import type { NextConfig } from "next";

// Autorizar o next/image a carregar logos do Supabase Storage.
// Deriva o host do NEXT_PUBLIC_SUPABASE_URL — funciona em local (127.0.0.1:54321)
// e em produção (<projecto>.supabase.co) sem hardcode. Sem isto, o next/image
// lança "hostname not configured" e derruba a sidebar/header (e todo o dashboard)
// assim que um tenant tem logo carregado.
const remotePatterns: NonNullable<NextConfig["images"]>["remotePatterns"] = [];

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (supabaseUrl) {
  try {
    const u = new URL(supabaseUrl);
    remotePatterns.push({
      protocol: u.protocol.replace(":", "") as "http" | "https",
      hostname: u.hostname,
      port:     u.port || "",
      pathname: "/storage/v1/object/public/**",
    });
  } catch {
    // URL inválida — ignora; o build segue sem o padrão
  }
}

// Content-Security-Policy. Permite o próprio domínio + o Supabase
// (REST/Storage/Realtime via websocket) + Sentry (se o DSN existir).
const isProd = process.env.NODE_ENV === "production";

const supabaseHost = (() => {
  try { return supabaseUrl ? new URL(supabaseUrl).origin : ""; } catch { return ""; }
})();

// Origem de ingestão do Sentry (quando o DSN existir) — para o connect-src não
// bloquear o envio de erros do browser quando o SDK for ligado.
const sentryOrigin = (() => {
  try {
    const dsn = process.env.NEXT_PUBLIC_SENTRY_DSN;
    return dsn ? new URL(dsn).origin : "";
  } catch { return ""; }
})();

// 'unsafe-eval' SÓ em desenvolvimento (o HMR do Next precisa). Em produção é
// removido — endurece a CSP contra injeção de scripts. 'unsafe-inline' mantém-se
// porque o Next injeta scripts/estilos inline de hidratação sem nonce.
const scriptSrc = ["'self'", "'unsafe-inline'", ...(isProd ? [] : ["'unsafe-eval'"])].join(" ");
const connectSrc = ["'self'", supabaseHost, supabaseHost.replace("http", "ws"), sentryOrigin]
  .filter(Boolean).join(" ");

const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "form-action 'self'",
  "img-src 'self' data: blob: " + supabaseHost,
  "style-src 'self' 'unsafe-inline'",
  `script-src ${scriptSrc}`,
  `connect-src ${connectSrc}`,
  "font-src 'self' data:",
  // Continua a recolher violações em /api/csp-report mesmo em enforce (o browser
  // bloqueia E reporta), para monitorização contínua.
  "report-uri /api/csp-report",
].join("; ");

// Headers de segurança aplicados a todas as rotas. Mitigam clickjacking,
// MIME-sniffing, fuga de referer e injeção de scripts (CSP em ENFORCE).
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options",           value: "DENY" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  // ENFORCE (bloqueia). Em dev mantém 'unsafe-eval' para o HMR; em produção sai.
  { key: "Content-Security-Policy", value: csp },
];

const nextConfig: NextConfig = {
  images: { remotePatterns },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
