'use client';
import { useState, useEffect, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

export default function ConvChatPage() {
  const { convId } = useParams();
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [conv, setConv] = useState<any>(null);
  const [messages, setMessages] = useState<any[]>([]);
  const [newMsg, setNewMsg] = useState('');
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => { init(); }, [convId]);
  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const init = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }
      setUser(user);

      // Lấy conversation
      const { data: convData } = await supabase
        .from('conversations')
        .select(`
          id, ga_id, buyer_id, seller_id,
          ga (id, ten, gia, ga_images (url, is_primary)),
          buyer:profiles!conversations_buyer_id_fkey (username),
          seller:profiles!conversations_seller_id_fkey (username)
        `)
        .eq('id', convId)
        .single();

      if (!convData) { setLoading(false); return; }

      // Kiểm tra quyền
      if (convData.buyer_id !== user.id && convData.seller_id !== user.id) {
        router.push('/tin-nhan');
        return;
      }

      setConv(convData);

      // Lấy messages
      const { data: msgs } = await supabase
        .from('messages')
        .select('id, sender_id, noi_dung, loai, created_at')
        .eq('conversation_id', convId)
        .order('created_at', { ascending: true });
      setMessages(msgs || []);
      setLoading(false);

      // Realtime
      supabase
        .channel(`conv-detail-${convId}`)
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${convId}`,
        }, (payload) => {
          setMessages(prev => {
            if (prev.find(m => m.id === payload.new.id)) return prev;
            return [...prev, payload.new];
          });
        })
        .subscribe();
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  const sendMessage = async (text?: string) => {
    const content = text || newMsg.trim();
    if (!content || !user) return;
    setNewMsg('');
    await supabase.from('messages').insert({
      conversation_id: convId,
      sender_id: user.id,
      noi_dung: content,
      loai: 'text',
    });
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-[#8B1A1A] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  if (!conv) return (
    <div className="text-center py-20">
      <div className="text-4xl mb-3">💬</div>
      <div className="text-gray-500">Không tìm thấy cuộc trò chuyện</div>
      <Link href="/tin-nhan" className="text-[#8B1A1A] hover:underline mt-2 block">← Về tin nhắn</Link>
    </div>
  );

  const ga = conv.ga;
  const isBuyer = conv.buyer_id === user?.id;
  const doiPhuong = isBuyer ? conv.seller : conv.buyer;
  const anhGa = ga?.ga_images?.find((i: any) => i.is_primary)?.url || ga?.ga_images?.[0]?.url;

  return (
    <div className="max-w-2xl mx-auto px-4 py-4" style={{height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column'}}>

      {/* HEADER */}
      <div className="bg-white rounded-xl shadow-sm p-3 mb-3 flex items-center gap-3 flex-shrink-0">
        <Link href="/tin-nhan" className="text-gray-400 hover:text-gray-600 text-lg">←</Link>

        {anhGa ? (
          <img src={anhGa} alt="" className="w-10 h-10 object-cover rounded-lg flex-shrink-0" />
        ) : (
          <div className="w-10 h-10 bg-orange-800 rounded-lg flex items-center justify-center text-xl flex-shrink-0">🐓</div>
        )}

        <div className="flex-1 min-w-0">
          <div className="font-bold text-sm text-gray-800 truncate">{ga?.ten}</div>
          <div className="text-xs text-gray-500">
            {isBuyer ? `Người bán: ${doiPhuong?.username || 'Ẩn'}` : `Người mua: ${doiPhuong?.username || 'Ẩn'}`}
          </div>
        </div>

        <Link href={`/ga/${conv.ga_id}`}
          className="text-xs bg-gray-100 text-gray-600 px-3 py-1.5 rounded-full hover:bg-gray-200 transition whitespace-nowrap">
          Xem gà
        </Link>
      </div>

      {/* MESSAGES */}
      <div className="flex-1 bg-white rounded-xl shadow-sm p-4 overflow-y-auto mb-3 space-y-3 min-h-0">
        {messages.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            <div className="text-3xl mb-2">👋</div>
            <div className="text-sm">Bắt đầu trò chuyện</div>
            {!isBuyer && (
              <div className="flex gap-2 justify-center mt-3 flex-wrap">
                {['Gà vẫn còn bán bạn nhé!', 'Giá có thể thương lượng thêm', 'Bạn muốn xem thêm ảnh không?'].map(q => (
                  <button key={q} onClick={() => sendMessage(q)}
                    className="bg-gray-100 text-gray-600 text-xs px-3 py-1.5 rounded-full hover:bg-gray-200 transition">
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {messages.map((msg: any) => {
          const isMe = msg.sender_id === user?.id;
          if (msg.loai === 'system') return (
            <div key={msg.id} className="text-center">
              <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full">{msg.noi_dung}</span>
            </div>
          );
          return (
            <div key={msg.id} className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}>
              {!isMe && (
                <div className="w-7 h-7 bg-[#8B1A1A] rounded-full flex items-center justify-center text-white text-xs mr-2 flex-shrink-0 mt-1">
                  {(doiPhuong?.username || 'U')[0].toUpperCase()}
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
      <div className="bg-white rounded-xl shadow-sm p-3 flex gap-2 flex-shrink-0">
        <input value={newMsg} onChange={e => setNewMsg(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="Nhắn tin..."
          className="flex-1 border rounded-full px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
        <button onClick={() => sendMessage()} disabled={!newMsg.trim()}
          className="bg-[#8B1A1A] text-white w-10 h-10 rounded-full flex items-center justify-center hover:bg-[#6B0F0F] transition disabled:opacity-40">
          ➤
        </button>
      </div>
    </div>
  );
}
