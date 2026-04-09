"use client";

import type { PointerEvent as ReactPointerEvent } from "react";
import { useRef, useState } from "react";
import { Eraser, Highlighter, PenLine, RotateCcw, RotateCw } from "lucide-react";
import { eraseStrokesNearPoint, strokeToSvgPath } from "@/lib/drawing";
import { createId } from "@/lib/utils";
import type { DrawingBackground, DrawingItem, DrawingStroke, StrokePoint } from "@/types/diary";
import styles from "@/styles/entry.module.css";

type ToolMode = "pen" | "highlighter" | "eraser";

const palette = ["#7d6d73", "#f3cfdc", "#d8e7b9", "#caa8d8", "#ffb596"];

export function HandwritingPad({
  drawing,
  onChange
}: {
  drawing: DrawingItem;
  onChange: (drawing: DrawingItem) => void;
}) {
  const [tool, setTool] = useState<ToolMode>("pen");
  const [color, setColor] = useState("#7d6d73");
  const [width, setWidth] = useState(2);
  const [strokes, setStrokes] = useState(drawing.payload.strokes);
  const [background, setBackground] = useState<DrawingBackground>(drawing.payload.background);
  const [redoStack, setRedoStack] = useState<DrawingStroke[][]>([]);
  const currentStroke = useRef<StrokePoint[]>([]);
  const historyRef = useRef<DrawingStroke[][]>([]);
  const drawingRef = useRef<SVGSVGElement>(null);

  const pushHistory = (snapshot: DrawingStroke[]) => {
    historyRef.current = [...historyRef.current, snapshot];
    if (historyRef.current.length > 30) historyRef.current = historyRef.current.slice(-30);
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
    const point = getPoint(event);
    pushHistory(strokes);
    setRedoStack([]);

    if (tool === "eraser") {
      const erased = eraseStrokesNearPoint(strokes, point, 18);
      setStrokes(erased);
      emitChange(erased);
      return;
    }

    currentStroke.current = [point];
  };

  const handlePointerMove = (event: ReactPointerEvent<SVGSVGElement>) => {
    if (tool === "eraser" && event.buttons === 1) {
      const point = getPoint(event);
      const erased = eraseStrokesNearPoint(strokes, point, 18);
      setStrokes(erased);
      emitChange(erased);
      return;
    }

    if (event.buttons !== 1 || currentStroke.current.length === 0) return;
    currentStroke.current = [...currentStroke.current, getPoint(event)];
  };

  const handlePointerUp = () => {
    if (currentStroke.current.length === 0) return;

    const nextStroke: DrawingStroke = {
      id: createId("stroke"),
      tool: tool === "highlighter" ? "highlighter" : "pen",
      color,
      width,
      opacity: tool === "highlighter" ? 0.28 : 0.95,
      points: currentStroke.current
    };
    const nextStrokes = [...strokes, nextStroke];
    setStrokes(nextStrokes);
    emitChange(nextStrokes);
    currentStroke.current = [];
  };

  const undo = () => {
    const previous = historyRef.current.at(-1);
    if (!previous) return;

    setRedoStack((stack) => [...stack, strokes]);
    historyRef.current = historyRef.current.slice(0, -1);
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

  return (
    <div className={styles.handwritingShell}>
      <div className={styles.handwritingToolbar}>
        <div className={styles.inlineButtons}>
          <button
            type="button"
            className={tool === "pen" ? styles.primaryButton : styles.secondaryButton}
            onClick={() => setTool("pen")}
          >
            <PenLine size={16} />
            Pen
          </button>
          <button
            type="button"
            className={tool === "highlighter" ? styles.primaryButton : styles.secondaryButton}
            onClick={() => setTool("highlighter")}
          >
            <Highlighter size={16} />
            Highlighter
          </button>
          <button
            type="button"
            className={tool === "eraser" ? styles.primaryButton : styles.secondaryButton}
            onClick={() => setTool("eraser")}
          >
            <Eraser size={16} />
            Erase
          </button>
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
            />
          ))}
        </div>

        <div className={styles.inlineButtons}>
          {[2, 4, 6].map((value) => (
            <button
              key={value}
              type="button"
              className={width === value ? styles.primaryButton : styles.secondaryButton}
              onClick={() => setWidth(value)}
            >
              {value}px
            </button>
          ))}
          <button type="button" className={styles.iconAction} onClick={undo}>
            <RotateCcw size={15} />
          </button>
          <button type="button" className={styles.iconAction} onClick={redo}>
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
              {option}
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
          onPointerLeave={handlePointerUp}
        >
          {strokes.map((stroke) => (
            <path key={stroke.id} d={strokeToSvgPath(stroke)} fill={stroke.color} opacity={stroke.opacity} />
          ))}
        </svg>
      </div>
    </div>
  );
}
