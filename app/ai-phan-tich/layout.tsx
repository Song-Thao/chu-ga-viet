import type { Metadata } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://chugaviet.netlify.app';

export const metadata: Metadata = {
  title: 'Định Giá Gà AI – Phân Tích Gà Chọi Bằng Trí Tuệ Nhân Tạo',
  description: 'Tải ảnh gà chọi lên để AI phân tích tướng gà, 92 loại vảy chuẩn và định giá tự động. Công cụ miễn phí cho sư kê.',
  keywords: ['định giá gà AI', 'phân tích gà chọi', '92 loại vảy', 'tướng gà AI', 'AI gà chọi'],
  openGraph: {
    title: 'Định Giá Gà AI – Phân Tích Gà Chọi Bằng Trí Tuệ Nhân Tạo',
    description: 'AI phân tích tướng gà, 92 loại vảy chuẩn và định giá tự động.',
    url: `${BASE_URL}/ai-phan-tich`,
    type: 'website',
  },
  alternates: { canonical: `${BASE_URL}/ai-phan-tich` },
};

export default function AiPhanTichLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
