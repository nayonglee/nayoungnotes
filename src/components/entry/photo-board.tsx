"use client";

import type { ChangeEvent, PointerEvent as ReactPointerEvent } from "react";
import { useEffect, useRef, useState } from "react";
import NextImage from "next/image";
import TextareaAutosize from "react-textarea-autosize";
import { ImagePlus, Move, RotateCw, Sticker, Trash2, X } from "lucide-react";
import { createPhotoDraftItem, createStickerDraftItem, cyclePresetRotation } from "@/lib/entry";
import { getLocalAsset, putLocalAsset } from "@/lib/local/database";
import { stickerPresets } from "@/lib/theme";
import { clamp, createId } from "@/lib/utils";
import type { PhotoItem, StickerItem } from "@/types/diary";
import styles from "@/styles/entry.module.css";

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

function stickerGlyph(stickerId: string) {
  switch (stickerId) {
    case "starry":
      return "★";
    case "strawberry":
      return "♡";
    case "ribbon":
      return "✦";
    case "flower":
      return "✿";
    default:
      return "◎";
  }
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
        <button type="button" className={styles.iconAction} onPointerDown={(event) => onMoveStart(photo.id, event)}>
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
        {url ? <NextImage src={url} alt="" fill unoptimized className={styles.photoImage} /> : <div className={styles.photoPlaceholder} />}
      </div>
      <TextareaAutosize
        minRows={1}
        className={styles.photoCaption}
        value={photo.payload.caption}
        onChange={(event) => onCaptionChange(photo.id, event.target.value)}
        placeholder="짧은 캡션"
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
        <button type="button" className={styles.iconAction} onPointerDown={(event) => onMoveStart(sticker.id, event)}>
          <Move size={14} />
        </button>
        <button type="button" className={styles.iconAction} onClick={() => onRotate(sticker.id)}>
          <RotateCw size={14} />
        </button>
        <button type="button" className={styles.iconAction} onClick={() => onDelete(sticker.id)}>
          <X size={14} />
        </button>
      </div>
      <span>{stickerGlyph(sticker.payload.stickerId)}</span>
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
      const y = clamp(event.clientY - rect.top - dragging.offsetY, 8, rect.height - 180);

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
        <button type="button" className={styles.primaryButton} onClick={() => inputRef.current?.click()}>
          <ImagePlus size={16} />
          사진 올리기
        </button>
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
              <Sticker size={14} />
              <span>{stickerGlyph(sticker.id)}</span>
              {sticker.label}
            </button>
          ))}
        </div>
        <input ref={inputRef} type="file" accept="image/*" multiple hidden onChange={handleFiles} />
      </div>

      <div className={styles.photoBoard} ref={boardRef}>
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
            <strong>메모리 보드</strong>
            <p>사진을 올리거나 별, 하트, 리본 스티커를 붙여서 오늘 페이지를 정리해 보세요.</p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
