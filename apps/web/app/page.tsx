import { AppShell, DataGrid, PageHeader, StatCard, StatusBadge } from "@prozessschmiede/ui";
import { Navigation } from "../src/components/navigation";
import { Topbar } from "../src/components/topbar";
import { getDashboard } from "../src/lib/api-client";

export default async function DashboardPage() {
  const dashboardData = await getDashboard();

  return (
    <AppShell sidebar={<Navigation />} topbar={<Topbar />}>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Dashboard"
          title="Fachliche Prozessmodellierung auf Enterprise-Niveau"
          description="Repository, BPMN-Modellierung, Governance und Audit laufen in einer konsistenten Plattform zusammen."
        />
        <section className="grid gap-5 md:grid-cols-3">
          <StatCard label="Meine Prozesse" value={String(dashboardData.myProcesses.length)} detail="Aktiv betreute oder verantwortete Prozesse." />
          <StatCard label="Offene Reviews" value={String(dashboardData.myOpenReviews.length)} detail="Freigaben mit Handlungsbedarf im Vier-Augen-Prinzip." />
          <StatCard label="Zuletzt geaendert" value={dashboardData.recentlyChangedModels[0]?.versionLabel ?? "-"} detail="Neueste Modellversion im Repository." />
        </section>
        <section className="grid gap-6 xl:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)]">
          <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-[-0.03em]">Meine Prozesse</h2>
            <DataGrid
              columns={[
                { key: "businessId", label: "ID" },
                { key: "name", label: "Prozess" },
                { key: "status", label: "Status", render: (item) => <StatusBadge value={String(item.status)} /> },
                { key: "ownerName", label: "Owner" }
              ]}
              rows={dashboardData.myProcesses}
            />
          </div>
          <div className="space-y-4">
            <h2 className="text-xl font-semibold tracking-[-0.03em]">Offene Reviews</h2>
            <div className="space-y-3">
              {dashboardData.myOpenReviews.map((review) => (
                <div key={review.id} className="rounded-[24px] border border-[var(--border-soft)] bg-white p-5 shadow-[0_8px_30px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="text-sm font-semibold text-[var(--foreground)]">{review.modelName}</p>
                      <p className="mt-2 text-sm text-[var(--foreground-subtle)]">
                        Angefragt von {review.requestedBy} am {new Date(review.requestedAt).toLocaleString("de-DE")}
                      </p>
                    </div>
                    <StatusBadge value={review.status} />
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
