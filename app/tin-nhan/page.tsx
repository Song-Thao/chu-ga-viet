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

    // Realtime
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
    // Query đơn giản không dùng FK alias
    const { data: convData } = await supabase
      .from('conversations')
      .select('id, ga_id, buyer_id, seller_id, created_at')
      .or(`buyer_id.eq.${userId},seller_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (!convData || convData.length === 0) {
      setConvs([]);
      return;
    }

    // Lấy thêm thông tin cho từng conversation
    const enriched = await Promise.all(convData.map(async (conv) => {
      // Lấy thông tin gà
      const { data: ga } = await supabase
        .from('ga')
        .select('id, ten, gia, ga_images(url, is_primary)')
        .eq('id', conv.ga_id)
        .single();

      // Lấy tên đối phương
      const doiPhuongId = conv.buyer_id === userId ? conv.seller_id : conv.buyer_id;
      const { data: doiPhuong } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', doiPhuongId)
        .maybeSingle();

      // Lấy tin nhắn cuối
      const { data: lastMsg } = await supabase
        .from('messages')
        .select('noi_dung, sender_id, created_at')
        .eq('conversation_id', conv.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      return {
        ...conv,
        ga,
        doiPhuong,
        lastMsg,
        isBuyer: conv.buyer_id === userId,
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

            return (
              <Link key={conv.id} href={`/tin-nhan/${conv.id}`}
                className={`flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition ${idx < convs.length - 1 ? 'border-b' : ''}`}>

                {anhGa ? (
                  <img src={anhGa} alt="" className="w-12 h-12 object-cover rounded-xl flex-shrink-0" />
                ) : (
                  <div className="w-12 h-12 bg-orange-800 rounded-xl flex items-center justify-center text-2xl flex-shrink-0">🐓</div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex justify-between items-start mb-0.5">
                    <div className="font-bold text-sm text-gray-800 truncate">{ga?.ten || 'Gà'}</div>
                    {conv.lastMsg && (
                      <div className="text-xs text-gray-400 flex-shrink-0 ml-2">
                        {new Date(conv.lastMsg.created_at).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    )}
                  </div>
                  <div className="text-xs text-[#8B1A1A] font-semibold mb-1">
                    {parseInt(ga?.gia || 0).toLocaleString('vi-VN')} đ
                    {' • '}
                    {conv.isBuyer ? `Người bán: ${conv.doiPhuong?.username || 'Ẩn'}` : `Người mua: ${conv.doiPhuong?.username || 'Ẩn'}`}
                  </div>
                  {conv.lastMsg ? (
                    <div className="text-xs text-gray-500 truncate">
                      {conv.lastMsg.sender_id === user?.id ? 'Bạn: ' : ''}{conv.lastMsg.noi_dung}
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
