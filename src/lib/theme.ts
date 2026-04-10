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
}[] = [
  {
    id: "petal",
    label: "Heart Cover",
    texture: "paper",
    boardTone: "cream",
    description: "A creamy pink paper page with glossy heart details."
  },
  {
    id: "mint",
    label: "Star Mint",
    texture: "dot",
    boardTone: "mint",
    description: "A mint dot page made for soft star stickers and notes."
  },
  {
    id: "berry",
    label: "Ribbon Note",
    texture: "ruled",
    boardTone: "blush",
    description: "A blush ruled page with a neat ribbon-note feeling."
  }
];

export const stickerPresets: {
  id: string;
  label: string;
  motif: string;
  tint: string;
  rotation: PresetRotation;
}[] = [
  { id: "starry", label: "Star", motif: "star", tint: "#ffe7f1", rotation: -5 },
  { id: "mushroom", label: "Swirl", motif: "swirl", tint: "#ffe7de", rotation: 5 },
  { id: "strawberry", label: "Heart", motif: "heart", tint: "#ffd6e6", rotation: -5 },
  { id: "flower", label: "Flower", motif: "flower", tint: "#eaf5d8", rotation: 0 },
  { id: "ribbon", label: "Ribbon", motif: "ribbon", tint: "#ffeef5", rotation: 5 }
];

export function stickerMotif(stickerId: string) {
  return stickerPresets.find((item) => item.id === stickerId)?.motif ?? "star";
}
