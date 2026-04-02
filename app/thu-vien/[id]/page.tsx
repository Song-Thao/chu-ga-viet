import type { Metadata } from 'next';
import { createClient } from '@supabase/supabase-js';
import ThuVienDetailClient from './ThuVienDetailClient';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://chu-ga-viet.netlify.app';

async function getPost(id: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  const { data } = await supabase
    .from('posts')
    .select('noi_dung, image_url, profiles(username)')
    .eq('id', id)
    .eq('status', 'active')
    .single();
  return data;
}

export async function generateMetadata(
  { params }: { params: Promise<{ id: string }> },
): Promise<Metadata> {
  const { id } = await params;
  const post = await getPost(id);
  if (!post) return { title: 'Bài viết | Thư Viện Gà Việt' };

  const lines = (post.noi_dung || '').trim().split('\n').filter((l: string) => l.trim());
  const title = lines[0]?.slice(0, 70) || 'Bài viết';
  const description = (lines.slice(1).join(' ') || post.noi_dung || '').slice(0, 155);
  const author = (post.profiles as any)?.username || 'Sư kê';

  return {
    title: `${title} – ${author}`,
    description,
    openGraph: {
      title,
      description,
      images: post.image_url ? [{ url: post.image_url }] : [],
      url: `${BASE_URL}/thu-vien/${id}`,
      type: 'article',
    },
    alternates: { canonical: `${BASE_URL}/thu-vien/${id}` },
  };
}

export default function ThuVienDetailPage() {
  return <ThuVienDetailClient />;
}
