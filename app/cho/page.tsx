// SERVER COMPONENT
import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import ChoClient from './ChoClient';

export const revalidate = 60;

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://chu-ga-viet.netlify.app';

export const metadata: Metadata = {
  title: 'Chợ Gà – Mua Bán Gà Chọi Toàn Quốc',
  description: 'Hàng nghìn con gà chọi đang bán: gà đòn, gà cựa, gà tre, gà nội. Tìm gà chọi chất lượng tại Chợ Gà Việt.',
  keywords: ['mua bán gà chọi', 'gà đòn', 'gà cựa', 'gà tre', 'gà nội', 'chợ gà'],
  openGraph: {
    title: 'Chợ Gà – Mua Bán Gà Chọi Toàn Quốc',
    description: 'Hàng nghìn con gà chọi đang bán: gà đòn, gà cựa, gà tre, gà nội.',
    url: `${BASE_URL}/cho`,
    type: 'website',
  },
  alternates: { canonical: `${BASE_URL}/cho` },
};

async function fetchGa() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from('ga')
      .select(`
        id,
        ten,
        loai_ga,
        gia,
        can_nang,
        tuoi,
        khu_vuc,
        video_url,
        created_at,
        ga_images ( url, is_primary ),
        ai_analysis ( total_score )
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(24);
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function ChoPage() {
  const initialData = await fetchGa();
  return <ChoClient initialData={initialData} />;
}
