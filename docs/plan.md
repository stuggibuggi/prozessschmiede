# Enterprise BPMN Governance Platform - Plan

## Gesamtzielbild

Die Plattform ist das zentrale fachliche Modellierungs- und Governance-System fuer Prozesse und Teilprozesse eines Finanzkonzerns. Sie kombiniert ein revisionsfreundliches Prozessrepository mit browserbasierter BPMN-2.0-Modellierung, versionierten Modellartefakten, Freigabeworkflows und vollstaendiger Auditierbarkeit.

Die Anwendung wird als Greenfield-Loesung aufgebaut und auf Enterprise-Reife ausgerichtet. Sie ist kein MVP, sondern ein modular erweiterbares Produktfundament mit klaren Domänengrenzen, API-first-Schnittstellen, belastbarer Security-Architektur und produktionsreifen Betriebsmechanismen.

## Scope

Im Scope:

- Prozessrepository fuer Prozesse und Teilprozesse
- BPMN 2.0 Modellierung im Browser mit `bpmn-js`
- mehrfache Modelle pro Prozess oder Teilprozess
- versionierte Modellstati von Draft bis Published
- Lane-Zuordnungen fuer Organisationen, Rollen und Anwendungen
- Governance, Review und Vier-Augen-Freigabe
- Kommentare, Attachments, Locks und Audit-Historie
- Admin-Konsole, Suche, Monitoring-Vorbereitung und mehrsprachige UI

Nicht Ziele fuer die erste Enterprise-Ausbaustufe:

- direkte Workflow-Ausfuehrung der modellierten BPMN-Prozesse
- echte technische Multi-Tenant-Isolation
- vollstaendige Offline-Bearbeitung
- externe Suchengine in der ersten Ausbaustufe

## Annahmen

- Single-Tenant innerhalb eines Konzerns mit mehreren Organisationseinheiten
- On-Prem-first Deployment, cloudneutrale Adapter
- OIDC mit Microsoft Entra ID als erster Identity Provider
- weitere Identity Provider spaeter ueber Adaptermodell
- UI ist vollstaendig i18n-faehig, fachliche Freitexte primaer einsprachig
- PostgreSQL ist das System of Record
- S3-kompatibler Object Storage ist verfuegbar oder ersetzbar

## Architektur

### Systemkontext

- `apps/web`: fachliche Benutzeroberflaeche fuer Repository, Modellierung, Freigaben und Administration
- `apps/api`: zentrale fachliche und technische Backend-API
- `PostgreSQL`: relationale Datenhaltung, Suche der ersten Ausbaustufe, Historie
- `Object Storage`: BPMN-Exports, XML-Artefakte, Attachments
- `Enterprise IdP`: OIDC Login, Claims und Gruppen

### Domänenmodule

- Identity & Access
- Process Catalog
- Process Modeling
- Governance
- Collaboration
- Audit
- Search
- Administration
- Integration

### Architekturprinzipien

- modularer Monolith mit sauberen Ports und Adaptern
- fachliche und technische IDs getrennt
- publizierte Modellversionen sind unveraenderlich
- alle kritischen Aktionen erzeugen Audit Events
- kein direkter Frontend-Zugriff auf Datenquellen ohne API

## Releaseplanung bis Enterprise-Reife

### R1 Platform Foundation

- Monorepo, CI/CD, Design System, Config, Logging
- OIDC Login, Sessions, Rollenmodell, Audit-Grundlagen
- Stammdaten fuer Organisationen, Anwendungen, Kategorien und Gruppen
- Prisma Schema, Migrationen, OpenAPI, Health Checks

Definition of Done:

- Web und API lassen sich lokal und in CI bauen
- Authentifizierung, Autorisierung und Audit-Basis sind lauffaehig
- Architekturtests und Basisdokumentation liegen vor

### R2 Repository & Modeling Core

- Prozesse, Teilprozesse, Modellcontainer und Modellversionen
- BPMN Editor Shell, XML Import/Export, Validierung, SVG/PDF Export
- Lane-Mapping, Locking, Check-in/Check-out
- Detailseiten, Listen, Filter und Suchbasis

Definition of Done:

- Prozesse koennen angelegt, gesucht und bearbeitet werden
- Modelle koennen versioniert gespeichert und gesperrt werden
- Lane-Zuordnungen sind persistent und in UI bearbeitbar

### R3 Governance & Collaboration

- Review und Approval Requests
- Rueckgabe mit Kommentar, Vier-Augen-Prinzip, Freigabehistorie
- Kommentare, Aufgabenbasis und Benachrichtigungsarchitektur
- Freigabe- und Statusaenderungen voll auditierbar

Definition of Done:

- review- und freigaberelevante Aktionen sind regelbasiert abgesichert
- alle Entscheidungen sind fachlich und technisch nachvollziehbar
- UI unterstuetzt Review-Flows end-to-end

### R4 Enterprise Hardening

- Suchhärtung, Admin-Konsole, Reporting, Export
- Security Controls, Betriebsmetriken, Tracing und Observability
- Performance- und Recovery-Haertung
- Integrationsadapter fuer weitere Enterprise-Systeme

Definition of Done:

- Security Controls und Betriebskennzahlen sind produktionsreif
- Recovery- und Performance-Szenarien sind getestet
- Dokumentation und Runbooks sind fuer Betrieb und Audit vorhanden

## Risiken

- `bpmn-js` Integration und Properties Panel erfordern gezielte Kapselung.
- XML und relationale Lane-Zuordnungen muessen konsistent synchronisiert werden.
- Berechtigungen auf Objekt- und Statusbasis koennen schnell komplex werden.
- Locking- und Override-Faelle brauchen klare Regeln und Auditierung.
- Audit-Volumen kann ohne Aufbewahrungs- und Archivierungsstrategie teuer werden.

## Offene Punkte

- PDF Export technisch intern oder ueber dedizierten Rendering-Service
- Benachrichtigungen initial E-Mail only oder eventbasiert mehrere Kanaele
- Sucherweiterung auf OpenSearch abhaengig von Last und Ranking-Anforderungen

