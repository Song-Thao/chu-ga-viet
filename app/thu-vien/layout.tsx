import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://chu-ga-viet.netlify.app';

export const metadata: Metadata = {
  title: 'Thư Viện Gà – Kiến Thức Gà Chọi',
  description: 'Kho bài viết về gà chọi: kinh nghiệm nuôi, chăm sóc, chọn giống, xem tướng gà và video hay từ cộng đồng sư kê.',
  keywords: ['thư viện gà chọi', 'kiến thức gà', 'nuôi gà chọi', 'chọn giống gà'],
  openGraph: {
    title: 'Thư Viện Gà – Kiến Thức Gà Chọi',
    description: 'Kho bài viết về gà chọi: kinh nghiệm nuôi, chăm sóc, chọn giống từ cộng đồng sư kê.',
    url: `${BASE_URL}/thu-vien`,
    type: 'website',
  },
  alternates: { canonical: `${BASE_URL}/thu-vien` },
};

export default function ThuVienLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
