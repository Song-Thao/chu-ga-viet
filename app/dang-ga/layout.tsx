import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://chugaviet.netlify.app';

export const metadata: Metadata = {
  title: 'Đăng Bán Gà – Chợ Gà Việt',
  description: 'Đăng bán gà chọi lên Chợ Gà Việt. Tiếp cận hàng nghìn người mua trên toàn quốc nhanh chóng và miễn phí.',
  keywords: ['đăng bán gà chọi', 'rao vặt gà', 'bán gà chọi online'],
  openGraph: {
    title: 'Đăng Bán Gà – Chợ Gà Việt',
    description: 'Đăng bán gà chọi, tiếp cận hàng nghìn người mua toàn quốc.',
    url: `${BASE_URL}/dang-ga`,
    type: 'website',
  },
  alternates: { canonical: `${BASE_URL}/dang-ga` },
};

export default function DangGaLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
