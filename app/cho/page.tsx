// app/cho/page.tsx — SERVER COMPONENT (không có 'use client')
// Data fetch ở server → HTML trả về đã có sẵn → LCP thấp

import { Suspense } from 'react';
import { createClient } from '@supabase/supabase-js';
import ChoClient from './ChoClient';

// Cache 60 giây
export const revalidate = 60;

export const metadata = {
  title: 'Chợ Gà – Mua Bán Gà Chọi Toàn Quốc',
  description: 'Hàng ngàn con gà chọi đang bán: gà đòn, gà cựa, gà tre, gà nòi. Tìm ngay gà ưng ý!',
};

async function fetchGaServer() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );

    const { data, error } = await supabase
      .from('ga')
      .select(`
        id, ten, loai_ga, gia, can_nang, tuoi,
        khu_vuc, mo_ta, video_url, status,
        view_count, created_at,
        ga_images (url, is_primary),
        ai_analysis (total_score)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) throw error;
    return data ?? [];
  } catch (e) {
    console.error('[cho/page] fetchGaServer error:', e);
    return [];
  }
}

export default async function ChoPage() {
  // Fetch ở server — không cần client JS
  const initialData = await fetchGaServer();

  return (
    <Suspense fallback={
      <div className="max-w-6xl mx-auto px-3 py-4">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
              <div className="bg-gray-200 h-36" />
              <div className="p-3 space-y-2">
                <div className="bg-gray-200 h-3 rounded w-3/4" />
                <div className="bg-gray-200 h-4 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      </div>
    }>
      <ChoClient initialData={initialData} />
    </Suspense>
  );
}
