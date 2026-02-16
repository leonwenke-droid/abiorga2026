# ABI ORGA 2026 -- CURSOR AI CONTEXT (v4 -- FINAL)

## 🎯 Projektziel

Baue ein integriertes Organisationssystem für den Abijahrgang 2026
mit: - WhatsApp-Bot (Business API) - belastungsbasierter
Schichtzuteilung - separatem Verantwortungs-Malus - öffentlichem
Dashboard (nur Vornamen + Status) - Whitelist + Opt-in Registrierung -
Token-basierter Aufgaben-Zuteilung ohne Login - Excel-Upload zur
Kassenstandsaktualisierung - Aggregiertem Aktivitäts-Score pro Komitee
(Diagramm) - Mehreren Schichtplänen im Dashboard (pro Event)

------------------------------------------------------------------------

## ❌ Strikte Verbote

-   KEINE Leistungsbewertung aus Chat-Textanalyse
-   KEIN öffentliches Einzel-Ranking
-   KEINE Anzeige von Telefonnummern, Belastung oder Malus im Dashboard
-   KEINE automatische KI-Entscheidung ohne menschliche Verifikation

------------------------------------------------------------------------

## 🧠 Kernlogik (Kurzfassung)

-   **Belastung steuert Ziehung:** w = 1 / (1 + load_index)
-   **Malus steuert nur Konsequenzen**, NICHT die Ziehung
-   **Schicht-Flow:** Zuteilen → private Bestätigung → Ersatz möglich →
    öffentliche Verifikation → Score-Update
-   **Aufgaben-Flow:** Lead erstellt Aufgabe → Token-Link →
    Namensbestätigung → Erledigt + Beleg → Lead verifiziert

------------------------------------------------------------------------

## 🗄️ Datenbank (MUSS -- Supabase)

Tabellen:

### profiles

(id, full_name, phone, committee_id, role, is_whitelisted, opt_in,
activated_at, last_contact_at)

### shifts

(id, event_name, date, start_time, end_time, location, notes,
created_by, created_at)

### shift_assignments

(id, shift_id, assigned_to, status, replacement_for, replacement_to,
confirmed_at, verified_by, verified_at, created_at)

### user_counters

(user_id, load_index, responsibility_malus, updated_at)

### score_events

(id, user_id, kind, delta_load, delta_malus, source_type, source_id,
created_at)

### tasks

(id, title, description, committee_id, owner_id, due_at, status,
proof_required, created_at)

### task_assignments

(id, task_id, assigned_to_name, token, confirmed_name, status,
proof_url, confirmed_at, created_at)

### cash_movements

(id, uploaded_at, date, description, amount, category, uploaded_by)

### cash_balance

(id, current_balance, updated_at, source_movement_id)

### committee_activity

(id, committee_id, date, msg_count, tasks_created, tasks_verified,
shifts_completed, score, created_at)

------------------------------------------------------------------------

## 🔐 Aufgaben-Token-Regeln

-   Token = kryptographisch zufällig, nicht erratbar
-   Zugriff nur über /task/`<token>`{=html}
-   Namensabfrage als Sicherheitscheck (case-insensitive Match)
-   Beleg-Upload möglich; finale Verifikation nur durch Lead
-   Rate-Limiting + Fehlversuchs-Sperre
-   Optional: Token-Ablauf nach 30 Tagen

------------------------------------------------------------------------

## 🤖 WhatsApp Bot Regeln

-   Nur DMs an opt_in = true
-   Aktivierung nur, wenn phone auf Whitelist (START \[+ optional
    CODE\])
-   Öffentliche Zuteilung mit Vornamen
-   Private Bestätigung: 1=Bestätigen, 2=Ersatz, 3=Ablehnen
-   Verifikation durch Lead via /verify oder /noshow

------------------------------------------------------------------------

## 📊 Score-Deltas

-   Bestätigte Schicht: +1 Load
-   Ersatz organisiert: +0.5 Load
-   Ersatz führt aus: +1 Load
-   Nicht erschienen: +2 Load +2 Malus
-   Aufgaben: Score **erst nach Lead-Verifikation**

------------------------------------------------------------------------

## 💰 Excel-Upload (Kasse)

-   Admin/Lead lädt standardisierte Excel hoch
-   Pflichtspalten: date, description, amount, category, new_balance
-   Backend validiert Format
-   Neue Bewegungen → cash_movements
-   Aktueller Saldo → cash_balance
-   Dashboard zeigt stets aktuellen Saldo

------------------------------------------------------------------------

## 📈 Aktivitäts-Score (aggregiert, pro Komitee)

Signale: - Nachrichten pro Komitee - Angelegte Aufgaben - Verifizierte
Aufgaben - Erledigte Schichten

Formel (konfigurierbar): score = 0.1*msgs + 1.0*tasks_created +
2.0*tasks_verified + 1.5*shifts_completed

-   Tägliche Batch-Berechnung
-   Dashboard: Zeitreihen-Diagramm pro Komitee
-   KEINE Einzelpersonen anzeigen

------------------------------------------------------------------------

## 🗓️ Schichtplan im Dashboard

-   Mehrere Events parallel sichtbar
-   Filter/Tab pro Event
-   Anzeige: Event, Schichtname, Zeit, Vorname, Status

------------------------------------------------------------------------

## 🔒 Datenschutz

-   Zweckgebunden: Schichtorganisation
-   Minimaldaten speichern
-   Löschung 3 Monate nach Abiball
-   /privacy Befehl zeigt Daten + Löschoption

------------------------------------------------------------------------

## ✅ Definition of Done

-   Weighted random Zuteilung funktioniert
-   Bot-Opt-in mit Whitelist funktioniert
-   Verifikation schreibt score_events
-   Dashboard zeigt: Kasse, Aktivität, Schichten korrekt
-   Token-Aufgaben-Links funktionieren mit Namensschutz
