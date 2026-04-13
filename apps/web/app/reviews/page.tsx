import { AppShell, PageHeader } from "@prozessschmiede/ui";
import { ReviewQueueClient } from "../../src/components/review-queue-client";
import { Navigation } from "../../src/components/navigation";
import { Topbar } from "../../src/components/topbar";
import { getGovernancePolicies, getMyReviews } from "../../src/lib/api-client";

export default async function ReviewsPage() {
  const [approvals, policies] = await Promise.all([getMyReviews(), getGovernancePolicies()]);

  return (
    <AppShell sidebar={<Navigation />} topbar={<Topbar />}>
      <div className="space-y-8">
        <PageHeader
          eyebrow="Governance"
          title="Offene Reviews und Freigaben"
          description="Interner Review- und Approval-Workflow mit Vier-Augen-Prinzip, Rueckgaben und nachvollziehbaren Entscheidungen."
        />
        <ReviewQueueClient reviews={approvals} policies={policies} />
      </div>
    </AppShell>
  );
}
