'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useChatPopup } from '@/components/chat/ChatPopupContext';

export const dynamic = 'force-dynamic';

// ── Modal Mua Ngay ────────────────────────────────────────────
function ModalMuaNgay({ ga, nguoiBan, onClose }: { ga: any; nguoiBan: any; onClose: () => void }) {
  const [step, setStep] = useState<'confirm' | 'success'>('confirm');
  const [loading, setLoading] = useState(false);
  const { openChat } = useChatPopup();

  const giaCoc = Math.round(parseInt(ga.gia) * 0.3);

  async function handleDatCoc() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert('Vui lòng đăng nhập!'); setLoading(false); return; }

    const maGD = `CGV-${Date.now()}`;
    const { error } = await supabase.from('orders').insert({
      ga_id: ga.id,
      buyer_id: user.id,
      seller_id: ga.user_id,
      gia: ga.gia,
      tien_coc: giaCoc,
      ma_giao_dich: maGD,
      status: 'pending_deposit',
    });

    if (!error) {
      setStep('success');
      // Mở chat thông báo
      const anhGa = ga.ga_images?.find((i: any) => i.is_primary)?.url || ga.ga_images?.[0]?.url || '';
      await openChat(ga.id, ga.user_id, ga.ten, anhGa);
    } else {
      alert('Có lỗi xảy ra: ' + error.message);
    }
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>

        {step === 'confirm' ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-black text-lg text-gray-900">🛒 Xác nhận mua gà</h2>
              <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition text-gray-500">✕</button>
            </div>

            {/* Thông tin gà */}
            <div className="p-5">
              <div className="flex gap-4 bg-gray-50 rounded-xl p-4 mb-5">
                {ga.ga_images?.[0]?.url ? (
                  <img src={ga.ga_images.find((i: any) => i.is_primary)?.url || ga.ga_images[0].url}
                    alt={ga.ten} className="w-20 h-20 object-cover rounded-xl flex-shrink-0" />
                ) : (
                  <div className="w-20 h-20 bg-orange-800 rounded-xl flex items-center justify-center text-3xl flex-shrink-0">🐓</div>
                )}
                <div>
                  <div className="font-black text-gray-900">{ga.ten}</div>
                  <div className="text-xs text-gray-500 mt-1">{ga.loai_ga} • {ga.khu_vuc}</div>
                  <div className="text-[#8B1A1A] font-black text-lg mt-1">
                    {parseInt(ga.gia).toLocaleString('vi-VN')} đ
                  </div>
                </div>
              </div>

              {/* Thông tin giao dịch */}
              <div className="space-y-3 mb-5">
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Người bán</span>
                  <span className="font-semibold text-sm">{nguoiBan?.username || 'Người bán'}</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Giá gà</span>
                  <span className="font-black text-[#8B1A1A]">{parseInt(ga.gia).toLocaleString('vi-VN')} đ</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-gray-100">
                  <span className="text-sm text-gray-600">Tiền cọc (30%)</span>
                  <span className="font-black text-blue-600">{giaCoc.toLocaleString('vi-VN')} đ</span>
                </div>
              </div>

              {/* Thông tin thanh toán */}
              <div className="bg-blue-50 rounded-xl p-4 mb-5">
                <div className="font-bold text-sm text-blue-800 mb-2">💳 Chuyển khoản đặt cọc</div>
                <div className="text-xs text-blue-700 space-y-1">
                  <div>Số tiền: <span className="font-black">{giaCoc.toLocaleString('vi-VN')} đ</span></div>
                  <div>Nội dung: <span className="font-semibold">CGV {ga.id} coc</span></div>
                </div>
              </div>

              <div className="text-xs text-gray-400 mb-5 text-center">
                Sau khi đặt cọc, admin sẽ xác nhận và kết nối bạn với người bán
              </div>

              <div className="flex gap-3">
                <button onClick={onClose}
                  className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 transition">
                  Hủy
                </button>
                <button onClick={handleDatCoc} disabled={loading}
                  className="flex-1 bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition disabled:opacity-60">
                  {loading ? '⏳ Đang xử lý...' : '✅ Xác nhận đặt cọc'}
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Success */
          <div className="p-8 text-center">
            <div className="text-6xl mb-4">🎉</div>
            <h3 className="font-black text-xl text-gray-900 mb-2">Đặt cọc thành công!</h3>
            <p className="text-gray-500 text-sm mb-6">
              Admin sẽ xác nhận trong vòng 24h. Chat với người bán để thống nhất chi tiết giao dịch.
            </p>
            <button onClick={onClose}
              className="w-full bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition">
              Tiếp tục nhắn tin →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Modal Liên Hệ ─────────────────────────────────────────────
function ModalLienHe({ nguoiBan, onClose }: { nguoiBan: any; onClose: () => void }) {
  const phone = nguoiBan?.phone;
  const zalo = nguoiBan?.zalo || nguoiBan?.phone;
  const phonePublic = nguoiBan?.phone_visibility !== 'private';

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-black text-lg">📞 Liên hệ người bán</h2>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 transition text-gray-500">✕</button>
        </div>
        <div className="p-5 space-y-3">
          {/* Avatar + tên */}
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 mb-4">
            <div className="w-12 h-12 bg-[#8B1A1A] rounded-full flex items-center justify-center text-white font-black text-lg">
              {(nguoiBan?.username || 'U')[0].toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-gray-900">{nguoiBan?.username || 'Người bán'}</div>
              <div className="text-xs text-gray-500">⭐ {nguoiBan?.trust_score || 5.0} điểm uy tín</div>
            </div>
          </div>

          {/* SĐT */}
          {phone && phonePublic ? (
            <a href={`tel:${phone}`}
              className="flex items-center gap-3 w-full bg-green-50 border border-green-200 text-green-800 font-bold py-3 px-4 rounded-xl hover:bg-green-100 transition">
              <span className="text-xl">📞</span>
              <div>
                <div className="text-xs text-green-600 font-normal">Gọi điện</div>
                <div>{phone}</div>
              </div>
            </a>
          ) : !phonePublic ? (
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 text-gray-400 py-3 px-4 rounded-xl">
              <span className="text-xl">🔒</span>
              <div className="text-sm">Người bán đã ẩn số điện thoại</div>
            </div>
          ) : (
            <div className="flex items-center gap-3 bg-gray-50 border border-gray-200 text-gray-400 py-3 px-4 rounded-xl">
              <span className="text-xl">📞</span>
              <div className="text-sm">Chưa cập nhật số điện thoại</div>
            </div>
          )}

          {/* Zalo */}
          {zalo && phonePublic ? (
            <a href={`https://zalo.me/${zalo}`} target="_blank"
              className="flex items-center gap-3 w-full bg-blue-50 border border-blue-200 text-blue-800 font-bold py-3 px-4 rounded-xl hover:bg-blue-100 transition">
              <span className="text-xl">💬</span>
              <div>
                <div className="text-xs text-blue-600 font-normal">Zalo</div>
                <div>{zalo}</div>
              </div>
            </a>
          ) : null}

          <div className="text-xs text-gray-400 text-center pt-2">
            Hoặc dùng chat trong app để nhắn tin
          </div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
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
  const [showMuaNgay, setShowMuaNgay] = useState(false);
  const [showLienHe, setShowLienHe] = useState(false);

  useEffect(() => { if (id) fetchGa(); }, [id]);

  const fetchGa = async () => {
    try {
      const { data: gaData } = await supabase
        .from('ga')
        .select(`*, ga_images (id, url, is_primary), ai_analysis (total_score, nhan_xet, mat_score, chan_score, vay_score, dau_score)`)
        .eq('id', id).single();

      if (gaData) {
        setGa(gaData);
        setAiData(gaData.ai_analysis?.[0] || null);
        if (gaData.user_id) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', gaData.user_id).single();
          setNguoiBan(profile);
        }
        const { data: cmts } = await supabase.from('comments').select('*, profiles(username)').eq('ga_id', id).order('created_at', { ascending: false });
        setComments(cmts || []);
        await supabase.from('ga').update({ view_count: (gaData.view_count || 0) + 1 }).eq('id', id);
      }
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const addComment = async () => {
    if (!comment.trim()) return;
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { alert('Vui lòng đăng nhập để bình luận'); return; }
    const { data } = await supabase.from('comments').insert({ ga_id: id, user_id: user.id, noi_dung: comment }).select('*, profiles(username)').single();
    if (data) { setComments([data, ...comments]); setComment(''); }
  };

  // Trả giá → chat popup
  const handleTraGia = async () => {
    if (!ga?.user_id) return;
    setChatLoading(true);
    const anhGa = ga.ga_images?.find((i: any) => i.is_primary)?.url || ga.ga_images?.[0]?.url || '';
    await openChat(ga.id, ga.user_id, ga.ten, anhGa);
    setChatLoading(false);
  };

  const getDiemMau = (d: number) => d >= 8 ? 'text-green-600' : d >= 6.5 ? 'text-yellow-600' : 'text-red-500';
  const getBarWidth = (d: number) => `${(d || 0) * 10}%`;

  if (loading) return (
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

  if (!ga) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">🐓</div>
      <div className="font-bold text-gray-600">Không tìm thấy gà này</div>
      <Link href="/cho" className="mt-4 inline-block text-[#8B1A1A] hover:underline">← Về chợ</Link>
    </div>
  );

  const anhList = ga.ga_images || [];
  const anhHienTai = anhList[anhChinh]?.url;

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">

      {/* MODALS */}
      {showMuaNgay && nguoiBan && (
        <ModalMuaNgay ga={ga} nguoiBan={nguoiBan} onClose={() => setShowMuaNgay(false)} />
      )}
      {showLienHe && (
        <ModalLienHe nguoiBan={nguoiBan} onClose={() => setShowLienHe(false)} />
      )}

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

          {/* ── 3 NÚT ĐÚNG LOGIC ── */}
          <div className="flex gap-3 mb-6 flex-wrap">
            {/* Mua ngay → modal đặt cọc */}
            <button onClick={() => setShowMuaNgay(true)}
              className="flex-1 bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition text-center min-w-[100px]">
              🛒 Mua ngay
            </button>
            {/* Trả giá → chat popup */}
            <button onClick={handleTraGia} disabled={chatLoading}
              className="flex-1 border-2 border-[#8B1A1A] text-[#8B1A1A] font-bold py-3 rounded-xl hover:bg-red-50 transition text-center min-w-[100px] disabled:opacity-60">
              {chatLoading ? '⏳...' : '💬 Trả giá'}
            </button>
            {/* Liên hệ → modal SĐT/Zalo */}
            <button onClick={() => setShowLienHe(true)}
              className="border-2 border-gray-300 text-gray-600 font-bold px-4 py-3 rounded-xl hover:bg-gray-50 transition">
              📞 Liên hệ
            </button>
          </div>

          {/* AI PHÂN TÍCH */}
          {aiData ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex justify-between items-center mb-3">
                <h3 className="font-black text-gray-800">🤖 Phân tích AI</h3>
                <div className={`text-3xl font-black ${getDiemMau(aiData.total_score)}`}>{aiData.total_score}/10</div>
              </div>
              {aiData.nhan_xet && <p className="text-sm text-gray-600 mb-3 leading-relaxed">{aiData.nhan_xet}</p>}
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
              <button onClick={addComment} className="bg-[#8B1A1A] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#6B0F0F] transition">Gửi</button>
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
              <button onClick={handleTraGia} disabled={chatLoading}
                className="flex-1 bg-[#8B1A1A] text-white font-bold py-2 rounded-xl hover:bg-[#6B0F0F] transition text-sm disabled:opacity-60">
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
