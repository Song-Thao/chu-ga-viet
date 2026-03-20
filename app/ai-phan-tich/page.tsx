'use client';
import { useState, useEffect, useRef } from 'react';

export default function AIPhanTichPage() {
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);

  const LoadingSteps = [
    '🔍 Sư kê đang quan sát gà...',
    '👁 Phân tích mắt, chân, vảy...',
    '🐾 Tra cứu tướng số...',
    '📋 Viết nhận định...',
  ];

  const handleImage = (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const newImages = [...images];
      newImages[index] = ev.target?.result as string;
      setImages(newImages);
      setResult(null);
      setError('');
    };
    reader.readAsDataURL(file);
  };

  const stopSpeech = () => {
    window.speechSynthesis?.cancel();
    setSpeaking(false);
  };

  const speakResult = (r: any) => {
    if (!r || !window.speechSynthesis) return;
    stopSpeech();

    const text = `
      Kết quả phân tích gà. Điểm tổng: ${r.tong_diem} trên 10. Độ tin cậy: ${r.do_tin_cay} phần trăm.
      Nhận diện: ${r.nhan_dien}.
      Phân tích vảy: ${r.phan_tich_vay}.
      Nhận định: ${r.nhan_dinh}.
      Lối đá: ${r.loi_da}.
      Cảnh báo: ${r.canh_bao}.
      Giá đề xuất: ${r.gia_de_xuat} đồng. ${r.ly_do_gia}
    `.trim();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VI'));
    if (viVoice) utterance.voice = viVoice;
    utterance.lang = 'vi-VN';
    utterance.rate = 0.9;
    utterance.pitch = 0.95;
    utterance.volume = 1;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const uploadedCount = images.filter(Boolean).length;

  const handleAnalyze = async () => {
    const firstImage = images.find(Boolean);
    if (!firstImage) return;
    setLoading(true);
    setError('');
    setStep(0);
    stopSpeech();

    const interval = setInterval(() => {
      setStep(prev => prev < LoadingSteps.length - 1 ? prev + 1 : prev);
    }, 900);

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64: firstImage }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      // Tự động đọc nếu voice đang bật
      if (voiceOn) {
        setTimeout(() => speakResult(data), 500);
      }
    } catch (err: any) {
      setError('Lỗi phân tích. Vui lòng thử lại!');
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

  const labels = ['Ảnh mặt gà', 'Ảnh chân + vảy', 'Ảnh thân gà', 'Ảnh toàn thân'];

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#8B1A1A] to-red-700 text-white rounded-xl p-6 mb-6 text-center">
        <div className="text-4xl mb-2">🐓</div>
        <h1 className="font-black text-2xl mb-1">AI Tướng Gà — Sư Kê Ảo</h1>
        <p className="text-red-200 text-sm">20 năm kinh nghiệm thực chiến • Phân tích vảy, tướng số, lối đá</p>

        {/* NÚT TẮT/BẬT GIỌNG ĐỌC */}
        <button onClick={() => { setVoiceOn(!voiceOn); if (speaking) stopSpeech(); }}
          className={`mt-3 px-4 py-1.5 rounded-full text-sm font-semibold transition ${voiceOn ? 'bg-white text-[#8B1A1A]' : 'bg-white/20 text-white/70'}`}>
          {voiceOn ? '🔊 Giọng đọc: BẬT' : '🔇 Giọng đọc: TẮT'}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-6">

        {/* UPLOAD */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-bold text-gray-700 mb-1">📸 Upload ảnh gà</h2>
            <p className="text-xs text-gray-400 mb-3">Upload 4 ảnh để sư kê phân tích chính xác hơn</p>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {labels.map((label, i) => (
                <label key={i} className="relative cursor-pointer">
                  <input type="file" accept="image/*" className="hidden"
                    onChange={(e) => handleImage(i, e)} />
                  {images[i] ? (
                    <div className="relative">
                      <img src={images[i]!} alt="" className="w-full h-28 object-cover rounded-lg" />
                      <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">{label}</div>
                      <div className="absolute top-1 right-1 bg-green-500 rounded-full w-5 h-5 flex items-center justify-center text-white text-xs font-bold">✓</div>
                    </div>
                  ) : (
                    <div className="h-28 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-red-400 hover:bg-red-50 transition">
                      <div className="text-2xl mb-1">📷</div>
                      <div className="text-xs text-gray-400 text-center px-1">{label}</div>
                    </div>
                  )}
                </label>
              ))}
            </div>

            <div className="text-xs text-center text-gray-400 mb-3">
              Đã upload: {uploadedCount}/4 ảnh
              {uploadedCount >= 1 && <span className="text-green-600 ml-1">✓ Đủ để phân tích</span>}
            </div>

            {uploadedCount > 0 && !loading && (
              <button onClick={handleAnalyze}
                className="w-full bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition">
                🐓 Nhờ sư kê phân tích {uploadedCount} ảnh
              </button>
            )}

            {uploadedCount > 0 && (
              <button onClick={() => { setImages([null,null,null,null]); setResult(null); setError(''); stopSpeech(); }}
                className="w-full mt-2 border-2 border-gray-300 text-gray-600 font-semibold py-2 rounded-xl hover:bg-gray-50 transition text-sm">
                🔄 Xóa tất cả
              </button>
            )}

            {error && (
              <div className="mt-3 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>
            )}
          </div>

          {/* HƯỚNG DẪN */}
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h3 className="font-bold text-gray-700 mb-2">💡 Chụp đúng để sư kê xem chính xác</h3>
            <div className="grid grid-cols-2 gap-2 text-xs text-gray-600">
              <div className="bg-amber-50 rounded-lg p-2">📷 <strong>Ảnh 1:</strong> Cận mặt, thấy rõ mắt</div>
              <div className="bg-amber-50 rounded-lg p-2">📷 <strong>Ảnh 2:</strong> Chân, thấy rõ vảy</div>
              <div className="bg-amber-50 rounded-lg p-2">📷 <strong>Ảnh 3:</strong> Thân, lông, cánh</div>
              <div className="bg-amber-50 rounded-lg p-2">📷 <strong>Ảnh 4:</strong> Toàn thân đứng thẳng</div>
            </div>
          </div>
        </div>

        {/* KẾT QUẢ */}
        <div>
          {loading && (
            <div className="bg-white rounded-xl p-6 shadow-sm text-center">
              <div className="text-5xl mb-4 animate-bounce">🐓</div>
              <div className="font-bold text-gray-800 mb-2">{LoadingSteps[step]}</div>
              <div className="flex gap-1 justify-center mt-3">
                {LoadingSteps.map((_, i) => (
                  <div key={i} className={`h-1.5 w-8 rounded-full transition-all ${i <= step ? 'bg-[#8B1A1A]' : 'bg-gray-200'}`}></div>
                ))}
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-3">

              {/* ĐIỂM + NÚT ĐỌC */}
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-center mb-1">
                  <h3 className="font-black text-gray-800">🏆 Kết luận sư kê</h3>
                  <div className={`text-4xl font-black ${getDiemMau(result.tong_diem)}`}>{result.tong_diem}/10</div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full">
                    <div className="h-2 bg-[#8B1A1A] rounded-full" style={{width:`${result.tong_diem*10}%`}}></div>
                  </div>
                  <span className="text-xs text-gray-500">Tin cậy: {result.do_tin_cay}%</span>
                </div>

                {/* NÚT ĐỌC / DỪNG */}
                <div className="flex gap-2">
                  {!speaking ? (
                    <button onClick={() => speakResult(result)}
                      className="flex-1 bg-green-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-green-700 transition flex items-center justify-center gap-1">
                      🔊 Nghe sư kê đọc
                    </button>
                  ) : (
                    <button onClick={stopSpeech}
                      className="flex-1 bg-gray-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-gray-700 transition flex items-center justify-center gap-1 animate-pulse">
                      ⏹ Dừng đọc
                    </button>
                  )}
                </div>
              </div>

              {/* CÁC PHẦN PHÂN TÍCH */}
              {[
                { icon: '👁', title: 'Nhận diện', key: 'nhan_dien', bg: 'bg-blue-50' },
                { icon: '🐾', title: 'Phân tích vảy', key: 'phan_tich_vay', bg: 'bg-yellow-50' },
                { icon: '💭', title: 'Nhận định', key: 'nhan_dinh', bg: 'bg-green-50' },
                { icon: '⚔️', title: 'Lối đá', key: 'loi_da', bg: 'bg-orange-50' },
                { icon: '⚠️', title: 'Cảnh báo', key: 'canh_bao', bg: 'bg-red-50' },
              ].map(item => (
                result[item.key] && (
                  <div key={item.key} className={`${item.bg} rounded-xl p-3`}>
                    <div className="font-bold text-gray-700 text-sm mb-1">{item.icon} {item.title}</div>
                    <p className="text-sm text-gray-600 leading-relaxed">{result[item.key]}</p>
                  </div>
                )
              ))}

              {/* GIÁ */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
                <div className="font-bold text-gray-800 mb-1">💰 Giá đề xuất</div>
                <div className="text-2xl font-black text-[#8B1A1A]">{result.gia_de_xuat} đ</div>
                {result.ly_do_gia && <p className="text-xs text-gray-500 mt-1">{result.ly_do_gia}</p>}
              </div>

              <div className="flex gap-3">
                <a href="/dang-ga" className="flex-1 bg-[#8B1A1A] text-white font-bold py-3 rounded-xl hover:bg-[#6B0F0F] transition text-sm text-center">
                  📋 Đăng bán ngay
                </a>
                <button onClick={() => { setImages([null,null,null,null]); setResult(null); stopSpeech(); }}
                  className="flex-1 border-2 border-gray-300 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 transition text-sm">
                  🔄 Phân tích gà khác
                </button>
              </div>
            </div>
          )}

          {uploadedCount === 0 && !loading && !result && (
            <div className="bg-white rounded-xl p-6 shadow-sm text-center text-gray-400 h-64 flex flex-col items-center justify-center">
              <div className="text-5xl mb-3">🐓</div>
              <div className="font-semibold">Upload ảnh để sư kê phân tích</div>
              <div className="text-sm mt-1">4 ảnh = phân tích chính xác nhất</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
