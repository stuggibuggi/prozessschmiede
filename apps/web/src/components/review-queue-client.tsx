"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import type { ApprovalQueueItem, ApprovalReviewDetail, GovernancePolicies } from "@prozessschmiede/types";
import { StatusBadge } from "@prozessschmiede/ui";
import { approveReview, getReviewDetail, returnReview } from "../lib/api-client";

interface ReviewQueueClientProps {
  reviews: ApprovalQueueItem[];
  policies: GovernancePolicies;
}

export function ReviewQueueClient({ reviews, policies }: ReviewQueueClientProps) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Record<string, string>>({});
  const [decisionNotes, setDecisionNotes] = useState<Record<string, string>>({});
  const [expandedReviewId, setExpandedReviewId] = useState<string | null>(null);
  const [detailById, setDetailById] = useState<Record<string, ApprovalReviewDetail>>({});
  const [loadingDetailId, setLoadingDetailId] = useState<string | null>(null);

  async function toggleDetails(reviewId: string) {
    if (expandedReviewId === reviewId) {
      setExpandedReviewId(null);
      return;
    }

    setExpandedReviewId(reviewId);
    if (detailById[reviewId]) {
      return;
    }

    setLoadingDetailId(reviewId);
    try {
      const detail = await getReviewDetail(reviewId);
      setDetailById((current) => ({ ...current, [reviewId]: detail }));
    } catch (error) {
      setMessages((current) => ({
        ...current,
        [reviewId]: error instanceof Error ? error.message : "Review-Details konnten nicht geladen werden."
      }));
    } finally {
      setLoadingDetailId(null);
    }
  }

  async function handleDecision(reviewId: string, action: "approve" | "return") {
    const note = decisionNotes[reviewId]?.trim() ?? "";
    if (action === "return" && !note) {
      setMessages((current) => ({ ...current, [reviewId]: "Bitte Begruendung fuer die Rueckgabe eintragen." }));
      return;
    }

    setBusyId(reviewId);
    setMessages((current) => ({ ...current, [reviewId]: "" }));

    try {
      if (action === "approve") {
        await approveReview(reviewId, note || undefined);
        setMessages((current) => ({ ...current, [reviewId]: "Review wurde freigegeben." }));
      } else {
        await returnReview(reviewId, note);
        setMessages((current) => ({ ...current, [reviewId]: "Review wurde zur Ueberarbeitung zurueckgegeben." }));
      }

      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setMessages((current) => ({
        ...current,
        [reviewId]: error instanceof Error ? error.message : "Aktion konnte nicht ausgefuehrt werden."
      }));
    } finally {
      setBusyId(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-[24px] border border-[var(--border-soft)] bg-white p-5">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground-muted)]">Governance Policies</p>
        <div className="mt-3 flex flex-wrap gap-2 text-xs text-[var(--foreground-subtle)]">
          <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-1">
            Vier-Augen-Prinzip: {policies.fourEyesPrinciple ? "aktiv" : "inaktiv"}
          </span>
          <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-1">
            Antragsteller != Entscheider: {policies.reviewerMustDifferFromApprover ? "aktiv" : "inaktiv"}
          </span>
          <span className="rounded-full border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-1">
            Published unveraenderlich: {policies.publishedVersionImmutable ? "aktiv" : "inaktiv"}
          </span>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="rounded-[24px] border border-[var(--border-soft)] bg-white p-5 text-sm text-[var(--foreground-subtle)]">
          Keine offenen Reviews im Queue.
        </div>
      ) : null}
      {reviews.map((review) => {
        const reviewDetail = detailById[review.id];
        return (
          <div key={review.id} className="rounded-[24px] border border-[var(--border-soft)] bg-white p-5">
          <div className="flex items-start justify-between gap-5">
            <div>
              <p className="text-base font-semibold">{review.modelName}</p>
              <p className="mt-2 text-sm text-[var(--foreground-subtle)]">
                Angefragt durch {review.requestedBy} am {new Date(review.requestedAt).toLocaleString("de-DE")}
              </p>
              <p className="mt-1 text-xs uppercase tracking-[0.16em] text-[var(--foreground-muted)]">{review.currentStep ?? "approval"}</p>
              {review.currentStepDueAt ? (
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">Faellig bis {new Date(review.currentStepDueAt).toLocaleString("de-DE")}</p>
              ) : null}
              {review.currentAssigneeDisplayName ? (
                <p className="mt-1 text-xs text-[var(--foreground-muted)]">Zugewiesen an {review.currentAssigneeDisplayName}</p>
              ) : null}
              {review.isOverdue ? <p className="mt-1 text-xs font-medium text-red-600">Ueberfaellig</p> : null}
            </div>
            <StatusBadge value={review.status} />
          </div>

          <div className="mt-4">
            <label className="text-xs uppercase tracking-[0.16em] text-[var(--foreground-muted)]">Entscheidungsnotiz</label>
            <textarea
              value={decisionNotes[review.id] ?? ""}
              onChange={(event) =>
                setDecisionNotes((current) => ({
                  ...current,
                  [review.id]: event.target.value
                }))
              }
              className="mt-2 min-h-20 w-full rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-3 py-2 text-sm text-[var(--foreground)] outline-none transition focus:border-[var(--foreground)]"
              placeholder="Begruendung oder Kommentar zur Entscheidung (bei Rueckgabe verpflichtend)"
            />
          </div>

          <div className="mt-4 flex gap-3">
            <button
              type="button"
              onClick={() => handleDecision(review.id, "approve")}
              disabled={busyId === review.id}
              className="rounded-full bg-[var(--foreground)] px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
            >
              Freigeben
            </button>
            <button
              type="button"
              onClick={() => handleDecision(review.id, "return")}
              disabled={busyId === review.id || !(decisionNotes[review.id]?.trim().length)}
              className="rounded-full border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-60"
            >
              Zurueckgeben
            </button>
            <button
              type="button"
              onClick={() => toggleDetails(review.id)}
              disabled={loadingDetailId === review.id}
              className="rounded-full border border-[var(--border-soft)] px-4 py-2 text-sm text-[var(--foreground)] disabled:opacity-60"
            >
              {expandedReviewId === review.id ? "Details ausblenden" : loadingDetailId === review.id ? "Laedt..." : "Details anzeigen"}
            </button>
          </div>

          {expandedReviewId === review.id ? (
            <div className="mt-4 rounded-[16px] border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-3">
              {reviewDetail ? (
                <div className="space-y-3 text-sm text-[var(--foreground-subtle)]">
                  <p>
                    Version: <span className="font-medium text-[var(--foreground)]">{reviewDetail.modelVersion.versionLabel}</span>
                  </p>
                  {reviewDetail.steps.flatMap((step) => step.decisions).length === 0 ? (
                    <p>Noch keine Entscheidungen protokolliert.</p>
                  ) : (
                    <div className="space-y-2">
                      {reviewDetail.steps.flatMap((step) =>
                        step.decisions.map((decision) => (
                          <div key={decision.id} className="rounded-xl border border-[var(--border-soft)] bg-white p-2.5">
                            <p className="font-medium text-[var(--foreground)]">
                              {decision.decision} durch {decision.actor.displayName}
                            </p>
                            <p className="mt-1 text-xs">
                              {new Date(decision.decidedAt).toLocaleString("de-DE")}
                              {decision.comment ? ` | ${decision.comment}` : ""}
                            </p>
                          </div>
                        ))
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <p className="text-sm text-[var(--foreground-subtle)]">Details werden geladen...</p>
              )}
            </div>
          ) : null}

          {messages[review.id] ? <p className="mt-3 text-sm text-[var(--foreground-subtle)]">{messages[review.id]}</p> : null}
          </div>
        );
      })}
    </div>
  );
}
