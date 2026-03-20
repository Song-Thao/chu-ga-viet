'use client';
import { useState } from 'react';
import Link from 'next/link';

const UserData = {
  ten: 'Chủ Gà Việt',
  ma: '#E30613',
  diem: 4.8,
  so_ban: 24,
  so_dang: 12,
  tham_gia: 'Tháng 3, 2024',
  verified: true,
};

const GaDaDang = [
  { id: 1, ten: 'Chiến Kê Xanh', gia: '8.000.000', trang_thai: 'Đang bán', mau: 'bg-green-800' },
  { id: 2, ten: 'Xám Thần', gia: '12.000.000', trang_thai: 'Đã bán', mau: 'bg-gray-700' },
  { id: 3, ten: 'Gà Diều Lửa', gia: '6.500.000', trang_thai: 'Đang bán', mau: 'bg-orange-700' },
  { id: 4, ten: 'Ấu Tia', gia: '10.000.000', trang_thai: 'Đã bán', mau: 'bg-yellow-700' },
];

const DanhGia = [
  { id: 1, user: 'Anh Tuấn', sao: 5, noi_dung: 'Gà đúng mô tả, giao hàng nhanh', time: '2 ngày trước' },
  { id: 2, user: 'Bác Hùng', sao: 4, noi_dung: 'Người bán nhiệt tình, gà khỏe', time: '1 tuần trước' },
  { id: 3, user: 'Chú Minh', sao: 5, noi_dung: 'Tin tưởng, sẽ mua lại', time: '2 tuần trước' },
];

export default function HoSoPage() {
  const [tab, setTab] = useState('dang');

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">

      {/* PROFILE HEADER */}
      <div className="bg-white rounded-xl shadow-sm overflow-hidden mb-4">
        <div className="bg-gradient-to-r from-[#8B1A1A] to-red-700 h-24"></div>
        <div className="px-6 pb-6">
          <div className="flex items-end gap-4 -mt-10 mb-4">
            <div className="w-20 h-20 bg-[#8B1A1A] rounded-full border-4 border-white flex items-center justify-center text-white font-black text-2xl">
              {UserData.ten[0]}
            </div>
            <div className="pb-2">
              <div className="flex items-center gap-2">
                <h1 className="font-black text-xl text-gray-800">{UserData.ten}</h1>
                {UserData.verified && (
                  <span className="bg-blue-100 text-blue-700 text-xs px-2 py-0.5 rounded-full font-semibold">✓ Đã xác minh</span>
                )}
              </div>
              <div className="text-sm text-gray-500">{UserData.ma} • Tham gia {UserData.tham_gia}</div>
            </div>
          </div>

          {/* STATS */}
          <div className="grid grid-cols-3 gap-4 mb-4">
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="font-black text-2xl text-[#8B1A1A]">⭐ {UserData.diem}</div>
              <div className="text-xs text-gray-500 mt-1">Điểm uy tín</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="font-black text-2xl text-[#8B1A1A]">{UserData.so_ban}</div>
              <div className="text-xs text-gray-500 mt-1">Đã bán</div>
            </div>
            <div className="text-center p-3 bg-gray-50 rounded-xl">
              <div className="font-black text-2xl text-[#8B1A1A]">{UserData.so_dang}</div>
              <div className="text-xs text-gray-500 mt-1">Đang đăng</div>
            </div>
          </div>

          {/* BADGES */}
          <div className="flex gap-2 flex-wrap">
            <span className="bg-yellow-100 text-yellow-800 text-xs px-3 py-1 rounded-full font-semibold">🏆 Top Seller</span>
            <span className="bg-green-100 text-green-800 text-xs px-3 py-1 rounded-full font-semibold">✓ Người bán uy tín</span>
            <span className="bg-red-100 text-red-800 text-xs px-3 py-1 rounded-full font-semibold">🐓 Chuyên gia gà</span>
          </div>
        </div>
      </div>

      {/* TABS */}
      <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1 mb-4">
        {[
          { key: 'dang', label: 'Gà đang đăng' },
          { key: 'ban', label: 'Gà đã bán' },
          { key: 'danh_gia', label: 'Đánh giá' },
        ].map(t => (
          <button key={t.key} onClick={() => setTab(t.key)}
            className={`flex-1 py-2 rounded-lg text-sm font-semibold transition ${tab === t.key ? 'bg-[#8B1A1A] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* TAB CONTENT */}
      {(tab === 'dang' || tab === 'ban') && (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {GaDaDang.filter(g => tab === 'dang' ? g.trang_thai === 'Đang bán' : g.trang_thai === 'Đã bán').map(ga => (
            <Link key={ga.id} href={`/ga/${ga.id}`}>
              <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
                <div className={`${ga.mau} h-32 flex items-center justify-center text-4xl relative`}>
                  🐓
                  <span className={`absolute top-2 right-2 text-xs px-2 py-0.5 rounded-full font-semibold ${ga.trang_thai === 'Đang bán' ? 'bg-green-400 text-green-900' : 'bg-gray-400 text-gray-900'}`}>
                    {ga.trang_thai}
                  </span>
                </div>
                <div className="p-3">
                  <div className="font-bold text-sm text-gray-800 truncate">{ga.ten}</div>
                  <div className="text-[#8B1A1A] font-black text-sm mt-1">{ga.gia} đ</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      {tab === 'danh_gia' && (
        <div className="space-y-3">
          {DanhGia.map(dg => (
            <div key={dg.id} className="bg-white rounded-xl p-4 shadow-sm">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-9 h-9 bg-[#8B1A1A] rounded-full flex items-center justify-center text-white font-bold text-sm">
                  {dg.user[0]}
                </div>
                <div>
                  <div className="font-semibold text-sm text-gray-800">{dg.user}</div>
                  <div className="text-yellow-500 text-xs">{'⭐'.repeat(dg.sao)}</div>
                </div>
                <div className="ml-auto text-xs text-gray-400">{dg.time}</div>
              </div>
              <p className="text-sm text-gray-600">{dg.noi_dung}</p>
            </div>
          ))}
        </div>
      )}

      {/* LIÊN HỆ */}
      <div className="mt-4 bg-white rounded-xl p-4 shadow-sm">
        <button className="w-full bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition">
          💬 Nhắn tin người bán
        </button>
      </div>

    </div>
  );
}
