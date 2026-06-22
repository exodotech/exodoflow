import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combina classNames do Tailwind CSS
 * Resolve conflitos de classes (ex: w-full e w-1/2)
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
