// app/cho/page.tsx — 1 FILE DUY NHẤT, không tách ChoClient
// Fix: Module not found + Oversized ISR

import { createClient } from '@supabase/supabase-js';
import ChoPageClient from './_client';

// Không pre-render tĩnh — render động theo request
export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Chợ Gà – Mua Bán Gà Chọi Toàn Quốc',
  description: 'Hàng ngàn con gà chọi đang bán: gà đòn, gà cựa, gà tre, gà nòi.',
};

async function fetchGa() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from('ga')
      .select('id, ten, loai_ga, gia, can_nang, tuoi, khu_vuc, mo_ta, video_url, created_at, view_count, ga_images(url, is_primary), ai_analysis(total_score)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(24); // Giảm từ 50 → 24 để tránh oversized
    return data ?? [];
  } catch {
    return [];
  }
}

export default async function ChoPage() {
  const initialData = await fetchGa();
  return <ChoPageClient initialData={initialData} />;
}
