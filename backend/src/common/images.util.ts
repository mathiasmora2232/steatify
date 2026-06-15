/**
 * Normalización de imágenes para web con `sharp`. Adaptado de la librería propia
 * `@librerias/images`: auto-orienta por EXIF (clave para fotos de iPhone),
 * convierte cualquier formato (incl. HEIC/HEIF) a JPG/PNG, redimensiona y comprime.
 */
import sharp from 'sharp';

export type ProcessedImage = { buffer: Buffer; ext: 'jpg' | 'png'; contentType: string };

export interface ProcessOptions {
  /** Lado máximo (px). No agranda. */
  maxDim?: number;
  /** Calidad JPEG 1–100. */
  quality?: number;
}

/**
 * Normaliza una imagen subida: auto-orienta por EXIF, convierte HEIC/HEIF y demás
 * a JPG (o PNG si hay transparencia), redimensiona si excede maxDim, comprime.
 */
export async function processImage(input: Buffer, opts: ProcessOptions = {}): Promise<ProcessedImage> {
  const maxDim = opts.maxDim ?? 1600;
  const quality = opts.quality ?? 82;
  let img = sharp(input, { failOn: 'none' }).rotate();
  const meta = await img.metadata();
  if ((meta.width ?? 0) > maxDim || (meta.height ?? 0) > maxDim) {
    img = img.resize(maxDim, maxDim, { fit: 'inside', withoutEnlargement: true });
  }
  if (meta.hasAlpha) {
    const buffer = await img.png({ compressionLevel: 9, palette: true }).toBuffer();
    return { buffer, ext: 'png', contentType: 'image/png' };
  }
  const buffer = await img.jpeg({ quality, mozjpeg: true }).toBuffer();
  return { buffer, ext: 'jpg', contentType: 'image/jpeg' };
}

/** processImage → data URI listo para `<img src>`. */
export async function processImageDataUri(input: Buffer, opts: ProcessOptions = {}): Promise<string> {
  const { buffer, contentType } = await processImage(input, opts);
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}

/** Miniatura cuadrada (cover) del lado dado. Siempre JPEG. Ideal para avatares. */
export async function thumbnail(input: Buffer, size = 256, quality = 82): Promise<ProcessedImage> {
  const buffer = await sharp(input, { failOn: 'none' })
    .rotate() // auto-orienta por EXIF
    .resize(size, size, { fit: 'cover' })
    .jpeg({ quality, mozjpeg: true })
    .toBuffer();
  return { buffer, ext: 'jpg', contentType: 'image/jpeg' };
}

/** Igual que thumbnail pero devuelve un data URI listo para `<img src>`. */
export async function thumbnailDataUri(input: Buffer, size = 256, quality = 82): Promise<string> {
  const { buffer, contentType } = await thumbnail(input, size, quality);
  return `data:${contentType};base64,${buffer.toString('base64')}`;
}
