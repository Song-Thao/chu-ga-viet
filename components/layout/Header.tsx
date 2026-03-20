'use client';
import Link from 'next/link';
import { Search, Bell, MessageCircle, User, Menu, LogOut } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Header() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [showNotif, setShowNotif] = useState(false);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const router = useRouter();

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

  const playSound = () => {
    try {
      if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      const ctx = audioCtxRef.current;
      const oscillator = ctx.createOscillator();
      const gainNode = ctx.createGain();
      oscillator.connect(gainNode);
      gainNode.connect(ctx.destination);
      oscillator.frequency.setValueAtTime(880, ctx.currentTime);
      oscillator.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      oscillator.start(ctx.currentTime);
      oscillator.stop(ctx.currentTime + 0.3);
    } catch {}
  };

  const setupRealtime = (userId: string) => {
    // Lắng nghe tin nhắn mới trong các conversation của user
    supabase
      .channel(`notifications-${userId}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, async (payload) => {
        const msg = payload.new as any;
        // Không thông báo tin nhắn của chính mình
        if (msg.sender_id === userId) return;

        // Kiểm tra user có trong conversation này không
        const { data: conv } = await supabase
          .from('conversations')
          .select('id, ga(ten)')
          .eq('id', msg.conversation_id)
          .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
          .maybeSingle();

        if (!conv) return;

        // Phát âm thanh
        playSound();

        // Thêm vào danh sách thông báo
        setNotifications(prev => [{
          id: msg.id,
          conv_id: msg.conversation_id,
          ga_id: (conv as any).ga?.id,
          ga_ten: (conv as any).ga?.ten || 'Gà',
          noi_dung: msg.noi_dung,
          time: new Date(),
          read: false,
        }, ...prev.slice(0, 9)]);

        setUnreadCount(prev => prev + 1);
      })
      .subscribe();
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
          <Link href="/ai-phan-tich" className="bg-yellow-400 text-black px-3 py-1 rounded-full text-xs font-bold hover:bg-yellow-300 transition hidden sm:block">
            AI Phân Tích
          </Link>

          {user ? (
            <>
              {/* THÔNG BÁO */}
              <div className="relative">
                <button onClick={() => { setShowNotif(!showNotif); if (!showNotif) markAllRead(); }}
                  className="relative hover:text-yellow-300 transition">
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
                        <button onClick={() => setNotifications([])} className="text-xs text-gray-400 hover:text-red-500">Xóa tất cả</button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-gray-400 text-sm">Chưa có thông báo</div>
                    ) : (
                      <div className="max-h-72 overflow-y-auto">
                        {notifications.map(n => (
                          <Link key={n.id} href={`/chat/${n.conv_id}`}
                            onClick={() => setShowNotif(false)}
                            className={`flex items-start gap-3 px-4 py-3 hover:bg-gray-50 border-b transition ${!n.read ? 'bg-red-50' : ''}`}>
                            <div className="w-8 h-8 bg-[#8B1A1A] rounded-full flex items-center justify-center text-white text-sm flex-shrink-0">🐓</div>
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold text-gray-800 truncate">{n.ga_ten}</div>
                              <div className="text-xs text-gray-600 truncate">{n.noi_dung}</div>
                              <div className="text-xs text-gray-400 mt-0.5">
                                {n.time.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                              </div>
                            </div>
                            {!n.read && <div className="w-2 h-2 bg-red-500 rounded-full flex-shrink-0 mt-1"></div>}
                          </Link>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* CHAT ICON */}
              <Link href="/tin-nhan" className="relative hover:text-yellow-300 transition">
                <MessageCircle className="w-5 h-5" />
              </Link>

              {/* USER MENU */}
              <div className="relative">
                <button onClick={() => setUserMenuOpen(!userMenuOpen)}
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
              <Link href="/login" className="text-sm font-semibold hover:text-yellow-300 transition hidden sm:block">
                Đăng nhập
              </Link>
              <Link href="/register" className="bg-yellow-400 text-black px-3 py-1.5 rounded-full text-xs font-bold hover:bg-yellow-300 transition">
                Đăng ký
              </Link>
            </div>
          )}

          <Menu className="w-5 h-5 cursor-pointer md:hidden" onClick={() => setMenuOpen(!menuOpen)} />
        </div>
      </div>

      {menuOpen && (
        <div className="md:hidden bg-[#6B0F0F] px-4 py-3 flex flex-col gap-3 text-sm">
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
    </header>
  );
}
