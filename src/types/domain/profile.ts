import type { Database } from '@/types/database'
import type { AppRole }  from '@/types/domain/permission'

// ProfileRole = AppRole (alias mantido por retrocompatibilidade nos imports existentes)
export type ProfileRole = AppRole

type _Row = Database['public']['Tables']['profiles']['Row']

// Perfil com role tipado (não string genérico)
export type Profile = Omit<_Row, 'role'> & { role: AppRole }

type _InsertRow = Database['public']['Tables']['profiles']['Insert']
export type ProfileInsert = Omit<_InsertRow, 'role'> & { role?: AppRole }

type _UpdateRow = Database['public']['Tables']['profiles']['Update']
export type ProfileUpdate = Omit<_UpdateRow, 'role'> & { role?: AppRole }
