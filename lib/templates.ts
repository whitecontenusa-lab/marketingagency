type ProfileRecord = Record<string, unknown>

function val(v: unknown): string {
  if (v === null || v === undefined || v === '') return '(pendiente)'
  if (typeof v === 'boolean') return v ? 'Sí' : 'No'
  return String(v)
}

export function buildProfileFiles(
  session: Record<string, unknown>
): Array<{ path: string; content: string }> {
  const client = (session.client as Record<string, unknown> | null) ?? {}
  const profile = (client.profile as ProfileRecord | null) ?? {}

  // ── perfil/icp.md ────────────────────────────────────────────
  const icp = [
    '# ICP — Perfil del Cliente Ideal',
    '',
    `**Microsegmento:** ${val(profile.icpMicrosegment)}`,
    '',
    `**Diálogo interno:** ${val(profile.icpInternalDialogue)}`,
    '',
    `**Dolor profundo:** ${val(profile.icpDeepPain)}`,
    '',
    `**Deseo profundo:** ${val(profile.icpDeepDesire)}`,
    '',
    `**Objeción principal:** ${val(profile.icpObjection)}`,
    '',
    `**Contraargumento:** ${val(profile.icpCounterargument)}`,
  ].join('\n')

  // ── perfil/arquetipos.md ─────────────────────────────────────
  const arquetipos = [
    '# Arquetipos',
    '',
    `**Arquetipo emocional:** ${val(profile.emotionalArchetype)}`,
    '',
    `**Descripción arquetipo emocional:** ${val(profile.emotionalArchetypeDesc)}`,
    '',
    `**Arquetipo de audiencia:** ${val(profile.audienceArchetype)}`,
    '',
    `**Descripción arquetipo de audiencia:** ${val(profile.audienceArchetypeDesc)}`,
    '',
    `**Relación entre arquetipos:** ${val(profile.archetypeRelationship)}`,
  ].join('\n')

  // ── contenido/pilares.md ─────────────────────────────────────
  const pilares = [
    '# Pilares de Contenido',
    '',
    `**Pilares:** ${val(profile.contentPillars)}`,
    '',
    `**Emoción de contenido:** ${val(profile.contentEmotion)}`,
    '',
    `**Transformación de contenido:** ${val(profile.contentTransformation)}`,
  ].join('\n')

  // ── contenido/voz.md ─────────────────────────────────────────
  const voz = [
    '# Voz de Marca',
    '',
    `**Adjetivos de voz:** ${val(profile.voiceAdjectives)}`,
    '',
    `**Vocabulario:** ${val(profile.voiceVocabulary)}`,
    '',
    `**Palabras prohibidas:** ${val(profile.voiceForbidden)}`,
    '',
    `**Tono por contexto:** ${val(profile.toneByContext)}`,
    '',
    `**Formatos por canal:** ${val(profile.channelFormats)}`,
  ].join('\n')

  // ── funnel/estrategia.md ─────────────────────────────────────
  const funnelTypeMap: Record<number, string> = {
    0: '(pendiente)',
    1: 'Tipo 1',
    2: 'Tipo 2',
    3: 'Tipo 3',
  }
  const funnelTypeNum = typeof profile.funnelType === 'number' ? profile.funnelType : 0
  const funnelTypeLabel = funnelTypeMap[funnelTypeNum] ?? String(funnelTypeNum)

  const estrategia = [
    '# Estrategia de Funnel',
    '',
    `**Tipo de funnel:** ${funnelTypeNum === 0 ? '(pendiente)' : funnelTypeLabel}`,
    '',
    `**Razón del funnel:** ${val(profile.funnelReason)}`,
    '',
    `**Precio de entrada:** ${val(profile.pricingEntry)}`,
    '',
    `**Precio core:** ${val(profile.pricingCore)}`,
    '',
    `**Precio premium:** ${val(profile.pricingPremium)}`,
    '',
    `**Promesa de valor:** ${val(profile.valuePromise)}`,
  ].join('\n')

  // ── gate/diagnostico.md ──────────────────────────────────────
  const diagnostico = [
    '# Diagnóstico — Gate Filosófico',
    '',
    `**Puede entregar resultados reales:** ${val(profile.gateCanDeliver)}`,
    '',
    `**Tiene propósito genuino:** ${val(profile.gateGenuinePurpose)}`,
    '',
    `**La automatización sirve al propósito:** ${val(profile.gateAutoServesPurpose)}`,
    '',
    `**Los resultados son medibles:** ${val(profile.gateMeasurableResults)}`,
    '',
    `**Resultado del gate:** ${val(profile.gateResult)}`,
    '',
    `**Notas de diagnóstico:** ${val(profile.gateDiagnosisNotes)}`,
    '',
    `**Estado emocional inicial:** ${val(profile.initialEmotionalState)}`,
  ].join('\n')

  return [
    { path: 'perfil/icp.md', content: icp },
    { path: 'perfil/arquetipos.md', content: arquetipos },
    { path: 'contenido/pilares.md', content: pilares },
    { path: 'contenido/voz.md', content: voz },
    { path: 'funnel/estrategia.md', content: estrategia },
    { path: 'gate/diagnostico.md', content: diagnostico },
  ]
}
