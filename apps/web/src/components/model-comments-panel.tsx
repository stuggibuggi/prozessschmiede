"use client";

import { useRouter } from "next/navigation";
import { startTransition, useState } from "react";
import type { CommentSummary } from "@prozessschmiede/types";
import { createModelComment } from "../lib/api-client";

interface ModelCommentsPanelProps {
  modelId: string;
  comments: CommentSummary[];
}

export function ModelCommentsPanel({ modelId, comments }: ModelCommentsPanelProps) {
  const router = useRouter();
  const [content, setContent] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function handleSubmit() {
    if (!content.trim()) {
      setMessage("Bitte einen Kommentar eingeben.");
      return;
    }

    setIsSubmitting(true);
    setMessage(null);

    try {
      await createModelComment(modelId, { content: content.trim() });
      setContent("");
      setMessage("Kommentar gespeichert.");
      startTransition(() => {
        router.refresh();
      });
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Kommentar konnte nicht gespeichert werden.");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <section className="rounded-[28px] border border-[var(--border-soft)] bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.06)]">
      <p className="text-xs uppercase tracking-[0.16em] text-[var(--foreground-muted)]">Kollaboration</p>
      <h3 className="mt-2 text-xl font-semibold tracking-[-0.03em] text-[var(--foreground)]">Kommentare</h3>
      <textarea
        value={content}
        onChange={(event) => setContent(event.target.value)}
        className="mt-5 min-h-28 w-full rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-subtle)] px-4 py-4 text-sm leading-6 text-[var(--foreground)] outline-none transition focus:border-[var(--foreground)]"
        placeholder="Kommentar zum Modell oder zur aktuellen Version"
      />
      <button
        type="button"
        onClick={handleSubmit}
        disabled={isSubmitting}
        className="mt-4 w-full rounded-full border border-[var(--border-soft)] px-5 py-3 text-sm font-medium text-[var(--foreground)] disabled:opacity-60"
      >
        {isSubmitting ? "Speichert..." : "Kommentar hinzufuegen"}
      </button>
      {message ? <p className="mt-3 text-sm text-[var(--foreground-subtle)]">{message}</p> : null}

      <div className="mt-6 space-y-4">
        {comments.length === 0 ? (
          <p className="text-sm text-[var(--foreground-subtle)]">Noch keine Kommentare zur aktuellen Modellversion.</p>
        ) : (
          comments.map((comment) => (
            <div key={comment.id} className="rounded-[24px] border border-[var(--border-soft)] bg-[var(--surface-subtle)] p-4">
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-[var(--foreground)]">{comment.authorDisplayName}</p>
                <p className="text-xs text-[var(--foreground-muted)]">{new Date(comment.createdAt).toLocaleString("de-DE")}</p>
              </div>
              <p className="mt-3 text-sm leading-6 text-[var(--foreground-subtle)]">{comment.content}</p>
            </div>
          ))
        )}
      </div>
    </section>
  );
}
