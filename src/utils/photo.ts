const CANVAS_W = 450;
const CANVAS_H = 600;
const CIRCLE_SIZE = 480;
const RADIUS = 28;

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Falha ao carregar a imagem'));
    image.src = src;
  });
}

function cropRect3x4(ctx: CanvasRenderingContext2D, source: HTMLImageElement, sw: number, sh: number): void {
  let cropW = sw;
  let cropH = (cropW * 4) / 3;
  if (cropH > sh) {
    cropH = sh;
    cropW = (cropH * 3) / 4;
  }
  const offsetX = (sw - cropW) / 2;
  const offsetY = (sh - cropH) * 0.25;
  ctx.drawImage(source, offsetX, offsetY, cropW, cropH, 0, 0, CANVAS_W, CANVAS_H);
}

function cropCircle(ctx: CanvasRenderingContext2D, source: HTMLImageElement, sw: number, sh: number): void {
  const side = Math.min(sw, sh);
  const offsetX = (sw - side) / 2;
  const offsetY = (sh - side) * 0.3;
  ctx.drawImage(source, offsetX, offsetY, side, side, 0, 0, CIRCLE_SIZE, CIRCLE_SIZE);
}

function makeCanvas(size: number): CanvasRenderingContext2D {
  const canvas = document.createElement('canvas');
  canvas.width = size === CIRCLE_SIZE ? CIRCLE_SIZE : CANVAS_W;
  canvas.height = size === CIRCLE_SIZE ? CIRCLE_SIZE : CANVAS_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas indisponível');
  return ctx;
}

export interface ProcessedPhoto {
  photo: string;
  photoCircle: string;
}

export async function processPhotoFile(file: File): Promise<ProcessedPhoto> {
  const originalUrl = URL.createObjectURL(file);
  try {
    const original = await loadImage(originalUrl);
    let source = original;

    try {
      const { removeBackground } = await import('@imgly/background-removal');
      const cutoutBlob = await removeBackground(file);
      const cutoutUrl = URL.createObjectURL(cutoutBlob);
      try {
        source = await loadImage(cutoutUrl);
      } finally {
        URL.revokeObjectURL(cutoutUrl);
      }
    } catch {
      source = original;
    }

    const rectCtx = makeCanvas(CANVAS_W);
    rectCtx.beginPath();
    if (typeof rectCtx.roundRect === 'function') {
      rectCtx.roundRect(0, 0, CANVAS_W, CANVAS_H, RADIUS);
    } else {
      rectCtx.rect(0, 0, CANVAS_W, CANVAS_H);
    }
    rectCtx.clip();
    cropRect3x4(rectCtx, source, source.naturalWidth, source.naturalHeight);

    const circleCtx = makeCanvas(CIRCLE_SIZE);
    circleCtx.beginPath();
    circleCtx.arc(CIRCLE_SIZE / 2, CIRCLE_SIZE / 2, CIRCLE_SIZE / 2, 0, Math.PI * 2);
    circleCtx.clip();
    cropCircle(circleCtx, source, source.naturalWidth, source.naturalHeight);

    return {
      photo: rectCtx.canvas.toDataURL('image/png'),
      photoCircle: circleCtx.canvas.toDataURL('image/png'),
    };
  } finally {
    URL.revokeObjectURL(originalUrl);
  }
}

export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const base64 = dataUrl.slice(dataUrl.indexOf(',') + 1);
  const binary = atob(base64);
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
}
