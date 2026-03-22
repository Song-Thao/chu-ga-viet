'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useChat } from '@/components/chat/ChatContext';

// ============================================================
// HELPERS
// ============================================================
function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return `${Math.floor(s / 86400)} ngày trước`;
}
function fmt(n: number) {
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return String(n ?? 0);
}
function timeLeft(dateStr: string): string {
  const diff = new Date(dateStr).getTime() - Date.now();
  if (diff <= 0) return 'Đã hết hạn';
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(hours / 24);
  if (days > 0) return `${days} ngày ${hours % 24}h`;
  return `${hours}h`;
}

const COVER_FALLBACK = 'https://images.unsplash.com/photo-1559715541-5daf0feaf9b9?w=1200&q=80';
const AVATAR_FALLBACK = (name: string) =>
  `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=8B0000&color=fff&size=128`;

// Trạng thái gà
const GA_STATUS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  active:             { label: 'Đang bán',               color: '#16a34a', bg: '#dcfce7', icon: '🟢' },
  in_transaction:     { label: 'Đang giao dịch',         color: '#ca8a04', bg: '#fef9c3', icon: '🟡' },
  pending_completion: { label: 'Chờ xác nhận',           color: '#2563eb', bg: '#dbeafe', icon: '🔵' },
  pending_dispute:    { label: 'Chờ khiếu nại (3 ngày)', color: '#ea580c', bg: '#ffedd5', icon: '🟠' },
  sold:               { label: 'Đã bán',                 color: '#7c3aed', bg: '#ede9fe', icon: '✅' },
  hidden:             { label: 'Đang ẩn',                color: '#6b7280', bg: '#f3f4f6', icon: '👁️' },
};

async function getOrCreateUserConv(myId: string, theirId: string): Promise<string | null> {
  const { data: existing } = await supabase.from('conversations').select('id').eq('type', 'user')
    .or(`and(buyer_id.eq.${myId},seller_id.eq.${theirId}),and(buyer_id.eq.${theirId},seller_id.eq.${myId})`)
    .maybeSingle();
  if (existing) return existing.id;
  const { data: created } = await supabase.from('conversations')
    .insert({ type: 'user', ga_id: null, buyer_id: myId, seller_id: theirId })
    .select('id').single();
  return created?.id || null;
}

// ============================================================
// GA MANAGE CARD — chỉ hiện khi isMe, có đầy đủ actions
// ============================================================
function GaManageCard({ ga, idx, onRefresh }: { ga: any; idx: number; onRefresh: () => void }) {
  const COLORS = ['bg-orange-800', 'bg-gray-700', 'bg-green-800', 'bg-red-900'];
  const anh = ga.ga_images?.find((i: any) => i.is_primary)?.url || ga.ga_images?.[0]?.url;
  const score = ga.ai_analysis?.[0]?.total_score;
  const status = GA_STATUS[ga.status] || GA_STATUS['active'];
  const [loading, setLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [editForm, setEditForm] = useState({ ten: ga.ten, gia: String(ga.gia), mo_ta: ga.mo_ta || '' });

  async function updateStatus(newStatus: string) {
    setLoading(true);
    const updates: any = { status: newStatus };
    if (newStatus === 'pending_dispute') {
      const d = new Date(); d.setDate(d.getDate() + 3);
      updates.dispute_deadline = d.toISOString();
      const ad = new Date(); ad.setDate(ad.getDate() + 5);
      updates.auto_delete_at = ad.toISOString();
    }
    if (newStatus === 'sold') {
      updates.sold_at = new Date().toISOString();
      const ad = new Date(); ad.setDate(ad.getDate() + 2);
      updates.auto_delete_at = ad.toISOString();
    }
    await supabase.from('ga').update(updates).eq('id', ga.id);
    setLoading(false);
    onRefresh();
  }

  async function handleDelete() {
    if (!confirm(`Xóa "${ga.ten}"?`)) return;
    setLoading(true);
    await supabase.from('ga').delete().eq('id', ga.id);
    setLoading(false);
    onRefresh();
  }

  async function handleSaveEdit() {
    setLoading(true);
    await supabase.from('ga').update({
      ten: editForm.ten,
      gia: parseInt(editForm.gia),
      mo_ta: editForm.mo_ta,
    }).eq('id', ga.id);
    setLoading(false);
    setShowEdit(false);
    onRefresh();
  }

  return (
    <>
      {showEdit && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md p-5 shadow-2xl">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-black text-gray-800">✏️ Chỉnh sửa</h3>
              <button onClick={() => setShowEdit(false)} className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-gray-500 hover:bg-gray-200">✕</button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Tên gà</label>
                <input value={editForm.ten} onChange={e => setEditForm({ ...editForm, ten: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Giá (đ)</label>
                <input type="number" value={editForm.gia} onChange={e => setEditForm({ ...editForm, gia: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Mô tả</label>
                <textarea value={editForm.mo_ta} onChange={e => setEditForm({ ...editForm, mo_ta: e.target.value })}
                  rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
              </div>
            </div>
            <div className="flex gap-2 mt-4">
              <button onClick={() => setShowEdit(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50">Hủy</button>
              <button onClick={handleSaveEdit} disabled={loading}
                className="flex-1 bg-[#8B1A1A] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-[#6B0F0F] disabled:opacity-60">
                {loading ? '⏳...' : '💾 Lưu'}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-xl overflow-hidden shadow-sm border border-gray-100">
        <div className="relative h-32">
          {anh
            ? <img src={anh} alt={ga.ten} className="w-full h-full object-cover" />
            : <div className={`${COLORS[idx % COLORS.length]} h-full flex items-center justify-center text-4xl`}>🐓</div>
          }
          <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold"
            style={{ background: status.bg, color: status.color }}>
            {status.icon} {status.label}
          </div>
          {score && (
            <div className="absolute top-2 right-2 bg-yellow-400 text-black text-xs px-1.5 py-0.5 rounded-full font-bold">
              ⭐ {score}
            </div>
          )}
          {ga.auto_delete_at && (
            <div className="absolute bottom-0 left-0 right-0 bg-red-600/90 text-white text-xs px-2 py-1 text-center">
              🗑️ Tự xóa sau {timeLeft(ga.auto_delete_at)}
            </div>
          )}
        </div>

        <div className="p-3">
          <div className="font-bold text-sm text-gray-800 truncate">{ga.ten}</div>
          <div className="text-[#8B1A1A] font-black text-sm mt-0.5">{parseInt(ga.gia).toLocaleString('vi-VN')} đ</div>
          <div className="text-xs text-gray-500 mt-0.5">📍 {ga.khu_vuc}</div>

          <div className="mt-3 space-y-1.5">
            {/* active */}
            {ga.status === 'active' && (<>
              <div className="flex gap-1.5">
                <button onClick={() => setShowEdit(true)}
                  className="flex-1 bg-blue-50 text-blue-700 text-xs font-bold py-1.5 rounded-lg hover:bg-blue-100">✏️ Sửa</button>
                <button onClick={() => updateStatus('hidden')} disabled={loading}
                  className="flex-1 bg-gray-50 text-gray-600 text-xs font-bold py-1.5 rounded-lg hover:bg-gray-100">👁️ Ẩn</button>
              </div>
              <button onClick={() => updateStatus('in_transaction')} disabled={loading}
                className="w-full bg-yellow-50 text-yellow-700 text-xs font-bold py-1.5 rounded-lg hover:bg-yellow-100">
                🤝 Đánh dấu đang giao dịch
              </button>
              <button onClick={handleDelete} disabled={loading}
                className="w-full bg-red-50 text-red-600 text-xs font-bold py-1.5 rounded-lg hover:bg-red-100">
                🗑️ Xóa bài đăng
              </button>
            </>)}

            {/* hidden */}
            {ga.status === 'hidden' && (<>
              <button onClick={() => updateStatus('active')} disabled={loading}
                className="w-full bg-green-50 text-green-700 text-xs font-bold py-1.5 rounded-lg hover:bg-green-100">
                🟢 Hiện lại bài đăng
              </button>
              <button onClick={handleDelete} disabled={loading}
                className="w-full bg-red-50 text-red-600 text-xs font-bold py-1.5 rounded-lg hover:bg-red-100">
                🗑️ Xóa bài đăng
              </button>
            </>)}

            {/* in_transaction */}
            {ga.status === 'in_transaction' && (<>
              <p className="text-xs text-yellow-700 text-center font-semibold">Đang thương lượng với người mua</p>
              <button onClick={() => updateStatus('pending_completion')} disabled={loading}
                className="w-full bg-blue-50 text-blue-700 text-xs font-bold py-1.5 rounded-lg hover:bg-blue-100">
                ✅ Xác nhận đã giao gà
              </button>
              <button onClick={() => updateStatus('active')} disabled={loading}
                className="w-full bg-gray-50 text-gray-600 text-xs font-bold py-1.5 rounded-lg hover:bg-gray-100">
                ↩️ Huỷ giao dịch
              </button>
            </>)}

            {/* pending_completion */}
            {ga.status === 'pending_completion' && (<>
              <p className="text-xs text-blue-600 text-center font-semibold">Chờ người mua xác nhận nhận gà</p>
              <button onClick={() => updateStatus('pending_dispute')} disabled={loading}
                className="w-full bg-orange-50 text-orange-700 text-xs font-bold py-1.5 rounded-lg hover:bg-orange-100">
                ⚠️ Hoàn tất + mở thời gian khiếu nại 3 ngày
              </button>
            </>)}

            {/* pending_dispute */}
            {ga.status === 'pending_dispute' && (<>
              <p className="text-xs text-orange-600 text-center font-semibold">
                ⏳ Đang chờ khiếu nại
                {ga.dispute_deadline && ` — còn ${timeLeft(ga.dispute_deadline)}`}
              </p>
              <button onClick={() => updateStatus('sold')} disabled={loading}
                className="w-full bg-purple-50 text-purple-700 text-xs font-bold py-1.5 rounded-lg hover:bg-purple-100">
                ✅ Đóng khiếu nại — Hoàn tất bán
              </button>
            </>)}

            {/* sold */}
            {ga.status === 'sold' && (<>
              <p className="text-xs text-green-600 text-center font-semibold">
                ✅ Đã bán {ga.sold_at && timeAgo(ga.sold_at)}
              </p>
              <button onClick={handleDelete} disabled={loading}
                className="w-full bg-red-50 text-red-600 text-xs font-bold py-1.5 rounded-lg hover:bg-red-100">
                🗑️ Xóa ngay
              </button>
            </>)}
          </div>

          <Link href={`/ga/${ga.id}`}
            className="block text-center text-xs text-gray-400 hover:text-[#8B1A1A] mt-2 transition">
            Xem trang chi tiết →
          </Link>
        </div>
      </div>
    </>
  );
}

// GaCard thường (người khác xem)
function GaCard({ ga, idx }: { ga: any; idx: number }) {
  const COLORS = ['bg-orange-800', 'bg-gray-700', 'bg-green-800', 'bg-red-900'];
  const anh = ga.ga_images?.find((i: any) => i.is_primary)?.url || ga.ga_images?.[0]?.url;
  const score = ga.ai_analysis?.[0]?.total_score;
  const status = GA_STATUS[ga.status];
  return (
    <Link href={`/ga/${ga.id}`}>
      <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer">
        <div className="relative">
          {anh
            ? <img src={anh} alt={ga.ten} className="w-full h-32 object-cover" />
            : <div className={`${COLORS[idx % COLORS.length]} h-32 flex items-center justify-center text-4xl`}>🐓</div>
          }
          {status && ga.status !== 'active' && (
            <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-xs font-bold"
              style={{ background: status.bg, color: status.color }}>
              {status.icon} {status.label}
            </div>
          )}
        </div>
        <div className="p-3">
          <div className="font-bold text-sm text-gray-800 truncate">{ga.ten}</div>
          <div className="text-[#8B1A1A] font-black text-sm mt-1">{parseInt(ga.gia).toLocaleString('vi-VN')} đ</div>
          <div className="flex justify-between items-center mt-1">
            <span className="text-xs text-gray-500">📍 {ga.khu_vuc}</span>
            {score && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">⭐ {score}</span>}
          </div>
        </div>
      </div>
    </Link>
  );
}

// ============================================================
// SKELETON
// ============================================================
function Skeleton() {
  return (
    <div className="animate-pulse">
      <div className="bg-gray-300 h-48 w-full" />
      <div className="bg-white px-6 pb-6">
        <div className="flex items-end gap-4 -mt-10 mb-4">
          <div className="w-24 h-24 bg-gray-300 rounded-full border-4 border-white flex-shrink-0" />
          <div className="pb-2 flex-1 space-y-2">
            <div className="bg-gray-200 h-5 rounded w-1/3" />
            <div className="bg-gray-200 h-3 rounded w-1/2" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-3">{[1,2,3].map(i => <div key={i} className="bg-gray-100 h-16 rounded-xl" />)}</div>
      </div>
    </div>
  );
}

// ============================================================
// PROFILE HEADER
// ============================================================
function ProfileHeader({ profile, isMe, currentUser, onUpdated }: any) {
  const { openChat } = useChat();
  const [editing, setEditing] = useState(false);
  const [following, setFollowing] = useState(false);
  const [followerCount, setFollowerCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [chatLoading, setChatLoading] = useState(false);
  const [form, setForm] = useState({
    username: profile.username || '', bio: profile.bio || '',
    location: profile.location || '', phone: profile.phone || '',
    experience_years: profile.experience_years || 0,
    phone_visibility: profile.phone_visibility || 'public',
    profile_visibility: profile.profile_visibility || 'public',
  });
  const [uploading, setUploading] = useState(false);
  const avatarRef = useRef<HTMLInputElement>(null);
  const coverRef = useRef<HTMLInputElement>(null);

  useEffect(() => { fetchFollowData(); }, [profile.id]);

  async function fetchFollowData() {
    const [{ count: fc }, { count: ing }] = await Promise.all([
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id),
      supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id),
    ]);
    setFollowerCount(fc || 0); setFollowingCount(ing || 0);
    if (currentUser) {
      const { data } = await supabase.from('follows').select('id')
        .eq('follower_id', currentUser.id).eq('following_id', profile.id).maybeSingle();
      setFollowing(!!data);
    }
  }

  async function handleFollow() {
    if (!currentUser) { alert('Vui lòng đăng nhập!'); return; }
    if (following) {
      await supabase.from('follows').delete().eq('follower_id', currentUser.id).eq('following_id', profile.id);
      setFollowing(false); setFollowerCount(c => c - 1);
    } else {
      await supabase.from('follows').insert({ follower_id: currentUser.id, following_id: profile.id });
      setFollowing(true); setFollowerCount(c => c + 1);
    }
  }

  async function handleNhanTin() {
    if (!currentUser) { alert('Vui lòng đăng nhập!'); return; }
    setChatLoading(true);
    const convId = await getOrCreateUserConv(currentUser.id, profile.id);
    if (convId) await openChat({ convId, type: 'user', doiPhuongId: profile.id, doiPhuongName: profile.username || 'Người dùng' });
    setChatLoading(false);
  }

  async function uploadImage(file: File, bucket: string, field: string) {
    setUploading(true);
    const ext = file.name.split('.').pop();
    const path = `${field}/${profile.id}-${Date.now()}.${ext}`;
    const { data, error } = await supabase.storage.from(bucket).upload(path, file, { upsert: true });
    if (!error && data) {
      const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);
      await supabase.from('profiles').update({ [field]: urlData.publicUrl }).eq('id', profile.id);
      onUpdated({ [field]: urlData.publicUrl });
    }
    setUploading(false);
  }

  async function handleSave() {
    await supabase.from('profiles').update(form).eq('id', profile.id);
    onUpdated(form); setEditing(false);
  }

  const avatar = profile.avatar_url || AVATAR_FALLBACK(profile.username || 'U');
  const cover = profile.cover_url || COVER_FALLBACK;

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
      <div className="relative h-48 group">
        <img src={cover} alt="cover" className="w-full h-full object-cover"
          onError={e => { (e.target as HTMLImageElement).src = COVER_FALLBACK; }} />
        <div className="absolute inset-0 bg-black/20" />
        {isMe && (
          <button onClick={() => coverRef.current?.click()}
            className="absolute bottom-3 right-3 bg-white/80 hover:bg-white text-gray-700 text-xs font-bold px-3 py-1.5 rounded-full shadow transition opacity-0 group-hover:opacity-100">
            📷 Đổi ảnh bìa
          </button>
        )}
        <input ref={coverRef} type="file" accept="image/*" className="hidden"
          onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, 'images', 'cover_url'); }} />
      </div>
      <div className="px-5 pb-5">
        <div className="flex items-end gap-4 -mt-12 mb-4">
          <div className="relative group flex-shrink-0">
            <img src={avatar} alt={profile.username}
              className="w-24 h-24 rounded-full border-4 border-white object-cover shadow-md"
              onError={e => { (e.target as HTMLImageElement).src = AVATAR_FALLBACK(profile.username || 'U'); }} />
            {isMe && (
              <button onClick={() => avatarRef.current?.click()}
                className="absolute inset-0 bg-black/40 rounded-full flex items-center justify-center text-white text-xs font-bold opacity-0 group-hover:opacity-100 transition">📷</button>
            )}
            <input ref={avatarRef} type="file" accept="image/*" className="hidden"
              onChange={e => { const f = e.target.files?.[0]; if (f) uploadImage(f, 'images', 'avatar_url'); }} />
            {uploading && (
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              </div>
            )}
          </div>
          <div className="flex-1 pb-1">
            {editing
              ? <input value={form.username} onChange={e => setForm({ ...form, username: e.target.value })}
                  className="text-xl font-black border-b-2 border-[#8B1A1A] outline-none bg-transparent w-full" />
              : <h1 className="font-black text-xl text-gray-900">{profile.username || 'Người dùng'}</h1>
            }
            {profile.location && !editing && <div className="text-xs text-gray-500 mt-0.5">📍 {profile.location}</div>}
          </div>
          <div className="pb-1 flex gap-2 flex-wrap justify-end">
            {isMe ? (
              editing ? (
                <>
                  <button onClick={handleSave} className="bg-[#8B1A1A] text-white text-sm font-bold px-4 py-2 rounded-full hover:bg-[#6B0F0F]">💾 Lưu</button>
                  <button onClick={() => setEditing(false)} className="border border-gray-300 text-gray-600 text-sm font-bold px-4 py-2 rounded-full hover:bg-gray-50">Hủy</button>
                </>
              ) : (
                <button onClick={() => setEditing(true)} className="border-2 border-gray-300 text-gray-700 text-sm font-bold px-4 py-2 rounded-full hover:border-gray-400">✏️ Chỉnh sửa</button>
              )
            ) : (
              <>
                <button onClick={handleFollow}
                  className={`text-sm font-bold px-4 py-2 rounded-full transition ${following ? 'border-2 border-gray-300 text-gray-700 hover:bg-gray-50' : 'bg-[#8B1A1A] text-white hover:bg-[#6B0F0F]'}`}>
                  {following ? '✓ Đang theo dõi' : '+ Theo dõi'}
                </button>
                <button onClick={handleNhanTin} disabled={chatLoading}
                  className="border-2 border-gray-300 text-gray-700 text-sm font-bold px-4 py-2 rounded-full hover:bg-gray-50 disabled:opacity-60">
                  {chatLoading ? '⏳...' : '💬 Nhắn tin'}
                </button>
              </>
            )}
          </div>
        </div>

        {editing ? (
          <div className="space-y-3 mb-4 bg-gray-50 rounded-xl p-4">
            <div>
              <label className="text-xs font-bold text-gray-500 block mb-1">Bio</label>
              <textarea value={form.bio} onChange={e => setForm({ ...form, bio: e.target.value })} rows={2}
                placeholder="Giới thiệu về bản thân..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Khu vực</label>
                <input value={form.location} onChange={e => setForm({ ...form, location: e.target.value })}
                  placeholder="TP.HCM, Cà Mau..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Số điện thoại</label>
                <input value={form.phone} onChange={e => setForm({ ...form, phone: e.target.value })}
                  placeholder="0909..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Kinh nghiệm (năm)</label>
                <input type="number" value={form.experience_years}
                  onChange={e => setForm({ ...form, experience_years: Number(e.target.value) })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
              </div>
              <div>
                <label className="text-xs font-bold text-gray-500 block mb-1">Hiển thị SĐT</label>
                <select value={form.phone_visibility} onChange={e => setForm({ ...form, phone_visibility: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
                  <option value="public">🌐 Công khai</option>
                  <option value="private">🔒 Riêng tư</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="text-xs font-bold text-gray-500 block mb-1">Quyền xem hồ sơ</label>
                <select value={form.profile_visibility} onChange={e => setForm({ ...form, profile_visibility: e.target.value })}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
                  <option value="public">🌐 Công khai</option>
                  <option value="private">🔒 Chỉ mình tôi</option>
                </select>
              </div>
            </div>
          </div>
        ) : (
          <>
            {profile.bio && <p className="text-sm text-gray-600 mb-3 leading-relaxed">{profile.bio}</p>}
            <div className="flex flex-wrap gap-3 text-xs text-gray-500 mb-4">
              {profile.experience_years > 0 && <span>🐓 {profile.experience_years} năm kinh nghiệm</span>}
              {profile.phone && (profile.phone_visibility === 'public' || isMe) && <span>📞 {profile.phone}</span>}
              <span>📅 Tham gia {new Date(profile.created_at || Date.now()).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}</span>
            </div>
          </>
        )}

        <div className="grid grid-cols-4 gap-3">
          {[
            { label: 'Theo dõi', value: fmt(followerCount) },
            { label: 'Đang theo', value: fmt(followingCount) },
            { label: 'Uy tín', value: `⭐ ${profile.trust_score || 5}` },
            { label: 'Đang bán', value: '—' },
          ].map(s => (
            <div key={s.label} className="text-center p-2.5 bg-gray-50 rounded-xl">
              <div className="font-black text-base text-[#8B1A1A]">{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{s.label}</div>
            </div>
          ))}
        </div>
        <div className="flex gap-2 flex-wrap mt-3">
          {(profile.trust_score ?? 5) >= 4.5 && <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full font-semibold">🏆 Top Seller</span>}
          {profile.experience_years >= 5 && <span className="bg-blue-100 text-blue-800 text-xs px-3 py-1 rounded-full font-semibold">👑 Sư kê lâu năm</span>}
          <span className="bg-red-100 text-red-800 text-xs px-3 py-1 rounded-full font-semibold">🐓 Chủ Gà Việt</span>
        </div>
      </div>
    </div>
  );
}

// PostCard
function PostCard({ post }: { post: any }) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(post.like_count ?? post.likes ?? 0);
  const name = post.profiles?.username || 'Người dùng';
  const avatar = post.profiles?.avatar_url || AVATAR_FALLBACK(name);
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-3">
      <div className="flex items-center gap-3 p-4 pb-3">
        <img src={avatar} alt={name} className="w-10 h-10 rounded-full object-cover" />
        <div>
          <div className="font-bold text-sm text-gray-900">{name}</div>
          <div className="text-xs text-gray-400">{timeAgo(post.created_at)}</div>
        </div>
      </div>
      <div className="px-4 pb-3 text-sm text-gray-800 leading-relaxed whitespace-pre-wrap">{post.noi_dung}</div>
      {post.image_url && <img src={post.image_url} alt="" className="w-full max-h-96 object-cover" />}
      <div className="px-4 py-2 flex gap-4 text-xs text-gray-500 border-b border-gray-100">
        <span>{liked ? '❤️' : '🤍'} {fmt(likeCount)} lượt thích</span>
        <span>💬 {fmt(post.comment_count ?? 0)} bình luận</span>
      </div>
      <div className="flex px-2 py-1">
        {[
          { icon: liked ? '❤️' : '👍', label: 'Thích', action: () => { setLiked(l => !l); setLikeCount((c: number) => c + (liked ? -1 : 1)); } },
          { icon: '🔗', label: 'Chia sẻ', action: () => navigator.clipboard?.writeText(window.location.href) },
        ].map(btn => (
          <button key={btn.label} onClick={btn.action}
            className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition">
            <span>{btn.icon}</span> {btn.label}
          </button>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function HoSoPage() {
  const { id } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [gaList, setGaList] = useState<any[]>([]);
  const [gaDaBan, setGaDaBan] = useState<any[]>([]);
  const [gaActive, setGaActive] = useState<any[]>([]);
  const [tab, setTab] = useState<'bai-viet' | 'dang' | 'ban' | 'danh-gia'>('bai-viet');
  const [loading, setLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);

  const isMe = !!(currentUser && (id === 'me' || id === currentUser.id));

  useEffect(() => { init(); }, [id]);

  async function init() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);
    let profileId = id as string;
    if (id === 'me') {
      if (!user) { router.push('/login'); return; }
      profileId = user.id;
    }
    const { data: profileData } = await supabase.from('profiles').select('*').eq('id', profileId).single();
    if (!profileData) { setLoading(false); return; }
    setProfile(profileData);
    const isOwner = user?.id === profileId;
    if (profileData.profile_visibility === 'private' && !isOwner) {
      setIsPrivate(true); setLoading(false); return;
    }
    await loadData(profileId, isOwner);
    setLoading(false);
  }

  async function loadData(profileId: string, isOwner: boolean) {
    const [postsRes, gaSoldRes] = await Promise.all([
      supabase.from('posts')
        .select('id, noi_dung, image_url, like_count, likes, comment_count, youtube_url, created_at, profiles(username, avatar_url)')
        .eq('user_id', profileId).eq('status', 'active').order('created_at', { ascending: false }).limit(20),
      supabase.from('ga')
        .select('id, ten, loai_ga, gia, khu_vuc, status, sold_at, ga_images(url, is_primary)')
        .eq('user_id', profileId).eq('status', 'sold').order('sold_at', { ascending: false }),
    ]);
    setPosts(postsRes.data || []);
    setGaDaBan(gaSoldRes.data || []);

    if (isOwner) {
      const { data } = await supabase.from('ga')
        .select('id, ten, loai_ga, gia, khu_vuc, status, sold_at, dispute_deadline, auto_delete_at, ga_images(url, is_primary), ai_analysis(total_score)')
        .eq('user_id', profileId).not('status', 'eq', 'sold').order('created_at', { ascending: false });
      setGaList(data || []);
    } else {
      const { data } = await supabase.from('ga')
        .select('id, ten, loai_ga, gia, khu_vuc, status, ga_images(url, is_primary), ai_analysis(total_score)')
        .eq('user_id', profileId).eq('status', 'active').order('created_at', { ascending: false });
      setGaActive(data || []);
    }
  }

  async function refreshGa() {
    if (!profile) return;
    const { data } = await supabase.from('ga')
      .select('id, ten, loai_ga, gia, khu_vuc, status, sold_at, dispute_deadline, auto_delete_at, ga_images(url, is_primary), ai_analysis(total_score)')
      .eq('user_id', profile.id).not('status', 'eq', 'sold').order('created_at', { ascending: false });
    setGaList(data || []);
    const { data: sold } = await supabase.from('ga')
      .select('id, ten, loai_ga, gia, khu_vuc, status, sold_at, ga_images(url, is_primary)')
      .eq('user_id', profile.id).eq('status', 'sold').order('sold_at', { ascending: false });
    setGaDaBan(sold || []);
  }

  if (loading) return <div className="max-w-3xl mx-auto px-4 py-4"><Skeleton /></div>;

  if (!profile) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-3">👤</div>
      <div className="text-gray-500">Không tìm thấy người dùng</div>
      <Link href="/" className="mt-4 inline-block text-[#8B1A1A] font-bold hover:underline">← Về trang chủ</Link>
    </div>
  );

  if (isPrivate) return (
    <div className="max-w-3xl mx-auto px-4 py-4">
      <ProfileHeader profile={profile} isMe={false} currentUser={currentUser} onUpdated={() => {}} />
      <div className="bg-white rounded-xl p-12 text-center shadow-sm">
        <div className="text-5xl mb-3">🔒</div>
        <div className="font-bold text-gray-700 text-lg mb-2">Hồ sơ này ở chế độ riêng tư</div>
        <div className="text-gray-400 text-sm">Chỉ chủ tài khoản mới có thể xem nội dung này</div>
      </div>
    </div>
  );

  const dangBanCount = isMe ? gaList.length : gaActive.length;
  const TABS = [
    { key: 'bai-viet', label: `Bài viết (${posts.length})` },
    { key: 'dang', label: `Quản lý (${dangBanCount})` },
    { key: 'ban', label: `Đã bán (${gaDaBan.length})` },
    { key: 'danh-gia', label: 'Đánh giá' },
  ] as const;

  return (
    <div className="bg-gray-100 min-h-screen">
      <div className="max-w-3xl mx-auto px-4 py-4">
        <ProfileHeader profile={profile} isMe={isMe} currentUser={currentUser}
          onUpdated={(updates: any) => setProfile((p: any) => ({ ...p, ...updates }))} />

        <div className="bg-white rounded-xl shadow-sm p-1 mb-4 flex gap-1 overflow-x-auto">
          {TABS.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 py-2.5 px-2 rounded-lg text-xs font-bold transition whitespace-nowrap ${tab === t.key ? 'bg-[#8B1A1A] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'bai-viet' && (
          posts.length === 0
            ? <div className="bg-white rounded-xl p-12 text-center shadow-sm text-gray-400">
                <div className="text-5xl mb-3">📝</div>
                <div className="font-semibold">Chưa có bài viết nào</div>
                {isMe && <Link href="/cong-dong"><button className="mt-4 bg-[#8B1A1A] text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-[#6B0F0F]">Đăng bài ngay →</button></Link>}
              </div>
            : <div>{posts.map(p => <PostCard key={p.id} post={p} />)}</div>
        )}

        {tab === 'dang' && (
          <>
            {isMe && (
              <div className="bg-white rounded-xl p-3 mb-3 shadow-sm">
                <div className="text-xs font-bold text-gray-500 mb-2">Chú thích trạng thái:</div>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(GA_STATUS).filter(([k]) => k !== 'sold').map(([, v]) => (
                    <span key={v.label} className="text-xs px-2 py-0.5 rounded-full font-semibold"
                      style={{ background: v.bg, color: v.color }}>
                      {v.icon} {v.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {isMe ? (
              gaList.length === 0
                ? <div className="bg-white rounded-xl p-12 text-center shadow-sm text-gray-400">
                    <div className="text-5xl mb-3">🐓</div>
                    <div className="font-semibold">Chưa có gà nào</div>
                    <Link href="/dang-ga"><button className="mt-4 bg-[#8B1A1A] text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-[#6B0F0F]">Đăng bán gà →</button></Link>
                  </div>
                : <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {gaList.map((ga, i) => <GaManageCard key={ga.id} ga={ga} idx={i} onRefresh={refreshGa} />)}
                  </div>
            ) : (
              gaActive.length === 0
                ? <div className="bg-white rounded-xl p-12 text-center shadow-sm text-gray-400">
                    <div className="text-5xl mb-3">🐓</div>
                    <div className="font-semibold">Chưa có gà đang bán</div>
                  </div>
                : <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                    {gaActive.map((ga, i) => <GaCard key={ga.id} ga={ga} idx={i} />)}
                  </div>
            )}
          </>
        )}

        {tab === 'ban' && (
          gaDaBan.length === 0
            ? <div className="bg-white rounded-xl p-12 text-center shadow-sm text-gray-400">
                <div className="text-5xl mb-3">✅</div>
                <div className="font-semibold">Chưa có gà đã bán</div>
              </div>
            : <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {gaDaBan.map((ga, i) => <GaCard key={ga.id} ga={ga} idx={i} />)}
              </div>
        )}

        {tab === 'danh-gia' && (
          <div className="bg-white rounded-xl p-12 text-center shadow-sm text-gray-400">
            <div className="text-5xl mb-3">⭐</div>
            <div className="font-semibold">Chưa có đánh giá nào</div>
            <div className="text-xs mt-2">Đánh giá được tạo sau khi hoàn tất giao dịch</div>
          </div>
        )}

        {isMe && (
          <div className="mt-4">
            <Link href="/dang-ga">
              <button className="w-full bg-gradient-to-r from-[#8B1A1A] to-red-700 text-white font-black py-3.5 rounded-xl hover:opacity-90 transition text-sm">
                🐓 Đăng bán gà mới
              </button>
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
