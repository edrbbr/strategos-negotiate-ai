<div align="center">

# STRATEGOS

**Sovereign Intelligence Platform for Strategic Negotiation**

![Status](https://img.shields.io/badge/status-late--stage_prototype-C9A84C?style=flat-square)
![Stack](https://img.shields.io/badge/stack-React_%2B_Supabase_%2B_AI-080909?style=flat-square)
![License](https://img.shields.io/badge/license-proprietary-lightgrey?style=flat-square)

[Deutsch](#-deutsch) · [English](#-english)

</div>

---

## 🇩🇪 Deutsch

STRATEGOS ist eine SaaS-Plattform, die Fach- und Führungskräften in komplexen Verhandlungssituationen einen strukturierten taktischen Vorsprung verschafft — bei Gehaltsgesprächen, Lieferantenverträgen, B2B-Deals, Mietstreitigkeiten oder Konfliktlösungen. Die Plattform kombiniert Prinzipien aus Spieltheorie, Tactical Empathy (Chris Voss / FBI) und dem Harvard Negotiation Project in einem dreistufigen AI-Workflow.

### Status

> **Late-Stage Prototype · Launch-Ready.**
> Frontend vollständig implementiert, Backend produktionsreif, AI-Routing live, Persistenz-Layer komplett. Ausstehend: Stripe-Integration und Dokumenten-Upload-Pipeline. Entwickelt als Solo-Projekt mit modernem Vibe-Coding-Workflow.

### Kern-Features

| Feature | Beschreibung |
|---|---|
| **Situations-Analyse** | Extraktion von Machtdynamik, Schwachpunkten der Gegenpartei und asymmetrischen Hebeln |
| **Strategie-Entwurf** | Anwendung bewährter Taktik-Modelle (Anchoring-Pivot, Tactical Empathy, MESO) |
| **Kommunikations-Draft** | Fertiger, sofort versendbarer E-Mail-/Script-Text im Premium-Business-Ton |
| **Refinement-Chat** | Feinjustierung des Drafts via Quick-Actions (aggressiver, kürzer, empathischer) oder Freitext |
| **Multi-Tier Routing** | AI-Modell wird abhängig vom User-Tier gewählt (Gemini Flash-Lite / Flash / GPT-5) |
| **Live-Persistenz** | Debounced Auto-Save (2s) in Supabase, Refresh-sicher |

### Architektur

```
┌──────────────────────────────────────────────────┐
│  Frontend · React + TailwindCSS                  │
│  Deep-Black Premium Design · Serif Typography    │
└────────────────────┬─────────────────────────────┘
                     │
            ┌────────┴────────┐
            │                 │
            ▼                 ▼
┌─────────────────────┐  ┌──────────────────────────┐
│  Supabase           │  │  Edge Functions (Deno)   │
│  · PostgreSQL + RLS │  │  · strategos-ai-router   │
│  · Auth (Email+OAuth│  │  · strategos-refinement  │
│  · Row-Level Security│ │                          │
└─────────────────────┘  └────────────┬─────────────┘
                                      │
                          ┌───────────┴───────────┐
                          │   Multi-Model Router  │
                          ├───────────────────────┤
                          │ Free  → Gemini Flash-Lite │
                          │ Pro   → Gemini 2.5 Flash │
                          │ Elite → GPT-5             │
                          └───────────────────────┘
```

### Tech Stack

- **Frontend:** React, TailwindCSS, shadcn/ui, React Query, Vite
- **Backend:** Supabase (PostgreSQL, Auth, Row-Level Security, Edge Functions in Deno)
- **AI-Layer:** Multi-Model-Routing via Lovable AI Gateway — Google Gemini 2.5 (Flash-Lite / Flash), OpenAI GPT-5
- **Strict-JSON-Outputs** via OpenAI Tool Calling für deterministische, parse-sichere AI-Antworten
- **Entwicklungsumgebung:** Lovable.dev (Vibe-Coding-Workflow)

### Datenmodell (vereinfacht)

```
plans ──< plan_prices
  │
  └──< plan_features

profiles (1:1 auth.users) ──> plans
  │
  └──< cases (Fall-Persistenz, RLS-geschützt)
```

- Konsequent normalisiert
- Row-Level Security auf allen User-Tabellen
- Server-seitiges Free-Tier-Enforcement via `SECURITY DEFINER`-RPCs (Client-Umgehung technisch unmöglich)
- Stripe-Integration vorbereitet (`stripe_customer_id`, `stripe_price_id`)

### Screenshots

| Dashboard | Case-Detail-Pipeline |
|---|---|
| ![Dashboard](./docs/screenshots/dashboard.png) | ![Case Detail](./docs/screenshots/fall_details.png) |

| Landing | Pricing |
|---|---|
| ![Landing](./docs/screenshots/landing_page.png) | ![Pricing](./docs/screenshots/preise.png) |

### Design-System

- **Primary:** `#C9A84C` (Gold)
- **Neutral:** `#080909` (Deep Black)
- **Secondary:** `#4A9ECA` (Analyse-Akzent)
- **Tertiary:** `#7EC8A0` (Execution-Akzent)
- **Typography:** Newsreader (Serif, Headlines & Body) · Space Grotesk (Labels, Monospace-Feel)

### Was explizit NICHT zum Launch gehört

Für Transparenz — diese Punkte sind bewusst noch nicht umgesetzt und stehen als nächste Iterationen auf der Roadmap:

- ⏳ **Stripe-Integration** — Datenmodell vorbereitet, Checkout-Flow noch nicht verkabelt
- ⏳ **Dokumenten-Upload** — Gemini 1.5 Pro für Vertragsanalyse als Elite-Feature geplant
- ⏳ **Funktionsvergleichs-Tabelle** — aktuell statisch, Migration auf DB-Daten folgt
- ⏳ **Multi-Model-Pipeline** — aktuell tier-basiertes Routing (ein Modell pro Call); V2-Architektur: aufgaben-basiertes Routing (Analyse/Strategie/Draft → jeweils spezialisiertes Modell)
- ⏳ **Notifications / Real-time-Updates** — aktueller Placeholder ist statisch
- ⏳ **Archiv-Cron** — pg_cron-Setup dokumentiert, nicht aktiviert

### Local Development

```bash
# Repository klonen
git clone https://github.com/<your-username>/strategos.git
cd strategos

# Dependencies installieren
npm install

# Supabase-Projekt verbinden
cp .env.example .env.local
# Folgende Variablen in .env.local setzen:
#   VITE_SUPABASE_URL
#   VITE_SUPABASE_ANON_KEY

# Entwicklungsserver starten
npm run dev
```

**Supabase-Setup:**
1. Neues Projekt auf [supabase.com](https://supabase.com) anlegen
2. SQL-Migrationen aus `supabase/migrations/` in Reihenfolge ausführen
3. Edge Functions deployen via Supabase CLI
4. Environment-Variable `LOVABLE_API_KEY` (oder direkte Provider-Keys) für AI-Zugriff setzen — ohne Key läuft ein Mock-Modus mit simulierten Antworten

### Roadmap

- [x] Design-System & UI-Grundlage
- [x] Auth-System (Email + Google OAuth)
- [x] Pricing-System (DB-getrieben)
- [x] Case-Persistenz + Auto-Save
- [x] AI-Router mit Tier-Logik
- [x] Free-Tier-Enforcement
- [x] Refinement-Chat
- [ ] Stripe-Integration
- [ ] Dokumenten-Upload (Gemini 1.5 Pro)
- [ ] Multi-Model-Pipeline (V2)
- [ ] Production-Launch

### Projekt-Kontext

STRATEGOS ist ein persönliches End-to-End-Projekt — von Konzeption über Architektur und technische Umsetzung bis zur Monetarisierungs-Strategie. Mehr dazu auf [LinkedIn](https://linkedin.com/in/<your-handle>).

### Lizenz

Proprietär — alle Rechte vorbehalten. Dieser Code dient der Dokumentation und dem Portfolio-Zweck. Keine Lizenz zur Nutzung, Vervielfältigung oder Modifikation.

---

## 🇬🇧 English

STRATEGOS is a SaaS platform that gives professionals and executives a structured tactical edge in complex negotiations — salary talks, supplier contracts, B2B deals, tenancy disputes, or conflict resolution. The platform combines principles from game theory, tactical empathy (Chris Voss / FBI), and the Harvard Negotiation Project in a three-stage AI workflow.

### Status

> **Late-Stage Prototype · Launch-Ready.**
> Frontend fully implemented, backend production-ready, AI routing live, persistence layer complete. Pending: Stripe integration and document upload pipeline. Built as a solo project using a modern vibe-coding workflow.

### Core Features

| Feature | Description |
|---|---|
| **Situation Analysis** | Extraction of power dynamics, counterparty weaknesses, and asymmetric leverage |
| **Strategy Draft** | Application of proven tactical models (Anchoring-Pivot, Tactical Empathy, MESO) |
| **Communication Draft** | Ready-to-send email/script text in premium business tone |
| **Refinement Chat** | Fine-tuning of the draft via quick actions (more aggressive, shorter, more empathetic) or free text |
| **Multi-Tier Routing** | AI model selected based on user tier (Gemini Flash-Lite / Flash / GPT-5) |
| **Live Persistence** | Debounced auto-save (2s) to Supabase, refresh-safe |

### Architecture

```
┌──────────────────────────────────────────────────┐
│  Frontend · React + TailwindCSS                  │
│  Deep-Black Premium Design · Serif Typography    │
└────────────────────┬─────────────────────────────┘
                     │
            ┌────────┴────────┐
            │                 │
            ▼                 ▼
┌─────────────────────┐  ┌──────────────────────────┐
│  Supabase           │  │  Edge Functions (Deno)   │
│  · PostgreSQL + RLS │  │  · strategos-ai-router   │
│  · Auth (Email+OAuth│  │  · strategos-refinement  │
│  · Row-Level Security│ │                          │
└─────────────────────┘  └────────────┬─────────────┘
                                      │
                          ┌───────────┴───────────┐
                          │   Multi-Model Router  │
                          ├───────────────────────┤
                          │ Free  → Gemini Flash-Lite │
                          │ Pro   → Gemini 2.5 Flash │
                          │ Elite → GPT-5             │
                          └───────────────────────┘
```

### Tech Stack

- **Frontend:** React, TailwindCSS, shadcn/ui, React Query, Vite
- **Backend:** Supabase (PostgreSQL, Auth, Row-Level Security, Edge Functions in Deno)
- **AI Layer:** Multi-model routing via Lovable AI Gateway — Google Gemini 2.5 (Flash-Lite / Flash), OpenAI GPT-5
- **Strict JSON Outputs** via OpenAI Tool Calling for deterministic, parse-safe AI responses
- **Development Environment:** Lovable.dev (vibe-coding workflow)

### Data Model (simplified)

```
plans ──< plan_prices
  │
  └──< plan_features

profiles (1:1 auth.users) ──> plans
  │
  └──< cases (case persistence, RLS-protected)
```

- Consistently normalized
- Row-level security on all user-facing tables
- Server-side free-tier enforcement via `SECURITY DEFINER` RPCs (client-side bypass technically impossible)
- Stripe integration prepared (`stripe_customer_id`, `stripe_price_id`)

### Screenshots

| Dashboard | Case Detail Pipeline |
|---|---|
| ![Dashboard](./docs/screenshots/dashboard.png) | ![Case Detail](./docs/screenshots/fall_details.png) |

| Landing | Pricing |
|---|---|
| ![Landing](./docs/screenshots/landing_page.png) | ![Pricing](./docs/screenshots/preise.png) |

### Design System

- **Primary:** `#C9A84C` (Gold)
- **Neutral:** `#080909` (Deep Black)
- **Secondary:** `#4A9ECA` (Analysis accent)
- **Tertiary:** `#7EC8A0` (Execution accent)
- **Typography:** Newsreader (Serif, headlines & body) · Space Grotesk (labels, monospace feel)

### Explicitly NOT in Launch Scope

For transparency — these items are intentionally not implemented yet and are on the roadmap as next iterations:

- ⏳ **Stripe integration** — data model prepared, checkout flow not yet wired
- ⏳ **Document upload** — Gemini 1.5 Pro for contract analysis planned as Elite feature
- ⏳ **Feature comparison table** — currently static, DB-driven migration to follow
- ⏳ **Multi-model pipeline** — currently tier-based routing (one model per call); V2 architecture: task-based routing (analysis/strategy/draft → specialized model per task)
- ⏳ **Notifications / real-time updates** — current placeholder is static
- ⏳ **Archive cron** — pg_cron setup documented, not activated

### Local Development

```bash
# Clone repository
git clone https://github.com/<your-username>/strategos.git
cd strategos

# Install dependencies
npm install

# Connect Supabase project
cp .env.example .env.local
# Set the following variables in .env.local:
#   VITE_SUPABASE_URL
#   VITE_SUPABASE_ANON_KEY

# Start dev server
npm run dev
```

**Supabase Setup:**
1. Create a new project at [supabase.com](https://supabase.com)
2. Run SQL migrations from `supabase/migrations/` in order
3. Deploy edge functions via Supabase CLI
4. Set `LOVABLE_API_KEY` environment variable (or direct provider keys) for AI access — without a key, a mock mode with simulated responses runs

### Roadmap

- [x] Design system & UI foundation
- [x] Auth system (Email + Google OAuth)
- [x] Pricing system (DB-driven)
- [x] Case persistence + auto-save
- [x] AI router with tier logic
- [x] Free-tier enforcement
- [x] Refinement chat
- [ ] Stripe integration
- [ ] Document upload (Gemini 1.5 Pro)
- [ ] Multi-model pipeline (V2)
- [ ] Production launch

### Project Context

STRATEGOS is a personal end-to-end project — from concept through architecture and technical implementation to monetization strategy. More on [LinkedIn](https://linkedin.com/in/<your-handle>).

### License

Proprietary — all rights reserved. This code serves documentation and portfolio purposes. No license granted for use, reproduction, or modification.

---

<div align="center">

**Built with Lovable.dev · Powered by Supabase · AI via Gemini & GPT**

</div>
