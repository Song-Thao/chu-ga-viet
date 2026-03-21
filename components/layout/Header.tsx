'use client';

import Link from 'next/link';
import { Search, Bell, MessageCircle, User, Menu, LogOut } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// Helper: mở floating chat window qua custom event
function openFloatingChat(detail: {
  convId: string;
  gaId: string;
  gaTen: string;
  gaAnh: string;
  doiPhuongId: string;
}) {
  window.dispatchEvent(new CustomEvent('cgv-open-chat', { detail }));
}

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const router = useRouter();

  const notifRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) setupRealtime(data.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user || null);
      if (session?.user) setupRealtime(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      const target = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(target)) setShowNotif(false);
      if (userMenuRef.current && !userMenuRef.current.contains(target)) setUserMenuOpen(false);
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(target)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') { setShowNotif(false); setUserMenuOpen(false); setMenuOpen(false); }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const playSound = () => {
    try {
      if (!audioCtxRef.current)
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioCtxRef.current;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    } catch {}
  };

  const setupRealtime = (userId: string) => {
    supabase.channel(`notifications-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id === userId) return;

        const { data: conv } = await supabase
          .from('conversations')
          .select('id, ga_id, seller_id, buyer_id, ga(ten, ga_images(url, is_primary))')
          .eq('id', msg.conversation_id)
          .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
          .maybeSingle();

        if (!conv) return;
        playSound();

        const gaData = (conv as any).ga;
        const gaAnh = gaData?.ga_images?.find((i: any) => i.is_primary)?.url || gaData?.ga_images?.[0]?.url || '';

        setNotifications(prev => [{
          id: msg.id,
          conv_id: conv.id,
          ga_id: conv.ga_id,
          ga_ten: gaData?.ten || 'Gà',
          ga_anh: gaAnh,
          seller_id: (conv as any).seller_id,
          buyer_id: (conv as any).buyer_id,
          noi_dung: msg.noi_dung,
          time: new Date(),
          read: false,
        }, ...prev.slice(0, 9)]);

        setUnreadCount(prev => prev + 1);
      }).subscribe();
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserMenuOpen(false);
    router.push('/');
    router.refresh();
  };

  const markAllRead = () => {
    setUnreadCount(0);
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  // Click thông báo → mở floating chat window
  const handleNotifClick = (n: any) => {
    setShowNotif(false);
    // Xóa thông báo này (đọc xong không lưu)
    setNotifications(prev => prev.filter(x => x.id !== n.id));
    const doiPhuongId = n.seller_id === user?.id ? n.buyer_id : n.seller_id;
    openFloatingChat({
      convId: n.conv_id,
      gaId: n.ga_id,
      gaTen: n.ga_ten,
      gaAnh: n.ga_anh || '',
      doiPhuongId,
    });
  };

  function toggleNotif() {
    const next = !showNotif;
    setShowNotif(next);
    setUserMenuOpen(false);
    if (next) markAllRead();
  }

  function toggleUserMenu() {
    setUserMenuOpen(prev => !prev);
    setShowNotif(false);
  }

  const userName = user?.user_metadata?.username || user?.email?.split('@')[0] || 'Tài khoản';

  return (
    <header className="bg-[#8B1A1A] text-white sticky top-0 z-50 shadow-lg">
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
              {/* THÔNG BÁO */}
              <div className="relative" ref={notifRef}>
                <button onClick={toggleNotif} className="relative hover:text-yellow-300 transition">
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1.5 -right-1.5 bg-yellow-400 text-black text-xs font-black w-4 h-4 rounded-full flex items-center justify-center">
                      {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                  )}
                </button>

                {showNotif && (
                  <div className="absolute right-0 top-10 bg-white text-gray-800 rounded-xl shadow-xl w-72 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b flex justify-between items-center">
                      <span className="font-bold text-sm">🔔 Thông báo</span>
                      {notifications.length > 0 && (
                        <button onClick={() => { setNotifications([]); setUnreadCount(0); }}
                          className="text-xs text-gray-400 hover:text-red-500">
                          Xóa tất cả
                        </button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-gray-400 text-sm">Chưa có thông báo</div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.map(n => (
                          <button key={n.id} onClick={() => handleNotifClick(n)}
                            className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 border-b transition text-left ${!n.read ? 'bg-red-50' : ''}`}>
                            {n.ga_anh ? (
                              <img src={n.ga_anh} alt="" className="w-8 h-8 rounded-lg object-cover flex-shrink-0" />
                            ) : (
                              <div className="w-8 h-8 bg-[#8B1A1A] rounded-full flex items-center justify-center text-white text-sm flex-shrink-0">🐓</div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-gray-800 truncate">{n.ga_ten}</div>
                              <div className="text-xs text-gray-600 truncate">{n.noi_dung}</div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {n.time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            {!n.read && <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CHAT ICON → /tin-nhan */}
              <Link href="/tin-nhan" className="relative hover:text-yellow-300 transition">
                <MessageCircle className="w-5 h-5" />
              </Link>

              {/* USER MENU */}
              <div className="relative" ref={userMenuRef}>
                <button onClick={toggleUserMenu}
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
            <Menu className="w-5 h-5 cursor-pointer" onClick={() => setMenuOpen(prev => !prev)} />
            {menuOpen && (
              <div className="absolute right-0 top-14 left-0 bg-[#6B0F0F] px-4 py-3 flex flex-col gap-3 text-sm shadow-lg z-40">
                <Link href="/cho" onClick={() => setMenuOpen(false)}>🛒 Chợ giao dịch</Link>
                <Link href="/thu-vien" onClick={() => setMenuOpen(false)}>📚 Thư viện</Link>
                <Link href="/cong-dong" onClick={() => setMenuOpen(false)}>👥 Cộng đồng</Link>
                <Link href="/ai-phan-tich" onClick={() => setMenuOpen(false)}>🤖 AI Phân Tích</Link>
                <Link href="/dang-ga" onClick={() => setMenuOpen(false)}>➕ Đăng gà</Link>
                {!user && (
                  <>
                    <Link href="/login" onClick={() => setMenuOpen(false)}>🔑 Đăng nhập</Link>
                    <Link href="/register" onClick={() => setMenuOpen(false)}>📝 Đăng ký</Link>
                  </>
                )}
                {user && (
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
