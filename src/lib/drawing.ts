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
  const outline = getStroke(
    stroke.points.map(([x, y, pressure = 0.5]) => ({ x, y, pressure })),
    {
      size: stroke.width * 2.25,
      thinning: stroke.tool === "highlighter" ? 0.1 : 0.6,
      smoothing: 0.65,
      streamline: 0.4,
      easing: (t) => t,
      simulatePressure: true,
      start: { taper: 0 },
      end: { taper: stroke.tool === "highlighter" ? 0 : stroke.width * 0.5 }
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
