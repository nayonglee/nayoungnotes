"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useMemo, useRef, useState } from "react";
import {
  Eraser,
  Highlighter,
  Minus,
  Move,
  PenLine,
  PencilLine,
  Plus,
  RotateCcw,
  RotateCw,
  X,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { createDrawingSheet } from "@/lib/entry";
import { eraseStrokesNearPoint, strokeToSvgPath } from "@/lib/drawing";
import { clamp, createId } from "@/lib/utils";
import type {
  DrawingBackground,
  DrawingItem,
  DrawingSheet,
  DrawingStroke,
  StrokePoint
} from "@/types/diary";
import styles from "@/styles/entry.module.css";

type ToolMode = "fine" | "gel" | "marker" | "pencil" | "eraser";
type InputPolicy = "stylus" | "all";
type InteractionMode = "draw" | "pan";

const palette = ["#43383d", "#e49cbc", "#f4b285", "#b9cf84", "#8eb7e8", "#c5a4eb"];

const toolMeta: Record<
  ToolMode,
  {
    label: string;
    icon: typeof PenLine;
    drawTool: "pen" | "highlighter" | "pencil" | "eraser";
    defaultWidth: number;
    opacity: number;
    widths: number[];
  }
> = {
  fine: {
    label: "Fine pen",
    icon: PencilLine,
    drawTool: "pen",
    defaultWidth: 1.6,
    opacity: 0.92,
    widths: [1.2, 1.6, 2.2]
  },
  gel: {
    label: "Gel pen",
    icon: PenLine,
    drawTool: "pen",
    defaultWidth: 2.8,
    opacity: 0.98,
    widths: [2.2, 2.8, 3.8]
  },
  marker: {
    label: "Highlighter",
    icon: Highlighter,
    drawTool: "highlighter",
    defaultWidth: 6,
    opacity: 0.28,
    widths: [4.5, 6, 8.5]
  },
  pencil: {
    label: "Pencil",
    icon: PencilLine,
    drawTool: "pencil",
    defaultWidth: 2.2,
    opacity: 0.42,
    widths: [1.6, 2.2, 3.2]
  },
  eraser: {
    label: "Eraser",
    icon: Eraser,
    drawTool: "eraser",
    defaultWidth: 18,
    opacity: 1,
    widths: [12, 18, 26]
  }
};

const penPresets: Array<{
  id: string;
  label: string;
  tool: Exclude<ToolMode, "eraser">;
  color: string;
}> = [
  { id: "ink", label: "Ink", tool: "fine", color: "#43383d" },
  { id: "pink-gel", label: "Pink gel", tool: "gel", color: "#e49cbc" },
  { id: "mint-marker", label: "Mint marker", tool: "marker", color: "#b9cf84" },
  { id: "graphite", label: "Graphite", tool: "pencil", color: "#5c5458" },
  { id: "blue-pen", label: "Blue pen", tool: "gel", color: "#8eb7e8" }
];

const backgrounds: Array<{ id: DrawingBackground; label: string }> = [
  { id: "plain", label: "Plain" },
  { id: "ruled", label: "Ruled" },
  { id: "dot", label: "Dot" }
];

function normalizeSheets(drawing: DrawingItem) {
  const fallbackSheet: DrawingSheet = {
    id: drawing.payload.activeSheetId || `${drawing.id}_sheet_1`,
    title: "Sheet 1",
    background: "dot",
    strokes: []
  };
  const sheets = drawing.payload.sheets.length > 0 ? drawing.payload.sheets : [fallbackSheet];
  const activeSheetId = sheets.some((sheet) => sheet.id === drawing.payload.activeSheetId)
    ? drawing.payload.activeSheetId
    : sheets[0].id;

  return {
    activeSheetId,
    sheets
  };
}

export function HandwritingPad({
  drawing,
  onChange
}: {
  drawing: DrawingItem;
  onChange: (drawing: DrawingItem) => void;
}) {
  const normalized = useMemo(() => normalizeSheets(drawing), [drawing]);
  const [tool, setTool] = useState<ToolMode>("gel");
  const [color, setColor] = useState("#43383d");
  const [width, setWidth] = useState(toolMeta.gel.defaultWidth);
  const [activePreset, setActivePreset] = useState("ink");
  const [inputPolicy, setInputPolicy] = useState<InputPolicy>("stylus");
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("draw");
  const [straightLine, setStraightLine] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [redoStack, setRedoStack] = useState<DrawingStroke[][]>([]);
  const [livePoints, setLivePoints] = useState<StrokePoint[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const currentStroke = useRef<StrokePoint[]>([]);
  const historyRef = useRef<DrawingStroke[][]>([]);
  const panOriginRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const stageRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);
  const { activeSheetId, sheets } = normalized;
  const activeSheet = useMemo(
    () => sheets.find((sheet) => sheet.id === activeSheetId) ?? sheets[0],
    [activeSheetId, sheets]
  );
  const strokes = activeSheet?.strokes ?? [];
  const background = activeSheet?.background ?? "dot";

  const clampPanForZoom = (nextPan: { x: number; y: number }, nextZoom = zoom) => {
    const rect = viewportRef.current?.getBoundingClientRect();
    if (!rect || nextZoom <= 1) return { x: 0, y: 0 };

    const slackX = rect.width * (nextZoom - 1);
    const slackY = rect.height * (nextZoom - 1);

    return {
      x: clamp(nextPan.x, -slackX - 20, 20),
      y: clamp(nextPan.y, -slackY - 20, 20)
    };
  };

  const applyZoom = (nextZoom: number) => {
    const clampedZoom = clamp(nextZoom, 1, 2.6);
    setZoom(clampedZoom);
    setPan((current) => clampPanForZoom(current, clampedZoom));
  };

  const pushHistory = (snapshot: DrawingStroke[]) => {
    historyRef.current = [...historyRef.current, snapshot];
    if (historyRef.current.length > 30) historyRef.current = historyRef.current.slice(-30);
    setUndoCount(historyRef.current.length);
  };

  const emitSheets = (nextSheets: DrawingSheet[], nextActiveSheetId = activeSheetId) => {
    onChange({
      ...drawing,
      payload: {
        activeSheetId: nextActiveSheetId,
        sheets: nextSheets
      },
      updatedAt: new Date().toISOString()
    });
  };

  const resetSheetSession = () => {
    historyRef.current = [];
    setUndoCount(0);
    setRedoStack([]);
    currentStroke.current = [];
    setLivePoints([]);
  };

  const commitSheets = (nextSheets: DrawingSheet[], nextActiveSheetId = activeSheetId) => {
    emitSheets(nextSheets, nextActiveSheetId);
  };

  const updateActiveSheet = (updater: (sheet: DrawingSheet) => DrawingSheet) => {
    if (!activeSheet) return;
    const nextSheets = sheets.map((sheet) =>
      sheet.id === activeSheet.id ? updater(sheet) : sheet
    );
    commitSheets(nextSheets, activeSheet.id);
  };

  const getPoint = (event: ReactPointerEvent<SVGSVGElement>): StrokePoint => {
    const rect = stageRef.current?.getBoundingClientRect();
    const x = rect ? (event.clientX - rect.left) / zoom : event.clientX;
    const y = rect ? (event.clientY - rect.top) / zoom : event.clientY;
    return [x, y, event.pressure || 0.5];
  };

  const beginPan = (event: ReactPointerEvent<SVGSVGElement>) => {
    panOriginRef.current = {
      x: pan.x,
      y: pan.y,
      startX: event.clientX,
      startY: event.clientY
    };
  };

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!activeSheet) return;
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);

    const shouldPanWithTouch =
      inputPolicy === "stylus" && event.pointerType === "touch" && interactionMode === "draw";
    if (interactionMode === "pan" || shouldPanWithTouch) {
      beginPan(event);
      return;
    }

    const point = getPoint(event);
    pushHistory(strokes);
    setRedoStack([]);

    if (tool === "eraser") {
      const erased = eraseStrokesNearPoint(strokes, point, width);
      updateActiveSheet((sheet) => ({ ...sheet, strokes: erased }));
      return;
    }

    currentStroke.current = straightLine ? [point, point] : [point];
    setLivePoints(straightLine ? [point, point] : [point]);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (!activeSheet) return;

    if (panOriginRef.current) {
      const dx = event.clientX - panOriginRef.current.startX;
      const dy = event.clientY - panOriginRef.current.startY;
      setPan(
        clampPanForZoom({
          x: panOriginRef.current.x + dx,
          y: panOriginRef.current.y + dy
        })
      );
      return;
    }

    if (tool === "eraser" && event.buttons === 1) {
      const point = getPoint(event);
      const erased = eraseStrokesNearPoint(strokes, point, width);
      updateActiveSheet((sheet) => ({ ...sheet, strokes: erased }));
      return;
    }

    if (event.buttons !== 1 || currentStroke.current.length === 0) return;
    const point = getPoint(event);
    const nextPoints = straightLine ? [currentStroke.current[0], point] : [...currentStroke.current, point];
    currentStroke.current = nextPoints;
    setLivePoints(nextPoints);
  };

  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (panOriginRef.current) {
      panOriginRef.current = null;
      return;
    }

    if (!activeSheet || currentStroke.current.length === 0) return;
    if (straightLine && tool !== "eraser") {
      currentStroke.current = [currentStroke.current[0], getPoint(event)];
    }

    const meta = toolMeta[tool];
    const nextStroke: DrawingStroke = {
      id: createId("stroke"),
      tool: meta.drawTool === "eraser" ? "pen" : meta.drawTool,
      color,
      width,
      opacity: meta.opacity,
      points: currentStroke.current
    };
    const nextStrokes = [...strokes, nextStroke];
    updateActiveSheet((sheet) => ({ ...sheet, strokes: nextStrokes }));
    currentStroke.current = [];
    setLivePoints([]);
  };

  const undo = () => {
    if (!activeSheet) return;
    const previous = historyRef.current.at(-1);
    if (!previous) return;

    setRedoStack((stack) => [...stack, strokes]);
    historyRef.current = historyRef.current.slice(0, -1);
    setUndoCount(historyRef.current.length);
    updateActiveSheet((sheet) => ({ ...sheet, strokes: previous }));
  };

  const redo = () => {
    if (!activeSheet) return;
    const next = redoStack.at(-1);
    if (!next) return;

    pushHistory(strokes);
    setRedoStack((stack) => stack.slice(0, -1));
    updateActiveSheet((sheet) => ({ ...sheet, strokes: next }));
  };

  const selectTool = (nextTool: ToolMode) => {
    setTool(nextTool);
    setWidth(toolMeta[nextTool].defaultWidth);
    setActivePreset("");
    if (nextTool === "eraser") setStraightLine(false);
  };

  const selectPreset = (presetId: string) => {
    const preset = penPresets.find((item) => item.id === presetId);
    if (!preset) return;
    setTool(preset.tool);
    setColor(preset.color);
    setWidth(toolMeta[preset.tool].defaultWidth);
    setActivePreset(preset.id);
  };

  const addSheet = () => {
    const nextSheet = createDrawingSheet(sheets.length, background, `Sheet ${sheets.length + 1}`);
    resetSheetSession();
    commitSheets([...sheets, nextSheet], nextSheet.id);
  };

  const removeSheet = () => {
    if (!activeSheet || sheets.length <= 1) return;
    const currentIndex = sheets.findIndex((sheet) => sheet.id === activeSheet.id);
    const nextSheets = sheets.filter((sheet) => sheet.id !== activeSheet.id);
    const fallbackSheet = nextSheets[Math.max(0, currentIndex - 1)] ?? nextSheets[0];
    if (!fallbackSheet) return;
    resetSheetSession();
    commitSheets(nextSheets, fallbackSheet.id);
  };

  const liveStroke =
    livePoints.length > 0 && tool !== "eraser"
      ? ({
          id: "live-stroke",
          tool:
            toolMeta[tool].drawTool === "highlighter"
              ? "highlighter"
              : toolMeta[tool].drawTool === "pencil"
                ? "pencil"
                : "pen",
          color,
          width,
          opacity: toolMeta[tool].opacity,
          points: livePoints
        } satisfies DrawingStroke)
      : null;

  return (
    <div className={styles.handwritingShell}>
      <div className={styles.handwritingToolbar}>
        <div className={styles.sheetRow}>
          <div className={styles.sheetTabs}>
            {sheets.map((sheet, index) => (
              <button
                key={sheet.id}
                type="button"
                className={sheet.id === activeSheetId ? styles.sheetTabActive : styles.sheetTab}
                onClick={() => {
                  if (sheet.id === activeSheetId) return;
                  resetSheetSession();
                  commitSheets(sheets, sheet.id);
                }}
              >
                <span>{sheet.title || `Sheet ${index + 1}`}</span>
                <small>
                  {sheet.background === "plain"
                    ? "Plain"
                    : sheet.background === "ruled"
                      ? "Ruled"
                      : "Dot"}
                </small>
              </button>
            ))}
          </div>

          <div className={styles.sheetActions}>
            <button type="button" className={styles.iconAction} onClick={addSheet} aria-label="Add sheet">
              <Plus size={15} />
            </button>
            <button
              type="button"
              className={styles.iconAction}
              onClick={removeSheet}
              disabled={sheets.length <= 1}
              aria-label="Remove active sheet"
            >
              <X size={15} />
            </button>
          </div>
        </div>

        <div className={styles.presetRow}>
          {penPresets.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={activePreset === preset.id ? styles.presetActive : styles.presetChip}
              onClick={() => selectPreset(preset.id)}
            >
              <span
                className={styles.presetDot}
                style={{ background: preset.color }}
                aria-hidden="true"
              />
              {preset.label}
            </button>
          ))}
        </div>

        <div className={styles.toolRow}>
          {(Object.keys(toolMeta) as ToolMode[]).map((toolKey) => {
            const meta = toolMeta[toolKey];
            const Icon = meta.icon;
            return (
              <button
                key={toolKey}
                type="button"
                className={tool === toolKey ? styles.toolActive : styles.toolChip}
                onClick={() => selectTool(toolKey)}
              >
                <Icon size={16} />
                {meta.label}
              </button>
            );
          })}
        </div>

        <div className={styles.inlineButtons}>
          {palette.map((swatch) => (
            <button
              key={swatch}
              type="button"
              className={styles.colorSwatch}
              style={{ background: swatch }}
              data-active={color === swatch}
              onClick={() => {
                setColor(swatch);
                setActivePreset("");
              }}
              aria-label={`Color ${swatch}`}
            />
          ))}
        </div>

        <div className={styles.inlineButtons}>
          {toolMeta[tool].widths.map((value) => (
            <button
              key={value}
              type="button"
              className={width === value ? styles.widthActive : styles.widthChip}
              onClick={() => {
                setWidth(value);
                setActivePreset("");
              }}
            >
              <span style={{ width: Math.max(4, value * 1.6), height: Math.max(4, value * 1.6) }} />
            </button>
          ))}
          <button
            type="button"
            className={styles.iconAction}
            onClick={undo}
            disabled={undoCount === 0}
          >
            <RotateCcw size={15} />
          </button>
          <button
            type="button"
            className={styles.iconAction}
            onClick={redo}
            disabled={redoStack.length === 0}
          >
            <RotateCw size={15} />
          </button>
        </div>

        <div className={styles.canvasControlRow}>
          <div className={styles.inlineButtons}>
            <button
              type="button"
              className={inputPolicy === "stylus" ? styles.policyActive : styles.policyChip}
              onClick={() => setInputPolicy("stylus")}
            >
              Pen first
            </button>
            <button
              type="button"
              className={inputPolicy === "all" ? styles.policyActive : styles.policyChip}
              onClick={() => setInputPolicy("all")}
            >
              Finger draw
            </button>
          </div>

          <div className={styles.inlineButtons}>
            <button
              type="button"
              className={interactionMode === "draw" ? styles.policyActive : styles.policyChip}
              onClick={() => setInteractionMode("draw")}
            >
              <PenLine size={15} />
              Draw
            </button>
            <button
              type="button"
              className={interactionMode === "pan" ? styles.policyActive : styles.policyChip}
              onClick={() => setInteractionMode("pan")}
            >
              <Move size={15} />
              Pan
            </button>
            <button
              type="button"
              className={straightLine ? styles.policyActive : styles.policyChip}
              onClick={() => setStraightLine((current) => !current)}
              disabled={tool === "eraser"}
            >
              <Minus size={15} />
              Line
            </button>
          </div>

          <div className={styles.inlineButtons}>
            <button type="button" className={styles.iconAction} onClick={() => applyZoom(zoom - 0.2)}>
              <ZoomOut size={15} />
            </button>
            <span className={styles.zoomBadge}>{Math.round(zoom * 100)}%</span>
            <button type="button" className={styles.iconAction} onClick={() => applyZoom(zoom + 0.2)}>
              <ZoomIn size={15} />
            </button>
            <button
              type="button"
              className={styles.policyChip}
              onClick={() => {
                setPan({ x: 0, y: 0 });
                setZoom(1);
              }}
            >
              Reset
            </button>
          </div>
        </div>

        <div className={styles.inlineButtons}>
          {backgrounds.map((option) => (
            <button
              key={option.id}
              type="button"
              className={background === option.id ? styles.primaryButton : styles.secondaryButton}
              onClick={() => updateActiveSheet((sheet) => ({ ...sheet, background: option.id }))}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.canvasWrap} data-background={background}>
        <div className={styles.canvasViewport} ref={viewportRef}>
          <svg
            ref={stageRef}
            className={styles.canvas}
            style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={(event) => {
              if (!event.currentTarget.hasPointerCapture(event.pointerId)) handlePointerUp(event);
            }}
          >
            {strokes.map((stroke) => (
              <path
                key={stroke.id}
                d={strokeToSvgPath(stroke)}
                fill={stroke.color}
                opacity={stroke.opacity}
              />
            ))}
            {liveStroke ? (
              <path d={strokeToSvgPath(liveStroke)} fill={liveStroke.color} opacity={liveStroke.opacity} />
            ) : null}
          </svg>
        </div>
        <div className={styles.canvasHint}>
          {inputPolicy === "stylus"
            ? straightLine
              ? "Line mode is on. Touch still pans first, and the pen draws straight strokes."
              : "Touch pans the page first, while the pen keeps drawing."
            : straightLine
              ? "Line mode is on for pen, pencil, and highlighter."
              : "Both touch and pen can draw on the page."}
        </div>
      </div>
    </div>
  );
}
