# Data Model

## Persistenzprinzipien

- technische Primaerschluessel als UUID
- Geschaeftsschluessel fuer fachliche Identifikation, z. B. `PRO-00001`
- append-only Historisierung fuer Audit und publizierte Versionen
- Foreign Keys ohne Cascade Delete fuer historische Kernobjekte
- Soft Delete nur dort, wo keine revisionskritische Historie verloren geht

## Tabellenentwurf

### Identity & Access

- `users`
- `groups`
- `roles`
- `permissions`
- `user_group_memberships`
- `user_role_assignments`
- `group_role_assignments`

### Stammdaten

- `organizations`
- `applications`
- `process_categories`
- `process_groups`

### Repository

- `processes`
- `subprocesses`
- `process_role_assignments`
- `bpmn_models`
- `model_versions`
- `diagram_assets`
- `lane_mappings`
- `checkout_locks`

### Kollaboration und Governance

- `comments`
- `attachments`
- `approval_requests`
- `approval_steps`
- `approval_decisions`

### Audit

- `audit_events`
- `audit_event_payloads`

## Schluesel und Beziehungen

- `processes.category_id -> process_categories.id`
- `processes.group_id -> process_groups.id`
- `subprocesses.process_id -> processes.id`
- `bpmn_models.process_id -> processes.id` oder `bpmn_models.subprocess_id -> subprocesses.id`
- `model_versions.model_id -> bpmn_models.id`
- `diagram_assets.model_version_id -> model_versions.id`
- `lane_mappings.model_version_id -> model_versions.id`
- `lane_mappings.organization_id -> organizations.id`
- `lane_mappings.application_id -> applications.id`
- `checkout_locks.model_id -> bpmn_models.id`
- `approval_requests.model_version_id -> model_versions.id`
- `approval_steps.approval_request_id -> approval_requests.id`
- `approval_decisions.approval_step_id -> approval_steps.id`

## Versionierungslogik

- `bpmn_models` repraesentiert den stabilen Container.
- `model_versions` repraesentiert fachliche und technische Versionen.
- `version_major`, `version_minor`, `version_patch` bilden eine nachvollziehbare Semantik.
- `base_version_id` referenziert die Ausgangsbasis neuer Entwuerfe.
- `published_at` ist nur fuer `published` gesetzt.
- Partial Unique Index stellt sicher, dass pro Modell nur eine Version `published` ist.

## Lane-Mapping-Modell

`lane_mappings` speichert:

- `model_version_id`
- `bpmn_element_id`
- `lane_name_snapshot`
- `organization_id`
- `role_code`
- `application_id`
- `mapping_source`
- `valid_from`
- `valid_to`

`bpmn_element_id` bindet die relationale Lane-Zuordnung stabil an das BPMN XML. `lane_name_snapshot` dient der historisch lesbaren Anzeige, auch wenn sich spaeter Stammdaten oder Lane-Beschriftungen aendern.

## Audit-Log-Modell

`audit_events` speichert:

- `occurred_at`
- `actor_user_id`
- `actor_display_name`
- `event_type`
- `aggregate_type`
- `aggregate_id`
- `correlation_id`
- `request_id`
- `ip_address`
- `user_agent`
- `summary`

`audit_event_payloads` speichert optional:

- `before_json`
- `after_json`
- `diff_json`

Die Payload ist vom Kopf getrennt, damit grosse Diffs oder sensible Inhalte kontrolliert behandelt werden koennen.

## Konsistenzregeln

- pro Modell genau null oder eine `published` Version
- pro Modell maximal ein aktiver Lock
- publizierte Versionen duerfen keine mutierenden Updates erhalten
- Approval Decisions duerfen nur fuer gueltige Approval Steps erstellt werden
- Audit Events duerfen nie aktualisiert oder geloescht werden

