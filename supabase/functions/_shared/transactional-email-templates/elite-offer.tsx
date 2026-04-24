import * as React from 'npm:react@18.3.1'
import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Section,
  Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

interface EliteOfferProps {
  fullName?: string
  profession?: string
  monthlyUrl?: string
  yearlyUrl?: string
}

const EliteOfferEmail = ({
  fullName = 'Verehrter Interessent',
  profession = '',
  monthlyUrl = 'https://pallanx.com/preise',
  yearlyUrl = 'https://pallanx.com/preise',
}: EliteOfferProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>{fullName}, Ihr persönlicher Imperialer Zugang ist freigegeben</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>PALLANX</Heading>
        <Text style={kicker}>Imperialer Zugang — Persönliche Einladung</Text>

        <Text style={greet}>{fullName},</Text>

        <Text style={paragraph}>
          Ihre Anfrage wurde geprüft. Auf Basis Ihres Profils
          {profession ? ` (${profession})` : ''} bieten wir Ihnen den Zugang zu
          PALLANX <strong>Imperial</strong> an — dem höchsten Tier, das nur nach
          persönlicher Eignungsprüfung vergeben wird.
        </Text>

        <Section style={card}>
          <Text style={cardKicker}>Was Sie erhalten</Text>
          <ul style={list}>
            <li style={listItem}>
              <strong>Multi-Stage-KI-Pipeline</strong> — spezialisierte Modelle in jeder Verhandlungsphase
            </li>
            <li style={listItem}>
              <strong>Unbegrenzte Dossiers</strong> — kein Monatszähler, keine Drosselung
            </li>
            <li style={listItem}>
              <strong>Maximale Tiefe</strong> — psychologische Profile, Gegnerprognose, mehrstufige Strategien
            </li>
            <li style={listItem}>
              <strong>Persönliches Onboarding</strong> — direkter Kontakt zum Team
            </li>
            <li style={listItem}>
              <strong>Priority Support</strong> — Antwort innerhalb von 4 Stunden
            </li>
          </ul>
        </Section>

        <Text style={italicNote}>
          Dieses Angebot ist befristet auf 7 Tage und nicht übertragbar.
        </Text>

        <Section style={{ margin: '32px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' as const }}>
            <tbody>
              <tr>
                <td style={{ width: '50%', padding: '0 6px 0 0' }}>
                  <Button href={monthlyUrl} style={btnSecondary}>
                    <span style={btnKickerSecondary}>Monatlich</span>
                    <br />
                    Imperial monatlich
                  </Button>
                </td>
                <td style={{ width: '50%', padding: '0 0 0 6px' }}>
                  <Button href={yearlyUrl} style={btnPrimary}>
                    <span style={btnKickerPrimary}>Empfohlen — 2 Monate gratis</span>
                    <br />
                    Imperial jährlich
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </Section>

        <Text style={small}>
          Bei Fragen antworten Sie einfach auf diese E-Mail. Wir melden uns binnen 24 Stunden.
        </Text>

        <Hr style={hr} />
        <Text style={footer}>
          PALLANX — Imperiales Verhandlungssystem
          <br />
          Diese Einladung wurde persönlich für Sie erstellt.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: EliteOfferEmail,
  subject: (data: Record<string, any>) =>
    `${data.fullName ?? 'Ihr'} persönlicher Imperialer Zugang ist freigegeben`,
  displayName: 'Elite-Einladung (Imperial Offer)',
  previewData: {
    fullName: 'Maria Beispiel',
    profession: 'CEO',
    monthlyUrl: 'https://pallanx.com/preise?elite=monthly&token=preview',
    yearlyUrl: 'https://pallanx.com/preise?elite=yearly&token=preview',
  },
} satisfies TemplateEntry

const main = {
  backgroundColor: '#ffffff',
  fontFamily: 'Georgia, serif',
  color: '#1a1a1a',
}
const container = {
  maxWidth: '600px',
  margin: '0 auto',
  padding: '48px 32px',
  background: '#fafafa',
}
const brand = {
  color: '#a4863e',
  fontWeight: 300,
  fontStyle: 'italic' as const,
  fontSize: '32px',
  margin: '0 0 6px',
  letterSpacing: '1px',
}
const kicker = {
  color: '#999999',
  fontSize: '11px',
  letterSpacing: '2px',
  textTransform: 'uppercase' as const,
  margin: '0 0 32px',
  fontFamily: 'Arial, sans-serif',
}
const greet = { fontSize: '16px', lineHeight: '1.7', margin: '0 0 16px' }
const paragraph = { fontSize: '16px', lineHeight: '1.7', margin: '0 0 24px' }
const card = {
  background: '#ffffff',
  borderLeft: '3px solid #a4863e',
  padding: '24px',
  margin: '24px 0 32px',
  fontFamily: 'Arial, sans-serif',
}
const cardKicker = {
  margin: '0 0 12px',
  color: '#666666',
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  letterSpacing: '1.5px',
}
const list = {
  margin: 0,
  paddingLeft: '20px',
  lineHeight: '1.9',
  fontSize: '14px',
}
const listItem = { marginBottom: '4px' }
const italicNote = {
  fontSize: '14px',
  lineHeight: '1.7',
  color: '#a4863e',
  fontStyle: 'italic' as const,
}
const btnPrimary = {
  display: 'block' as const,
  backgroundColor: '#a4863e',
  color: '#ffffff',
  padding: '18px 16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  fontFamily: 'Arial, sans-serif',
  fontSize: '14px',
  letterSpacing: '0.5px',
  borderRadius: '2px',
}
const btnSecondary = {
  display: 'block' as const,
  backgroundColor: 'transparent',
  color: '#a4863e',
  border: '1px solid #a4863e',
  padding: '17px 16px',
  textDecoration: 'none',
  textAlign: 'center' as const,
  fontFamily: 'Arial, sans-serif',
  fontSize: '14px',
  letterSpacing: '0.5px',
  borderRadius: '2px',
}
const btnKickerPrimary = {
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  color: '#ffffff',
  opacity: 0.85,
  letterSpacing: '1px',
}
const btnKickerSecondary = {
  fontSize: '11px',
  textTransform: 'uppercase' as const,
  color: '#666666',
  letterSpacing: '1px',
}
const small = {
  fontSize: '13px',
  color: '#666666',
  lineHeight: '1.7',
  marginTop: '40px',
  fontFamily: 'Arial, sans-serif',
}
const hr = { borderColor: '#e5e5e5', margin: '40px 0 16px' }
const footer = {
  color: '#999999',
  fontSize: '11px',
  fontFamily: 'Arial, sans-serif',
  textAlign: 'center' as const,
  margin: 0,
  lineHeight: '1.6',
}