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
    '📷 Nhận diện từng ảnh...',
    '👁 Quan sát mắt, chân, vảy...',
    '🐾 Đối chiếu từ điển tướng số...',
    '📋 Tổng hợp kết quả thực tế...',
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

  const stopSpeech = () => { window.speechSynthesis?.cancel(); setSpeaking(false); };

  const speakResult = (r: any) => {
    if (!r || !window.speechSynthesis) return;
    stopSpeech();
    const text = `
      Kết quả phân tích ${r.so_anh} ảnh. Điểm: ${r.tong_diem} trên 10. Độ tin cậy: ${r.do_tin_cay} phần trăm.
      Phần thấy rõ: ${r.chat_luong}.
      Mắt: ${r.mat}. Chân: ${r.chan}.
      Vảy quan sát: ${r.vay_quan_sat}.
      Kết luận vảy: ${r.vay_ket_luan}. ${r.vay_y_nghia}.
      Nhận xét: ${r.nhan_xet_tong}.
      Giá đề xuất: ${r.gia_de_xuat} đồng.
      Cần bổ sung: ${r.yeu_cau_bo_sung}.
    `.trim();
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VI'));
    if (viVoice) utterance.voice = viVoice;
    utterance.lang = 'vi-VN';
    utterance.rate = 0.9;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const uploadedCount = images.filter(Boolean).length;

  const handleAnalyze = async () => {
    if (uploadedCount === 0) return;
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
        body: JSON.stringify({ images }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResult(data);
      if (voiceOn) setTimeout(() => speakResult(data), 600);
    } catch {
      setError('Lỗi phân tích. Vui lòng thử lại!');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const getDiemMau = (d: number) => d >= 8 ? 'text-green-600' : d >= 6.5 ? 'text-yellow-600' : 'text-red-500';
  const getBarMau = (d: number) => d >= 8 ? 'bg-green-500' : d >= 6.5 ? 'bg-yellow-500' : 'bg-red-500';
  const getVayStyle = (loai: string) =>
    loai === 'tot' ? 'bg-green-50 border-green-300 text-green-800' :
    loai === 'xau' ? 'bg-red-50 border-red-300 text-red-800' :
    'bg-gray-50 border-gray-300 text-gray-700';

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">

      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#8B1A1A] to-red-700 text-white rounded-xl p-5 mb-5 text-center">
        <div className="text-4xl mb-1">🐓</div>
        <h1 className="font-black text-xl mb-1">AI Tướng Gà — Sư Kê Ảo</h1>
        <p className="text-red-200 text-xs mb-3">Upload ảnh bất kỳ — AI tự nhận diện từng phần • Không cần đúng thứ tự</p>
        <button onClick={() => { setVoiceOn(!voiceOn); if (speaking) stopSpeech(); }}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${voiceOn ? 'bg-white text-[#8B1A1A] border-white' : 'bg-transparent text-white/60 border-white/30'}`}>
          {voiceOn ? '🔊 Giọng đọc: BẬT' : '🔇 Giọng đọc: TẮT'}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-5">

        {/* UPLOAD */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <h2 className="font-bold text-gray-700 mb-1">📸 Upload ảnh gà — không cần thứ tự</h2>
            <p className="text-xs text-gray-400 mb-3">AI tự nhận diện từng ảnh là phần gì. Upload 1-4 ảnh đều được.</p>

            <div className="grid grid-cols-2 gap-2 mb-3">
              {[0,1,2,3].map(i => (
                <label key={i} className="cursor-pointer">
                  <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(i, e)} />
                  {images[i] ? (
                    <div className="relative">
                      <img src={images[i]!} alt="" className="w-full h-28 object-cover rounded-lg" />
                      <div className="absolute top-1 right-1 bg-green-500 rounded-full w-5 h-5 flex items-center justify-center text-white text-xs">✓</div>
                      <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">Ảnh {i+1}</div>
                    </div>
                  ) : (
                    <div className="h-28 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center hover:border-red-400 hover:bg-red-50 transition">
                      <div className="text-xl mb-1">📷</div>
                      <div className="text-xs text-gray-400">Ảnh {i+1}</div>
                      <div className="text-xs text-gray-300">bất kỳ góc nào</div>
                    </div>
                  )}
                </label>
              ))}
            </div>

            <div className="text-xs text-center mb-3">
              <span className="text-gray-400">Đã upload: {uploadedCount}/4</span>
              {uploadedCount >= 1 && <span className="text-green-600 ml-1 font-semibold">✓ Sẵn sàng</span>}
              {uploadedCount === 4 && <span className="text-blue-600 ml-1">🎯 Đủ 4 góc!</span>}
            </div>

            {uploadedCount > 0 && !loading && (
              <button onClick={handleAnalyze}
                className="w-full bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition">
                🐓 Phân tích {uploadedCount} ảnh
              </button>
            )}
            {uploadedCount > 0 && (
              <button onClick={() => { setImages([null,null,null,null]); setResult(null); setError(''); stopSpeech(); }}
                className="w-full mt-2 border border-gray-200 text-gray-400 py-2 rounded-xl text-sm hover:bg-gray-50 transition">
                🔄 Xóa tất cả
              </button>
            )}
            {error && <div className="mt-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">{error}</div>}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <h3 className="font-bold text-amber-800 mb-2 text-sm">💡 Gợi ý để AI phân tích chính xác nhất</h3>
            <div className="space-y-1 text-xs text-amber-700">
              <div>📷 Chụp cận mặt — thấy rõ mắt</div>
              <div>📷 Chụp chân — rõ phần sát gối và ngang cựa</div>
              <div>📷 Chụp thân — thấy lông và cánh</div>
              <div>📷 Chụp toàn thân — gà đứng tự nhiên</div>
              <div className="text-amber-500 mt-1">👉 Không cần đúng thứ tự — AI tự hiểu</div>
            </div>
          </div>
        </div>

        {/* KẾT QUẢ */}
        <div>
          {loading && (
            <div className="bg-white rounded-xl p-6 shadow-sm text-center">
              <div className="text-5xl mb-4 animate-bounce">🐓</div>
              <div className="font-bold text-gray-800 mb-1">{LoadingSteps[step]}</div>
              <div className="text-xs text-gray-400 mb-3">Đang xử lý {uploadedCount} ảnh...</div>
              <div className="flex gap-1 justify-center">
                {LoadingSteps.map((_, i) => (
                  <div key={i} className={`h-1.5 w-8 rounded-full transition-all ${i <= step ? 'bg-[#8B1A1A]' : 'bg-gray-200'}`}></div>
                ))}
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-3">

              {/* ĐIỂM + ĐỌC */}
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-black text-gray-800">🏆 Kết luận sư kê</h3>
                    <div className="text-xs text-gray-400">{result.so_anh} ảnh • Độ rõ trung bình: {result.do_ro}%</div>
                  </div>
                  <div className={`text-3xl font-black ${getDiemMau(result.tong_diem)}`}>{result.tong_diem}/10</div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full">
                    <div className={`h-2 ${getBarMau(result.tong_diem)} rounded-full`} style={{width:`${result.tong_diem*10}%`}}></div>
                  </div>
                  <span className="text-xs text-gray-500">Tin cậy: {result.do_tin_cay}%</span>
                </div>
                {!speaking ? (
                  <button onClick={() => speakResult(result)}
                    className="w-full bg-green-600 text-white font-bold py-2 rounded-lg text-sm hover:bg-green-700 transition">
                    🔊 Nghe sư kê đọc kết quả
                  </button>
                ) : (
                  <button onClick={stopSpeech}
                    className="w-full bg-gray-500 text-white font-bold py-2 rounded-lg text-sm animate-pulse">
                    ⏹ Dừng đọc
                  </button>
                )}
              </div>

              {/* AI ĐÃ NHẬN DIỆN ĐƯỢC GÌ */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <div className="font-bold text-blue-700 text-xs mb-1">🔍 AI nhận diện từng ảnh</div>
                <p className="text-xs text-gray-600">{result.nhan_dien_anh}</p>
                {result.chat_luong && (
                  <div className="mt-1.5 text-xs text-green-700"><span className="font-semibold">Thấy rõ:</span> {result.chat_luong}</div>
                )}
                {result.phan_khong_ro && (
                  <div className="mt-0.5 text-xs text-orange-600"><span className="font-semibold">Chưa rõ:</span> {result.phan_khong_ro}</div>
                )}
              </div>

              {/* MẮT + CHÂN + LÔNG */}
              <div className="bg-white border border-gray-100 rounded-xl p-3">
                <div className="font-bold text-gray-700 text-sm mb-2">👁 Nhận diện ngoại hình</div>
                <div className="space-y-1.5 text-sm text-gray-600">
                  <div><span className="font-semibold text-gray-700">Mắt:</span> {result.mat}</div>
                  <div><span className="font-semibold text-gray-700">Chân:</span> {result.chan}</div>
                  <div><span className="font-semibold text-gray-700">Lông/Dáng:</span> {result.long_dang}</div>
                </div>
              </div>

              {/* VẢY */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <div className="font-bold text-yellow-700 text-sm mb-1">🐾 AI quan sát vảy</div>
                <p className="text-sm text-gray-600 mb-2">{result.vay_quan_sat}</p>
                <div className={`rounded-lg p-2.5 border ${getVayStyle(result.vay_loai)}`}>
                  <div className="font-bold text-sm">{result.vay_ket_luan}</div>
                  <div className="text-xs mt-0.5 opacity-80">{result.vay_y_nghia}</div>
                </div>
              </div>

              {/* ĐIỂM MẠNH / HẠN CHẾ */}
              <div className="grid grid-cols-2 gap-2">
                {result.diem_manh && (
                  <div className="bg-green-50 border border-green-100 rounded-xl p-3">
                    <div className="font-bold text-green-700 text-xs mb-1">✅ Điểm mạnh</div>
                    <p className="text-xs text-gray-600">{result.diem_manh}</p>
                  </div>
                )}
                {result.diem_han_che && (
                  <div className="bg-orange-50 border border-orange-100 rounded-xl p-3">
                    <div className="font-bold text-orange-700 text-xs mb-1">⚠️ Hạn chế</div>
                    <p className="text-xs text-gray-600">{result.diem_han_che}</p>
                  </div>
                )}
              </div>

              {/* NHẬN XÉT TỔNG */}
              {result.nhan_xet_tong && (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                  <div className="font-bold text-purple-700 text-sm mb-1">🤖 Nhận định AI</div>
                  <p className="text-sm text-gray-600 leading-relaxed">{result.nhan_xet_tong}</p>
                </div>
              )}

              {/* GIÁ */}
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
                <div className="text-xs font-bold text-gray-500 mb-1">💰 Giá tham khảo</div>
                <div className="text-2xl font-black text-[#8B1A1A]">{result.gia_de_xuat} đ</div>
                <p className="text-xs text-gray-500 mt-0.5">{result.ly_do_gia}</p>
                <p className="text-xs text-gray-400 italic mt-0.5">*Tham khảo thị trường, không phải giá cam kết</p>
              </div>

              {/* BỔ SUNG */}
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div className="font-bold text-gray-600 text-sm mb-1">📋 Cần bổ sung</div>
                <p className="text-sm text-gray-500">{result.yeu_cau_bo_sung}</p>
              </div>

              <p className="text-xs text-gray-400 text-center italic px-2">{result.canh_bao}</p>

              <div className="flex gap-3">
                <a href="/dang-ga" className="flex-1 bg-[#8B1A1A] text-white font-bold py-3 rounded-xl text-sm text-center hover:bg-[#6B0F0F] transition">
                  📋 Đăng bán ngay
                </a>
                <button onClick={() => { setImages([null,null,null,null]); setResult(null); stopSpeech(); }}
                  className="flex-1 border border-gray-300 text-gray-600 font-bold py-3 rounded-xl text-sm hover:bg-gray-50 transition">
                  🔄 Phân tích gà khác
                </button>
              </div>
            </div>
          )}

          {uploadedCount === 0 && !loading && !result && (
            <div className="bg-white rounded-xl p-6 shadow-sm text-center h-64 flex flex-col items-center justify-center">
              <div className="text-5xl mb-3">🐓</div>
              <div className="font-semibold text-gray-500">Upload ảnh để sư kê phân tích</div>
              <div className="text-sm text-gray-400 mt-1">Upload bất kỳ góc nào — AI tự nhận diện</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
