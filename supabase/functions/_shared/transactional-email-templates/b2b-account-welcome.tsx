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

interface Props {
  fullName?: string
  companyName?: string
  email?: string
  tempPassword?: string
  loginUrl?: string
}

const Email = ({
  fullName = 'Willkommen',
  companyName = '',
  email = '',
  tempPassword = '',
  loginUrl = 'https://pallanx.com/retail/login',
}: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Ihr Zugang zu Pallanx Retail Shield ist bereit</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={brand}>PALLANX Retail Shield</Heading>
        <Text style={greet}>Hallo {fullName},</Text>
        <Text style={paragraph}>
          für {companyName ? <strong>{companyName}</strong> : 'Ihr Unternehmen'} wurde
          ein Geschäftskonto bei Pallanx Retail Shield eingerichtet. Sie wurden als
          <strong> Leitung</strong> hinterlegt und können sich ab sofort anmelden.
        </Text>

        <Section style={card}>
          <Text style={cardKicker}>Ihre Zugangsdaten</Text>
          <Text style={cred}><strong>E-Mail:</strong> {email}</Text>
          <Text style={cred}><strong>Initiales Passwort:</strong> {tempPassword}</Text>
        </Section>

        <Section style={{ textAlign: 'center', margin: '28px 0' }}>
          <Button style={btn} href={loginUrl}>Jetzt anmelden</Button>
        </Section>

        <Text style={small}>
          Bitte ändern Sie das Passwort direkt nach der ersten Anmeldung.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>Pallanx Retail Shield</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: 'Ihr Zugang zu Pallanx Retail Shield',
  displayName: 'B2B Account Welcome',
  previewData: {
    fullName: 'Maria Muster',
    companyName: 'Muster GmbH',
    email: 'maria@muster.de',
    tempPassword: 'TempPass1234',
    loginUrl: 'https://pallanx.com/retail/login',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px', margin: '0 auto' }
const brand = { fontSize: '20px', fontWeight: 700, letterSpacing: '2px', color: '#111827', margin: '0 0 24px' }
const greet = { fontSize: '16px', color: '#111827', margin: '0 0 12px' }
const paragraph = { fontSize: '15px', lineHeight: '1.6', color: '#374151', margin: '0 0 20px' }
const card = { backgroundColor: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: '8px', padding: '18px 20px', margin: '20px 0' }
const cardKicker = { fontSize: '12px', textTransform: 'uppercase' as const, letterSpacing: '1px', color: '#6b7280', margin: '0 0 10px' }
const cred = { fontSize: '14px', color: '#111827', margin: '4px 0', fontFamily: 'monospace' }
const btn = { backgroundColor: '#111827', color: '#ffffff', padding: '12px 24px', borderRadius: '6px', textDecoration: 'none', fontSize: '14px', fontWeight: 600 }
const small = { fontSize: '13px', color: '#6b7280', margin: '12px 0 0' }
const hr = { borderColor: '#e5e7eb', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#9ca3af', textAlign: 'center' as const, margin: 0 }