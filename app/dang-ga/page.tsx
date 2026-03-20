'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabase';

const LoaiGa = [
  'Gà Tre', 'Gà Ri', 'Gà Đông Tảo', 'Gà Ta', 'Gà Chọi',
  'Gà Nòi', 'Gà Mã', 'Gà Peru', 'Gà Thái', 'Gà Mỹ',
  'Gà Tây', 'Gà Lôi', 'Gà Rừng', 'Khác'
];

const KhuVuc = [
  // Miền Nam
  'TP.HCM', 'Bình Dương', 'Đồng Nai', 'Bà Rịa - Vũng Tàu', 'Long An',
  'Tiền Giang', 'Bến Tre', 'Trà Vinh', 'Vĩnh Long', 'Đồng Tháp',
  'An Giang', 'Kiên Giang', 'Cần Thơ', 'Hậu Giang', 'Sóc Trăng',
  'Bạc Liêu', 'Cà Mau', 'Tây Ninh', 'Bình Phước',
  // Miền Trung
  'Đà Nẵng', 'Quảng Nam', 'Quảng Ngãi', 'Bình Định', 'Phú Yên',
  'Khánh Hòa', 'Ninh Thuận', 'Bình Thuận', 'Huế', 'Quảng Trị',
  'Quảng Bình', 'Hà Tĩnh', 'Nghệ An', 'Thanh Hóa',
  // Tây Nguyên
  'Đắk Lắk', 'Đắk Nông', 'Gia Lai', 'Kon Tum', 'Lâm Đồng',
  // Miền Bắc
  'Hà Nội', 'Hải Phòng', 'Hải Dương', 'Hưng Yên', 'Thái Bình',
  'Nam Định', 'Ninh Bình', 'Bắc Ninh', 'Vĩnh Phúc', 'Phú Thọ',
  'Thái Nguyên', 'Bắc Giang', 'Lạng Sơn', 'Quảng Ninh',
];

export default function DangGaPage() {
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const [loaiTuy, setLoaiTuy] = useState(false);
  const [form, setForm] = useState({
    ten: '', loai_ga: 'Gà Tre', loai_tu_nhap: '',
    gia: '', can_nang: '', tuoi: '', khu_vuc: 'TP.HCM', mo_ta: ''
  });
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState('');

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.slice(0, 6 - images.length).forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages(prev => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }

      const loaiFinal = loaiTuy ? form.loai_tu_nhap : form.loai_ga;

      const res = await fetch('/api/ga', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          user_id: user.id,
          ten: form.ten,
          loai_ga: loaiFinal,
          gia: form.gia,
          can_nang: form.can_nang,
          tuoi: form.tuoi,
          khu_vuc: form.khu_vuc,
          mo_ta: form.mo_ta,
          images,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);

      setSubmitted(true);
      setTimeout(() => router.push('/cho'), 2000);
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại');
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🐓</div>
          <div className="font-black text-2xl text-gray-800 mb-2">Đăng gà thành công!</div>
          <div className="text-gray-500">Đang chuyển về trang chợ...</div>
          <div className="mt-4 w-8 h-8 border-4 border-[#8B1A1A] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="font-black text-2xl text-gray-800 mb-6">Đăng bán gà</h1>

      <div className="grid md:grid-cols-2 gap-6">

        {/* UPLOAD ẢNH */}
        <div>
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <h2 className="font-bold text-gray-700 mb-3">📸 Ảnh gà ({images.length}/6)</h2>
            <label className="block border-2 border-dashed border-red-300 rounded-xl p-6 text-center cursor-pointer hover:border-red-500 hover:bg-red-50 transition">
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleImages} />
              <div className="text-4xl mb-2">📷</div>
              <div className="text-sm text-gray-500">Kéo thả hoặc click để chọn ảnh</div>
              <div className="text-xs text-gray-400 mt-1">Tối đa 6 ảnh</div>
            </label>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {images.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img} alt="" className="w-full h-24 object-cover rounded-lg" />
                    <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">
                      ×
                    </button>
                    {i === 0 && <div className="absolute bottom-1 left-1 bg-yellow-400 text-black text-xs px-1 rounded">Chính</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* AI NOTICE */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🤖</div>
              <div>
                <div className="font-bold text-gray-800 text-sm">AI sẽ phân tích sau khi đăng</div>
                <div className="text-xs text-gray-500 mt-1">AI tự động phân tích giá trị, chất lượng gà và gợi ý tối ưu bài đăng.</div>
              </div>
            </div>
          </div>
        </div>

        {/* FORM */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-4">📝 Thông tin gà</h2>
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">Tên gà *</label>
              <input required value={form.ten} onChange={e => setForm({...form, ten: e.target.value})}
                placeholder="VD: Chiến Kê Xanh, Gà Tre Đỏ Lửa..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            </div>

            {/* LOẠI GÀ */}
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">Loại gà *</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {LoaiGa.map(lg => (
                  <button type="button" key={lg}
                    onClick={() => {
                      if (lg === 'Khác') { setLoaiTuy(true); }
                      else { setLoaiTuy(false); setForm({...form, loai_ga: lg}); }
                    }}
                    className={`px-3 py-1 rounded-full text-xs border transition ${
                      (!loaiTuy && form.loai_ga === lg) || (loaiTuy && lg === 'Khác')
                        ? 'bg-[#8B1A1A] text-white border-[#8B1A1A]'
                        : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'
                    }`}>
                    {lg}
                  </button>
                ))}
              </div>
              {loaiTuy && (
                <input value={form.loai_tu_nhap} onChange={e => setForm({...form, loai_tu_nhap: e.target.value})}
                  placeholder="Nhập loại gà cụ thể..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">Cân nặng (kg)</label>
                <input type="number" step="0.1" value={form.can_nang}
                  onChange={e => setForm({...form, can_nang: e.target.value})}
                  placeholder="1.2"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">Tuổi (tháng)</label>
                <input type="number" value={form.tuoi}
                  onChange={e => setForm({...form, tuoi: e.target.value})}
                  placeholder="6"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">Giá bán (đ) *</label>
              <input required type="number" value={form.gia}
                onChange={e => setForm({...form, gia: e.target.value})}
                placeholder="2500000"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            </div>

            {/* KHU VỰC */}
            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">Khu vực *</label>
              <select value={form.khu_vuc} onChange={e => setForm({...form, khu_vuc: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
                <optgroup label="🌴 Miền Nam">
                  {KhuVuc.slice(0, 19).map(kv => <option key={kv}>{kv}</option>)}
                </optgroup>
                <optgroup label="🏖 Miền Trung">
                  {KhuVuc.slice(19, 33).map(kv => <option key={kv}>{kv}</option>)}
                </optgroup>
                <optgroup label="🌿 Tây Nguyên">
                  {KhuVuc.slice(33, 38).map(kv => <option key={kv}>{kv}</option>)}
                </optgroup>
                <optgroup label="❄️ Miền Bắc">
                  {KhuVuc.slice(38).map(kv => <option key={kv}>{kv}</option>)}
                </optgroup>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">Mô tả chi tiết</label>
              <textarea value={form.mo_ta} onChange={e => setForm({...form, mo_ta: e.target.value})}
                placeholder="Mô tả chi tiết tình trạng, đặc điểm nổi bật, lý do bán..."
                rows={4}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>
            )}

            <button type="submit" disabled={loading}
              className="w-full bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition disabled:opacity-50 flex items-center justify-center gap-2">
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                  Đang đăng...
                </>
              ) : '🐓 Đăng gà ngay'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
