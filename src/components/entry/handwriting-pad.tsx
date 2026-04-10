"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useRef, useState } from "react";
import {
  Eraser,
  Highlighter,
  Move,
  PenLine,
  PencilLine,
  RotateCcw,
  RotateCw,
  ZoomIn,
  ZoomOut
} from "lucide-react";
import { eraseStrokesNearPoint, strokeToSvgPath } from "@/lib/drawing";
import { clamp, createId } from "@/lib/utils";
import type { DrawingBackground, DrawingItem, DrawingStroke, StrokePoint } from "@/types/diary";
import styles from "@/styles/entry.module.css";

type ToolMode = "fine" | "gel" | "marker" | "eraser";
type InputPolicy = "stylus" | "all";
type InteractionMode = "draw" | "pan";

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

const penPresets: Array<{
  id: string;
  label: string;
  tool: Exclude<ToolMode, "eraser">;
  color: string;
}> = [
  { id: "ink", label: "잉크", tool: "fine", color: "#43383d" },
  { id: "pink-gel", label: "핑크 젤", tool: "gel", color: "#e49cbc" },
  { id: "mint-marker", label: "민트 마커", tool: "marker", color: "#b9cf84" },
  { id: "blue-pen", label: "블루 펜", tool: "gel", color: "#8eb7e8" }
];

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
  const [activePreset, setActivePreset] = useState("ink");
  const [inputPolicy, setInputPolicy] = useState<InputPolicy>("stylus");
  const [interactionMode, setInteractionMode] = useState<InteractionMode>("draw");
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [strokes, setStrokes] = useState(drawing.payload.strokes);
  const [background, setBackground] = useState<DrawingBackground>(drawing.payload.background);
  const [redoStack, setRedoStack] = useState<DrawingStroke[][]>([]);
  const [livePoints, setLivePoints] = useState<StrokePoint[]>([]);
  const [undoCount, setUndoCount] = useState(0);
  const currentStroke = useRef<StrokePoint[]>([]);
  const historyRef = useRef<DrawingStroke[][]>([]);
  const panOriginRef = useRef<{ x: number; y: number; startX: number; startY: number } | null>(null);
  const stageRef = useRef<SVGSVGElement>(null);
  const viewportRef = useRef<HTMLDivElement>(null);

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
      setStrokes(erased);
      emitChange(erased);
      return;
    }

    currentStroke.current = [point];
    setLivePoints([point]);
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
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

    if (panOriginRef.current) {
      panOriginRef.current = null;
      return;
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
    setActivePreset("");
  };

  const selectPreset = (presetId: string) => {
    const preset = penPresets.find((item) => item.id === presetId);
    if (!preset) return;
    setTool(preset.tool);
    setColor(preset.color);
    setWidth(toolMeta[preset.tool].defaultWidth);
    setActivePreset(preset.id);
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
              onClick={() => {
                setWidth(value);
                setActivePreset("");
              }}
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

        <div className={styles.canvasControlRow}>
          <div className={styles.inlineButtons}>
            <button
              type="button"
              className={inputPolicy === "stylus" ? styles.policyActive : styles.policyChip}
              onClick={() => setInputPolicy("stylus")}
            >
              펜 우선
            </button>
            <button
              type="button"
              className={inputPolicy === "all" ? styles.policyActive : styles.policyChip}
              onClick={() => setInputPolicy("all")}
            >
              손가락 허용
            </button>
          </div>

          <div className={styles.inlineButtons}>
            <button
              type="button"
              className={interactionMode === "draw" ? styles.policyActive : styles.policyChip}
              onClick={() => setInteractionMode("draw")}
            >
              <PenLine size={15} />
              그리기
            </button>
            <button
              type="button"
              className={interactionMode === "pan" ? styles.policyActive : styles.policyChip}
              onClick={() => setInteractionMode("pan")}
            >
              <Move size={15} />
              이동
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
              초기화
            </button>
          </div>
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
            ? "손가락은 이동, 펜은 그리기용으로 우선 처리됩니다."
            : "손가락과 펜 모두 그리기에 사용할 수 있습니다."}
        </div>
      </div>
    </div>
  );
}
