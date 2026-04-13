import { AppShell, PageHeader } from "@prozessschmiede/ui";
import { Navigation } from "../../src/components/navigation";
import { ReviewRoutingRulesClient } from "../../src/components/review-routing-rules-client";
import { Topbar } from "../../src/components/topbar";
import { getAdminModelOptions, getOrganizationOptions, getProcesses, getReviewRoutingRules, getUserOptions } from "../../src/lib/api-client";

export default async function AdminPage() {
  const [processes, users, organizations, rules, modelOptions] = await Promise.all([
    getProcesses(),
    getUserOptions("", 100),
    getOrganizationOptions("", 200),
    getReviewRoutingRules(),
    getAdminModelOptions("", 200)
  ]);

  return (
    <AppShell sidebar={<Navigation />} topbar={<Topbar />}>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Administration"
          title="Plattform-, Stammdaten- und Override-Verwaltung"
          description="Hier werden kuenftig Rollen, Organisationen, Anwendungen, Kategorien, Gruppen und Admin-Overrides verwaltet."
        />
        <ReviewRoutingRulesClient
          rules={rules}
          processes={processes.items}
          users={users.items}
          organizations={organizations.items}
          modelOptions={modelOptions.items}
        />
      </div>
    </AppShell>
  );
}
