import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://chugaviet.netlify.app';

export const metadata: Metadata = {
  title: 'Đăng Nhập – Chợ Gà Việt',
  description: 'Đăng nhập vào Chợ Gà Việt để mua bán, phân tích và giao lưu cùng cộng đồng sư kê toàn quốc.',
  keywords: ['đăng nhập chợ gà', 'tài khoản sư kê', 'chợ gà việt đăng nhập'],
  openGraph: {
    title: 'Đăng Nhập – Chợ Gà Việt',
    description: 'Đăng nhập vào Chợ Gà Việt để mua bán gà chọi và phân tích bằng AI.',
    url: `${BASE_URL}/login`,
    type: 'website',
  },
  alternates: { canonical: `${BASE_URL}/login` },
  robots: { index: false, follow: false },
};

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
