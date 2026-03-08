import type { Metadata } from 'next'
import type { ReactNode } from 'react'

export const metadata: Metadata = {
  title: 'Bienvenido — Avilion Humind',
  description: 'Completa tu perfil de onboarding',
}

export default function OnboardingLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
