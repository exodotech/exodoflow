'use client'
// Secção de Avaliações na ficha do cliente. Nota 1–5 (estrelas) + comentário.
import React, { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { Star, Plus, Trash2 } from 'lucide-react'
import { Button } from '@/components/design-system/Button/Button'
import { listarReviewsCliente, criarReview, removerReview } from '@/services/reviews'

function Estrelas({ valor, onPick, large = false }: { valor: number; onPick?: (n: number) => void; large?: boolean }) {
  const sz = large ? 'w-6 h-6' : 'w-4 h-4'
  return (
    <div className="inline-flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((n) => (
        <button
          key={n}
          type="button"
          disabled={!onPick}
          onClick={() => onPick?.(n)}
          className={onPick ? 'cursor-pointer' : 'cursor-default'}
          aria-label={`${n} estrela(s)`}
        >
          <Star className={`${sz} ${n <= valor ? 'fill-amber-400 text-amber-400' : 'text-gray-300'}`} />
        </button>
      ))}
    </div>
  )
}

export function AvaliacoesCliente({ clientId }: { clientId: string }) {
  const qc = useQueryClient()
  const [criar, setCriar] = useState(false)
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const key = ['cliente-reviews', clientId] as const
  const { data: reviews = [], isLoading } = useQuery({ queryKey: key, queryFn: () => listarReviewsCliente(clientId) })
  function invalidar() { void qc.invalidateQueries({ queryKey: key }) }

  const criarMut = useMutation({
    mutationFn: () => criarReview({ client_id: clientId, rating, comment }),
    onSuccess: () => { invalidar(); setCriar(false); setRating(5); setComment('') },
  })
  const removerMut = useMutation({ mutationFn: (id: string) => removerReview(id), onSuccess: invalidar })

  const media = reviews.length ? (reviews.reduce((a, r) => a + (r.rating as number), 0) / reviews.length) : 0

  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <p className="text-sm font-semibold text-gray-900 flex items-center gap-1.5">
          <Star className="w-4 h-4 text-gray-400" /> Avaliações
          {reviews.length > 0 && (
            <span className="text-xs font-normal text-gray-500">· média {media.toFixed(1)} ({reviews.length})</span>
          )}
        </p>
        <button onClick={() => setCriar((v) => !v)} className="text-xs font-medium text-[color:var(--tenant-primary)] hover:underline">
          {criar ? 'Fechar' : '+ Nova avaliação'}
        </button>
      </div>

      {criar && (
        <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 space-y-3 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-600">Nota:</span>
            <Estrelas valor={rating} onPick={setRating} large />
          </div>
          <textarea
            rows={2}
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder="Comentário (opcional)"
            className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-[color:var(--tenant-primary)]"
          />
          {criarMut.isError && <p className="text-xs text-red-600">{(criarMut.error as Error).message}</p>}
          <Button size="sm" onClick={() => criarMut.mutate()} isLoading={criarMut.isPending} disabled={criarMut.isPending} className="gap-1.5">
            <Plus className="w-4 h-4" /> Guardar avaliação
          </Button>
        </div>
      )}

      {isLoading ? (
        <p className="text-xs text-gray-400 italic">A carregar...</p>
      ) : reviews.length === 0 ? (
        <p className="text-xs text-gray-400 italic">Sem avaliações.</p>
      ) : (
        <div className="space-y-2">
          {reviews.map((r) => (
            <div key={r.id} className="bg-white border border-gray-200 rounded-xl p-3">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <Estrelas valor={r.rating as number} />
                  {r.comment && <p className="text-sm text-gray-700 mt-1">{r.comment}</p>}
                  <p className="text-[11px] text-gray-400 mt-1">{new Date(r.created_at).toLocaleDateString('pt-PT')}</p>
                </div>
                <button onClick={() => removerMut.mutate(r.id)} disabled={removerMut.isPending} className="p-1 rounded text-red-400 hover:bg-red-50 disabled:opacity-50" title="Remover">
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
