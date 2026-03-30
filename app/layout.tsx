import type { Metadata, Viewport } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileNav from '@/components/layout/MobileNav';
import { ChatProvider } from '@/components/chat/ChatContext';
import ChatPopupManager from '@/components/chat/ChatPopupManager';

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
    'gà chọi miền Nam', 'gà đòn', 'gà cựa',
  ],
  openGraph: {
    type: 'website',
    locale: 'vi_VN',
    url: BASE_URL,
    siteName: 'Chợ Gà Việt',
    title: 'Chợ Gà Việt – Mua Bán Gà Chọi Toàn Quốc',
    description: 'Cộng đồng mua bán, định giá gà chọi bằng AI. 92 loại vảy chuẩn, giao lưu sư kê toàn quốc.',
    images: [{ url: '/og-image.png', width: 1200, height: 630 }],
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
  verification: {
    google: 'r4C1zVy-xhHPU4GRrXkFnA6k6oUr7RV30cvi2yD48gE',
  },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#8B1A1A',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://img.youtube.com" />
        <link rel="dns-prefetch" href="https://ui-avatars.com" />
      </head>
      <body className="bg-gray-100 min-h-screen">
        <ChatProvider>
          <Header />
          <main className="pb-20 md:pb-0">
            {children}
          </main>
          <Footer />
          <MobileNav />
          <ChatPopupManager />
        </ChatProvider>
      </body>
    </html>
  );
}
