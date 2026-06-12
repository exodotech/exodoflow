// Hook de mutação para os dados da empresa.
// Após guardar, refreshTenant() relê o tenant para a UI reflectir logo a mudança.
import { useMutation } from '@tanstack/react-query'
import { useAuth }     from '@/providers/AuthProvider'
import { atualizarDadosEmpresa } from '@/services/tenant'
import type { AtualizarEmpresaInput } from '@/lib/validators/empresa'

export function useAtualizarEmpresa() {
  const { refreshTenant } = useAuth()
  return useMutation({
    mutationFn: (input: AtualizarEmpresaInput) => atualizarDadosEmpresa(input),
    onSuccess:  () => void refreshTenant(),
  })
}
