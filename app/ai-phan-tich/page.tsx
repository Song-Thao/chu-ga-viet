'use client';
import { useState, useRef } from 'react';
import { optimizeImage } from '@/lib/imageOptimizer';

export default function AIPhanTichPage() {
  const [images, setImages] = useState<(string | null)[]>([null, null, null, null]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');
  const [step, setStep] = useState(0);
  const [speaking, setSpeaking] = useState(false);
  const [voiceOn, setVoiceOn] = useState(true);
  const [videoMode, setVideoMode] = useState(false);
  const [videoFrames, setVideoFrames] = useState<string[]>([]);
  const [optimizing, setOptimizing] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const LoadingSteps = [
    '📷 Nhận diện từng ảnh...',
    '👁 Quan sát mắt, chân, vảy...',
    '🐾 Đối chiếu 92 loại vảy...',
    '📋 Tổng hợp kết quả...',
  ];

  const handleImage = async (index: number, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setOptimizing(true);
    try {
      // Bước 1: Nén ảnh
      const optimized = await optimizeImage(file, { maxWidthOrHeight: 1280, maxSizeKB: 300 });
      // Bước 2: Convert file đã nén → base64 để gửi API
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(optimized.file);
      });
      const newImages = [...images];
      newImages[index] = base64;
      setImages(newImages);
      setResult(null);
      setError('');
    } catch {
      // Fallback: đọc ảnh gốc nếu optimize lỗi
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newImages = [...images];
        newImages[index] = ev.target?.result as string;
        setImages(newImages);
      };
      reader.readAsDataURL(file);
    } finally {
      setOptimizing(false);
    }
  };

  const handleVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const video = videoRef.current;
    if (!video) return;
    video.src = url;
    video.load();
    video.onloadedmetadata = () => {
      const duration = video.duration;
      const times = [0.5, duration * 0.33, duration * 0.66, duration - 0.5];
      const frames: string[] = [];
      let done = 0;
      times.forEach((t, i) => {
        const v = document.createElement('video');
        v.src = url;
        v.currentTime = Math.min(t, duration - 0.1);
        v.addEventListener('seeked', () => {
          const canvas = document.createElement('canvas');
          canvas.width = 640;
          canvas.height = 360;
          canvas.getContext('2d')?.drawImage(v, 0, 0, 640, 360);
          frames[i] = canvas.toDataURL('image/jpeg', 0.7);
          done++;
          if (done === 4) {
            setVideoFrames(frames);
            setImages(frames as any);
            setResult(null);
            setError('');
          }
        }, { once: true });
      });
    };
  };

  const stopSpeech = () => { window.speechSynthesis?.cancel(); setSpeaking(false); };

  const speakResult = (r: any) => {
    if (!r || !window.speechSynthesis) return;
    stopSpeech();
    const text = `Kết quả phân tích ${r.so_anh} ảnh. Điểm: ${r.tong_diem} trên 10. Độ tin cậy: ${r.do_tin_cay} phần trăm. Mắt: ${r.mat}. Chân: ${r.chan}. Kết luận vảy: ${r.vay_ket_luan}. ${r.vay_y_nghia}. Nhận xét: ${r.nhan_xet_tong}. Giá đề xuất: ${r.gia_de_xuat} đồng.`;
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
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) {
        throw new Error(`Lỗi server (${res.status}). Vui lòng thử lại!`);
      }
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `Lỗi ${res.status}`);
      setResult(data);
      if (voiceOn) setTimeout(() => speakResult(data), 600);
    } catch (err: any) {
      setError(err?.message || 'Lỗi phân tích. Vui lòng thử lại!');
    } finally {
      clearInterval(interval);
      setLoading(false);
    }
  };

  const getDiemMau = (d: number) => d >= 8 ? 'text-green-600' : d >= 6.5 ? 'text-yellow-600' : 'text-red-500';
  const getBarMau = (d: number) => d >= 8 ? 'bg-green-500' : d >= 6.5 ? 'bg-yellow-500' : 'bg-red-500';
  const getVayStyle = (loai: string) =>
    loai === 'tot' ? 'bg-green-50 border-green-300' :
    loai === 'xau' ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200';

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">
      <video ref={videoRef} className="hidden" crossOrigin="anonymous" />

      {/* HEADER */}
      <div className="bg-gradient-to-r from-[#8B1A1A] to-red-700 text-white rounded-xl p-5 mb-5 text-center">
        <div className="text-4xl mb-1">🐓</div>
        <h1 className="font-black text-xl mb-1">AI Tướng Gà — Sư Kê Ảo</h1>
        <p className="text-red-200 text-xs mb-3">92 loại vảy chuẩn • Ảnh tự động nén • Không cần đúng thứ tự</p>
        <button onClick={() => { setVoiceOn(!voiceOn); if (speaking) stopSpeech(); }}
          className={`px-4 py-1.5 rounded-full text-sm font-semibold border transition ${voiceOn ? 'bg-white text-[#8B1A1A] border-white' : 'bg-transparent text-white/60 border-white/30'}`}>
          {voiceOn ? '🔊 Giọng đọc: BẬT' : '🔇 Giọng đọc: TẮT'}
        </button>
      </div>

      <div className="grid md:grid-cols-2 gap-5">
        {/* UPLOAD */}
        <div className="space-y-4">
          <div className="bg-white rounded-xl p-4 shadow-sm">
            <div className="flex gap-2 mb-3">
              <button onClick={() => { setVideoMode(false); setVideoFrames([]); }}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${!videoMode ? 'bg-[#8B1A1A] text-white' : 'bg-gray-100 text-gray-600'}`}>
                📷 Upload ảnh
              </button>
              <button onClick={() => setVideoMode(true)}
                className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${videoMode ? 'bg-[#8B1A1A] text-white' : 'bg-gray-100 text-gray-600'}`}>
                🎬 Upload video
              </button>
            </div>

            {optimizing && (
              <div className="flex items-center gap-2 text-orange-600 text-sm mb-3 bg-orange-50 p-2 rounded-lg">
                <div className="w-4 h-4 border-2 border-orange-400 border-t-transparent rounded-full animate-spin" />
                Đang tối ưu ảnh...
              </div>
            )}

            {!videoMode && (
              <>
                <p className="text-xs text-gray-400 mb-3">Upload 1-4 ảnh — tự động nén, không lo dung lượng</p>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {[0,1,2,3].map(i => (
                    <label key={i} className="cursor-pointer">
                      <input type="file" accept="image/*" className="hidden" onChange={(e) => handleImage(i, e)} />
                      {images[i] ? (
                        <div className="relative">
                          <img src={images[i]!} alt="" className="w-full h-28 object-cover rounded-lg" loading="lazy" />
                          <div className="absolute top-1 right-1 bg-green-500 rounded-full w-5 h-5 flex items-center justify-center text-white text-xs">✓</div>
                          <div className="absolute bottom-1 left-1 bg-black/50 text-white text-xs px-1.5 py-0.5 rounded">Ảnh {i+1}</div>
                        </div>
                      ) : (
                        <div className="h-28 border-2 border-dashed border-gray-200 rounded-lg flex flex-col items-center justify-center hover:border-red-400 hover:bg-red-50 transition">
                          <div className="text-xl mb-1">📷</div>
                          <div className="text-xs text-gray-300">Ảnh {i+1}</div>
                        </div>
                      )}
                    </label>
                  ))}
                </div>
              </>
            )}

            {videoMode && (
              <>
                <p className="text-xs text-gray-400 mb-3">Upload video 5-15 giây — AI tự trích 4 frame</p>
                <label className="block border-2 border-dashed border-gray-300 rounded-xl p-4 text-center cursor-pointer hover:border-red-400 hover:bg-red-50 transition mb-3">
                  <input type="file" accept="video/*" className="hidden" onChange={handleVideo} />
                  <div className="text-3xl mb-2">🎬</div>
                  <div className="text-sm text-gray-500">Nhấn để chọn video</div>
                  <div className="text-xs text-gray-400 mt-1">MP4, MOV • Tối ưu 5-15 giây</div>
                </label>
                {videoFrames.length > 0 && (
                  <div>
                    <div className="text-xs text-green-600 font-semibold mb-2">✓ Đã trích {videoFrames.length} frame</div>
                    <div className="grid grid-cols-4 gap-1">
                      {videoFrames.map((f, i) => (
                        <img key={i} src={f} alt="" className="w-full h-16 object-cover rounded" loading="lazy" />
                      ))}
                    </div>
                  </div>
                )}
              </>
            )}

            <div className="text-xs text-center mb-3">
              <span className="text-gray-400">Sẵn sàng: {uploadedCount} ảnh</span>
              {uploadedCount === 4 && <span className="text-blue-600 ml-1 font-semibold">🎯 Đủ 4 góc!</span>}
            </div>

            {uploadedCount > 0 && !loading && !optimizing && (
              <button onClick={handleAnalyze}
                className="w-full bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition">
                🐓 Phân tích {uploadedCount} ảnh — đối chiếu 92 loại vảy
              </button>
            )}
            {uploadedCount > 0 && (
              <button onClick={() => { setImages([null,null,null,null]); setVideoFrames([]); setResult(null); setError(''); stopSpeech(); }}
                className="w-full mt-2 border border-gray-200 text-gray-400 py-2 rounded-xl text-sm hover:bg-gray-50 transition">
                🔄 Xóa tất cả
              </button>
            )}
            {error && (
              <div className="mt-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">
                ❌ {error}
              </div>
            )}
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-3">
            <h3 className="font-bold text-amber-800 mb-2 text-sm">💡 Để AI xác định vảy chính xác</h3>
            <div className="space-y-1 text-xs text-amber-700">
              <div>📷 Ảnh chân rõ sát gối (Án Thiên/Phủ Địa)</div>
              <div>📷 Ảnh rõ ngang cựa (Huyền Trâm/Song Phủ Đao)</div>
              <div>📷 Ảnh rõ dưới ngón giữa (Ám Long)</div>
              <div>📷 Ảnh toàn thân đứng tự nhiên</div>
              <div className="text-amber-500 mt-1">🎬 Hoặc video 5-15 giây — AI tự trích frame</div>
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
                  <div key={i} className={`h-1.5 w-8 rounded-full transition-all ${i <= step ? 'bg-[#8B1A1A]' : 'bg-gray-200'}`} />
                ))}
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-3">
              <div className="bg-white rounded-xl p-4 shadow-sm">
                <div className="flex justify-between items-start mb-1">
                  <div>
                    <h3 className="font-black text-gray-800">🏆 Kết luận sư kê</h3>
                    <div className="text-xs text-gray-400">{result.so_anh} ảnh • Độ rõ: {result.do_ro}%</div>
                  </div>
                  <div className={`text-3xl font-black ${getDiemMau(result.tong_diem)}`}>{result.tong_diem}/10</div>
                </div>
                <div className="flex items-center gap-2 mb-2">
                  <div className="flex-1 h-2 bg-gray-200 rounded-full">
                    <div className={`h-2 ${getBarMau(result.tong_diem)} rounded-full`} style={{width:`${result.tong_diem*10}%`}} />
                  </div>
                  <span className="text-xs text-gray-500">Tin cậy: {result.do_tin_cay}%</span>
                </div>
                {!speaking ? (
                  <button onClick={() => speakResult(result)}
                    className="w-full bg-green-600 text-white font-bold py-2 rounded-lg text-sm">
                    🔊 Nghe sư kê đọc kết quả
                  </button>
                ) : (
                  <button onClick={stopSpeech}
                    className="w-full bg-gray-500 text-white font-bold py-2 rounded-lg text-sm animate-pulse">
                    ⏹ Dừng đọc
                  </button>
                )}
              </div>

              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <div className="font-bold text-blue-700 text-xs mb-1">🔍 AI nhận diện từng ảnh</div>
                <p className="text-xs text-gray-600">{result.nhan_dien_anh}</p>
                {result.phan_thay_ro && <div className="mt-1 text-xs text-green-700"><b>Thấy rõ:</b> {result.phan_thay_ro}</div>}
                {result.phan_khong_ro && <div className="mt-0.5 text-xs text-orange-600"><b>Chưa rõ:</b> {result.phan_khong_ro}</div>}
              </div>

              <div className="bg-white border border-gray-100 rounded-xl p-3">
                <div className="font-bold text-gray-700 text-sm mb-2">👁 Nhận diện ngoại hình</div>
                <div className="space-y-1.5 text-sm text-gray-600">
                  <div><b className="text-gray-700">Mắt:</b> {result.mat}</div>
                  <div><b className="text-gray-700">Chân:</b> {result.chan}</div>
                  <div><b className="text-gray-700">Lông/Dáng:</b> {result.long_dang}</div>
                </div>
              </div>

              <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-3">
                <div className="font-bold text-yellow-700 text-sm mb-1">🐾 AI quan sát vảy</div>
                <p className="text-sm text-gray-600 mb-2">{result.vay_quan_sat}</p>
                {result.hau_do_kem && (
                  <div className="text-xs text-gray-500 mb-2 bg-white rounded p-2 border border-yellow-100">
                    <b>Hàng Hậu/Độ/Kẽm:</b> {result.hau_do_kem}
                  </div>
                )}
                <div className={`rounded-lg p-2.5 border ${getVayStyle(result.vay_loai)}`}>
                  <div className="font-bold text-sm">{result.vay_ket_luan}</div>
                  {result.tin_cay_vay && <div className="text-xs text-gray-500 mt-0.5">Độ tin cậy: {result.tin_cay_vay}%</div>}
                  <div className="text-xs mt-0.5 text-gray-600">{result.vay_y_nghia}</div>
                </div>
              </div>

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

              {result.nhan_xet_tong && (
                <div className="bg-purple-50 border border-purple-100 rounded-xl p-3">
                  <div className="font-bold text-purple-700 text-sm mb-1">🤖 Nhận định AI</div>
                  <p className="text-sm text-gray-600 leading-relaxed">{result.nhan_xet_tong}</p>
                </div>
              )}

              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-xl p-4">
                <div className="text-xs font-bold text-gray-500 mb-1">💰 Giá tham khảo</div>
                <div className="text-2xl font-black text-[#8B1A1A]">{result.gia_de_xuat} đ</div>
                <p className="text-xs text-gray-500 mt-0.5">{result.ly_do_gia}</p>
                <p className="text-xs text-gray-400 italic mt-0.5">*Tham khảo thị trường, không phải giá cam kết</p>
              </div>

              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3">
                <div className="font-bold text-gray-600 text-sm mb-1">📋 Cần bổ sung</div>
                <p className="text-sm text-gray-500">{result.yeu_cau_bo_sung}</p>
              </div>

              <p className="text-xs text-gray-400 text-center italic">{result.canh_bao}</p>

              <div className="flex gap-3">
                <a href="/dang-ga" className="flex-1 bg-[#8B1A1A] text-white font-bold py-3 rounded-xl text-sm text-center">
                  📋 Đăng bán ngay
                </a>
                <button onClick={() => { setImages([null,null,null,null]); setVideoFrames([]); setResult(null); stopSpeech(); }}
                  className="flex-1 border border-gray-300 text-gray-600 font-bold py-3 rounded-xl text-sm">
                  🔄 Phân tích gà khác
                </button>
              </div>
            </div>
          )}

          {uploadedCount === 0 && !loading && !result && (
            <div className="bg-white rounded-xl p-6 shadow-sm text-center h-64 flex flex-col items-center justify-center">
              <div className="text-5xl mb-3">🐓</div>
              <div className="font-semibold text-gray-500">Upload ảnh hoặc video để phân tích</div>
              <div className="text-sm text-gray-400 mt-1">AI đối chiếu 92 loại vảy chuẩn dân chơi</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
