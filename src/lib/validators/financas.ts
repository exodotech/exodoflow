// Validação — Módulo Financeiro (controlo interno de caixa).
import { z } from 'zod'

// Lançar uma transação (entrada ou saída). amount SEMPRE positivo; type define o sinal.
export const criarTransacaoSchema = z.object({
  type:           z.enum(['income', 'expense']),
  category:       z.string().min(1, 'Categoria obrigatória').max(50, 'Categoria demasiado longa'),
  description:    z.string().max(500, 'Máximo 500 caracteres').optional().or(z.literal('')),
  amount:         z.coerce.number().positive('O valor deve ser maior que zero').max(99_999_999, 'Valor demasiado alto'),
  payment_method: z.enum(['dinheiro', 'cartao', 'transferencia', 'mbway', 'pix', 'outro']),
  transaction_date: z.string().date('Data inválida'),
  booking_id:     z.string().uuid('Marcação inválida').optional().or(z.literal('')),
  client_id:      z.string().uuid('Cliente inválido').optional().or(z.literal('')),
})

export const atualizarTransacaoSchema = criarTransacaoSchema.partial()

// Atualizar o estado de pagamento de uma marcação.
export const atualizarPagamentoSchema = z.object({
  payment_status: z.enum(['pending', 'paid', 'partial', 'cancelled_unpaid']),
  amount_paid:    z.coerce.number().min(0, 'Valor inválido').optional(),
})

export type CriarTransacaoInput     = z.infer<typeof criarTransacaoSchema>
export type AtualizarTransacaoInput = z.infer<typeof atualizarTransacaoSchema>
export type AtualizarPagamentoInput = z.infer<typeof atualizarPagamentoSchema>
