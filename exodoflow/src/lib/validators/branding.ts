import { z } from 'zod'

const hexColorSchema = z
  .string()
  .regex(/^#[0-9a-fA-F]{6}$/, 'Cor inválida — use formato hexadecimal: #rrggbb')

// Branding simplificado: apenas logótipo + cor primária (theme_mode fixo em light).
// secondary_color foi removido — toda a UI usa só var(--tenant-primary).
export const brandingSettingsSchema = z.object({
  primary_color: hexColorSchema,
  logo_url: z.string().url('URL inválido').optional().or(z.literal('')),
  theme_mode: z.enum(['light', 'dark', 'system'], { error: 'Tema inválido' }),
})

export type BrandingSettingsInput = z.infer<typeof brandingSettingsSchema>
