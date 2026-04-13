import { AppShell, DataGrid, PageHeader } from "@prozessschmiede/ui";
import { Navigation } from "../../src/components/navigation";
import { Topbar } from "../../src/components/topbar";
import { getAuditEvents } from "../../src/lib/api-client";

export default async function AuditPage() {
  const auditEvents = await getAuditEvents();

  return (
    <AppShell sidebar={<Navigation />} topbar={<Topbar />}>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Audit"
          title="Revisionsfreundliche Historie"
          description="Append-only Sicht auf fachliche und technische Schluesselereignisse."
        />
        <DataGrid
          columns={[
            { key: "occurredAt", label: "Zeitpunkt" },
            { key: "actorDisplayName", label: "Akteur" },
            { key: "eventType", label: "Ereignis" },
            { key: "aggregateType", label: "Typ" },
            { key: "summary", label: "Zusammenfassung" }
          ]}
          rows={auditEvents.items}
        />
      </div>
    </AppShell>
  );
}
