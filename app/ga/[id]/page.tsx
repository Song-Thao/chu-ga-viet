'use client';
import { useState } from 'react';
import Link from 'next/link';

const GaData = {
  id: 1,
  ten: 'Gà Tre Đẹp Mẽ Vậy Đỏ',
  gia: '2.500.000',
  loai: 'Gà Tre',
  can_nang: '1.2',
  tuoi: '8',
  khu_vuc: 'TP. Hồ Chí Minh',
  mo_ta: 'Gà tre đẹp, khỏe mạnh, chưa qua đá. Chân vuông, mắt sáng, vảy đỏ đẹp. Thích hợp làm giống hoặc đá độ.',
  nguoi_ban: { ten: 'Chủ Gà Việt', diem: 4.8, so_ban: 24 },
  ai: {
    tong_diem: 7.5,
    mat: { diem: 9, mo_ta: 'Sáng, linh hoạt' },
    chan: { diem: 8, mo_ta: 'Thương chắc' },
    vay: { diem: 7.5, mo_ta: 'Không dữ tốt' },
    dau: { diem: 8, mo_ta: 'Đẹp, sáng bóng' },
  },
  binh_luan: [
    { id: 1, user: 'Anh Tuấn', noi_dung: 'Gà đẹp thật, mắt lửa rõ ràng', time: '2 giờ trước' },
    { id: 2, user: 'Bác Hùng', noi_dung: 'Giá hơi cao so với thị trường', time: '5 giờ trước' },
    { id: 3, user: 'Chú Minh', noi_dung: 'Vảy nhìn ok, chân vuông đẹp', time: '1 ngày trước' },
  ]
};

export default function GaDetailPage() {
  const [anhChinh, setAnhChinh] = useState(0);
  const [comment, setComment] = useState('');
  const [comments, setComments] = useState(GaData.binh_luan);

  const mauNen = ['bg-orange-800', 'bg-gray-700', 'bg-green-800', 'bg-red-900'];

  const addComment = () => {
    if (!comment.trim()) return;
    setComments([{ id: Date.now(), user: 'Bạn', noi_dung: comment, time: 'Vừa xong' }, ...comments]);
    setComment('');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">

      {/* BREADCRUMB */}
      <div className="text-xs text-gray-500 mb-4">
        <Link href="/" className="hover:text-red-800">Trang chủ</Link> &gt;{' '}
        <Link href="/cho" className="hover:text-red-800">Chợ</Link> &gt;{' '}
        <span className="text-gray-800">{GaData.ten}</span>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">

        {/* ẢNH */}
        <div>
          <div className={`${mauNen[anhChinh % mauNen.length]} rounded-xl h-72 flex items-center justify-center text-8xl mb-3`}>
            🐓
          </div>
          <div className="flex gap-2">
            {mauNen.map((mau, i) => (
              <button key={i} onClick={() => setAnhChinh(i)}
                className={`${mau} w-16 h-16 rounded-lg flex items-center justify-center text-2xl border-2 transition ${anhChinh === i ? 'border-yellow-400' : 'border-transparent'}`}>
                🐓
              </button>
            ))}
            <div className="w-16 h-16 rounded-lg bg-gray-200 flex items-center justify-center text-gray-400 text-xs">
              ▶ Video
            </div>
          </div>
        </div>

        {/* THÔNG TIN */}
        <div>
          <h1 className="font-black text-2xl text-gray-800 mb-2">{GaData.ten}</h1>
          <div className="text-[#8B1A1A] font-black text-3xl mb-4">{GaData.gia} đ</div>

          <div className="text-sm text-gray-500 mb-1">Giá thương lượng</div>
          <div className="flex gap-3 mb-4">
            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">{GaData.can_nang} kg</span>
            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">{GaData.tuoi} tháng</span>
            <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-sm">📍 {GaData.khu_vuc}</span>
          </div>

          {/* BUTTONS */}
          <div className="flex gap-3 mb-6">
            <button className="flex-1 bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition">
              🛒 Mua ngay
            </button>
            <button className="flex-1 border-2 border-[#8B1A1A] text-[#8B1A1A] font-bold py-3 rounded-xl hover:bg-red-50 transition">
              💬 Trả giá
            </button>
            <button className="border-2 border-gray-300 text-gray-600 font-bold px-4 py-3 rounded-xl hover:bg-gray-50 transition">
              📞 Liên hệ
            </button>
          </div>

          {/* AI PHÂN TÍCH */}
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-gray-800">🤖 Phân tích AI</h3>
              <div className="text-3xl font-black text-[#8B1A1A]">{GaData.ai.tong_diem}/10</div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              {[
                { label: '👁 Mắt', data: GaData.ai.mat },
                { label: '🦵 Chân', data: GaData.ai.chan },
                { label: '🐾 Vảy', data: GaData.ai.vay },
                { label: '🐓 Đầu', data: GaData.ai.dau },
              ].map(item => (
                <div key={item.label} className="bg-white rounded-lg p-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-600">{item.label}</span>
                    <span className="text-xs font-black text-[#8B1A1A]">{item.data.diem}/10</span>
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">{item.data.mo_ta}</div>
                  <div className="h-1.5 bg-gray-200 rounded-full mt-1">
                    <div className="h-1.5 bg-[#8B1A1A] rounded-full" style={{width: `${item.data.diem * 10}%`}}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">

        {/* MÔ TẢ + BÌNH LUẬN */}
        <div className="md:col-span-2 space-y-4">

          {/* MÔ TẢ */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-black text-gray-800 mb-3">📋 Mô tả</h3>
            <p className="text-gray-600 text-sm leading-relaxed">{GaData.mo_ta}</p>
          </div>

          {/* BÌNH LUẬN */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-black text-gray-800 mb-3">💬 Bình luận ({comments.length})</h3>

            <div className="flex gap-2 mb-4">
              <input value={comment} onChange={e => setComment(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && addComment()}
                placeholder="Nhận xét về con gà này..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
              <button onClick={addComment}
                className="bg-[#8B1A1A] text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-[#6B0F0F] transition">
                Gửi
              </button>
            </div>

            <div className="space-y-3">
              {comments.map(c => (
                <div key={c.id} className="flex gap-3">
                  <div className="w-8 h-8 bg-red-800 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                    {c.user[0]}
                  </div>
                  <div className="flex-1">
                    <div className="flex gap-2 items-center">
                      <span className="font-semibold text-sm text-gray-800">{c.user}</span>
                      <span className="text-xs text-gray-400">{c.time}</span>
                    </div>
                    <div className="text-sm text-gray-600 mt-0.5">{c.noi_dung}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* NGƯỜI BÁN */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-black text-gray-800 mb-3">👤 Người bán</h3>
            <div className="flex items-center gap-3 mb-3">
              <div className="w-12 h-12 bg-[#8B1A1A] rounded-full flex items-center justify-center text-white font-black text-lg">
                {GaData.nguoi_ban.ten[0]}
              </div>
              <div>
                <div className="font-bold text-gray-800">{GaData.nguoi_ban.ten}</div>
                <div className="text-xs text-gray-500">⭐ {GaData.nguoi_ban.diem} • {GaData.nguoi_ban.so_ban} đã bán</div>
              </div>
            </div>
            <button className="w-full border-2 border-[#8B1A1A] text-[#8B1A1A] font-bold py-2 rounded-xl hover:bg-red-50 transition text-sm">
              Xem hồ sơ
            </button>
          </div>

          {/* GỢI Ý */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-black text-gray-800 mb-3">🐓 Gà tương tự</h3>
            {['Gà Tre Xanh', 'Chiến Kê Đỏ', 'Gà Ri Vàng'].map((ten, i) => (
              <Link key={i} href="/cho" className="flex items-center gap-2 py-2 border-b last:border-0 hover:bg-gray-50 -mx-1 px-1 rounded">
                <div className="w-10 h-10 bg-orange-800 rounded-lg flex items-center justify-center text-lg">🐓</div>
                <div>
                  <div className="text-sm font-semibold text-gray-800">{ten}</div>
                  <div className="text-xs text-[#8B1A1A] font-bold">{(i + 2) * 1500000 + 500000} đ</div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
