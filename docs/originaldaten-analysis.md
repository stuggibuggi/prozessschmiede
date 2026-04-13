# Originaldaten Analyse und Mapping

## Quellsysteme

- `IVB_PROZESS_BASIS.xlsx`: Prozessstammdaten mit `PRO_NUMMER`, Name, Kategorie, Gruppe, Lifecycle, Verantwortungen und Link.
- `IVB_TEILPROZESS_PROZESS.xlsx`: Teilprozesse mit `TPRO_NUMMER` und Referenz auf Parent-Prozess.
- `IVB_PROZESS_ICTO.xlsx`: direkte Prozess-zu-ICTO-Verknuepfung.
- `IVB_PROZESS_ICTO_EU.xlsx`: Prozess-zu-ICTO plus EU-Kontext.
- `IVB_PROZESS_NUTZENDES_EU.xlsx`: Prozess-zu-EU ohne direkte ICTO-ID.
- `IVB_FUNKTION.xlsx`: Business-Funktionen mit `FUNKTIONNUMMER`, Kategorie und Kennzeichnung wesentlicher Funktion.
- `IVB_PROZESS_FUNKTION.xlsx`: Prozess-zu-Funktion inklusive Kritikalitaet.
- `IVB_PROZESS_WFUNKTION.xlsx`: Prozess-zu-wesentlicher Funktion.
- `WW_STDRPT_ICTO_V1.XLSX`: Anwendungskatalog fuer `ICTO-xxx`.
- `WW_STDRPT_ROLES_ICTO_V2.XLSX`: Rollen und Ansprechpartner je ICTO.
- `SAPHCM_LISTE_MITARBEITER.csv`: Personenstammdaten.
- `SAPHCM_LISTE_MITARBEITER_ORGAS.csv`: Personen-zu-Orga-Verknuepfung.
- `SAPHCM_LISTE_ORGAS.csv`: Organisationsstruktur und Hierarchie.

## Erkanntes Zielmapping

- `PRO_NUMMER` -> `process.businessId`
- `TPRO_NUMMER` -> `subprocess.businessId`
- `ICTO_ID` / `ICTOID` -> `application.code`
- `FUNKTIONNUMMER` -> `business_function.code`
- `Person_ID` -> `user.employeeId`
- `OE_ID` -> `organization.code`

## Importregeln

- Dubletten auf Prozess- und Teilprozessnummern werden vor dem Import fachlich zusammengefuehrt, indem nichtleere Felder bevorzugt werden.
- `PRO_LEBENSZYKLUS` wird auf interne Stati gemappt:
  - `In Produktion` -> `active`
  - `Stillgelegt` -> `inactive`
  - `Archiv*` -> `archived`
  - sonst -> `draft`
- Prozessverantwortung und Prozesseigentuemer werden als `process_role_assignments` importiert.
- ICTO-Anwendungen werden als `applications` importiert; Rollen dazu als `application_role_assignments`.
- Funktionen werden als `business_functions` importiert und ueber `process_function_assignments` zugeordnet.
- Organisationshierarchie und Person-zu-Orga-Beziehungen werden ueber `organizations` und `user_organization_assignments` geladen.

## Datenbild

- Prozesse: 507 Zeilen, 504 eindeutige `PRO_NUMMER`
- Teilprozesse: 1.397 Zeilen, 1.394 eindeutige `TPRO_NUMMER`
- Prozess-ICTO-Verknuepfungen: 3.008
- Prozess-ICTO-EU-Verknuepfungen: 10.652
- Funktionen: 65
- ICTO-Anwendungen: 1.639
- ICTO-Rollen: 14.232
- Personen: 7.820
- Personen-Orga-Zuordnungen: 8.280
- Organisationen: 1.835
