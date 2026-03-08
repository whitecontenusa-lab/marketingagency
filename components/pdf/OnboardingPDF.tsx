import React from 'react'
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

const styles = StyleSheet.create({
  page: {
    backgroundColor: '#ffffff',
    padding: 40,
    fontFamily: 'Helvetica',
  },
  header: {
    marginBottom: 24,
    borderBottom: '1pt solid #f4f4f5',
    paddingBottom: 16,
  },
  headerTitle: {
    fontSize: 16,
    fontFamily: 'Helvetica-Bold',
    color: '#18181b',
    marginBottom: 4,
  },
  headerSubtitle: {
    fontSize: 12,
    color: '#18181b',
    fontFamily: 'Helvetica',
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#18181b',
    textTransform: 'uppercase',
    letterSpacing: 1,
    marginBottom: 8,
    paddingBottom: 4,
    borderBottom: '1pt solid #f4f4f5',
  },
  row: {
    marginBottom: 8,
  },
  rowLabel: {
    fontSize: 8,
    color: '#71717a',
    marginBottom: 1,
    fontFamily: 'Helvetica',
  },
  rowValue: {
    fontSize: 9,
    color: '#18181b',
    fontFamily: 'Helvetica',
  },
  twoCol: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colHalf: {
    width: '50%',
    marginBottom: 8,
    paddingRight: 8,
  },
})

function str(val: unknown): string {
  if (val === null || val === undefined || val === '') return '—'
  if (typeof val === 'string') return val.trim() === '' ? '—' : val.trim()
  if (typeof val === 'boolean') return val ? 'Sí' : 'No'
  if (typeof val === 'number') return String(val)
  if (Array.isArray(val)) return val.length === 0 ? '—' : val.join(', ')
  if (typeof val === 'object') {
    try {
      const s = JSON.stringify(val)
      return s === '{}' || s === '[]' ? '—' : s
    } catch {
      return '—'
    }
  }
  return String(val)
}

function parseJsonField(val: unknown): string {
  if (val === null || val === undefined || val === '') return '—'
  if (typeof val === 'string') {
    const trimmed = val.trim()
    if (trimmed === '') return '—'
    try {
      const parsed = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        if (parsed.length === 0) return '—'
        // Array of objects (e.g. values: [{name, description}]) — extract name
        if (parsed.length > 0 && typeof parsed[0] === 'object' && parsed[0] !== null) {
          return (parsed as Array<Record<string, unknown>>)
            .map(item => item.name ? String(item.name) : JSON.stringify(item))
            .join(', ')
        }
        return parsed.join(', ')
      }
      if (typeof parsed === 'object' && parsed !== null) {
        return JSON.stringify(parsed)
      }
      return String(parsed)
    } catch {
      return trimmed
    }
  }
  return str(val)
}

interface RowProps {
  label: string
  value: unknown
  json?: boolean
}

function Row({ label, value, json }: RowProps) {
  const display = json ? parseJsonField(value) : str(value)
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{display}</Text>
    </View>
  )
}

interface OnboardingPDFProps {
  session: Record<string, unknown>
}

export default function OnboardingPDF({ session }: OnboardingPDFProps) {
  const client = (session.client as Record<string, unknown>) ?? {}
  const profile = (client.profile as Record<string, unknown>) ?? {}

  const clientName = str(session.clientName)

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Perfil de Cliente — Avilion Humind</Text>
          <Text style={styles.headerSubtitle}>{clientName}</Text>
        </View>

        {/* 1. Información General */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Información General</Text>
          <View style={styles.twoCol}>
            <View style={styles.colHalf}>
              <Row label="Nombre del cliente" value={session.clientName} />
            </View>
            <View style={styles.colHalf}>
              <Row label="Nombre de marca" value={session.brandName} />
            </View>
            <View style={styles.colHalf}>
              <Row label="Email" value={session.email} />
            </View>
            <View style={styles.colHalf}>
              <Row label="WhatsApp" value={session.whatsapp} />
            </View>
            <View style={styles.colHalf}>
              <Row label="País" value={session.country} />
            </View>
            <View style={styles.colHalf}>
              <Row label="Industria" value={session.industry} />
            </View>
            <View style={styles.colHalf}>
              <Row label="Canales" value={session.channels} />
            </View>
            <View style={styles.colHalf}>
              <Row label="Etapa del negocio" value={session.businessStage} />
            </View>
          </View>
          <Row label="Descripción del producto/servicio" value={session.productDescription} />
          <View style={styles.twoCol}>
            <View style={styles.colHalf}>
              <Row label="Precio del producto" value={session.productPrice} />
            </View>
            <View style={styles.colHalf}>
              <Row label="Ingresos mensuales" value={session.monthlyRevenue} />
            </View>
          </View>
        </View>

        {/* 2. Propósito y Valores */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Propósito y Valores</Text>
          <Row label="Propósito" value={session.purpose} />
          <Row label="Valores" value={session.values} json />
          <Row label="Lista de nunca" value={session.neverList} json />
        </View>

        {/* 3. ICP Profundo */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>ICP Profundo</Text>
          <Row label="Microsegmento ICP" value={profile.icpMicrosegment} />
          <Row label="Diálogo interno del ICP" value={profile.icpInternalDialogue} />
          <Row label="Dolor profundo del ICP" value={profile.icpDeepPain} />
          <Row label="Deseo profundo del ICP" value={profile.icpDeepDesire} />
          <Row label="Objeción del ICP" value={profile.icpObjection} />
          <Row label="Contraargumento" value={profile.icpCounterargument} />
        </View>

        {/* 4. Arquetipos */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Arquetipos</Text>
          <View style={styles.twoCol}>
            <View style={styles.colHalf}>
              <Row label="Arquetipo emocional" value={profile.emotionalArchetype} />
            </View>
            <View style={styles.colHalf}>
              <Row label="Descripción arquetipo emocional" value={profile.emotionalArchetypeDesc} />
            </View>
            <View style={styles.colHalf}>
              <Row label="Arquetipo de audiencia" value={profile.audienceArchetype} />
            </View>
            <View style={styles.colHalf}>
              <Row label="Descripción arquetipo de audiencia" value={profile.audienceArchetypeDesc} />
            </View>
          </View>
          <Row label="Relación entre arquetipos" value={profile.archetypeRelationship} />
        </View>

        {/* 5. Contenido y Voz */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Contenido y Voz</Text>
          <Row label="Pilares de contenido" value={profile.contentPillars} />
          <Row label="Emoción del contenido" value={profile.contentEmotion} />
          <Row label="Transformación del contenido" value={profile.contentTransformation} />
          <Row label="Adjetivos de voz" value={profile.voiceAdjectives} />
          <Row label="Vocabulario de voz" value={profile.voiceVocabulary} />
          <Row label="Vocabulario prohibido" value={profile.voiceForbidden} />
          <Row label="Tono por contexto" value={profile.toneByContext} />
          <Row label="Formatos por canal" value={profile.channelFormats} />
        </View>

        {/* 6. Funnel y Precios */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Funnel y Precios</Text>
          <View style={styles.twoCol}>
            <View style={styles.colHalf}>
              <Row label="Tipo de funnel" value={profile.funnelType} />
            </View>
            <View style={styles.colHalf}>
              <Row label="Razón del funnel" value={profile.funnelReason} />
            </View>
            <View style={styles.colHalf}>
              <Row label="Precio de entrada" value={profile.pricingEntry} />
            </View>
            <View style={styles.colHalf}>
              <Row label="Precio core" value={profile.pricingCore} />
            </View>
            <View style={styles.colHalf}>
              <Row label="Precio premium" value={profile.pricingPremium} />
            </View>
          </View>
          <Row label="Promesa de valor" value={profile.valuePromise} />
        </View>

        {/* 7. Gate Filosófico */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Gate Filosófico</Text>
          <View style={styles.twoCol}>
            <View style={styles.colHalf}>
              <Row label="¿Puede entregar los resultados?" value={profile.gateCanDeliver} />
            </View>
            <View style={styles.colHalf}>
              <Row label="¿Propósito genuino?" value={profile.gateGenuinePurpose} />
            </View>
            <View style={styles.colHalf}>
              <Row label="¿El auto sirve al propósito?" value={profile.gateAutoServesPurpose} />
            </View>
            <View style={styles.colHalf}>
              <Row label="¿Resultados medibles?" value={profile.gateMeasurableResults} />
            </View>
            <View style={styles.colHalf}>
              <Row label="Resultado del gate" value={profile.gateResult} />
            </View>
          </View>
          <Row label="Notas de diagnóstico" value={profile.gateDiagnosisNotes} />
          <Row label="Estado emocional inicial" value={profile.initialEmotionalState} />
        </View>
      </Page>
    </Document>
  )
}
