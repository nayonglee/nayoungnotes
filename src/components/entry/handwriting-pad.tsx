"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useRef, useState } from "react";
import { Eraser, Highlighter, PenLine, PencilLine, RotateCcw, RotateCw } from "lucide-react";
import { eraseStrokesNearPoint, strokeToSvgPath } from "@/lib/drawing";
import { createId } from "@/lib/utils";
import type { DrawingBackground, DrawingItem, DrawingStroke, StrokePoint } from "@/types/diary";
import styles from "@/styles/entry.module.css";

type ToolMode = "fine" | "gel" | "marker" | "eraser";

const palette = ["#43383d", "#e49cbc", "#f4b285", "#b9cf84", "#8eb7e8", "#c5a4eb"];

const toolMeta: Record<
  ToolMode,
  {
    label: string;
    icon: typeof PenLine;
    drawTool: "pen" | "highlighter" | "eraser";
    defaultWidth: number;
    opacity: number;
    widths: number[];
  }
> = {
  fine: {
    label: "파인펜",
    icon: PencilLine,
    drawTool: "pen",
    defaultWidth: 1.6,
    opacity: 0.92,
    widths: [1.2, 1.6, 2.2]
  },
  gel: {
    label: "젤펜",
    icon: PenLine,
    drawTool: "pen",
    defaultWidth: 2.8,
    opacity: 0.98,
    widths: [2.2, 2.8, 3.8]
  },
  marker: {
    label: "형광펜",
    icon: Highlighter,
    drawTool: "highlighter",
    defaultWidth: 6,
    opacity: 0.28,
    widths: [4.5, 6, 8.5]
  },
  eraser: {
    label: "지우개",
    icon: Eraser,
    drawTool: "eraser",
    defaultWidth: 18,
    opacity: 1,
    widths: [12, 18, 26]
  }
};

export function HandwritingPad({
  drawing,
  onChange
}: {
  drawing: DrawingItem;
  onChange: (drawing: DrawingItem) => void;
}) {
  const [tool, setTool] = useState<ToolMode>("gel");
  const [color, setColor] = useState("#43383d");
  const [width, setWidth] = useState(toolMeta.gel.defaultWidth);
  const [strokes, setStrokes] = useState(drawing.payload.strokes);
  const [background, setBackground] = useState<DrawingBackground>(drawing.payload.background);
  const [redoStack, setRedoStack] = useState<DrawingStroke[][]>([]);
  const [livePoints, setLivePoints] = useState<StrokePoint[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const currentStroke = useRef<StrokePoint[]>([]);
  const historyRef = useRef<DrawingStroke[][]>([]);
  const drawingRef = useRef<SVGSVGElement>(null);

  const pushHistory = (snapshot: DrawingStroke[]) => {
    historyRef.current = [...historyRef.current, snapshot];
    if (historyRef.current.length > 30) historyRef.current = historyRef.current.slice(-30);
    setUndoCount(historyRef.current.length);
  };

  const emitChange = (nextStrokes: DrawingStroke[], nextBackground = background) => {
    onChange({
      ...drawing,
      payload: {
        background: nextBackground,
        strokes: nextStrokes
      },
      updatedAt: new Date().toISOString()
    });
  };

  const getPoint = (event: ReactPointerEvent<SVGSVGElement>): StrokePoint => {
    const rect = drawingRef.current?.getBoundingClientRect();
    const x = rect ? event.clientX - rect.left : event.clientX;
    const y = rect ? event.clientY - rect.top : event.clientY;
    return [x, y, event.pressure || 0.5];
  };

  const handlePointerDown = (event: ReactPointerEvent<SVGSVGElement>) => {
    event.preventDefault();
    event.currentTarget.setPointerCapture(event.pointerId);
    const point = getPoint(event);
    pushHistory(strokes);
    setRedoStack([]);

    if (tool === "eraser") {
      const erased = eraseStrokesNearPoint(strokes, point, width);
      setStrokes(erased);
      emitChange(erased);
      return;
    }

    currentStroke.current = [point];
    setLivePoints([point]);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (tool === "eraser" && event.buttons === 1) {
      const point = getPoint(event);
      const erased = eraseStrokesNearPoint(strokes, point, width);
      setStrokes(erased);
      emitChange(erased);
      return;
    }

    if (event.buttons !== 1 || currentStroke.current.length === 0) return;
    const nextPoints = [...currentStroke.current, getPoint(event)];
    currentStroke.current = nextPoints;
    setLivePoints(nextPoints);
  };

  const handlePointerUp = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    if (currentStroke.current.length === 0) return;

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
    setStrokes(nextStrokes);
    emitChange(nextStrokes);
    currentStroke.current = [];
    setLivePoints([]);
  };

  const undo = () => {
    const previous = historyRef.current.at(-1);
    if (!previous) return;

    setRedoStack((stack) => [...stack, strokes]);
    historyRef.current = historyRef.current.slice(0, -1);
    setUndoCount(historyRef.current.length);
    setStrokes(previous);
    emitChange(previous);
  };

  const redo = () => {
    const next = redoStack.at(-1);
    if (!next) return;

    pushHistory(strokes);
    setRedoStack((stack) => stack.slice(0, -1));
    setStrokes(next);
    emitChange(next);
  };

  const selectTool = (nextTool: ToolMode) => {
    setTool(nextTool);
    setWidth(toolMeta[nextTool].defaultWidth);
  };

  const liveStroke =
    livePoints.length > 0 && tool !== "eraser"
      ? ({
          id: "live-stroke",
          tool: toolMeta[tool].drawTool === "highlighter" ? "highlighter" : "pen",
          color,
          width,
          opacity: toolMeta[tool].opacity,
          points: livePoints
        } satisfies DrawingStroke)
      : null;

  return (
    <div className={styles.handwritingShell}>
      <div className={styles.handwritingToolbar}>
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
              onClick={() => setColor(swatch)}
              aria-label={`색상 ${swatch}`}
            />
          ))}
        </div>

        <div className={styles.inlineButtons}>
          {toolMeta[tool].widths.map((value) => (
            <button
              key={value}
              type="button"
              className={width === value ? styles.widthActive : styles.widthChip}
              onClick={() => setWidth(value)}
            >
              <span style={{ width: Math.max(4, value * 1.6), height: Math.max(4, value * 1.6) }} />
            </button>
          ))}
          <button type="button" className={styles.iconAction} onClick={undo} disabled={undoCount === 0}>
            <RotateCcw size={15} />
          </button>
          <button type="button" className={styles.iconAction} onClick={redo} disabled={redoStack.length === 0}>
            <RotateCw size={15} />
          </button>
        </div>

        <div className={styles.inlineButtons}>
          {(["plain", "ruled", "dot"] as const).map((option) => (
            <button
              key={option}
              type="button"
              className={background === option ? styles.primaryButton : styles.secondaryButton}
              onClick={() => {
                setBackground(option);
                emitChange(strokes, option);
              }}
            >
              {option === "plain" ? "무지" : option === "ruled" ? "라인" : "도트"}
            </button>
          ))}
        </div>
      </div>

      <div className={styles.canvasWrap} data-background={background}>
        <svg
          ref={drawingRef}
          className={styles.canvas}
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
    </div>
  );
}
