'use client';
import { useState } from 'react';
import Link from 'next/link';

const GaList = [
  { id: 1, ten: 'Hà Nội Vống Đá Nường', gia: '2.000.000', khu_vuc: 'Hà Nội', loai: 'Gà Tre', diem: 8.5, mau: 'bg-orange-800' },
  { id: 2, ten: 'Bình Vống Kg Nường', gia: '9.000.000', khu_vuc: 'Bình Dương', loai: 'Gà Ri', diem: 9.0, mau: 'bg-gray-800' },
  { id: 3, ten: 'Hà Nội Vống Đá Nường', gia: '13.000.000', khu_vuc: 'Hà Nội', loai: 'Gà Chọi', diem: 7.5, mau: 'bg-red-900' },
  { id: 4, ten: 'Hà Nội Vống Kg Nường', gia: '1.000.000', khu_vuc: 'TP.HCM', loai: 'Gà Tre', diem: 8.0, mau: 'bg-green-900' },
  { id: 5, ten: 'Bình Hơ Vống Đá Nường', gia: '9.000.000', khu_vuc: 'Đà Nẵng', loai: 'Gà Đông Tảo', diem: 8.5, mau: 'bg-yellow-800' },
  { id: 6, ten: 'Hà Nội Vống Đa Nường', gia: '13.000.000', khu_vuc: 'Cần Thơ', loai: 'Gà Chọi', diem: 9.0, mau: 'bg-orange-900' },
];

const KhuVuc = ['Tất cả', 'Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Bình Dương', 'Cần Thơ', 'Đồng Tháp', 'An Giang'];
const LoaiGa = ['Tất cả', 'Gà Tre', 'Gà Ri', 'Gà Đông Tảo', 'Gà Ta', 'Gà Chọi'];

export default function ChoPage() {
  const [khuVuc, setKhuVuc] = useState('Tất cả');
  const [loaiGa, setLoaiGa] = useState('Tất cả');
  const [giaMin, setGiaMin] = useState(500000);
  const [giaMax, setGiaMax] = useState(10000000);
  const [sapXep, setSapXep] = useState('Mới nhất');

  const filtered = GaList.filter(g => {
    const gia = parseInt(g.gia.replace(/\./g, ''));
    return (khuVuc === 'Tất cả' || g.khu_vuc === khuVuc) &&
           (loaiGa === 'Tất cả' || g.loai === loaiGa) &&
           gia >= giaMin && gia <= giaMax;
  });

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">
      <div className="flex gap-4">

        {/* SIDEBAR LỌC */}
        <div className="hidden md:block w-56 flex-shrink-0">
          <div className="bg-white rounded-xl p-4 shadow-sm sticky top-20">
            <h3 className="font-black text-gray-800 mb-4">Lọc kết quả</h3>

            {/* Giá */}
            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-600 mb-2">Mức giá</div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{(giaMin/1000000).toFixed(1)}tr</span>
                <span>{(giaMax/1000000).toFixed(0)}tr</span>
              </div>
              <input type="range" min="500000" max="10000000" step="500000"
                value={giaMax} onChange={e => setGiaMax(Number(e.target.value))}
                className="w-full accent-red-800" />
            </div>

            {/* Khu vực */}
            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-600 mb-2">Khu vực</div>
              {KhuVuc.map(kv => (
                <label key={kv} className="flex items-center gap-2 text-sm py-0.5 cursor-pointer">
                  <input type="radio" name="khuvuc" checked={khuVuc === kv}
                    onChange={() => setKhuVuc(kv)} className="accent-red-800" />
                  {kv}
                </label>
              ))}
            </div>

            {/* Loại gà */}
            <div className="mb-4">
              <div className="text-sm font-semibold text-gray-600 mb-2">Loại gà</div>
              {LoaiGa.map(lg => (
                <label key={lg} className="flex items-center gap-2 text-sm py-0.5 cursor-pointer">
                  <input type="radio" name="loaiga" checked={loaiGa === lg}
                    onChange={() => setLoaiGa(lg)} className="accent-red-800" />
                  {lg}
                </label>
              ))}
            </div>

            <button onClick={() => { setKhuVuc('Tất cả'); setLoaiGa('Tất cả'); setGiaMax(10000000); }}
              className="w-full border border-red-800 text-red-800 rounded-lg py-2 text-sm font-semibold hover:bg-red-50 transition">
              Xóa bộ lọc
            </button>
          </div>
        </div>

        {/* MAIN */}
        <div className="flex-1">

          {/* HEADER */}
          <div className="flex justify-between items-center mb-4">
            <div>
              <h1 className="font-black text-xl text-gray-800">Chợ Gà Việt</h1>
              <p className="text-sm text-gray-500">{filtered.length} kết quả</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Sắp xếp:</span>
              <select value={sapXep} onChange={e => setSapXep(e.target.value)}
                className="border rounded-lg px-3 py-1.5 text-sm">
                <option>Mới nhất</option>
                <option>Giá thấp nhất</option>
                <option>Giá cao nhất</option>
                <option>Điểm AI cao nhất</option>
              </select>
            </div>
          </div>

          {/* MOBILE FILTER */}
          <div className="md:hidden flex gap-2 mb-4 overflow-x-auto pb-2">
            {KhuVuc.slice(1).map(kv => (
              <button key={kv} onClick={() => setKhuVuc(khuVuc === kv ? 'Tất cả' : kv)}
                className={`px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap border transition ${khuVuc === kv ? 'bg-[#8B1A1A] text-white border-[#8B1A1A]' : 'bg-white text-gray-600 border-gray-300'}`}>
                {kv}
              </button>
            ))}
          </div>

          {/* GRID GÀ */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {filtered.map(ga => (
              <Link key={ga.id} href={`/ga/${ga.id}`}>
                <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer">
                  <div className={`${ga.mau} h-40 flex items-center justify-center text-5xl relative`}>
                    🐓
                    <div className="absolute top-2 right-2 bg-white/90 text-gray-800 text-xs font-black px-2 py-0.5 rounded-full">
                      ⭐ {ga.diem}
                    </div>
                  </div>
                  <div className="p-3">
                    <div className="text-xs text-[#8B1A1A] font-semibold mb-1">{ga.loai}</div>
                    <div className="font-bold text-sm text-gray-800 truncate">{ga.ten}</div>
                    <div className="text-[#8B1A1A] font-black mt-1">{ga.gia} đ</div>
                    <div className="flex justify-between items-center mt-2">
                      <span className="text-xs text-gray-500">📍 {ga.khu_vuc}</span>
                      <button className="bg-[#8B1A1A] text-white text-xs px-3 py-1 rounded-full hover:bg-[#6B0F0F] transition">
                        Xem
                      </button>
                    </div>
                  </div>
                </div>
              </Link>
            ))}
          </div>

          {filtered.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-4">🐓</div>
              <div className="font-semibold">Không tìm thấy gà phù hợp</div>
              <div className="text-sm mt-1">Thử thay đổi bộ lọc</div>
            </div>
          )}

          {/* ĐĂNG GÀ CTA */}
          <div className="mt-8 bg-gradient-to-r from-[#8B1A1A] to-red-700 rounded-xl p-6 text-white text-center">
            <div className="font-black text-xl mb-2">🐓 Bạn có gà muốn bán?</div>
            <p className="text-red-200 text-sm mb-4">Đăng bán miễn phí, AI tự động phân tích</p>
            <Link href="/dang-ga" className="bg-yellow-400 text-black font-black px-6 py-2 rounded-full hover:bg-yellow-300 transition inline-block">
              Đăng gà ngay
            </Link>
          </div>

        </div>
      </div>
    </div>
  );
}
