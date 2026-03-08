import type { Lang } from '@/lib/i18n'

export interface StepProps {
  lang: Lang
  session: Record<string, string | number | null>
  saving: boolean
  step: number
  total: number
  onNext: (data: Record<string, unknown>) => Promise<void>
  onBack: () => void
}
