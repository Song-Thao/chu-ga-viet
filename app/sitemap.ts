import type { MetadataRoute } from 'next';
import { createClient } from '@supabase/supabase-js';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://chu-ga-viet.netlify.app';

export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const [{ data: gaList }, { data: posts }] = await Promise.all([
    supabase
      .from('ga')
      .select('id, updated_at')
      .eq('status', 'active')
      .order('updated_at', { ascending: false })
      .limit(1000),
    supabase
      .from('posts')
      .select('id, created_at')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(500),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: BASE_URL,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${BASE_URL}/cong-dong`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/cho`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${BASE_URL}/ai-phan-tich`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${BASE_URL}/thu-vien`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.8,
    },
  ];

  const gaRoutes: MetadataRoute.Sitemap = (gaList ?? []).map((ga) => ({
    url: `${BASE_URL}/ga/${ga.id}`,
    lastModified: ga.updated_at ? new Date(ga.updated_at) : new Date(),
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  const postRoutes: MetadataRoute.Sitemap = (posts ?? []).map((post) => ({
    url: `${BASE_URL}/thu-vien/${post.id}`,
    lastModified: post.created_at ? new Date(post.created_at) : new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...gaRoutes, ...postRoutes];
}
