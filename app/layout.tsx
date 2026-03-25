import type { Metadata, Viewport } from 'next';

const BASE_URL = process.env.NEXT_PUBLIC_BASE_URL || 'https://chu-ga-viet.vercel.app';

export const metadata: Metadata = {
  metadataBase: new URL(BASE_URL),
  title: {
    default: 'Chợ Gà Việt – Mua Bán Gà Chọi Toàn Quốc',
    template: '%s | Chợ Gà Việt',
  },
  description: 'Cộng đồng mua bán, định giá gà chọi bằng AI. Xem tướng gà, 92 loại vảy chuẩn, giao lưu anh em sư kê toàn quốc.',
  keywords: [
    'gà chọi', 'mua bán gà', 'gà đá', 'gà tre', 'sư kê',
    'định giá gà AI', 'vảy gà', '92 loại vảy', 'chợ gà',
  ],
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: BASE_URL,
    siteName: 'Chợ Gà Việt',
    title: 'Chợ Gà Việt – Mua Bán Gà Chọi Toàn Quốc',
    description: 'Cộng đồng mua bán, định giá gà chọi bằng AI. 92 loại vảy chuẩn, giao lưu sư kê toàn quốc.',
    images: [
      {
        url: '/og-image.jpg',
        width: 1200,
        height: 630,
        alt: 'Chợ Gà Việt',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Chợ Gà Việt – Mua Bán Gà Chọi Toàn Quốc',
    description: 'Cộng đồng mua bán, định giá gà chọi bằng AI.',
    images: ['/og-image.jpg'],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  alternates: {
    canonical: BASE_URL,
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#8B1A1A',
};
