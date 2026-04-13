# Domain Model

## Fachobjekte

### Benutzer und Zugriff

- `User`: interne Benutzeridentitaet mit externen Claims, Sprache und Status
- `Role`: fachliche oder technische Rolle
- `Permission`: atomare Berechtigung
- `Group`: externe oder interne Gruppierung fuer Rollenzuordnung

### Organisation und Stammdaten

- `Organization`: Organisationseinheit fuer Zuordnungen und Sichtbarkeit
- `Application`: fachliche Anwendung fuer Lane-Mapping
- `ProcessCategory`: Kategorisierung auf hoher Ebene
- `ProcessGroup`: fachliche Gruppierung innerhalb einer Kategorie

### Prozessrepository

- `Process`: fachlicher Oberprozess mit Geschaefts-ID wie `PRO-00001`
- `Subprocess`: fachlicher Teilprozess innerhalb eines Prozesses
- `ProcessRoleAssignment`: Zuordnung von Prozesseigentuemer, Verantwortung oder weiteren Rollen

### Modellierung

- `BpmnModel`: stabiler Modellcontainer an Prozess oder Teilprozess
- `ModelVersion`: konkrete, versionierte Auspraegung eines Modells
- `DiagramAsset`: BPMN XML und abgeleitete Artefakte
- `LaneMapping`: strukturierte Zuordnung BPMN Lane -> Organization/Role/Application
- `CheckoutLock`: exklusive Schreibsperre fuer die Bearbeitung

### Governance und Kollaboration

- `Comment`: fachlicher Kommentar, optional an BPMN-Kontext gebunden
- `Attachment`: Dokumente und Nachweise
- `ApprovalRequest`: Freigabeantrag fuer eine Modellversion
- `ApprovalStep`: definierter Schritt einer Freigabesequenz
- `ApprovalDecision`: konkrete Entscheidung pro Schritt und Akteur

### Nachvollziehbarkeit

- `AuditEvent`: unveraenderlicher Ereigniseintrag fuer fachliche oder technische Aenderung

## Beziehungen

- Ein `Process` hat mehrere `Subprocess`-Eintraege.
- Ein `Process` oder `Subprocess` kann mehrere `BpmnModel`-Container besitzen.
- Ein `BpmnModel` besitzt mehrere `ModelVersion`-Eintraege.
- Eine `ModelVersion` besitzt genau ein primäres BPMN XML `DiagramAsset`.
- Eine `ModelVersion` besitzt mehrere `LaneMapping`, `Comment` und `Attachment`-Eintraege.
- Ein `BpmnModel` besitzt hoechstens einen aktiven `CheckoutLock`.
- Eine `ModelVersion` kann mehrere `ApprovalRequest`-Eintraege durchlaufen.

## Kernattribute

### Process

- technische UUID
- business ID
- Name
- Beschreibung
- Kategorie
- Gruppe
- Status
- verantwortliche Organisation

### Subprocess

- technische UUID
- Parent Process
- Name
- Beschreibung
- Status
- Sortierreihenfolge

### BpmnModel

- technische UUID
- Referenz auf Process oder Subprocess
- Name
- Modelltyp
- aktive veroeffentlichte Version
- Lock-Status

### ModelVersion

- technische UUID
- semantische Versionsnummer
- Status
- Aenderungsnotiz
- Basisversion
- letzter Aenderer
- Zeitstempel
- Hash/Checksumme

## Statusmodelle

### Prozess und Teilprozess

- `draft`: fachlich angelegt, noch nicht im aktiven Einsatz
- `active`: gueltig und nutzbar
- `inactive`: voruebergehend ausgesetzt
- `archived`: historisiert, nicht mehr veraenderbar

### Modellversion

- `draft`: editierbar, noch nicht eingereicht
- `in_review`: zur Pruefung eingereicht
- `approved`: fachlich freigegeben, noch nicht publiziert
- `published`: aktiv veroeffentlicht
- `rejected`: abgelehnt
- `archived`: historisiert

### ApprovalRequest

- `pending`
- `in_review`
- `returned`
- `approved`
- `rejected`
- `cancelled`

### CheckoutLock

- `active`
- `released`
- `expired`
- `overridden`

## Fachregeln

- Ein Prozess hat mindestens null, spaeter beliebig viele Teilprozesse.
- Ein Teilprozess kann mehrere Modelle besitzen.
- Je Modell darf nur eine Version `published` sein.
- Publizierte Versionen duerfen nicht ueberschrieben werden.
- Lane-Zuordnungen muessen referenzierbar und historisierbar sein.
- Review und Approver muessen getrennte Personen sein.
- Jede relevante Aenderung erzeugt ein Audit Event.

