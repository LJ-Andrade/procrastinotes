import type { Editor } from "@tiptap/react";
import { store } from "../data";

/**
 * Image asset pipeline for the editor.
 *
 * Pasted / dropped / picked images are downscaled on the frontend (canvas),
 * re-encoded to WebP, and stored as binary assets in SQLite via the data store.
 * The editor node only keeps a lightweight `asset:<id>` reference, so page
 * content (`content_json`) and the search index stay small. The bytes travel
 * with the database, so backups and future sync remain a single file.
 */

/** Largest dimension (px) we keep; bigger images are scaled down to fit. */
const MAX_DIMENSION = 1600;
/** WebP quality used when re-encoding stored images. */
const WEBP_QUALITY = 0.85;

/** Marks an image node `src` as a reference to a stored asset. */
const ASSET_PREFIX = "asset:";

/** Build the node `src` that references a stored asset by id. */
export function assetSrc(id: string): string {
  return `${ASSET_PREFIX}${id}`;
}

/** Return the asset id from a node `src`, or `null` if it is not a reference. */
export function assetId(src: string): string | null {
  return src.startsWith(ASSET_PREFIX) ? src.slice(ASSET_PREFIX.length) : null;
}

/**
 * Resize an image blob to fit within `MAX_DIMENSION`, store it as a binary
 * asset, and insert an image node referencing it. Errors are swallowed so a
 * single bad file never breaks a paste/drop of several.
 */
export async function insertImageFiles(editor: Editor, files: File[]): Promise<void> {
  for (const file of files) {
    if (!file.type.startsWith("image/")) continue;
    try {
      const stored = await storeImageBlob(file);
      if (stored) {
        editor.chain().focus().setImage({ src: stored, alt: file.name }).run();
      }
    } catch {
      // Ignore a file we could not decode or store.
    }
  }
}

/** Pick image files from a transfer list (clipboard or drop). */
export function imageFilesFrom(list: FileList | null | undefined): File[] {
  if (!list) return [];
  return Array.from(list).filter((f) => f.type.startsWith("image/"));
}

/**
 * Downscale (if needed), re-encode to WebP, persist, and return the node `src`.
 * Returns `null` when the image cannot be decoded or encoded.
 */
async function storeImageBlob(blob: Blob): Promise<string | null> {
  const bitmap = await createImageBitmap(blob);
  const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
  const width = Math.max(1, Math.round(bitmap.width * scale));
  const height = Math.max(1, Math.round(bitmap.height * scale));

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close();
    return null;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const out = await canvasToBlob(canvas, "image/webp", WEBP_QUALITY);
  if (!out) return null;
  const base64 = await blobToBase64(out);
  const id = await store.putAsset("image/webp", base64, width, height);
  return assetSrc(id);
}

function canvasToBlob(
  canvas: HTMLCanvasElement,
  type: string,
  quality: number,
): Promise<Blob | null> {
  return new Promise((resolve) => canvas.toBlob(resolve, type, quality));
}

/** Read a blob as base64 without the `data:<mime>;base64,` prefix. */
function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => {
      const result = reader.result as string;
      const comma = result.indexOf(",");
      resolve(comma >= 0 ? result.slice(comma + 1) : result);
    };
    reader.readAsDataURL(blob);
  });
}
