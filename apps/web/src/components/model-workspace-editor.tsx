"use client";

import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import { defaultBpmnXml, ModelerShell } from "@prozessschmiede/bpmn";
import type {
  BpmnElementSelection,
  LaneMapping,
  ModelDetailResponse,
  ModelDraftUpdateInput,
  ModelVersionCompareResponse,
  ModelVersionSummary,
  ReferenceOption
} from "@prozessschmiede/types";
import { checkinModel, checkoutModel, compareModelVersions, publishModel, submitModelReview, updateModelDraft } from "../lib/api-client";

const BpmnModelerCanvas = dynamic(
  async () => {
    const module = await import("@prozessschmiede/bpmn");
    return module.BpmnModelerCanvas;
  },
  {
    ssr: false
  }
);

interface ModelWorkspaceEditorProps {
  model: ModelDetailResponse;
  lanes: LaneMapping[];
  organizations: ReferenceOption[];
  applications: ReferenceOption[];
  users: ReferenceOption[];
  currentUserDisplayName: string;
  versionCompare: ModelVersionCompareResponse;
  modelVersions: ModelVersionSummary[];
}

export function ModelWorkspaceEditor({
  model,
  lanes,
  organizations,
  applications,
  users,
  currentUserDisplayName,
  versionCompare,
  modelVersions
}: ModelWorkspaceEditorProps) {
  const router = useRouter();
  const organizationNameById = Object.fromEntries(organizations.map((organization) => [organization.id, `${organization.code} - ${organization.name}`]));
  const applicationNameById = Object.fromEntries(applications.map((application) => [application.id, `${application.code} - ${application.name}`]));
  const [changeNote, setChangeNote] = useState(model.latestVersion.changeNote);
  const [xml, setXml] = useState(model.latestVersion.xml || defaultBpmnXml);
  const [draftLanes, setDraftLanes] = useState<ModelDraftUpdateInput["lanes"]>(
    lanes.length > 0
      ? lanes.map((lane) => ({
          id: lane.id,
          bpmnElementId: lane.bpmnElementId,
          laneNameSnapshot: lane.laneNameSnapshot,
          ...(lane.organizationId ? { organizationId: lane.organizationId } : {}),
          ...(lane.roleCode ? { roleCode: lane.roleCode } : {}),
          ...(lane.applicationId ? { applicationId: lane.applicationId } : {}),
          mappingSource: lane.mappingSource
        }))
      : []
  );
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isActing, setIsActing] = useState(false);
  const [reviewerUserId, setReviewerUserId] = useState("");
  const [approverUserId, setApproverUserId] = useState("");
  const [compareState, setCompareState] = useState(versionCompare);
  const [leftCompareVersionId, setLeftCompareVersionId] = useState(versionCompare.leftVersion.id);
  const [rightCompareVersionId, setRightCompareVersionId] = useState(versionCompare.rightVersion.id);
  const [isLoadingCompare, setIsLoadingCompare] = useState(false);
  const [selectedElement, setSelectedElement] = useState<BpmnElementSelection | null>(null);
  const [selectedElementNameDraft, setSelectedElementNameDraft] = useState("");
  const riskSignalCounts = compareState.riskSignals.reduce(
    (acc, signal) => {
      acc[signal.severity] += 1;
      return acc;
    },
    { high: 0, medium: 0, low: 0 }
  );
  const hasActiveLock = Boolean(model.activeLock);
  const isLockOwnedByCurrentUser = hasActiveLock && model.activeLock?.lockedBy === currentUserDisplayName;
  const canCheckout = !hasActiveLock || isLockOwnedByCurrentUser;
  const canCheckin = hasActiveLock && isLockOwnedByCurrentUser;
  const canSubmitReview = canCheckin && model.latestVersion.status === "draft";
  const canPublish = model.latestVersion.status === "approved";
  const selectedLaneIndex = selectedElement
    ? draftLanes.findIndex((lane) => lane.bpmnElementId === selectedElement.id)
    : -1;
  const selectedLane = selectedLaneIndex >= 0 ? draftLanes[selectedLaneIndex] : null;

  function handleSelectionChange(selection: BpmnElementSelection | null) {
    if (selection && selection.type === "bpmn:Lane") {
      setDraftLanes((current) => {
        const hasLane = current.some((lane) => lane.bpmnElementId === selection.id);
        if (hasLane) {
          return current;
        }
        return [
          ...current,
          {
            bpmnElementId: selection.id,
            laneNameSnapshot: selection.name?.trim() || selection.id,
            mappingSource: "synchronized"
          }
        ];
      });
    }

    setSelectedElement(selection);
    setSelectedElementNameDraft(selection?.name ?? "");
  }

  function mergeLanesFromCanvas(nextCanvasLanes: Array<{ bpmnElementId: string; laneNameSnapshot: string }>) {
    setDraftLanes((current) => {
      if (nextCanvasLanes.length === 0) {
        return [];
      }

      return nextCanvasLanes.map((canvasLane) => {
        const existingLane =
          current.find((lane) => lane.bpmnElementId === canvasLane.bpmnElementId) ??
          current.find((lane) => lane.laneNameSnapshot === canvasLane.laneNameSnapshot);

        return {
          ...(existingLane?.id ? { id: existingLane.id } : {}),
          bpmnElementId: canvasLane.bpmnElementId,
          laneNameSnapshot: canvasLane.laneNameSnapshot,
          ...(existingLane?.organizationId ? { organizationId: existingLane.organizationId } : {}),
          ...(existingLane?.roleCode ? { roleCode: existingLane.roleCode } : {}),
          ...(existingLane?.applicationId ? { applicationId: existingLane.applicationId } : {}),
          mappingSource: existingLane?.mappingSource ?? "synchronized"
        };
      });
    });
  }

  function updateLane(index: number, key: keyof ModelDraftUpdateInput["lanes"][number], value: string) {
    setDraftLanes((current) =>
      current.map((lane, laneIndex) =>
        laneIndex === index
          ? {
              ...lane,
              [key]: value || undefined
            }
          : lane
      )
    );
  }

  function updateSelectedLane(key: keyof ModelDraftUpdateInput["lanes"][number], value: string) {
    if (selectedLaneIndex < 0) {
      return;
    }
    updateLane(selectedLaneIndex, key, value);
    if (key === "laneNameSnapshot") {
      setSelectedElement((current) => (current ? { ...current, name: value } : current));
      setSelectedElementNameDraft(value);
    }
  }

  async function handleSave() {
    setIsSaving(true);
    setMessage(null);

    try {
      const payload: ModelDraftUpdateInput = {
        changeNote,
        xml,
        lanes: draftLanes.map((lane) => ({
          ...(lane.id ? { id: lane.id } : {}),
          bpmnElementId: lane.bpmnElementId,
          laneNameSnapshot: lane.laneNameSnapshot,
          ...(lane.organizationId ? { organizationId: lane.organizationId } : {}),
          ...(lane.roleCode ? { roleCode: lane.roleCode } : {}),
          ...(lane.applicationId ? { applicationId: lane.applicationId } : {}),
          mappingSource: lane.mappingSource
        }))
      };

      const result = await updateModelDraft(model.id, payload);
      setMessage(`Draft gespeichert. Version ${result.model.latestVersion.versionLabel} wurde aktualisiert.`);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Draft konnte nicht gespeichert werden.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleModelAction(action: "checkout" | "checkin" | "submit-review" | "publish") {
    if (action === "checkout" && !canCheckout) {
      setMessage("Check-out ist aktuell nicht moeglich, da das Modell von einem anderen Benutzer gesperrt ist.");
      return;
    }

    if (action === "checkin" && !canCheckin) {
      setMessage("Check-in ist nur fuer den Benutzer moeglich, der das Modell ausgecheckt hat.");
      return;
    }

    if (action === "submit-review" && !canSubmitReview) {
      setMessage("Review kann nur aus einem eigenen Check-out und im Draft-Status eingereicht werden.");
      return;
    }

    if (action === "publish" && !canPublish) {
      setMessage("Veroeffentlichen ist nur fuer genehmigte Versionen moeglich.");
      return;
    }

    if (action === "submit-review" && reviewerUserId && approverUserId && reviewerUserId === approverUserId) {
      setMessage("Reviewer und Approver muessen unterschiedlich sein.");
      return;
    }

    setIsActing(true);
    setMessage(null);

    try {
      const result =
        action === "checkout"
          ? await checkoutModel(model.id)
          : action === "checkin"
            ? await checkinModel(model.id)
            : action === "submit-review"
              ? await submitModelReview(model.id, {
                  comment: changeNote,
                  ...(reviewerUserId ? { reviewerUserId } : {}),
                  ...(approverUserId ? { approverUserId } : {})
                })
              : await publishModel(model.id, changeNote);

      setMessage(result.message);
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Aktion konnte nicht ausgefuehrt werden.");
    } finally {
      setIsActing(false);
    }
  }

  async function handleLoadCompare() {
    if (!leftCompareVersionId || !rightCompareVersionId) {
      setMessage("Bitte beide Vergleichsversionen auswaehlen.");
      return;
    }

    setIsLoadingCompare(true);
    setMessage(null);
    try {
      const next = await compareModelVersions(model.id, {
        leftVersionId: leftCompareVersionId,
        rightVersionId: rightCompareVersionId
      });
      setCompareState(next);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Versionsvergleich konnte nicht geladen werden.");
    } finally {
      setIsLoadingCompare(false);
    }
  }

  function renderLaneSnapshot(snapshot?: {
    laneNameSnapshot: string;
    organizationId?: string;
    roleCode?: string;
    applicationId?: string;
  }) {
    if (!snapshot) {
      return <p className="text-xs text-[var(--foreground-muted)]">n/a</p>;
    }

    const organizationLabel = snapshot.organizationId ? organizationNameById[snapshot.organizationId] ?? snapshot.organizationId : "n/a";
    const applicationLabel = snapshot.applicationId ? applicationNameById[snapshot.applicationId] ?? snapshot.applicationId : "n/a";

    return (
      <div className="space-y-1 text-xs text-[var(--foreground-subtle)]">
        <p>
          <span className="font-medium text-[var(--foreground)]">Lane:</span> {snapshot.laneNameSnapshot}
        </p>
        <p>
          <span className="font-medium text-[var(--foreground)]">Organisation:</span> {organizationLabel}
        </p>
        <p>
          <span className="font-medium text-[var(--foreground)]">Rolle:</span> {snapshot.roleCode ?? "n/a"}
        </p>
        <p>
          <span className="font-medium text-[var(--foreground)]">Anwendung:</span> {applicationLabel}
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section className="sticky top-3 z-20 rounded-[24px] border border-[var(--border-soft)] bg-white/95 p-4 shadow-[0_18px_50px_rgba(15,23,42,0.08)] backdrop-blur">
        <div className="grid gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground-muted)]">Bearbeitung</p>
            <textarea
              value={changeNote}
              onChange={(event) => setChangeNote(event.target.value)}
              className="min-h-24 w-full rounded-[18px] border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-3 text-sm leading-6 text-[var(--foreground)] outline-none transition focus:border-[var(--foreground)]"
              placeholder="Aenderungsnotiz fuer diese Version"
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <select
                value={reviewerUserId}
                onChange={(event) => setReviewerUserId(event.target.value)}
                className="rounded-2xl border border-[var(--border-soft)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--foreground)]"
              >
                <option value="">Reviewer automatisch per Rolle</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.code})
                  </option>
                ))}
              </select>
              <select
                value={approverUserId}
                onChange={(event) => setApproverUserId(event.target.value)}
                className="rounded-2xl border border-[var(--border-soft)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--foreground)]"
              >
                <option value="">Approver automatisch per Rolle</option>
                {users.map((user) => (
                  <option key={user.id} value={user.id}>
                    {user.name} ({user.code})
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => handleModelAction("checkout")}
              disabled={isActing || !canCheckout}
              className="rounded-full border border-[var(--border-soft)] px-5 py-3 text-sm font-medium text-[var(--foreground)] disabled:opacity-60"
            >
              Check-out
            </button>
            <button
              type="button"
              onClick={() => handleModelAction("checkin")}
              disabled={isActing || !canCheckin}
              className="rounded-full border border-[var(--border-soft)] px-5 py-3 text-sm font-medium text-[var(--foreground)] disabled:opacity-60"
            >
              Check-in
            </button>
            <button
              type="button"
              onClick={() => handleModelAction("submit-review")}
              disabled={isActing || !canSubmitReview}
              className="rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
            >
              Review einreichen
            </button>
            <button
              type="button"
              onClick={() => handleModelAction("publish")}
              disabled={isActing || !canPublish}
              className="rounded-full border border-[var(--border-soft)] px-5 py-3 text-sm font-medium text-[var(--foreground)] disabled:opacity-60"
            >
              Veroeffentlichen
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={isSaving || isActing}
              className="sm:col-span-2 rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isSaving ? "Speichert..." : "Draft speichern"}
            </button>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-4 text-sm text-[var(--foreground-subtle)]">
          <p>
            Lock: {model.activeLock ? `${model.activeLock.lockedBy} seit ${new Date(model.activeLock.acquiredAt).toLocaleString("de-DE")}` : "kein aktiver Lock"}
          </p>
          <p>
            Review: {model.activeReview ? `${model.activeReview.status} durch Anfrage von ${model.activeReview.requestedBy}` : "keine aktive Review"}
          </p>
          <p>Veroeffentlicht: {model.publishedVersionId === model.latestVersion.id ? "ja" : "nein"}</p>
          <p>Reviewer-Zuordnung: {reviewerUserId ? "explizit gesetzt" : "rollenbasiert"}</p>
          <p>Approver-Zuordnung: {approverUserId ? "explizit gesetzt" : "rollenbasiert"}</p>
        </div>
        {message ? <p className="mt-3 text-sm text-[var(--foreground-subtle)]">{message}</p> : null}
      </section>

      <ModelerShell
        title={model.name}
        versionLabel={model.latestVersion.versionLabel}
        status={model.latestVersion.status}
        inspector={
          <div className="space-y-4">
            <section className="rounded-2xl border border-white bg-white/80 p-3 text-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground-muted)]">Objekt-Konfiguration</p>
              {!selectedElement ? (
                <p className="mt-2 text-[var(--foreground-subtle)]">Waehle im Diagramm ein Element aus.</p>
              ) : (
                <div className="mt-3 space-y-3">
                  <div className="space-y-1 text-[var(--foreground-subtle)]">
                    <p>
                      <span className="font-medium text-[var(--foreground)]">Typ:</span> {selectedElement.type}
                    </p>
                    <p>
                      <span className="font-medium text-[var(--foreground)]">ID:</span> {selectedElement.id}
                    </p>
                  </div>
                  <input
                    value={selectedElementNameDraft}
                    onChange={(event) => {
                      const nextName = event.target.value;
                      setSelectedElementNameDraft(nextName);
                      setSelectedElement((current) => (current ? { ...current, name: nextName } : current));
                      if (selectedElement.type === "bpmn:Lane") {
                        updateSelectedLane("laneNameSnapshot", nextName);
                      }
                    }}
                    className="w-full rounded-2xl border border-[var(--border-soft)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--foreground)]"
                    placeholder="Element-Name"
                  />
                  {selectedElement.type === "bpmn:Lane" && selectedLane ? (
                    <div className="space-y-3 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-3">
                      <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground-muted)]">Lane-Zuordnung</p>
                      <input
                        value={selectedLane.roleCode ?? ""}
                        onChange={(event) => updateSelectedLane("roleCode", event.target.value)}
                        className="w-full rounded-2xl border border-[var(--border-soft)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--foreground)]"
                        placeholder="Rolle/Funktion"
                      />
                      <select
                        value={selectedLane.organizationId ?? ""}
                        onChange={(event) => updateSelectedLane("organizationId", event.target.value)}
                        className="w-full rounded-2xl border border-[var(--border-soft)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--foreground)]"
                      >
                        <option value="">Keine Organisation</option>
                        {organizations.map((organization) => (
                          <option key={organization.id} value={organization.id}>
                            {organization.code} - {organization.name}
                          </option>
                        ))}
                      </select>
                      <select
                        value={selectedLane.applicationId ?? ""}
                        onChange={(event) => updateSelectedLane("applicationId", event.target.value)}
                        className="w-full rounded-2xl border border-[var(--border-soft)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--foreground)]"
                      >
                        <option value="">Keine Anwendung</option>
                        {applications.map((application) => (
                          <option key={application.id} value={application.id}>
                            {application.code} - {application.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-[var(--foreground-muted)]">Quelle: {selectedLane.mappingSource}</p>
                    </div>
                  ) : (
                    <p className="text-xs text-[var(--foreground-muted)]">Fuer dieses Element sind aktuell keine speziellen Zuordnungsfelder hinterlegt.</p>
                  )}
                </div>
              )}
            </section>

            <section className="rounded-2xl border border-white bg-white/80 p-3 text-sm">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground-muted)]">Strukturierte Lane-Zuordnungen</p>
              <div className="mt-3 max-h-[300px] space-y-2 overflow-auto pr-1">
                {draftLanes.length === 0 ? (
                  <p className="text-[var(--foreground-subtle)]">Noch keine Lanes im Diagramm vorhanden.</p>
                ) : (
                  draftLanes.map((lane, index) => (
                    <div key={lane.id ?? `${lane.bpmnElementId}-${index}`} className="rounded-xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2.5">
                      <p className="font-medium text-[var(--foreground)]">{lane.laneNameSnapshot}</p>
                      <p className="mt-1 text-xs text-[var(--foreground-subtle)]">
                        Org: {lane.organizationId ?? "n/a"} | Rolle: {lane.roleCode ?? "n/a"} | App: {lane.applicationId ?? "n/a"}
                      </p>
                    </div>
                  ))
                )}
              </div>
            </section>
          </div>
        }
        canvas={
          <BpmnModelerCanvas
            xml={xml}
            onXmlChange={setXml}
            onLanesChange={mergeLanesFromCanvas}
            onSelectionChange={handleSelectionChange}
            desiredLanes={draftLanes.map((lane) => ({
              bpmnElementId: lane.bpmnElementId,
              laneNameSnapshot: lane.laneNameSnapshot
            }))}
            {...(selectedElement ? { selectedElementName: selectedElementNameDraft } : {})}
          />
        }
      />

      <section className="rounded-[28px] border border-[var(--border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground-muted)]">Versionsvergleich</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">
              {compareState.leftVersion.versionLabel} → {compareState.rightVersion.versionLabel}
            </h3>
            <p className="mt-2 text-sm text-[var(--foreground-subtle)]">
              Links: {compareState.leftVersion.status} von {compareState.leftVersion.updatedBy} | Rechts: {compareState.rightVersion.status} von{" "}
              {compareState.rightVersion.updatedBy}
            </p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-1">
              + Elemente: {compareState.summary.addedElementCount}
            </span>
            <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-1">
              - Elemente: {compareState.summary.removedElementCount}
            </span>
            <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-1">
              Delta Elemente: {compareState.summary.changedElementCount}
            </span>
            <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-1">
              Lane-Deltas: {compareState.summary.changedLaneMappingCount}
            </span>
            <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-1">
              Flows +/{compareState.summary.addedFlowCount} -/{compareState.summary.removedFlowCount} ~/{compareState.summary.updatedFlowCount}
            </span>
          </div>
        </div>
        <div className="mt-4 grid gap-3 md:grid-cols-[1fr_1fr_auto]">
          <select
            value={leftCompareVersionId}
            onChange={(event) => setLeftCompareVersionId(event.target.value)}
            className="rounded-2xl border border-[var(--border-soft)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--foreground)]"
          >
            {modelVersions.map((version) => (
              <option key={`left-${version.id}`} value={version.id}>
                Links: {version.versionLabel} ({version.status})
              </option>
            ))}
          </select>
          <select
            value={rightCompareVersionId}
            onChange={(event) => setRightCompareVersionId(event.target.value)}
            className="rounded-2xl border border-[var(--border-soft)] bg-white px-3 py-2 text-sm outline-none focus:border-[var(--foreground)]"
          >
            {modelVersions.map((version) => (
              <option key={`right-${version.id}`} value={version.id}>
                Rechts: {version.versionLabel} ({version.status})
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handleLoadCompare}
            disabled={isLoadingCompare}
            className="rounded-full border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-60"
          >
            {isLoadingCompare ? "Lade..." : "Vergleich laden"}
          </button>
        </div>
        <div className="mt-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-3">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground-muted)]">Risk Signals</p>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-red-700">high {riskSignalCounts.high}</span>
            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-amber-700">medium {riskSignalCounts.medium}</span>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] text-slate-700">low {riskSignalCounts.low}</span>
          </div>
          {compareState.riskSignals.length === 0 ? (
            <p className="mt-2 text-xs text-[var(--foreground-subtle)]">Keine erkannten Risikosignale fuer diese Versionsdifferenz.</p>
          ) : (
            <div className="mt-2 max-h-44 space-y-2 overflow-auto pr-1">
              {compareState.riskSignals.map((signal, index) => (
                <div key={`${signal.code}-${signal.entityId ?? "global"}-${index}`} className="rounded-xl border border-[var(--border-soft)] bg-white px-3 py-2 text-xs">
                  <p className="text-[var(--foreground-subtle)]">
                    <span
                      className={`mr-2 rounded-full px-2 py-0.5 text-[10px] uppercase tracking-[0.12em] ${
                        signal.severity === "high"
                          ? "bg-red-100 text-red-700"
                          : signal.severity === "medium"
                            ? "bg-amber-100 text-amber-700"
                            : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {signal.severity}
                    </span>
                    <span className="font-medium text-[var(--foreground)]">{signal.message}</span>
                    {signal.entityId ? <span> ({signal.entityId})</span> : null}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
        {(compareState.elementChanges.addedElementIds.length > 0 || compareState.elementChanges.removedElementIds.length > 0) && (
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground-muted)]">Neue Elemente</p>
              <p className="mt-2 text-xs text-[var(--foreground-subtle)] break-all">
                {compareState.elementChanges.addedElementIds.length > 0 ? compareState.elementChanges.addedElementIds.join(", ") : "Keine"}
              </p>
            </div>
            <div className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-3">
              <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground-muted)]">Entfernte Elemente</p>
              <p className="mt-2 text-xs text-[var(--foreground-subtle)] break-all">
                {compareState.elementChanges.removedElementIds.length > 0 ? compareState.elementChanges.removedElementIds.join(", ") : "Keine"}
              </p>
            </div>
          </div>
        )}
        {compareState.elementChanges.changedElements.length > 0 && (
          <div className="mt-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground-muted)]">Geaenderte Elemente (Typ/Name)</p>
            <div className="mt-2 max-h-56 space-y-2 overflow-auto pr-1">
              {compareState.elementChanges.changedElements.map((change) => (
                <div key={change.id} className="rounded-xl border border-[var(--border-soft)] bg-white p-2.5">
                  <p className="text-xs font-medium text-[var(--foreground)]">{change.id}</p>
                  <div className="mt-1 grid gap-2 text-xs md:grid-cols-2">
                    <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2 text-[var(--foreground-subtle)]">
                      <p>
                        <span className="font-medium text-[var(--foreground)]">Vorher Typ:</span> {change.left.type}
                      </p>
                      <p>
                        <span className="font-medium text-[var(--foreground)]">Vorher Name:</span> {change.left.name ?? "n/a"}
                      </p>
                    </div>
                    <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2 text-[var(--foreground-subtle)]">
                      <p>
                        <span className="font-medium text-[var(--foreground)]">Nachher Typ:</span> {change.right.type}
                      </p>
                      <p>
                        <span className="font-medium text-[var(--foreground)]">Nachher Name:</span> {change.right.name ?? "n/a"}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {compareState.flowChanges.length > 0 && (
          <div className="mt-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground-muted)]">Flow-Aenderungen</p>
            <div className="mt-2 max-h-56 space-y-2 overflow-auto pr-1">
              {compareState.flowChanges.map((change) => (
                <div key={change.id} className="rounded-xl border border-[var(--border-soft)] bg-white p-2.5">
                  <p className="text-xs text-[var(--foreground-subtle)]">
                    <span className="font-medium text-[var(--foreground)]">{change.id}</span> ({change.changeType})
                  </p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2 text-xs text-[var(--foreground-subtle)]">
                      <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[var(--foreground-muted)]">Vorher</p>
                      {change.left ? (
                        <>
                          <p>
                            <span className="font-medium text-[var(--foreground)]">Typ:</span> {change.left.type}
                          </p>
                          <p>
                            <span className="font-medium text-[var(--foreground)]">Name:</span> {change.left.name ?? "n/a"}
                          </p>
                          <p>
                            <span className="font-medium text-[var(--foreground)]">Quelle:</span> {change.left.sourceRef ?? "n/a"}
                          </p>
                          <p>
                            <span className="font-medium text-[var(--foreground)]">Ziel:</span> {change.left.targetRef ?? "n/a"}
                          </p>
                        </>
                      ) : (
                        <p className="text-[var(--foreground-muted)]">n/a</p>
                      )}
                    </div>
                    <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2 text-xs text-[var(--foreground-subtle)]">
                      <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[var(--foreground-muted)]">Nachher</p>
                      {change.right ? (
                        <>
                          <p>
                            <span className="font-medium text-[var(--foreground)]">Typ:</span> {change.right.type}
                          </p>
                          <p>
                            <span className="font-medium text-[var(--foreground)]">Name:</span> {change.right.name ?? "n/a"}
                          </p>
                          <p>
                            <span className="font-medium text-[var(--foreground)]">Quelle:</span> {change.right.sourceRef ?? "n/a"}
                          </p>
                          <p>
                            <span className="font-medium text-[var(--foreground)]">Ziel:</span> {change.right.targetRef ?? "n/a"}
                          </p>
                        </>
                      ) : (
                        <p className="text-[var(--foreground-muted)]">n/a</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
        {compareState.laneMappingChanges.length > 0 && (
          <div className="mt-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-3">
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground-muted)]">Lane Mapping Aenderungen</p>
            <div className="mt-2 max-h-72 space-y-2 overflow-auto pr-1">
              {compareState.laneMappingChanges.map((change) => (
                <div key={change.bpmnElementId} className="rounded-xl border border-[var(--border-soft)] bg-white p-2.5">
                  <p className="text-xs text-[var(--foreground-subtle)]">
                    <span className="font-medium text-[var(--foreground)]">{change.bpmnElementId}</span> ({change.changeType})
                  </p>
                  <div className="mt-2 grid gap-2 md:grid-cols-2">
                    <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2">
                      <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[var(--foreground-muted)]">Vorher</p>
                      {renderLaneSnapshot(change.left)}
                    </div>
                    <div className="rounded-lg border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-2">
                      <p className="mb-1 text-[10px] uppercase tracking-[0.14em] text-[var(--foreground-muted)]">Nachher</p>
                      {renderLaneSnapshot(change.right)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </section>

      <section className="rounded-[28px] border border-[var(--border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground-muted)]">Draft XML</p>
            <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">BPMN-Inhalt</h3>
          </div>
          <button
            type="button"
            onClick={() => setXml(defaultBpmnXml)}
            className="rounded-full border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--foreground)]"
          >
            Standard XML laden
          </button>
        </div>
        <textarea
          value={xml}
          onChange={(event) => setXml(event.target.value)}
          className="mt-5 min-h-[520px] w-full rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-4 font-mono text-xs leading-6 text-[var(--foreground)] outline-none transition focus:border-[var(--foreground)]"
        />
      </section>
    </div>
  );
}
