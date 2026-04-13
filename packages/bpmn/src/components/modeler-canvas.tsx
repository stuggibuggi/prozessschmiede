"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import type { BpmnElementSelection } from "@prozessschmiede/types";

interface BpmnModelerCanvasProps {
  xml: string;
  onXmlChange: (xml: string) => void;
  onLanesChange?: (lanes: Array<{ bpmnElementId: string; laneNameSnapshot: string }>) => void;
  onSelectionChange?: (selection: BpmnElementSelection | null) => void;
  selectedElementName?: string;
  desiredLanes?: Array<{ bpmnElementId: string; laneNameSnapshot: string }>;
}

type BpmnModelerInstance = {
  importXML: (xml: string) => Promise<unknown>;
  saveXML: (options: { format: boolean }) => Promise<{ xml?: string }>;
  on: (event: string, callback: (event?: unknown) => void) => void;
  get: (service: string) => unknown;
  destroy: () => void;
};

type BpmnModeling = {
  updateLabel: (element: BpmnShape, value: string) => void;
  updateProperties: (element: BpmnShape, properties: Record<string, unknown>) => void;
  createShape: (shape: unknown, position: { x: number; y: number }, target: unknown) => void;
  removeElements: (elements: BpmnShape[]) => void;
  addLane?: (target: BpmnShape, location: "top" | "bottom") => BpmnShape;
};

type BpmnElementFactory = {
  createShape: (config: Record<string, unknown>) => unknown;
};

type BpmnCanvas = {
  getRootElement: () => unknown;
};

type BpmnShape = {
  id: string;
  type: string;
  businessObject?: {
    id?: string;
    name?: string;
  };
};

type BpmnElementRegistry = {
  getAll: () => BpmnShape[];
};

export function BpmnModelerCanvas({ xml, onXmlChange, onLanesChange, onSelectionChange, selectedElementName, desiredLanes }: BpmnModelerCanvasProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const modelerRef = useRef<BpmnModelerInstance | null>(null);
  const selectedShapeRef = useRef<BpmnShape | null>(null);
  const lastImportedXmlRef = useRef<string>("");
  const isApplyingLaneSyncRef = useRef(false);
  const onXmlChangeRef = useRef(onXmlChange);
  const onLanesChangeRef = useRef(onLanesChange);
  const onSelectionChangeRef = useRef(onSelectionChange);
  const [loadState, setLoadState] = useState<"loading" | "ready" | "error">("loading");

  useEffect(() => {
    onXmlChangeRef.current = onXmlChange;
  }, [onXmlChange]);

  useEffect(() => {
    onLanesChangeRef.current = onLanesChange;
  }, [onLanesChange]);

  useEffect(() => {
    onSelectionChangeRef.current = onSelectionChange;
  }, [onSelectionChange]);

  useEffect(() => {
    let disposed = false;

    function makePaletteDraggable() {
      if (!hostRef.current) {
        return;
      }

      const palette = hostRef.current.querySelector(".djs-palette") as HTMLElement | null;
      if (!palette || palette.getAttribute("data-draggable") === "true") {
        return;
      }

      palette.setAttribute("data-draggable", "true");
      palette.style.position = "absolute";
      palette.style.left = "16px";
      palette.style.top = "16px";
      palette.style.zIndex = "30";

      const handle = document.createElement("div");
      handle.className = "palette-drag-handle";
      handle.textContent = "Toolbox";
      handle.style.cursor = "move";
      handle.style.padding = "6px 10px";
      handle.style.fontSize = "12px";
      handle.style.letterSpacing = "0.08em";
      handle.style.textTransform = "uppercase";
      handle.style.color = "var(--foreground, #102033)";
      handle.style.background = "rgba(255,255,255,0.92)";
      handle.style.border = "1px solid var(--border-soft, rgba(148,163,184,0.18))";
      handle.style.borderRadius = "10px";
      handle.style.marginBottom = "8px";
      handle.style.backdropFilter = "blur(6px)";

      palette.prepend(handle);

      let dragging = false;
      let offsetX = 0;
      let offsetY = 0;

      const onPointerMove = (event: PointerEvent) => {
        if (!dragging || !hostRef.current) {
          return;
        }

        const hostBounds = hostRef.current.getBoundingClientRect();
        const nextLeft = event.clientX - hostBounds.left - offsetX;
        const nextTop = event.clientY - hostBounds.top - offsetY;
        const maxLeft = hostBounds.width - palette.offsetWidth - 8;
        const maxTop = hostBounds.height - palette.offsetHeight - 8;

        palette.style.left = `${Math.max(8, Math.min(nextLeft, maxLeft))}px`;
        palette.style.top = `${Math.max(8, Math.min(nextTop, maxTop))}px`;
      };

      const onPointerUp = () => {
        dragging = false;
        window.removeEventListener("pointermove", onPointerMove);
        window.removeEventListener("pointerup", onPointerUp);
      };

      handle.addEventListener("pointerdown", (event: PointerEvent) => {
        event.preventDefault();
        dragging = true;
        const paletteBounds = palette.getBoundingClientRect();
        offsetX = event.clientX - paletteBounds.left;
        offsetY = event.clientY - paletteBounds.top;
        window.addEventListener("pointermove", onPointerMove);
        window.addEventListener("pointerup", onPointerUp);
      });
    }

    function emitLaneSnapshot() {
      if (!modelerRef.current || !onLanesChangeRef.current) {
        return;
      }

      const elementRegistry = modelerRef.current.get("elementRegistry") as BpmnElementRegistry | undefined;
      if (!elementRegistry) {
        return;
      }

      const lanes = elementRegistry
        .getAll()
        .filter((element) => element.type === "bpmn:Lane")
        .map((lane) => ({
          bpmnElementId: lane.id,
          laneNameSnapshot: lane.businessObject?.name?.trim() || lane.id
        }));

      onLanesChangeRef.current(lanes);
    }

    async function setupModeler() {
      if (!hostRef.current) {
        return;
      }

      try {
        const [{ default: BpmnModeler }] = await Promise.all([import("bpmn-js/lib/Modeler")]);

        if (disposed || !hostRef.current) {
          return;
        }

        const rawModeler = new BpmnModeler({
          container: hostRef.current,
          keyboard: {
            bindTo: window
          }
        });
        const modeler = rawModeler as unknown as BpmnModelerInstance;

        modelerRef.current = modeler;
        lastImportedXmlRef.current = xml;
        await modeler.importXML(xml);
        makePaletteDraggable();
        emitLaneSnapshot();

        modeler.on("commandStack.changed", async () => {
          if (!modelerRef.current) {
            return;
          }

          if (isApplyingLaneSyncRef.current) {
            isApplyingLaneSyncRef.current = false;
            emitLaneSnapshot();
            return;
          }

          const result = await modelerRef.current.saveXML({ format: true });
          const nextXml = result.xml ?? "";

          if (!nextXml || nextXml === lastImportedXmlRef.current) {
            return;
          }

          lastImportedXmlRef.current = nextXml;
          startTransition(() => {
            onXmlChangeRef.current(nextXml);
          });
          emitLaneSnapshot();
        });

        modeler.on("selection.changed", (event) => {
          if (!onSelectionChangeRef.current) {
            return;
          }

          const selectedElements = ((event as { newSelection?: BpmnShape[] } | undefined)?.newSelection ?? []) as BpmnShape[];
          const selected = selectedElements[0];

          if (!selected) {
            selectedShapeRef.current = null;
            onSelectionChangeRef.current(null);
            return;
          }

          selectedShapeRef.current = selected;
          onSelectionChangeRef.current({
            id: selected.id,
            type: selected.type,
            ...(selected.businessObject?.name ? { name: selected.businessObject.name } : {})
          });
        });

        setLoadState("ready");
      } catch (error) {
        console.error("Failed to initialize BPMN modeler", error);
        setLoadState("error");
      }
    }

    setupModeler();

    return () => {
      disposed = true;
      modelerRef.current?.destroy();
      modelerRef.current = null;
    };
  }, []);

  useEffect(() => {
    async function syncXml() {
      if (!modelerRef.current || xml === lastImportedXmlRef.current) {
        return;
      }

      lastImportedXmlRef.current = xml;
      try {
        await modelerRef.current.importXML(xml);
        if (onLanesChangeRef.current) {
          const elementRegistry = modelerRef.current.get("elementRegistry") as BpmnElementRegistry | undefined;
          const lanes = (elementRegistry?.getAll() ?? [])
            .filter((element) => element.type === "bpmn:Lane")
            .map((lane) => ({
              bpmnElementId: lane.id,
              laneNameSnapshot: lane.businessObject?.name?.trim() || lane.id
            }));
          onLanesChangeRef.current(lanes);
        }
      } catch (error) {
        console.error("Failed to import BPMN XML", error);
      }
    }

    syncXml();
  }, [xml]);

  useEffect(() => {
    if (!modelerRef.current || !selectedShapeRef.current || selectedElementName === undefined) {
      return;
    }

    const currentSelection = selectedShapeRef.current;
    const currentName = currentSelection.businessObject?.name ?? "";
    if (selectedElementName === currentName) {
      return;
    }

    try {
      const modeling = modelerRef.current.get("modeling") as BpmnModeling | undefined;
      if (!modeling) {
        return;
      }

      modeling.updateProperties(currentSelection, {
        name: selectedElementName
      });
      modeling.updateLabel(currentSelection, selectedElementName);
    } catch (error) {
      console.error("Failed to update BPMN element properties", error);
    }
  }, [selectedElementName]);

  useEffect(() => {
    if (!modelerRef.current || !desiredLanes) {
      return;
    }

    const elementRegistry = modelerRef.current.get("elementRegistry") as BpmnElementRegistry | undefined;
    const modeling = modelerRef.current.get("modeling") as BpmnModeling | undefined;
    const elementFactory = modelerRef.current.get("elementFactory") as BpmnElementFactory | undefined;
    const canvas = modelerRef.current.get("canvas") as BpmnCanvas | undefined;

    if (!elementRegistry || !modeling || !elementFactory || !canvas) {
      return;
    }

    const allElements = elementRegistry.getAll();
    const existingLanes = allElements.filter((element) => element.type === "bpmn:Lane");
    const participant = allElements.find((element) => element.type === "bpmn:Participant");
    const existingLaneIds = new Set(existingLanes.map((lane) => lane.id));
    const desiredLaneIds = new Set(desiredLanes.map((lane) => lane.bpmnElementId).filter(Boolean));

    let hasChanges = false;

    let laneAnchor: BpmnShape | undefined = existingLanes[0] ?? participant;

    for (const lane of desiredLanes) {
      const existingLane = existingLanes.find((element) => element.id === lane.bpmnElementId);
      if (existingLane) {
        const existingName = existingLane.businessObject?.name ?? "";
        if (lane.laneNameSnapshot !== existingName) {
          modeling.updateProperties(existingLane, {
            name: lane.laneNameSnapshot
          });
          modeling.updateLabel(existingLane, lane.laneNameSnapshot);
          hasChanges = true;
        }
        continue;
      }

      try {
        if (laneAnchor && modeling.addLane) {
          const createdLane = modeling.addLane(laneAnchor, "bottom");
          modeling.updateProperties(createdLane, {
            ...(lane.bpmnElementId ? { id: lane.bpmnElementId } : {}),
            name: lane.laneNameSnapshot
          });
          modeling.updateLabel(createdLane, lane.laneNameSnapshot);
          laneAnchor = createdLane;
          hasChanges = true;
          continue;
        }
      } catch (laneError) {
        console.warn("addLane failed, falling back to createShape", laneError);
      }

      const rootElement = canvas.getRootElement();
      try {
        const shape = elementFactory.createShape({
          type: "bpmn:Lane",
          ...(lane.bpmnElementId ? { id: lane.bpmnElementId } : {})
        });
        modeling.createShape(
          shape,
          {
            x: 240,
            y: 180 + existingLanes.length * 140
          },
          rootElement
        );
      } catch (shapeError) {
        console.warn("createShape for lane failed", shapeError);
      }
      hasChanges = true;
    }

    const lanesToRemove = existingLanes.filter((lane) => !desiredLaneIds.has(lane.id));
    if (lanesToRemove.length > 0) {
      modeling.removeElements(lanesToRemove);
      hasChanges = true;
    }

    if (hasChanges) {
      isApplyingLaneSyncRef.current = true;
    }
  }, [desiredLanes]);

  return (
    <div className="relative h-full min-h-[620px] overflow-hidden rounded-[20px] border border-[var(--border-soft)] bg-[linear-gradient(180deg,rgba(244,247,251,0.82)_0%,rgba(255,255,255,1)_100%)]">
      <div ref={hostRef} className="bpmn-host h-full min-h-[620px] w-full" />
      {loadState !== "ready" ? (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/70 backdrop-blur-[2px]">
          <div className="max-w-sm text-center">
            <p className="text-sm uppercase tracking-[0.16em] text-[var(--foreground-muted)]">BPMN Canvas</p>
            <h3 className="mt-3 text-2xl font-semibold tracking-[-0.04em] text-[var(--foreground)]">
              {loadState === "loading" ? "Modeler wird geladen" : "Modeler konnte nicht geladen werden"}
            </h3>
            <p className="mt-3 text-sm leading-6 text-[var(--foreground-subtle)]">
              {loadState === "loading"
                ? "Die browserseitige Modellierungsumgebung wird initialisiert."
                : "Die XML-Bearbeitung bleibt verfuegbar. Bitte pruefe die Browser-Konsole fuer weitere Details."}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
