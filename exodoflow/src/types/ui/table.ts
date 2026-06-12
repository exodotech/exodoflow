import type React from 'react'

// Coluna de tabela de dados
export interface TableColumn {
  key: string
  label: string
  width?: string
  align?: 'left' | 'center' | 'right'
}

// Linha de tabela (valores são ReactNode para suportar badges, botões, etc.)
export type TableRow = Record<string, React.ReactNode>
