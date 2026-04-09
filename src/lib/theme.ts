import type {
  BoardTone,
  MoodKey,
  PresetRotation,
  TexturePreset,
  ThemePreset
} from "@/types/diary";

export const moodOptions: { id: MoodKey; label: string; accent: string }[] = [
  { id: "glowy", label: "반짝", accent: "#fde5ef" },
  { id: "calm", label: "차분", accent: "#dff0c5" },
  { id: "proud", label: "뿌듯", accent: "#f7d6e4" },
  { id: "busy", label: "분주", accent: "#ffe0cf" },
  { id: "dreamy", label: "몽글", accent: "#efe1fb" },
  { id: "gentle", label: "가벼움", accent: "#edf5df" }
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
    label: "하트 커버",
    texture: "paper",
    boardTone: "cream",
    description: "연한 핑크 종이 질감과 부드러운 하트빛 톤"
  },
  {
    id: "mint",
    label: "스타 민트",
    texture: "dot",
    boardTone: "mint",
    description: "별 스티커가 어울리는 민트 포인트 도트 페이지"
  },
  {
    id: "berry",
    label: "리본 노트",
    texture: "ruled",
    boardTone: "blush",
    description: "리본 메모지 같은 라인지 느낌의 핑크 페이지"
  }
];

export const stickerPresets: {
  id: string;
  label: string;
  motif: string;
  tint: string;
  rotation: PresetRotation;
}[] = [
  { id: "starry", label: "별", motif: "star", tint: "#ffe7f1", rotation: -5 },
  { id: "mushroom", label: "캔디", motif: "mushroom", tint: "#ffe7de", rotation: 5 },
  { id: "strawberry", label: "하트", motif: "strawberry", tint: "#ffd6e6", rotation: -5 },
  { id: "flower", label: "꽃", motif: "flower", tint: "#eaf5d8", rotation: 0 },
  { id: "ribbon", label: "리본", motif: "ribbon", tint: "#ffeef5", rotation: 5 }
];
