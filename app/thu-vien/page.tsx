import { createClient } from '@supabase/supabase-js';
import ThuVienClient from './ThuVienClient';

// ISR: regenerate mỗi 5 phút
export const revalidate = 300;

async function fetchPosts() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
    );
    const { data } = await supabase
      .from('posts')
      .select('id, noi_dung, image_url, likes, like_count, comment_count, youtube_url, created_at, status, profiles(username, avatar_url)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(30);
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function ThuVienPage() {
  const initialPosts = await fetchPosts();
  return <ThuVienClient initialPosts={initialPosts} />;
}
