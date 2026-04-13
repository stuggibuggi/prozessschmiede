# Technical Architecture

## Frontend

- `Next.js` App Router mit TypeScript und Tailwind
- Feature-orientierte Struktur unter `apps/web/src/features`
- gemeinsames Design System in `packages/ui`
- gemeinsames Domain- und API-Typing in `packages/types`
- BPMN-spezifische Frontend-Bausteine in `packages/bpmn`

## Backend

- `NestJS` modularer Monolith
- Module:
  - `identity`
  - `access-control`
  - `process-catalog`
  - `process-modeling`
  - `governance`
  - `collaboration`
  - `attachments`
  - `audit`
  - `search`
  - `admin`
- REST API unter `/api/v1`
- OpenAPI fuer externe und interne Verbraucher

## BPMN-Komponenten

- Browser-Modellierung via `bpmn-js`
- Properties Panel und BPMN-Elementinteraktionen
- XML Import/Export im Frontend mit serverseitiger Persistenz
- Export-Service fuer SVG/PDF
- Lane-Mapping-Synchronisierung ueber `bpmn_element_id`

## Suche

- Such-Port im Backend
- initial PostgreSQL Full-Text + Trigram
- spaeter eventbasierte Indexierung in externe Suchengine

## Storage

- PostgreSQL fuer relationale Fachdaten, Versionen und Audit
- S3-kompatibler Storage fuer Diagramm-Artefakte und Attachments
- Redis optional fuer Session- und Queue-Use-Cases

## Deployment

- getrennte Deployables fuer Web und API
- Reverse Proxy oder Ingress fuer Routing, TLS und Security Headers
- containerisierte Auslieferung, Kubernetes-kompatibel
- Secrets ueber dedizierten Secret Store
- CI/CD mit Migrations-Gates und Smoke Tests

## Monitoring und Logging

- strukturierte JSON Logs
- Metriken fuer HTTP, DB, Locking und Freigaben
- Tracing zwischen Web, API und Integrationen
- Security- und Audit-Logs getrennt auswertbar

