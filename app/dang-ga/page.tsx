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
  'TP.HCM', 'Bình Dương', 'Đồng Nai', 'Bà Rịa - Vũng Tàu', 'Long An',
  'Tiền Giang', 'Bến Tre', 'Trà Vinh', 'Vĩnh Long', 'Đồng Tháp',
  'An Giang', 'Kiên Giang', 'Cần Thơ', 'Hậu Giang', 'Sóc Trăng',
  'Bạc Liêu', 'Cà Mau', 'Tây Ninh', 'Bình Phước',
  'Đà Nẵng', 'Quảng Nam', 'Quảng Ngãi', 'Bình Định', 'Phú Yên',
  'Khánh Hòa', 'Ninh Thuận', 'Bình Thuận', 'Huế', 'Quảng Trị',
  'Quảng Bình', 'Hà Tĩnh', 'Nghệ An', 'Thanh Hóa',
  'Đắk Lắk', 'Đắk Nông', 'Gia Lai', 'Kon Tum', 'Lâm Đồng',
  'Hà Nội', 'Hải Phòng', 'Hải Dương', 'Hưng Yên', 'Thái Bình',
  'Nam Định', 'Ninh Bình', 'Bắc Ninh', 'Vĩnh Phúc', 'Phú Thọ',
  'Thái Nguyên', 'Bắc Giang', 'Lạng Sơn', 'Quảng Ninh',
];

// ── Helper: lấy YouTube ID từ link ───────────────────────────
function getYoutubeId(url: string): string | null {
  if (!url) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ── Helper: lấy thumbnail từ link video ──────────────────────
function getVideoThumb(url: string): string | null {
  const ytId = getYoutubeId(url);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`;
  return null;
}

// ── Helper: kiểm tra link video hợp lệ ──────────────────────
function isValidVideoUrl(url: string): boolean {
  if (!url) return false;
  return !!(
    url.match(/youtube\.com/) ||
    url.match(/youtu\.be/) ||
    url.match(/facebook\.com\/.*\/videos/) ||
    url.match(/fb\.watch/) ||
    url.match(/tiktok\.com/)
  );
}

type Step = 'form' | 'uploading' | 'ai_analyzing' | 'done';

export default function DangGaPage() {
  const router = useRouter();
  const [images, setImages] = useState<string[]>([]);
  const [videoUrl, setVideoUrl] = useState('');
  const [videoError, setVideoError] = useState('');
  const [loaiTuy, setLoaiTuy] = useState(false);
  const [form, setForm] = useState({
    ten: '', loai_ga: 'Gà Tre', loai_tu_nhap: '',
    gia: '', can_nang: '', tuoi: '', khu_vuc: 'TP.HCM', mo_ta: ''
  });
  const [step, setStep] = useState<Step>('form');
  const [error, setError] = useState('');
  const [aiResult, setAiResult] = useState<any>(null);
  const [gaId, setGaId] = useState<number | null>(null);

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

  const handleVideoUrl = (val: string) => {
    setVideoUrl(val);
    if (val && !isValidVideoUrl(val)) {
      setVideoError('Link không hợp lệ. Hỗ trợ: YouTube, Facebook, TikTok');
    } else {
      setVideoError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setStep('uploading');

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push('/login'); return; }

      const loaiFinal = loaiTuy ? form.loai_tu_nhap : form.loai_ga;

      // Lấy JWT token để truyền vào API (pass RLS)
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      // 1. Lưu gà vào database (thêm video_url)
      const res = await fetch('/api/ga', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          user_id: user.id,
          ten: form.ten,
          loai_ga: loaiFinal,
          gia: form.gia,
          can_nang: form.can_nang,
          tuoi: form.tuoi,
          khu_vuc: form.khu_vuc,
          mo_ta: form.mo_ta,
          video_url: videoUrl.trim() || null,
          images,
        }),
      });

      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setGaId(data.ga_id);

      // 2. Nếu có ảnh → chạy AI phân tích
      if (images.length > 0) {
        setStep('ai_analyzing');

        const aiRes = await fetch('/api/analyze', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ images }),
        });

        const aiData = await aiRes.json();

        if (!aiData.error) {
          setAiResult(aiData);
          await supabase.from('ai_analysis').insert({
            ga_id: data.ga_id,
            total_score: aiData.tong_diem,
            nhan_xet: aiData.nhan_xet_tong || aiData.nhan_xet,
            mat_score: null, chan_score: null, vay_score: null, dau_score: null,
          });
        }
      }

      setStep('done');
    } catch (err: any) {
      setError(err.message || 'Có lỗi xảy ra, vui lòng thử lại');
      setStep('form');
    }
  };

  // ── LOADING ──────────────────────────────────────────────────
  if (step === 'uploading') {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4 animate-bounce">🐓</div>
          <div className="font-black text-xl text-gray-800 mb-2">Đang lưu thông tin gà...</div>
          <div className="w-8 h-8 border-4 border-[#8B1A1A] border-t-transparent rounded-full animate-spin mx-auto mt-4"></div>
        </div>
      </div>
    );
  }

  if (step === 'ai_analyzing') {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <div className="text-center max-w-sm">
          <div className="text-6xl mb-4">🤖</div>
          <div className="font-black text-xl text-gray-800 mb-2">AI đang phân tích gà...</div>
          <div className="text-gray-500 text-sm mb-4">Sư kê ảo đang xem tướng số con gà của bạn</div>
          <div className="w-8 h-8 border-4 border-[#8B1A1A] border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </div>
    );
  }

  // ── DONE ─────────────────────────────────────────────────────
  if (step === 'done') {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center px-4">
        <div className="bg-white rounded-2xl shadow-sm w-full max-w-lg p-6">
          <div className="text-center mb-6">
            <div className="text-5xl mb-3">🎉</div>
            <h2 className="font-black text-2xl text-gray-800 mb-1">Đăng gà thành công!</h2>
            <p className="text-gray-500 text-sm">Bài đăng của bạn đã được lưu vào chợ</p>
          </div>

          {aiResult ? (
            <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4 mb-4">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">🤖</span>
                <span className="font-black text-gray-800">Kết quả AI phân tích</span>
                <span className={`ml-auto text-2xl font-black ${aiResult.tong_diem >= 8 ? 'text-green-600' : aiResult.tong_diem >= 6.5 ? 'text-yellow-600' : 'text-red-500'}`}>
                  {aiResult.tong_diem}/10
                </span>
              </div>
              {aiResult.vay_ket_luan && (
                <div className="bg-white rounded-lg p-2 mb-2 text-sm">
                  <span className="font-semibold">🐾 Vảy: </span>{aiResult.vay_ket_luan}
                </div>
              )}
              {aiResult.nhan_xet_tong && (
                <p className="text-sm text-gray-600 leading-relaxed">{aiResult.nhan_xet_tong}</p>
              )}
              <div className="mt-2 bg-yellow-50 rounded-lg p-2">
                <span className="text-xs font-bold text-gray-500">💰 Giá tham khảo: </span>
                <span className="text-sm font-black text-[#8B1A1A]">{aiResult.gia_de_xuat} đ</span>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-4 text-center text-gray-400 text-sm">
              Không có ảnh nên bỏ qua phân tích AI
            </div>
          )}

          <div className="flex gap-3">
            <button onClick={() => router.push('/cho')}
              className="flex-1 bg-[#8B1A1A] text-white font-bold py-3 rounded-xl hover:bg-[#6B0F0F] transition text-sm">
              🛒 Xem trong chợ
            </button>
            <button onClick={() => {
              setStep('form'); setImages([]); setAiResult(null); setVideoUrl('');
              setForm({ ten: '', loai_ga: 'Gà Tre', loai_tu_nhap: '', gia: '', can_nang: '', tuoi: '', khu_vuc: 'TP.HCM', mo_ta: '' });
            }} className="flex-1 border border-gray-300 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 transition text-sm">
              ➕ Đăng gà khác
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── FORM ─────────────────────────────────────────────────────
  const videoThumb = videoUrl && !videoError ? getVideoThumb(videoUrl) : null;
  const ytId = videoUrl ? getYoutubeId(videoUrl) : null;

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <h1 className="font-black text-2xl text-gray-800 mb-6">Đăng bán gà</h1>

      <div className="grid md:grid-cols-2 gap-6">

        {/* CỘT TRÁI — Ảnh + Video */}
        <div>
          {/* UPLOAD ẢNH */}
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <h2 className="font-bold text-gray-700 mb-3">📸 Ảnh gà ({images.length}/6)</h2>
            <label className="block border-2 border-dashed border-red-300 rounded-xl p-6 text-center cursor-pointer hover:border-red-500 hover:bg-red-50 transition">
              <input type="file" multiple accept="image/*" className="hidden" onChange={handleImages} />
              <div className="text-4xl mb-2">📷</div>
              <div className="text-sm text-gray-500">Kéo thả hoặc click để chọn ảnh</div>
              <div className="text-xs text-gray-400 mt-1">Tối đa 6 ảnh • AI sẽ phân tích sau khi đăng</div>
            </label>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-2 mt-3">
                {images.map((img, i) => (
                  <div key={i} className="relative">
                    <img src={img} alt="" className="w-full h-24 object-cover rounded-lg" />
                    <button onClick={() => setImages(prev => prev.filter((_, j) => j !== i))}
                      className="absolute top-1 right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs flex items-center justify-center">×</button>
                    {i === 0 && <div className="absolute bottom-1 left-1 bg-yellow-400 text-black text-xs px-1 rounded">Chính</div>}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* VIDEO URL */}
          <div className="bg-white rounded-xl p-4 shadow-sm mb-4">
            <h2 className="font-bold text-gray-700 mb-3">🎬 Video gà (không bắt buộc)</h2>
            <input
              type="url"
              value={videoUrl}
              onChange={e => handleVideoUrl(e.target.value)}
              placeholder="Dán link YouTube, Facebook, TikTok..."
              className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 ${videoError ? 'border-red-400' : 'border-gray-300'}`}
            />
            {videoError && <p className="text-xs text-red-500 mt-1">{videoError}</p>}
            <p className="text-xs text-gray-400 mt-1">Hỗ trợ: YouTube, Facebook Video, TikTok</p>

            {/* Preview thumbnail */}
            {videoUrl && !videoError && (
              <div className="mt-3 relative rounded-lg overflow-hidden bg-black" style={{ paddingBottom: '56.25%' }}>
                {videoThumb ? (
                  <>
                    <img src={videoThumb} alt="Video thumbnail"
                      className="absolute inset-0 w-full h-full object-cover" />
                    <div className="absolute inset-0 flex items-center justify-center">
                      <div className="bg-black/60 rounded-full w-12 h-12 flex items-center justify-center">
                        <span className="text-white text-xl ml-1">▶</span>
                      </div>
                    </div>
                    <div className="absolute bottom-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
                      ✅ Video hợp lệ
                    </div>
                  </>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900">
                    <div className="text-center text-white">
                      <div className="text-3xl mb-1">🎬</div>
                      <div className="text-xs text-gray-300">Video đã được thêm</div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* AI NOTICE */}
          <div className="bg-gradient-to-r from-red-50 to-orange-50 border border-red-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="text-2xl">🤖</div>
              <div>
                <div className="font-bold text-gray-800 text-sm">AI sẽ phân tích sau khi đăng</div>
                <div className="text-xs text-gray-500 mt-1">
                  {images.length > 0
                    ? `✅ Có ${images.length} ảnh — AI sẽ phân tích vảy, tướng số và gợi ý giá`
                    : '⚠️ Thêm ảnh để AI phân tích chính xác hơn'}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI — Form thông tin */}
        <div className="bg-white rounded-xl p-4 shadow-sm">
          <h2 className="font-bold text-gray-700 mb-4">📝 Thông tin gà</h2>
          <form onSubmit={handleSubmit} className="space-y-4">

            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">Tên gà *</label>
              <input required value={form.ten} onChange={e => setForm({ ...form, ten: e.target.value })}
                placeholder="VD: Chiến Kê Xanh, Gà Tre Đỏ Lửa..."
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">Loại gà *</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {LoaiGa.map(lg => (
                  <button type="button" key={lg}
                    onClick={() => { if (lg === 'Khác') setLoaiTuy(true); else { setLoaiTuy(false); setForm({ ...form, loai_ga: lg }); } }}
                    className={`px-3 py-1 rounded-full text-xs border transition ${(!loaiTuy && form.loai_ga === lg) || (loaiTuy && lg === 'Khác') ? 'bg-[#8B1A1A] text-white border-[#8B1A1A]' : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'}`}>
                    {lg}
                  </button>
                ))}
              </div>
              {loaiTuy && (
                <input value={form.loai_tu_nhap} onChange={e => setForm({ ...form, loai_tu_nhap: e.target.value })}
                  placeholder="Nhập loại gà cụ thể..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">Cân nặng (kg)</label>
                <input type="number" step="0.1" value={form.can_nang} onChange={e => setForm({ ...form, can_nang: e.target.value })}
                  placeholder="1.2" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
              </div>
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">Tuổi (tháng)</label>
                <input type="number" value={form.tuoi} onChange={e => setForm({ ...form, tuoi: e.target.value })}
                  placeholder="6" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
              </div>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">Giá bán (đ) *</label>
              <input required type="number" value={form.gia} onChange={e => setForm({ ...form, gia: e.target.value })}
                placeholder="2500000" className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">Khu vực *</label>
              <select value={form.khu_vuc} onChange={e => setForm({ ...form, khu_vuc: e.target.value })}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
                <optgroup label="🌴 Miền Nam">{KhuVuc.slice(0, 19).map(kv => <option key={kv}>{kv}</option>)}</optgroup>
                <optgroup label="🏖 Miền Trung">{KhuVuc.slice(19, 33).map(kv => <option key={kv}>{kv}</option>)}</optgroup>
                <optgroup label="🌿 Tây Nguyên">{KhuVuc.slice(33, 38).map(kv => <option key={kv}>{kv}</option>)}</optgroup>
                <optgroup label="❄️ Miền Bắc">{KhuVuc.slice(38).map(kv => <option key={kv}>{kv}</option>)}</optgroup>
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-600 block mb-1">Mô tả chi tiết</label>
              <textarea value={form.mo_ta} onChange={e => setForm({ ...form, mo_ta: e.target.value })}
                placeholder="Mô tả tình trạng, đặc điểm nổi bật, lý do bán..." rows={4}
                className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
            </div>

            {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>}

            <button type="submit"
              className="w-full bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition flex items-center justify-center gap-2">
              🐓 Đăng gà ngay {images.length > 0 && '+ AI phân tích'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
