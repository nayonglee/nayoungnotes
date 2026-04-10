import type {
  BoardTone,
  MoodKey,
  PresetRotation,
  TexturePreset,
  ThemePreset
} from "@/types/diary";

export const moodOptions: { id: MoodKey; label: string; accent: string }[] = [
  { id: "glowy", label: "Glow", accent: "#fde5ef" },
  { id: "calm", label: "Calm", accent: "#dff0c5" },
  { id: "proud", label: "Proud", accent: "#f7d6e4" },
  { id: "busy", label: "Busy", accent: "#ffe0cf" },
  { id: "dreamy", label: "Dreamy", accent: "#efe1fb" },
  { id: "gentle", label: "Soft", accent: "#edf5df" }
];

export const themePresets: {
  id: ThemePreset;
  label: string;
  texture: TexturePreset;
  boardTone: BoardTone;
  description: string;
  swatch: string;
  detail: string;
}[] = [
  {
    id: "petal",
    label: "Petal",
    texture: "paper",
    boardTone: "cream",
    description: "Cream paper with soft pink trim.",
    swatch: "linear-gradient(135deg, #f8d5e4, #fff8fb)",
    detail: "#f0b6ce"
  },
  {
    id: "mint",
    label: "Mint",
    texture: "dot",
    boardTone: "mint",
    description: "Mint dot page for clean scrapbook notes.",
    swatch: "linear-gradient(135deg, #e4f2d4, #fbfff8)",
    detail: "#b4cf8a"
  },
  {
    id: "berry",
    label: "Berry",
    texture: "ruled",
    boardTone: "blush",
    description: "Blush ruled page with ribbon-note energy.",
    swatch: "linear-gradient(135deg, #ffd9e5, #fff6f8)",
    detail: "#df91b0"
  },
  {
    id: "butter",
    label: "Butter",
    texture: "paper",
    boardTone: "cream",
    description: "Warm butter page with mellow sticker highlights.",
    swatch: "linear-gradient(135deg, #fff1bd, #fffdf4)",
    detail: "#f2c75d"
  },
  {
    id: "lilac",
    label: "Lilac",
    texture: "dot",
    boardTone: "blush",
    description: "Powder lilac dots for light scrapbook layering.",
    swatch: "linear-gradient(135deg, #eadffb, #fffafe)",
    detail: "#b799e8"
  },
  {
    id: "sky",
    label: "Sky",
    texture: "ruled",
    boardTone: "cream",
    description: "Pale sky page with a neat planner look.",
    swatch: "linear-gradient(135deg, #dfeeff, #fbfdff)",
    detail: "#91b8ef"
  }
];

export const stickerPresets: {
  id: string;
  label: string;
  motif: string;
  tint: string;
  rotation: PresetRotation;
}[] = [
  { id: "heart-puff", label: "Heart", motif: "heart", tint: "#ffd6e6", rotation: -5 },
  { id: "star-sugar", label: "Star", motif: "star", tint: "#fff1c9", rotation: -5 },
  { id: "petal-bloom", label: "Flower", motif: "flower", tint: "#eaf5d8", rotation: 0 },
  { id: "ribbon-note", label: "Ribbon", motif: "ribbon", tint: "#ffeef5", rotation: 5 },
  { id: "swirl-seal", label: "Swirl", motif: "swirl", tint: "#ffe7de", rotation: 5 },
  { id: "spark-twinkle", label: "Spark", motif: "spark", tint: "#fff0d8", rotation: 0 },
  { id: "clover-mint", label: "Clover", motif: "clover", tint: "#e4f2d4", rotation: 0 },
  { id: "cherry-pop", label: "Cherry", motif: "cherry", tint: "#ffe3dc", rotation: -5 },
  { id: "label-tag", label: "Label", motif: "label", tint: "#fff4d9", rotation: 5 }
];

export function stickerMotif(stickerId: string) {
  return stickerPresets.find((item) => item.id === stickerId)?.motif ?? "star";
}
