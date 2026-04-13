import Link from "next/link";
import { AppShell, DataGrid, PageHeader, StatusBadge } from "@prozessschmiede/ui";
import { CreateModelButton } from "../../../src/components/create-model-button";
import { Navigation } from "../../../src/components/navigation";
import { Topbar } from "../../../src/components/topbar";
import { getProcessDetail } from "../../../src/lib/api-client";

export default async function ProcessDetailPage({ params }: { params: Promise<{ processId: string }> }) {
  const { processId } = await params;
  const processDetail = await getProcessDetail(processId);

  return (
    <AppShell sidebar={<Navigation />} topbar={<Topbar />}>
      <div className="space-y-8">
        <PageHeader
          eyebrow={processDetail.process.businessId}
          title={processDetail.process.name}
          description={processDetail.process.description}
          actions={
            <div className="flex items-center gap-3">
              <StatusBadge value={processDetail.process.status} />
              <CreateModelButton processId={processDetail.process.id} />
            </div>
          }
        />
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)]">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-[-0.03em]">Modelle</h2>
            <DataGrid
              columns={[
                { key: "name", label: "Modell" },
                { key: "activeLockOwner", label: "Lock Owner" },
                {
                  key: "open",
                  label: "Aktion",
                  render: (item) => (
                    <Link href={`/processes/${processDetail.process.id}/models/${String(item.id)}`} className="font-medium hover:underline">
                      Workspace
                    </Link>
                  )
                }
              ]}
              rows={processDetail.models}
            />
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-[-0.03em]">Versionen</h2>
            <div className="space-y-3">
              {processDetail.versionTimeline.map((version) => (
                <div key={version.id} className="rounded-[24px] border border-[var(--border-soft)] bg-white p-5">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-semibold">{version.versionLabel}</p>
                      <p className="mt-2 text-sm text-[var(--foreground-subtle)]">{version.changeNote}</p>
                    </div>
                    <StatusBadge value={version.status} />
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      </div>
    </AppShell>
  );
}
