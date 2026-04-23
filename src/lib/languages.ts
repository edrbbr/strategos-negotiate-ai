export interface LanguageOption {
  code: string;
  label: string;
}

export const LANGUAGES: LanguageOption[] = [
  { code: "de", label: "Deutsch" },
  { code: "en", label: "Englisch" },
  { code: "tr", label: "Türkisch" },
  { code: "fr", label: "Französisch" },
  { code: "es", label: "Spanisch" },
  { code: "it", label: "Italienisch" },
  { code: "nl", label: "Niederländisch" },
  { code: "pl", label: "Polnisch" },
  { code: "ar", label: "Arabisch" },
  { code: "pt", label: "Portugiesisch" },
  { code: "ru", label: "Russisch" },
  { code: "ro", label: "Rumänisch" },
  { code: "el", label: "Griechisch" },
  { code: "zh", label: "Chinesisch" },
];

export const MEDIUMS: { value: string; label: string }[] = [
  { value: "email", label: "E-Mail" },
  { value: "letter", label: "Brief" },
  { value: "whatsapp", label: "WhatsApp Nachricht" },
  { value: "sms", label: "SMS / Kurzmitteilung" },
  { value: "phone", label: "Telefonleitfaden" },
  { value: "note", label: "Gesprächsnotiz" },
];