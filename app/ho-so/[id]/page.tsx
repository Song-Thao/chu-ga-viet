'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function HoSoPage() {
  const { id } = useParams();
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [gaList, setGaList] = useState<any[]>([]);
  const [gaDaBan, setGaDaBan] = useState<any[]>([]);
  const [danhGia, setDanhGia] = useState<any[]>([]);
  const [tab, setTab] = useState('dang');
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [editForm, setEditForm] = useState({ username: '', phone: '' });

  const isMe = id === 'me' || (currentUser && id === currentUser.id);

  useEffect(() => { init(); }, [id]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    setCurrentUser(user);

    let profileId = id as string;

    // Nếu là 'me' thì lấy user hiện tại
    if (id === 'me') {
      if (!user) { router.push('/login'); return; }
      profileId = user.id;
    }

    // Lấy profile
    const { data: profileData } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', profileId)
      .single();

    if (profileData) {
      setProfile(profileData);
      setEditForm({ username: profileData.username || '', phone: profileData.phone || '' });
    }

    // Lấy gà đang bán
    const { data: gaActive } = await supabase
      .from('ga')
      .select('id, ten, loai_ga, gia, khu_vuc, created_at, ga_images(url, is_primary), ai_analysis(total_score)')
      .eq('user_id', profileId)
      .eq('status', 'active')
      .order('created_at', { ascending: false });
    setGaList(gaActive || []);

    // Lấy gà đã bán
    const { data: gaSold } = await supabase
      .from('ga')
      .select('id, ten, loai_ga, gia, khu_vuc, ga_images(url, is_primary)')
      .eq('user_id', profileId)
      .eq('status', 'sold')
      .order('created_at', { ascending: false });
    setGaDaBan(gaSold || []);

    // Lấy đánh giá từ comments
    const { data: cmts } = await supabase
      .from('comments')
      .select('id, noi_dung, created_at, profiles(username)')
      .eq('ga_id', profileId)
      .order('created_at', { ascending: false })
      .limit(10);
    setDanhGia(cmts || []);

    setLoading(false);
  };

  const handleSaveProfile = async () => {
    if (!currentUser) return;
    const { error } = await supabase
      .from('profiles')
      .update({ username: editForm.username, phone: editForm.phone })
      .eq('id', currentUser.id);

    if (!error) {
      setProfile({ ...profile, ...editForm });
      setEditing(false);
    }
  };

  const MauNen = ['bg-orange-800', 'bg-gray-700', 'bg-green-800', 'bg-red-900'];

  const GaCard = ({ ga, idx }: { ga: any; idx: number }) => {
    const anh = ga.ga_images?.find((i: any) => i.is_primary)?.url || ga.ga_images?.[0]?.url;
    const score = ga.ai_analysis?.[0]?.total_score;
    return (
      <Link href={`/ga/${ga.id}`}>
        <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
          {anh ? (
            <img src={anh} alt={ga.ten} className="w-full h-32 object-cover" />
          ) : (
            <div className={`${MauNen[idx % MauNen.length]} h-32 flex items-center justify-center text-4xl`}>🐓</div>
          )}
          <div className="p-3">
            <div className="font-bold text-sm text-gray-800 truncate">{ga.ten}</div>
            <div className="text-[#8B1A1A] font-black text-sm mt-1">
              {parseInt(ga.gia).toLocaleString('vi-VN')} đ
            </div>
            {score && <div className="text-xs text-yellow-600 mt-1">⭐ {score}/10</div>}
          </div>
        </div>
      </Link>
    );
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-[#8B1A1A] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!profile) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-3">👤</div>
      <div className="text-gray-500">Không tìm thấy người dùng</div>
    </div>
  );

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">

      {/* PROFILE HEADER */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
        <div className="bg-gradient-to-r from-[#8B1A1A] to-red-700 h-24"></div>
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="w-20 h-20 bg-[#8B1A1A] rounded-full border-4 border-white flex items-center justify-center text-white font-black text-2xl flex-shrink-0">
              {(profile.username || 'U')[0].toUpperCase()}
            </div>
            <div className="pb-2 flex-1 min-w-0">
              {editing ? (
                <div className="space-y-2">
                  <input value={editForm.username} onChange={e => setEditForm({...editForm, username: e.target.value})}
                    className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                    placeholder="Tên hiển thị" />
                  <input value={editForm.phone} onChange={e => setEditForm({...editForm, phone: e.target.value})}
                    className="w-full border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300"
                    placeholder="Số điện thoại" />
                  <div className="flex gap-2">
                    <button onClick={handleSaveProfile}
                      className="bg-[#8B1A1A] text-white px-4 py-1.5 rounded-lg text-sm font-bold hover:bg-[#6B0F0F] transition">
                      Lưu
                    </button>
                    <button onClick={() => setEditing(false)}
                      className="border border-gray-300 text-gray-600 px-4 py-1.5 rounded-lg text-sm hover:bg-gray-50 transition">
                      Hủy
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h1 className="font-black text-xl text-gray-800">{profile.username || 'Người dùng'}</h1>
                    {isMe && (
                      <button onClick={() => setEditing(true)}
                        className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 px-2 py-0.5 rounded-full">
                        ✏️ Sửa
                      </button>
                    )}
                  </div>
                  {profile.phone && <div className="text-sm text-gray-500">📞 {profile.phone}</div>}
                  <div className="text-xs text-gray-400 mt-0.5">
                    Tham gia {new Date(profile.created_at || Date.now()).toLocaleDateString('vi-VN', { month: 'long', year: 'numeric' })}
                  </div>
                </>
              )}
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="font-black text-2xl text-[#8B1A1A]">⭐ {profile.trust_score || 5.0}</div>
              <div className="text-xs text-gray-500 mt-1">Điểm uy tín</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="font-black text-2xl text-[#8B1A1A]">{gaDaBan.length}</div>
              <div className="text-xs text-gray-500 mt-1">Đã bán</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="font-black text-2xl text-[#8B1A1A]">{gaList.length}</div>
              <div className="text-xs text-gray-500 mt-1">Đang đăng</div>
            </div>
          </div>

          {/* BADGES */}
          <div className="flex gap-2 flex-wrap">
            {profile.trust_score >= 4.5 && (
              <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full font-semibold">🏆 Top Seller</span>
            )}
            {gaDaBan.length >= 5 && (
              <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-semibold">✓ Người bán uy tín</span>
            )}
            <span className="bg-red-100 text-red-800 text-xs px-3 py-1 rounded-full font-semibold">🐓 Chủ Gà Việt</span>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1 mb-4">
        {[
          { key: 'dang', label: `Đang đăng (${gaList.length})` },
          { key: 'ban', label: `Đã bán (${gaDaBan.length})` },
          { key: 'danh_gia', label: 'Đánh giá' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === t.key ? 'bg-[#8B1A1A] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {tab === 'dang' && (
        gaList.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm text-gray-400">
            <div className="text-4xl mb-2">🐓</div>
            <div className="text-sm">Chưa có gà đang bán</div>
            {isMe && (
              <Link href="/dang-ga" className="mt-3 inline-block bg-[#8B1A1A] text-white px-4 py-2 rounded-full text-sm font-bold hover:bg-[#6B0F0F] transition">
                Đăng gà ngay
              </Link>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {gaList.map((ga, idx) => <GaCard key={ga.id} ga={ga} idx={idx} />)}
          </div>
        )
      )}

      {tab === 'ban' && (
        gaDaBan.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-xl shadow-sm text-gray-400">
            <div className="text-4xl mb-2">🐓</div>
            <div className="text-sm">Chưa có gà đã bán</div>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {gaDaBan.map((ga, idx) => <GaCard key={ga.id} ga={ga} idx={idx} />)}
          </div>
        )
      )}

      {tab === 'danh_gia' && (
        <div className="space-y-3">
          {danhGia.length === 0 ? (
            <div className="text-center py-12 bg-white rounded-xl shadow-sm text-gray-400">
              <div className="text-4xl mb-2">⭐</div>
              <div className="text-sm">Chưa có đánh giá nào</div>
            </div>
          ) : (
            danhGia.map((dg: any) => (
              <div key={dg.id} className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex items-center gap-3 mb-2">
                  <div className="w-9 h-9 bg-[#8B1A1A] rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {(dg.profiles?.username || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-semibold text-sm text-gray-800">{dg.profiles?.username || 'Người dùng'}</div>
                    <div className="text-yellow-500 text-xs">⭐⭐⭐⭐⭐</div>
                  </div>
                  <div className="ml-auto text-xs text-gray-400">
                    {new Date(dg.created_at).toLocaleDateString('vi-VN')}
                  </div>
                </div>
                <p className="text-sm text-gray-600">{dg.noi_dung}</p>
              </div>
            ))
          )}
        </div>
      )}

      {/* LIÊN HỆ */}
      {!isMe && (
        <div className="mt-4 bg-white rounded-xl p-4 shadow-sm">
          <button className="w-full bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition">
            💬 Nhắn tin người bán
          </button>
        </div>
      )}

      {/* ĐĂNG GÀ (nếu là mình) */}
      {isMe && (
        <div className="mt-4">
          <Link href="/dang-ga"
            className="block w-full bg-gradient-to-r from-[#8B1A1A] to-red-700 text-white font-black py-3 rounded-xl text-center hover:opacity-90 transition">
            🐓 Đăng bán gà mới
          </Link>
        </div>
      )}
    </div>
  );
}
