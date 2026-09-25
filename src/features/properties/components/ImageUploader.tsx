"use client";

import { useState } from "react";
import Image from "next/image";
import { toast } from "sonner";
import { DndContext, closestCenter, type DragEndEvent } from "@dnd-kit/core";
import { SortableContext, arrayMove, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, RotateCw, Star, Trash2, Upload } from "lucide-react";
import { propertyImageUrl } from "@/lib/storage/publicUrl";
import { limits } from "@/config/limits";
import {
  deletePropertyImageAction,
  reorderPropertyImagesAction,
  rotatePropertyImageAction,
  setCoverImageAction,
} from "@/features/properties/image-actions";

export type UploaderImage = {
  id: string;
  storage_path: string;
  is_cover: boolean;
  display_order: number;
};

type PendingUpload = { key: string; filename: string; status: "uploading" | "processing" | "error"; error?: string };

/**
 * POSTs JSON to an upload route and returns the parsed body, throwing the
 * route's error message on failure. Retries once on 503 (Supabase briefly
 * unavailable) and never tries to use a redirect or non-JSON body.
 */
async function postJson<T>(url: string, body: unknown, fallbackError: string): Promise<T> {
  for (let attempt = 1; ; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (res.status === 503 && attempt < 2) {
      await new Promise((resolve) => setTimeout(resolve, 1500));
      continue;
    }
    const data = (await res.json().catch(() => null)) as (T & { error?: string }) | null;
    if (!res.ok || res.redirected || !data) throw new Error(data?.error ?? fallbackError);
    return data;
  }
}

export function ImageUploader({ propertyId, initialImages }: { propertyId: string; initialImages: UploaderImage[] }) {
  const [images, setImages] = useState<UploaderImage[]>([...initialImages].sort((a, b) => a.display_order - b.display_order));
  const [pending, setPending] = useState<PendingUpload[]>([]);

  async function handleFiles(fileList: FileList | null) {
    if (!fileList) return;
    const files = Array.from(fileList);
    if (images.length + files.length > limits.property.maxPhotos) {
      toast.error(`You can upload up to ${limits.property.maxPhotos} photos total.`);
      return;
    }

    for (const file of files) {
      if (file.size > limits.property.maxPhotoBytesBeforeProcessing) {
        toast.error(`${file.name} is larger than 10 MB`);
        continue;
      }
      uploadOne(file);
    }
  }

  async function uploadOne(file: File) {
    const key = crypto.randomUUID();
    setPending((p) => [...p, { key, filename: file.name, status: "uploading" }]);

    try {
      const { path, signedUrl } = await postJson<{ path: string; signedUrl: string }>(
        "/api/uploads/sign",
        { propertyId, filename: file.name },
        "Could not start upload",
      );

      const uploadRes = await fetch(signedUrl, {
        method: "PUT",
        body: file,
        headers: { "Content-Type": file.type },
      });
      if (!uploadRes.ok) throw new Error("Upload failed");

      setPending((p) => p.map((u) => (u.key === key ? { ...u, status: "processing" } : u)));

      const { image } = await postJson<{ image: UploaderImage }>(
        "/api/uploads/process",
        { propertyId, rawPath: path },
        "Could not process image",
      );

      setImages((imgs) => [...imgs, image]);
      setPending((p) => p.filter((u) => u.key !== key));
    } catch (err) {
      setPending((p) => p.map((u) => (u.key === key ? { ...u, status: "error", error: err instanceof Error ? err.message : "Failed" } : u)));
    }
  }

  function retry(key: string) {
    setPending((p) => p.filter((u) => u.key !== key));
    // The file itself isn't retained on error to keep this simple; the
    // user re-selects it from the file picker.
    toast.info("Please re-select the file to retry.");
  }

  async function onDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    const oldIndex = images.findIndex((i) => i.id === active.id);
    const newIndex = images.findIndex((i) => i.id === over.id);
    const reordered = arrayMove(images, oldIndex, newIndex);
    setImages(reordered);
    await reorderPropertyImagesAction(propertyId, reordered.map((i) => i.id));
  }

  async function onSetCover(id: string) {
    setImages((imgs) => imgs.map((i) => ({ ...i, is_cover: i.id === id })));
    await setCoverImageAction(propertyId, id);
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this photo? This can't be undone.")) return;
    setImages((imgs) => imgs.filter((i) => i.id !== id));
    await deletePropertyImageAction(propertyId, id);
  }

  async function onRotate(id: string) {
    const result = await rotatePropertyImageAction(propertyId, id);
    if ("error" in result) toast.error(result.error);
    else toast.success("Photo rotated");
  }

  return (
    <div className="space-y-4">
      <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-[var(--radius-lg)] border-2 border-dashed border-[var(--color-border)] bg-[var(--color-surface)] p-8 text-center">
        <Upload size={24} className="text-[var(--color-muted-foreground)]" />
        <span className="text-sm font-medium">Drag photos here or click to upload</span>
        <span className="text-xs text-[var(--color-muted-foreground)]">JPEG, PNG, or WebP — up to 10 MB each</span>
        <input
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={(e) => handleFiles(e.target.files)}
        />
      </label>

      {pending.length > 0 && (
        <ul className="space-y-1 text-sm">
          {pending.map((u) => (
            <li key={u.key} className="flex items-center justify-between rounded-[var(--radius-sm)] border border-[var(--color-border)] px-3 py-2">
              <span>{u.filename}</span>
              {u.status === "error" ? (
                <button type="button" onClick={() => retry(u.key)} className="text-[var(--color-danger)]">
                  {u.error} — Retry
                </button>
              ) : (
                <span className="text-[var(--color-muted)]">{u.status === "uploading" ? "Uploading…" : "Processing…"}</span>
              )}
            </li>
          ))}
        </ul>
      )}

      <DndContext collisionDetection={closestCenter} onDragEnd={onDragEnd}>
        <SortableContext items={images.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
            {images.map((image) => (
              <SortableImage key={image.id} image={image} onSetCover={onSetCover} onDelete={onDelete} onRotate={onRotate} />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <p className="text-xs text-[var(--color-muted-foreground)]">
        {images.length} of {limits.property.maxPhotos} photos. At least 1 photo is required to publish; 5+ recommended.
      </p>
    </div>
  );
}

function SortableImage({
  image,
  onSetCover,
  onDelete,
  onRotate,
}: {
  image: UploaderImage;
  onSetCover: (id: string) => void;
  onDelete: (id: string) => void;
  onRotate: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ id: image.id });
  const style = { transform: CSS.Transform.toString(transform), transition };
  const url = propertyImageUrl(image.storage_path);

  return (
    <div ref={setNodeRef} style={style} className="group relative aspect-square overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)]">
      {url && <Image src={url} alt="" fill className="object-cover" />}
      <button
        type="button"
        {...attributes}
        {...listeners}
        aria-label="Drag to reorder"
        className="absolute left-1 top-1 flex h-7 w-7 items-center justify-center rounded-full bg-white/90 text-[var(--color-foreground)]"
      >
        <GripVertical size={14} />
      </button>
      {image.is_cover && (
        <span className="absolute right-1 top-1 rounded-full bg-[var(--color-accent)] px-2 py-1 text-[10px] font-semibold text-white">
          COVER
        </span>
      )}
      <div className="absolute inset-x-0 bottom-0 flex justify-center gap-1 bg-black/50 p-1 opacity-0 transition-opacity group-hover:opacity-100">
        {!image.is_cover && (
          <button type="button" onClick={() => onSetCover(image.id)} title="Set as cover" className="rounded p-1 text-white hover:bg-white/20">
            <Star size={14} />
          </button>
        )}
        <button type="button" onClick={() => onRotate(image.id)} title="Rotate" className="rounded p-1 text-white hover:bg-white/20">
          <RotateCw size={14} />
        </button>
        <button type="button" onClick={() => onDelete(image.id)} title="Delete" className="rounded p-1 text-white hover:bg-white/20">
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}
