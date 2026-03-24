'use client';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Tab = 'dashboard' | 'users' | 'posts' | 'orders' | 'config' | 'content';

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef<HTMLDivElement>(null);

  const [stats, setStats] = useState({ users: 0, posts: 0, orders: 0, newUsers: 0, newPosts: 0 });
  const [users, setUsers] = useState<any[]>([]);
  const [posts, setPosts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [config, setConfig] = useState<any>({
    phi_percent: 2, phi_codinh: 0, coc_percent: 30, bat_buoc_escrow: false,
    tk_ten: '', tk_so: '', tk_ngan_hang: '', tk_bin: '', zalo: '', shopee_link: '',
  });
  const [configSaving, setConfigSaving] = useState(false);
  const [configSaved, setConfigSaved] = useState(false);
  const [banners, setBanners] = useState<any[]>([
    { vi_tri: 1, tieu_de: 'THUỐC BỔ GÀ', tieu_de_phu: 'Tăng đòn • Tăng da • Tăng sức bền', link: '' },
    { vi_tri: 2, tieu_de: 'MÁY ẤP TRỨNG', tieu_de_phu: 'Công nghệ mới nhất 2024', link: '' },
    { vi_tri: 3, tieu_de: 'THỨC ĂN', tieu_de_phu: 'Dinh dưỡng cao cấp', link: '' },
  ]);
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerSaved, setBannerSaved] = useState(false);
  const [newPost, setNewPost] = useState({ tieu_de: '', loai: 'Tin tức', noi_dung: '' });
  const [postSaving, setPostSaving] = useState(false);
  const [postSaved, setPostSaved] = useState(false);

  useEffect(() => { checkAdmin(); }, []);

  // Close drawer on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (drawerOpen && drawerRef.current && !drawerRef.current.contains(e.target as Node)) {
        setDrawerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [drawerOpen]);

  const checkAdmin = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') { router.push('/'); return; }
    await Promise.all([fetchStats(), fetchUsers(), fetchPosts(), fetchOrders(), fetchConfig(), fetchBanners()]);
    setLoading(false);
  };

  const fetchStats = async () => {
    const today = new Date().toISOString().split('T')[0];
    const [{ count: totalUsers }, { count: totalPosts }, { count: totalOrders },
      { count: newUsers }, { count: newPosts }] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('ga').select('*', { count: 'exact', head: true }),
      supabase.from('orders').select('*', { count: 'exact', head: true }),
      supabase.from('profiles').select('*', { count: 'exact', head: true }).gte('created_at', today),
      supabase.from('ga').select('*', { count: 'exact', head: true }).gte('created_at', today),
    ]);
    setStats({ users: totalUsers || 0, posts: totalPosts || 0, orders: totalOrders || 0, newUsers: newUsers || 0, newPosts: newPosts || 0 });
  };

  const fetchUsers = async () => {
    const { data } = await supabase.from('profiles').select('id, username, phone, role, status, trust_score, created_at').order('created_at', { ascending: false }).limit(50);
    setUsers(data || []);
  };

  const fetchPosts = async () => {
    const { data } = await supabase.from('ga').select('id, ten, loai_ga, gia, khu_vuc, status, created_at, view_count, ga_images(url, is_primary), ai_analysis(total_score)').order('created_at', { ascending: false }).limit(50);
    setPosts(data || []);
  };

  const fetchOrders = async () => {
    const { data } = await supabase.from('orders').select('id, gia, tien_coc, ma_giao_dich, status, created_at, ga(ten)').order('created_at', { ascending: false }).limit(50);
    setOrders(data || []);
  };

  const fetchConfig = async () => {
    const { data } = await supabase.from('config').select('*').single();
    if (data) setConfig(data);
  };

  const fetchBanners = async () => {
    const { data } = await supabase.from('banners').select('*').order('vi_tri');
    if (data && data.length > 0) setBanners(data);
  };

  const lockUser = async (userId: string, lock: boolean) => {
    await supabase.from('profiles').update({ status: lock ? 'locked' : 'active' }).eq('id', userId);
    setUsers(prev => prev.map(u => u.id === userId ? { ...u, status: lock ? 'locked' : 'active' } : u));
  };

  const updatePostStatus = async (postId: number, status: string) => {
    await supabase.from('ga').update({ status }).eq('id', postId);
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status } : p));
  };

  const updateOrderStatus = async (orderId: number, status: string) => {
    await supabase.from('orders').update({ status }).eq('id', orderId);
    setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status } : o));
  };

  const saveConfig = async () => {
    setConfigSaving(true);
    await supabase.from('config').update({
      phi_percent: config.phi_percent, phi_codinh: config.phi_codinh,
      coc_percent: config.coc_percent, bat_buoc_escrow: config.bat_buoc_escrow,
      tk_ten: config.tk_ten, tk_so: config.tk_so, tk_ngan_hang: config.tk_ngan_hang,
      tk_bin: config.tk_bin, zalo: config.zalo, shopee_link: config.shopee_link,
      updated_at: new Date().toISOString(),
    }).eq('id', config.id);
    setConfigSaving(false); setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
  };

  const saveBanners = async () => {
    setBannerSaving(true);
    await Promise.all(banners.map(b =>
      supabase.from('banners').update({ tieu_de: b.tieu_de, tieu_de_phu: b.tieu_de_phu, link: b.link, updated_at: new Date().toISOString() }).eq('vi_tri', b.vi_tri)
    ));
    setBannerSaving(false); setBannerSaved(true);
    setTimeout(() => setBannerSaved(false), 2000);
  };

  const savePost = async () => {
    if (!newPost.tieu_de || !newPost.noi_dung) return;
    setPostSaving(true);
    await supabase.from('posts').insert({ noi_dung: newPost.noi_dung, loai: newPost.loai, tieu_de: newPost.tieu_de });
    setPostSaving(false); setPostSaved(true);
    setNewPost({ tieu_de: '', loai: 'Tin tức', noi_dung: '' });
    setTimeout(() => setPostSaved(false), 2000);
  };

  const updateBanner = (idx: number, field: string, value: string) => {
    setBanners(prev => prev.map((b, i) => i === idx ? { ...b, [field]: value } : b));
  };

  const getStatusColor = (status: string) => ({
    active: 'bg-green-100 text-green-700', locked: 'bg-red-100 text-red-700',
    pending: 'bg-yellow-100 text-yellow-700', sold: 'bg-blue-100 text-blue-700',
    hidden: 'bg-gray-100 text-gray-600', deleted: 'bg-red-100 text-red-700',
    pending_deposit: 'bg-yellow-100 text-yellow-700', deposited: 'bg-blue-100 text-blue-700',
    completed: 'bg-green-100 text-green-700', disputed: 'bg-red-100 text-red-700',
    refunded: 'bg-gray-100 text-gray-600',
  }[status] || 'bg-gray-100 text-gray-600');

  const getStatusLabel = (status: string) => ({
    active: 'Hoạt động', locked: 'Bị khóa', pending: 'Chờ duyệt',
    sold: 'Đã bán', hidden: 'Đã ẩn', deleted: 'Đã xóa',
    pending_deposit: 'Chờ cọc', deposited: 'Đã cọc',
    completed: 'Hoàn tất', disputed: 'Tranh chấp', refunded: 'Hoàn tiền',
  }[status] || status);

  const menuItems: { key: Tab; icon: string; label: string }[] = [
    { key: 'dashboard', icon: '📊', label: 'Dashboard' },
    { key: 'users', icon: '👥', label: 'Người dùng' },
    { key: 'posts', icon: '🐓', label: 'Bài đăng' },
    { key: 'orders', icon: '💰', label: 'Giao dịch' },
    { key: 'config', icon: '⚙️', label: 'Cài đặt' },
    { key: 'content', icon: '📝', label: 'Nội dung' },
  ];

  const handleNav = (key: Tab) => { setTab(key); setDrawerOpen(false); };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#8B1A1A] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <div className="text-gray-500 text-sm">Đang tải Admin...</div>
      </div>
    </div>
  );

  const currentLabel = menuItems.find(m => m.key === tab)?.label || '';
  const currentIcon = menuItems.find(m => m.key === tab)?.icon || '';

  return (
    <div className="min-h-screen bg-gray-100">

      {/* ── MOBILE DRAWER OVERLAY ── */}
      {drawerOpen && (
        <div className="fixed inset-0 bg-black/50 z-40 md:hidden" onClick={() => setDrawerOpen(false)} />
      )}

      {/* ── SIDEBAR — desktop: fixed left | mobile: drawer ── */}
      <aside
        ref={drawerRef}
        className={`
          fixed top-0 left-0 h-full w-[72%] max-w-[280px] bg-[#8B1A1A] text-white z-50 flex flex-col
          transition-transform duration-300
          md:translate-x-0 md:w-56
          ${drawerOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
        `}
      >
        <div className="p-3 border-b border-red-700 flex items-center justify-between">
          <div>
            <div className="font-black text-base">🐓 Admin</div>
            <div className="text-red-300 text-xs">Chủ Gà Việt</div>
          </div>
          <button onClick={() => setDrawerOpen(false)} className="md:hidden w-7 h-7 bg-white/20 rounded-full flex items-center justify-center text-sm">✕</button>
        </div>

        <nav className="flex-1 py-1 overflow-y-auto">
          {menuItems.map(item => (
            <button key={item.key} onClick={() => handleNav(item.key)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 text-sm font-semibold transition ${tab === item.key ? 'bg-white/20 border-r-4 border-yellow-400' : 'hover:bg-white/10'}`}>
              <span className="text-base">{item.icon}</span>
              <span>{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-3 border-t border-red-700">
          <a href="/" className="text-red-300 text-xs hover:text-white transition">← Về trang web</a>
        </div>
      </aside>

      {/* ── MAIN CONTENT ── */}
      <div className="md:ml-56 flex flex-col min-h-screen">

        {/* ── TOP BAR ── */}
        <header className="bg-white border-b sticky top-0 z-30 flex items-center gap-3 px-3 py-2.5 shadow-sm">
          <button
            onClick={() => setDrawerOpen(true)}
            className="md:hidden w-9 h-9 bg-[#8B1A1A] text-white rounded-lg flex items-center justify-center text-lg flex-shrink-0"
          >☰</button>
          <div className="flex items-center gap-2 min-w-0">
            <span className="text-lg">{currentIcon}</span>
            <span className="font-black text-gray-800 text-base truncate">{currentLabel}</span>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <span className="text-xs text-gray-400 hidden sm:block">Admin Panel</span>
          </div>
        </header>

        {/* ── PAGE CONTENT ── */}
        <main className="flex-1 p-3 md:p-5">

          {/* DASHBOARD */}
          {tab === 'dashboard' && (
            <div>
              {/* Stats grid — 2 col mobile, 3 col desktop */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 md:gap-4 mb-4">
                {[
                  { label: 'Người dùng', value: stats.users, sub: `+${stats.newUsers} hôm nay`, icon: '👥', color: 'bg-blue-500' },
                  { label: 'Bài đăng', value: stats.posts, sub: `+${stats.newPosts} hôm nay`, icon: '🐓', color: 'bg-green-500' },
                  { label: 'Giao dịch', value: stats.orders, sub: 'tất cả', icon: '💰', color: 'bg-yellow-500' },
                  { label: 'User mới', value: stats.newUsers, sub: 'hôm nay', icon: '🆕', color: 'bg-red-500' },
                  { label: 'Bài mới', value: stats.newPosts, sub: 'hôm nay', icon: '📋', color: 'bg-teal-500' },
                  { label: 'Shopee', value: '🛒', sub: config.shopee_link ? 'Đã cấu hình' : 'Chưa cấu hình', icon: '🛒', color: 'bg-orange-500' },
                ].map((s, i) => (
                  <div key={i} className="bg-white rounded-xl p-3 shadow-sm flex items-center gap-3">
                    <div className={`w-9 h-9 ${s.color} rounded-lg flex items-center justify-center text-white text-sm flex-shrink-0`}>{s.icon}</div>
                    <div className="min-w-0">
                      <div className="font-black text-xl text-gray-800 leading-none">{s.value}</div>
                      <div className="text-xs text-gray-600 truncate">{s.label}</div>
                      <div className="text-xs text-gray-400 truncate">{s.sub}</div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="grid md:grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-3 shadow-sm">
                  <h3 className="font-bold text-gray-700 mb-2 text-sm">🐓 Gà mới nhất</h3>
                  <div className="space-y-1.5">
                    {posts.slice(0, 5).map(p => (
                      <div key={p.id} className="flex justify-between items-center">
                        <span className="text-xs text-gray-700 truncate flex-1">{p.ten}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0 ${getStatusColor(p.status)}`}>{getStatusLabel(p.status)}</span>
                      </div>
                    ))}
                    {posts.length === 0 && <div className="text-gray-400 text-xs">Chưa có bài đăng</div>}
                  </div>
                </div>
                <div className="bg-white rounded-xl p-3 shadow-sm">
                  <h3 className="font-bold text-gray-700 mb-2 text-sm">💰 Giao dịch gần đây</h3>
                  <div className="space-y-1.5">
                    {orders.slice(0, 5).map(o => (
                      <div key={o.id} className="flex justify-between items-center">
                        <span className="text-xs text-gray-700 font-mono truncate flex-1">{o.ma_giao_dich}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ml-2 flex-shrink-0 ${getStatusColor(o.status)}`}>{getStatusLabel(o.status)}</span>
                      </div>
                    ))}
                    {orders.length === 0 && <div className="text-gray-400 text-xs">Chưa có giao dịch</div>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* USERS */}
          {tab === 'users' && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>{['Người dùng', 'SĐT', 'Vai trò', 'Trạng thái', ''].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-gray-600 font-semibold whitespace-nowrap">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {users.map(u => (
                      <tr key={u.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2">
                          <div className="font-semibold text-gray-800 text-xs">{u.username || 'Ẩn'}</div>
                          <div className="text-xs text-gray-400">{u.id.slice(0, 8)}...</div>
                        </td>
                        <td className="px-3 py-2 text-gray-600">{u.phone || '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                            {u.role === 'admin' ? '👑' : 'User'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full ${getStatusColor(u.status || 'active')}`}>
                            {getStatusLabel(u.status || 'active')}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {u.role !== 'admin' && (
                            <button onClick={() => lockUser(u.id, u.status !== 'locked')}
                              className={`text-xs px-2 py-1 rounded-full font-semibold transition whitespace-nowrap ${u.status === 'locked' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                              {u.status === 'locked' ? '🔓' : '🔒'}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* POSTS */}
          {tab === 'posts' && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>{['Gà', 'Giá', 'KV', 'AI', 'TT', ''].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-gray-600 font-semibold whitespace-nowrap">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {posts.map(p => {
                      const anh = p.ga_images?.find((i: any) => i.is_primary)?.url || p.ga_images?.[0]?.url;
                      const score = p.ai_analysis?.[0]?.total_score;
                      return (
                        <tr key={p.id} className="hover:bg-gray-50">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-1.5">
                              {anh ? <img src={anh} alt="" className="w-8 h-8 object-cover rounded-lg flex-shrink-0" />
                                : <div className="w-8 h-8 bg-orange-800 rounded-lg flex items-center justify-center text-sm flex-shrink-0">🐓</div>}
                              <div className="min-w-0">
                                <div className="font-semibold text-gray-800 truncate max-w-[80px] md:max-w-none">{p.ten}</div>
                                <div className="text-xs text-gray-400">{p.loai_ga}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 font-semibold text-[#8B1A1A] whitespace-nowrap">{(parseInt(p.gia) / 1000000).toFixed(1)}M</td>
                          <td className="px-3 py-2 text-gray-600 whitespace-nowrap hidden sm:table-cell">{p.khu_vuc}</td>
                          <td className="px-3 py-2">{score ? <span className="text-yellow-600 font-bold">{score}</span> : '—'}</td>
                          <td className="px-3 py-2">
                            <span className={`text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap ${getStatusColor(p.status)}`}>{getStatusLabel(p.status)}</span>
                          </td>
                          <td className="px-3 py-2">
                            <div className="flex gap-1">
                              {p.status !== 'active' && <button onClick={() => updatePostStatus(p.id, 'active')} className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded">✓</button>}
                              {p.status !== 'hidden' && <button onClick={() => updatePostStatus(p.id, 'hidden')} className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded">Ẩn</button>}
                              <button onClick={() => updatePostStatus(p.id, 'deleted')} className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">Xóa</button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* ORDERS */}
          {tab === 'orders' && (
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full text-xs md:text-sm">
                  <thead className="bg-gray-50 border-b">
                    <tr>{['Mã GD', 'Gà', 'Giá trị', 'Cọc', 'Trạng thái', 'Thao tác'].map(h => (
                      <th key={h} className="text-left px-3 py-2 text-gray-600 font-semibold whitespace-nowrap">{h}</th>
                    ))}</tr>
                  </thead>
                  <tbody className="divide-y">
                    {orders.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400 text-xs">Chưa có giao dịch nào</td></tr>}
                    {orders.map(o => (
                      <tr key={o.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 font-mono font-bold text-[#8B1A1A] text-xs">{o.ma_giao_dich?.slice(-8)}</td>
                        <td className="px-3 py-2 text-gray-700 max-w-[80px] truncate">{o.ga?.ten || '—'}</td>
                        <td className="px-3 py-2 font-semibold whitespace-nowrap">{(parseInt(o.gia) / 1000000).toFixed(1)}M</td>
                        <td className="px-3 py-2 text-blue-600 whitespace-nowrap">{o.tien_coc ? (parseInt(o.tien_coc) / 1000).toFixed(0) + 'K' : '—'}</td>
                        <td className="px-3 py-2">
                          <span className={`text-xs px-1.5 py-0.5 rounded-full whitespace-nowrap ${getStatusColor(o.status)}`}>{getStatusLabel(o.status)}</span>
                        </td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1 flex-wrap">
                            {o.status === 'pending_deposit' && <button onClick={() => updateOrderStatus(o.id, 'deposited')} className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded whitespace-nowrap">✓ Cọc</button>}
                            {o.status === 'deposited' && <button onClick={() => updateOrderStatus(o.id, 'completed')} className="text-xs bg-green-100 text-green-700 px-1.5 py-0.5 rounded whitespace-nowrap">✓ Xong</button>}
                            {(o.status === 'deposited' || o.status === 'disputed') && <button onClick={() => updateOrderStatus(o.id, 'refunded')} className="text-xs bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">Hoàn</button>}
                            {!['disputed','completed','refunded'].includes(o.status) && <button onClick={() => updateOrderStatus(o.id, 'disputed')} className="text-xs bg-red-100 text-red-700 px-1.5 py-0.5 rounded">TChấp</button>}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* CONFIG */}
          {tab === 'config' && (
            <div className="space-y-3">
              <div className="grid md:grid-cols-2 gap-3">
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <h3 className="font-bold text-gray-700 mb-3 text-sm">💰 Phí giao dịch</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Phí giao dịch (%)</label>
                      <input type="number" value={config.phi_percent} step="0.5" onChange={e => setConfig({...config, phi_percent: parseFloat(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                    </div>
                    <div>
                      <label className="text-xs font-semibold text-gray-600 block mb-1">Tỷ lệ cọc (%)</label>
                      <input type="number" value={config.coc_percent} step="5" onChange={e => setConfig({...config, coc_percent: parseFloat(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                    </div>
                    <div className="flex items-center justify-between p-2.5 bg-gray-50 rounded-lg">
                      <div>
                        <div className="font-semibold text-xs text-gray-700">Bắt buộc qua sàn</div>
                        <div className="text-xs text-gray-400">Không cho phép tự do</div>
                      </div>
                      <button onClick={() => setConfig({...config, bat_buoc_escrow: !config.bat_buoc_escrow})}
                        className={`relative w-10 h-5 rounded-full transition-colors flex-shrink-0 ${config.bat_buoc_escrow ? 'bg-[#8B1A1A]' : 'bg-gray-300'}`}>
                        <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.bat_buoc_escrow ? 'translate-x-5' : 'translate-x-0.5'}`}></div>
                      </button>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <h3 className="font-bold text-gray-700 mb-3 text-sm">🏦 Tài khoản nhận tiền</h3>
                  <div className="space-y-2">
                    {[
                      { key: 'tk_ten', label: 'Tên tài khoản', placeholder: 'NGUYEN VAN A' },
                      { key: 'tk_so', label: 'Số tài khoản', placeholder: '1234567890' },
                      { key: 'tk_ngan_hang', label: 'Ngân hàng', placeholder: 'VietinBank' },
                      { key: 'tk_bin', label: 'BIN (cho QR)', placeholder: '970405' },
                      { key: 'zalo', label: 'Zalo liên hệ', placeholder: '0909000000' },
                    ].map(f => (
                      <div key={f.key}>
                        <label className="text-xs font-semibold text-gray-600 block mb-0.5">{f.label}</label>
                        <input value={config[f.key] || ''} placeholder={f.placeholder}
                          onChange={e => setConfig({...config, [f.key]: e.target.value})}
                          className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4">
                <h3 className="font-bold text-orange-800 mb-1 text-sm">🛒 Shopee Affiliate</h3>
                <p className="text-xs text-orange-600 mb-3">Dán link affiliate — banner tự cập nhật. Ai click mua hàng bạn được hoa hồng!</p>
                <div className="flex gap-2 items-end">
                  <div className="flex-1">
                    <label className="text-xs font-semibold text-orange-700 block mb-1">Link Shopee Affiliate</label>
                    <input value={config.shopee_link || ''} placeholder="https://s.shopee.vn/xxxxxxxxx"
                      onChange={e => setConfig({...config, shopee_link: e.target.value})}
                      className="w-full border-2 border-orange-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white" />
                  </div>
                  {config.shopee_link && (
                    <a href={config.shopee_link} target="_blank" className="bg-orange-500 text-white text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-orange-600 whitespace-nowrap">Test →</a>
                  )}
                </div>
              </div>

              {config.tk_bin && config.tk_so && (
                <div className="bg-white rounded-xl p-4 shadow-sm">
                  <h3 className="font-bold text-gray-700 mb-2 text-sm">📱 Preview QR</h3>
                  <img src={`https://img.vietqr.io/image/${config.tk_bin}-${config.tk_so}-compact2.png?accountName=${encodeURIComponent(config.tk_ten || '')}`}
                    alt="QR" className="w-32 h-32 rounded-xl border" />
                </div>
              )}

              <button onClick={saveConfig} disabled={configSaving}
                className={`w-full md:w-auto px-8 py-2.5 rounded-xl font-black text-white text-sm transition ${configSaved ? 'bg-green-600' : 'bg-[#8B1A1A] hover:bg-[#6B0F0F]'} disabled:opacity-50`}>
                {configSaving ? '⏳ Đang lưu...' : configSaved ? '✅ Đã lưu!' : '💾 Lưu cài đặt'}
              </button>
            </div>
          )}

          {/* CONTENT */}
          {tab === 'content' && (
            <div className="space-y-3">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-1 text-sm">🖼️ Banner trang chủ</h3>
                <p className="text-xs text-gray-400 mb-3">Chỉnh tiêu đề, mô tả và link cho từng ô banner.</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-3">
                  {banners.map((b, idx) => (
                    <div key={idx} className="border-2 border-gray-100 rounded-xl p-3 hover:border-red-200 transition">
                      <div className="text-xs font-bold text-gray-400 mb-1.5">Ô {b.vi_tri}</div>
                      <div className="space-y-1.5">
                        {[
                          { key: 'tieu_de', label: 'Tiêu đề', placeholder: 'THUỐC BỔ GÀ' },
                          { key: 'tieu_de_phu', label: 'Mô tả phụ', placeholder: 'Tăng đòn...' },
                          { key: 'link', label: 'Link', placeholder: 'https://...' },
                        ].map(f => (
                          <div key={f.key}>
                            <label className="text-xs font-semibold text-gray-500 block mb-0.5">{f.label}</label>
                            <input value={b[f.key]} onChange={e => updateBanner(idx, f.key, e.target.value)}
                              placeholder={f.placeholder}
                              className="w-full border rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-red-300" />
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Preview */}
                <div className="grid grid-cols-3 gap-1.5 mb-3">
                  {banners.map((b, idx) => (
                    <div key={idx} className={`${idx === 0 ? 'bg-red-900' : idx === 1 ? 'bg-gray-700' : 'bg-yellow-800'} text-white p-2 rounded-lg`}>
                      <div className="text-xs font-black truncate">{b.tieu_de || 'Tiêu đề'}</div>
                      <div className="text-xs text-white/70 truncate">{b.tieu_de_phu || 'Mô tả'}</div>
                    </div>
                  ))}
                </div>

                <button onClick={saveBanners} disabled={bannerSaving}
                  className={`w-full md:w-auto px-6 py-2 rounded-xl font-black text-white text-sm transition ${bannerSaved ? 'bg-green-600' : 'bg-[#8B1A1A] hover:bg-[#6B0F0F]'} disabled:opacity-50`}>
                  {bannerSaving ? '⏳...' : bannerSaved ? '✅ Đã lưu!' : '💾 Lưu banner'}
                </button>
              </div>

              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-3 text-sm">📰 Thêm bài viết thư viện</h3>
                <div className="space-y-2">
                  <input value={newPost.tieu_de} onChange={e => setNewPost({...newPost, tieu_de: e.target.value})}
                    placeholder="Tiêu đề bài viết..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                  <select value={newPost.loai} onChange={e => setNewPost({...newPost, loai: e.target.value})}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
                    <option>Tin tức</option>
                    <option>Hướng dẫn</option>
                    <option>Kiến thức</option>
                  </select>
                  <textarea value={newPost.noi_dung} onChange={e => setNewPost({...newPost, noi_dung: e.target.value})}
                    placeholder="Nội dung bài viết..." rows={5}
                    className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
                  <button onClick={savePost} disabled={postSaving}
                    className={`w-full md:w-auto px-6 py-2 rounded-lg font-bold text-white text-sm transition ${postSaved ? 'bg-green-600' : 'bg-[#8B1A1A] hover:bg-[#6B0F0F]'} disabled:opacity-50`}>
                    {postSaving ? '⏳ Đang đăng...' : postSaved ? '✅ Đã đăng!' : '📝 Đăng bài viết'}
                  </button>
                </div>
              </div>
            </div>
          )}

        </main>
      </div>
    </div>
  );
}
