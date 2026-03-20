'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

type Tab = 'dashboard' | 'users' | 'posts' | 'orders' | 'config' | 'content';

export default function AdminPage() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('dashboard');
  const [loading, setLoading] = useState(true);

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

  // Banners
  const [banners, setBanners] = useState<any[]>([
    { vi_tri: 1, tieu_de: 'THUỐC BỔ GÀ', tieu_de_phu: 'Tăng đòn • Tăng da • Tăng sức bền', link: '' },
    { vi_tri: 2, tieu_de: 'MÁY ẤP TRỨNG', tieu_de_phu: 'Công nghệ mới nhất 2024', link: '' },
    { vi_tri: 3, tieu_de: 'THỨC ĂN', tieu_de_phu: 'Dinh dưỡng cao cấp', link: '' },
  ]);
  const [bannerSaving, setBannerSaving] = useState(false);
  const [bannerSaved, setBannerSaved] = useState(false);

  // Bài viết
  const [newPost, setNewPost] = useState({ tieu_de: '', loai: 'Tin tức', noi_dung: '' });
  const [postSaving, setPostSaving] = useState(false);
  const [postSaved, setPostSaved] = useState(false);

  useEffect(() => { checkAdmin(); }, []);

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

  // Actions
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
    setConfigSaving(false);
    setConfigSaved(true);
    setTimeout(() => setConfigSaved(false), 2000);
  };

  const saveBanners = async () => {
    setBannerSaving(true);
    await Promise.all(banners.map(b =>
      supabase.from('banners').update({
        tieu_de: b.tieu_de, tieu_de_phu: b.tieu_de_phu, link: b.link,
        updated_at: new Date().toISOString(),
      }).eq('vi_tri', b.vi_tri)
    ));
    setBannerSaving(false);
    setBannerSaved(true);
    setTimeout(() => setBannerSaved(false), 2000);
  };

  const savePost = async () => {
    if (!newPost.tieu_de || !newPost.noi_dung) return;
    setPostSaving(true);
    await supabase.from('posts').insert({
      noi_dung: newPost.noi_dung,
      loai: newPost.loai,
      tieu_de: newPost.tieu_de,
    });
    setPostSaving(false);
    setPostSaved(true);
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

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="text-center">
        <div className="w-10 h-10 border-4 border-[#8B1A1A] border-t-transparent rounded-full animate-spin mx-auto mb-3"></div>
        <div className="text-gray-500 text-sm">Đang tải Admin...</div>
      </div>
    </div>
  );

  const menuItems = [
    { key: 'dashboard', icon: '📊', label: 'Dashboard' },
    { key: 'users', icon: '👥', label: 'Người dùng' },
    { key: 'posts', icon: '🐓', label: 'Bài đăng' },
    { key: 'orders', icon: '💰', label: 'Giao dịch' },
    { key: 'config', icon: '⚙️', label: 'Cài đặt' },
    { key: 'content', icon: '📝', label: 'Nội dung' },
  ];

  return (
    <div className="flex min-h-screen bg-gray-100">
      {/* SIDEBAR */}
      <div className="w-56 bg-[#8B1A1A] text-white flex flex-col flex-shrink-0">
        <div className="p-4 border-b border-red-700">
          <div className="font-black text-lg">🐓 Admin</div>
          <div className="text-red-300 text-xs">Chủ Gà Việt</div>
        </div>
        <nav className="flex-1 py-2">
          {menuItems.map(item => (
            <button key={item.key} onClick={() => setTab(item.key as Tab)}
              className={`w-full text-left px-4 py-3 flex items-center gap-3 text-sm font-semibold transition ${tab === item.key ? 'bg-white/20 border-r-4 border-yellow-400' : 'hover:bg-white/10'}`}>
              <span>{item.icon}</span><span>{item.label}</span>
            </button>
          ))}
        </nav>
        <div className="p-4 border-t border-red-700">
          <a href="/" className="text-red-300 text-xs hover:text-white transition">← Về trang web</a>
        </div>
      </div>

      {/* MAIN */}
      <div className="flex-1 overflow-auto p-6">

        {/* DASHBOARD */}
        {tab === 'dashboard' && (
          <div>
            <h1 className="font-black text-2xl text-gray-800 mb-6">📊 Dashboard</h1>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Tổng người dùng', value: stats.users, sub: `+${stats.newUsers} hôm nay`, icon: '👥', color: 'bg-blue-500' },
                { label: 'Tổng bài đăng', value: stats.posts, sub: `+${stats.newPosts} hôm nay`, icon: '🐓', color: 'bg-green-500' },
                { label: 'Tổng giao dịch', value: stats.orders, sub: 'tất cả', icon: '💰', color: 'bg-yellow-500' },
                { label: 'User mới hôm nay', value: stats.newUsers, sub: 'đăng ký', icon: '🆕', color: 'bg-red-500' },
                { label: 'Bài mới hôm nay', value: stats.newPosts, sub: 'đăng bán', icon: '📋', color: 'bg-teal-500' },
                { label: 'Shopee Affiliate', value: '🛒', sub: config.shopee_link ? 'Đã cấu hình' : 'Chưa cấu hình', icon: '🛒', color: 'bg-orange-500' },
              ].map((s, i) => (
                <div key={i} className="bg-white rounded-xl p-4 shadow-sm">
                  <div className={`w-10 h-10 ${s.color} rounded-lg flex items-center justify-center text-white text-lg mb-3`}>{s.icon}</div>
                  <div className="font-black text-2xl text-gray-800">{s.value}</div>
                  <div className="text-sm text-gray-600 mt-0.5">{s.label}</div>
                  <div className="text-xs text-gray-400 mt-0.5">{s.sub}</div>
                </div>
              ))}
            </div>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-3">🐓 Gà mới nhất</h3>
                <div className="space-y-2">
                  {posts.slice(0, 5).map(p => (
                    <div key={p.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700 truncate flex-1">{p.ten}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${getStatusColor(p.status)}`}>{getStatusLabel(p.status)}</span>
                    </div>
                  ))}
                  {posts.length === 0 && <div className="text-gray-400 text-sm">Chưa có bài đăng</div>}
                </div>
              </div>
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-3">💰 Giao dịch gần đây</h3>
                <div className="space-y-2">
                  {orders.slice(0, 5).map(o => (
                    <div key={o.id} className="flex justify-between items-center text-sm">
                      <span className="text-gray-700 font-mono text-xs">{o.ma_giao_dich}</span>
                      <span className={`text-xs px-2 py-0.5 rounded-full ml-2 ${getStatusColor(o.status)}`}>{getStatusLabel(o.status)}</span>
                    </div>
                  ))}
                  {orders.length === 0 && <div className="text-gray-400 text-sm">Chưa có giao dịch</div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* USERS */}
        {tab === 'users' && (
          <div>
            <h1 className="font-black text-2xl text-gray-800 mb-6">👥 Quản lý người dùng</h1>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>{['Người dùng', 'SĐT', 'Vai trò', 'Trạng thái', 'Thao tác'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-600 font-semibold">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y">
                  {users.map(u => (
                    <tr key={u.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3">
                        <div className="font-semibold text-gray-800">{u.username || 'Ẩn'}</div>
                        <div className="text-xs text-gray-400">{u.id.slice(0, 8)}...</div>
                      </td>
                      <td className="px-4 py-3 text-gray-600">{u.phone || '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-gray-100 text-gray-600'}`}>
                          {u.role === 'admin' ? '👑 Admin' : 'User'}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(u.status || 'active')}`}>
                          {getStatusLabel(u.status || 'active')}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {u.role !== 'admin' && (
                          <button onClick={() => lockUser(u.id, u.status !== 'locked')}
                            className={`text-xs px-3 py-1 rounded-full font-semibold transition ${u.status === 'locked' ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-red-100 text-red-700 hover:bg-red-200'}`}>
                            {u.status === 'locked' ? '🔓 Mở khóa' : '🔒 Khóa'}
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
          <div>
            <h1 className="font-black text-2xl text-gray-800 mb-6">🐓 Quản lý bài đăng</h1>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>{['Gà', 'Giá', 'Khu vực', 'AI', 'Trạng thái', 'Thao tác'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-600 font-semibold">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y">
                  {posts.map(p => {
                    const anh = p.ga_images?.find((i: any) => i.is_primary)?.url || p.ga_images?.[0]?.url;
                    const score = p.ai_analysis?.[0]?.total_score;
                    return (
                      <tr key={p.id} className="hover:bg-gray-50">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-2">
                            {anh ? <img src={anh} alt="" className="w-10 h-10 object-cover rounded-lg" />
                              : <div className="w-10 h-10 bg-orange-800 rounded-lg flex items-center justify-center text-lg">🐓</div>}
                            <div>
                              <div className="font-semibold text-gray-800">{p.ten}</div>
                              <div className="text-xs text-gray-400">{p.loai_ga}</div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 font-semibold text-[#8B1A1A]">{parseInt(p.gia).toLocaleString('vi-VN')}đ</td>
                        <td className="px-4 py-3 text-gray-600">{p.khu_vuc}</td>
                        <td className="px-4 py-3">{score ? <span className="text-yellow-600 font-bold">⭐ {score}</span> : '—'}</td>
                        <td className="px-4 py-3">
                          <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(p.status)}`}>{getStatusLabel(p.status)}</span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex gap-1">
                            {p.status !== 'active' && <button onClick={() => updatePostStatus(p.id, 'active')} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">✓ Hiện</button>}
                            {p.status !== 'hidden' && <button onClick={() => updatePostStatus(p.id, 'hidden')} className="text-xs bg-gray-100 text-gray-600 px-2 py-1 rounded hover:bg-gray-200">Ẩn</button>}
                            <button onClick={() => updatePostStatus(p.id, 'deleted')} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">Xóa</button>
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
          <div>
            <h1 className="font-black text-2xl text-gray-800 mb-6">💰 Giao dịch & Escrow</h1>
            <div className="bg-white rounded-xl shadow-sm overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 border-b">
                  <tr>{['Mã GD', 'Gà', 'Giá trị', 'Tiền cọc', 'Trạng thái', 'Thao tác'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-gray-600 font-semibold">{h}</th>
                  ))}</tr>
                </thead>
                <tbody className="divide-y">
                  {orders.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-gray-400">Chưa có giao dịch nào</td></tr>}
                  {orders.map(o => (
                    <tr key={o.id} className="hover:bg-gray-50">
                      <td className="px-4 py-3 font-mono text-xs font-bold text-[#8B1A1A]">{o.ma_giao_dich}</td>
                      <td className="px-4 py-3 text-gray-700">{o.ga?.ten || '—'}</td>
                      <td className="px-4 py-3 font-semibold">{parseInt(o.gia).toLocaleString('vi-VN')}đ</td>
                      <td className="px-4 py-3 text-blue-600 font-semibold">{o.tien_coc ? parseInt(o.tien_coc).toLocaleString('vi-VN') + 'đ' : '—'}</td>
                      <td className="px-4 py-3">
                        <span className={`text-xs px-2 py-0.5 rounded-full ${getStatusColor(o.status)}`}>{getStatusLabel(o.status)}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex gap-1 flex-wrap">
                          {o.status === 'pending_deposit' && <button onClick={() => updateOrderStatus(o.id, 'deposited')} className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded hover:bg-blue-200">✓ Nhận cọc</button>}
                          {o.status === 'deposited' && <button onClick={() => updateOrderStatus(o.id, 'completed')} className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded hover:bg-green-200">✓ Hoàn tất</button>}
                          {(o.status === 'deposited' || o.status === 'disputed') && <button onClick={() => updateOrderStatus(o.id, 'refunded')} className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded hover:bg-orange-200">Hoàn tiền</button>}
                          {!['disputed','completed','refunded'].includes(o.status) && <button onClick={() => updateOrderStatus(o.id, 'disputed')} className="text-xs bg-red-100 text-red-700 px-2 py-1 rounded hover:bg-red-200">Tranh chấp</button>}
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
          <div>
            <h1 className="font-black text-2xl text-gray-800 mb-6">⚙️ Cài đặt hệ thống</h1>
            <div className="grid md:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-4">💰 Phí giao dịch</h3>
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-semibold text-gray-600 block mb-1">Phí giao dịch (%)</label>
                    <input type="number" value={config.phi_percent} step="0.5" onChange={e => setConfig({...config, phi_percent: parseFloat(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                  </div>
                  <div>
                    <label className="text-sm font-semibold text-gray-600 block mb-1">Tỷ lệ cọc (%)</label>
                    <input type="number" value={config.coc_percent} step="5" onChange={e => setConfig({...config, coc_percent: parseFloat(e.target.value)})} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-semibold text-sm text-gray-700">Bắt buộc qua sàn</div>
                      <div className="text-xs text-gray-400">Không cho phép tự do</div>
                    </div>
                    <button onClick={() => setConfig({...config, bat_buoc_escrow: !config.bat_buoc_escrow})}
                      className={`relative w-12 h-6 rounded-full transition-colors ${config.bat_buoc_escrow ? 'bg-[#8B1A1A]' : 'bg-gray-300'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${config.bat_buoc_escrow ? 'translate-x-7' : 'translate-x-1'}`}></div>
                    </button>
                  </div>
                </div>
              </div>

              <div className="bg-white rounded-xl p-5 shadow-sm">
                <h3 className="font-bold text-gray-700 mb-4">🏦 Tài khoản nhận tiền</h3>
                <div className="space-y-3">
                  {[
                    { key: 'tk_ten', label: 'Tên tài khoản', placeholder: 'NGUYEN VAN A' },
                    { key: 'tk_so', label: 'Số tài khoản', placeholder: '1234567890' },
                    { key: 'tk_ngan_hang', label: 'Ngân hàng', placeholder: 'VietinBank' },
                    { key: 'tk_bin', label: 'BIN (cho QR)', placeholder: '970405' },
                    { key: 'zalo', label: 'Zalo liên hệ', placeholder: '0909000000' },
                  ].map(f => (
                    <div key={f.key}>
                      <label className="text-sm font-semibold text-gray-600 block mb-1">{f.label}</label>
                      <input value={config[f.key] || ''} placeholder={f.placeholder}
                        onChange={e => setConfig({...config, [f.key]: e.target.value})}
                        className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                    </div>
                  ))}
                </div>
              </div>

              {/* SHOPEE */}
              <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-5 md:col-span-2">
                <h3 className="font-bold text-orange-800 mb-1">🛒 Shopee Affiliate</h3>
                <p className="text-xs text-orange-600 mb-4">Dán link affiliate — banner trang chủ tự cập nhật. Ai click mua hàng bạn được hoa hồng!</p>
                <div className="flex gap-3 items-end">
                  <div className="flex-1">
                    <label className="text-sm font-semibold text-orange-700 block mb-1">Link Shopee Affiliate</label>
                    <input value={config.shopee_link || ''} placeholder="https://s.shopee.vn/xxxxxxxxx"
                      onChange={e => setConfig({...config, shopee_link: e.target.value})}
                      className="w-full border-2 border-orange-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 bg-white" />
                    <div className="text-xs text-orange-500 mt-1">
                      Lấy link tại: <a href="https://affiliate.shopee.vn/custom_link" target="_blank" className="underline">affiliate.shopee.vn → Custom Link</a>
                    </div>
                  </div>
                  {config.shopee_link && (
                    <a href={config.shopee_link} target="_blank"
                      className="bg-orange-500 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-orange-600 transition whitespace-nowrap">
                      Test link →
                    </a>
                  )}
                </div>
                {config.shopee_link && (
                  <div className="mt-4 bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl p-3 flex items-center gap-3">
                    <div className="text-2xl">🛒</div>
                    <div className="flex-1">
                      <div className="font-black text-white text-sm">Mua phụ kiện gà chọi trên Shopee</div>
                      <div className="text-orange-100 text-xs">Preview banner trang chủ</div>
                    </div>
                    <div className="bg-white text-orange-500 font-bold px-3 py-1 rounded-full text-xs">Mua ngay →</div>
                  </div>
                )}
              </div>
            </div>

            {config.tk_bin && config.tk_so && (
              <div className="bg-white rounded-xl p-5 shadow-sm mt-4">
                <h3 className="font-bold text-gray-700 mb-3">📱 Preview QR</h3>
                <img src={`https://img.vietqr.io/image/${config.tk_bin}-${config.tk_so}-compact2.png?accountName=${encodeURIComponent(config.tk_ten || '')}`}
                  alt="QR" className="w-40 h-40 rounded-xl border" />
              </div>
            )}

            <button onClick={saveConfig} disabled={configSaving}
              className={`mt-4 px-8 py-3 rounded-xl font-black text-white transition ${configSaved ? 'bg-green-600' : 'bg-[#8B1A1A] hover:bg-[#6B0F0F]'} disabled:opacity-50`}>
              {configSaving ? '⏳ Đang lưu...' : configSaved ? '✅ Đã lưu!' : '💾 Lưu cài đặt'}
            </button>
          </div>
        )}

        {/* CONTENT */}
        {tab === 'content' && (
          <div>
            <h1 className="font-black text-2xl text-gray-800 mb-6">📝 Nội dung & Banner</h1>

            {/* BANNER 3 Ô */}
            <div className="bg-white rounded-xl p-5 shadow-sm mb-4">
              <h3 className="font-bold text-gray-700 mb-1">🖼️ Banner trang chủ (3 ô đầu)</h3>
              <p className="text-xs text-gray-400 mb-4">Chỉnh tiêu đề, mô tả và link cho từng ô banner. Link có thể là Shopee affiliate hoặc bất kỳ link nào.</p>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                {banners.map((b, idx) => (
                  <div key={idx} className="border-2 border-gray-100 rounded-xl p-4 hover:border-red-200 transition">
                    <div className="text-xs font-bold text-gray-400 mb-2">Ô {b.vi_tri}</div>
                    <div className="space-y-2">
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Tiêu đề chính</label>
                        <input value={b.tieu_de} onChange={e => updateBanner(idx, 'tieu_de', e.target.value)}
                          className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Mô tả phụ</label>
                        <input value={b.tieu_de_phu} onChange={e => updateBanner(idx, 'tieu_de_phu', e.target.value)}
                          className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                      </div>
                      <div>
                        <label className="text-xs font-semibold text-gray-600 block mb-1">Link khi click</label>
                        <input value={b.link} onChange={e => updateBanner(idx, 'link', e.target.value)}
                          placeholder="https://s.shopee.vn/..."
                          className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Preview */}
              <div className="mb-4">
                <div className="text-xs font-semibold text-gray-500 mb-2">Preview:</div>
                <div className="grid grid-cols-3 gap-2">
                  {banners.map((b, idx) => (
                    <div key={idx} className={`bg-gradient-to-r ${idx === 0 ? 'from-red-900 to-red-700' : idx === 1 ? 'from-gray-700 to-gray-600' : 'from-yellow-800 to-yellow-700'} text-white p-3 rounded-lg`}>
                      <div className="text-xs font-black">{b.tieu_de || 'Tiêu đề'}</div>
                      <div className="text-xs text-white/70 mt-0.5">{b.tieu_de_phu || 'Mô tả'}</div>
                    </div>
                  ))}
                </div>
              </div>

              <button onClick={saveBanners} disabled={bannerSaving}
                className={`px-6 py-2 rounded-xl font-black text-white transition ${bannerSaved ? 'bg-green-600' : 'bg-[#8B1A1A] hover:bg-[#6B0F0F]'} disabled:opacity-50`}>
                {bannerSaving ? '⏳ Đang lưu...' : bannerSaved ? '✅ Đã lưu!' : '💾 Lưu banner'}
              </button>
            </div>

            {/* BÀI VIẾT */}
            <div className="bg-white rounded-xl p-5 shadow-sm">
              <h3 className="font-bold text-gray-700 mb-3">📰 Thêm bài viết thư viện</h3>
              <div className="space-y-3">
                <input value={newPost.tieu_de} onChange={e => setNewPost({...newPost, tieu_de: e.target.value})}
                  placeholder="Tiêu đề bài viết..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                <select value={newPost.loai} onChange={e => setNewPost({...newPost, loai: e.target.value})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
                  <option>Tin tức</option>
                  <option>Hướng dẫn</option>
                  <option>Kiến thức</option>
                </select>
                <textarea value={newPost.noi_dung} onChange={e => setNewPost({...newPost, noi_dung: e.target.value})}
                  placeholder="Nội dung bài viết..." rows={6}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
                <button onClick={savePost} disabled={postSaving}
                  className={`px-6 py-2 rounded-lg font-bold text-white transition ${postSaved ? 'bg-green-600' : 'bg-[#8B1A1A] hover:bg-[#6B0F0F]'} disabled:opacity-50`}>
                  {postSaving ? '⏳ Đang đăng...' : postSaved ? '✅ Đã đăng!' : '📝 Đăng bài viết'}
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
