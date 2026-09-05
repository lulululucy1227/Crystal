import sharp from 'sharp';

const INPUT_OPTIONS = { limitInputPixels: 16_000_000, failOn: 'warning' };

/** Decode approved local PNG/JPEG/WebP bytes; return a normalized transparent PNG.
 * No background inference, color grading, model downloads or external requests.
 * Sharp/libvips handles codecs, orientation, profiles and compression; this module
 * only determines existing alpha bounds and the agreed 82% centered subject scale.
 */
export async function normalizeTransparentPng(bytes, size = 256) {
  if (!Number.isInteger(size) || size < 16 || size > 2048) throw new Error('Canvas size must be an integer from 16 to 2048');
  const metadata = await sharp(bytes, INPUT_OPTIONS).metadata();
  if (!['png', 'jpeg', 'webp'].includes(metadata.format)) throw new Error('UNSUPPORTED_IMAGE_ENCODING');
  if ((metadata.pages || 1) > 1) throw new Error('ANIMATED_SOURCE_UNSUPPORTED');
  if (!metadata.width || !metadata.height || metadata.width > 8192 || metadata.height > 8192 || metadata.width * metadata.height > 16_000_000) throw new Error('IMAGE_DIMENSION_LIMIT');
  const { data, info } = await sharp(bytes, INPUT_OPTIONS).autoOrient().ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width, height, channels } = info;
  let left = width, top = height, right = -1, bottom = -1, transparent = false;
  for (let y = 0; y < height; y++) for (let x = 0; x < width; x++) {
    const alpha = data[(y * width + x) * channels + channels - 1];
    if (alpha === 0) transparent = true;
    else { left = Math.min(left, x); right = Math.max(right, x); top = Math.min(top, y); bottom = Math.max(bottom, y); }
  }
  if (right < left) throw new Error('EMPTY_ALPHA_SUBJECT');
  if (!transparent) throw new Error('OPAQUE_SOURCE_NEEDS_MASK');
  const sourceBounds = { left, top, width: right - left + 1, height: bottom - top + 1 };
  const scale = Math.round(size * 0.82) / Math.max(sourceBounds.width, sourceBounds.height);
  const outWidth = Math.max(1, Math.round(sourceBounds.width * scale));
  const outHeight = Math.max(1, Math.round(sourceBounds.height * scale));
  const offsetX = Math.floor((size - outWidth) / 2), offsetY = Math.floor((size - outHeight) / 2);
  const output = await sharp(bytes, INPUT_OPTIONS).autoOrient().ensureAlpha()
    .extract(sourceBounds).resize(outWidth, outHeight, { fit: 'fill', kernel: 'nearest' })
    .extend({ left: offsetX, right: size - outWidth - offsetX, top: offsetY, bottom: size - outHeight - offsetY, background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .keepIccProfile().png({ compressionLevel: 9, adaptiveFiltering: false }).toBuffer();
  return { bytes: output, sourceWidth: width, sourceHeight: height, sourceBounds, sourceFormat: metadata.format };
}
