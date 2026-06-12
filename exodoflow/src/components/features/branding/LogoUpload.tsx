'use client'
// Upload de logo para o Storage: PNG/JPEG/WebP, máx 2MB
// SVG bloqueado deliberadamente: pode conter <script> embebido (XSS armazenado)
import { useRef, useState } from 'react'
import { useUploadLogo, useRemoverLogo } from '@/hooks/useBranding'

const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/jpg', 'image/webp']
const MAX_BYTES = 2 * 1024 * 1024  // 2MB

interface LogoUploadProps {
  currentLogoUrl?: string
  onUpload: (url: string) => void
  onRemove: () => void
}

export function LogoUpload({ currentLogoUrl, onUpload, onRemove }: LogoUploadProps) {
  const inputRef  = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)

  const uploadMutation = useUploadLogo()
  const removeMutation = useRemoverLogo()

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setError(null)

    if (!ACCEPTED_TYPES.includes(file.type)) {
      setError('Formato inválido. Use PNG, JPEG ou WebP.')
      return
    }
    if (file.size > MAX_BYTES) {
      setError('Ficheiro demasiado grande. Máximo: 2MB.')
      return
    }

    uploadMutation.mutate(file, {
      onSuccess: (url) => {
        onUpload(url)
        if (inputRef.current) inputRef.current.value = ''
      },
      onError: (err) => setError(err.message),
    })
  }

  function handleRemove() {
    removeMutation.mutate(undefined, {
      onSuccess: () => onRemove(),
      onError:   (err) => setError(err.message),
    })
  }

  const isLoading = uploadMutation.isPending || removeMutation.isPending

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        Logótipo
        <span className="ml-1 text-xs text-gray-400">(opcional — PNG, JPEG ou WebP, máx 2MB)</span>
      </label>

      <div className="flex items-center gap-4">
        {/* Preview */}
        <div className="flex h-16 w-16 items-center justify-center rounded-xl border-2 border-dashed border-gray-200 bg-gray-50">
          {currentLogoUrl ? (
            // <img> em vez de next/image: o optimizer do Next recusa IPs privados
            // (Storage local) e logos de utilizador não precisam de optimização.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={currentLogoUrl}
              alt="Logo da empresa"
              className="h-12 w-12 rounded-lg object-contain"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none' }}
            />
          ) : (
            <svg className="h-8 w-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button
            type="button"
            disabled={isLoading}
            onClick={() => inputRef.current?.click()}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
          >
            {isLoading ? 'A carregar…' : currentLogoUrl ? 'Substituir' : 'Carregar logo'}
          </button>
          {currentLogoUrl && (
            <button
              type="button"
              disabled={isLoading}
              onClick={handleRemove}
              className="text-sm text-red-500 hover:underline disabled:opacity-50"
            >
              Remover
            </button>
          )}
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept={ACCEPTED_TYPES.join(',')}
        className="hidden"
        onChange={handleFileChange}
        aria-hidden="true"
      />

      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  )
}
