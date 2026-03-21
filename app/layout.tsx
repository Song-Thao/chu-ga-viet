import type { Metadata } from 'next';
import './globals.css';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import MobileNav from '@/components/layout/MobileNav';
import { ChatProvider } from '@/components/chat/ChatContext';
import ChatPopupManager from '@/components/chat/ChatPopupManager';

export const metadata: Metadata = {
  title: 'Chủ Gà Việt - Mua bán gà chiến số 1',
  description: 'Nền tảng mua bán và phân tích gà chiến số 1 Việt Nam',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
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
