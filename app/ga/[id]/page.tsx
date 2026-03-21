'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useChatPopup } from '@/components/chat/ChatPopupContext';

export default function GaDetailPage() {
  const { id } = useParams();
  const { openChat } = useChatPopup();

  const [ga, setGa] = useState<any>(null);
  const [aiData, setAiData] = useState<any>(null);
  const [nguoiBan, setNguoiBan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [anhChinh, setAnhChinh] = useState(0);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => {
    if (id) fetchGa();
  }, [id]);

  const fetchGa = async () => {
    try {
      const { data: gaData } = await supabase
        .from('ga')
        .select(`
          *,
          ga_images (id, url, is_primary),
          ai_analysis (total_score, nhan_xet, mat_score, chan_score, vay_score, dau_score)
        `)
        .eq('id', id)
        .single();

      if (gaData) {
        setGa(gaData);
        setAiData(gaData.ai_analysis?.[0] || null);

        if (gaData.user_id) {
          const { data: profile } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', gaData.user_id)
            .single();
          setNguoiBan(profile);
        }

        const { data: cmts } = await supabase
          .from('comments')
          .select('*, profiles(username)')
          .eq('ga_id', id)
          .order('created_at', { ascending: false });
        setComments(cmts || []);

        await supabase
          .from('ga')
          .update({ view_count: (gaData.view_count || 0) + 1 })
          .eq('id', id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert('Vui lòng đăng nhập để bình luận'); return; }
    const { data } = await supabase
      .from('comments')
      .insert({ ga_id: id, user_id: user.id, noi_dung: comment })
      .select('*, profiles(username)')
      .single();
    if (data) { setComments([data, ...comments]); setComment(''); }
  };

  // ── Mở chat popup ─────────────────────────────────────────
  const handleOpenChat = async (message?: string) => {
    if (!ga?.user_id) return;
    setChatLoading(true);
    const anhGa = ga.ga_images?.find((i: any) => i.is_primary)?.url || ga.ga_images?.[0]?.url || '';
    await openChat(ga.id, ga.user_id, ga.ten, anhGa);
    setChatLoading(false);
  };

  const getDiemMau = (d: number) => d >= 8 ? 'text-green-600' : d >= 6.5 ? 'text-yellow-600' : 'text-red-500';
  const getBarWidth = (d: number) => `${(d || 0) * 10}%`;

  if (loading) {
    return (
      <div className="max-w-6xl mx-auto px-4 py-8">
        <div className="animate-pulse grid md:grid-cols-2 gap-6">
          <div className="bg-gray-200 h-72 rounded-xl"></div>
          <div className="space-y-4">
            <div className="bg-gray-200 h-8 rounded w-3/4"></div>
            <div className="bg-gray-200 h-6 rounded w-1/2"></div>
            <div className="bg-gray-200 h-32 rounded"></div>
          </div>
        </div>
      </div>
    );
  }

  if (!ga) {
    return (
      <div className="text-center py-20">
        <div className="text-5xl mb-4">🐓</div>
        <div className="font-bold text-gray-600">Không tìm thấy gà này</div>
        <Link href="/cho" className="mt-4 inline-block text-[#8B1A1A] hover:underline">← Về chợ</Link>
      </div>
    );
  }

  const anhList = ga.ga_images || [];
  const anhHienTai = anhList[anhChinh]?.url;

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">

      {/* BREADCRUMB */}
      <div className="text-xs text-gray-500 mb-4">
        <Link href="/" className="hover:text-red-800">Trang chủ</Link> &gt;{' '}
        <Link href="/cho" className="hover:text-red-800">Chợ</Link> &gt;{' '}
        <span className="text-gray-800">{ga.ten}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">

        {/* ẢNH */}
        <div>
          {anhHienTai ? (
            <img src={anhHienTai} alt={ga.ten} className="w-full h-72 object-cover rounded-xl mb-3" />
          ) : (
            <div className="bg-orange-800 rounded-xl h-72 flex items-center justify-center text-8xl mb-3">🐓</div>
          )}
          {anhList.length > 0 && (
            <div className="flex gap-2 flex-wrap">
              {anhList.map((anh: any, i: number) => (
                <button key={i} onClick={() => setAnhChinh(i)}
                  className={`w-16 h-16 rounded-lg overflow-hidden border-2 transition ${anhChinh === i ? 'border-yellow-400' : 'border-transparent'}`}>
                  <img src={anh.url} alt="" className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* THÔNG TIN */}
        <div>
          <div className="text-xs text-[#8B1A1A] font-semibold mb-1">{ga.loai_ga}</div>
          <h1 className="font-black text-2xl text-gray-800 mb-2">{ga.ten}</h1>
          <div className="text-[#8B1A1A] font-black text-3xl mb-4">
            {parseInt(ga.gia).toLocaleString('vi-VN')} đ
          </div>

          <div className="text-sm text-gray-500 mb-1">Giá thương lượng</div>
          <div className="flex gap-3 mb-4 flex-wrap">
            {ga.can_nang && <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">{ga.can_nang} kg</span>}
            {ga.tuoi && <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">{ga.tuoi} tháng</span>}
            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">📍 {ga.khu_vuc}</span>
            {ga.view_count > 0 && <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">👁 {ga.view_count} lượt xem</span>}
          </div>

          {/* ── BUTTONS CHAT — KHÔNG CHUYỂN TRANG ── */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <button
              onClick={() => handleOpenChat('Tôi muốn mua con gà này!')}
              disabled={chatLoading}
              className="flex-1 bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition text-center min-w-[100px] disabled:opacity-60"
            >
              {chatLoading ? '⏳...' : '🛒 Mua ngay'}
            </button>
            <button
              onClick={() => handleOpenChat('Giá có thể thương lượng không bạn?')}
              disabled={chatLoading}
              className="flex-1 border-2 border-[#8B1A1A] text-[#8B1A1A] font-bold py-3 rounded-xl hover:bg-red-50 transition text-center min-w-[100px] disabled:opacity-60"
            >
              💬 Trả giá
            </button>
            <button
              onClick={() => handleOpenChat()}
              disabled={chatLoading}
              className="border-2 border-gray-300 text-gray-600 font-bold px-4 py-3 rounded-xl hover:bg-gray-50 transition disabled:opacity-60"
            >
              📞 Liên hệ
            </button>
          </div>

          {/* AI PHÂN TÍCH */}
          {aiData ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-black text-gray-800">🤖 Phân tích AI</h3>
                <div className={`text-3xl font-black ${getDiemMau(aiData.total_score)}`}>
                  {aiData.total_score}/10
                </div>
              </div>
              {aiData.nhan_xet && (
                <p className="text-sm text-gray-600 mb-3 leading-relaxed">{aiData.nhan_xet}</p>
              )}
              {(aiData.mat_score || aiData.chan_score || aiData.vay_score || aiData.dau_score) && (
                <div className="grid grid-cols-2 gap-2">
                  {[
                    { label: '👁 Mắt', score: aiData.mat_score },
                    { label: '🦵 Chân', score: aiData.chan_score },
                    { label: '🐾 Vảy', score: aiData.vay_score },
                    { label: '🐓 Đầu', score: aiData.dau_score },
                  ].filter(item => item.score).map(item => (
                    <div key={item.label} className="bg-white rounded-lg p-2">
                      <div className="flex justify-between items-center">
                        <span className="text-xs font-semibold text-gray-600">{item.label}</span>
                        <span className={`text-xs font-black ${getDiemMau(item.score)}`}>{item.score}/10</span>
                      </div>
                      <div className="h-1.5 bg-gray-200 rounded-full mt-1">
                        <div className="h-1.5 bg-[#8B1A1A] rounded-full" style={{ width: getBarWidth(item.score) }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-gray-400 text-sm">
              🤖 Chưa có phân tích AI cho gà này
            </div>
          )}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">

        {/* MÔ TẢ + BÌNH LUẬN */}
        <div className="md:col-span-2 space-y-4">
          {ga.mo_ta && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-black text-gray-800 mb-3">📋 Mô tả</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{ga.mo_ta}</p>
            </div>
          )}

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-black text-gray-800 mb-3">💬 Bình luận ({comments.length})</h3>
            <div className="flex gap-2 mb-4">
              <input value={comment} onChange={e => setComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addComment()}
                placeholder="Nhận xét về con gà này..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
              <button onClick={addComment}
                className="bg-[#8B1A1A] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#6B0F0F] transition">
                Gửi
              </button>
            </div>
            {comments.length === 0 ? (
              <div className="text-center py-6 text-gray-400 text-sm">Chưa có bình luận. Hãy là người đầu tiên!</div>
            ) : (
              <div className="space-y-3">
                {comments.map((c: any) => (
                  <div key={c.id} className="flex gap-3">
                    <div className="w-8 h-8 bg-red-800 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                      {(c.profiles?.username || c.user_id)?.[0]?.toUpperCase() || 'U'}
                    </div>
                    <div className="flex-1">
                      <div className="flex gap-2 items-center">
                        <span className="font-semibold text-sm text-gray-800">{c.profiles?.username || 'Người dùng'}</span>
                        <span className="text-xs text-gray-400">{new Date(c.created_at).toLocaleDateString('vi-VN')}</span>
                      </div>
                      <div className="text-sm text-gray-600 mt-0.5">{c.noi_dung}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* NGƯỜI BÁN */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-black text-gray-800 mb-3">👤 Người bán</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-[#8B1A1A] rounded-full flex items-center justify-center text-white font-black text-lg">
                {(nguoiBan?.username || 'U')[0].toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-gray-800">{nguoiBan?.username || 'Người bán'}</div>
                <div className="text-xs text-gray-500">⭐ {nguoiBan?.trust_score || 5.0}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <Link href={`/ho-so/${ga.user_id}`}
                className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2 rounded-xl hover:bg-gray-50 transition text-sm text-center">
                Xem hồ sơ
              </Link>
              <button
                onClick={() => handleOpenChat()}
                disabled={chatLoading}
                className="flex-1 bg-[#8B1A1A] text-white font-bold py-2 rounded-xl hover:bg-[#6B0F0F] transition text-sm disabled:opacity-60"
              >
                💬 Nhắn tin
              </button>
            </div>
          </div>

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-black text-gray-800 mb-3">🐓 Gà tương tự</h3>
            <div className="text-sm text-gray-400 text-center py-2">Đang cập nhật...</div>
          </div>
        </div>
      </div>
    </div>
  );
}
