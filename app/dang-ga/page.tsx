'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';

const LoaiGa = ['Gà Tre', 'Gà Ri', 'Gà Đông Tảo', 'Gà Ta', 'Gà Chọi'];
const KhuVuc = ['Hà Nội', 'TP.HCM', 'Đà Nẵng', 'Bình Dương', 'Cần Thơ', 'Đồng Tháp', 'An Giang', 'Long An'];

export default function DangGaPage() {
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const [form, setForm] = useState({
    ten: '', loai: 'Gà Tre', gia: '', can_nang: '', tuoi: '', khu_vuc: 'TP.HCM', mo_ta: ''
  });
  const [submitted, setSubmitted] = useState(false);

  const handleImages = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    files.forEach(file => {
      const reader = new FileReader();
      reader.onload = (ev) => {
        setImages(prev => [...prev, ev.target?.result as string]);
      };
      reader.readAsDataURL(file);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => router.push('/cho'), 2000);
  };

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🐓</div>
          <div className="font-black text-2xl text-gray-800 mb-2">Đăng gà thành công!</div>
          <div className="text-gray-500">AI đang phân tích gà của bạn...</div>
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
            <h2 className="font-bold text-gray-700 mb-3">📸 Ảnh gà</h2>
            <label className="block border-2 border-dashed border-red-300 rounded-xl p-6 text-center cursor-pointer hover:border-red-500 hover:bg-red-50 transition">
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleImages} />
              <div className="text-4xl mb-2">📷</div>
              <div className="text-sm text-gray-500">Kéo thả nhiều ảnh vào đây hoặc click để chọn</div>
              <div className="text-xs text-gray-400 mt-1">Tối đa 6 ảnh</div>
            </label>

            {/* Preview ảnh */}
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
                <div className="text-xs text-gray-500 mt-1">AI tự động phân tích giá trị, chất lượng gà và gợi ý tối ưu bài đăng để bán nhanh hơn.</div>
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
                placeholder="VD: Gà tre đẹp mẽ vậy"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">Loại gà *</label>
              <div className="flex flex-wrap gap-2">
                {LoaiGa.map(lg => (
                  <button type="button" key={lg} onClick={() => setForm({...form, loai: lg})}
                    className={`px-3 py-1 rounded-full text-sm border transition ${form.loai === lg ? 'bg-[#8B1A1A] text-white border-[#8B1A1A]' : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'}`}>
                    {lg}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">Cân nặng (kg)</label>
                <input type="number" step="0.1" value={form.can_nang} onChange={e => setForm({...form, can_nang: e.target.value})}
                  placeholder="1.2"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">Tuổi (tháng)</label>
                <input type="number" value={form.tuoi} onChange={e => setForm({...form, tuoi: e.target.value})}
                  placeholder="6"
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">Giá bán (đ) *</label>
              <input required type="number" value={form.gia} onChange={e => setForm({...form, gia: e.target.value})}
                placeholder="2500000"
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">Khu vực *</label>
              <select value={form.khu_vuc} onChange={e => setForm({...form, khu_vuc: e.target.value})}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
                {KhuVuc.map(kv => <option key={kv}>{kv}</option>)}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">Mô tả chi tiết</label>
              <textarea value={form.mo_ta} onChange={e => setForm({...form, mo_ta: e.target.value})}
                placeholder="Mô tả chi tiết tình trạng, đặc điểm, lý do bán..."
                rows={4}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
            </div>

            <button type="submit"
              className="w-full bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition flex items-center justify-center gap-2">
              🐓 Đăng gà ngay
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
