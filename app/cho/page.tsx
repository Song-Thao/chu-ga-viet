// SERVER COMPONENT — fetch data truoc khi gui HTML ve browser
import { createClient } from '@supabase/supabase-js';
import ChoClient from './ChoClient';

export const revalidate = 60;

export const metadata = {
  title: 'Cho Ga – Mua Ban Ga Choi Toan Quoc',
  description: 'Hang ngan con ga choi dang ban: ga don, ga cua, ga tre, ga noi.',
};

async function fetchGa() {
  try {
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
    const { data } = await supabase
      .from('ga')
      .select('id,ten,loai_ga,gia,can_nang,tuoi,khu_vuc,video_url,created_at,view_count,ga_images(url,is_primary),ai_analysis(total_score)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(24);
    return data ?? [];
  } catch {
    return [];
  }
