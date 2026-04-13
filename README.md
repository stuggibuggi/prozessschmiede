# Prozessschmiede

Enterprise BPMN Governance Platform fuer fachliche Prozessmodellierung, Repository, Governance und Freigaben.

## Workspace

- `docs/`: fuehrende Architektur- und Planungsartefakte
- `apps/web`: Next.js Frontend
- `apps/api`: NestJS Backend
- `packages/ui`: gemeinsames UI-Design-System
- `packages/types`: gemeinsame Domain- und API-Typen
- `packages/config`: zentrale Konfiguration
- `packages/bpmn`: BPMN-spezifische Frontend-Bausteine
- `packages/testing`: geteilte Testhilfen

## Schnellstart

```bash
pnpm install
pnpm db:generate
pnpm dev
```

Wenn `pnpm` lokal nicht im PATH liegt, funktioniert stattdessen:

```bash
corepack pnpm install
corepack pnpm db:generate
corepack pnpm db:push
corepack pnpm db:seed
corepack pnpm dev
```

## Produktion (Linux/Plesk)

Empfohlene Schritte im Projektordner:

```bash
corepack pnpm install
corepack pnpm --filter api prisma:generate
corepack pnpm --filter api prisma:push
corepack pnpm build
```

Wichtige ENV-Werte (z. B. in `.env` und `apps/web/.env.production`):

```env
PORT=4200
NEXT_PUBLIC_API_BASE_URL=http://prozessschmiede.ikt-asset.de:4200/api/v1
```

Start (Beispiel):

```bash
corepack pnpm --filter api start:env
corepack pnpm --filter web start -- -p 3400
```

Falls `next build` auf kleinen Servern mit `spawn ... EAGAIN` scheitert:

```bash
corepack pnpm --filter web exec next build --experimental-build-mode=compile --no-lint
```

Nach Schema-Erweiterungen (z. B. neue Governance-Routing-Regeln) bitte immer erneut ausfuehren:

```bash
corepack pnpm db:generate
corepack pnpm db:push
```

## Lokale Authentifizierung

Fuer lokale Entwicklung kann die API ohne Microsoft Entra ID im Mock-Modus betrieben werden.

Beispiel fuer `.env`:

```env
AUTH_MODE=mock
MOCK_USER_EMAIL=elena.hoffmann@example.com
MOCK_USER_DISPLAY_NAME=Elena Hoffmann
MOCK_USER_SUBJECT=mock-user-1
MOCK_USER_GROUPS=BPMN_MODELERS,BPMN_REVIEWERS,BPMN_APPROVERS
```

Fuer echten OIDC-Betrieb spaeter:

```env
AUTH_MODE=oidc
OIDC_ISSUER_URL=https://login.microsoftonline.com/<tenant-id>/v2.0
OIDC_CLIENT_ID=...
OIDC_CLIENT_SECRET=...
OIDC_REDIRECT_URI=http://localhost:3000/api/auth/callback/entra
```

## BPMN Referenzvorlage (Finanzprozess)

Eine importierbare Beispielvorlage fuer einen konzernueblichen Ablauf mit Pools, Lanes, KYC und Vier-Augen-Freigabe liegt hier:

- `docs/bpmn-templates/kontoeroeffnung-vieraugen.bpmn`

Nutzung:

1. Modell im Workspace oeffnen.
2. BPMN-XML durch den Dateiinhalt ersetzen.
3. `Draft speichern`.

## Architekturprinzipien

- API-first mit dokumentierter REST-Schnittstelle
- modularer Monolith mit klaren Domänengrenzen
- unveraenderliche Historisierung fuer freigegebene Modellversionen
- OIDC-basierte Enterprise-Authentifizierung mit Provider-Abstraktion
- BPMN XML plus relationale Lane-Zuordnungen
