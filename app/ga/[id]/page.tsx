import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import GaDetailContent from '@/components/GaDetailContent';

export const dynamic = 'force-dynamic';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://chu-ga-viet.netlify.app';

async function getGa(id: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await supabase
    .from('ga')
    .select('ten_ga, mo_ta, gia, anh_url, giong_ga')
    .eq('id', id)
    .single();
  return data;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const ga = await getGa(id);
  if (!ga) return { title: 'Gà chọi | Chợ Gà Việt' };

  const title = `${ga.ten_ga}${ga.giong_ga ? ` – ${ga.giong_ga}` : ''}`;
  const description =
    (ga.mo_ta || '').slice(0, 155) ||
    `Mua bán gà chọi ${ga.ten_ga}. Giá: ${(ga.gia || 0).toLocaleString('vi-VN')}đ`;

  return {
    title,
    description,
    openGraph: {
      title,
      description,
      images: ga.anh_url ? [{ url: ga.anh_url }] : [],
      url: `${BASE_URL}/ga/${id}`,
      type: 'website',
    },
    alternates: { canonical: `${BASE_URL}/ga/${id}` },
  };
}

export default async function GaDetailPage(
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  return <GaDetailContent gaId={id} isModal={false} />;
}
