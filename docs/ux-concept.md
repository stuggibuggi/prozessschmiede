# UX Concept

## Leitbild

Die Oberflaeche ist ruhig, minimalistisch und praezise. Sie soll die visuelle Qualitaet moderner Apple-inspirierter Produktivsoftware erreichen, ohne die fachliche Dichte eines Enterprise-Systems zu verlieren.

## Navigationsstruktur

- Dashboard
- Prozesse
- Teilprozesse
- Modelle
- Reviews
- Audit
- Administration

## Hauptseiten

### Dashboard

- persoenliche Uebersicht mit Kacheln fuer `Meine Prozesse`, `Meine offenen Reviews`, `Zuletzt geaendert`
- Schnellzugriffe auf neue Modelle, Reviews und letzte Arbeitsstaende

### Repository

- Tabellen mit dichten, ruhigen Zeilen
- kombinierte Filter fuer Status, Kategorie, Gruppe, Owner, Organisation
- schnelle Suche und gespeicherte Ansichten

### Prozess- und Teilprozessdetail

- Kopfbereich mit Geschaefts-ID, Name, Status und Verantwortlichkeiten
- Tabs fuer Uebersicht, Modelle, Historie, Dokumente, Kommentare
- Versionstimeline und Kontextinformationen

### Modellierungsseite

- linke Palette fuer BPMN-Elemente
- zentrales Canvas fuer Diagramm
- rechte Inspector-Zone fuer Properties, Lane Mapping, Kommentare
- obere Aktionsleiste fuer Status, Lock, Speichern, Validieren, Export, Review

## Stilprinzipien

- viel Weissraum und dezente Rahmen
- matte Oberflaechen, kaum harte Farben
- klare Typografie-Hierarchie
- ruhige Statusindikatoren statt schriller Warnfarben
- Split-View und Sidepanels statt modal-lastiger Ablaufe

## Komponenten

- `AppShell`
- `TopNav`
- `CommandBar`
- `DataGrid`
- `DetailHeader`
- `StatusBadge`
- `SplitPane`
- `InspectorPanel`
- `VersionTimeline`
- `ApprovalDrawer`
- `CommentThread`
- `AttachmentPanel`
- `AuditTable`

## Mehrsprachigkeit

- UI-Strings werden per i18n-Layer lokalisiert
- Stammdaten koennen lokalisierbare Bezeichnungen erhalten
- Modellinhalte bleiben initial einsprachig

