import { MAX_LOGO_DATA_URL_LENGTH } from '../sim/newGame';

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
export const LOGO_SIZE_PX = 128;
const ACCEPTED = ['image/png', 'image/jpeg', 'image/webp'];
const DECODE_TIMEOUT_MS = 5000;

export type UploadError = 'tipo' | 'tamanho' | 'leitura';
type UploadResult = { ok: true; dataUrl: string } | { ok: false; error: UploadError };

function withTimeout<T>(p: Promise<T>, ms: number): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error('tempo esgotado')), ms);
    p.then((v) => { clearTimeout(timer); resolve(v); }, (e) => { clearTimeout(timer); reject(e); });
  });
}

/** Reduz a imagem enviada para 128×128, inteira e centralizada, com fundo transparente. Nunca sai do navegador. */
export async function fileToLogoDataUrl(file: File): Promise<UploadResult> {
  if (!ACCEPTED.includes(file.type)) return { ok: false, error: 'tipo' };
  if (file.size > MAX_UPLOAD_BYTES) return { ok: false, error: 'tamanho' };
  if (typeof createImageBitmap !== 'function' || typeof document === 'undefined') return { ok: false, error: 'leitura' };

  let bitmap: ImageBitmap;
  try {
    bitmap = await withTimeout(createImageBitmap(file), DECODE_TIMEOUT_MS);
  } catch {
    return { ok: false, error: 'leitura' };
  }
  try {
    const canvas = document.createElement('canvas');
    canvas.width = LOGO_SIZE_PX;
    canvas.height = LOGO_SIZE_PX;
    const ctx = canvas.getContext('2d');
    if (!ctx || bitmap.width === 0 || bitmap.height === 0) return { ok: false, error: 'leitura' };
    const scale = Math.min(LOGO_SIZE_PX / bitmap.width, LOGO_SIZE_PX / bitmap.height);
    const w = bitmap.width * scale;
    const h = bitmap.height * scale;
    ctx.imageSmoothingQuality = 'high';
    ctx.drawImage(bitmap, (LOGO_SIZE_PX - w) / 2, (LOGO_SIZE_PX - h) / 2, w, h);
    const dataUrl = canvas.toDataURL('image/webp', 0.9);
    if (!dataUrl.startsWith('data:image/webp') && !dataUrl.startsWith('data:image/png')) return { ok: false, error: 'leitura' };
    if (dataUrl.length > MAX_LOGO_DATA_URL_LENGTH) return { ok: false, error: 'tamanho' };
    return { ok: true, dataUrl };
  } catch {
    return { ok: false, error: 'leitura' };
  } finally {
    bitmap.close();
  }
}
