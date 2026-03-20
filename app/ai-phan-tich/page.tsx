'use client';
import { useState } from 'react';

export default function AIPhanTichPage() {
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);

  const LoadingSteps = [
    '🔍 Sư kê đang quan sát ảnh...',
    '👁 Kiểm tra mắt, chân, vảy...',
    '🐾 Đối chiếu tướng số...',
    '📋 Viết nhận định thực tế...',
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
      Kết quả phân tích. Điểm: ${r.tong_diem} trên 10. Độ tin cậy: ${r.do_tin_cay} phần trăm.
      Chất lượng ảnh: ${r.chat_luong_anh}.
      Nhận diện: ${r.nhan_dien}.
      Phân tích vảy: ${r.phan_tich_vay}.
      Diễn giải: ${r.dien_giai}.
      Lối đá: ${r.loi_da}.
      Nhận định AI: ${r.nhan_dinh_ai}.
      Giá đề xuất: ${r.gia_de_xuat} đồng. ${r.ly_do_gia}.
      Yêu cầu bổ sung: ${r.yeu_cau_bo_sung}.
      Cảnh báo: ${r.canh_bao}.
    `.trim();

    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VI'));
    if (viVoice) utterance.voice = viVoice;
    utterance.lang = 'vi-VN';
    utterance.rate = 0.9;
    utterance.pitch = 0.95;
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
      if (voiceOn) setTimeout(() => speakResult(data), 600);
    } catch (err: any) {
      setError('Lỗi phân tích. Vui lòng thử lại!');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const getDiemMau = (d: number) => d >= 8 ? 'text-green-600' : d >= 6.5 ? 'text-yellow-600' : 'text-red-600';
  const getBarMau = (d: number) => d >= 8 ? 'bg-green-500' : d >= 6.5 ? 'bg-yellow-500' : 'bg-red-500';
  const labels = ['Ảnh mặt gà', 'Ảnh chân + vảy', 'Ảnh thân gà', 'Ảnh toàn thân'];

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#8B1A1A] to-red-700 text-white rounded-xl p-5 mb-5 text-center">
        <div className="text-4xl mb-1">🐓</div>
        <h1 className="font-black text-xl mb-1">AI Tướng Gà — Sư Kê Ảo</h1>
        <p className="text-red-200 text-xs mb-3">Chỉ nhận định khi thấy rõ • Không phán bừa • Giá tham khảo đa nguồn</p>
        <button onClick={() => { setVoiceOn(!voiceOn); if (speaking) stopSpeech(); }}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold transition border ${voiceOn ? 'bg-white text-[#8B1A1A] border-white' : 'bg-transparent text-white/60 border-white/30'}`}>
          {voiceOn ? '🔊 Giọng đọc: BẬT' : '🔇 Giọng đọc: TẮT'}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-5">

        {/* UPLOAD */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-bold text-gray-700 mb-1">📸 Upload ảnh gà</h2>
            <p className="text-xs text-gray-400 mb-3">Upload 4 ảnh để sư kê phân tích đủ góc — kết quả chính xác hơn</p>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {labels.map((label, i) => (
                <label key={i} className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(i, e)} />
                  {images[i] ? (
                    <div className="relative">
                      <img src={images[i]!} alt="" className="w-full h-28 object-cover rounded-lg" />
                      <div className="absolute bottom-1 left-1 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">{label}</div>
                      <div className="absolute top-1 right-1 bg-green-500 rounded-full w-5 h-5 flex items-center justify-center text-white text-xs">✓</div>
                    </div>
                  ) : (
                    <div className="h-28 border-2 border-dashed border-gray-300 rounded-lg flex flex-col items-center justify-center hover:border-red-400 hover:bg-red-50 transition">
                      <div className="text-xl mb-1">📷</div>
                      <div className="text-xs text-gray-400 text-center px-1">{label}</div>
                    </div>
                  )}
                </label>
              ))}
            </div>

            <div className="text-xs text-center mb-3">
              <span className="text-gray-400">Đã upload: {uploadedCount}/4 ảnh</span>
              {uploadedCount >= 1 && <span className="text-green-600 ml-1 font-semibold">✓ Đủ để phân tích</span>}
            </div>

            {uploadedCount > 0 && !loading && (
              <button onClick={handleAnalyze}
                className="w-full bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition">
                🐓 Nhờ sư kê phân tích {uploadedCount} ảnh
              </button>
            )}
            {uploadedCount > 0 && (
              <button onClick={() => { setImages([null,null,null,null]); setResult(null); setError(''); stopSpeech(); }}
                className="w-full mt-2 border border-gray-300 text-gray-500 py-2 rounded-xl hover:bg-gray-50 transition text-sm">
                🔄 Xóa tất cả
              </button>
            )}
            {error && <div className="mt-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <h3 className="font-bold text-amber-800 mb-2 text-sm">💡 Chụp đúng để phân tích chính xác</h3>
            <div className="grid grid-cols-2 gap-1.5 text-xs text-amber-700">
              <div>📷 Ảnh 1: Cận mặt, rõ mắt</div>
              <div>📷 Ảnh 2: Chân, rõ vảy sát gối</div>
              <div>📷 Ảnh 3: Thân, lông, cánh</div>
              <div>📷 Ảnh 4: Toàn thân đứng thẳng</div>
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
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-black text-gray-800">🏆 Kết luận sư kê</h3>
                    <div className="text-xs text-gray-400 mt-0.5">Chất lượng ảnh: {result.chat_luong_anh}</div>
                  </div>
                  <div className={`text-3xl font-black ${getDiemMau(result.tong_diem)}`}>{result.tong_diem}/10</div>
                </div>
                <div className="flex items-center gap-2 mb-3">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full">
                    <div className={`h-2 ${getBarMau(result.tong_diem)} rounded-full`} style={{width:`${result.tong_diem*10}%`}}></div>
                  </div>
                  <span className="text-xs text-gray-500 whitespace-nowrap">Tin cậy: {result.do_tin_cay}%</span>
                </div>
                {!speaking ? (
                  <button onClick={() => speakResult(result)}
                    className="w-full bg-green-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-green-700 transition">
                    🔊 Nghe sư kê đọc kết quả
                  </button>
                ) : (
                  <button onClick={stopSpeech}
                    className="w-full bg-gray-500 text-white font-bold py-2 rounded-lg text-sm hover:bg-gray-600 transition animate-pulse">
                    ⏹ Dừng đọc
                  </button>
                )}
              </div>

              {/* NỘI DUNG PHÂN TÍCH */}
              {[
                { icon: '👁', title: 'Nhận diện', key: 'nhan_dien', bg: 'bg-blue-50 border-blue-100' },
                { icon: '🐾', title: 'Phân tích vảy', key: 'phan_tich_vay', bg: 'bg-yellow-50 border-yellow-100' },
                { icon: '📖', title: 'Diễn giải chuyên môn', key: 'dien_giai', bg: 'bg-green-50 border-green-100' },
                { icon: '⚔️', title: 'Lối đá', key: 'loi_da', bg: 'bg-orange-50 border-orange-100' },
                { icon: '🤖', title: 'Nhận định AI', key: 'nhan_dinh_ai', bg: 'bg-purple-50 border-purple-100' },
              ].map(item => result[item.key] && (
                <div key={item.key} className={`${item.bg} border rounded-xl p-3`}>
                  <div className="font-bold text-gray-700 text-sm mb-1">{item.icon} {item.title}</div>
                  <p className="text-sm text-gray-600 leading-relaxed">{result[item.key]}</p>
                </div>
              ))}

              {/* GIÁ THAM KHẢO */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
                <div className="font-bold text-gray-700 text-sm mb-1">💰 Giá tham khảo đa nguồn</div>
                <div className="text-2xl font-black text-[#8B1A1A]">{result.gia_de_xuat} đ</div>
                {result.ly_do_gia && <p className="text-xs text-gray-500 mt-1">{result.ly_do_gia}</p>}
                <p className="text-xs text-gray-400 mt-1 italic">*Giá mang tính tham khảo từ dữ liệu thị trường và kinh nghiệm thực chiến</p>
              </div>

              {/* YÊU CẦU BỔ SUNG */}
              {result.yeu_cau_bo_sung && (
                <div className="bg-red-50 border border-red-100 rounded-xl p-3">
                  <div className="font-bold text-red-700 text-sm mb-1">📋 Cần bổ sung để phân tích chính xác hơn</div>
                  <p className="text-sm text-red-600 leading-relaxed">{result.yeu_cau_bo_sung}</p>
                </div>
              )}

              {/* CẢNH BÁO */}
              {result.canh_bao && (
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                  <div className="font-bold text-gray-600 text-sm mb-1">⚠️ Lưu ý</div>
                  <p className="text-sm text-gray-500 leading-relaxed">{result.canh_bao}</p>
                </div>
              )}

              <div className="flex gap-3">
                <a href="/dang-ga" className="flex-1 bg-[#8B1A1A] text-white font-bold py-3 rounded-xl hover:bg-[#6B0F0F] transition text-sm text-center">
                  📋 Đăng bán ngay
                </a>
                <button onClick={() => { setImages([null,null,null,null]); setResult(null); stopSpeech(); }}
                  className="flex-1 border border-gray-300 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 transition text-sm">
                  🔄 Phân tích gà khác
                </button>
              </div>
            </div>
          )}

          {uploadedCount === 0 && !loading && !result && (
            <div className="bg-white rounded-xl p-6 shadow-sm text-center text-gray-400 h-64 flex flex-col items-center justify-center">
              <div className="text-5xl mb-3">🐓</div>
              <div className="font-semibold text-gray-500">Upload ảnh để sư kê phân tích</div>
              <div className="text-sm mt-1">4 ảnh = phân tích đầy đủ và chính xác nhất</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
