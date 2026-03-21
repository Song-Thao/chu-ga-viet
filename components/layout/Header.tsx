'use client';

import Link from 'next/link';
import { Search, Bell, MessageCircle, User, Menu, LogOut } from 'lucide-react';
import { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useChat } from '@/components/chat/ChatContext';

function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)}p`;
  if (s < 86400) return `${Math.floor(s / 3600)}h`;
  return `${Math.floor(s / 86400)}d`;
}

export default function Header() {
  const router = useRouter();
  const { openChat } = useChat();

  const [user, setUser] = useState<any>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  // Thông báo
  const [showNotif, setShowNotif] = useState(false);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotif, setUnreadNotif] = useState(0);

  // Inbox (lịch sử chat)
  const [showInbox, setShowInbox] = useState(false);
  const [conversations, setConversations] = useState<any[]>([]);
  const [loadingConvs, setLoadingConvs] = useState(false);

  const notifRef = useRef<HTMLDivElement>(null);
  const inboxRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);
  const mobileMenuRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
      if (data.user) setupRealtime(data.user.id);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_, session) => {
      setUser(session?.user ?? null);
      if (session?.user) setupRealtime(session.user.id);
    });
    return () => subscription.unsubscribe();
  }, []);

  // Click outside đóng dropdown
  useEffect(() => {
    function handler(e: MouseEvent) {
      const t = e.target as Node;
      if (notifRef.current && !notifRef.current.contains(t)) setShowNotif(false);
      if (inboxRef.current && !inboxRef.current.contains(t)) setShowInbox(false);
      if (userMenuRef.current && !userMenuRef.current.contains(t)) setUserMenuOpen(false);
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(t)) setMenuOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  useEffect(() => {
    function handler(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setShowNotif(false); setShowInbox(false);
        setUserMenuOpen(false); setMenuOpen(false);
      }
    }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, []);

  function playSound() {
    try {
      if (!audioRef.current)
        audioRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
      const ctx = audioRef.current;
      const osc = ctx.createOscillator(); const gain = ctx.createGain();
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(880, ctx.currentTime);
      osc.frequency.setValueAtTime(1100, ctx.currentTime + 0.1);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 0.3);
    } catch {}
  }

  function setupRealtime(userId: string) {
    supabase.channel(`hdr-notif-${userId}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, async (payload) => {
        const msg = payload.new as any;
        if (msg.sender_id === userId) return;

        const { data: conv } = await supabase
          .from('conversations')
          .select('id, ga_id, type, seller_id, buyer_id, ga(ten, ga_images(url, is_primary))')
          .eq('id', msg.conversation_id)
          .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
          .maybeSingle();
        if (!conv) return;

        playSound();
        const gaData = (conv as any).ga;
        const gaAnh = gaData?.ga_images?.find((i: any) => i.is_primary)?.url
          || gaData?.ga_images?.[0]?.url || '';
        const doiPhuongId = (conv as any).buyer_id === userId
          ? (conv as any).seller_id : (conv as any).buyer_id;

        setNotifications(prev => [{
          id: msg.id,
          conv_id: conv.id,
          type: (conv as any).type || 'product',
          ga_id: conv.ga_id,
          ga_ten: gaData?.ten || 'Gà',
          ga_anh: gaAnh,
          doi_phuong_id: doiPhuongId,
          noi_dung: msg.noi_dung,
          time: new Date().toISOString(),
          read: false,
        }, ...prev.slice(0, 19)]);
        setUnreadNotif(n => n + 1);
      }).subscribe();
  }

  // Click thông báo → mở chat popup + xóa thông báo
  async function handleNotifClick(n: any) {
    setShowNotif(false);
    setNotifications(prev => prev.filter(x => x.id !== n.id));
    setUnreadNotif(prev => Math.max(0, prev - 1));
    await openChat({
      convId: n.conv_id,
      type: n.type || 'product',
      gaId: n.ga_id,
      gaTen: n.ga_ten,
      gaAnh: n.ga_anh,
      doiPhuongId: n.doi_phuong_id,
    });
  }

  // Mở inbox → load conversations
  async function toggleInbox() {
    const next = !showInbox;
    setShowInbox(next);
    setShowNotif(false);
    if (next && user) {
      setLoadingConvs(true);
      const { data: convData } = await supabase
        .from('conversations')
        .select('id, ga_id, type, buyer_id, seller_id, created_at')
        .or(`buyer_id.eq.${user.id},seller_id.eq.${user.id}`)
        .order('created_at', { ascending: false })
        .limit(20);

      if (convData) {
        const enriched = await Promise.all(convData.map(async (c: any) => {
          const { data: ga } = await supabase.from('ga')
            .select('ten, ga_images(url, is_primary)').eq('id', c.ga_id).single();
          const dpId = c.buyer_id === user.id ? c.seller_id : c.buyer_id;
          const { data: dp } = await supabase.from('profiles')
            .select('username').eq('id', dpId).maybeSingle();
          const { data: lastMsg } = await supabase.from('messages')
            .select('noi_dung, created_at').eq('conversation_id', c.id)
            .order('created_at', { ascending: false }).limit(1).maybeSingle();
          const gaAnh = (ga as any)?.ga_images?.find((i: any) => i.is_primary)?.url
            || (ga as any)?.ga_images?.[0]?.url || '';
          return {
            ...c,
            ga_ten: (ga as any)?.ten || 'Gà',
            ga_anh: gaAnh,
            doi_phuong_id: dpId,
            doi_phuong_name: dp?.username || 'Người dùng',
            last_msg: lastMsg,
          };
        }));
        setConversations(enriched);
      }
      setLoadingConvs(false);
    }
  }

  // Click conversation trong inbox → mở chat popup
  async function handleConvClick(c: any) {
    setShowInbox(false);
    await openChat({
      convId: c.id,
      type: c.type || 'product',
      gaId: c.ga_id,
      gaTen: c.ga_ten,
      gaAnh: c.ga_anh,
      doiPhuongId: c.doi_phuong_id,
      doiPhuongName: c.doi_phuong_name,
    });
  }

  function toggleNotif() {
    setShowNotif(n => !n);
    setShowInbox(false);
    if (!showNotif) setUnreadNotif(0);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUserMenuOpen(false);
    router.push('/'); router.refresh();
  };

  const userName = user?.user_metadata?.username
    || user?.email?.split('@')[0] || 'Tài khoản';

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
              {/* ── CHUÔNG THÔNG BÁO ── */}
              <div className="relative" ref={notifRef}>
                <button onClick={toggleNotif} className="relative hover:text-yellow-300 transition p-1">
                  <Bell className="w-5 h-5" />
                  {unreadNotif > 0 && (
                    <span className="absolute -top-1 -right-1 bg-yellow-400 text-black text-xs font-black w-4 h-4 rounded-full flex items-center justify-center">
                      {unreadNotif > 9 ? '9+' : unreadNotif}
                    </span>
                  )}
                </button>

                {showNotif && (
                  <div className="absolute right-0 top-10 bg-white text-gray-800 rounded-xl shadow-xl w-72 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b flex justify-between items-center">
                      <span className="font-bold text-sm">🔔 Thông báo</span>
                      {notifications.length > 0 && (
                        <button onClick={() => { setNotifications([]); setUnreadNotif(0); }}
                          className="text-xs text-gray-400 hover:text-red-500">Xóa tất cả</button>
                      )}
                    </div>
                    {notifications.length === 0 ? (
                      <div className="px-4 py-6 text-center text-gray-400 text-sm">Chưa có thông báo mới</div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto divide-y">
                        {notifications.map(n => (
                          <button key={n.id} onClick={() => handleNotifClick(n)}
                            className={`w-full flex items-start gap-3 px-4 py-3 hover:bg-gray-50 transition text-left ${!n.read ? 'bg-red-50' : ''}`}>
                            {n.ga_anh
                              ? <img src={n.ga_anh} alt="" className="w-9 h-9 rounded-lg object-cover flex-shrink-0" />
                              : <div className="w-9 h-9 bg-[#8B1A1A] rounded-full flex items-center justify-center text-white flex-shrink-0">🐓</div>
                            }
                            <div className="flex-1 min-w-0">
                              <div className="text-xs font-bold truncate">{n.ga_ten}</div>
                              <div className="text-xs text-gray-500 truncate">{n.noi_dung}</div>
                              <div className="text-xs text-gray-400">{timeAgo(n.time)}</div>
                            </div>
                            {!n.read && <div className="w-2 h-2 bg-red-500 rounded-full mt-1 flex-shrink-0" />}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── ICON TIN NHẮN → INBOX ── */}
              <div className="relative" ref={inboxRef}>
                <button onClick={toggleInbox} className="relative hover:text-yellow-300 transition p-1">
                  <MessageCircle className="w-5 h-5" />
                </button>

                {showInbox && (
                  <div className="absolute right-0 top-10 bg-white text-gray-800 rounded-xl shadow-xl w-80 z-50 overflow-hidden">
                    <div className="px-4 py-3 border-b flex justify-between items-center">
                      <span className="font-bold text-sm">💬 Tin nhắn</span>
                      <Link href="/tin-nhan" onClick={() => setShowInbox(false)}
                        className="text-xs text-[#8B1A1A] font-semibold hover:underline">
                        Xem tất cả
                      </Link>
                    </div>
                    {loadingConvs ? (
                      <div className="px-4 py-6 text-center text-gray-400 text-sm">⏳ Đang tải...</div>
                    ) : conversations.length === 0 ? (
                      <div className="px-4 py-6 text-center text-gray-400 text-sm">Chưa có tin nhắn nào</div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto divide-y">
                        {conversations.map(c => (
                          <button key={c.id} onClick={() => handleConvClick(c)}
                            className="w-full flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition text-left">
                            {c.ga_anh
                              ? <img src={c.ga_anh} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                              : <div className="w-10 h-10 bg-orange-800 rounded-lg flex items-center justify-center text-xl flex-shrink-0">🐓</div>
                            }
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-bold truncate">{c.ga_ten}</div>
                              <div className="text-xs text-[#8B1A1A] font-medium truncate">{c.doi_phuong_name}</div>
                              {c.last_msg && (
                                <div className="text-xs text-gray-400 truncate">{c.last_msg.noi_dung}</div>
                              )}
                            </div>
                            {c.last_msg && (
                              <div className="text-xs text-gray-400 flex-shrink-0">{timeAgo(c.last_msg.created_at)}</div>
                            )}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* ── USER MENU ── */}
              <div className="relative" ref={userMenuRef}>
                <button onClick={() => { setUserMenuOpen(p => !p); setShowNotif(false); setShowInbox(false); }}
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

          {/* Mobile menu */}
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
