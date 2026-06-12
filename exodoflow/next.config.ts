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

// Content-Security-Policy em Report-Only (monitoriza violações sem bloquear, para
// não arriscar quebrar a app antes de uma passagem dedicada de teste). Permite o
// próprio domínio + o Supabase (REST/Storage/Realtime via websocket).
const supabaseHost = (() => {
  try { return supabaseUrl ? new URL(supabaseUrl).origin : ""; } catch { return ""; }
})();
const csp = [
  "default-src 'self'",
  "base-uri 'self'",
  "frame-ancestors 'none'",
  "object-src 'none'",
  "img-src 'self' data: blob: " + supabaseHost,
  "style-src 'self' 'unsafe-inline'",
  "script-src 'self' 'unsafe-inline' 'unsafe-eval'",
  `connect-src 'self' ${supabaseHost} ${supabaseHost.replace("http", "ws")}`,
  "font-src 'self' data:",
].join("; ");

// Headers de segurança aplicados a todas as rotas. Os 5 primeiros são seguros
// (não quebram a app) e mitigam clickjacking, MIME-sniffing e fuga de referer.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Frame-Options",           value: "DENY" },
  { key: "X-Content-Type-Options",    value: "nosniff" },
  { key: "Referrer-Policy",           value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy",        value: "camera=(), microphone=(), geolocation=(), browsing-topics=()" },
  { key: "Content-Security-Policy-Report-Only", value: csp },
];

const nextConfig: NextConfig = {
  images: { remotePatterns },
  async headers() {
    return [{ source: "/:path*", headers: securityHeaders }];
  },
};

export default nextConfig;
