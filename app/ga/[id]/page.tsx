'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import { useChat } from '@/components/chat/ChatContext';

export const dynamic = 'force-dynamic';

// ── Helper: lấy hoặc tạo conversation ────────────────────────
async function getOrCreateConv(gaId: string, sellerId: string, buyerId: string): Promise<string | null> {
  // Tìm conversation đã có
  const { data: existing } = await supabase
    .from('conversations')
    .select('id')
    .eq('ga_id', gaId)
    .eq('seller_id', sellerId)
    .eq('buyer_id', buyerId)
    .maybeSingle();

  if (existing) return existing.id;

  // Tạo mới
  const { data: created } = await supabase
    .from('conversations')
    .insert({ ga_id: gaId, seller_id: sellerId, buyer_id: buyerId, type: 'product' })
    .select('id')
    .single();

  return created?.id || null;
}

// ── Modal Mua Ngay ────────────────────────────────────────────
function ModalMuaNgay({ ga, nguoiBan, currentUser, onClose }: {
  ga: any; nguoiBan: any; currentUser: any; onClose: () => void;
}) {
  const { openChat } = useChat();
  const [mode, setMode] = useState<'choose' | 'qua-san' | 'tu-mua' | 'success'>('choose');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [maGD, setMaGD] = useState('');

  useEffect(() => {
    supabase.from('config').select('*').single().then(({ data }) => {
      if (data) setConfig(data);
    });
  }, []);

  const giaGa = parseInt(ga.gia);
  const cocPercent = config?.coc_percent || 10;
  const phiPercent = config?.phi_percent || 1;
  const tiencoc = Math.round(giaGa * cocPercent / 100);
  const phiGD = Math.round(giaGa * phiPercent / 100);
  const tkTen = config?.tk_ten || 'NGUYEN CHI VUNG';
  const tkSo = config?.tk_so || '7207205286010';
  const tkBin = config?.tk_bin || '970405';
  const tkNganHang = config?.tk_ngan_hang || 'VietinBank';

  async function handleDatCoc() {
    setLoading(true);
    if (!currentUser) { alert('Vui lòng đăng nhập!'); setLoading(false); return; }
    if (currentUser.id === ga.user_id) { alert('Bạn không thể mua gà của chính mình!'); setLoading(false); return; }

    const ma = `CGV-${ga.id}-${Date.now()}`;
    setMaGD(ma);

    const { error } = await supabase.from('orders').insert({
      ga_id: ga.id,
      buyer_id: currentUser.id,
      seller_id: ga.user_id,
      gia: ga.gia,
      tien_coc: tiencoc,
      ma_giao_dich: ma,
      status: 'pending_deposit',
    });

    if (!error) {
      // Mở chat với người bán
      const anhGa = ga.ga_images?.find((i: any) => i.is_primary)?.url || ga.ga_images?.[0]?.url || '';
      const convId = await getOrCreateConv(ga.id, ga.user_id, currentUser.id);
      if (convId) {
        await openChat({
          convId,
          type: 'product',
          gaId: ga.id,
          gaTen: ga.ten,
          gaAnh: anhGa,
          doiPhuongId: ga.user_id,
        });
      }
      setMode('success');
    } else {
      alert('Lỗi: ' + error.message);
    }
    setLoading(false);
  }

  const qrUrl = `https://img.vietqr.io/image/${tkBin}-${tkSo}-compact2.png?amount=${tiencoc}&addInfo=${encodeURIComponent(`COC ${ga.id}`)}&accountName=${encodeURIComponent(tkTen)}`;

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b sticky top-0 bg-white z-10">
          <div className="flex items-center gap-2">
            {mode !== 'choose' && (
              <button onClick={() => setMode('choose')} className="text-gray-400 hover:text-gray-600 mr-1">←</button>
            )}
            <h2 className="font-black text-lg">
              {mode === 'choose' && '🛒 Mua gà này'}
              {mode === 'qua-san' && '🔒 Mua qua sàn (An toàn)'}
              {mode === 'tu-mua' && '⚠️ Tự liên hệ mua riêng'}
              {mode === 'success' && '✅ Đặt cọc thành công!'}
            </h2>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 text-gray-500">✕</button>
        </div>

        <div className="p-5">
          {/* BƯỚC 1: CHỌN HÌNH THỨC */}
          {mode === 'choose' && (
            <>
              <div className="flex gap-3 bg-gray-50 rounded-xl p-3 mb-5">
                {ga.ga_images?.[0]?.url ? (
                  <img src={ga.ga_images.find((i: any) => i.is_primary)?.url || ga.ga_images[0].url}
                    alt={ga.ten} className="w-16 h-16 object-cover rounded-xl flex-shrink-0" />
                ) : (
                  <div className="w-16 h-16 bg-orange-800 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🐓</div>
                )}
                <div>
                  <div className="font-black text-gray-900">{ga.ten}</div>
                  <div className="text-xs text-gray-500">{ga.loai_ga} • {ga.khu_vuc}</div>
                  <div className="text-[#8B1A1A] font-black text-base mt-0.5">{giaGa.toLocaleString('vi-VN')} đ</div>
                </div>
              </div>

              <div className="space-y-3">
                <button onClick={() => setMode('qua-san')}
                  className="w-full text-left border-2 border-green-500 rounded-xl p-4 hover:bg-green-50 transition group">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">🔒</span>
                    <div className="flex-1">
                      <div className="font-black text-green-800 flex items-center gap-2">
                        Mua qua sàn Chủ Gà Việt
                        <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full font-bold">AN TOÀN</span>
                      </div>
                      <div className="text-sm text-green-700 mt-1">
                        ✓ Đặt cọc {cocPercent}% ({tiencoc.toLocaleString('vi-VN')}đ) qua sàn<br />
                        ✓ Admin xác nhận & bảo đảm giao dịch<br />
                        ✓ Hoàn cọc nếu gà không đúng mô tả<br />
                        ✓ Phí sàn {phiPercent}% ({phiGD.toLocaleString('vi-VN')}đ)
                      </div>
                    </div>
                    <span className="text-green-500 group-hover:translate-x-1 transition">→</span>
                  </div>
                </button>

                <button onClick={() => setMode('tu-mua')}
                  className="w-full text-left border-2 border-orange-300 rounded-xl p-4 hover:bg-orange-50 transition group">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl mt-0.5">⚠️</span>
                    <div className="flex-1">
                      <div className="font-black text-orange-800">Tự liên hệ mua riêng</div>
                      <div className="text-sm text-orange-700 mt-1">
                        ✗ Không có bảo đảm từ sàn<br />
                        ✗ Rủi ro lừa đảo cao hơn<br />
                        ✓ Không mất phí sàn
                      </div>
                    </div>
                    <span className="text-orange-400 group-hover:translate-x-1 transition">→</span>
                  </div>
                </button>
              </div>
            </>
          )}

          {/* BƯỚC 2A: MUA QUA SÀN */}
          {mode === 'qua-san' && (
            <>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4">
                <div className="font-bold text-green-800 mb-3">📋 Chi tiết giao dịch</div>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Giá gà', value: `${giaGa.toLocaleString('vi-VN')} đ` },
                    { label: `Tiền cọc (${cocPercent}%)`, value: `${tiencoc.toLocaleString('vi-VN')} đ`, color: 'text-blue-600' },
                    { label: `Phí sàn (${phiPercent}%)`, value: `${phiGD.toLocaleString('vi-VN')} đ`, color: 'text-gray-500' },
                    { label: 'Người bán', value: nguoiBan?.username || 'Người bán' },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between items-center py-1.5 border-b border-green-100 last:border-0">
                      <span className="text-gray-600">{item.label}</span>
                      <span className={`font-bold ${item.color || 'text-gray-900'}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                <div className="font-bold text-blue-800 mb-3">📱 Quét QR đặt cọc</div>
                <div className="flex gap-4 items-center">
                  <img src={qrUrl} alt="VietQR" className="w-32 h-32 rounded-lg border border-blue-200 bg-white flex-shrink-0"
                    onError={e => { (e.target as HTMLImageElement).style.display = 'none'; }} />
                  <div className="text-sm space-y-1.5">
                    <div><span className="text-gray-500">Ngân hàng:</span> <span className="font-bold">{tkNganHang}</span></div>
                    <div><span className="text-gray-500">Số TK:</span> <span className="font-bold font-mono">{tkSo}</span></div>
                    <div><span className="text-gray-500">Chủ TK:</span> <span className="font-bold">{tkTen}</span></div>
                    <div><span className="text-gray-500">Số tiền:</span> <span className="font-black text-blue-700">{tiencoc.toLocaleString('vi-VN')} đ</span></div>
                    <div><span className="text-gray-500">Nội dung:</span> <span className="font-mono font-bold text-red-700">COC {ga.id}</span></div>
                  </div>
                </div>
              </div>

              <div className="text-xs text-gray-400 bg-gray-50 rounded-lg p-3 mb-4">
                💡 Sau khi chuyển khoản, nhấn <strong>"Xác nhận đã cọc"</strong> — admin sẽ kiểm tra trong vòng 24h.
              </div>

              <div className="flex gap-3">
                <button onClick={() => setMode('choose')}
                  className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 transition">
                  ← Quay lại
                </button>
                <button onClick={handleDatCoc} disabled={loading}
                  className="flex-1 bg-green-600 text-white font-black py-3 rounded-xl hover:bg-green-700 transition disabled:opacity-60">
                  {loading ? '⏳ Đang xử lý...' : '✅ Xác nhận đã cọc'}
                </button>
              </div>
            </>
          )}

          {/* BƯỚC 2B: TỰ MUA RIÊNG */}
          {mode === 'tu-mua' && (
            <>
              <div className="bg-orange-50 border-2 border-orange-400 rounded-xl p-4 mb-4">
                <div className="flex items-start gap-2">
                  <span className="text-2xl">⚠️</span>
                  <div>
                    <div className="font-black text-orange-800 mb-1">Cảnh báo rủi ro!</div>
                    <div className="text-sm text-orange-700 space-y-1">
                      <div>• Giao dịch ngoài sàn không được bảo đảm</div>
                      <div>• Chủ Gà Việt không chịu trách nhiệm nếu xảy ra tranh chấp</div>
                      <div>• Hãy gặp mặt trực tiếp khi giao dịch</div>
                      <div>• Không chuyển khoản trước khi xem gà thật</div>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-4">
                <div className="font-bold text-gray-700 mb-3">👤 Thông tin người bán</div>
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-12 h-12 bg-[#8B1A1A] rounded-full flex items-center justify-center text-white font-black text-lg">
                    {(nguoiBan?.username || 'U')[0].toUpperCase()}
                  </div>
                  <div>
                    <div className="font-bold">{nguoiBan?.username || 'Người bán'}</div>
                    <div className="text-xs text-gray-500">⭐ {nguoiBan?.trust_score || 5.0} điểm uy tín</div>
                  </div>
                </div>
                {nguoiBan?.phone && nguoiBan?.phone_visibility !== 'private' ? (
                  <div className="space-y-2">
                    <a href={`tel:${nguoiBan.phone}`}
                      className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 font-bold py-2.5 px-4 rounded-xl hover:bg-green-100 transition">
                      <span className="text-xl">📞</span>
                      <div><div className="text-xs text-green-600 font-normal">Gọi điện</div><div>{nguoiBan.phone}</div></div>
                    </a>
                    <a href={`https://zalo.me/${nguoiBan.phone}`} target="_blank"
                      className="flex items-center gap-3 bg-blue-50 border border-blue-200 text-blue-800 font-bold py-2.5 px-4 rounded-xl hover:bg-blue-100 transition">
                      <span className="text-xl">💬</span>
                      <div><div className="text-xs text-blue-600 font-normal">Zalo</div><div>{nguoiBan.phone}</div></div>
                    </a>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-3 text-sm text-gray-500 text-center">
                    🔒 Người bán chưa cung cấp thông tin liên hệ công khai
                  </div>
                )}
              </div>

              <div className="flex gap-3">
                <button onClick={() => setMode('choose')}
                  className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 transition">
                  ← Quay lại
                </button>
                <button onClick={onClose}
                  className="flex-1 bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition">
                  Đã hiểu, tiếp tục
                </button>
              </div>
            </>
          )}

          {/* SUCCESS */}
          {mode === 'success' && (
            <div className="text-center py-4">
              <div className="text-6xl mb-4">🎉</div>
              <h3 className="font-black text-xl text-gray-900 mb-2">Đặt cọc thành công!</h3>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-left text-sm">
                <div className="font-bold text-green-800 mb-2">✅ Tiếp theo:</div>
                <div className="space-y-1 text-green-700">
                  <div>1. Admin xác nhận thanh toán trong 24h</div>
                  <div>2. Chat với người bán để thống nhất giao nhận</div>
                  <div>3. Thanh toán phần còn lại khi nhận gà</div>
                </div>
              </div>
              {maGD && (
                <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs text-gray-500 font-mono">Mã GD: {maGD}</div>
              )}
              <button onClick={onClose}
                className="w-full bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition">
                Tiếp tục nhắn tin với người bán →
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Modal Liên Hệ ─────────────────────────────────────────────
function ModalLienHe({ nguoiBan, onClose }: { nguoiBan: any; onClose: () => void }) {
  const phone = nguoiBan?.phone;
  const phonePublic = nguoiBan?.phone_visibility !== 'private';
  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="font-black text-lg">📞 Liên hệ người bán</h2>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 text-gray-500">✕</button>
        </div>
        <div className="p-5 space-y-3">
          <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3 mb-4">
            <div className="w-12 h-12 bg-[#8B1A1A] rounded-full flex items-center justify-center text-white font-black text-lg">
              {(nguoiBan?.username || 'U')[0].toUpperCase()}
            </div>
            <div>
              <div className="font-bold text-gray-900">{nguoiBan?.username || 'Người bán'}</div>
              <div className="text-xs text-gray-500">⭐ {nguoiBan?.trust_score || 5.0} điểm uy tín</div>
            </div>
          </div>
          {phone && phonePublic ? (
            <>
              <a href={`tel:${phone}`}
                className="flex items-center gap-3 w-full bg-green-50 border border-green-200 text-green-800 font-bold py-3 px-4 rounded-xl hover:bg-green-100 transition">
                <span className="text-xl">📞</span>
                <div><div className="text-xs text-green-600 font-normal">Gọi điện</div><div>{phone}</div></div>
              </a>
              <a href={`https://zalo.me/${phone}`} target="_blank"
                className="flex items-center gap-3 w-full bg-blue-50 border border-blue-200 text-blue-800 font-bold py-3 px-4 rounded-xl hover:bg-blue-100 transition">
                <span className="text-xl">💬</span>
                <div><div className="text-xs text-blue-600 font-normal">Zalo</div><div>{phone}</div></div>
              </a>
            </>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-gray-400 text-sm">
              🔒 Người bán chưa cung cấp thông tin liên hệ công khai
            </div>
          )}
          <div className="text-xs text-gray-400 text-center pt-1">Hoặc dùng chat trong app để nhắn tin</div>
        </div>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────
export default function GaDetailPage() {
  const { id } = useParams();
  const { openChat, currentUser } = useChat();

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
    if (!currentUser) { alert('Vui lòng đăng nhập để bình luận'); return; }
    const { data } = await supabase.from('comments').insert({ ga_id: id, user_id: currentUser.id, noi_dung: comment }).select('*, profiles(username)').single();
    if (data) { setComments([data, ...comments]); setComment(''); }
  };

  const handleTraGia = async () => {
    if (!currentUser) { alert('Vui lòng đăng nhập!'); return; }
    if (!ga?.user_id) return;
    if (currentUser.id === ga.user_id) { alert('Đây là gà của bạn!'); return; }
    setChatLoading(true);
    const anhGa = ga.ga_images?.find((i: any) => i.is_primary)?.url || ga.ga_images?.[0]?.url || '';
    const convId = await getOrCreateConv(ga.id, ga.user_id, currentUser.id);
    if (convId) {
      await openChat({
        convId,
        type: 'product',
        gaId: ga.id,
        gaTen: ga.ten,
        gaAnh: anhGa,
        doiPhuongId: ga.user_id,
      });
    }
    setChatLoading(false);
  };

  const getDiemMau = (d: number) => d >= 8 ? 'text-green-600' : d >= 6.5 ? 'text-yellow-600' : 'text-red-500';
  const getBarWidth = (d: number) => `${(d || 0) * 10}%`;

  if (loading) return (
    <div className="max-w-6xl mx-auto px-4 py-8 animate-pulse">
      <div className="grid md:grid-cols-2 gap-6">
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
        <ModalMuaNgay ga={ga} nguoiBan={nguoiBan} currentUser={currentUser} onClose={() => setShowMuaNgay(false)} />
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
          <div className="text-[#8B1A1A] font-black text-3xl mb-4">{parseInt(ga.gia).toLocaleString('vi-VN')} đ</div>
          <div className="text-sm text-gray-500 mb-1">Giá thương lượng</div>
          <div className="flex gap-3 mb-4 flex-wrap">
            {ga.can_nang && <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">{ga.can_nang} kg</span>}
            {ga.tuoi && <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">{ga.tuoi} tháng</span>}
            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">📍 {ga.khu_vuc}</span>
            {ga.view_count > 0 && <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">👁 {ga.view_count} lượt xem</span>}
          </div>

          {/* 3 NÚT */}
          <div className="flex gap-3 mb-6 flex-wrap">
            <button onClick={() => setShowMuaNgay(true)}
              className="flex-1 bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition min-w-[100px]">
              🛒 Mua ngay
            </button>
            <button onClick={handleTraGia} disabled={chatLoading}
              className="flex-1 border-2 border-[#8B1A1A] text-[#8B1A1A] font-bold py-3 rounded-xl hover:bg-red-50 transition min-w-[100px] disabled:opacity-60">
              {chatLoading ? '⏳...' : '💬 Trả giá'}
            </button>
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
