export interface OptimizeResult {
  file: File;
  preview: string;
  originalSize: number;
  compressedSize: number;
  savedPercent: number;
}

export async function optimizeImage(
  input: File,
  options?: {
    maxWidthOrHeight?: number;
    maxSizeKB?: number;
    quality?: number;
  }
): Promise<OptimizeResult> {
  const maxWH = options?.maxWidthOrHeight ?? 1280;
  const maxKB = options?.maxSizeKB ?? 300;
  const originalSize = input.size;

  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(input);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxWH || height > maxWH) {
        if (width > height) {
          height = Math.round(height * maxWH / width);
          width = maxWH;
        } else {
          width = Math.round(width * maxWH / height);
          height = maxWH;
        }
      }
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, width, height);

      let quality = options?.quality ?? 0.82;
      const tryExport = () => {
        canvas.toBlob((blob) => {
          if (!blob) { reject(new Error('Lỗi xử lý ảnh')); return; }
          if (blob.size > maxKB * 1024 && quality > 0.3) {
            quality = Math.max(0.3, quality - 0.1);
            tryExport();
            return;
          }
          const ts = Date.now();
          const rand = Math.random().toString(36).slice(2, 7);
          const fileName = `${ts}_${rand}.webp`;
          const optimized = new File([blob], fileName, { type: 'image/webp' });
          const preview = URL.createObjectURL(optimized);
          resolve({
            file: optimized,
            preview,
            originalSize,
            compressedSize: optimized.size,
            savedPercent: Math.round((1 - optimized.size / originalSize) * 100),
          });
        }, 'image/webp', quality);
      };
      tryExport();
    };

    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Không đọc được ảnh')); };
    img.src = url;
  });
}

export async function optimizeImages(
  files: File[],
  options?: Parameters<typeof optimizeImage>[1],
  onProgress?: (done: number, total: number) => void
): Promise<OptimizeResult[]> {
  const results: OptimizeResult[] = [];
  for (let i = 0; i < files.length; i++) {
    results.push(await optimizeImage(files[i], options));
    onProgress?.(i + 1, files.length);
  }
  return results;
}

export function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)}KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)}MB`;
}
