'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function TinNhanPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [convs, setConvs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => { init(); }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    setUser(user);
    await fetchConvs(user.id);
    setLoading(false);

    supabase
      .channel('tin-nhan-list')
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' },
        () => fetchConvs(user.id))
      .subscribe();
  };

  const fetchConvs = async (userId: string) => {
    const { data: convData } = await supabase
      .from('conversations')
      .select('id, ga_id, buyer_id, seller_id, type, created_at')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (!convData || convData.length === 0) { setConvs([]); return; }

    const enriched = await Promise.all(convData.map(async (conv) => {
      // Lấy thông tin gà nếu là product chat
      let ga = null;
      if (conv.ga_id) {
        const { data } = await supabase
          .from('ga')
          .select('id, ten, gia, ga_images(url, is_primary)')
          .eq('id', conv.ga_id)
          .maybeSingle();
        ga = data;
      }

      // Lấy thông tin đối phương
      const doiPhuongId = conv.buyer_id === userId ? conv.seller_id : conv.buyer_id;
      const { data: doiPhuong } = await supabase
        .from('profiles')
        .select('id, username, avatar_url')
        .eq('id', doiPhuongId)
        .maybeSingle();

      // Lấy tin nhắn cuối kèm tên người gửi
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('noi_dung, created_at, sender_id, profiles(username)')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        ...conv,
        ga,
        doiPhuong,
        lastMsg,
        chatType: conv.type || (conv.ga_id ? 'product' : 'user'),
      };
    }));

    setConvs(enriched);
  };

  if (loading) return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="w-8 h-8 border-4 border-[#8B1A1A] border-t-transparent rounded-full animate-spin"></div>
    </div>
  );

  return (
    <div className="max-w-2xl mx-auto px-4 py-4">
      <h1 className="font-black text-xl text-gray-800 mb-4">💬 Tin nhắn</h1>

      {convs.length === 0 ? (
        <div className="text-center py-16 bg-white rounded-xl shadow-sm">
          <div className="text-5xl mb-3">💬</div>
          <div className="font-semibold text-gray-500">Chưa có tin nhắn nào</div>
          <Link href="/cho" className="mt-3 inline-block text-[#8B1A1A] hover:underline text-sm">
            Xem chợ gà →
          </Link>
        </div>
      ) : (
        <div className="bg-white rounded-xl shadow-sm overflow-hidden">
          {convs.map((conv, idx) => {
            const ga = conv.ga;
            const anhGa = ga?.ga_images?.find((i: any) => i.is_primary)?.url || ga?.ga_images?.[0]?.url;
            const isProduct = conv.chatType === 'product' && ga;

            // Preview tin nhắn cuối với tên người gửi
            let previewMsg = <span className="italic">Chưa có tin nhắn</span>;
            if (conv.lastMsg) {
              const isMe = conv.lastMsg.sender_id === user?.id;
              const senderName = isMe
                ? 'Bạn'
                : (conv.lastMsg.profiles?.username || conv.doiPhuong?.username || 'Người dùng');
              previewMsg = <span><span className="font-semibold">{senderName}:</span> {conv.lastMsg.noi_dung}</span>;
            }

            return (
              <Link key={conv.id} href={`/tin-nhan/${conv.id}`}
                className={`flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition ${idx < convs.length - 1 ? 'border-b' : ''}`}>

                {/* AVATAR */}
                {isProduct ? (
                  anhGa
                    ? <img src={anhGa} alt="" className="w-12 h-12 object-cover rounded-xl flex-shrink-0" />
                    : <div className="w-12 h-12 bg-orange-800 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🐓</div>
                ) : (
                  conv.doiPhuong?.avatar_url
                    ? <img src={conv.doiPhuong.avatar_url} alt="" className="w-12 h-12 object-cover rounded-full flex-shrink-0" />
                    : <div className="w-12 h-12 bg-[#8B1A1A] rounded-full flex items-center justify-center text-white font-bold text-lg flex-shrink-0">
                        {(conv.doiPhuong?.username || 'U')[0].toUpperCase()}
                      </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    {/* Tên chính: tên gà (product) hoặc tên người (user chat) */}
                    <div className="font-bold text-sm text-gray-800 truncate">
                      {isProduct ? ga.ten : (conv.doiPhuong?.username || 'Người dùng')}
                    </div>
                    {conv.lastMsg && (
                      <div className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {new Date(conv.lastMsg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>

                  {/* Dòng phụ: giá + tên đối phương (product) hoặc chỉ tên (user chat) */}
                  <div className="text-xs text-[#8B1A1A] font-semibold mb-1 truncate">
                    {isProduct
                      ? `${parseInt(ga.gia || 0).toLocaleString('vi-VN')} đ • ${conv.doiPhuong?.username || 'Người dùng'}`
                      : conv.doiPhuong?.username || 'Người dùng'
                    }
                  </div>

                  {/* Preview tin nhắn cuối */}
                  <div className="text-xs text-gray-500 truncate">{previewMsg}</div>
                </div>

                <div className="text-gray-300 flex-shrink-0">›</div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
