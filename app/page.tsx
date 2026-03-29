// SERVER COMPONENT — không có 'use client'
import { createClient } from '@supabase/supabase-js';
import HomeClient from './HomeClient';

export const dynamic = 'force-dynamic';

async function fetchHomeData() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
  const [cfgRes, bannerRes, moiDangRes, noiBatRes, vidRes] = await Promise.all([
    supabase.from('config').select('shopee_link').single(),
    supabase.from('banners').select('*').order('vi_tri'),
    supabase.from('ga')
      .select('id,ten,loai_ga,gia,khu_vuc,ga_images(url,is_primary),ai_analysis(total_score)')
      .eq('status', 'active').order('created_at', { ascending: false }).limit(4),
    supabase.from('ga')
      .select('id,ten,loai_ga,gia,khu_vuc,view_count,ga_images(url,is_primary),ai_analysis(total_score)')
      .eq('status', 'active').order('view_count', { ascending: false }).limit(4),
    supabase.from('posts')
      .select('id,noi_dung,youtube_url,like_count,likes,comment_count')
      .eq('status', 'active').not('youtube_url', 'is', null).neq('youtube_url', '')
      .order('like_count', { ascending: false }).limit(6),
  ]);
  return {
    shopeeLink: cfgRes.data?.shopee_link || 'https://s.shopee.vn/AKVzuqq0dk',
    banners: bannerRes.data || [],
    gaMoiDang: moiDangRes.data || [],
    gaNoiBat: noiBatRes.data || [],
    topVideos: vidRes.data || [],
  };
}

export default async function HomePage() {
  const data = await fetchHomeData();
  return <HomeClient {...data} />;
}
