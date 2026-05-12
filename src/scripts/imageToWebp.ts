// Client-side WebP converter — runs in the browser before uploading.
// Cloudflare Workers can't run sharp/imagemagick, so we do the conversion here
// and the server simply stores whatever the client sends.

const PASS_THROUGH = new Set(["image/svg+xml", "image/gif", "image/webp"]);
const DEFAULT_QUALITY = 0.85;
const DEFAULT_MAX_DIMENSION = 2048; // px on longest edge

export interface ConvertOptions {
  quality?: number;
  maxDimension?: number;
}

/**
 * Convert a raster image File (PNG/JPEG) to a WebP File.
 *
 * Pass-through cases (returned unchanged): SVG (vector), GIF (animation), already-WebP.
 * Non-image files are also returned unchanged.
 */
export async function convertImageToWebp(
  file: File,
  options: ConvertOptions = {},
): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  if (PASS_THROUGH.has(file.type)) return file;
  if (typeof document === "undefined") return file;

  const quality = options.quality ?? DEFAULT_QUALITY;
  const maxDim = options.maxDimension ?? DEFAULT_MAX_DIMENSION;

  const bitmap = await loadBitmap(file);
  const { width, height } = scaledSize(bitmap.width, bitmap.height, maxDim);

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d");
  if (!ctx) {
    bitmap.close?.();
    return file;
  }
  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close?.();

  const blob = await new Promise<Blob | null>((resolve) => {
    canvas.toBlob(resolve, "image/webp", quality);
  });
  if (!blob) return file;

  // If the WebP came out larger than the source (e.g. tiny PNG icon),
  // keep the original — saves bandwidth and quality.
  if (blob.size >= file.size) return file;

  const baseName = file.name.replace(/\.[^.]+$/, "");
  return new File([blob], `${baseName}.webp`, {
    type: "image/webp",
    lastModified: Date.now(),
  });
}

async function loadBitmap(file: File): Promise<ImageBitmap | HTMLImageElement> {
  // createImageBitmap is faster and honors EXIF when supported.
  if (typeof createImageBitmap === "function") {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      // fall through to <img> fallback (older Safari)
    }
  }
  return await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image load failed"));
    };
    img.src = url;
  });
}

function scaledSize(
  width: number,
  height: number,
  maxDim: number,
): { width: number; height: number } {
  const longest = Math.max(width, height);
  if (longest <= maxDim) return { width, height };
  const ratio = maxDim / longest;
  return {
    width: Math.round(width * ratio),
    height: Math.round(height * ratio),
  };
}
