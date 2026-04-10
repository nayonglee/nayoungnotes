"use client";

import type { ChangeEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import TextareaAutosize from "react-textarea-autosize";
import {
  Grid2X2,
  ImagePlus,
  Layers3,
  Move,
  RotateCw,
  Sparkles,
  Sticker,
  Trash2,
  X
} from "lucide-react";
import { ScrapIcon, type ScrapIconKind } from "@/components/ui/scrap-icon";
import { createPhotoDraftItem, createStickerDraftItem, cyclePresetRotation } from "@/lib/entry";
import { getLocalAsset, putLocalAsset } from "@/lib/local/database";
import { stickerMotif, stickerPresets } from "@/lib/theme";
import { clamp, createId } from "@/lib/utils";
import type { PhotoItem, StickerItem } from "@/types/diary";
import styles from "@/styles/entry.module.css";

type LayoutPreset = "scatter" | "grid" | "stack" | "strip";

const layoutPresets: Array<{
  id: LayoutPreset;
  label: string;
  icon: typeof Sparkles;
}> = [
  { id: "scatter", label: "Scatter", icon: Sparkles },
  { id: "grid", label: "Grid", icon: Grid2X2 },
  { id: "stack", label: "Stack", icon: Layers3 },
  { id: "strip", label: "Strip", icon: Sticker }
];

async function measureImage(file: File) {
  if ("createImageBitmap" in window) {
    const bitmap = await createImageBitmap(file);
    return { width: bitmap.width, height: bitmap.height };
  }

  return new Promise<{ width: number; height: number }>((resolve) => {
    const image = new Image();
    image.onload = () => resolve({ width: image.width, height: image.height });
    image.src = URL.createObjectURL(file);
  });
}

function useLocalAssetUrl(assetId?: string, remoteUrl?: string) {
  const [assetUrl, setAssetUrl] = useState<string>();

  useEffect(() => {
    if (!assetId || remoteUrl) return;

    let objectUrl: string | undefined;
    void getLocalAsset(assetId).then((asset) => {
      if (!asset) return;
      objectUrl = URL.createObjectURL(asset.blob);
      setAssetUrl(objectUrl);
    });

    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [assetId, remoteUrl]);

  return remoteUrl ?? assetUrl;
}

function stickerKind(stickerId: string): ScrapIconKind {
  return stickerMotif(stickerId) as ScrapIconKind;
}

function PhotoCard({
  photo,
  onMoveStart,
  onRotate,
  onDelete,
  onCaptionChange
}: {
  photo: PhotoItem;
  onMoveStart: (id: string, event: ReactPointerEvent<HTMLButtonElement>) => void;
  onRotate: (id: string) => void;
  onDelete: (id: string) => void;
  onCaptionChange: (id: string, caption: string) => void;
}) {
  const url = useLocalAssetUrl(photo.payload.localAssetId, photo.payload.url);

  return (
    <article
      className={styles.photoCard}
      style={{
        transform: `translate(${photo.styleConfig.x}px, ${photo.styleConfig.y}px) rotate(${photo.styleConfig.presetRotation}deg)`,
        zIndex: photo.styleConfig.zIndex
      }}
    >
      <div className={styles.photoToolbar}>
        <button
          type="button"
          className={styles.iconAction}
          onPointerDown={(event) => onMoveStart(photo.id, event)}
        >
          <Move size={14} />
        </button>
        <button type="button" className={styles.iconAction} onClick={() => onRotate(photo.id)}>
          <RotateCw size={14} />
        </button>
        <button type="button" className={styles.iconAction} onClick={() => onDelete(photo.id)}>
          <Trash2 size={14} />
        </button>
      </div>
      <div className={styles.photoFrame}>
        {url ? (
          <NextImage src={url} alt="" fill unoptimized className={styles.photoImage} />
        ) : (
          <div className={styles.photoPlaceholder} />
        )}
      </div>
      <TextareaAutosize
        minRows={1}
        className={styles.photoCaption}
        value={photo.payload.caption}
        onChange={(event) => onCaptionChange(photo.id, event.target.value)}
        placeholder="Add a caption"
      />
    </article>
  );
}

function StickerCard({
  sticker,
  onMoveStart,
  onRotate,
  onDelete
}: {
  sticker: StickerItem;
  onMoveStart: (id: string, event: ReactPointerEvent<HTMLButtonElement>) => void;
  onRotate: (id: string) => void;
  onDelete: (id: string) => void;
}) {
  return (
    <article
      className={styles.stickerCard}
      style={{
        transform: `translate(${sticker.styleConfig.x}px, ${sticker.styleConfig.y}px) rotate(${sticker.styleConfig.presetRotation}deg)`,
        zIndex: sticker.styleConfig.zIndex,
        background: sticker.payload.tint
      }}
      >
      <div className={styles.stickerToolbar}>
        <button
          type="button"
          className={styles.iconAction}
          onPointerDown={(event) => onMoveStart(sticker.id, event)}
        >
          <Move size={14} />
        </button>
        <button type="button" className={styles.iconAction} onClick={() => onRotate(sticker.id)}>
          <RotateCw size={14} />
        </button>
        <button type="button" className={styles.iconAction} onClick={() => onDelete(sticker.id)}>
          <X size={14} />
        </button>
      </div>
      <span className={styles.stickerMotif}>
        <ScrapIcon kind={stickerKind(sticker.payload.stickerId)} size={28} />
      </span>
      <strong>{sticker.payload.label}</strong>
    </article>
  );
}

export function PhotoBoard({
  photos,
  stickers,
  onPhotosChange,
  onStickersChange
}: {
  photos: PhotoItem[];
  stickers: StickerItem[];
  onPhotosChange: (photos: PhotoItem[]) => void;
  onStickersChange: (stickers: StickerItem[]) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const [layoutPreset, setLayoutPreset] = useState<LayoutPreset>("scatter");
  const [dragging, setDragging] = useState<{
    kind: "photo" | "sticker";
    id: string;
    offsetX: number;
    offsetY: number;
  } | null>(null);

  const setNextZ = () =>
    Math.max(
      1,
      ...photos.map((item) => item.styleConfig.zIndex),
      ...stickers.map((item) => item.styleConfig.zIndex)
    ) + 1;

  useEffect(() => {
    if (!dragging) return;

    const handleMove = (event: PointerEvent) => {
      const rect = boardRef.current?.getBoundingClientRect();
      if (!rect) return;

      const x = clamp(event.clientX - rect.left - dragging.offsetX, 8, rect.width - 180);
      const y = clamp(event.clientY - rect.top - dragging.offsetY, 8, rect.height - 210);

      if (dragging.kind === "photo") {
        onPhotosChange(
          photos.map((photo) =>
            photo.id === dragging.id ? { ...photo, styleConfig: { ...photo.styleConfig, x, y } } : photo
          )
        );
      } else {
        onStickersChange(
          stickers.map((sticker) =>
            sticker.id === dragging.id
              ? { ...sticker, styleConfig: { ...sticker.styleConfig, x, y } }
              : sticker
          )
        );
      }
    };

    const stopDragging = () => setDragging(null);
    window.addEventListener("pointermove", handleMove);
    window.addEventListener("pointerup", stopDragging);
    return () => {
      window.removeEventListener("pointermove", handleMove);
      window.removeEventListener("pointerup", stopDragging);
    };
  }, [dragging, onPhotosChange, onStickersChange, photos, stickers]);

  const startPhotoDrag = (id: string, event: ReactPointerEvent<HTMLButtonElement>) => {
    const target = photos.find((item) => item.id === id);
    if (!target || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    onPhotosChange(
      photos.map((photo) =>
        photo.id === id ? { ...photo, styleConfig: { ...photo.styleConfig, zIndex: setNextZ() } } : photo
      )
    );
    setDragging({
      kind: "photo",
      id,
      offsetX: event.clientX - rect.left - target.styleConfig.x,
      offsetY: event.clientY - rect.top - target.styleConfig.y
    });
  };

  const startStickerDrag = (id: string, event: ReactPointerEvent<HTMLButtonElement>) => {
    const target = stickers.find((item) => item.id === id);
    if (!target || !boardRef.current) return;
    const rect = boardRef.current.getBoundingClientRect();
    onStickersChange(
      stickers.map((sticker) =>
        sticker.id === id
          ? { ...sticker, styleConfig: { ...sticker.styleConfig, zIndex: setNextZ() } }
          : sticker
      )
    );
    setDragging({
      kind: "sticker",
      id,
      offsetX: event.clientX - rect.left - target.styleConfig.x,
      offsetY: event.clientY - rect.top - target.styleConfig.y
    });
  };

  const applyLayout = (preset: LayoutPreset) => {
    setLayoutPreset(preset);
    if (photos.length === 0) return;

    const rect = boardRef.current?.getBoundingClientRect();
    const boardWidth = rect?.width ?? 760;
    const boardHeight = rect?.height ?? 420;
    const cardWidth = boardWidth < 560 ? 152 : 188;
    const cardHeight = cardWidth + 86;
    const safeWidth = Math.max(boardWidth - cardWidth - 16, 8);
    const safeHeight = Math.max(boardHeight - cardHeight - 18, 8);

    const nextPhotos = photos.map((photo, index) => {
      let x = photo.styleConfig.x;
      let y = photo.styleConfig.y;
      let presetRotation = photo.styleConfig.presetRotation;

      if (preset === "scatter") {
        const pattern = [
          [0.05, 0.08, -5],
          [0.58, 0.04, 5],
          [0.14, 0.47, -5],
          [0.62, 0.46, 5],
          [0.36, 0.22, 0],
          [0.4, 0.58, -5]
        ] as const;
        const [tx, ty, rotation] = pattern[index % pattern.length];
        x = 8 + safeWidth * tx;
        y = 10 + safeHeight * ty;
        presetRotation = rotation;
      } else if (preset === "grid") {
        const columns = Math.max(1, Math.min(boardWidth < 620 ? 2 : 3, photos.length));
        const gap = 16;
        const totalWidth = columns * cardWidth + (columns - 1) * gap;
        const startX = Math.max(8, (boardWidth - totalWidth) / 2);
        const row = Math.floor(index / columns);
        const column = index % columns;
        x = startX + column * (cardWidth + gap);
        y = 18 + row * (cardHeight * 0.78);
        presetRotation = row % 2 === 0 ? -5 : 0;
      } else if (preset === "stack") {
        const middleX = boardWidth / 2 - cardWidth / 2;
        const baseY = 34;
        const offsetX = [-32, -10, 14, 32][index % 4];
        x = middleX + offsetX;
        y = baseY + index * 22;
        presetRotation = ([-5, 0, 5, -5][index % 4] ?? 0) as -5 | 0 | 5;
      } else {
        const step = Math.max(54, Math.min(cardWidth + 12, (boardWidth - cardWidth - 24) / Math.max(1, photos.length - 1)));
        x = 12 + step * index;
        y = 44 + (index % 2 === 0 ? 0 : 44);
        presetRotation = index % 2 === 0 ? -5 : 5;
      }

      return {
        ...photo,
        styleConfig: {
          ...photo.styleConfig,
          x: clamp(x, 8, boardWidth - cardWidth - 8),
          y: clamp(y, 8, boardHeight - cardHeight - 10),
          zIndex: index + 2,
          presetRotation
        }
      };
    });

    onPhotosChange(nextPhotos);
  };

  const handleFiles = async (event: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []);
    if (files.length === 0) return;

    const nextItems: PhotoItem[] = [];
    for (const [index, file] of files.entries()) {
      const assetId = createId("asset");
      const dimensions = await measureImage(file);
      await putLocalAsset({
        id: assetId,
        blob: file,
        mimeType: file.type || "image/jpeg",
        createdAt: new Date().toISOString()
      });
      nextItems.push(
        createPhotoDraftItem({
          assetId,
          width: dimensions.width,
          height: dimensions.height,
          x: 24 + index * 24,
          y: 18 + index * 22,
          rotation: index % 2 === 0 ? -5 : 5
        })
      );
    }

    onPhotosChange([...photos, ...nextItems]);
    event.target.value = "";
  };

  return (
    <div className={styles.photoBoardSection}>
      <div className={styles.boardToolbar}>
        <div className={styles.boardToolbarMain}>
          <button type="button" className={styles.primaryButton} onClick={() => inputRef.current?.click()}>
            <ImagePlus size={16} />
            Add photos
          </button>

          <div className={styles.layoutRow}>
            {layoutPresets.map((layout) => {
              const Icon = layout.icon;
              return (
                <button
                  key={layout.id}
                  type="button"
                  className={layoutPreset === layout.id ? styles.layoutActive : styles.layoutChip}
                  onClick={() => applyLayout(layout.id)}
                >
                  <Icon size={14} />
                  {layout.label}
                </button>
              );
            })}
          </div>
        </div>

        <div className={styles.stickerRow}>
          {stickerPresets.map((sticker) => (
            <button
              key={sticker.id}
              type="button"
              className={styles.stickerPicker}
              onClick={() =>
                onStickersChange([
                  ...stickers,
                  createStickerDraftItem({
                    stickerId: sticker.id,
                    label: sticker.label,
                    tint: sticker.tint,
                    x: 18 + stickers.length * 18,
                    y: 22 + stickers.length * 14,
                    rotation: sticker.rotation
                  })
                ])
              }
            >
              <span className={styles.stickerPickerIcon}>
                <ScrapIcon kind={stickerKind(sticker.id)} size={18} />
              </span>
              {sticker.label}
            </button>
          ))}
        </div>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={handleFiles} />
      </div>

      <div className={styles.photoBoard} ref={boardRef}>
        <div className={styles.boardPinNote}>
          <strong>Scrap board</strong>
          <p>Start with a layout preset, then nudge only the cards you want to fine-tune.</p>
        </div>

        {photos.map((photo) => (
          <PhotoCard
            key={photo.id}
            photo={photo}
            onMoveStart={startPhotoDrag}
            onRotate={(id) =>
              onPhotosChange(
                photos.map((item) =>
                  item.id === id
                    ? {
                        ...item,
                        styleConfig: {
                          ...item.styleConfig,
                          presetRotation: cyclePresetRotation(item.styleConfig.presetRotation)
                        }
                      }
                    : item
                )
              )
            }
            onDelete={(id) => onPhotosChange(photos.filter((item) => item.id !== id))}
            onCaptionChange={(id, caption) =>
              onPhotosChange(
                photos.map((item) =>
                  item.id === id ? { ...item, payload: { ...item.payload, caption } } : item
                )
              )
            }
          />
        ))}

        {stickers.map((sticker) => (
          <StickerCard
            key={sticker.id}
            sticker={sticker}
            onMoveStart={startStickerDrag}
            onRotate={(id) =>
              onStickersChange(
                stickers.map((item) =>
                  item.id === id
                    ? {
                        ...item,
                        styleConfig: {
                          ...item.styleConfig,
                          presetRotation: cyclePresetRotation(item.styleConfig.presetRotation)
                        }
                      }
                    : item
                )
              )
            }
            onDelete={(id) => onStickersChange(stickers.filter((item) => item.id !== id))}
          />
        ))}

        {photos.length === 0 && stickers.length === 0 ? (
          <div className={styles.boardEmpty}>
            <strong>Start your board</strong>
            <p>Drop in photos, then layer hearts, stars, ribbons, and notes on top.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
