// /admin/empresas/[id] — detalhe e gestão completa de uma empresa (SUPERADMIN).
// Server Component fino: resolve os params (Promise nesta versão do Next) e
// delega toda a interacção ao client component EmpresaDetalhe. O guard de acesso
// já vive em admin/layout.tsx (role === 'superadmin', server-side).
import { EmpresaDetalhe } from '@/components/features/admin/EmpresaDetalhe'

export default async function AdminEmpresaDetalhePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  return <EmpresaDetalhe tenantId={id} />
}
