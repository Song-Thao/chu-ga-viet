'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const KhuVuc = [
  'Tất cả', 'TP.HCM', 'Bình Dương', 'Đồng Nai', 'Long An',
  'Tiền Giang', 'Bến Tre', 'Vĩnh Long', 'Đồng Tháp',
  'An Giang', 'Kiên Giang', 'Cần Thơ', 'Hậu Giang', 'Sóc Trăng',
  'Bạc Liêu', 'Cà Mau', 'Tây Ninh', 'Bình Phước',
  'Đà Nẵng', 'Khánh Hòa', 'Bình Định', 'Huế',
  'Nghệ An', 'Thanh Hóa', 'Đắk Lắk', 'Lâm Đồng',
  'Hà Nội', 'Hải Phòng', 'Quảng Ninh',
];

const LoaiGa = [
  'Tất cả', 'Gà Tre', 'Gà Ri', 'Gà Đông Tảo', 'Gà Ta',
  'Gà Chọi', 'Gà Nòi', 'Gà Mã', 'Gà Peru', 'Gà Thái',
  'Gà Mỹ', 'Gà Tây', 'Gà Lôi', 'Gà Rừng', 'Khác'
];

const MauNen = [
  'bg-orange-800', 'bg-gray-700', 'bg-green-800',
  'bg-red-900', 'bg-yellow-700', 'bg-teal-800'
];

function getYoutubeId(url: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/);
  return m ? m[1] : null;
}

function getVideoThumb(url: string): string | null {
  const ytId = getYoutubeId(url);
  if (ytId) return `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
  return null;
}

// ── GaDetailModal ─────────────────────────────────────────────
function GaDetailModal({ ga, onClose }: { ga: any; onClose: () => void }) {
  const [activeMedia, setActiveMedia] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);

  const mediaList: { type: 'image' | 'video'; url: string; thumb?: string }[] = [
    ...(ga.ga_images || []).map((img: any) => ({ type: 'image' as const, url: img.url })),
    ...(ga.video_url ? [{ type: 'video' as const, url: ga.video_url, thumb: getVideoThumb(ga.video_url) || '' }] : []),
  ];

  const currentMedia = mediaList[activeMedia];
  const ytId = currentMedia?.type === 'video' ? getYoutubeId(currentMedia.url) : null;
  const aiScore = ga.ai_analysis?.[0]?.total_score;

  useEffect(() => {
    function onKey(e: KeyboardEvent) { if (e.key === 'Escape') onClose(); }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  useEffect(() => { setIsPlaying(false); }, [activeMedia]);

  return (
    <div className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
          <div>
            <h2 className="font-black text-lg text-gray-800">{ga.ten}</h2>
            <div className="text-xs text-gray-500">{ga.loai_ga} • 📍 {ga.khu_vuc}</div>
          </div>
          <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center hover:bg-gray-200 text-gray-600 text-lg">✕</button>
        </div>

        <div className="p-4">
          {/* Media viewer */}
          {mediaList.length > 0 && (
            <div className="mb-4">
              <div className="relative bg-black rounded-xl overflow-hidden mb-2" style={{ paddingBottom: '56.25%' }}>
                {currentMedia.type === 'image' ? (
                  <img src={currentMedia.url} alt={ga.ten} className="absolute inset-0 w-full h-full object-contain" />
                ) : ytId ? (
                  !isPlaying ? (
                    <>
                      <img src={currentMedia.thumb || `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`}
                        alt="video" className="absolute inset-0 w-full h-full object-cover" />
                      <button onClick={() => setIsPlaying(true)} className="absolute inset-0 flex items-center justify-center">
                        <div className="bg-black/60 rounded-full w-16 h-16 flex items-center justify-center hover:bg-black/80 transition">
                          <span className="text-white text-3xl ml-1">▶</span>
                        </div>
                      </button>
                      <div className="absolute bottom-2 left-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                        🎬 Nhấn để phát video
                      </div>
                    </>
                  ) : (
                    <iframe
                      src={`https://www.youtube.com/embed/${ytId}?autoplay=1&controls=1&rel=0`}
                      className="absolute inset-0 w-full h-full border-none"
                      allow="autoplay; encrypted-media; fullscreen"
                      allowFullScreen
                    />
                  )
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center bg-gray-900 text-white text-sm">
                    🎬 Xem video trên nền tảng gốc
                  </div>
                )}
              </div>

              {mediaList.length > 1 && (
                <div className="flex gap-2 overflow-x-auto pb-1">
                  {mediaList.map((m, i) => (
                    <button key={i} onClick={() => setActiveMedia(i)}
                      className={`relative flex-shrink-0 w-16 h-16 rounded-lg overflow-hidden border-2 transition ${activeMedia === i ? 'border-[#8B1A1A]' : 'border-gray-200 hover:border-gray-400'}`}>
                      {m.type === 'image' ? (
                        <img src={m.url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <>
                          <img src={m.thumb || ''} alt="video" className="w-full h-full object-cover bg-gray-900" />
                          <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                            <span className="text-white text-base">▶</span>
                          </div>
                        </>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Info */}
          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <div className="text-[#8B1A1A] font-black text-2xl mb-2">
                {parseInt(ga.gia).toLocaleString('vi-VN')} đ
              </div>
              <div className="flex flex-wrap gap-2 mb-3">
                {ga.can_nang && <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">{ga.can_nang} kg</span>}
                {ga.tuoi && <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">{ga.tuoi} tháng</span>}
                <span className="bg-gray-100 text-gray-600 px-3 py-1 rounded-full text-sm">📍 {ga.khu_vuc}</span>
              </div>
              {ga.mo_ta && <p className="text-sm text-gray-600 leading-relaxed">{ga.mo_ta}</p>}
            </div>

            {aiScore && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-bold text-sm text-gray-700">🤖 Phân tích AI</span>
                  <span className={`text-2xl font-black ${aiScore >= 8 ? 'text-green-600' : aiScore >= 6.5 ? 'text-yellow-600' : 'text-red-500'}`}>
                    {aiScore}/10
                  </span>
                </div>
                {ga.ai_analysis?.[0]?.nhan_xet && (
                  <p className="text-xs text-gray-600">{ga.ai_analysis[0].nhan_xet}</p>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="flex gap-3 mt-4 pt-4 border-t">
            <Link href={`/ga/${ga.id}`}
              className="flex-1 bg-[#8B1A1A] text-white font-bold py-3 rounded-xl hover:bg-[#6B0F0F] transition text-sm text-center">
              Xem đầy đủ + Mua ngay →
            </Link>
            <button onClick={onClose}
              className="px-6 border border-gray-300 text-gray-600 font-bold py-3 rounded-xl hover:bg-gray-50 transition text-sm">
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ── GaCard ────────────────────────────────────────────────────
function GaCard({ ga, idx }: { ga: any; idx: number }) {
  const [showModal, setShowModal] = useState(false);

  const anhChinh = ga.ga_images?.find((i: any) => i.is_primary)?.url || ga.ga_images?.[0]?.url;
  const hasVideo = !!ga.video_url;
  const videoThumb = hasVideo ? getVideoThumb(ga.video_url) : null;
  const totalMedia = (ga.ga_images?.length || 0) + (hasVideo ? 1 : 0);
  const aiScore = ga.ai_analysis?.[0]?.total_score;
  const displayThumb = anhChinh || videoThumb;

  return (
    <>
      {showModal && <GaDetailModal ga={ga} onClose={() => setShowModal(false)} />}
      <div onClick={() => setShowModal(true)}
        className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer">

        <div className="relative h-36 bg-gray-100">
          {displayThumb ? (
            <img src={displayThumb} alt={ga.ten} className="w-full h-full object-cover" />
          ) : (
            <div className={`${MauNen[idx % MauNen.length]} h-full flex items-center justify-center text-5xl`}>🐓</div>
          )}

          {/* Icon play overlay nếu hiển thị video thumb */}
          {hasVideo && !anhChinh && videoThumb && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-black/50 rounded-full w-10 h-10 flex items-center justify-center">
                <span className="text-white text-lg ml-0.5">▶</span>
              </div>
            </div>
          )}

          {/* Badge video */}
          {hasVideo && (
            <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded">
              🎬
            </div>
          )}

          {/* Badge tổng số media */}
          {totalMedia > 1 && (
            <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded">
              +{totalMedia - 1}
            </div>
          )}

          {/* AI Score */}
          {aiScore && (
            <div className="absolute bottom-2 right-2 bg-yellow-400 text-black text-xs px-1.5 py-0.5 rounded-full font-bold">
              ⭐ {aiScore}
            </div>
          )}
        </div>

        <div className="p-2 md:p-3">
          <div className="text-xs text-[#8B1A1A] font-semibold mb-0.5 truncate">{ga.loai_ga}</div>
          <div className="font-bold text-xs md:text-sm text-gray-800 truncate">{ga.ten}</div>
          <div className="text-[#8B1A1A] font-black text-xs md:text-sm mt-1">
            {parseInt(ga.gia).toLocaleString('vi-VN')} đ
          </div>
          <div className="mt-1">
            <span className="text-xs text-gray-500 truncate">📍 {ga.khu_vuc}</span>
          </div>
        </div>
      </div>
    </>
  );
}

// ── FilterPanel ───────────────────────────────────────────────
function FilterPanel({ khuVuc, loaiGa, giaMax, setKhuVuc, setLoaiGa, setGiaMax, onClose, formatGia }: any) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="font-black text-gray-800 mb-4">Lọc kết quả</h3>
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-600 mb-1">Mức giá</div>
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>0đ</span><span>{formatGia(giaMax)}</span>
        </div>
        <input type="range" min="500000" max="50000000" step="500000"
          value={giaMax} onChange={e => setGiaMax(Number(e.target.value))}
          className="w-full accent-red-800" />
      </div>
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-600 mb-2">Khu vực</div>
        <select value={khuVuc} onChange={e => setKhuVuc(e.target.value)}
          className="w-full border rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300">
          {KhuVuc.map(kv => <option key={kv}>{kv}</option>)}
        </select>
      </div>
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-600 mb-2">Loại gà</div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {LoaiGa.map(lg => (
            <label key={lg} className="flex items-center gap-2 text-sm cursor-pointer hover:text-red-800">
              <input type="radio" name="loaiga" checked={loaiGa === lg}
                onChange={() => setLoaiGa(lg)} className="accent-red-800" />
              {lg}
            </label>
          ))}
        </div>
      </div>
      <button onClick={() => { setKhuVuc('Tất cả'); setLoaiGa('Tất cả'); setGiaMax(50000000); onClose(); }}
        className="w-full border border-red-800 text-red-800 rounded-lg py-2 text-sm font-semibold hover:bg-red-50 transition">
        Xóa bộ lọc
      </button>
    </div>
  );
}

// ── Main ──────────────────────────────────────────────────────
export default function ChoPage() {
  const [gaList, setGaList] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [khuVuc, setKhuVuc] = useState('Tất cả');
  const [loaiGa, setLoaiGa] = useState('Tất cả');
  const [giaMax, setGiaMax] = useState(50000000);
  const [sapXep, setSapXep] = useState('Mới nhất');
  const [showMobileFilter, setShowMobileFilter] = useState(false);

  useEffect(() => { fetchGa(); }, [khuVuc, loaiGa]);

  const fetchGa = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ limit: '50' });
      if (loaiGa !== 'Tất cả') params.append('loai', loaiGa);
      if (khuVuc !== 'Tất cả') params.append('khu_vuc', khuVuc);
      const res = await fetch(`/api/ga?${params}`);
      const data = await res.json();
      setGaList(data.data || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  const filtered = gaList.filter(g => parseInt(g.gia) <= giaMax);
  const sorted = [...filtered].sort((a, b) => {
    if (sapXep === 'Giá thấp nhất') return parseInt(a.gia) - parseInt(b.gia);
    if (sapXep === 'Giá cao nhất') return parseInt(b.gia) - parseInt(a.gia);
    if (sapXep === 'Điểm AI cao nhất') return (b.ai_analysis?.[0]?.total_score || 0) - (a.ai_analysis?.[0]?.total_score || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  const formatGia = (gia: number) => {
    if (gia >= 1000000) return `${(gia / 1000000).toFixed(1).replace('.0', '')} triệu`;
    return gia.toLocaleString('vi-VN');
  };

  const filterProps = { khuVuc, loaiGa, giaMax, setKhuVuc, setLoaiGa, setGiaMax, formatGia, onClose: () => setShowMobileFilter(false) };

  return (
    <div className="max-w-6xl mx-auto px-3 py-4">

      {showMobileFilter && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:hidden" onClick={() => setShowMobileFilter(false)}>
          <div className="w-full bg-white rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-gray-800">Bộ lọc</h3>
              <button onClick={() => setShowMobileFilter(false)} className="text-gray-400 text-2xl">×</button>
            </div>
            <FilterPanel {...filterProps} />
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <div className="hidden md:block w-56 flex-shrink-0">
          <div className="sticky top-20"><FilterPanel {...filterProps} /></div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h1 className="font-black text-lg text-gray-800">Chợ Gà Việt</h1>
              <p className="text-xs text-gray-500">{sorted.length} kết quả</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowMobileFilter(true)}
                className="md:hidden flex items-center gap-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-600 bg-white">
                🔍 Lọc
              </button>
              <select value={sapXep} onChange={e => setSapXep(e.target.value)}
                className="border rounded-lg px-2 py-1.5 text-xs md:text-sm">
                <option>Mới nhất</option>
                <option>Giá thấp nhất</option>
                <option>Giá cao nhất</option>
                <option>Điểm AI cao nhất</option>
              </select>
            </div>
          </div>

          {loading && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[1, 2, 3, 4, 5, 6].map(i => (
                <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
                  <div className="bg-gray-200 h-36"></div>
                  <div className="p-3 space-y-2">
                    <div className="bg-gray-200 h-3 rounded w-3/4"></div>
                    <div className="bg-gray-200 h-4 rounded w-1/2"></div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {!loading && sorted.length > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {sorted.map((ga, idx) => <GaCard key={ga.id} ga={ga} idx={idx} />)}
            </div>
          )}

          {!loading && sorted.length === 0 && (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-4">🐓</div>
              <div className="font-semibold">Chưa có gà nào</div>
              <Link href="/dang-ga" className="mt-4 inline-block bg-[#8B1A1A] text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-[#6B0F0F] transition">
                Đăng gà ngay
              </Link>
            </div>
          )}

          {!loading && sorted.length > 0 && (
            <div className="mt-6 bg-gradient-to-r from-[#8B1A1A] to-red-700 rounded-xl p-5 text-white text-center">
              <div className="font-black text-lg mb-1">🐓 Bạn có gà muốn bán?</div>
              <p className="text-red-200 text-sm mb-3">Đăng bán miễn phí, AI tự động phân tích</p>
              <Link href="/dang-ga" className="bg-yellow-400 text-black font-black px-6 py-2 rounded-full hover:bg-yellow-300 transition inline-block">
                Đăng gà ngay
              </Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
