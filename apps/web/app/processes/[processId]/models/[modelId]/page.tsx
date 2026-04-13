import { AppShell, PageHeader } from "@prozessschmiede/ui";
import { ModelCommentsPanel } from "../../../../../src/components/model-comments-panel";
import { Navigation } from "../../../../../src/components/navigation";
import { ModelWorkspaceEditor } from "../../../../../src/components/model-workspace-editor";
import { Topbar } from "../../../../../src/components/topbar";
import { compareModelVersions, getApplicationOptions, getAuthProfile, getModel, getModelComments, getModelLanes, getModelVersions, getOrganizationOptions, getUserOptions } from "../../../../../src/lib/api-client";

export default async function ModelWorkspacePage({ params }: { params: Promise<{ modelId: string }> }) {
  const { modelId } = await params;
  const [model, lanes, organizations, applications, users, comments, versionCompare, modelVersions, profile] = await Promise.all([
    getModel(modelId),
    getModelLanes(modelId),
    getOrganizationOptions("", 60),
    getApplicationOptions("", 60),
    getUserOptions("", 80),
    getModelComments(modelId),
    compareModelVersions(modelId),
    getModelVersions(modelId),
    getAuthProfile()
  ]);

  return (
    <AppShell sidebar={<Navigation />} topbar={<Topbar />} layout="wide" mainVariant="plain">
      <div className="space-y-8">
        <PageHeader
          eyebrow="Modeling"
          title={model.name}
          description="Canvas-zentrierter BPMN Workspace mit Versionierung, Lane Mapping und Governance-Kontext."
        />
        <ModelWorkspaceEditor
          model={model}
          lanes={lanes}
          organizations={organizations.items}
          applications={applications.items}
          users={users.items}
          currentUserDisplayName={profile.displayName}
          versionCompare={versionCompare}
          modelVersions={modelVersions}
        />
        <ModelCommentsPanel modelId={model.id} comments={comments.items} />
      </div>
    </AppShell>
  );
}
