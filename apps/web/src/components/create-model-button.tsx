"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { createProcessModel } from "../lib/api-client";

interface CreateModelButtonProps {
  processId: string;
}

export function CreateModelButton({ processId }: CreateModelButtonProps) {
  const router = useRouter();
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showListHint, setShowListHint] = useState(false);

  async function handleCreate() {
    const name = window.prompt("Name des neuen BPMN-Modells", "Neues BPMN-Modell");
    if (!name || !name.trim()) {
      return;
    }

    setIsCreating(true);
    setError(null);
    setShowListHint(false);

    try {
      const result = await createProcessModel(processId, { name: name.trim() });
      router.push(result.workspaceHref);
      router.refresh();
    } catch (createError) {
      if (createError instanceof Error) {
        if (createError.message.includes("with 404") && createError.message.includes("/processes/")) {
          setError("Der Prozess ist nicht mehr im aktuellen Stand verfuegbar. Bitte Prozessliste neu laden und erneut oeffnen.");
          setShowListHint(true);
        } else if (createError.message.toLowerCase().includes("failed to fetch")) {
          setError("Die API ist aktuell nicht erreichbar. Bitte Server und Proxy-Konfiguration pruefen.");
        } else {
          setError(createError.message);
        }
      } else {
        setError("Modell konnte nicht angelegt werden.");
      }
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-3">
      <button
        type="button"
        onClick={handleCreate}
        disabled={isCreating}
        className="rounded-full bg-[var(--foreground)] px-5 py-3 text-sm font-medium text-white disabled:opacity-60"
      >
        {isCreating ? "Legt Modell an..." : "Neues Modell"}
      </button>
      {error ? <p className="text-sm text-[var(--foreground-subtle)]">{error}</p> : null}
      {showListHint ? (
        <button
          type="button"
          onClick={() => {
            router.push("/processes");
            router.refresh();
          }}
          className="text-sm font-medium text-[var(--foreground)] underline underline-offset-4"
        >
          Zur Prozessliste wechseln
        </button>
      ) : null}
    </div>
  );
}
