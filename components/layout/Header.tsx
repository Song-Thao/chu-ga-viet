'use client';
import Link from 'next/link';
import { Search, Bell, MessageCircle, User, Menu } from 'lucide-react';
import { useState } from 'react';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="bg-[#8B1A1A] text-white sticky top-0 z-50 shadow-lg">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2 font-bold text-xl whitespace-nowrap">
          🐓 <span className="hidden sm:block">Chủ Gà Việt</span>
        </Link>

        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input
            type="text"
            placeholder="Tìm gà theo tên, loại, khu vực..."
            className="w-full pl-9 pr-4 py-2 rounded-full text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400"
          />
        </div>

        {/* Nav desktop */}
        <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
          <Link href="/cho" className="hover:text-yellow-300 transition">Chợ</Link>
          <Link href="/thu-vien" className="hover:text-yellow-300 transition">Thư viện</Link>
          <Link href="/cong-dong" className="hover:text-yellow-300 transition">Cộng đồng</Link>
        </nav>

        {/* Icons */}
        <div className="flex items-center gap-3">
          <Link href="/ai-phan-tich" className="bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-bold hover:bg-yellow-300 transition hidden sm:block">
            AI Phân Tích
          </Link>
          <Bell className="w-5 h-5 cursor-pointer hover:text-yellow-300" />
          <MessageCircle className="w-5 h-5 cursor-pointer hover:text-yellow-300" />
          <Link href="/ho-so/1"><User className="w-5 h-5 cursor-pointer hover:text-yellow-300" /></Link>
          <Menu className="w-5 h-5 cursor-pointer md:hidden" onClick={() => setMenuOpen(!menuOpen)} />
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="md:hidden bg-[#6B0F0F] px-4 py-3 flex flex-col gap-3 text-sm">
          <Link href="/cho" onClick={() => setMenuOpen(false)}>🛒 Chợ giao dịch</Link>
          <Link href="/thu-vien" onClick={() => setMenuOpen(false)}>📚 Thư viện</Link>
          <Link href="/cong-dong" onClick={() => setMenuOpen(false)}>👥 Cộng đồng</Link>
          <Link href="/ai-phan-tich" onClick={() => setMenuOpen(false)}>🤖 AI Phân Tích</Link>
          <Link href="/dang-ga" onClick={() => setMenuOpen(false)}>➕ Đăng gà</Link>
        </div>
      )}
    </header>
  );
}
