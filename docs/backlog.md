# Product Backlog

## Epic: Identity & Access

### Feature: Enterprise Login

- Story: Als Benutzer moechte ich mich per Microsoft Entra ID anmelden, damit ich SSO ohne separates Passwort nutzen kann.
- Akzeptanzkriterien:
  - OIDC Login ist moeglich.
  - Benutzer werden anhand normalisierter Claims intern gemappt.
  - Rollen koennen aus Gruppen und Stammdaten abgeleitet werden.

### Feature: Rollen und Berechtigungen

- Story: Als Administrator moechte ich Rollen und Berechtigungen verwalten, damit Zugriffe nachvollziehbar konfiguriert werden koennen.
- Akzeptanzkriterien:
  - Rollen enthalten Permissions.
  - Benutzer- und Gruppenzuordnungen sind auditierbar.
  - kritische Admin-Aktionen sind geschuetzt.

## Epic: Repository

- Story: Als Fachbereich moechte ich Prozesse und Teilprozesse strukturiert verwalten, damit fachliche Modelle auffindbar und governed sind.
- Akzeptanzkriterien:
  - Prozesse besitzen Business-ID, Kategorie, Gruppe und Status.
  - Teilprozesse sind pro Prozess anlegbar.
  - Suche, Filter und Sortierung funktionieren.

## Epic: BPMN Modeling

- Story: Als Modellierer moechte ich BPMN-Diagramme im Browser pflegen, damit keine Desktop-Installation noetig ist.
- Akzeptanzkriterien:
  - BPMN XML kann importiert und exportiert werden.
  - Kern-BPMN-Elemente, Pools und Lanes werden unterstuetzt.
  - Validierung und Export nach SVG/PDF sind vorgesehen.

## Epic: Lane Mapping

- Story: Als Modellierer moechte ich Lanes strukturiert Organisationen, Rollen und Anwendungen zuordnen, damit Verantwortungen explizit dokumentiert sind.
- Akzeptanzkriterien:
  - Lane-Zuordnungen sind in UI sichtbar und bearbeitbar.
  - Zuordnungen werden relational gespeichert.
  - Aenderungen bleiben versioniert nachvollziehbar.

## Epic: Versioning & Locking

- Story: Als Modellierer moechte ich Modelle versionieren und exklusiv bearbeiten, damit freigegebene Staende geschuetzt bleiben.
- Akzeptanzkriterien:
  - Draft, Review, Approved, Published und Archived werden unterstuetzt.
  - publizierte Versionen sind unveraenderlich.
  - pro Modell ist maximal ein aktiver Schreib-Lock moeglich.

## Epic: Governance & Approval

- Story: Als Reviewer moechte ich Modelle pruefen und zurueckgeben, damit fachliche Qualitaet gesichert ist.
- Akzeptanzkriterien:
  - Review Requests koennen eingereicht, kommentiert und entschieden werden.
  - Vier-Augen-Prinzip ist technisch abgesichert.
  - Freigabehistorie ist auditierbar.

## Epic: Collaboration

- Story: Als Benutzer moechte ich Kommentare direkt am Modellkontext hinterlassen, damit Abstimmungen nachvollziehbar bleiben.
- Akzeptanzkriterien:
  - Kommentare koennen global oder an BPMN-Elemente gebunden sein.
  - offene Themen sind als Review-Basis nutzbar.
  - Benachrichtigungen sind architektonisch vorbereitet.

## Epic: Search

- Story: Als Benutzer moechte ich Prozesse, Modelle und Kommentare durchsuchen, damit ich Inhalte schnell finde.
- Akzeptanzkriterien:
  - Suchindex basiert initial auf PostgreSQL.
  - Filter und Volltext lassen sich kombinieren.
  - Suchadapter erlaubt spaetere externe Suchengine.

## Epic: Audit & Compliance

- Story: Als Auditor moechte ich alle wesentlichen Aenderungen nachvollziehen, damit regulatorische Anforderungen erfuellt sind.
- Akzeptanzkriterien:
  - Statuswechsel und Entscheidungen werden protokolliert.
  - Audit Events sind append-only.
  - Fachliche und technische Aenderungen sind korrelierbar.

## Epic: Admin & Operations

- Story: Als Plattformteam moechte ich die Anwendung sicher betreiben, damit Verfuegbarkeit und Nachvollziehbarkeit gewaehrleistet sind.
- Akzeptanzkriterien:
  - Health Checks, strukturierte Logs und Metriken sind vorhanden.
  - Konfigurationen sind zentral und validiert.
  - Admin-Konsole deckt Stammdaten und Overrides ab.

