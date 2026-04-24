import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Img,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface EliteRequestAdminProps {
  fullName?: string
  email?: string
  profession?: string
  primaryUseCase?: string
  monthlyVolume?: string
  painPoint?: string
  adminUrl?: string
}

const EliteRequestAdminEmail = ({
  fullName = '—',
  email = '—',
  profession = '—',
  primaryUseCase = '—',
  monthlyVolume = '—',
  painPoint = '—',
  adminUrl = 'https://pallanx.com/admin',
}: EliteRequestAdminProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Neue Elite-Anfrage von {fullName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Section style={brandRow}>
          <Img
            src="https://pallanx.com/pallanx-logo-light.png"
            alt="PALLANX"
            width="40"
            height="40"
            style={logoImg}
          />
          <Heading style={h1}>Neue Elite-Anfrage</Heading>
        </Section>
        <Text style={lead}>
          Eine neue Anfrage wurde im Imperialen System eingereicht.
        </Text>

        <Section style={card}>
          <Row label="Name" value={fullName} />
          <Row label="E-Mail" value={email} />
          <Row label="Beruf" value={profession} />
          <Row label="Use Case" value={primaryUseCase} />
          <Row label="Volumen" value={monthlyVolume} />
          <Row label="Bedarf" value={painPoint} multiline />
        </Section>

        <Section style={{ textAlign: 'center', margin: '32px 0' }}>
          <Button href={adminUrl} style={button}>
            Im Admin-Panel öffnen
          </Button>
        </Section>

        <Hr style={hr} />
        <Text style={footer}>PALLANX Imperial System</Text>
      </Container>
    </Body>
  </Html>
)

const Row = ({
  label,
  value,
  multiline = false,
}: {
  label: string
  value: string
  multiline?: boolean
}) => (
  <table style={{ width: '100%', borderCollapse: 'collapse' as const, margin: '6px 0' }}>
    <tbody>
      <tr>
        <td style={rowLabel}>{label}</td>
        <td style={multiline ? rowValueMultiline : rowValue}>{value}</td>
      </tr>
    </tbody>
  </table>
)

export const template = {
  component: EliteRequestAdminEmail,
  subject: (data: Record<string, any>) =>
    `Neue Elite-Anfrage: ${data.fullName ?? 'Unbekannt'}`,
  displayName: 'Elite-Anfrage (Admin-Notification)',
  previewData: {
    fullName: 'Maria Beispiel',
    email: 'maria@beispiel.de',
    profession: 'CEO',
    primaryUseCase: 'M&A Verhandlungen',
    monthlyVolume: '10-20',
    painPoint: 'Zeitdruck bei komplexen Deals',
    adminUrl: 'https://pallanx.com/admin',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Georgia, serif',
  color: '#1a1a1a',
}
const container = { maxWidth: '560px', margin: '0 auto', padding: '32px 24px' }
const h1 = {
  color: '#a4863e',
  fontWeight: 400,
  fontSize: '26px',
  margin: 0,
  display: 'inline-block' as const,
  verticalAlign: 'middle' as const,
}
const brandRow = {
  display: 'flex' as const,
  alignItems: 'center' as const,
  gap: '12px',
  margin: '0 0 12px',
}
const logoImg = {
  display: 'inline-block' as const,
  verticalAlign: 'middle' as const,
}
const lead = { fontSize: '15px', lineHeight: '1.6', margin: '0 0 24px' }
const card = {
  background: '#fafafa',
  borderLeft: '3px solid #a4863e',
  padding: '20px 24px',
  fontFamily: 'Arial, sans-serif',
}
const rowLabel = {
  padding: '6px 12px 6px 0',
  color: '#666666',
  fontSize: '12px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1px',
  width: '110px',
  verticalAlign: 'top' as const,
}
const rowValue = { padding: '6px 0', fontSize: '14px', color: '#1a1a1a' }
const rowValueMultiline = {
  ...rowValue,
  lineHeight: '1.6',
}
const button = {
  backgroundColor: '#a4863e',
  color: '#ffffff',
  padding: '14px 28px',
  textDecoration: 'none',
  borderRadius: '2px',
  fontFamily: 'Arial, sans-serif',
  fontSize: '14px',
  letterSpacing: '0.5px',
}
const hr = { borderColor: '#e5e5e5', margin: '40px 0 16px' }
const footer = {
  color: '#999999',
  fontSize: '11px',
  fontFamily: 'Arial, sans-serif',
  textAlign: 'center' as const,
  margin: 0,
}