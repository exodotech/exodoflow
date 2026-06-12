import React from 'react'
import { cn } from '@/lib/utils/cn'
import type { TableColumn, TableRow } from '@/types/ui/table'

export interface DataTableWrapperProps {
  columns: TableColumn[]
  rows: TableRow[]
  className?: string
  responsive?: boolean
  mobileKey?: string
}

export function DataTableWrapper({
  columns,
  rows,
  className,
}: DataTableWrapperProps) {
  if (rows.length === 0) {
    return (
      <div className="text-center py-8 text-sm text-gray-500">
        Nenhum dado disponível
      </div>
    )
  }

  return (
    <div className={cn('w-full overflow-x-auto rounded-lg border border-gray-200', className)}>
      <table className="w-full text-sm">
        {/* Desktop Header */}
        <thead className="hidden sm:table-header-group bg-gray-50 border-b border-gray-200">
          <tr>
            {columns.map((col) => (
              <th
                key={col.key}
                className={cn(
                  'px-4 py-3 font-semibold text-gray-700 text-left',
                  col.align === 'center' && 'text-center',
                  col.align === 'right' && 'text-right'
                )}
                style={{ width: col.width }}
              >
                {col.label}
              </th>
            ))}
          </tr>
        </thead>

        {/* Body */}
        <tbody className="divide-y divide-gray-200">
          {rows.map((row, idx) => (
            <tr
              key={idx}
              className={cn(
                'sm:table-row block border-b border-gray-200 sm:border-b mb-4 sm:mb-0',
                'p-4 sm:p-0'
              )}
            >
              {columns.map((col) => (
                <td
                  key={col.key}
                  className={cn(
                    'block sm:table-cell px-4 py-3 text-gray-900',
                    'before:content-[attr(data-label)] before:font-semibold before:text-gray-600',
                    'before:mr-4 before:sm:hidden before:inline-block before:min-w-fit',
                    col.align === 'center' && 'sm:text-center',
                    col.align === 'right' && 'sm:text-right'
                  )}
                  data-label={`${col.label}: `}
                >
                  {row[col.key]}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default DataTableWrapper
