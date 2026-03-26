// SERVER COMPONENT — fetch data trước khi gửi HTML về browser
import { createClient } from '@supabase/supabase-js';
import ChoClient from './ChoClient';

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
      .select('id,ten,loai_ga,gia,can_nang,tuoi,khu_vuc,mo_ta,video_url,created_at,view_count,ga_images(url,is_primary),ai_analysis(total_score)')
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
