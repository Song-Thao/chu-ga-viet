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
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  useEffect(() => { fetchGa(); }, [khuVuc, loaiGa]);

  const fetchGa = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (loaiGa !== 'Tất cả') params.append('loai', loaiGa);
      if (khuVuc !== 'Tất cả') params.append('khu_vuc', khuVuc);
      const res = await fetch(`/api/ga?${params}`);
      const data = await res.json();
      setGaList(data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = gaList.filter(g => parseInt(g.gia) <= giaMax);
  const sorted = [...filtered].sort((a, b) => {
    if (sapXep === 'Giá thấp nhất') return parseInt(a.gia) - parseInt(b.gia);
    if (sapXep === 'Giá cao nhất') return parseInt(b.gia) - parseInt(a.gia);
    if (sapXep === 'Điểm AI cao nhất') {
      return (b.ai_analysis?.[0]?.total_score || 0) - (a.ai_analysis?.[0]?.total_score || 0);
    }
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const formatGia = (gia: number) => {
    if (gia >= 1000000) return `${(gia/1000000).toFixed(1).replace('.0','')} triệu`;
    return gia.toLocaleString('vi-VN');
  };

  const FilterPanel = () => (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="font-black text-gray-800 mb-4">Lọc kết quả</h3>
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-600 mb-1">Mức giá</div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>0đ</span><span>{formatGia(giaMax)}</span>
        </div>
        <input type="range" min="500000" max="50000000" step="500000"
          value={giaMax} onChange={e => setGiaMax(Number(e.target.value))}
          className="w-full accent-red-800" />
      </div>
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-600 mb-2">Khu vực</div>
        <select value={khuVuc} onChange={e => setKhuVuc(e.target.value)}
          className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
          {KhuVuc.map(kv => <option key={kv}>{kv}</option>)}
        </select>
      </div>
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
      <button onClick={() => { setKhuVuc('Tất cả'); setLoaiGa('Tất cả'); setGiaMax(50000000); setShowMobileFilter(false); }}
        className="w-full border border-red-800 text-red-800 rounded-lg py-2 text-sm font-semibold hover:bg-red-50 transition">
        Xóa bộ lọc
      </button>
    </div>
  );

  return (
    <div className="max-w-6xl mx-auto px-3 py-4">

      {/* MOBILE FILTER MODAL */}
      {showMobileFilter && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:hidden" onClick={() => setShowMobileFilter(false)}>
          <div className="w-full bg-white rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-gray-800">Bộ lọc</h3>
              <button onClick={() => setShowMobileFilter(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <FilterPanel />
          </div>
        </div>
      )}

      <div className="flex gap-4">
        {/* SIDEBAR - chỉ hiện trên desktop */}
        <div className="hidden md:block w-56 flex-shrink-0">
          <div className="sticky top-20"><FilterPanel /></div>
        </div>

        {/* MAIN */}
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h1 className="font-black text-lg text-gray-800">Chợ Gà Việt</h1>
              <p className="text-xs text-gray-500">{sorted.length} kết quả</p>
            </div>
            <div className="flex items-center gap-2">
              {/* Nút lọc mobile */}
              <button onClick={() => setShowMobileFilter(true)}
                className="md:hidden flex items-center gap-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-600 bg-white">
                🔍 Lọc
              </button>
              <select value={sapXep} onChange={e => setSapXep(e.target.value)}
                className="border rounded-lg px-2 py-1.5 text-xs md:text-sm">
                <option>Mới nhất</option>
                <option>Giá thấp nhất</option>
                <option>Giá cao nhất</option>
                <option>Điểm AI cao nhất</option>
              </select>
            </div>
          </div>

          {/* LOADING */}
          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[1,2,3,4,5,6].map(i => (
                <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
                  <div className="bg-gray-200 h-36"></div>
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
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {sorted.map((ga, idx) => {
                const anhChinh = ga.ga_images?.find((i: any) => i.is_primary)?.url || ga.ga_images?.[0]?.url;
                const aiScore = ga.ai_analysis?.[0]?.total_score;
                return (
                  <Link key={ga.id} href={`/ga/${ga.id}`}>
                    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer">
                      {anhChinh ? (
                        <img src={anhChinh} alt={ga.ten} className="w-full h-36 object-cover" />
                      ) : (
                        <div className={`${MauNen[idx % MauNen.length]} h-36 flex items-center justify-center text-5xl`}>🐓</div>
                      )}
                      <div className="p-2 md:p-3">
                        <div className="text-xs text-[#8B1A1A] font-semibold mb-0.5 truncate">{ga.loai_ga}</div>
                        <div className="font-bold text-xs md:text-sm text-gray-800 truncate">{ga.ten}</div>
                        <div className="text-[#8B1A1A] font-black text-xs md:text-sm mt-1">
                          {parseInt(ga.gia).toLocaleString('vi-VN')} đ
                        </div>
                        <div className="flex justify-between items-center mt-1">
                          <span className="text-xs text-gray-500 truncate">📍 {ga.khu_vuc}</span>
                          {aiScore && (
                            <span className="text-xs bg-yellow-100 text-yellow-700 px-1.5 py-0.5 rounded-full font-bold flex-shrink-0">
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
            <div className="mt-6 bg-gradient-to-r from-[#8B1A1A] to-red-700 rounded-xl p-5 text-white text-center">
              <div className="font-black text-lg mb-1">🐓 Bạn có gà muốn bán?</div>
              <p className="text-red-200 text-sm mb-3">Đăng bán miễn phí, AI tự động phân tích</p>
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
