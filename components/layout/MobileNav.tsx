'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, ShoppingBag, PlusCircle, MessageSquare, User } from 'lucide-react';

export default function MobileNav() {
  const path = usePathname();
  const active = (href: string) => path === href ? 'text-[#8B1A1A]' : 'text-gray-500';

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 z-50">
      <div className="flex justify-around py-2">
        <Link href="/" className={`flex flex-col items-center text-xs gap-1 ${active('/')}`}>
          <Home className="w-5 h-5" /><span>Trang chủ</span>
        </Link>
        <Link href="/cho" className={`flex flex-col items-center text-xs gap-1 ${active('/cho')}`}>
          <ShoppingBag className="w-5 h-5" /><span>Chợ</span>
        </Link>
        <Link href="/dang-ga" className="flex flex-col items-center text-xs gap-1 text-white">
          <div className="bg-[#8B1A1A] rounded-full p-2 -mt-4 shadow-lg">
            <PlusCircle className="w-6 h-6" />
          </div>
          <span className="text-gray-500">Đăng gà</span>
        </Link>
        <Link href="/cong-dong" className={`flex flex-col items-center text-xs gap-1 ${active('/cong-dong')}`}>
          <MessageSquare className="w-5 h-5" /><span>Cộng đồng</span>
        </Link>
        <Link href="/ho-so/1" className={`flex flex-col items-center text-xs gap-1 ${active('/ho-so/1')}`}>
          <User className="w-5 h-5" /><span>Hồ sơ</span>
        </Link>
      </div>
    </nav>
  );
}
