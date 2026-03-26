import { supabase } from '@/lib/supabase';

export interface UploadResult {
  url: string;
  path: string;
  error?: string;
}

export async function uploadToSupabase(
  file: File,
  bucket = 'images',
  folder = 'posts'
): Promise<UploadResult> {
  try {
    const path = `${folder}/${file.name}`;
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, {
        upsert: false,
        contentType: 'image/webp',
        cacheControl: '31536000',
      });
    if (error) throw error;
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
    return { url: urlData.publicUrl, path };
  } catch (err: any) {
    return { url: '', path: '', error: err.message };
  }
}

export async function uploadMultipleToSupabase(
  files: File[],
  bucket = 'images',
  folder = 'posts'
): Promise<UploadResult[]> {
  return Promise.all(files.map(f => uploadToSupabase(f, bucket, folder)));
}
