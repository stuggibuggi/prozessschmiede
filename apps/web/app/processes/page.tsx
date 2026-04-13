import Link from "next/link";
import { AppShell, DataGrid, PageHeader, StatusBadge } from "@prozessschmiede/ui";
import { Navigation } from "../../src/components/navigation";
import { Topbar } from "../../src/components/topbar";
import { getProcesses } from "../../src/lib/api-client";

export default async function ProcessesPage() {
  const processRepository = await getProcesses();

  return (
    <AppShell sidebar={<Navigation />} topbar={<Topbar />}>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Repository"
          title="Prozesse und Teilprozesse"
          description="Filterbare Uebersicht aller fachlichen Prozesse mit Versions- und Governance-Kontext."
          actions={
            processRepository.items[0] ? (
              <Link
                href={`/processes/${processRepository.items[0].id}`}
                className="rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-medium text-white"
              >
                Erstes Prozessdetail oeffnen
              </Link>
            ) : null
          }
        />
        <DataGrid
          columns={[
            { key: "businessId", label: "ID" },
            { key: "name", label: "Name" },
            { key: "categoryName", label: "Kategorie" },
            { key: "groupName", label: "Gruppe" },
            { key: "status", label: "Status", render: (item) => <StatusBadge value={String(item.status)} /> },
            {
              key: "detail",
              label: "Details",
              render: (item) => (
                <Link href={`/processes/${String(item.id)}`} className="font-medium text-[var(--foreground)] underline-offset-4 hover:underline">
                  Anzeigen
                </Link>
              )
            }
          ]}
          rows={processRepository.items}
        />
      </div>
    </AppShell>
  );
}
