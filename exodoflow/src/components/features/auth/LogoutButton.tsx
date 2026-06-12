'use client'
// Botão de terminar sessão reutilizável. Usa o forceLogout central — à prova de
// sessão corrompida, com redirect garantido.
import { forceLogout } from '@/lib/auth/logout'
import { Button }      from '@/components/design-system/Button/Button'

export function LogoutButton() {
  return (
    <Button variant="outline" size="md" onClick={() => void forceLogout()}>
      Terminar sessão
    </Button>
  )
}
