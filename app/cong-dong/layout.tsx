import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://chugaviet.netlify.app';

export const metadata: Metadata = {
  title: 'Cộng Đồng Sư Kê – Giao Lưu Gà Chọi',
  description: 'Diễn đàn giao lưu sư kê toàn quốc. Chia sẻ kinh nghiệm nuôi gà, xem tướng gà, vảy gà và tin tức gà chọi mới nhất.',
  keywords: ['cộng đồng sư kê', 'diễn đàn gà chọi', 'giao lưu gà', 'vảy gà', 'tướng gà'],
  openGraph: {
    title: 'Cộng Đồng Sư Kê – Giao Lưu Gà Chọi',
    description: 'Diễn đàn giao lưu sư kê toàn quốc. Chia sẻ kinh nghiệm nuôi gà, xem tướng gà, vảy gà.',
    url: `${BASE_URL}/cong-dong`,
    type: 'website',
  },
  alternates: { canonical: `${BASE_URL}/cong-dong` },
};

export default function CongDongLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
