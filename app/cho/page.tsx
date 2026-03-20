'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const KhuVuc = [
  'Tất cả', 'TP.HCM', 'Bình Dương', 'Đồng Nai', 'Long An',
  'Tiền Giang', 'Bến Tre', 'Vĩnh Long', 'Đồng Tháp',
  'An Giang', 'Kiên Giang', 'Cần Thơ', 'Hậu Giang', 'Sóc Trăng',
  'Bạc Liêu', 'Cà Mau', 'Tây Ninh', 'Bình Phước',
  'Đà Nẵng', 'Khánh Hòa', 'Bình Định', 'Huế',
  'Nghệ An', 'Thanh Hóa', 'Đắk Lắk', 'Lâm Đồng',
  'Hà Nội', 'Hải Phòng', 'Quảng Ninh',
];

const LoaiGa = [
  'Tất cả', 'Gà Tre', 'Gà Ri', 'Gà Đông Tảo', 'Gà Ta',
  'Gà Chọi', 'Gà Nòi', 'Gà Mã', 'Gà Peru', 'Gà Thái',
  'Gà Mỹ', 'Gà Tây', 'Gà Lôi', 'Gà Rừng', 'Khác'
];

const MauNen = [
  'bg-orange-800', 'bg-gray-700', 'bg-green-800',
  'bg-red-900', 'bg-yellow-700', 'bg-teal-800'
];

export default function ChoPage() {
  const [gaList, setGaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [khuVuc, setKhuVuc] = useState('Tất cả');
  const [loaiGa, setLoaiGa] = useState('Tất cả');
  const [giaMax, setGiaMax] = useState(50000000);
  const [sapXep, setSapXep] = useState('Mới nhất');

  useEffect(() => {
    fetchGa();
  }, [khuVuc, loaiGa]);

  const fetchGa = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (loaiGa !== 'Tất cả') params.append('loai', loaiGa);
      if (khuVuc !== 'Tất cả') params.append('khu_vuc', khuVuc);

      const res = await fetch(`/api/ga?${params}`);
      const data = await res.json();
      setGaList(data.data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = gaList.filter(g => parseInt(g.gia) <= giaMax);

  const sorted = [...filtered].sort((a, b) => {
    if (sapXep === 'Giá thấp nhất') return parseInt(a.gia) - parseInt(b.gia);
    if (sapXep === 'Giá cao nhất') return parseInt(b.gia) - parseInt(a.gia);
    if (sapXep === 'Điểm AI cao nhất') {
      const aScore = a.ai_analysis?.[0]?.total_score || 0;
      const bScore = b.ai_analysis?.[0]?.total_score || 0;
      return bScore - aScore;
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const formatGia = (gia: number) => {
    if (gia >= 1000000) return `${(gia/1000000).toFixed(1).replace('.0','')} triệu`;
    return gia.toLocaleString('vi-VN');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      <div className="flex gap-4">

        {/* SIDEBAR */}
        <div className="hidden md:block w-56 flex-shrink-0">
          <div className="bg-white rounded-xl p-4 shadow-sm sticky top-20">
            <h3 className="font-black text-gray-800 mb-4">Lọc kết quả</h3>

            {/* GIÁ */}
            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-600 mb-1">Mức giá</div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>0đ</span>
                <span>{formatGia(giaMax)}</span>
              </div>
              <input type="range" min="500000" max="50000000" step="500000"
                value={giaMax} onChange={e => setGiaMax(Number(e.target.value))}
                className="w-full accent-red-800" />
            </div>

            {/* KHU VỰC */}
            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-600 mb-2">Khu vực</div>
              <select value={khuVuc} onChange={e => setKhuVuc(e.target.value)}
                className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
                {KhuVuc.map(kv => <option key={kv}>{kv}</option>)}
              </select>
            </div>

            {/* LOẠI GÀ */}
            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-600 mb-2">Loại gà</div>
              <div className="space-y-1 max-h-48 overflow-y-auto">
                {LoaiGa.map(lg => (
                  <label key={lg} className="flex items-center gap-2 text-sm cursor-pointer hover:text-red-800">
                    <input type="radio" name="loaiga" checked={loaiGa === lg}
                      onChange={() => setLoaiGa(lg)} className="accent-red-800" />
                    {lg}
                  </label>
                ))}
              </div>
            </div>

            <button onClick={() => { setKhuVuc('Tất cả'); setLoaiGa('Tất cả'); setGiaMax(50000000); }}
              className="w-full border border-red-800 text-red-800 rounded-lg py-2 text-sm font-semibold hover:bg-red-50 transition">
              Xóa bộ lọc
            </button>
          </div>
        </div>

        {/* MAIN */}
        <div className="flex-1">
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="font-black text-xl text-gray-800">Chợ Gà Việt</h1>
              <p className="text-sm text-gray-500">{sorted.length} kết quả</p>
            </div>
            <select value={sapXep} onChange={e => setSapXep(e.target.value)}
              className="border rounded-lg px-3 py-1.5 text-sm">
              <option>Mới nhất</option>
              <option>Giá thấp nhất</option>
              <option>Giá cao nhất</option>
              <option>Điểm AI cao nhất</option>
            </select>
          </div>

          {/* MOBILE FILTER */}
          <div className="md:hidden flex gap-2 mb-4 overflow-x-auto pb-2">
            {KhuVuc.slice(0, 10).map(kv => (
              <button key={kv} onClick={() => setKhuVuc(khuVuc === kv ? 'Tất cả' : kv)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border transition ${khuVuc === kv ? 'bg-[#8B1A1A] text-white border-[#8B1A1A]' : 'bg-white text-gray-600 border-gray-300'}`}>
                {kv}
              </button>
            ))}
          </div>

          {/* LOADING */}
          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
                  <div className="bg-gray-200 h-40"></div>
                  <div className="p-3 space-y-2">
                    <div className="bg-gray-200 h-3 rounded w-3/4"></div>
                    <div className="bg-gray-200 h-4 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* GRID GÀ */}
          {!loading && sorted.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {sorted.map((ga, idx) => {
                const anhChinh = ga.ga_images?.find((i: any) => i.is_primary)?.url
                  || ga.ga_images?.[0]?.url;
                const aiScore = ga.ai_analysis?.[0]?.total_score;

                return (
                  <Link key={ga.id} href={`/ga/${ga.id}`}>
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer">
                      {anhChinh ? (
                        <img src={anhChinh} alt={ga.ten}
                          className="w-full h-40 object-cover" />
                      ) : (
                        <div className={`${MauNen[idx % MauNen.length]} h-40 flex items-center justify-center text-5xl relative`}>
                          🐓
                        </div>
                      )}
                      <div className="p-3">
                        <div className="text-xs text-[#8B1A1A] font-semibold mb-0.5">{ga.loai_ga}</div>
                        <div className="font-bold text-sm text-gray-800 truncate">{ga.ten}</div>
                        <div className="text-[#8B1A1A] font-black text-sm mt-1">
                          {parseInt(ga.gia).toLocaleString('vi-VN')} đ
                        </div>
                        <div className="flex justify-between items-center mt-2">
                          <span className="text-xs text-gray-500">📍 {ga.khu_vuc}</span>
                          {aiScore && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">
                              ⭐ {aiScore}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}

          {/* TRỐNG */}
          {!loading && sorted.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-4">🐓</div>
              <div className="font-semibold">Chưa có gà nào</div>
              <div className="text-sm mt-1">Hãy là người đầu tiên đăng bán!</div>
              <Link href="/dang-ga"
                className="mt-4 inline-block bg-[#8B1A1A] text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-[#6B0F0F] transition">
                Đăng gà ngay
              </Link>
            </div>
          )}

          {/* CTA */}
          {!loading && sorted.length > 0 && (
            <div className="mt-8 bg-gradient-to-r from-[#8B1A1A] to-red-700 rounded-xl p-6 text-white text-center">
              <div className="font-black text-xl mb-2">🐓 Bạn có gà muốn bán?</div>
              <p className="text-red-200 text-sm mb-4">Đăng bán miễn phí, AI tự động phân tích</p>
              <Link href="/dang-ga"
                className="bg-yellow-400 text-black font-black px-6 py-2 rounded-full hover:bg-yellow-300 transition inline-block">
                Đăng gà ngay
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
