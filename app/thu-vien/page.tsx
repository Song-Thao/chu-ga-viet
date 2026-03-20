'use client';
import { useState } from 'react';

const BaiViet = [
  { id: 1, title: 'Cách xem tướng gà chọi chuẩn nhất', mo_ta: 'Hướng dẫn cách xem tướng gà chọi chính xác nhất', danh_muc: 'Xem tướng gà', doc: '5 phút' },
  { id: 2, title: 'Ký thuật nuôi gà chọi khỏe mạnh', mo_ta: 'Bộ quyết nuôi gà chọi khỏe mạnh, đạt bình tốt', danh_muc: 'Ký thuật nuôi', doc: '8 phút' },
  { id: 3, title: 'Cách xem vảy gà quý hiếm', mo_ta: 'Những loại vảy gà quý và cách nhận biết', danh_muc: 'Xem tướng gà', doc: '6 phút' },
  { id: 4, title: 'Chế độ dinh dưỡng cho gà chiến', mo_ta: 'Thực đơn tối ưu cho gà chiến trước và sau đá', danh_muc: 'Ký thuật nuôi', doc: '10 phút' },
  { id: 5, title: 'Trận đá gà kinh điển miền Tây', mo_ta: 'Video thực chiến đáng xem nhất năm 2024', danh_muc: 'Video thực chiến', doc: '13 phút' },
  { id: 6, title: 'Bí quyết luyện gà tăng sức bền', mo_ta: 'Phương pháp luyện tập giúp gà bền bỉ hơn', danh_muc: 'Ký thuật nuôi', doc: '7 phút' },
];

const DanhMuc = ['Tất cả', 'Xem tướng gà', 'Ký thuật nuôi', 'Video thực chiến', 'Tài liệu quý'];

export default function ThuVienPage() {
  const [danhMuc, setDanhMuc] = useState('Tất cả');
  const [search, setSearch] = useState('');

  const filtered = BaiViet.filter(b =>
    (danhMuc === 'Tất cả' || b.danh_muc === danhMuc) &&
    (b.title.toLowerCase().includes(search.toLowerCase()) || b.mo_ta.toLowerCase().includes(search.toLowerCase()))
  );

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#8B1A1A] to-red-700 text-white rounded-xl p-6 mb-6">
        <h1 className="font-black text-2xl mb-1">📚 Thư Viện Kiến Thức</h1>
        <p className="text-red-200 text-sm">Nội dung chia sẻ kiến thức về gà chọi và chăm sóc</p>
      </div>

      {/* SEARCH */}
      <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
        <input value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Tìm kiếm bài viết..."
          className="w-full border rounded-lg px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
      </div>

      {/* DANH MỤC */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-1">
        {DanhMuc.map(dm => (
          <button key={dm} onClick={() => setDanhMuc(dm)}
            className={`px-4 py-2 rounded-full text-sm font-semibold whitespace-nowrap border transition ${danhMuc === dm ? 'bg-[#8B1A1A] text-white border-[#8B1A1A]' : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'}`}>
            {dm}
          </button>
        ))}
      </div>

      {/* GRID BÀI VIẾT */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filtered.map(bv => (
          <div key={bv.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer">
            <div className="bg-gradient-to-br from-gray-700 to-gray-900 h-36 flex items-center justify-center">
              {bv.danh_muc === 'Video thực chiến'
                ? <div className="w-14 h-14 bg-white/20 rounded-full flex items-center justify-center text-white text-2xl">▶</div>
                : <div className="text-5xl">🐓</div>
              }
            </div>
            <div className="p-4">
              <span className="text-xs bg-red-100 text-red-800 px-2 py-0.5 rounded-full font-semibold">{bv.danh_muc}</span>
              <h3 className="font-bold text-gray-800 mt-2 mb-1">{bv.title}</h3>
              <p className="text-sm text-gray-500 line-clamp-2">{bv.mo_ta}</p>
              <div className="flex justify-between items-center mt-3">
                <span className="text-xs text-gray-400">⏱ {bv.doc} đọc</span>
                <button className="text-[#8B1A1A] text-sm font-semibold hover:underline">Đọc ngay →</button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {filtered.length === 0 && (
        <div className="text-center py-16 text-gray-400">
          <div className="text-5xl mb-3">📚</div>
          <div className="font-semibold">Không tìm thấy bài viết</div>
        </div>
      )}
    </div>
  );
}
