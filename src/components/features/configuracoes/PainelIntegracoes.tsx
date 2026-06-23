'use client'
// Painel de integrações — portal público, widget embed, QR code, Instagram e
// conectores de terceiros (Google Calendar, WhatsApp Business).
import React, { useEffect, useRef, useState } from 'react'
import { Check, Copy, Download, ExternalLink, Globe, MessageCircle, QrCode } from 'lucide-react'
import SectionHeader from '@/components/design-system/SectionHeader/SectionHeader'
import { Button }    from '@/components/design-system/Button/Button'
import { useAuth }   from '@/providers/AuthProvider'

const TERCEIROS = [
  {
    name:        'Google Calendar',
    description: 'Sincronize marcações com o Google Calendar dos colaboradores.',
    icon:        <Globe className="w-5 h-5 text-blue-500" />,
  },
  {
    name:        'WhatsApp Business API',
    description: 'Integre com a API oficial da Meta para envio e receção de mensagens reais.',
    icon:        <MessageCircle className="w-5 h-5 text-green-500" />,
  },
]

function useCopy(timeout = 1500) {
  const [copiado, setCopiado] = useState(false)
  function copiar(texto: string) {
    void navigator.clipboard.writeText(texto).then(() => {
      setCopiado(true)
      setTimeout(() => setCopiado(false), timeout)
    })
  }
  return { copiado, copiar }
}

export function PainelIntegracoes() {
  const { tenant } = useAuth()
  const slug = (tenant as { slug?: string } | null)?.slug ?? ''

  const appUrl    = typeof window !== 'undefined' ? window.location.origin : 'https://app.exodoflow.pt'
  const portalUrl = `${appUrl}/marcar/${slug}`
  const igUrl     = `${portalUrl}?utm_source=instagram&utm_medium=bio&utm_campaign=booking`
  const embedCode = `<iframe\n  src="${portalUrl}"\n  width="100%"\n  height="700"\n  style="border:none;border-radius:16px"\n  title="Marcação online"\n></iframe>`

  const urlCopy   = useCopy()
  const igCopy    = useCopy()
  const embedCopy = useCopy()

  return (
    <div className="max-w-2xl space-y-6">

      {/* ── Portal de marcação ── */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-6 space-y-5">
        <SectionHeader title="Portal de marcação" />

        {/* URL do portal */}
        <div>
          <p className="text-xs font-medium text-slate-600 mb-1.5">URL público</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 truncate text-slate-700 font-mono">
              {portalUrl}
            </code>
            <button
              onClick={() => urlCopy.copiar(portalUrl)}
              className="flex-shrink-0 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              title="Copiar URL"
            >
              {urlCopy.copiado ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-500" />}
            </button>
            <a
              href={portalUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-shrink-0 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              title="Abrir portal"
            >
              <ExternalLink className="w-4 h-4 text-slate-500" />
            </a>
          </div>
        </div>

        {/* QR Code */}
        <QrCodePanel url={portalUrl} />

        {/* Link para Instagram */}
        <div>
          <p className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
            <span className="text-pink-500">📸</span> Link para bio do Instagram
          </p>
          <p className="text-xs text-slate-400 mb-1.5">Inclui tracking UTM para medir conversões vindas do Instagram.</p>
          <div className="flex items-center gap-2">
            <code className="flex-1 text-xs bg-slate-50 border border-slate-200 rounded-lg px-3 py-2.5 truncate text-slate-700 font-mono">
              {igUrl}
            </code>
            <button
              onClick={() => igCopy.copiar(igUrl)}
              className="flex-shrink-0 p-2.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition-colors"
              title="Copiar link Instagram"
            >
              {igCopy.copiado ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4 text-slate-500" />}
            </button>
          </div>
        </div>

        {/* Embed widget */}
        <div>
          <p className="text-xs font-medium text-slate-600 mb-1 flex items-center gap-1.5">
            <span>{'</>'}</span> Embed no seu site
          </p>
          <p className="text-xs text-slate-400 mb-1.5">Cole este código HTML no seu website para mostrar o portal de marcação.</p>
          <div className="relative">
            <pre className="text-xs bg-slate-900 text-slate-100 rounded-xl p-4 overflow-x-auto font-mono leading-relaxed">
              {embedCode}
            </pre>
            <button
              onClick={() => embedCopy.copiar(embedCode)}
              className="absolute top-2 right-2 flex items-center gap-1.5 text-xs px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-white transition-colors"
            >
              {embedCopy.copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              {embedCopy.copiado ? 'Copiado!' : 'Copiar'}
            </button>
          </div>
        </div>
      </div>

      {/* ── Integrações de terceiros ── */}
      <div className="bg-white/70 backdrop-blur-sm rounded-xl border border-white/60 shadow-sm p-6">
        <SectionHeader title="Integrações" />
        <div className="mt-4 space-y-3">
          {TERCEIROS.map((i) => (
            <div key={i.name} className="flex items-center gap-4 p-3 rounded-xl border border-slate-100">
              <div className="flex-shrink-0 w-9 h-9 bg-slate-50 rounded-lg flex items-center justify-center">
                {i.icon}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-slate-900">{i.name}</p>
                <p className="text-xs text-slate-500 mt-0.5">{i.description}</p>
              </div>
              <Button size="sm" disabled className="flex-shrink-0">Em breve</Button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ── QR Code via Canvas API ────────────────────────────────────────────────────

function QrCodePanel({ url }: { url: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [gerado,  setGerado]  = useState(false)

  useEffect(() => {
    if (!url || !canvasRef.current) return
    setGerado(false)

    // QR code gerado com a QR Server API (não instala dependências)
    const img = new Image()
    const qrApiUrl = `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(url)}&format=png&margin=8`
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, 200, 200)
      ctx.drawImage(img, 0, 0, 200, 200)
      setGerado(true)
    }
    img.onerror = () => setGerado(false)
    img.src = qrApiUrl
  }, [url])

  function descarregar() {
    const canvas = canvasRef.current
    if (!canvas) return
    const a = document.createElement('a')
    a.download = 'qr-marcacao.png'
    a.href = canvas.toDataURL('image/png')
    a.click()
  }

  return (
    <div>
      <p className="text-xs font-medium text-slate-600 mb-2 flex items-center gap-1.5">
        <QrCode className="w-3.5 h-3.5" /> QR Code imprimível
      </p>
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-[104px] h-[104px] rounded-xl border border-slate-200 bg-white flex items-center justify-center overflow-hidden">
          <canvas ref={canvasRef} width={200} height={200} className="w-full h-full" />
          {!gerado && <div className="absolute inset-0 flex items-center justify-center bg-slate-50 rounded-xl"><QrCode className="w-8 h-8 text-slate-200" /></div>}
        </div>
        <div className="flex-1 space-y-2">
          <p className="text-xs text-slate-500">Imprima ou coloque na montra da clínica. Os clientes lêem o código e chegam directamente ao portal de marcação.</p>
          <button
            onClick={descarregar}
            disabled={!gerado}
            className="inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 disabled:opacity-40 transition-colors"
          >
            <Download className="w-3.5 h-3.5" />
            Descarregar PNG
          </button>
        </div>
      </div>
    </div>
  )
}
