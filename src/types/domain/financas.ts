// Tipos de domínio — Módulo Financeiro (controlo interno de caixa).
// NÃO é contabilidade oficial nem faturação certificada.

export type FinancialType = 'income' | 'expense'

export type PaymentMethod =
  | 'dinheiro' | 'cartao' | 'transferencia' | 'mbway' | 'pix' | 'outro'

export type IncomeCategory =
  | 'servico' | 'venda_produto' | 'sinal' | 'outro'

export type ExpenseCategory =
  | 'salario' | 'renda' | 'produto_material' | 'manutencao'
  | 'marketing' | 'impostos' | 'transporte' | 'outro'

export type FinancialCategory = IncomeCategory | ExpenseCategory

// Estado de pagamento de uma marcação (coluna bookings.payment_status)
export type BookingPaymentStatus = 'pending' | 'paid' | 'partial' | 'cancelled_unpaid'

// Registo financeiro (espelha financial_transactions)
export interface FinancialTransaction {
  id:               string
  tenant_id:        string
  type:             FinancialType
  category:         string
  description:      string | null
  amount:           number
  currency:         string
  payment_method:   string
  transaction_date: string          // YYYY-MM-DD
  booking_id:       string | null
  client_id:        string | null
  created_by:       string | null
  created_at:       string
  updated_at:       string
  deleted_at:       string | null
}

// Recibo (espelha receipts) — comprovativo de pagamento numerado.
export interface Receipt {
  id:             string
  tenant_id:      string
  transaction_id: string
  year:           number
  number:         number
  amount:         number
  currency:       string
  description:    string | null
  payment_method: string
  issued_at:      string
  issuer_name:    string
  issuer_tax_id:  string | null
  issuer_address: string | null
  client_name:    string | null
  client_tax_id:  string | null
  created_by:     string | null
  created_at:     string
}

// Número formatado do recibo (ex: 2026/0001).
export function reciboNumero(r: Pick<Receipt, 'year' | 'number'>): string {
  return `${r.year}/${String(r.number).padStart(4, '0')}`
}

// ── Rótulos PT para a UI ──────────────────────────────────────────────────────
export const INCOME_CATEGORIES: { value: IncomeCategory; label: string }[] = [
  { value: 'servico',       label: 'Serviço' },
  { value: 'venda_produto', label: 'Venda de produto' },
  { value: 'sinal',         label: 'Sinal / adiantamento' },
  { value: 'outro',         label: 'Outro' },
]

export const EXPENSE_CATEGORIES: { value: ExpenseCategory; label: string }[] = [
  { value: 'salario',          label: 'Salário' },
  { value: 'renda',            label: 'Renda' },
  { value: 'produto_material', label: 'Produto / material' },
  { value: 'manutencao',       label: 'Manutenção' },
  { value: 'marketing',        label: 'Marketing' },
  { value: 'impostos',         label: 'Impostos / taxas' },
  { value: 'transporte',       label: 'Transporte' },
  { value: 'outro',            label: 'Outro' },
]

export const PAYMENT_METHODS: { value: PaymentMethod; label: string }[] = [
  { value: 'dinheiro',      label: 'Dinheiro' },
  { value: 'cartao',        label: 'Cartão' },
  { value: 'transferencia', label: 'Transferência' },
  { value: 'mbway',         label: 'MB Way' },
  { value: 'pix',           label: 'PIX' },
  { value: 'outro',         label: 'Outro' },
]

export const PAYMENT_STATUS_LABELS: Record<BookingPaymentStatus, string> = {
  pending:          'Pendente',
  paid:             'Pago',
  partial:          'Parcial',
  cancelled_unpaid: 'Cancelado s/ pagamento',
}

// Rótulo legível de uma categoria (entrada ou saída), com fallback ao próprio valor.
export function categoryLabel(value: string): string {
  const all = [...INCOME_CATEGORIES, ...EXPENSE_CATEGORIES] as { value: string; label: string }[]
  return all.find((c) => c.value === value)?.label ?? value
}

export function paymentMethodLabel(value: string): string {
  return PAYMENT_METHODS.find((m) => m.value === value)?.label ?? value
}
