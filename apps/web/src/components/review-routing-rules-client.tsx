"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import type { ProcessSummary, ReferenceOption, ReviewRoutingRuleSummary } from "@prozessschmiede/types";
import { createReviewRoutingRule, previewReviewRoutingForModel, updateReviewRoutingRule } from "../lib/api-client";

interface ReviewRoutingRulesClientProps {
  rules: ReviewRoutingRuleSummary[];
  processes: ProcessSummary[];
  users: ReferenceOption[];
  organizations: ReferenceOption[];
  modelOptions: ReferenceOption[];
}

export function ReviewRoutingRulesClient({ rules, processes, users, organizations, modelOptions }: ReviewRoutingRulesClientProps) {
  const router = useRouter();
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [processId, setProcessId] = useState("");
  const [reviewerUserId, setReviewerUserId] = useState("");
  const [approverUserId, setApproverUserId] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [roleCode, setRoleCode] = useState("");
  const [priority, setPriority] = useState("100");
  const [isActive, setIsActive] = useState(true);
  const [message, setMessage] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [previewModelId, setPreviewModelId] = useState("");
  const [previewResult, setPreviewResult] = useState<null | {
    modelId: string;
    modelName: string;
    latestVersionId: string;
    selectedRuleId?: string;
    selectedRuleName?: string;
    reviewerDisplayName?: string;
    approverDisplayName?: string;
    evaluatedRules: Array<{
      id: string;
      name: string;
      score: number;
      priority: number;
      reviewerDisplayName: string;
      approverDisplayName: string;
      processName?: string;
      organizationName?: string;
      roleCode?: string;
    }>;
  }>(null);
  const [previewMessage, setPreviewMessage] = useState<string | null>(null);
  const [isPreviewing, setIsPreviewing] = useState(false);

  function resetForm() {
    setEditingRuleId(null);
    setName("");
    setProcessId("");
    setReviewerUserId("");
    setApproverUserId("");
    setOrganizationId("");
    setRoleCode("");
    setPriority("100");
    setIsActive(true);
  }

  function loadRuleIntoForm(rule: ReviewRoutingRuleSummary) {
    setEditingRuleId(rule.id);
    setName(rule.name);
    setProcessId(rule.processId ?? "");
    setReviewerUserId(rule.reviewerUserId);
    setApproverUserId(rule.approverUserId);
    setOrganizationId(rule.organizationId ?? "");
    setRoleCode(rule.roleCode ?? "");
    setPriority(String(rule.priority));
    setIsActive(rule.isActive);
    setMessage(null);
  }

  async function handleSaveRule() {
    if (!name.trim()) {
      setMessage("Bitte Regelname eintragen.");
      return;
    }
    if (!reviewerUserId || !approverUserId) {
      setMessage("Reviewer und Approver muessen gesetzt sein.");
      return;
    }
    if (reviewerUserId === approverUserId) {
      setMessage("Reviewer und Approver muessen unterschiedlich sein.");
      return;
    }

    setIsSaving(true);
    setMessage(null);

    try {
      const payload = {
        name: name.trim(),
        ...(processId ? { processId } : {}),
        ...(organizationId ? { organizationId } : {}),
        ...(roleCode.trim() ? { roleCode: roleCode.trim() } : {}),
        reviewerUserId,
        approverUserId,
        priority: Math.max(1, Number(priority) || 100),
        isActive
      };

      if (editingRuleId) {
        await updateReviewRoutingRule(editingRuleId, payload);
      } else {
        await createReviewRoutingRule(payload);
      }

      setMessage(editingRuleId ? "Routing-Regel aktualisiert." : "Routing-Regel gespeichert.");
      resetForm();
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Routing-Regel konnte nicht gespeichert werden.");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleToggleRule(rule: ReviewRoutingRuleSummary) {
    try {
      setMessage(null);
      await updateReviewRoutingRule(rule.id, {
        name: rule.name,
        isActive: !rule.isActive,
        priority: rule.priority,
        ...(rule.processId ? { processId: rule.processId } : {}),
        ...(rule.organizationId ? { organizationId: rule.organizationId } : {}),
        ...(rule.roleCode ? { roleCode: rule.roleCode } : {}),
        reviewerUserId: rule.reviewerUserId,
        approverUserId: rule.approverUserId
      });
      startTransition(() => router.refresh());
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Regel konnte nicht aktualisiert werden.");
    }
  }

  async function handlePreview() {
    if (!previewModelId.trim()) {
      setPreviewMessage("Bitte Model-ID eintragen.");
      return;
    }
    setIsPreviewing(true);
    setPreviewMessage(null);
    try {
      const result = await previewReviewRoutingForModel(previewModelId.trim());
      setPreviewResult(result);
    } catch (error) {
      setPreviewResult(null);
      setPreviewMessage(error instanceof Error ? error.message : "Vorschau konnte nicht geladen werden.");
    } finally {
      setIsPreviewing(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-[24px] border border-[var(--border-soft)] bg-white p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground-muted)]">Neue Routing-Regel</p>
        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--foreground)]"
            placeholder="Regelname"
          />
          <select
            value={processId}
            onChange={(event) => setProcessId(event.target.value)}
            className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--foreground)]"
          >
            <option value="">Global (alle Prozesse)</option>
            {processes.map((process) => (
              <option key={process.id} value={process.id}>
                {process.businessId} - {process.name}
              </option>
            ))}
          </select>
          <select
            value={organizationId}
            onChange={(event) => setOrganizationId(event.target.value)}
            className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--foreground)]"
          >
            <option value="">Alle Organisationen</option>
            {organizations.map((organization) => (
              <option key={organization.id} value={organization.id}>
                {organization.code} - {organization.name}
              </option>
            ))}
          </select>
          <input
            value={roleCode}
            onChange={(event) => setRoleCode(event.target.value)}
            className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--foreground)]"
            placeholder="Rolle aus Lane-Mapping (optional)"
          />
          <select
            value={reviewerUserId}
            onChange={(event) => setReviewerUserId(event.target.value)}
            className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--foreground)]"
          >
            <option value="">Reviewer waehlen</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.code})
              </option>
            ))}
          </select>
          <select
            value={approverUserId}
            onChange={(event) => setApproverUserId(event.target.value)}
            className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--foreground)]"
          >
            <option value="">Approver waehlen</option>
            {users.map((user) => (
              <option key={user.id} value={user.id}>
                {user.name} ({user.code})
              </option>
            ))}
          </select>
          <input
            value={priority}
            onChange={(event) => setPriority(event.target.value)}
            className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--foreground)]"
            placeholder="Prioritaet (z.B. 100)"
          />
          <label className="inline-flex items-center gap-2 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-sm">
            <input type="checkbox" checked={isActive} onChange={(event) => setIsActive(event.target.checked)} />
            Aktiv
          </label>
        </div>
        <div className="mt-4 flex items-center gap-3">
          <button
            type="button"
            onClick={handleSaveRule}
            disabled={isSaving}
            className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
          >
            {isSaving ? "Speichert..." : editingRuleId ? "Regel aktualisieren" : "Regel speichern"}
          </button>
          {editingRuleId ? (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-full border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--foreground)]"
            >
              Bearbeiten abbrechen
            </button>
          ) : null}
          {message ? <p className="text-sm text-[var(--foreground-subtle)]">{message}</p> : null}
        </div>
      </section>

      <section className="rounded-[24px] border border-[var(--border-soft)] bg-white p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground-muted)]">Routing Dry-Run</p>
        <div className="mt-4 flex gap-3">
          <input
            value={previewModelId}
            onChange={(event) => setPreviewModelId(event.target.value)}
            className="flex-1 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--foreground)]"
            placeholder="Model-ID fuer Vorschau"
          />
          <select
            value={previewModelId}
            onChange={(event) => setPreviewModelId(event.target.value)}
            className="flex-1 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-sm outline-none focus:border-[var(--foreground)]"
          >
            <option value="">Oder Modell auswaehlen</option>
            {modelOptions.map((option) => (
              <option key={option.id} value={option.id}>
                {option.code} - {option.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={handlePreview}
            disabled={isPreviewing}
            className="rounded-full border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-60"
          >
            {isPreviewing ? "Prueft..." : "Vorschau"}
          </button>
        </div>
        {previewMessage ? <p className="mt-3 text-sm text-[var(--foreground-subtle)]">{previewMessage}</p> : null}
        {previewResult ? (
          <div className="mt-4 rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-3">
            <p className="font-medium text-[var(--foreground)]">
              {previewResult.modelName} ({previewResult.modelId})
            </p>
            <p className="mt-1 text-xs text-[var(--foreground-subtle)]">
              Ausgewaehlte Regel: {previewResult.selectedRuleName ?? "keine"} | Reviewer: {previewResult.reviewerDisplayName ?? "n/a"} | Approver:{" "}
              {previewResult.approverDisplayName ?? "n/a"}
            </p>
          </div>
        ) : null}
      </section>

      <section className="rounded-[24px] border border-[var(--border-soft)] bg-white p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground-muted)]">Aktive Routing-Regeln</p>
        <div className="mt-4 space-y-3">
          {rules.length === 0 ? (
            <p className="text-sm text-[var(--foreground-subtle)]">Keine Regeln vorhanden.</p>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="rounded-2xl border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-3">
                <p className="font-medium text-[var(--foreground)]">{rule.name}</p>
                <p className="mt-1 text-xs text-[var(--foreground-subtle)]">
                  Scope: {rule.processName ?? "Global"} | Prioritaet: {rule.priority} | Status: {rule.isActive ? "aktiv" : "inaktiv"}
                </p>
                <p className="mt-1 text-xs text-[var(--foreground-subtle)]">
                  Organisation: {rule.organizationName ?? "alle"} | Rolle: {rule.roleCode ?? "alle"}
                </p>
                <p className="mt-1 text-xs text-[var(--foreground-subtle)]">
                  Reviewer: {rule.reviewerDisplayName} | Approver: {rule.approverDisplayName}
                </p>
                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => handleToggleRule(rule)}
                    className="rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs text-[var(--foreground)]"
                  >
                    {rule.isActive ? "Deaktivieren" : "Aktivieren"}
                  </button>
                  <button
                    type="button"
                    onClick={() => loadRuleIntoForm(rule)}
                    className="ml-2 rounded-full border border-[var(--border-soft)] px-3 py-1 text-xs text-[var(--foreground)]"
                  >
                    Bearbeiten
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </section>
    </div>
  );
}
