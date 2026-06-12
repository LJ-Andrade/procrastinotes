import Image from "@tiptap/extension-image";
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
  type NodeViewProps,
} from "@tiptap/react";
import { useEffect, useRef, useState } from "react";
import { store } from "../data";
import { assetId } from "./imageAsset";

/** Smallest width (px) an image can be dragged down to. */
const MIN_WIDTH = 80;

/**
 * Renders an image node. When the `src` is an `asset:<id>` reference, the bytes
 * are resolved from the data store into a `data:` URL on demand (lazy load);
 * any other `src` (e.g. a pasted external URL) is rendered as-is.
 *
 * When the node is selected, drag handles on the left/right edges resize it.
 * Resizing only changes the stored display `width` (a number on the node) — the
 * underlying bytes are untouched, so there is no quality loss. Double-clicking a
 * handle clears the width and returns the image to its natural size.
 */
function ImageNodeView({ node, selected, updateAttributes }: NodeViewProps) {
  const src: string = node.attrs.src ?? "";
  const alt: string = node.attrs.alt ?? "";
  const attrWidth: number | null = node.attrs.width ?? null;

  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [width, setWidth] = useState<number | null>(attrWidth);

  const frameRef = useRef<HTMLSpanElement>(null);
  const draggingRef = useRef(false);
  const latestWidth = useRef<number | null>(attrWidth);

  // Resolve the asset bytes to a data URL (or render an external src directly).
  useEffect(() => {
    const id = assetId(src);
    if (!id) {
      setUrl(src);
      return;
    }
    let active = true;
    setUrl(null);
    setFailed(false);
    store.getAsset(id).then(
      (dataUrl) => active && setUrl(dataUrl),
      () => active && setFailed(true),
    );
    return () => {
      active = false;
    };
  }, [src]);

  // Follow the node's width unless the user is actively dragging a handle.
  useEffect(() => {
    if (!draggingRef.current) {
      setWidth(attrWidth);
      latestWidth.current = attrWidth;
    }
  }, [attrWidth]);

  const startResize = (e: React.PointerEvent, side: "left" | "right") => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const img = frameRef.current?.querySelector("img");
    const startWidth = img?.offsetWidth ?? width ?? 0;
    const maxWidth = frameRef.current?.parentElement?.clientWidth ?? startWidth;
    draggingRef.current = true;

    const onMove = (ev: PointerEvent) => {
      const delta = ev.clientX - startX;
      const raw = side === "right" ? startWidth + delta : startWidth - delta;
      const next = Math.round(Math.min(maxWidth, Math.max(MIN_WIDTH, raw)));
      latestWidth.current = next;
      setWidth(next);
    };
    const onUp = () => {
      draggingRef.current = false;
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      updateAttributes({ width: latestWidth.current });
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };

  const resetSize = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWidth(null);
    latestWidth.current = null;
    updateAttributes({ width: null });
  };

  return (
    <NodeViewWrapper
      className="editor-image"
      data-selected={selected ? "true" : undefined}
    >
      {url ? (
        <span
          ref={frameRef}
          className="editor-image-frame"
          style={width ? { width: `${width}px` } : undefined}
        >
          <img src={url} alt={alt} draggable={false} />
          {selected && (
            <>
              <span
                className="editor-image-handle left"
                onPointerDown={(e) => startResize(e, "left")}
                onDoubleClick={resetSize}
                title="Arrastrá para redimensionar · doble clic para tamaño original"
              />
              <span
                className="editor-image-handle right"
                onPointerDown={(e) => startResize(e, "right")}
                onDoubleClick={resetSize}
                title="Arrastrá para redimensionar · doble clic para tamaño original"
              />
            </>
          )}
        </span>
      ) : (
        <span className="editor-image-placeholder">{failed ? "⚠" : ""}</span>
      )}
    </NodeViewWrapper>
  );
}

/**
 * The official block Image node, rendered through a React node view so stored
 * asset references resolve to their bytes and gain resize handles. Adds a
 * `width` attribute (display width in px) on top of the base `src`/`alt`/`title`.
 */
export const ImageAsset = Image.extend({
  addAttributes() {
    return {
      ...(this.parent?.() ?? {}),
      width: {
        default: null,
        parseHTML: (el) => {
          const w = el.getAttribute("width");
          return w ? parseInt(w, 10) : null;
        },
        renderHTML: (attrs) => (attrs.width ? { width: attrs.width } : {}),
      },
    };
  },
  addNodeView() {
    return ReactNodeViewRenderer(ImageNodeView);
  },
});
