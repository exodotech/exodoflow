// Hook utilitário: combina useForm com zodResolver para validação tipada
// Uso: const form = useFormWithZod(criarClienteSchema, { defaultValues: {...} })
import { useForm, type UseFormProps, type FieldValues } from 'react-hook-form'
import { zodResolver }                                  from '@hookform/resolvers/zod'
import type { z }                                       from 'zod'

// Nota: o cast 'as any' resolve incompatibilidade de variância entre Zod v4 e
// @hookform/resolvers v5. O comportamento em runtime é correcto.
export function useFormWithZod<TData extends FieldValues>(
  schema:   z.ZodType<TData>,
  options?: Omit<UseFormProps<TData>, 'resolver'>
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return useForm<TData>({ resolver: zodResolver(schema as any), ...options })
}
