import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://chugaviet.netlify.app';

export const metadata: Metadata = {
  title: 'Đăng Ký – Chợ Gà Việt',
  description: 'Tạo tài khoản Chợ Gà Việt miễn phí. Tham gia cộng đồng sư kê, mua bán gà chọi và dùng AI phân tích gà.',
  keywords: ['đăng ký chợ gà', 'tạo tài khoản sư kê', 'chợ gà việt đăng ký'],
  openGraph: {
    title: 'Đăng Ký – Chợ Gà Việt',
    description: 'Tạo tài khoản miễn phí, tham gia cộng đồng sư kê toàn quốc.',
    url: `${BASE_URL}/register`,
    type: 'website',
  },
  alternates: { canonical: `${BASE_URL}/register` },
  robots: { index: false, follow: false },
};

export default function RegisterLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
