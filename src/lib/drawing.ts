import { getStroke } from "perfect-freehand";
import type { DrawingStroke, StrokePoint } from "@/types/diary";

function getSvgPathFromStroke(points: number[][]) {
  if (points.length === 0) return "";
  const [first, ...rest] = points;
  const path = rest.reduce(
    (acc, point) => `${acc} L ${point[0].toFixed(2)} ${point[1].toFixed(2)}`,
    `M ${first[0].toFixed(2)} ${first[1].toFixed(2)}`
  );
  return `${path} Z`;
}

export function strokeToSvgPath(stroke: DrawingStroke) {
  const isHighlighter = stroke.tool === "highlighter";
  const isPencil = stroke.tool === "pencil";
  const outline = getStroke(
    stroke.points.map(([x, y, pressure = 0.5]) => ({ x, y, pressure })),
    {
      size: isHighlighter ? stroke.width * 1.7 : isPencil ? stroke.width * 1.8 : stroke.width * 2.2,
      thinning: isHighlighter ? 0.08 : isPencil ? 0.24 : 0.52,
      smoothing: isHighlighter ? 0.72 : isPencil ? 0.58 : 0.78,
      streamline: isHighlighter ? 0.5 : isPencil ? 0.2 : 0.42,
      easing: (t) => 1 - (1 - t) * (1 - t),
      simulatePressure: !isHighlighter,
      start: { taper: 0 },
      end: { taper: isHighlighter ? 0 : isPencil ? stroke.width * 0.18 : stroke.width * 0.35 }
    }
  );
  return getSvgPathFromStroke(outline);
}

export function pointDistance(a: StrokePoint, b: StrokePoint) {
  return Math.hypot(a[0] - b[0], a[1] - b[1]);
}

export function eraseStrokesNearPoint(
  strokes: DrawingStroke[],
  point: StrokePoint,
  threshold: number
) {
  return strokes.filter(
    (stroke) => !stroke.points.some((candidate) => pointDistance(candidate, point) < threshold)
  );
}
