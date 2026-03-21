'use client';
import Link from 'next/link';
import { Search, User, Menu, LogOut } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import HeaderChatSection from '@/components/chat/HeaderChatSection';

export default function Header() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, s) => setUser(s?.user ?? null));
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handler(e: MouseEvent) {
      const t = e.target as Node;
      if (userMenuRef.current && !userMenuRef.current.contains(t)) setUserMenuOpen(false);
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(t)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') { setUserMenuOpen(false); setMenuOpen(false); }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserMenuOpen(false);
    router.push('/'); router.refresh();
  };

  const userName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Tài khoản';

  return (
    <header className="bg-[#8B1A1A] text-white sticky top-0 z-[100] shadow-lg">
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-3">

        <Link href="/" className="flex items-center gap-2 font-bold text-xl whitespace-nowrap">
          🐓 <span className="hidden sm:block">Chủ Gà Việt</span>
        </Link>

        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
          <input type="text" placeholder="Tìm gà theo tên, loại, khu vực..."
            className="w-full pl-9 pr-4 py-2 rounded-full text-gray-800 text-sm focus:outline-none focus:ring-2 focus:ring-yellow-400" />
        </div>

        <nav className="hidden md:flex items-center gap-4 text-sm font-medium">
          <Link href="/cho" className="hover:text-yellow-300 transition">Chợ</Link>
          <Link href="/thu-vien" className="hover:text-yellow-300 transition">Thư viện</Link>
          <Link href="/cong-dong" className="hover:text-yellow-300 transition">Cộng đồng</Link>
        </nav>

        <div className="flex items-center gap-3">
          <Link href="/ai-phan-tich"
            className="bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-bold hover:bg-yellow-300 transition hidden sm:block">
            AI Phân Tích
          </Link>

          {user ? (
            <>
              {/* Chat section tách riêng để dùng useChat context */}
              <HeaderChatSection user={user} />

              {/* USER MENU */}
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => setUserMenuOpen(p => !p)}
                  className="flex items-center gap-2 bg-white/20 hover:bg-white/30 px-3 py-1.5 rounded-full transition">
                  <User className="w-4 h-4" />
                  <span className="text-xs font-semibold hidden sm:block max-w-[80px] truncate">{userName}</span>
                </button>
                {userMenuOpen && (
                  <div className="absolute right-0 top-10 bg-white text-gray-800 rounded-xl shadow-lg w-48 py-2 z-50">
                    <div className="px-4 py-2 border-b">
                      <div className="font-bold text-sm truncate">{userName}</div>
                      <div className="text-xs text-gray-400 truncate">{user.email}</div>
                    </div>
                    <Link href="/ho-so/me" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm">
                      <User className="w-4 h-4" /> Hồ sơ của tôi
                    </Link>
                    <Link href="/dang-ga" onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-gray-50 text-sm">
                      🐓 Đăng bán gà
                    </Link>
                    <button onClick={handleLogout}
                      className="flex items-center gap-2 px-4 py-2 hover:bg-red-50 text-red-600 text-sm w-full">
                      <LogOut className="w-4 h-4" /> Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login" className="text-sm font-semibold hover:text-yellow-300 transition hidden sm:block">Đăng nhập</Link>
              <Link href="/register" className="bg-yellow-400 text-black px-3 py-1.5 rounded-full text-xs font-bold hover:bg-yellow-300 transition">Đăng ký</Link>
            </div>
          )}

          <div ref={mobileMenuRef} className="md:hidden">
            <Menu className="w-5 h-5 cursor-pointer" onClick={() => setMenuOpen(p => !p)} />
            {menuOpen && (
              <div className="absolute right-0 top-14 left-0 bg-[#6B0F0F] px-4 py-3 flex flex-col gap-3 text-sm shadow-lg z-40">
                <Link href="/cho" onClick={() => setMenuOpen(false)}>🛒 Chợ giao dịch</Link>
                <Link href="/thu-vien" onClick={() => setMenuOpen(false)}>📚 Thư viện</Link>
                <Link href="/cong-dong" onClick={() => setMenuOpen(false)}>👥 Cộng đồng</Link>
                <Link href="/ai-phan-tich" onClick={() => setMenuOpen(false)}>🤖 AI Phân Tích</Link>
                <Link href="/dang-ga" onClick={() => setMenuOpen(false)}>➕ Đăng gà</Link>
                {!user ? (
                  <>
                    <Link href="/login" onClick={() => setMenuOpen(false)}>🔑 Đăng nhập</Link>
                    <Link href="/register" onClick={() => setMenuOpen(false)}>📝 Đăng ký</Link>
                  </>
                ) : (
                  <button onClick={handleLogout} className="text-left text-red-300">🚪 Đăng xuất</button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
