# Security Architecture

## Identity und OIDC

Die Plattform verwendet OIDC mit Authorization Code Flow und PKCE. Microsoft Entra ID ist der erste produktive Provider. Die Anwendung entkoppelt Provider-spezifische Claims ueber ein `IdentityProviderAdapter` Interface, damit spaeter weitere Enterprise-Provider integriert werden koennen.

### Login-Ablauf

1. Benutzer ruft geschuetzten Bereich auf.
2. Web-App startet OIDC Login.
3. API validiert Callback und tauscht Code gegen Tokens.
4. Claims werden normalisiert und auf internen Benutzer gemappt.
5. Session und serverseitige Autorisierungskontexte werden erzeugt.

## Rollen- und Rechtekonzept

### Systemrollen

- `platform_admin`
- `repository_admin`
- `modeler`
- `reviewer`
- `approver`
- `viewer`
- `auditor`

### Feingranulare Permissions

- `process.read`
- `process.write`
- `model.read`
- `model.edit`
- `model.checkout`
- `model.submit_review`
- `model.approve`
- `model.publish`
- `audit.read`
- `admin.override_lock`

### Objektregeln

- Berechtigungen koennen von Rollen, Gruppen und Prozessrollen abgeleitet werden.
- Zustandsabhaengige Regeln verhindern unzulaessige Aktionen auf publizierten oder gesperrten Modellen.
- Reviewer und Approver duerfen nicht identisch sein.

## Security Controls

- serverseitige Session-Verwaltung mit sicheren Cookies
- CSRF-Schutz fuer stateful Endpunkte
- Security Headers und CORS-Haertung
- Rate Limiting fuer Auth, Admin und Upload-Endpunkte
- Attachment Scanning vor Freigabe zum Download
- Admin-Overrides mit Pflichtbegruendung und Audit Event
- strukturierte Sicherheitslogs getrennt von Business-Logs

## Logging und Audit

- Application Logs fuer technische Diagnose
- Security Logs fuer Login, Fehler, Rate Limits und Overrides
- Audit Logs fuer fachliche und technische Schluesselereignisse
- Request IDs, Correlation IDs und Domain Event IDs verbinden alle Ebenen

## Datenschutz und Aufbewahrung

- minimale Speicherung personenbezogener Daten
- Aufbewahrungsregeln nach Datenklasse
- keine Loeschung revisionsrelevanter Audit-Historie
- selektive Loesch- und Exportfaehigkeit fuer nicht revisionskritische Benutzerdaten

