'use client';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useChat } from '@/components/chat/ChatContext';

function getYoutubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/);
  return m ? m[1] : null;
}
function getVideoThumb(url: string): string | null {
  const id = getYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}
function isValidVideoUrl(url: string): boolean {
  if (!url) return false;
  return !!(url.match(/youtube\.com/) || url.match(/youtu\.be/) ||
    url.match(/facebook\.com\/.*\/videos/) || url.match(/fb\.watch/) || url.match(/tiktok\.com/));
}
function timeAgo(d: string) {
  const s = Math.floor((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return 'vừa xong';
  if (s < 3600) return `${Math.floor(s / 60)} phút trước`;
  if (s < 86400) return `${Math.floor(s / 3600)} giờ trước`;
  return `${Math.floor(s / 86400)} ngày trước`;
}
async function getOrCreateConv(gaId: string, sellerId: string, buyerId: string): Promise<string | null> {
  const { data: ex } = await supabase.from('conversations').select('id')
    .eq('ga_id', gaId).eq('seller_id', sellerId).eq('buyer_id', buyerId).maybeSingle();
  if (ex) return ex.id;
  const { data: cr } = await supabase.from('conversations')
    .insert({ ga_id: gaId, seller_id: sellerId, buyer_id: buyerId, type: 'product' })
    .select('id').single();
  return cr?.id || null;
}

const GA_STATUS: Record<string, { label: string; color: string; bg: string; icon: string }> = {
  active:             { label: 'Đang bán',               color: '#16a34a', bg: '#dcfce7', icon: '🟢' },
  in_transaction:     { label: 'Đang giao dịch',         color: '#ca8a04', bg: '#fef9c3', icon: '🟡' },
  pending_completion: { label: 'Chờ xác nhận',           color: '#2563eb', bg: '#dbeafe', icon: '🔵' },
  pending_dispute:    { label: 'Chờ khiếu nại (3 ngày)', color: '#ea580c', bg: '#ffedd5', icon: '🟠' },
  sold:               { label: 'Đã bán',                 color: '#7c3aed', bg: '#ede9fe', icon: '✅' },
  hidden:             { label: 'Đang ẩn',                color: '#6b7280', bg: '#f3f4f6', icon: '👁️' },
};

// ── MODAL MUA NGAY ──────────────────────────────────────────
function ModalMuaNgay({ ga, nguoiBan, currentUser, onClose }: {
  ga: any; nguoiBan: any; currentUser: any; onClose: () => void;
}) {
  const { openChat } = useChat();
  const [mode, setMode] = useState<'choose' | 'qua-san' | 'tu-mua' | 'confirm' | 'success'>('choose');
  const [loading, setLoading] = useState(false);
  const [config, setConfig] = useState<any>(null);
  const [maGD, setMaGD] = useState('');
  const [orderId, setOrderId] = useState<number | null>(null);

  useEffect(() => {
    supabase.from('config').select('*').single().then(({ data }) => { if (data) setConfig(data); });
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
  const noiDungCK = `DATCOC ${ga.id}`;
  const qrUrl = `https://img.vietqr.io/image/${tkBin}-${tkSo}-compact2.png?amount=${tiencoc}&addInfo=${encodeURIComponent(noiDungCK)}&accountName=${encodeURIComponent(tkTen)}`;

  async function handleTaoDon() {
    setLoading(true);
    if (!currentUser) { alert('Vui lòng đăng nhập!'); setLoading(false); return; }
    if (currentUser.id === ga.user_id) { alert('Bạn không thể mua gà của chính mình!'); setLoading(false); return; }
    const { data: existing } = await supabase
      .from('orders').select('id, ma_giao_dich, status')
      .eq('ga_id', ga.id).eq('buyer_id', currentUser.id)
      .in('status', ['pending_deposit', 'pending_confirmation']).maybeSingle();
    if (existing) {
      setMaGD(existing.ma_giao_dich); setOrderId(existing.id);
      setMode('confirm'); setLoading(false); return;
    }
    const ma = `CGV-${ga.id}-${Date.now()}`;
    setMaGD(ma);
    const { data: newOrder, error } = await supabase.from('orders').insert({
      ga_id: ga.id, buyer_id: currentUser.id, seller_id: ga.user_id,
      gia: ga.gia, tien_coc: tiencoc, ma_giao_dich: ma, status: 'pending_deposit',
    }).select().single();
    if (!error && newOrder) { setOrderId(newOrder.id); setMode('confirm'); }
    else alert('Lỗi tạo đơn: ' + error?.message);
    setLoading(false);
  }

  async function handleDaChuyenKhoan() {
    if (!orderId) return;
    setLoading(true);
    const { error } = await supabase.from('orders').update({ status: 'pending_confirmation' }).eq('id', orderId);
    if (!error) {
      const anhGa = ga.ga_images?.find((i: any) => i.is_primary)?.url || ga.ga_images?.[0]?.url || '';
      const convId = await getOrCreateConv(String(ga.id), ga.user_id, currentUser.id);
      if (convId) await openChat({ convId, type: 'product', gaId: ga.id, gaTen: ga.ten, gaAnh: anhGa, doiPhuongId: ga.user_id });
      setMode('success');
    } else alert('Lỗi: ' + error.message);
    setLoading(false);
  }

  return (
    <div className="fixed inset-0 bg-black/80 z-[60] overflow-y-auto" onClick={onClose}>
      <div className="flex min-h-full items-start justify-center p-4 md:items-center">
        <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl" onClick={e => e.stopPropagation()}>

          {/* HEADER */}
          <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10 rounded-t-2xl">
            <div className="flex items-center gap-2">
              {(mode === 'qua-san' || mode === 'tu-mua') && (
                <button onClick={() => setMode('choose')} className="text-gray-400 hover:text-gray-600 mr-1">←</button>
              )}
              {mode === 'confirm' && (
                <button onClick={() => setMode('qua-san')} className="text-gray-400 hover:text-gray-600 mr-1">←</button>
              )}
              <h2 className="font-black text-base">
                {mode === 'choose' && '🛒 Mua gà này'}
                {mode === 'qua-san' && '🔒 Mua qua sàn (An toàn)'}
                {mode === 'tu-mua' && '⚠️ Tự liên hệ mua riêng'}
                {mode === 'confirm' && '📱 Xác nhận chuyển khoản'}
                {mode === 'success' && '✅ Đặt cọc thành công!'}
              </h2>
            </div>
            <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 text-gray-500 text-sm">✕</button>
          </div>

          <div className="p-4">
            {mode === 'choose' && (
              <div className="space-y-3">
                <div className="flex gap-3 bg-gray-50 rounded-xl p-3">
                  {ga.ga_images?.[0]
                    ? <img src={ga.ga_images.find((i: any) => i.is_primary)?.url || ga.ga_images[0].url} alt={ga.ten} className="w-14 h-14 object-cover rounded-xl flex-shrink-0" />
                    : <div className="w-14 h-14 bg-orange-800 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🐓</div>}
                  <div>
                    <div className="font-black text-gray-900 text-sm">{ga.ten}</div>
                    <div className="text-xs text-gray-500">{ga.loai_ga} • {ga.khu_vuc}</div>
                    <div className="text-[#8B1A1A] font-black mt-0.5">{giaGa.toLocaleString('vi-VN')} đ</div>
                  </div>
                </div>
                <button onClick={() => setMode('qua-san')} className="w-full text-left border-2 border-green-500 rounded-xl p-4 hover:bg-green-50 transition">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">🔒</span>
                    <div className="flex-1">
                      <div className="font-black text-green-800 flex items-center gap-2 flex-wrap">
                        Mua qua sàn Chủ Gà Việt
                        <span className="bg-green-500 text-white text-xs px-2 py-0.5 rounded-full">AN TOÀN</span>
                      </div>
                      <div className="text-sm text-green-700 mt-1">
                        ✓ Đặt cọc {cocPercent}% ({tiencoc.toLocaleString('vi-VN')}đ)<br />
                        ✓ Admin xác nhận & bảo đảm giao dịch<br />
                        ✓ Hoàn cọc nếu gà không đúng mô tả<br />
                        ✓ Phí sàn {phiPercent}% ({phiGD.toLocaleString('vi-VN')}đ)
                      </div>
                    </div>
                  </div>
                </button>
                <button onClick={() => setMode('tu-mua')} className="w-full text-left border-2 border-orange-300 rounded-xl p-4 hover:bg-orange-50 transition">
                  <div className="flex items-start gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                      <div className="font-black text-orange-800">Tự liên hệ mua riêng</div>
                      <div className="text-sm text-orange-700 mt-1">
                        ✗ Không có bảo đảm từ sàn<br />
                        ✗ Rủi ro lừa đảo cao hơn<br />
                        ✓ Không mất phí sàn
                      </div>
                    </div>
                  </div>
                </button>
              </div>
            )}

            {mode === 'qua-san' && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 bg-[#8B1A1A] text-white rounded-full flex items-center justify-center text-xs font-black">1</div>
                    <span className="text-xs font-bold text-[#8B1A1A]">Chuyển khoản</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-gray-200" />
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 bg-gray-200 text-gray-400 rounded-full flex items-center justify-center text-xs font-black">2</div>
                    <span className="text-xs font-bold text-gray-400">Xác nhận</span>
                  </div>
                </div>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-sm space-y-2">
                  {[
                    { label: 'Giá gà', value: `${giaGa.toLocaleString('vi-VN')} đ` },
                    { label: `Tiền cọc (${cocPercent}%)`, value: `${tiencoc.toLocaleString('vi-VN')} đ`, color: 'text-blue-600' },
                    { label: `Phí sàn (${phiPercent}%)`, value: `${phiGD.toLocaleString('vi-VN')} đ`, color: 'text-gray-500' },
                  ].map(item => (
                    <div key={item.label} className="flex justify-between border-b border-green-100 pb-2 last:border-0">
                      <span className="text-gray-600">{item.label}</span>
                      <span className={`font-bold ${item.color || 'text-gray-900'}`}>{item.value}</span>
                    </div>
                  ))}
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <div className="font-bold text-blue-800 mb-3 text-sm">📱 Quét QR để chuyển khoản</div>
                  <div className="flex gap-3 items-center">
                    <img src={qrUrl} alt="VietQR" className="w-28 h-28 rounded-lg border border-blue-200 bg-white flex-shrink-0" />
                    <div className="text-xs space-y-1.5">
                      <div><span className="text-gray-500">Ngân hàng:</span> <span className="font-bold">{tkNganHang}</span></div>
                      <div><span className="text-gray-500">Số TK:</span> <span className="font-bold font-mono">{tkSo}</span></div>
                      <div><span className="text-gray-500">Chủ TK:</span> <span className="font-bold">{tkTen}</span></div>
                      <div><span className="text-gray-500">Số tiền:</span> <span className="font-black text-blue-700">{tiencoc.toLocaleString('vi-VN')} đ</span></div>
                      <div><span className="text-gray-500">Nội dung CK:</span>{' '}<span className="font-mono font-black text-red-700 bg-red-50 px-1.5 py-0.5 rounded">{noiDungCK}</span></div>
                    </div>
                  </div>
                  <div className="mt-3 bg-yellow-50 border border-yellow-200 rounded-lg p-2 text-xs text-yellow-700">
                    ⚠️ <strong>Quan trọng:</strong> Nhập đúng nội dung <strong className="text-red-700">{noiDungCK}</strong> để admin xác nhận nhanh hơn!
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setMode('choose')} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-3 rounded-xl text-sm hover:bg-gray-50">← Quay lại</button>
                  <button onClick={handleTaoDon} disabled={loading} className="flex-1 bg-[#8B1A1A] text-white font-black py-3 rounded-xl text-sm hover:bg-[#6B0F0F] disabled:opacity-60">
                    {loading ? '⏳ Đang xử lý...' : '✅ Tôi đã chuyển khoản →'}
                  </button>
                </div>
              </>
            )}

            {mode === 'confirm' && (
              <>
                <div className="flex items-center gap-2 mb-4">
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 bg-green-500 text-white rounded-full flex items-center justify-center text-xs font-black">✓</div>
                    <span className="text-xs font-bold text-green-600">Đã chuyển khoản</span>
                  </div>
                  <div className="flex-1 h-0.5 bg-[#8B1A1A]" />
                  <div className="flex items-center gap-1.5">
                    <div className="w-6 h-6 bg-[#8B1A1A] text-white rounded-full flex items-center justify-center text-xs font-black">2</div>
                    <span className="text-xs font-bold text-[#8B1A1A]">Xác nhận</span>
                  </div>
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-4">
                  <div className="font-bold text-blue-800 mb-2 text-sm">📋 Thông tin đơn hàng</div>
                  <div className="space-y-1.5 text-sm">
                    <div className="flex justify-between"><span className="text-gray-500">Mã đơn:</span><span className="font-mono font-bold text-[#8B1A1A] text-xs">{maGD}</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Tiền cọc:</span><span className="font-black text-blue-700">{tiencoc.toLocaleString('vi-VN')} đ</span></div>
                    <div className="flex justify-between"><span className="text-gray-500">Nội dung CK:</span><span className="font-mono font-bold text-red-700">{noiDungCK}</span></div>
                  </div>
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 mb-4">
                  <div className="font-bold text-yellow-800 text-sm mb-2">✅ Bạn đã chuyển khoản chưa?</div>
                  <div className="text-xs text-yellow-700 space-y-1">
                    <div>• Chỉ bấm xác nhận sau khi <strong>đã chuyển khoản thành công</strong></div>
                    <div>• Admin sẽ kiểm tra trong vòng <strong>24 giờ</strong></div>
                    <div>• Sau khi admin xác nhận, đơn hàng sẽ được xử lý</div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setMode('qua-san')} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-3 rounded-xl text-sm hover:bg-gray-50">← Chưa CK</button>
                  <button onClick={handleDaChuyenKhoan} disabled={loading} className="flex-1 bg-green-600 text-white font-black py-3 rounded-xl text-sm hover:bg-green-700 disabled:opacity-60">
                    {loading ? '⏳ Đang xử lý...' : '🎉 Đã chuyển khoản rồi!'}
                  </button>
                </div>
              </>
            )}

            {mode === 'tu-mua' && (
              <>
                <div className="bg-orange-50 border-2 border-orange-400 rounded-xl p-4 mb-4 text-sm">
                  <div className="font-black text-orange-800 mb-2">⚠️ Cảnh báo rủi ro!</div>
                  <div className="text-orange-700 space-y-1">
                    <div>• Giao dịch ngoài sàn không được bảo đảm</div>
                    <div>• Chủ Gà Việt không chịu trách nhiệm tranh chấp</div>
                    <div>• Hãy gặp mặt trực tiếp khi giao dịch</div>
                    <div>• Không chuyển khoản trước khi xem gà thật</div>
                  </div>
                </div>
                {nguoiBan?.phone && nguoiBan?.phone_visibility !== 'private' ? (
                  <div className="space-y-2 mb-4">
                    <a href={`tel:${nguoiBan.phone}`} className="flex items-center gap-3 bg-green-50 border border-green-200 text-green-800 font-bold py-3 px-4 rounded-xl hover:bg-green-100 transition">
                      <span className="text-xl">📞</span><div><div className="text-xs font-normal text-green-600">Gọi điện</div><div>{nguoiBan.phone}</div></div>
                    </a>
                    <a href={`https://zalo.me/${nguoiBan.phone}`} target="_blank" className="flex items-center gap-3 bg-blue-50 border border-blue-200 text-blue-800 font-bold py-3 px-4 rounded-xl hover:bg-blue-100 transition">
                      <span className="text-xl">💬</span><div><div className="text-xs font-normal text-blue-600">Zalo</div><div>{nguoiBan.phone}</div></div>
                    </a>
                  </div>
                ) : (
                  <div className="bg-gray-50 rounded-xl p-4 text-center text-gray-400 text-sm mb-4">🔒 Người bán chưa cung cấp liên hệ công khai</div>
                )}
                <div className="flex gap-3">
                  <button onClick={() => setMode('choose')} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-3 rounded-xl text-sm hover:bg-gray-50">← Quay lại</button>
                  <button onClick={onClose} className="flex-1 bg-[#8B1A1A] text-white font-black py-3 rounded-xl text-sm hover:bg-[#6B0F0F]">Đã hiểu, tiếp tục</button>
                </div>
              </>
            )}

            {mode === 'success' && (
              <div className="text-center py-4">
                <div className="text-5xl mb-3">🎉</div>
                <h3 className="font-black text-xl text-gray-900 mb-2">Xác nhận thành công!</h3>
                <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-4 text-left text-sm">
                  <div className="font-bold text-green-800 mb-2">✅ Tiếp theo:</div>
                  <div className="space-y-1 text-green-700">
                    <div>1. Admin đang kiểm tra thanh toán (trong 24h)</div>
                    <div>2. Chat với người bán để thống nhất giao nhận</div>
                    <div>3. Thanh toán phần còn lại khi nhận gà</div>
                  </div>
                </div>
                {maGD && <div className="bg-gray-50 rounded-xl p-3 mb-4 text-xs text-gray-500 font-mono">Mã GD: {maGD}</div>}
                <button onClick={onClose} className="w-full bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F]">
                  Tiếp tục nhắn tin với người bán →
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── MODAL LIÊN HỆ ────────────────────────────────────────────
function ModalLienHe({ nguoiBan, onClose }: { nguoiBan: any; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/60 z-[80] overflow-y-auto" onClick={onClose}>
      <div className="flex min-h-full items-start justify-center p-4 md:items-center">
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between p-4 border-b rounded-t-2xl">
            <h2 className="font-black text-base">📞 Liên hệ người bán</h2>
            <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 text-gray-500 text-sm">✕</button>
          </div>
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
              <div className="w-11 h-11 bg-[#8B1A1A] rounded-full flex items-center justify-center text-white font-black">{(nguoiBan?.username || 'U')[0].toUpperCase()}</div>
              <div><div className="font-bold text-gray-900">{nguoiBan?.username || 'Người bán'}</div><div className="text-xs text-gray-500">⭐ {nguoiBan?.trust_score || 5.0} điểm uy tín</div></div>
            </div>
            {nguoiBan?.phone && nguoiBan?.phone_visibility !== 'private' ? (<>
              <a href={`tel:${nguoiBan.phone}`} className="flex items-center gap-3 w-full bg-green-50 border border-green-200 text-green-800 font-bold py-3 px-4 rounded-xl hover:bg-green-100 transition"><span className="text-xl">📞</span><div><div className="text-xs font-normal text-green-600">Gọi điện</div><div>{nguoiBan.phone}</div></div></a>
              <a href={`https://zalo.me/${nguoiBan.phone}`} target="_blank" className="flex items-center gap-3 w-full bg-blue-50 border border-blue-200 text-blue-800 font-bold py-3 px-4 rounded-xl hover:bg-blue-100 transition"><span className="text-xl">💬</span><div><div className="text-xs font-normal text-blue-600">Zalo</div><div>{nguoiBan.phone}</div></div></a>
            </>) : <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-center text-gray-400 text-sm">🔒 Người bán chưa cung cấp thông tin liên hệ công khai</div>}
          </div>
        </div>
      </div>
    </div>
  );
}

// ── GA DETAIL CONTENT ────────────────────────────────────────
interface GaDetailContentProps {
  gaId: string;
  isModal?: boolean;
  onClose?: () => void;
}

export default function GaDetailContent({ gaId, isModal = false, onClose }: GaDetailContentProps) {
  const { openChat, currentUser } = useChat();
  const [ga, setGa] = useState<any>(null);
  const [aiData, setAiData] = useState<any>(null);
  const [nguoiBan, setNguoiBan] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [fetchFailed, setFetchFailed] = useState(false);
  const [anhChinh, setAnhChinh] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState<any[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [showMuaNgay, setShowMuaNgay] = useState(false);
  const [showLienHe, setShowLienHe] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [showEdit, setShowEdit] = useState(false);
  const [gaState, setGaState] = useState<any>(null);
  const [editForm, setEditForm] = useState({ ten: '', gia: '', mo_ta: '', video_url: '' });
  const [editImages, setEditImages] = useState<any[]>([]);
  const [editVideoError, setEditVideoError] = useState('');
  const [uploadingImg, setUploadingImg] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isOwner = !!(currentUser && ga && String(currentUser.id) === String(ga.user_id));
  const gaData = gaState || ga;

  useEffect(() => { fetchGa(); }, [gaId]);
  useEffect(() => { setIsPlaying(false); }, [anhChinh]);

  async function fetchGa() {
    setLoading(true);
    try {
      const { data: gaRaw } = await supabase.from('ga')
        .select(`*, ga_images(id, url, is_primary), ai_analysis(total_score, nhan_xet, mat_score, chan_score, vay_score, dau_score)`)
        .eq('id', gaId).single();
      if (gaRaw) {
        setGa(gaRaw); setGaState(gaRaw);
        setEditForm({ ten: gaRaw.ten, gia: String(gaRaw.gia), mo_ta: gaRaw.mo_ta || '', video_url: gaRaw.video_url || '' });
        setEditImages(gaRaw.ga_images || []);
        setAiData(gaRaw.ai_analysis?.[0] || null);
        if (gaRaw.user_id) {
          const { data: profile } = await supabase.from('profiles').select('*').eq('id', gaRaw.user_id).single();
          setNguoiBan(profile);
        }
        const { data: cmts } = await supabase.from('comments').select('*, profiles(username)').eq('ga_id', gaId).order('created_at', { ascending: false });
        setComments(cmts || []);
        if (!isModal) await supabase.from('ga').update({ view_count: (gaRaw.view_count || 0) + 1 }).eq('id', gaId);
      }
    } catch (err) { console.error(err); setFetchFailed(true); }
    finally { setLoading(false); }
  }

  async function handleAddImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []);
    const remaining = 6 - editImages.length;
    if (remaining <= 0) { alert('Tối đa 6 ảnh!'); return; }
    setUploadingImg(true);
    for (const file of files.slice(0, remaining)) {
      const ext = file.name.split('.').pop();
      const path = `ga/${gaId}-${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data, error } = await supabase.storage.from('images').upload(path, file, { upsert: true });
      if (!error && data) {
        const { data: urlData } = supabase.storage.from('images').getPublicUrl(path);
        const isPrimary = editImages.length === 0;
        const { data: imgRow } = await supabase.from('ga_images').insert({ ga_id: gaId, url: urlData.publicUrl, is_primary: isPrimary }).select().single();
        if (imgRow) setEditImages(prev => [...prev, imgRow]);
      }
    }
    setUploadingImg(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  async function handleRemoveImage(img: any) {
    if (!confirm('Xóa ảnh này?')) return;
    await supabase.from('ga_images').delete().eq('id', img.id);
    const newList = editImages.filter(i => i.id !== img.id);
    setEditImages(newList);
    if (img.is_primary && newList.length > 0) {
      await supabase.from('ga_images').update({ is_primary: true }).eq('id', newList[0].id);
      setEditImages(newList.map((i, idx) => ({ ...i, is_primary: idx === 0 })));
    }
  }

  async function handleSetPrimary(img: any) {
    await supabase.from('ga_images').update({ is_primary: false }).eq('ga_id', gaId);
    await supabase.from('ga_images').update({ is_primary: true }).eq('id', img.id);
    setEditImages(prev => prev.map(i => ({ ...i, is_primary: i.id === img.id })));
  }

  function handleVideoUrlChange(val: string) {
    setEditForm(f => ({ ...f, video_url: val }));
    if (val && !isValidVideoUrl(val)) setEditVideoError('Link không hợp lệ. Hỗ trợ: YouTube, Facebook, TikTok');
    else setEditVideoError('');
  }

  async function handleSaveEdit() {
    if (editVideoError) { alert('Link video không hợp lệ!'); return; }
    setActionLoading(true);
    await supabase.from('ga').update({ ten: editForm.ten, gia: parseInt(editForm.gia), mo_ta: editForm.mo_ta, video_url: editForm.video_url.trim() || null }).eq('id', gaId);
    setGaState((prev: any) => ({ ...prev, ten: editForm.ten, gia: editForm.gia, mo_ta: editForm.mo_ta, video_url: editForm.video_url.trim() || null, ga_images: editImages }));
    setActionLoading(false);
    setShowEdit(false);
  }

  async function updateStatus(newStatus: string) {
    setActionLoading(true);
    const updates: any = { status: newStatus };
    if (newStatus === 'pending_dispute') { const d = new Date(); d.setDate(d.getDate() + 3); updates.dispute_deadline = d.toISOString(); }
    if (newStatus === 'sold') { updates.sold_at = new Date().toISOString(); const ad = new Date(); ad.setDate(ad.getDate() + 2); updates.auto_delete_at = ad.toISOString(); }
    await supabase.from('ga').update(updates).eq('id', gaId);
    setGaState((prev: any) => ({ ...prev, ...updates }));
    setActionLoading(false);
  }

  async function handleDelete() {
    if (!confirm(`Xóa "${gaData?.ten}"?`)) return;
    setActionLoading(true);
    await supabase.from('ga').delete().eq('id', gaId);
    setActionLoading(false);
    if (onClose) onClose(); else window.location.href = '/cho';
  }

  async function addComment() {
    if (!comment.trim()) return;
    if (!currentUser) { alert('Vui lòng đăng nhập để bình luận'); return; }
    const { data } = await supabase.from('comments').insert({ ga_id: gaId, user_id: currentUser.id, noi_dung: comment }).select('*, profiles(username)').single();
    if (data) { setComments([data, ...comments]); setComment(''); }
  }

  async function handleTraGia() {
    if (!currentUser) { alert('Vui lòng đăng nhập!'); return; }
    if (!gaData?.user_id) return;
    if (currentUser.id === gaData.user_id) { alert('Đây là gà của bạn!'); return; }
    setChatLoading(true);
    const anhGa = gaData.ga_images?.find((i: any) => i.is_primary)?.url || gaData.ga_images?.[0]?.url || '';
    const convId = await getOrCreateConv(gaId, gaData.user_id, currentUser.id);
    if (convId) await openChat({ convId, type: 'product', gaId: gaData.id, gaTen: gaData.ten, gaAnh: anhGa, doiPhuongId: gaData.user_id });
    setChatLoading(false);
  }

  const getDiemMau = (d: number) => d >= 8 ? 'text-green-600' : d >= 6.5 ? 'text-yellow-600' : 'text-red-500';
  const getBarWidth = (d: number) => `${(d || 0) * 10}%`;

  if (loading) return (
    <div className={`animate-pulse ${isModal ? '' : 'max-w-6xl mx-auto px-4 py-8'}`}>
      <div className="grid md:grid-cols-2 gap-6">
        <div className="bg-gray-200 h-72 rounded-xl" />
        <div className="space-y-4"><div className="bg-gray-200 h-8 rounded w-3/4" /><div className="bg-gray-200 h-6 rounded w-1/2" /><div className="bg-gray-200 h-32 rounded" /></div>
      </div>
    </div>
  );

  if (!gaData) return (
    <div className="text-center py-20">
      <div className="text-5xl mb-4">🐓</div>
      {fetchFailed ? (
        <>
          <div className="font-bold text-gray-600 mb-2">Không tải được thông tin gà</div>
          <p className="text-sm text-gray-500 mb-4">Kiểm tra kết nối và thử lại.</p>
          <button
            onClick={() => { setFetchFailed(false); setLoading(true); fetchGa(); }}
            className="bg-[#8B1A1A] text-white font-bold px-5 py-2 rounded-xl hover:bg-[#6B0F0F] transition text-sm"
          >
            Thử lại
          </button>
        </>
      ) : (
        <>
          <div className="font-bold text-gray-600">Không tìm thấy gà này</div>
          <Link href="/cho" className="mt-4 inline-block text-[#8B1A1A] hover:underline">← Về chợ</Link>
        </>
      )}
    </div>
  );

  const anhList = gaData.ga_images || [];
  const status = GA_STATUS[gaData.status] || GA_STATUS['active'];
  const hasVideo = !!gaData.video_url;
  const ytId = hasVideo ? getYoutubeId(gaData.video_url) : null;
  const videoThumb = ytId ? `https://img.youtube.com/vi/${ytId}/hqdefault.jpg` : null;
  type MediaItem = { type: 'image' | 'video'; url: string; thumb?: string };
  const mediaList: MediaItem[] = [
    ...anhList.map((img: any) => ({ type: 'image' as const, url: img.url })),
    ...(hasVideo ? [{ type: 'video' as const, url: gaData.video_url, thumb: videoThumb || '' }] : []),
  ];
  const currentMedia = mediaList[anhChinh];
  const currentYtId = currentMedia?.type === 'video' ? getYoutubeId(currentMedia.url) : null;
  const editVideoThumb = editForm.video_url && !editVideoError ? getVideoThumb(editForm.video_url) : null;

  return (
    <div className={isModal ? '' : 'max-w-6xl mx-auto px-4 py-4'}>
      {showMuaNgay && nguoiBan && currentUser?.id !== gaData.user_id && (
        <ModalMuaNgay ga={gaData} nguoiBan={nguoiBan} currentUser={currentUser} onClose={() => setShowMuaNgay(false)} />
      )}
      {showLienHe && <ModalLienHe nguoiBan={nguoiBan} onClose={() => setShowLienHe(false)} />}

      {!isModal && (
        <div className="text-xs text-gray-500 mb-4">
          <Link href="/" className="hover:text-red-800">Trang chủ</Link> &gt;{' '}
          <Link href="/cho" className="hover:text-red-800">Chợ</Link> &gt;{' '}
          <span className="text-gray-800">{gaData.ten}</span>
        </div>
      )}
      {isModal && (
        <div className="flex items-center gap-2 mb-3">
          <span className="text-xs px-2.5 py-1 rounded-full font-bold" style={{ background: status.bg, color: status.color }}>{status.icon} {status.label}</span>
          <span className="text-xs text-gray-500">{gaData.loai_ga} • 📍 {gaData.khu_vuc}</span>
        </div>
      )}

      <div className="grid md:grid-cols-2 gap-5 mb-5">
        <div>
          {mediaList.length > 0 ? (<>
            <div className="relative bg-black rounded-xl overflow-hidden mb-2" style={{ paddingBottom: '65%' }}>
              {currentMedia.type === 'image'
                ? <img src={currentMedia.url} alt={gaData.ten} className="absolute inset-0 w-full h-full object-contain" />
                : currentYtId ? (!isPlaying ? (<>
                  <img src={currentMedia.thumb || `https://img.youtube.com/vi/${currentYtId}/hqdefault.jpg`} alt="video" className="absolute inset-0 w-full h-full object-cover" />
                  <button onClick={() => setIsPlaying(true)} className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/60 rounded-full w-14 h-14 flex items-center justify-center hover:bg-black/80 transition"><span className="text-white text-2xl ml-1">▶</span></div>
                  </button>
                </>) : <iframe src={`https://www.youtube.com/embed/${currentYtId}?autoplay=1&controls=1&rel=0`} className="absolute inset-0 w-full h-full border-none" allow="autoplay; encrypted-media; fullscreen" allowFullScreen />)
                : <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white text-sm">🎬 Video</div>
              }
            </div>
            {mediaList.length > 1 && (
              <div className="flex gap-2 flex-wrap">
                {mediaList.map((m, i) => (
                  <button key={i} onClick={() => { setAnhChinh(i); setIsPlaying(false); }}
                    className={`relative w-14 h-14 rounded-lg overflow-hidden border-2 transition flex-shrink-0 ${anhChinh === i ? 'border-yellow-400' : 'border-transparent'}`}>
                    {m.type === 'image' ? <img src={m.url} alt="" className="w-full h-full object-cover" />
                      : <><img src={m.thumb || ''} alt="" className="w-full h-full object-cover bg-gray-800" /><div className="absolute inset-0 flex items-center justify-center bg-black/40"><span className="text-white text-sm">▶</span></div></>}
                  </button>
                ))}
              </div>
            )}
          </>) : <div className="bg-orange-800 rounded-xl h-72 flex items-center justify-center text-8xl">🐓</div>}
        </div>

        <div className="flex flex-col gap-3">
          {!isModal && <div className="text-xs text-[#8B1A1A] font-semibold">{gaData.loai_ga}</div>}
          <h1 className={`font-black text-gray-800 leading-tight ${isModal ? 'text-xl' : 'text-2xl'}`}>{gaData.ten}</h1>
          <div>
            <div className="text-[#8B1A1A] font-black text-3xl">{parseInt(gaData.gia).toLocaleString('vi-VN')} đ</div>
            <div className="text-xs text-gray-400 mt-0.5">Giá thương lượng</div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {gaData.can_nang && <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">{gaData.can_nang} kg</span>}
            {gaData.tuoi && <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">{gaData.tuoi} tháng</span>}
            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">📍 {gaData.khu_vuc}</span>
            {!isModal && gaData.view_count > 0 && <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">👁 {gaData.view_count} lượt xem</span>}
          </div>
          {!isOwner && (
            <div className="flex gap-2 flex-wrap">
              <button onClick={() => { if (!currentUser) { alert('Vui lòng đăng nhập!'); return; } if (currentUser.id === gaData.user_id) { alert('Đây là gà của bạn!'); return; } setShowMuaNgay(true); }}
                className="flex-1 bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition min-w-[100px] text-sm">🛒 Mua ngay</button>
              <button onClick={handleTraGia} disabled={chatLoading} className="flex-1 border-2 border-[#8B1A1A] text-[#8B1A1A] font-bold py-3 rounded-xl hover:bg-red-50 transition min-w-[100px] text-sm disabled:opacity-60">{chatLoading ? '⏳...' : '💬 Trả giá'}</button>
              <button onClick={() => setShowLienHe(true)} className="border-2 border-gray-300 text-gray-600 font-bold px-4 py-3 rounded-xl hover:bg-gray-50 transition text-sm">📞</button>
            </div>
          )}
          {aiData ? (
            <div className="bg-red-50 border border-red-200 rounded-xl p-3">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-black text-sm text-gray-800">🤖 Phân tích AI</h3>
                <div className={`text-2xl font-black ${getDiemMau(aiData.total_score)}`}>{aiData.total_score}/10</div>
              </div>
              {aiData.nhan_xet && <p className="text-xs text-gray-600 mb-2 leading-relaxed">{aiData.nhan_xet}</p>}
              {(aiData.mat_score || aiData.chan_score || aiData.vay_score || aiData.dau_score) && (
                <div className="grid grid-cols-2 gap-1.5">
                  {[{ label: '👁 Mắt', score: aiData.mat_score }, { label: '🦵 Chân', score: aiData.chan_score }, { label: '🐾 Vảy', score: aiData.vay_score }, { label: '🐓 Đầu', score: aiData.dau_score }].filter(i => i.score).map(item => (
                    <div key={item.label} className="bg-white rounded-lg p-2">
                      <div className="flex justify-between items-center"><span className="text-xs font-semibold text-gray-600">{item.label}</span><span className={`text-xs font-black ${getDiemMau(item.score)}`}>{item.score}/10</span></div>
                      <div className="h-1.5 bg-gray-200 rounded-full mt-1"><div className="h-1.5 bg-[#8B1A1A] rounded-full" style={{ width: getBarWidth(item.score) }} /></div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ) : <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 text-center text-gray-400 text-sm">🤖 Chưa có phân tích AI cho gà này</div>}
        </div>
      </div>

      <div className={`grid gap-5 ${isModal ? 'md:grid-cols-1' : 'md:grid-cols-3'}`}>
        <div className={`space-y-4 ${isModal ? '' : 'md:col-span-2'}`}>
          {gaData.mo_ta && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-black text-gray-800 mb-2 text-sm">📋 Mô tả</h3>
              <p className="text-gray-600 text-sm leading-relaxed">{gaData.mo_ta}</p>
            </div>
          )}

          {isOwner && (
            <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
              <div className="text-xs font-bold text-orange-700 mb-3">🔧 Quản lý bài đăng của bạn</div>
              {showEdit ? (
                <div className="space-y-4">
                  <div><label className="text-xs font-bold text-gray-500 block mb-1">Tên gà</label><input value={editForm.ten} onChange={e => setEditForm(f => ({ ...f, ten: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" /></div>
                  <div><label className="text-xs font-bold text-gray-500 block mb-1">Giá (đ)</label><input type="number" value={editForm.gia} onChange={e => setEditForm(f => ({ ...f, gia: e.target.value }))} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" /></div>
                  <div><label className="text-xs font-bold text-gray-500 block mb-1">Mô tả</label><textarea value={editForm.mo_ta} onChange={e => setEditForm(f => ({ ...f, mo_ta: e.target.value }))} rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" /></div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-2">📸 Ảnh ({editImages.length}/6)</label>
                    {editImages.length > 0 && (
                      <div className="grid grid-cols-3 gap-2 mb-2">
                        {editImages.map((img, i) => (
                          <div key={img.id || i} className="relative group">
                            <img src={img.url} alt="" className="w-full h-20 object-cover rounded-lg border border-gray-200" />
                            {img.is_primary ? <div className="absolute bottom-1 left-1 bg-yellow-400 text-black text-xs px-1.5 py-0.5 rounded font-bold">Chính</div>
                              : <button onClick={() => handleSetPrimary(img)} className="absolute bottom-1 left-1 bg-white/90 text-gray-700 text-xs px-1.5 py-0.5 rounded opacity-0 group-hover:opacity-100 transition font-bold">⭐ Chính</button>}
                            <button onClick={() => handleRemoveImage(img)} className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center opacity-0 group-hover:opacity-100 transition">✕</button>
                          </div>
                        ))}
                      </div>
                    )}
                    {editImages.length < 6 && (
                      <label className="block border-2 border-dashed border-orange-300 rounded-lg p-3 text-center cursor-pointer hover:border-orange-500 hover:bg-orange-50 transition">
                        <input ref={fileInputRef} type="file" multiple accept="image/*" className="hidden" onChange={handleAddImages} disabled={uploadingImg} />
                        {uploadingImg ? <div className="flex items-center justify-center gap-2 text-orange-600 text-sm"><div className="w-4 h-4 border-2 border-orange-600 border-t-transparent rounded-full animate-spin" />Đang tải ảnh...</div>
                          : <span className="text-sm text-gray-500">📷 Thêm ảnh ({6 - editImages.length} chỗ trống)</span>}
                      </label>
                    )}
                    <p className="text-xs text-gray-400 mt-1">Hover vào ảnh → xóa (✕) hoặc đặt làm ảnh chính (⭐)</p>
                  </div>
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-1">🎬 Video (YouTube, Facebook, TikTok)</label>
                    <input type="url" value={editForm.video_url} onChange={e => handleVideoUrlChange(e.target.value)} placeholder="Dán link video hoặc để trống để xóa video"
                      className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 ${editVideoError ? 'border-red-400' : 'border-gray-300'}`} />
                    {editVideoError && <p className="text-xs text-red-500 mt-1">{editVideoError}</p>}
                    {editForm.video_url && !editVideoError && (
                      <div className="mt-2 flex items-center gap-3">
                        {editVideoThumb && <div className="relative w-24 h-16 rounded-lg overflow-hidden bg-black flex-shrink-0"><img src={editVideoThumb} alt="thumb" className="w-full h-full object-cover" /><div className="absolute inset-0 flex items-center justify-center bg-black/30"><span className="text-white text-sm">▶</span></div></div>}
                        <div><div className="text-xs text-green-600 font-bold">✅ Video hợp lệ</div><button onClick={() => { setEditForm(f => ({ ...f, video_url: '' })); setEditVideoError(''); }} className="text-xs text-red-500 hover:underline mt-0.5">🗑️ Xóa video</button></div>
                      </div>
                    )}
                    {!editForm.video_url && gaData.video_url && <p className="text-xs text-amber-500 mt-1">⚠️ Để trống sẽ xóa video hiện tại</p>}
                  </div>
                  <div className="flex gap-2 pt-1">
                    <button onClick={() => { setShowEdit(false); setEditVideoError(''); setEditForm({ ten: gaData.ten, gia: String(gaData.gia), mo_ta: gaData.mo_ta || '', video_url: gaData.video_url || '' }); setEditImages(gaData.ga_images || []); }} className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm font-bold hover:bg-gray-50">Hủy</button>
                    <button onClick={handleSaveEdit} disabled={actionLoading || uploadingImg} className="flex-1 bg-[#8B1A1A] text-white py-2.5 rounded-xl text-sm font-bold hover:bg-[#6B0F0F] disabled:opacity-60">{actionLoading ? '⏳...' : '💾 Lưu thay đổi'}</button>
                  </div>
                </div>
              ) : (
                <div className="space-y-2">
                  {gaData.status === 'active' && (<>
                    <div className="flex gap-2">
                      <button onClick={() => setShowEdit(true)} className="flex-1 bg-blue-50 text-blue-700 text-xs font-bold py-2 rounded-lg hover:bg-blue-100">✏️ Sửa thông tin</button>
                      <button onClick={() => updateStatus('hidden')} disabled={actionLoading} className="flex-1 bg-white border text-gray-600 text-xs font-bold py-2 rounded-lg hover:bg-gray-50">👁️ Ẩn bài</button>
                    </div>
                    <button onClick={() => updateStatus('in_transaction')} disabled={actionLoading} className="w-full bg-yellow-50 text-yellow-700 text-xs font-bold py-2 rounded-lg hover:bg-yellow-100">🤝 Đánh dấu đang giao dịch</button>
                    <button onClick={handleDelete} disabled={actionLoading} className="w-full bg-red-50 text-red-600 text-xs font-bold py-2 rounded-lg hover:bg-red-100">🗑️ Xóa bài đăng</button>
                  </>)}
                  {gaData.status === 'hidden' && (<>
                    <button onClick={() => updateStatus('active')} disabled={actionLoading} className="w-full bg-green-50 text-green-700 text-xs font-bold py-2 rounded-lg hover:bg-green-100">🟢 Hiện lại bài đăng</button>
                    <button onClick={handleDelete} disabled={actionLoading} className="w-full bg-red-50 text-red-600 text-xs font-bold py-2 rounded-lg hover:bg-red-100">🗑️ Xóa</button>
                  </>)}
                  {gaData.status === 'in_transaction' && (<>
                    <button onClick={() => updateStatus('pending_completion')} disabled={actionLoading} className="w-full bg-blue-50 text-blue-700 text-xs font-bold py-2 rounded-lg hover:bg-blue-100">✅ Xác nhận đã giao gà</button>
                    <button onClick={() => updateStatus('active')} disabled={actionLoading} className="w-full bg-white border text-gray-600 text-xs font-bold py-2 rounded-lg hover:bg-gray-50">↩️ Huỷ giao dịch</button>
                  </>)}
                  {gaData.status === 'pending_completion' && <button onClick={() => updateStatus('pending_dispute')} disabled={actionLoading} className="w-full bg-orange-50 text-orange-700 text-xs font-bold py-2 rounded-lg hover:bg-orange-100">⚠️ Hoàn tất + mở khiếu nại 3 ngày</button>}
                  {gaData.status === 'pending_dispute' && <button onClick={() => updateStatus('sold')} disabled={actionLoading} className="w-full bg-purple-50 text-purple-700 text-xs font-bold py-2 rounded-lg hover:bg-purple-100">✅ Đóng khiếu nại — Hoàn tất bán</button>}
                  {gaData.status === 'sold' && <button onClick={handleDelete} disabled={actionLoading} className="w-full bg-red-50 text-red-600 text-xs font-bold py-2 rounded-lg hover:bg-red-100">🗑️ Xóa</button>}
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-black text-gray-800 mb-3 text-sm">💬 Bình luận ({comments.length})</h3>
            <div className="flex gap-2 mb-3">
              <input value={comment} onChange={e => setComment(e.target.value)} onKeyDown={e => e.key === 'Enter' && addComment()} placeholder="Nhận xét về con gà này..." className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
              <button onClick={addComment} className="bg-[#8B1A1A] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#6B0F0F]">Gửi</button>
            </div>
            {comments.length === 0
              ? <div className="text-center py-5 text-gray-400 text-sm">Chưa có bình luận. Hãy là người đầu tiên!</div>
              : <div className={`space-y-3 ${isModal ? 'max-h-52 overflow-y-auto' : ''}`}>
                  {comments.map((c: any) => (
                    <div key={c.id} className="flex gap-3">
                      <div className="w-8 h-8 bg-red-800 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">{(c.profiles?.username || 'U')[0].toUpperCase()}</div>
                      <div className="flex-1">
                        <div className="flex gap-2 items-center"><span className="font-semibold text-sm text-gray-800">{c.profiles?.username || 'Người dùng'}</span><span className="text-xs text-gray-400">{timeAgo(c.created_at)}</span></div>
                        <div className="text-sm text-gray-600">{c.noi_dung}</div>
                      </div>
                    </div>
                  ))}
                </div>
            }
          </div>
        </div>

        {!isModal && (
          <div className="space-y-4">
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-black text-gray-800 mb-3 text-sm">👤 Người bán</h3>
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 bg-[#8B1A1A] rounded-full flex items-center justify-center text-white font-black text-lg">{(nguoiBan?.username || 'U')[0].toUpperCase()}</div>
                <div><div className="font-bold text-gray-800">{nguoiBan?.username || 'Người bán'}</div><div className="text-xs text-gray-500">⭐ {nguoiBan?.trust_score || 5.0}</div></div>
              </div>
              <div className="flex gap-2">
                <Link href={`/ho-so/${gaData.user_id}`} className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-2 rounded-xl hover:bg-gray-50 transition text-sm text-center">Xem hồ sơ</Link>
                {currentUser?.id !== gaData.user_id && (
                  <button onClick={handleTraGia} disabled={chatLoading} className="flex-1 bg-[#8B1A1A] text-white font-bold py-2 rounded-xl hover:bg-[#6B0F0F] transition text-sm disabled:opacity-60">{chatLoading ? '⏳...' : '💬 Nhắn tin'}</button>
                )}
              </div>
            </div>
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-black text-gray-800 mb-2 text-sm">🐓 Gà tương tự</h3>
              <div className="text-sm text-gray-400 text-center py-4">Đang cập nhật...</div>
            </div>
          </div>
        )}

        {isModal && nguoiBan && (
          <div className="flex items-center justify-between bg-gray-50 rounded-xl p-3">
            <div className="flex items-center gap-2">
              <div className="w-9 h-9 bg-[#8B1A1A] rounded-full flex items-center justify-center text-white font-black text-sm">{(nguoiBan.username || 'U')[0].toUpperCase()}</div>
              <div><div className="font-bold text-sm text-gray-800">{nguoiBan.username || 'Người bán'}</div><div className="text-xs text-gray-500">⭐ {nguoiBan.trust_score || 5.0} uy tín</div></div>
            </div>
            <Link href={`/ho-so/${gaData.user_id}`} onClick={onClose} className="text-xs border border-gray-300 text-gray-600 px-3 py-1.5 rounded-lg hover:bg-gray-100">Xem hồ sơ →</Link>
          </div>
        )}
      </div>
    </div>
  );
}
