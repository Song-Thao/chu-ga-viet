'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

const MauNen = ['bg-orange-800', 'bg-gray-700', 'bg-green-800', 'bg-red-900', 'bg-yellow-700', 'bg-teal-800'];

const Videos = [
  { id: 1, ten: 'Trận Gà Kinh Điển', luot_xem: '112k', tg: '13:09' },
  { id: 2, ten: 'Đá Gà Xanh Thắng Lớn', luot_xem: '112k', tg: '29:18' },
  { id: 3, ten: 'Gà Điều Chiến Đấu Xác', luot_xem: '112k', tg: '31:38' },
];

export default function HomePage() {
  const [gaMoiDang, setGaMoiDang] = useState<any[]>([]);
  const [gaNoiBat, setGaNoiBat] = useState<any[]>([]);
  const [shopeeLink, setShopeeLink] = useState('https://s.shopee.vn/AKVzuqq0dk');
  const [loading, setLoading] = useState(true);

  useEffect(() => { fetchData(); }, []);

  const fetchData = async () => {
    try {
      // Lấy config shopee link
      const { data: cfg } = await supabase.from('config').select('shopee_link').single();
      if (cfg?.shopee_link) setShopeeLink(cfg.shopee_link);

      // Gà mới đăng
      const { data: moiDang } = await supabase
        .from('ga')
        .select('id, ten, loai_ga, gia, khu_vuc, ga_images(url, is_primary), ai_analysis(total_score)')
        .eq('status', 'active')
        .order('created_at', { ascending: false })
        .limit(4);

      // Gà nổi bật
      const { data: noiBat } = await supabase
        .from('ga')
        .select('id, ten, loai_ga, gia, khu_vuc, view_count, ga_images(url, is_primary), ai_analysis(total_score)')
        .eq('status', 'active')
        .order('view_count', { ascending: false })
        .limit(4);

      setGaMoiDang(moiDang || []);
      setGaNoiBat(noiBat || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const formatGia = (gia: number) => {
    if (gia >= 1000000) return `${(gia / 1000000).toFixed(1).replace('.0', '')} triệu đ`;
    return `${gia.toLocaleString('vi-VN')} đ`;
  };

  const GaCard = ({ ga, idx }: { ga: any; idx: number }) => {
    const anhChinh = ga.ga_images?.find((i: any) => i.is_primary)?.url || ga.ga_images?.[0]?.url;
    const aiScore = ga.ai_analysis?.[0]?.total_score;
    return (
      <Link href={`/ga/${ga.id}`}>
        <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer">
          {anhChinh ? (
            <img src={anhChinh} alt={ga.ten} className="w-full h-36 object-cover" />
          ) : (
            <div className={`${MauNen[idx % MauNen.length]} h-36 flex items-center justify-center text-5xl`}>🐓</div>
          )}
          <div className="p-3">
            <div className="text-xs text-[#8B1A1A] font-semibold mb-0.5">{ga.loai_ga}</div>
            <div className="font-bold text-sm text-gray-800 truncate">{ga.ten}</div>
            <div className="text-[#8B1A1A] font-black text-sm mt-1">{formatGia(parseInt(ga.gia))}</div>
            <div className="flex justify-between items-center mt-2">
              <span className="text-xs text-gray-500">📍 {ga.khu_vuc}</span>
              {aiScore && <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">⭐ {aiScore}</span>}
            </div>
          </div>
        </div>
      </Link>
    );
  };

  const SkeletonCard = () => (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
      <div className="bg-gray-200 h-36"></div>
      <div className="p-3 space-y-2">
        <div className="bg-gray-200 h-3 rounded w-1/3"></div>
        <div className="bg-gray-200 h-4 rounded w-3/4"></div>
        <div className="bg-gray-200 h-3 rounded w-1/2"></div>
      </div>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">

      {/* BANNER TOP */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-gradient-to-r from-red-900 to-red-700 text-white p-4 rounded-xl flex flex-col justify-center">
          <div className="text-xs font-bold text-yellow-400 mb-1">THUỐC BỔ GÀ</div>
          <div className="font-black text-lg leading-tight">CHIẾN SIÊU LỰC</div>
          <div className="text-xs mt-1 text-gray-300">Tăng đòn • Tăng da • Tăng sức bền</div>
        </div>
        <div className="bg-gradient-to-r from-gray-700 to-gray-600 text-white p-4 rounded-xl flex flex-col justify-center">
          <div className="text-xs font-bold text-yellow-400 mb-1">MÁY ẤP TRỨNG</div>
          <div className="font-black text-lg leading-tight">HIỆU QUẢ, CHÍNH XÁC</div>
          <div className="text-xs mt-1 text-gray-300">Công nghệ mới nhất 2024</div>
        </div>
        <div className="bg-gradient-to-r from-yellow-800 to-yellow-700 text-white p-4 rounded-xl flex flex-col justify-center">
          <div className="text-xs font-bold text-yellow-300 mb-1">THỨC ĂN</div>
          <div className="font-black text-lg leading-tight">TĂNG LỰC CHIẾN KÊ</div>
          <div className="text-xs mt-1 text-gray-300">Dinh dưỡng cao cấp</div>
        </div>
      </div>

      {/* SHOPEE AFFILIATE BANNER */}
      <a href={shopeeLink} target="_blank" rel="noopener noreferrer"
        className="block mb-6 cursor-pointer group">
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl p-4 flex items-center gap-4 hover:opacity-95 transition shadow-sm">
          <div className="text-4xl">🛒</div>
          <div className="flex-1">
            <div className="font-black text-white text-lg">Mua phụ kiện gà chọi trên Shopee</div>
            <div className="text-orange-100 text-sm mt-0.5">Thức ăn • Thuốc bổ • Dụng cụ chăn nuôi • Giao hàng toàn quốc</div>
          </div>
          <div className="bg-white text-orange-500 font-black px-4 py-2 rounded-full text-sm group-hover:scale-105 transition flex items-center gap-1">
            <span>Mua ngay</span>
            <span>→</span>
          </div>
        </div>
      </a>

      {/* SEARCH */}
      <div className="bg-white rounded-xl p-4 mb-6 shadow-sm flex flex-wrap gap-3">
        <select className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[120px]">
          <option>Loại gà</option>
          <option>Gà Tre</option>
          <option>Gà Ri</option>
          <option>Gà Đông Tảo</option>
          <option>Gà Chọi</option>
          <option>Gà Nòi</option>
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[120px]">
          <option>Khu vực</option>
          <option>TP.HCM</option>
          <option>Cần Thơ</option>
          <option>Cà Mau</option>
          <option>Hà Nội</option>
          <option>Đà Nẵng</option>
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[120px]">
          <option>Mức giá</option>
          <option>Dưới 5 triệu</option>
          <option>5 - 10 triệu</option>
          <option>Trên 10 triệu</option>
        </select>
        <Link href="/cho" className="bg-[#8B1A1A] text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-[#6B0F0F] transition">
          Tìm kiếm
        </Link>
      </div>

      {/* GÀ MỚI ĐĂNG */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-black text-lg text-gray-800 uppercase">🐓 Gà Mới Đăng</h2>
          <Link href="/cho" className="text-[#8B1A1A] text-sm font-semibold hover:underline">Xem thêm →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading ? [1,2,3,4].map(i => <SkeletonCard key={i} />) :
            gaMoiDang.length > 0 ? gaMoiDang.map((ga, idx) => <GaCard key={ga.id} ga={ga} idx={idx} />) : (
              <div className="col-span-4 text-center py-10 text-gray-400">
                <div className="text-4xl mb-2">🐓</div>
                <div className="text-sm">Chưa có gà nào. <Link href="/dang-ga" className="text-[#8B1A1A] hover:underline">Đăng bán ngay!</Link></div>
              </div>
            )}
        </div>
      </section>

      {/* SHOPEE INLINE BANNER */}
      <a href={shopeeLink} target="_blank" rel="noopener noreferrer"
        className="block mb-8 group">
        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 flex items-center gap-3 hover:border-orange-400 transition">
          <div className="text-3xl">🧴</div>
          <div className="flex-1">
            <div className="font-bold text-orange-800">Shopee — Thuốc & thức ăn gà chọi</div>
            <div className="text-xs text-orange-600 mt-0.5">Hàng nghìn sản phẩm chăm sóc gà chọi chất lượng cao</div>
          </div>
          <div className="text-orange-500 font-bold text-sm group-hover:translate-x-1 transition">Xem →</div>
        </div>
      </a>

      {/* GÀ NỔI BẬT */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-black text-lg text-gray-800 uppercase">🔥 Gà Nổi Bật</h2>
          <Link href="/cho" className="text-[#8B1A1A] text-sm font-semibold hover:underline">Xem tất cả →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {loading ? [1,2,3,4].map(i => <SkeletonCard key={i} />) :
            gaNoiBat.length > 0 ? gaNoiBat.map((ga, idx) => <GaCard key={ga.id} ga={ga} idx={idx} />) : (
              <div className="col-span-4 text-center py-10 text-gray-400 text-sm">Chưa có gà nổi bật</div>
            )}
        </div>
      </section>

      {/* VIDEO */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-black text-lg text-gray-800 uppercase">🎬 Video Thực Chiến</h2>
          <Link href="/thu-vien" className="text-[#8B1A1A] text-sm font-semibold hover:underline">Xem thêm →</Link>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Videos.map(v => (
            <div key={v.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer">
              <div className="bg-gradient-to-br from-gray-800 to-gray-900 h-40 flex items-center justify-center relative">
                <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center">
                  <div className="text-white text-2xl ml-1">▶</div>
                </div>
                <div className="absolute bottom-2 right-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">{v.tg}</div>
              </div>
              <div className="p-3">
                <div className="font-bold text-sm text-gray-800">{v.ten}</div>
                <div className="text-xs text-gray-500 mt-1">▶ {v.luot_xem} lượt xem</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* BOTTOM CTA */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link href="/thu-vien"
          className="bg-gradient-to-r from-amber-800 to-amber-700 text-white rounded-xl p-5 flex items-center gap-3 hover:opacity-90 transition">
          <div className="text-3xl">📚</div>
          <div>
            <div className="font-black">BÀI VIẾT HƯỚNG DẪN</div>
            <div className="text-xs text-amber-200 mt-1">Kiến thức từ chuyên gia</div>
          </div>
        </Link>
        <a href={shopeeLink} target="_blank" rel="noopener noreferrer"
          className="bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl p-5 flex items-center gap-3 hover:opacity-90 transition">
          <div className="text-3xl">🛍️</div>
          <div>
            <div className="font-black">PHỤ KIỆN GÀ SHOPEE</div>
            <div className="text-xs text-orange-100 mt-1">Mua hàng — nhận hoa hồng</div>
          </div>
        </a>
      </div>

    </div>
  );
}
