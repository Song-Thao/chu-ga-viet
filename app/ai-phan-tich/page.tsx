'use client';
import { useState } from 'react';

export default function AIPhanTichPage() {
  const [image, setImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);

  const LoadingSteps = [
    '🔍 Đang nhận diện gà...',
    '👁 Phân tích mắt...',
    '🦵 Phân tích chân và vảy...',
    '🤖 Tổng hợp kết quả...',
  ];

  const handleImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      setImage(ev.target?.result as string);
      setResult(null);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!image) return;
    setLoading(true);
    setError('');
    setStep(0);

    const interval = setInterval(() => {
      setStep(prev => prev < LoadingSteps.length - 1 ? prev + 1 : prev);
    }, 800);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: image }),
      });
      const data = await res.json();
      setResult(data);
    } catch (err) {
      setError('Lỗi kết nối. Vui lòng thử lại!');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const getDiemMau = (diem: number) => {
    if (diem >= 8.5) return 'text-green-600';
    if (diem >= 7) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getBarMau = (diem: number) => {
    if (diem >= 8.5) return 'bg-green-500';
    if (diem >= 7) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#8B1A1A] to-red-700 text-white rounded-xl p-6 mb-6 text-center">
        <div className="text-4xl mb-2">🤖</div>
        <h1 className="font-black text-2xl mb-1">AI Tướng Gà</h1>
        <p className="text-red-200 text-sm">Upload ảnh gà — AI phân tích tướng số trong vài giây</p>
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* UPLOAD */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-bold text-gray-700 mb-3">📸 Upload ảnh gà</h2>

            <label className="block border-2 border-dashed border-red-300 rounded-xl cursor-pointer hover:border-red-500 hover:bg-red-50 transition overflow-hidden">
              <input type="file" accept="image/*" className="hidden" onChange={handleImage} />
              {image ? (
                <img src={image} alt="Gà" className="w-full h-56 object-cover" />
              ) : (
                <div className="h-56 flex flex-col items-center justify-center text-gray-400">
                  <div className="text-5xl mb-3">📷</div>
                  <div className="text-sm font-semibold">Thả file vào đây hoặc nhấp để chọn ảnh gà</div>
                  <div className="text-xs mt-1">JPG, PNG tối đa 10MB</div>
                </div>
              )}
            </label>

            {image && !loading && (
              <button onClick={handleAnalyze}
                className="w-full mt-3 bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition">
                🤖 Phân tích ngay
              </button>
            )}

            {image && (
              <button onClick={() => { setImage(null); setResult(null); setError(''); }}
                className="w-full mt-2 border-2 border-gray-300 text-gray-600 font-semibold py-2 rounded-xl hover:bg-gray-50 transition text-sm">
                🔄 Upload ảnh khác
              </button>
            )}

            {error && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                {error}
              </div>
            )}
          </div>

          {/* HƯỚNG DẪN */}
          {!image && (
            <div className="bg-white rounded-xl p-4 shadow-sm">
              <h3 className="font-bold text-gray-700 mb-3">💡 Để có kết quả tốt nhất</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li className="flex gap-2">✅ <span>Chụp rõ mặt, chân, thân gà</span></li>
                <li className="flex gap-2">✅ <span>Ánh sáng đủ sáng</span></li>
                <li className="flex gap-2">✅ <span>Gà đứng tự nhiên</span></li>
                <li className="flex gap-2">❌ <span>Tránh ảnh mờ, tối</span></li>
                <li className="flex gap-2">❌ <span>Tránh ảnh từ xa quá</span></li>
              </ul>
            </div>
          )}
        </div>

        {/* KẾT QUẢ */}
        <div>
          {/* LOADING */}
          {loading && (
            <div className="bg-white rounded-xl p-6 shadow-sm text-center">
              <div className="w-16 h-16 border-4 border-[#8B1A1A] border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
              <div className="font-bold text-gray-800 mb-2">{LoadingSteps[step]}</div>
              <div className="flex gap-1 justify-center mt-3">
                {LoadingSteps.map((_, i) => (
                  <div key={i} className={`h-1.5 w-8 rounded-full transition ${i <= step ? 'bg-[#8B1A1A]' : 'bg-gray-200'}`}></div>
                ))}
              </div>
            </div>
          )}

          {/* KẾT QUẢ */}
          {result && !loading && (
            <div className="space-y-4">

              {/* TỔNG ĐIỂM */}
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-2">
                  <h3 className="font-black text-gray-800">🤖 Kết quả AI</h3>
                  <div className={`text-4xl font-black ${getDiemMau(result.tong_diem)}`}>
                    {result.tong_diem}
                  </div>
                </div>
                <div className="flex gap-1 mb-3">
                  {[1,2,3,4,5].map(i => (
                    <div key={i} className={`h-2 flex-1 rounded-full ${i <= Math.round(result.tong_diem/2) ? 'bg-yellow-400' : 'bg-gray-200'}`}></div>
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed">{result.nhan_xet}</p>
              </div>

              {/* CHI TIẾT */}
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <h3 className="font-black text-gray-800 mb-3">📊 Phân tích chi tiết</h3>
                <div className="space-y-3">
                  {result.chi_tiet?.map((ct: any) => (
                    <div key={ct.phan}>
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-sm font-semibold text-gray-700">{ct.phan}</span>
                        <span className={`text-sm font-black ${getDiemMau(ct.diem)}`}>{ct.diem}/10</span>
                      </div>
                      <div className="h-2 bg-gray-200 rounded-full mb-1">
                        <div className={`h-2 ${getBarMau(ct.diem)} rounded-full`} style={{width: `${ct.diem * 10}%`}}></div>
                      </div>
                      <div className="text-xs text-gray-500">{ct.mo_ta}</div>
                    </div>
                  ))}
                </div>
              </div>

              {/* GIÁ ĐỀ XUẤT */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
                <div className="font-bold text-gray-800 mb-1">💰 Giá đề xuất</div>
                <div className="text-2xl font-black text-[#8B1A1A]">{result.gia_de_xuat} đ</div>
                <div className="text-xs text-gray-500 mt-1">*Dựa trên phân tích AI, giá thực tế có thể khác</div>
              </div>

              {/* BUTTONS */}
              <div className="flex gap-3">
                <a href="/dang-ga" className="flex-1 bg-[#8B1A1A] text-white font-bold py-3 rounded-xl hover:bg-[#6B0F0F] transition text-sm text-center">
                  📋 Đăng bán với kết quả này
                </a>
                <button className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 transition text-sm">
                  💾 Lưu kết quả
                </button>
              </div>
            </div>
          )}

          {/* PLACEHOLDER */}
          {!image && !loading && !result && (
            <div className="bg-white rounded-xl p-6 shadow-sm text-center text-gray-400 h-64 flex flex-col items-center justify-center">
              <div className="text-5xl mb-3">🐓</div>
              <div className="font-semibold">Upload ảnh gà để bắt đầu phân tích</div>
              <div className="text-sm mt-1">AI sẽ đánh giá tướng số trong vài giây</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
