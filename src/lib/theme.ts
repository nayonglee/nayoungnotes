import type {
  BoardTone,
  MoodKey,
  PresetRotation,
  TexturePreset,
  ThemePreset
} from "@/types/diary";

export const moodOptions: { id: MoodKey; label: string; accent: string }[] = [
  { id: "glowy", label: "Glowy", accent: "#f6ddea" },
  { id: "calm", label: "Calm", accent: "#d8e7b9" },
  { id: "proud", label: "Proud", accent: "#f3cfdc" },
  { id: "busy", label: "Busy", accent: "#f4ddc9" },
  { id: "dreamy", label: "Dreamy", accent: "#efe2f5" },
  { id: "gentle", label: "Gentle", accent: "#e9efd8" }
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
    label: "Petal Cover",
    texture: "paper",
    boardTone: "cream",
    description: "Warm blush paper with soft bloom and glossy sticker-like highlights."
  },
  {
    id: "mint",
    label: "Mint Letter",
    texture: "dot",
    boardTone: "mint",
    description: "Soft green stationery wash with a tidy dot-grid feeling."
  },
  {
    id: "berry",
    label: "Berry Pocket",
    texture: "ruled",
    boardTone: "blush",
    description: "Sweet pink pages with a cozy lined inner-paper vibe."
  }
];

export const stickerPresets: {
  id: string;
  label: string;
  motif: string;
  tint: string;
  rotation: PresetRotation;
}[] = [
  { id: "starry", label: "tiny star", motif: "star", tint: "#f6ddea", rotation: -5 },
  { id: "mushroom", label: "little shroom", motif: "mushroom", tint: "#f7dfd7", rotation: 5 },
  { id: "strawberry", label: "berry sweet", motif: "strawberry", tint: "#f3cfdc", rotation: -5 },
  { id: "flower", label: "soft bloom", motif: "flower", tint: "#e5f0d6", rotation: 0 },
  { id: "ribbon", label: "ribbon note", motif: "ribbon", tint: "#f8e3ea", rotation: 5 }
];
