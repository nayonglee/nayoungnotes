import type { CSSProperties } from "react";

export type ScrapIconKind =
  | "star"
  | "heart"
  | "flower"
  | "ribbon"
  | "swirl"
  | "spark"
  | "clover"
  | "cherry"
  | "label";

const viewBox = "0 0 24 24";

export function ScrapIcon({
  kind,
  size = 18,
  className,
  style
}: {
  kind: ScrapIconKind;
  size?: number;
  className?: string;
  style?: CSSProperties;
}) {
  if (kind === "heart") {
    return (
      <svg viewBox={viewBox} width={size} height={size} className={className} style={style} aria-hidden="true">
        <path
          d="M12 20.2 4.8 12.9a4.8 4.8 0 0 1 6.8-6.8L12 6.5l.4-.4a4.8 4.8 0 1 1 6.8 6.8z"
          fill="#f4a6bf"
          stroke="#8d767f"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
        <path d="M8.8 8.4c.4-.8 1-1.3 2-1.6" fill="none" stroke="#fff7fa" strokeWidth="1.1" strokeLinecap="round" />
      </svg>
    );
  }

  if (kind === "flower") {
    return (
      <svg viewBox={viewBox} width={size} height={size} className={className} style={style} aria-hidden="true">
        <g stroke="#8d767f" strokeWidth="1.1">
          <circle cx="12" cy="6.5" r="3.1" fill="#ffddea" />
          <circle cx="17" cy="10" r="3.1" fill="#fff3bf" />
          <circle cx="15.8" cy="16" r="3.1" fill="#dff0c5" />
          <circle cx="8.2" cy="16" r="3.1" fill="#fbe3ef" />
          <circle cx="7" cy="10" r="3.1" fill="#fde7be" />
          <circle cx="12" cy="11.7" r="3.1" fill="#fffaf2" />
        </g>
      </svg>
    );
  }

  if (kind === "ribbon") {
    return (
      <svg viewBox={viewBox} width={size} height={size} className={className} style={style} aria-hidden="true">
        <g fill="#f7d6e4" stroke="#8d767f" strokeWidth="1.1" strokeLinejoin="round">
          <path d="M8.2 8.4c1.5 0 2.7 1.2 3.8 2.9-1.9.7-3.4 2-4.8 3.8-1.4-1.4-1.8-2.8-1.8-4.2 0-1.4 1.2-2.5 2.8-2.5Z" />
          <path d="M15.8 8.4c-1.5 0-2.7 1.2-3.8 2.9 1.9.7 3.4 2 4.8 3.8 1.4-1.4 1.8-2.8 1.8-4.2 0-1.4-1.2-2.5-2.8-2.5Z" />
          <path d="m10.8 14.6-1.5 5 2.8-1.9 2.8 1.9-1.7-5" fill="#fff2f7" />
        </g>
      </svg>
    );
  }

  if (kind === "swirl") {
    return (
      <svg viewBox={viewBox} width={size} height={size} className={className} style={style} aria-hidden="true">
        <circle cx="12" cy="12" r="8.8" fill="#fff7fb" stroke="#8d767f" strokeWidth="1.1" />
        <path
          d="M9.2 11.2c0-2.2 1.8-3.8 4.2-3.8 2.1 0 3.8 1.4 3.8 3.4 0 2.7-2.6 4.1-5.4 4.1-2.5 0-4.4-1.4-4.4-3.3 0-1.6 1.3-2.8 2.9-2.8 1.5 0 2.7 1 2.7 2.3 0 1-.7 1.8-1.7 1.8"
          fill="none"
          stroke="#f2acc7"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (kind === "spark") {
    return (
      <svg viewBox={viewBox} width={size} height={size} className={className} style={style} aria-hidden="true">
        <path
          d="m12 3 1.8 6 6.2 1.8-6.2 1.7L12 19l-1.8-6.5L4 10.8 10.2 9z"
          fill="#fff3bf"
          stroke="#8d767f"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    );
  }

  if (kind === "clover") {
    return (
      <svg viewBox={viewBox} width={size} height={size} className={className} style={style} aria-hidden="true">
        <g fill="#dff0c5" stroke="#8d767f" strokeWidth="1.1">
          <circle cx="9" cy="9" r="3.5" />
          <circle cx="15" cy="9" r="3.5" />
          <circle cx="9" cy="15" r="3.5" />
          <circle cx="15" cy="15" r="3.5" />
          <path d="M11.8 15.6c1 1.7 1.1 3 .7 4.7" fill="none" stroke="#8d767f" strokeLinecap="round" />
        </g>
      </svg>
    );
  }

  if (kind === "cherry") {
    return (
      <svg viewBox={viewBox} width={size} height={size} className={className} style={style} aria-hidden="true">
        <g stroke="#8d767f" strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12 6.4c1.9 0 3.4 1.1 4.2 3.1" fill="none" />
          <path d="M12 6.4c-1.9 0-3.4 1.1-4.2 3.1" fill="none" />
          <path d="M12 6.3c-.3-1.1.1-2.2 1.1-3" fill="none" />
          <circle cx="8.6" cy="15.2" r="3.4" fill="#f4a6bf" />
          <circle cx="15.4" cy="15.2" r="3.4" fill="#ffb6a2" />
          <path d="M10.1 12.5c.8-1.5 1.3-2.8 1.9-4.6" fill="none" />
          <path d="M13.9 12.5c-.8-1.5-1.3-2.8-1.9-4.6" fill="none" />
        </g>
      </svg>
    );
  }

  if (kind === "label") {
    return (
      <svg viewBox={viewBox} width={size} height={size} className={className} style={style} aria-hidden="true">
        <g stroke="#8d767f" strokeWidth="1.1" strokeLinejoin="round">
          <path d="M4.4 7.2h15.2v9.6H4.4l1.8-4.8Z" fill="#fff6dc" />
          <circle cx="8.2" cy="12" r="1.2" fill="#ffd5e5" />
          <path d="M11 10.2h5.1M11 13.6h3.8" fill="none" strokeLinecap="round" />
        </g>
      </svg>
    );
  }

  return (
    <svg viewBox={viewBox} width={size} height={size} className={className} style={style} aria-hidden="true">
      <path
        d="m12 2.8 2.7 5.6 6.2.8-4.5 4.3 1.1 6-5.5-2.9-5.5 2.9 1.1-6-4.5-4.3 6.2-.8Z"
        fill="#fff0b6"
        stroke="#8d767f"
        strokeWidth="1.1"
        strokeLinejoin="round"
      />
      <circle cx="12" cy="11.6" r="1.2" fill="#fff9e7" />
    </svg>
  );
}
