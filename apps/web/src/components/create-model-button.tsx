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

  async function handleCreate() {
    const name = window.prompt("Name des neuen BPMN-Modells", "Neues BPMN-Modell");
    if (!name || !name.trim()) {
      return;
    }

    setIsCreating(true);
    setError(null);

    try {
      const result = await createProcessModel(processId, { name: name.trim() });
      router.push(result.workspaceHref);
      router.refresh();
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Modell konnte nicht angelegt werden.");
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
    </div>
  );
}
