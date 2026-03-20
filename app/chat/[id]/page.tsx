'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

const PHI_PERCENT = 2;
const COC_PERCENT = 30;
const TK_TEN = 'NGUYEN CHI VUNG';
const TK_SO = '7207205286010';
const TK_NGAN_HANG = 'VietinBank';
const TK_BIN = '970405';
const ZALO = '0917161003';

export default function ChatPage() {
  const { id: gaId } = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [ga, setGa] = useState<any>(null);
  const [conversation, setConversation] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const [showEscrow, setShowEscrow] = useState(false);
  const [escrowStep, setEscrowStep] = useState(1);
  const [order, setOrder] = useState<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    init();
  }, [gaId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    setUser(user);

    // Lấy thông tin gà
    const { data: gaData } = await supabase
      .from('ga').select('*, profiles(username)').eq('id', gaId).single();
    if (!gaData) return;
    setGa(gaData);

    // Tạo hoặc lấy conversation
    let { data: conv } = await supabase
      .from('conversations')
      .select('*')
      .eq('ga_id', gaId)
      .eq('buyer_id', user.id)
      .single();

    if (!conv) {
      const { data: newConv } = await supabase
        .from('conversations')
        .insert({ ga_id: gaId, buyer_id: user.id, seller_id: gaData.user_id })
        .select().single();
      conv = newConv;
    }
    setConversation(conv);

    // Lấy messages
    const { data: msgs } = await supabase
      .from('messages')
      .select('*, profiles(username)')
      .eq('conversation_id', conv.id)
      .order('created_at', { ascending: true });
    setMessages(msgs || []);

    setLoading(false);

    // Realtime subscription
    const channel = supabase
      .channel(`messages:${conv.id}`)
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
        filter: `conversation_id=eq.${conv.id}`,
      }, async (payload) => {
        const { data: newMsg } = await supabase
          .from('messages')
          .select('*, profiles(username)')
          .eq('id', payload.new.id)
          .single();
        if (newMsg) setMessages(prev => [...prev, newMsg]);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  };

  const sendMessage = async (text?: string) => {
    const content = text || newMsg.trim();
    if (!content || !conversation) return;

    await supabase.from('messages').insert({
      conversation_id: conversation.id,
      sender_id: user.id,
      noi_dung: content,
      loai: text ? 'system' : 'text',
    });
    setNewMsg('');
  };

  const taoMaGD = () => `CGV${Date.now().toString(36).toUpperCase()}`;

  const taoOrder = async () => {
    const maGD = taoMaGD();
    const tienCoc = Math.round(parseInt(ga.gia) * COC_PERCENT / 100);

    const { data } = await supabase.from('orders').insert({
      ga_id: gaId,
      buyer_id: user.id,
      seller_id: ga.user_id,
      gia: parseInt(ga.gia),
      tien_coc: tienCoc,
      ma_giao_dich: maGD,
      status: 'pending_deposit',
    }).select().single();

    setOrder(data);
    setEscrowStep(2);

    // Gửi thông báo vào chat
    await sendMessage(`🔒 Đã tạo đơn cọc qua sàn - Mã: ${maGD} - Tiền cọc: ${tienCoc.toLocaleString('vi-VN')}đ`);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-8 h-8 border-4 border-[#8B1A1A] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-4 h-screen flex flex-col">

      {/* HEADER */}
      <div className="bg-white rounded-xl shadow-sm p-3 mb-3 flex items-center gap-3">
        <Link href={`/ga/${gaId}`} className="text-gray-400 hover:text-gray-600">←</Link>
        <div className="w-10 h-10 bg-orange-800 rounded-lg flex items-center justify-center text-xl flex-shrink-0">🐓</div>
        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-gray-800 truncate">{ga?.ten}</div>
          <div className="text-xs text-[#8B1A1A] font-semibold">{parseInt(ga?.gia || 0).toLocaleString('vi-VN')} đ</div>
        </div>
        <button onClick={() => setShowEscrow(true)}
          className="bg-[#8B1A1A] text-white text-xs font-bold px-3 py-1.5 rounded-full hover:bg-[#6B0F0F] transition">
          🔒 Mua qua sàn
        </button>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 bg-white rounded-xl shadow-sm p-4 overflow-y-auto mb-3 space-y-3">
        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">👋</div>
            <div className="text-sm">Bắt đầu trò chuyện với người bán</div>
            <div className="flex gap-2 justify-center mt-3 flex-wrap">
              {['Gà còn không anh?', 'Giá có thương lượng không?', 'Cho xem thêm ảnh được không?'].map(q => (
                <button key={q} onClick={() => sendMessage(q)}
                  className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-full hover:bg-gray-200 transition">
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg: any) => {
          const isMe = msg.sender_id === user?.id;
          const isSystem = msg.loai === 'system';

          if (isSystem) return (
            <div key={msg.id} className="text-center">
              <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full">{msg.noi_dung}</span>
            </div>
          );

          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <div className="w-7 h-7 bg-[#8B1A1A] rounded-full flex items-center justify-center text-white text-xs mr-2 flex-shrink-0 mt-1">
                  {(msg.profiles?.username || 'U')[0].toUpperCase()}
                </div>
              )}
              <div className={`max-w-[70%] px-3 py-2 rounded-2xl text-sm ${isMe ? 'bg-[#8B1A1A] text-white rounded-tr-sm' : 'bg-gray-100 text-gray-800 rounded-tl-sm'}`}>
                {msg.noi_dung}
                <div className={`text-xs mt-0.5 ${isMe ? 'text-red-200' : 'text-gray-400'}`}>
                  {new Date(msg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          );
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* INPUT */}
      <div className="bg-white rounded-xl shadow-sm p-3 flex gap-2">
        <input value={newMsg} onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Nhắn tin..."
          className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
        <button onClick={() => sendMessage()}
          disabled={!newMsg.trim()}
          className="bg-[#8B1A1A] text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#6B0F0F] transition disabled:opacity-40">
          ➤
        </button>
      </div>

      {/* ESCROW MODAL */}
      {showEscrow && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">

            {/* Step 1: Chọn hình thức */}
            {escrowStep === 1 && (
              <div className="p-5">
                <h2 className="font-black text-lg text-gray-800 mb-1">🐓 Mua gà: {ga?.ten}</h2>
                <p className="text-[#8B1A1A] font-bold mb-4">{parseInt(ga?.gia || 0).toLocaleString('vi-VN')} đ</p>

                <h3 className="font-bold text-gray-700 mb-3">Chọn hình thức giao dịch:</h3>

                {/* Tự do */}
                <div className="border border-gray-200 rounded-xl p-4 mb-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🤝</span>
                    <span className="font-bold text-gray-800">Giao dịch tự do</span>
                    <span className="ml-auto text-xs bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full">Không phí</span>
                  </div>
                  <p className="text-xs text-gray-500 mb-3">Hai bên tự liên hệ, tự thỏa thuận. Không có bảo vệ từ hệ thống.</p>
                  <div className="flex gap-2">
                    <a href={`https://zalo.me/${ZALO}`} target="_blank"
                      className="flex-1 bg-blue-500 text-white text-xs font-bold py-2 rounded-lg text-center hover:bg-blue-600 transition">
                      📱 Zalo: {ZALO}
                    </a>
                    <button onClick={() => { setShowEscrow(false); }}
                      className="flex-1 border border-gray-300 text-gray-600 text-xs font-bold py-2 rounded-lg hover:bg-gray-50 transition">
                      Chat trong app
                    </button>
                  </div>
                  <p className="text-xs text-orange-500 mt-2">⚠️ Rủi ro lừa đảo — không được bảo vệ</p>
                </div>

                {/* Qua sàn */}
                <div className="border-2 border-[#8B1A1A] rounded-xl p-4 bg-red-50">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-xl">🔒</span>
                    <span className="font-bold text-gray-800">Giao dịch qua sàn</span>
                    <span className="ml-auto text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-bold">Khuyến khích</span>
                  </div>
                  <p className="text-xs text-gray-600 mb-2">Cọc {COC_PERCENT}% qua hệ thống. Tiền được giữ đến khi bạn nhận gà OK.</p>
                  <div className="text-xs text-gray-500 space-y-1 mb-3">
                    <div>✅ Bảo vệ người mua</div>
                    <div>✅ Người bán yên tâm</div>
                    <div>✅ Phí chỉ {PHI_PERCENT}% khi giao dịch xong</div>
                  </div>
                  <button onClick={taoOrder}
                    className="w-full bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition">
                    🔒 Đặt cọc qua sàn ngay
                  </button>
                </div>

                <button onClick={() => setShowEscrow(false)}
                  className="w-full mt-3 text-gray-400 text-sm hover:text-gray-600">Đóng</button>
              </div>
            )}

            {/* Step 2: Thông tin chuyển khoản */}
            {escrowStep === 2 && order && (
              <div className="p-5">
                <div className="text-center mb-4">
                  <div className="text-3xl mb-2">💳</div>
                  <h2 className="font-black text-lg text-gray-800">Chuyển khoản đặt cọc</h2>
                  <p className="text-sm text-gray-500">Mã giao dịch: <span className="font-bold text-[#8B1A1A]">{order.ma_giao_dich}</span></p>
                </div>

                <div className="bg-gray-50 rounded-xl p-4 mb-4 space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-500">Ngân hàng</span>
                    <span className="font-bold">{TK_NGAN_HANG}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Số tài khoản</span>
                    <span className="font-bold text-[#8B1A1A] select-all">{TK_SO}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Tên TK</span>
                    <span className="font-bold">{TK_TEN}</span>
                  </div>
                  <div className="flex justify-between border-t pt-2">
                    <span className="text-gray-500">Số tiền cọc</span>
                    <span className="font-black text-[#8B1A1A] text-lg">{order.tien_coc.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">Nội dung CK</span>
                    <span className="font-bold text-blue-600 select-all">COC {order.ma_giao_dich}</span>
                  </div>
                </div>

                {/* QR CODE */}
                <div className="text-center mb-4">
                  <img
                    src={`https://img.vietqr.io/image/${TK_BIN}-${TK_SO}-compact2.png?amount=${order.tien_coc}&addInfo=COC%20${order.ma_giao_dich}&accountName=${encodeURIComponent(TK_TEN)}`}
                    alt="QR chuyển khoản"
                    className="w-48 h-48 mx-auto rounded-xl border"
                    onError={(e) => (e.currentTarget.style.display = 'none')}
                  />
                  <p className="text-xs text-gray-400 mt-1">Quét mã QR để chuyển khoản nhanh</p>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3 mb-4 text-xs text-yellow-800">
                  <strong>Lưu ý quan trọng:</strong>
                  <ul className="mt-1 space-y-0.5 list-disc list-inside">
                    <li>Ghi đúng nội dung: COC {order.ma_giao_dich}</li>
                    <li>Sau khi CK, nhắn tin xác nhận trong chat</li>
                    <li>Phí {PHI_PERCENT}% thu khi giao dịch hoàn tất</li>
                  </ul>
                </div>

                <button onClick={() => { setShowEscrow(false); setEscrowStep(1); sendMessage(`💳 Đã chuyển khoản cọc ${order.tien_coc.toLocaleString('vi-VN')}đ - Mã: ${order.ma_giao_dich} - Chờ xác nhận`); }}
                  className="w-full bg-green-600 text-white font-black py-3 rounded-xl hover:bg-green-700 transition">
                  ✅ Đã chuyển khoản — Thông báo người bán
                </button>

                <button onClick={() => setEscrowStep(1)}
                  className="w-full mt-2 text-gray-400 text-sm hover:text-gray-600">← Quay lại</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
