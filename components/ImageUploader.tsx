'use client';
import { useState, useRef, useCallback } from 'react';
import { optimizeImages, formatBytes, OptimizeResult } from '@/lib/imageOptimizer';
import { uploadToSupabase } from '@/lib/uploadToSupabase';

type ImageState = {
  id: string;
  status: 'optimizing' | 'ready' | 'uploading' | 'done' | 'error';
  original?: File;
  optimized?: OptimizeResult;
  uploadedUrl?: string;
  error?: string;
};

interface ImageUploaderProps {
  maxImages?: number;
  bucket?: string;
  folder?: string;
  onUploadDone?: (urls: string[]) => void;
  onPreviewChange?: (previews: string[]) => void;
  label?: string;
}

export default function ImageUploader({
  maxImages = 4,
  bucket = 'images',
  folder = 'posts',
  onUploadDone,
  onPreviewChange,
  label = 'Thêm ảnh',
}: ImageUploaderProps) {
  const [images, setImages] = useState<ImageState[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const updateImage = useCallback((id: string, update: Partial<ImageState>) => {
    setImages(prev => prev.map(img => img.id === id ? { ...img, ...update } : img));
  }, []);

  async function processFiles(files: File[]) {
    const remaining = maxImages - images.length;
    const toProcess = Array.from(files).slice(0, remaining);
    if (toProcess.length === 0) return;

    const placeholders: ImageState[] = toProcess.map(f => ({
      id: `${Date.now()}_${Math.random()}`,
      status: 'optimizing',
      original: f,
    }));
    setImages(prev => [...prev, ...placeholders]);

    for (const ph of placeholders) {
      try {
        const [result] = await optimizeImages([ph.original!], {
          maxWidthOrHeight: 1280,
          maxSizeKB: 300,
        });
        updateImage(ph.id, { status: 'ready', optimized: result });
        setImages(prev => {
          const previews = prev
            .filter(img => img.optimized?.preview || img.uploadedUrl)
            .map(img => img.uploadedUrl || img.optimized?.preview || '');
          onPreviewChange?.(previews);
          return prev;
        });
      } catch {
        updateImage(ph.id, { status: 'error', error: 'Không thể tối ưu ảnh' });
      }
    }
  }

  async function uploadAll(): Promise<string[]> {
    const readyImages = images.filter(img => img.status === 'ready' && img.optimized);
    const urls: string[] = [];
    for (const img of readyImages) {
      updateImage(img.id, { status: 'uploading' });
      const result = await uploadToSupabase(img.optimized!.file, bucket, folder);
      if (result.error) {
        updateImage(img.id, { status: 'error', error: result.error });
      } else {
        updateImage(img.id, { status: 'done', uploadedUrl: result.url });
        urls.push(result.url);
      }
    }
    images.filter(img => img.status === 'done' && img.uploadedUrl)
      .forEach(img => urls.push(img.uploadedUrl!));
    onUploadDone?.(urls);
    return urls;
  }

  function removeImage(id: string) {
    setImages(prev => {
      const next = prev.filter(img => img.id !== id);
      const previews = next
        .filter(img => img.optimized?.preview || img.uploadedUrl)
        .map(img => img.uploadedUrl || img.optimized?.preview || '');
      onPreviewChange?.(previews);
      return next;
    });
  }

  const hasReady = images.some(img => img.status === 'ready');
  const isAllDone = images.length > 0 && images.every(img => img.status === 'done');

  return (
    <div>
      {images.length > 0 && (
        <div className={`grid gap-2 mb-3 ${images.length === 1 ? 'grid-cols-1' : 'grid-cols-2'}`}>
          {images.map((img, idx) => (
            <div key={img.id} className="relative rounded-xl overflow-hidden bg-gray-100" style={{ aspectRatio: '4/3' }}>
              {(img.optimized?.preview || img.uploadedUrl) && (
                <img src={img.uploadedUrl || img.optimized?.preview} alt={`Ảnh ${idx + 1}`}
                  className="w-full h-full object-cover" loading="lazy" />
              )}
              {img.status === 'optimizing' && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white text-xs gap-1">
                  <div className="w-6 h-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Đang tối ưu ảnh...</span>
                </div>
              )}
              {img.status === 'uploading' && (
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-white text-xs gap-1">
                  <div className="w-6 h-6 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
                  <span>Đang upload...</span>
                </div>
              )}
              {img.status === 'error' && (
                <div className="absolute inset-0 bg-red-500/80 flex items-center justify-center text-white text-xs p-2 text-center">
                  ❌ {img.error}
                </div>
              )}
              {img.status === 'ready' && img.optimized && (
                <div className="absolute bottom-1 left-1 bg-green-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  ✅ {formatBytes(img.optimized.compressedSize)} (-{img.optimized.savedPercent}%)
                </div>
              )}
              {img.status === 'done' && (
                <div className="absolute bottom-1 left-1 bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                  ☁️ Đã lưu
                </div>
              )}
              {img.status !== 'uploading' && img.status !== 'optimizing' && (
                <button onClick={() => removeImage(img.id)}
                  className="absolute top-1 right-1 w-6 h-6 bg-black/60 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition">
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {images.length < maxImages && (
        <div
          onDrop={e => { e.preventDefault(); setIsDragging(false); processFiles(Array.from(e.dataTransfer.files).filter(f => f.type.startsWith('image/'))); }}
          onDragOver={e => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition ${isDragging ? 'border-[#8B1A1A] bg-red-50' : 'border-gray-300 hover:border-[#8B1A1A] hover:bg-red-50'}`}>
          <div className="text-2xl mb-1">📷</div>
          <div className="text-sm font-semibold text-gray-600">{label}</div>
          <div className="text-xs text-gray-400 mt-0.5">{images.length}/{maxImages} ảnh • Tự động tối ưu</div>
        </div>
      )}

      <input ref={fileInputRef} type="file" accept="image/*" multiple className="hidden"
        onChange={e => { processFiles(Array.from(e.target.files || [])); e.target.value = ''; }} />

      {hasReady && !isAllDone && (
        <button onClick={uploadAll}
          className="mt-2 w-full bg-[#8B1A1A] text-white font-bold py-2.5 rounded-xl text-sm hover:bg-[#6B0F0F] transition">
          ☁️ Upload {images.filter(i => i.status === 'ready').length} ảnh lên server
        </button>
      )}

      {isAllDone && (
        <div className="mt-2 text-center text-green-600 text-sm font-semibold">
          ✅ Upload {images.filter(i => i.status === 'done').length} ảnh thành công!
        </div>
      )}
    </div>
  );
}

export function useImageUpload(options?: { maxImages?: number; bucket?: string; folder?: string; }) {
  const [previews, setPreviews] = useState<string[]>([]);
  const [optimizedFiles, setOptimizedFiles] = useState<File[]>([]);
  const [status, setStatus] = useState<'idle' | 'optimizing' | 'uploading' | 'done'>('idle');
  const [progress, setProgress] = useState('');

  async function handleFiles(files: File[]): Promise<File[]> {
    if (files.length === 0) return [];
    setStatus('optimizing');
    setProgress('Đang tối ưu ảnh...');
    const { optimizeImages: opt } = await import('@/lib/imageOptimizer');
    const results = await opt(
      files.slice(0, options?.maxImages ?? 4),
      { maxWidthOrHeight: 1280, maxSizeKB: 300 },
      (done, total) => setProgress(`Đang tối ưu ${done}/${total} ảnh...`)
    );
    setPreviews(results.map(r => r.preview));
    setOptimizedFiles(results.map(r => r.file));
    setStatus('idle');
    setProgress('');
    return results.map(r => r.file);
  }

  async function uploadFiles(files?: File[]): Promise<string[]> {
    const toUpload = files || optimizedFiles;
    if (toUpload.length === 0) return [];
    setStatus('uploading');
    setProgress('Đang upload ảnh...');
    const { uploadMultipleToSupabase } = await import('@/lib/uploadToSupabase');
    const results = await uploadMultipleToSupabase(
      toUpload,
      options?.bucket ?? 'images',
      options?.folder ?? 'posts'
    );
    setStatus('done');
    setProgress('');
    return results.filter(r => !r.error).map(r => r.url);
  }

  function reset() {
    setPreviews([]); setOptimizedFiles([]); setStatus('idle'); setProgress('');
  }

  return { previews, optimizedFiles, status, progress, handleFiles, uploadFiles, reset,
    isOptimizing: status === 'optimizing', isUploading: status === 'uploading' };
}
