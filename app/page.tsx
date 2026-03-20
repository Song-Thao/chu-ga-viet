import Link from 'next/link';

const GaMoiDang = [
  { id: 1, ten: 'Chiến Kê Xanh', gia: '8.000.000', khu_vuc: 'TP.HCM', diem: 8.5, mau: 'bg-green-800' },
  { id: 2, ten: 'Xám Thần', gia: '12.000.000', khu_vuc: 'Cần Thơ', diem: 9.0, mau: 'bg-gray-700' },
  { id: 3, ten: 'Gà Diều Lửa', gia: '6.500.000', khu_vuc: 'Đồng Tháp', diem: 7.5, mau: 'bg-orange-700' },
  { id: 4, ten: 'Ấu Tia', gia: '10.000.000', khu_vuc: 'An Giang', diem: 8.0, mau: 'bg-yellow-700' },
];

const GaNoiBat = [
  { id: 5, ten: 'Gà Xám Thắng 5 Trận', luot_xem: '15.2K', vip: false },
  { id: 6, ten: 'Gà Thần Kê', luot_xem: '15.2K', vip: true },
  { id: 7, ten: 'Chiến Kê Đỏ Lửa', luot_xem: '15.2K', vip: false },
  { id: 8, ten: 'Gà Vằng Lai', luot_xem: '15.2K', vip: false },
];

const Videos = [
  { id: 1, ten: 'Trận Gà Kinh Điển', luot_xem: '112k', tg: '13:09' },
  { id: 2, ten: 'Đá Gà Xanh Thắng Lớn', luot_xem: '112k', tg: '29:18' },
  { id: 3, ten: 'Gà Điều Chiến Đấu Xác', luot_xem: '112k', tg: '31:38' },
];

export default function HomePage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-4">

      {/* BANNER */}
      <div className="grid grid-cols-3 gap-3 mb-6 rounded-xl overflow-hidden">
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

      {/* SEARCH BAR */}
      <div className="bg-white rounded-xl p-4 mb-6 shadow-sm flex flex-wrap gap-3">
        <select className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[120px]">
          <option>Loại gà</option>
          <option>Gà Tre</option>
          <option>Gà Ri</option>
          <option>Gà Đông Tảo</option>
          <option>Gà Chọi</option>
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[120px]">
          <option>Khu vực</option>
          <option>Hà Nội</option>
          <option>TP.HCM</option>
          <option>Cần Thơ</option>
          <option>Đà Nẵng</option>
        </select>
        <select className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[120px]">
          <option>Mức giá</option>
          <option>Dưới 5 triệu</option>
          <option>5 - 10 triệu</option>
          <option>Trên 10 triệu</option>
        </select>
        <button className="bg-[#8B1A1A] text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-[#6B0F0F] transition">
          Tìm kiếm
        </button>
      </div>

      {/* GÀ MỚI ĐĂNG */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-black text-lg text-gray-800 uppercase tracking-wide">🐓 Gà Mới Đăng</h2>
          <Link href="/cho" className="text-[#8B1A1A] text-sm font-semibold hover:underline">Xem thêm →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {GaMoiDang.map(ga => (
            <Link key={ga.id} href={`/ga/${ga.id}`}>
              <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer">
                <div className={`${ga.mau} h-36 flex items-center justify-center text-5xl`}>🐓</div>
                <div className="p-3">
                  <div className="font-bold text-sm text-gray-800 truncate">{ga.ten}</div>
                  <div className="text-[#8B1A1A] font-black text-sm mt-1">{ga.gia} đ</div>
                  <div className="flex justify-between items-center mt-2">
                    <span className="text-xs text-gray-500">📍 {ga.khu_vuc}</span>
                    <span className="text-xs bg-yellow-100 text-yellow-700 px-2 py-0.5 rounded-full font-bold">⭐ {ga.diem}</span>
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* GÀ NỔI BẬT */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-black text-lg text-gray-800 uppercase tracking-wide">🔥 Gà Nổi Bật</h2>
          <Link href="/cho" className="text-[#8B1A1A] text-sm font-semibold hover:underline">Xem tất cả →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {GaNoiBat.map(ga => (
            <Link key={ga.id} href={`/ga/${ga.id}`}>
              <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer relative">
                {ga.vip && (
                  <div className="absolute top-2 left-2 bg-yellow-400 text-black text-xs font-black px-2 py-0.5 rounded">VIP</div>
                )}
                <div className="bg-gradient-to-br from-orange-800 to-red-900 h-36 flex items-center justify-center text-5xl">🐓</div>
                <div className="p-3">
                  <div className="font-bold text-sm text-gray-800 truncate">{ga.ten}</div>
                  <div className="text-xs text-gray-500 mt-1">👁 {ga.luot_xem} lượt xem</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      </section>

      {/* VIDEO THỰC CHIẾN */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-black text-lg text-gray-800 uppercase tracking-wide">🎬 Video Thực Chiến</h2>
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

      {/* BOTTOM CARDS */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link href="/thu-vien" className="bg-gradient-to-r from-amber-800 to-amber-700 text-white rounded-xl p-5 flex items-center gap-3 hover:opacity-90 transition">
          <div className="text-3xl">📚</div>
          <div>
            <div className="font-black">BÀI VIẾT HƯỚNG DẪN</div>
            <div className="text-xs text-amber-200 mt-1">Kiến thức từ chuyên gia</div>
          </div>
        </Link>
        <Link href="/ho-so/1" className="bg-gradient-to-r from-red-900 to-red-800 text-white rounded-xl p-5 flex items-center gap-3 hover:opacity-90 transition">
          <div className="text-3xl">🏆</div>
          <div>
            <div className="font-black">TOP NGƯỜI BÁN UY TÍN</div>
            <div className="text-xs text-red-200 mt-1">Xếp hạng người bán</div>
          </div>
        </Link>
      </div>

    </div>
  );
}
