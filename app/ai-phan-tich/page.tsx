'use client';
import { useState, useRef } from 'react';
import { optimizeImage } from '@/lib/imageOptimizer';

interface GaData {
  loai: string;
  tuoi: string;
  can_nang: string;
  thanh_tich_tran: string;
  thanh_tich_thang: string;
  tinh_trang: string;
  nguon_goc: string;
}

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

  // ── Form dữ liệu gà ──
  const [gaData, setGaData] = useState<GaData>({
    loai: '', tuoi: '', can_nang: '',
    thanh_tich_tran: '', thanh_tich_thang: '',
    tinh_trang: '', nguon_goc: '',
  });
  const [showForm, setShowForm] = useState(false);

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
      const optimized = await optimizeImage(file, { maxWidthOrHeight: 800, maxSizeKB: 150 });
      const base64 = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = (ev) => resolve(ev.target?.result as string);
        reader.readAsDataURL(optimized.file);
      });
      const newImages = [...images];
      newImages[index] = base64;
      setImages(newImages);
      setResult(null); setError('');
    } catch {
      const reader = new FileReader();
      reader.onload = (ev) => {
        const newImages = [...images];
        newImages[index] = ev.target?.result as string;
        setImages(newImages);
      };
      reader.readAsDataURL(file);
    } finally { setOptimizing(false); }
  };

  const handleVideo = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    const video = videoRef.current;
    if (!video) return;
    video.src = url; video.load();
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
          canvas.width = 640; canvas.height = 360;
          canvas.getContext('2d')?.drawImage(v, 0, 0, 640, 360);
          frames[i] = canvas.toDataURL('image/jpeg', 0.7);
          done++;
          if (done === 4) { setVideoFrames(frames); setImages(frames as any); setResult(null); setError(''); }
        }, { once: true });
      });
    };
  };

  const stopSpeech = () => { window.speechSynthesis?.cancel(); setSpeaking(false); };

  const speakResult = (r: any) => {
    if (!r || !window.speechSynthesis) return;
    stopSpeech();
    const text = `Kết quả phân tích ${r.so_anh} ảnh. Điểm: ${r.tong_diem} trên 10. Độ tin cậy: ${r.do_tin_cay} phần trăm. Mắt: ${r.mat}. Chân: ${r.chan}. Kết luận vảy: ${r.vay_ket_luan}. ${r.vay_y_nghia}. ${r.chien_dau_nhan_xet ? 'Đánh giá chiến đấu: ' + r.chien_dau_nhan_xet : ''}. Nhận xét: ${r.nhan_xet_tong}. Giá đề xuất: ${r.gia_de_xuat} đồng.`;
    const utterance = new SpeechSynthesisUtterance(text);
    const voices = window.speechSynthesis.getVoices();
    const viVoice = voices.find(v => v.lang.includes('vi') || v.lang.includes('VI'));
    if (viVoice) utterance.voice = viVoice;
    utterance.lang = 'vi-VN'; utterance.rate = 0.9;
    utterance.onstart = () => setSpeaking(true);
    utterance.onend = () => setSpeaking(false);
    utterance.onerror = () => setSpeaking(false);
    window.speechSynthesis.speak(utterance);
  };

  const uploadedCount = images.filter(Boolean).length;
  const filledCount = Object.values(gaData).filter(v => v !== '').length;

  const handleAnalyze = async () => {
    if (uploadedCount === 0) return;
    setLoading(true); setError(''); setStep(0); stopSpeech();
    const interval = setInterval(() => {
      setStep(prev => prev < LoadingSteps.length - 1 ? prev + 1 : prev);
    }, 900);
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ images, gaData }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (!contentType.includes('application/json')) throw new Error(`Lỗi server (${res.status}). Vui lòng thử lại!`);
      const data = await res.json();
      if (!res.ok || data.error) throw new Error(data.error || `Lỗi ${res.status}`);
      setResult(data);
      if (voiceOn) setTimeout(() => speakResult(data), 600);
    } catch (err: any) {
      setError(err?.message || 'Lỗi phân tích. Vui lòng thử lại!');
    } finally { clearInterval(interval); setLoading(false); }
  };

  const getDiemMau = (d: number) => d >= 8 ? 'text-green-600' : d >= 6.5 ? 'text-yellow-600' : 'text-red-500';
  const getBarMau = (d: number) => d >= 8 ? 'bg-green-500' : d >= 6.5 ? 'bg-yellow-500' : 'bg-red-500';
  const getVayStyle = (loai: string) =>
    loai === 'tot' ? 'bg-green-50 border-green-300' :
    loai === 'xau' ? 'bg-red-50 border-red-300' : 'bg-gray-50 border-gray-200';
  const getRiskStyle = (risk: string) =>
    risk === 'thap' ? 'bg-green-100 text-green-700 border-green-200' :
    risk === 'cao' ? 'bg-red-100 text-red-700 border-red-200' :
    'bg-yellow-100 text-yellow-700 border-yellow-200';
  const getRiskLabel = (risk: string) =>
    risk === 'thap' ? '🟢 Rủi ro thấp' : risk === 'cao' ? '🔴 Rủi ro cao' : '🟡 Rủi ro trung bình';

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
        {/* CỘT TRÁI */}
        <div className="space-y-4">

          {/* UPLOAD */}
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
                {filledCount > 0 && <span className="ml-1 text-red-200 font-normal text-xs">+ {filledCount} thông tin</span>}
              </button>
            )}
            {uploadedCount > 0 && (
              <button onClick={() => { setImages([null,null,null,null]); setVideoFrames([]); setResult(null); setError(''); stopSpeech(); }}
                className="w-full mt-2 border border-gray-200 text-gray-400 py-2 rounded-xl text-sm hover:bg-gray-50 transition">
                🔄 Xóa tất cả
              </button>
            )}
            {error && (
              <div className="mt-2 bg-red-50 border border-red-200 text-red-700 text-sm p-3 rounded-lg">❌ {error}</div>
            )}
          </div>

          {/* FORM THÔNG TIN GÀ */}
          <div className="bg-white rounded-xl shadow-sm overflow-hidden">
            <button onClick={() => setShowForm(!showForm)}
              className="w-full flex items-center justify-between p-4 text-left hover:bg-gray-50 transition">
              <div className="flex items-center gap-2">
                <span className="text-base">📋</span>
                <div>
                  <div className="font-bold text-gray-800 text-sm">Thông tin gà <span className="text-gray-400 font-normal text-xs">(không bắt buộc)</span></div>
                  <div className="text-xs">
                    {filledCount > 0
                      ? <span className="text-green-600 font-semibold">✓ Đã nhập {filledCount}/7 — AI phân tích chính xác hơn</span>
                      : <span className="text-gray-400">Nhập thêm để AI định giá + đánh giá chiến đấu chính xác hơn</span>}
                  </div>
                </div>
              </div>
              <span className={`text-gray-400 text-xs transition-transform inline-block ${showForm ? 'rotate-180' : ''}`}>▼</span>
            </button>

            {showForm && (
              <div className="px-4 pb-4 space-y-3 border-t border-gray-100 pt-3">

                {/* Loại gà */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">🐓 Loại gà</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[{val:'ga_don',label:'Gà đòn'},{val:'ga_cua',label:'Gà cựa'},{val:'ga_tre',label:'Gà tre'}].map(opt => (
                      <button key={opt.val}
                        onClick={() => setGaData(p => ({...p, loai: p.loai === opt.val ? '' : opt.val}))}
                        className={`py-1.5 rounded-lg text-xs font-bold border transition ${gaData.loai === opt.val ? 'bg-[#8B1A1A] text-white border-[#8B1A1A]' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-red-300'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Tuổi + Cân */}
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">📅 Tuổi (tháng)</label>
                    <input type="number" min="1" max="120" value={gaData.tuoi}
                      onChange={e => setGaData(p => ({...p, tuoi: e.target.value}))}
                      placeholder="VD: 18"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400" />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-gray-600 mb-1 block">⚖️ Cân nặng (kg)</label>
                    <input type="number" min="0.5" max="10" step="0.1" value={gaData.can_nang}
                      onChange={e => setGaData(p => ({...p, can_nang: e.target.value}))}
                      placeholder="VD: 2.5"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400" />
                  </div>
                </div>

                {/* Thành tích */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1 block">⚔️ Thành tích chiến đấu</label>
                  <div className="grid grid-cols-2 gap-2">
                    <input type="number" min="0" value={gaData.thanh_tich_tran}
                      onChange={e => setGaData(p => ({...p, thanh_tich_tran: e.target.value}))}
                      placeholder="Tổng số trận"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400" />
                    <input type="number" min="0" value={gaData.thanh_tich_thang}
                      onChange={e => setGaData(p => ({...p, thanh_tich_thang: e.target.value}))}
                      placeholder="Số trận thắng"
                      className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-red-400" />
                  </div>
                  {gaData.thanh_tich_tran && gaData.thanh_tich_thang && (() => {
                    const tran = parseInt(gaData.thanh_tich_tran);
                    const thang = parseInt(gaData.thanh_tich_thang);
                    const ty = tran > 0 ? Math.round((thang/tran)*100) : 0;
                    return (
                      <div className={`mt-1 text-xs text-center font-semibold ${ty>=70?'text-green-600':ty>=50?'text-yellow-600':'text-red-500'}`}>
                        Tỉ lệ thắng: {ty}% ({thang}/{tran} trận)
                      </div>
                    );
                  })()}
                </div>

                {/* Tình trạng */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">❤️ Tình trạng sức khỏe</label>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      {val:'khoe', label:'✅ Khỏe', active:'bg-green-600 text-white border-green-600'},
                      {val:'nghi_benh', label:'⚠️ Nghi bệnh', active:'bg-yellow-500 text-white border-yellow-500'},
                      {val:'dang_tri', label:'🏥 Đang trị', active:'bg-red-600 text-white border-red-600'},
                    ].map(opt => (
                      <button key={opt.val}
                        onClick={() => setGaData(p => ({...p, tinh_trang: p.tinh_trang === opt.val ? '' : opt.val}))}
                        className={`py-1.5 rounded-lg text-xs font-bold border transition ${gaData.tinh_trang === opt.val ? opt.active : 'bg-gray-50 text-gray-500 border-gray-200 hover:border-gray-300'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                  {(gaData.tinh_trang === 'nghi_benh' || gaData.tinh_trang === 'dang_tri') && (
                    <div className="mt-1.5 bg-red-50 border border-red-200 rounded-lg p-2 text-xs text-red-600">
                      ⚠️ Gà bệnh → AI sẽ cảnh báo và tự động giảm giá đề xuất
                    </div>
                  )}
                </div>

                {/* Nguồn gốc */}
                <div>
                  <label className="text-xs font-semibold text-gray-600 mb-1.5 block">🏠 Nguồn gốc</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[{val:'ga_nha',label:'🏠 Gà nhà nuôi'},{val:'mua_lai',label:'🛒 Mua lại'}].map(opt => (
                      <button key={opt.val}
                        onClick={() => setGaData(p => ({...p, nguon_goc: p.nguon_goc === opt.val ? '' : opt.val}))}
                        className={`py-1.5 rounded-lg text-xs font-bold border transition ${gaData.nguon_goc === opt.val ? 'bg-[#8B1A1A] text-white border-[#8B1A1A]' : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-red-300'}`}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                {filledCount > 0 && (
                  <button onClick={() => setGaData({loai:'',tuoi:'',can_nang:'',thanh_tich_tran:'',thanh_tich_thang:'',tinh_trang:'',nguon_goc:''})}
                    className="w-full text-xs text-gray-400 py-1.5 hover:text-red-400 transition">
                    × Xóa thông tin đã nhập
                  </button>
                )}
              </div>
            )}
          </div>

          {/* TIPS */}
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

        {/* CỘT PHẢI — KẾT QUẢ */}
        <div>
          {loading && (
            <div className="bg-white rounded-xl p-6 shadow-sm text-center">
              <div className="text-5xl mb-4 animate-bounce">🐓</div>
              <div className="font-bold text-gray-800 mb-1">{LoadingSteps[step]}</div>
              <div className="text-xs text-gray-400 mb-3">
                Đang xử lý {uploadedCount} ảnh{filledCount > 0 ? ` + ${filledCount} thông tin gà` : ''}...
              </div>
              <div className="flex gap-1 justify-center">
                {LoadingSteps.map((_, i) => (
                  <div key={i} className={`h-1.5 w-8 rounded-full transition-all ${i <= step ? 'bg-[#8B1A1A]' : 'bg-gray-200'}`} />
                ))}
              </div>
            </div>
          )}

          {result && !loading && (
            <div className="space-y-3">

              {/* TỔNG ĐIỂM */}
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

                {/* Sub-scores nếu có data gà */}
                {(result.diem_ngoai_hinh || result.diem_chien_dau) && (
                  <div className="grid grid-cols-2 gap-2 mb-3">
                    {result.diem_ngoai_hinh && (
                      <div className="bg-blue-50 rounded-lg p-2 text-center">
                        <div className="text-xs text-blue-600 font-semibold">👁 Ngoại hình</div>
                        <div className={`text-xl font-black ${getDiemMau(result.diem_ngoai_hinh)}`}>{result.diem_ngoai_hinh}/10</div>
                      </div>
                    )}
                    {result.diem_chien_dau && (
                      <div className="bg-orange-50 rounded-lg p-2 text-center">
                        <div className="text-xs text-orange-600 font-semibold">⚔️ Chiến đấu</div>
                        <div className={`text-xl font-black ${getDiemMau(result.diem_chien_dau)}`}>{result.diem_chien_dau}/10</div>
                      </div>
                    )}
                  </div>
                )}

                {!speaking ? (
                  <button onClick={() => speakResult(result)} className="w-full bg-green-600 text-white font-bold py-2 rounded-lg text-sm">
                    🔊 Nghe sư kê đọc kết quả
                  </button>
                ) : (
                  <button onClick={stopSpeech} className="w-full bg-gray-500 text-white font-bold py-2 rounded-lg text-sm animate-pulse">
                    ⏹ Dừng đọc
                  </button>
                )}
              </div>

              {/* CẢNH BÁO BỆNH */}
              {result.canh_bao_benh && (
                <div className="bg-red-50 border-2 border-red-300 rounded-xl p-3">
                  <div className="font-bold text-red-700 text-sm mb-1">🚨 Cảnh báo sức khỏe</div>
                  <p className="text-sm text-red-600">{result.canh_bao_benh}</p>
                </div>
              )}

              {/* AI NHẬN DIỆN */}
              <div className="bg-blue-50 border border-blue-100 rounded-xl p-3">
                <div className="font-bold text-blue-700 text-xs mb-1">🔍 AI nhận diện từng ảnh</div>
                <p className="text-xs text-gray-600">{result.nhan_dien_anh}</p>
                {result.phan_thay_ro && <div className="mt-1 text-xs text-green-700"><b>Thấy rõ:</b> {result.phan_thay_ro}</div>}
                {result.phan_khong_ro && <div className="mt-0.5 text-xs text-orange-600"><b>Chưa rõ:</b> {result.phan_khong_ro}</div>}
              </div>

              {/* NGOẠI HÌNH */}
              <div className="bg-white border border-gray-100 rounded-xl p-3">
                <div className="font-bold text-gray-700 text-sm mb-2">👁 Nhận diện ngoại hình</div>
                <div className="space-y-1.5 text-sm text-gray-600">
                  <div><b className="text-gray-700">Mắt:</b> {result.mat}</div>
                  <div><b className="text-gray-700">Chân:</b> {result.chan}</div>
                  <div><b className="text-gray-700">Lông/Dáng:</b> {result.long_dang}</div>
                </div>
              </div>

              {/* CHIẾN ĐẤU (chỉ hiện khi có thông tin gà) */}
              {result.chien_dau_nhan_xet && (
                <div className="bg-orange-50 border border-orange-200 rounded-xl p-3">
                  <div className="font-bold text-orange-700 text-sm mb-2">⚔️ Đánh giá chiến đấu</div>
                  <p className="text-sm text-gray-600 mb-2">{result.chien_dau_nhan_xet}</p>
                  {result.risk_level && (
                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${getRiskStyle(result.risk_level)}`}>
                      {getRiskLabel(result.risk_level)}
                    </div>
                  )}
                  {result.risk_ly_do && <p className="text-xs text-gray-500 mt-1.5">{result.risk_ly_do}</p>}
                </div>
              )}

              {/* VẢY */}
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

              {/* NHẬN ĐỊNH AI */}
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
                {result.gia_dieu_chinh_ly_do && (
                  <div className="mt-1.5 text-xs bg-white rounded-lg p-2 border border-yellow-100">
                    <b className="text-orange-600">Điều chỉnh:</b> {result.gia_dieu_chinh_ly_do}
                  </div>
                )}
                <p className="text-xs text-gray-400 italic mt-1">*Tham khảo thị trường, không phải giá cam kết</p>
              </div>

              {/* CẦN BỔ SUNG */}
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
