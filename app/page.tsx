import { createClient } from '@supabase/supabase-js';
import HomeClient from './HomeClient';

// ISR: regenerate trang mỗi 5 phút
export const revalidate = 300;

// Retry helper — thử lại tối đa 3 lần nếu fetch thất bại
async function withRetry<T>(fn: () => PromiseLike<T>, retries = 3): Promise<T | null> {
  for (let i = 0; i < retries; i++) {
    try {
      const result = await fn();
      return result;
    } catch {
      if (i < retries - 1) await new Promise(r => setTimeout(r, 500 * (i + 1)));
    }
  }
  return null;
}

async function fetchHomeData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
  );

  // Mỗi query độc lập — 1 lỗi không ảnh hưởng query khác
  const [cfgRes, bannerRes, moiDangRes, noiBatRes, vidRes] = await Promise.all([
    withRetry(() => supabase.from('config').select('shopee_link').single().then(r => r.data)),
    withRetry(() => supabase.from('banners').select('*').order('vi_tri').then(r => r.data ?? [])),
    withRetry(() => supabase.from('ga')
      .select('id,ten,loai_ga,gia,khu_vuc,ga_images(url,is_primary),ai_analysis(total_score)')
      .eq('status', 'active').order('created_at', { ascending: false }).limit(4)
      .then(r => r.data ?? [])),
    withRetry(() => supabase.from('ga')
      .select('id,ten,loai_ga,gia,khu_vuc,view_count,ga_images(url,is_primary),ai_analysis(total_score)')
      .eq('status', 'active').order('view_count', { ascending: false }).limit(4)
      .then(r => r.data ?? [])),
    withRetry(() => supabase.from('posts')
      .select('id,noi_dung,youtube_url,like_count,likes,comment_count')
      .eq('status', 'active').not('youtube_url', 'is', null).neq('youtube_url', '')
      .order('like_count', { ascending: false }).limit(6)
      .then(r => r.data ?? [])),
  ]);

  return {
    shopeeLink: (cfgRes as any)?.shopee_link || 'https://s.shopee.vn/AKVzuqq0dk',
    banners: (bannerRes as any[]) || [],
    gaMoiDang: (moiDangRes as any[]) || [],
    gaNoiBat: (noiBatRes as any[]) || [],
    topVideos: (vidRes as any[]) || [],
  };
}

export default async function HomePage() {
  const data = await fetchHomeData();
  return <HomeClient {...data} />;
}
