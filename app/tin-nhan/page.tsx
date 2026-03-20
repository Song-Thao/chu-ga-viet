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

  useEffect(() => {
    init();
  }, []);

  const init = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) { router.push('/login'); return; }
    setUser(user);
    await fetchConvs(user.id);
    setLoading(false);

    // Realtime — cập nhật khi có tin nhắn mới
    supabase
      .channel('tin-nhan-list')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'messages',
      }, () => fetchConvs(user.id))
      .subscribe();
  };

  const fetchConvs = async (userId: string) => {
    const { data } = await supabase
      .from('conversations')
      .select(`
        id, created_at, status,
        ga (id, ten, gia, ga_images (url, is_primary)),
        buyer:profiles!conversations_buyer_id_fkey (id, username),
        seller:profiles!conversations_seller_id_fkey (id, username)
      `)
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (!data) return;

    // Lấy tin nhắn cuối của mỗi conversation
    const convsWithLastMsg = await Promise.all(
      data.map(async (conv: any) => {
        const { data: lastMsg } = await supabase
          .from('messages')
          .select('noi_dung, sender_id, created_at')
          .eq('conversation_id', conv.id)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();
        return { ...conv, lastMsg };
      })
    );

    setConvs(convsWithLastMsg);
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
          {convs.map((conv: any, idx: number) => {
            const isMe = user?.id;
            const ga = conv.ga;
            const anhGa = ga?.ga_images?.find((i: any) => i.is_primary)?.url || ga?.ga_images?.[0]?.url;
            const isBuyer = conv.buyer?.id === isMe;
            const doiPhuong = isBuyer ? conv.seller : conv.buyer;
            const lastMsg = conv.lastMsg;
            const isLastMine = lastMsg?.sender_id === isMe;

            return (
              <Link key={conv.id} href={`/tin-nhan/${conv.id}`}
                className={`flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition ${idx < convs.length - 1 ? 'border-b' : ''}`}>

                {/* Ảnh gà */}
                <div className="flex-shrink-0">
                  {anhGa ? (
                    <img src={anhGa} alt="" className="w-12 h-12 object-cover rounded-xl" />
                  ) : (
                    <div className="w-12 h-12 bg-orange-800 rounded-xl flex items-center justify-center text-2xl">🐓</div>
                  )}
                </div>

                {/* Nội dung */}
                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <div className="font-bold text-sm text-gray-800 truncate">{ga?.ten || 'Gà'}</div>
                    {lastMsg && (
                      <div className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {new Date(lastMsg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-[#8B1A1A] font-semibold mb-1">
                    {parseInt(ga?.gia || 0).toLocaleString('vi-VN')} đ
                    {' • '}
                    {isBuyer ? `Người bán: ${doiPhuong?.username || 'Ẩn'}` : `Người mua: ${doiPhuong?.username || 'Ẩn'}`}
                  </div>
                  {lastMsg ? (
                    <div className="text-xs text-gray-500 truncate">
                      {isLastMine ? 'Bạn: ' : ''}{lastMsg.noi_dung}
                    </div>
                  ) : (
                    <div className="text-xs text-gray-400 italic">Chưa có tin nhắn</div>
                  )}
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
