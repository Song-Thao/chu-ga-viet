'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import GaDetailContent from '@/components/GaDetailContent';

const KhuVuc = [
  'Tat ca','TP.HCM','Binh Duong','Dong Nai','Long An',
  'Tien Giang','Ben Tre','Vinh Long','Dong Thap',
  'An Giang','Kien Giang','Can Tho','Hau Giang','Soc Trang',
  'Bac Lieu','Ca Mau','Tay Ninh','Binh Phuoc',
  'Da Nang','Khanh Hoa','Binh Dinh','Hue',
  'Nghe An','Thanh Hoa','Dak Lak','Lam Dong',
  'Ha Noi','Hai Phong','Quang Ninh',
];

const LoaiGa = [
  'Tat ca','Ga Tre','Ga Ri','Ga Dong Tao','Ga Ta',
  'Ga Choi','Ga Noi','Ga Ma','Ga Peru','Ga Thai',
  'Ga My','Ga Tay','Ga Loi','Ga Rung','Khac',
];

const MauNen = ['bg-orange-800','bg-gray-700','bg-green-800','bg-red-900','bg-yellow-700','bg-teal-800'];
const PAGE_SIZE = 12;

function formatGia(gia: number) {
  if (gia >= 1000000) return `${(gia / 1000000).toFixed(1).replace('.0', '')} trieu d`;
  return `${gia.toLocaleString('vi-VN')} d`;
}
function getYoutubeId(url: string) {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([^&\n?#]+)/);
  return m ? m[1] : null;
}
function getVideoThumb(url: string) {
  const id = getYoutubeId(url);
  return id ? `https://img.youtube.com/vi/${id}/mqdefault.jpg` : null;
}

// ── GaFullModal ── items-center + max-h + overflow-y-auto trên box
function GaFullModal({ gaId, onClose }: { gaId: string; onClose: () => void }) {
  return (
    <div className="fixed inset-0 bg-black/80 z-[60] flex items-center justify-center p-2 md:p-4" onClick={onClose}>
      <div className="bg-white rounded-2xl w-full max-w-4xl max-h-[92vh] overflow-y-auto shadow-2xl" onClick={e => e.stopPropagation()}>
        <div className="flex items-center justify-between px-4 py-3 border-b sticky top-0 bg-white z-10 rounded-t-2xl">
          <span className="font-black text-gray-800">Chi tiet ga</span>
          <div className="flex gap-2">
            <Link href={`/ga/${gaId}`} onClick={onClose} className="text-xs border border-gray-300 text-gray-500 px-3 py-1.5 rounded-lg hover:bg-gray-50">Mo trang rieng</Link>
            <button onClick={onClose} className="w-8 h-8 bg-gray-100 rounded-full flex items-center justify-center text-gray-600 text-sm">X</button>
          </div>
        </div>
        <div className="p-3 md:p-5">
          <GaDetailContent gaId={gaId} isModal={true} onClose={onClose} />
        </div>
      </div>
    </div>
  );
}

// ── GaQuickModal ── giữ nguyên code cũ hoạt động tốt
function GaQuickModal({ ga, onClose }: { ga: any; onClose: () => void }) {
  const [activeMedia, setActiveMedia] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [showFull, setShowFull] = useState(false);

  const mediaList = [
    ...(ga.ga_images || []).map((img: any) => ({ type: 'image', url: img.url, thumb: img.url })),
    ...(ga.video_url ? [{ type: 'video', url: ga.video_url, thumb: getVideoThumb(ga.video_url) || '' }] : []),
  ];
  const cur = mediaList[activeMedia];
  const ytId = cur?.type === 'video' ? getYoutubeId(cur.url) : null;
  const aiScore = ga.ai_analysis?.[0]?.total_score;

  return (
    <>
      {showFull && createPortal(
        <GaFullModal gaId={String(ga.id)} onClose={() => { setShowFull(false); onClose(); }} />,
        document.body
      )}
      <div className="fixed inset-0 bg-black/65 z-50 flex items-center justify-center p-3" onClick={onClose}>
        <div className="bg-white rounded-2xl w-full max-w-sm shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between px-3 py-2.5 border-b">
            <div className="min-w-0 flex-1 pr-2">
              <h2 className="font-black text-sm text-gray-800 truncate">{ga.ten}</h2>
              <div className="text-xs text-gray-500">{ga.loai_ga} - {ga.khu_vuc}</div>
            </div>
            <button onClick={onClose} className="w-7 h-7 bg-gray-100 rounded-full flex items-center justify-center text-xs">X</button>
          </div>

          {mediaList.length > 0 && (
            <div className="relative bg-black" style={{ paddingBottom: '56%' }}>
              {cur.type === 'image' ? (
                <Image src={cur.url} alt={ga.ten} fill className="object-contain" sizes="400px" />
              ) : ytId && !isPlaying ? (
                <>
                  <img src={cur.thumb || `https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt="video" className="absolute inset-0 w-full h-full object-cover" loading="lazy" />
                  <button onClick={() => setIsPlaying(true)} className="absolute inset-0 flex items-center justify-center">
                    <div className="bg-black/60 rounded-full w-12 h-12 flex items-center justify-center"><span className="text-white text-xl ml-1">▶</span></div>
                  </button>
                </>
              ) : ytId ? (
                <iframe src={`https://www.youtube.com/embed/${ytId}?autoplay=1&controls=1&rel=0`} className="absolute inset-0 w-full h-full border-none" allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
              ) : null}
              {aiScore && <div className="absolute top-2 right-2 bg-yellow-400 text-black text-xs px-2 py-0.5 rounded-full font-bold z-10">★ {aiScore}</div>}
            </div>
          )}

          {mediaList.length > 1 && (
            <div className="flex gap-1.5 px-3 pt-2 overflow-x-auto">
              {mediaList.map((m, i) => (
                <button key={i} onClick={() => setActiveMedia(i)} className={`relative flex-shrink-0 w-10 h-10 rounded-lg overflow-hidden border-2 ${activeMedia === i ? 'border-red-800' : 'border-gray-200'}`}>
                  <img src={m.thumb || ''} alt="" className="w-full h-full object-cover" loading="lazy" />
                  {m.type === 'video' && <div className="absolute inset-0 flex items-center justify-center bg-black/40"><span className="text-white text-xs">▶</span></div>}
                </button>
              ))}
            </div>
          )}

          <div className="px-3 py-3">
            <div className="flex items-baseline justify-between mb-1">
              <div className="text-red-800 font-black text-lg">{formatGia(parseInt(ga.gia))}</div>
              <div className="flex gap-1.5">
                {ga.can_nang && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{ga.can_nang}kg</span>}
                {ga.tuoi && <span className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full text-xs">{ga.tuoi}th</span>}
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => setShowFull(true)} className="flex-1 bg-red-800 text-white font-bold py-2.5 rounded-xl text-sm">Xem day du</button>
              <button onClick={onClose} className="px-4 border border-gray-300 text-gray-600 font-bold py-2.5 rounded-xl text-sm">Dong</button>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

function GaCard({ ga, idx, priority = false }: { ga: any; idx: number; priority?: boolean }) {
  const [showModal, setShowModal] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const router = useRouter();

  const anhChinh = ga.ga_images?.find((i: any) => i.is_primary)?.url || ga.ga_images?.[0]?.url;
  const hasVideo = !!ga.video_url;
  const displayThumb = anhChinh || (hasVideo ? getVideoThumb(ga.video_url) : null);
  const totalMedia = (ga.ga_images?.length || 0) + (hasVideo ? 1 : 0);
  const aiScore = ga.ai_analysis?.[0]?.total_score;

  return (
    <>
      {showModal && createPortal(<GaQuickModal ga={ga} onClose={() => setShowModal(false)} />, document.body)}
      <div onClick={() => setShowModal(true)} onMouseEnter={() => router.prefetch(`/ga/${ga.id}`)}
        className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer">
        <div className="relative h-36 w-full bg-gray-100">
          {!imgLoaded && <div className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse z-10" />}
          {displayThumb ? (
            <Image src={displayThumb} alt={ga.ten} fill
              sizes="(max-width:640px) 50vw,(max-width:1024px) 33vw,25vw"
              className={`object-cover transition-opacity duration-300 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
              priority={priority} loading={priority ? 'eager' : 'lazy'} onLoad={() => setImgLoaded(true)} />
          ) : (
            <div className={`${MauNen[idx % MauNen.length]} h-full flex items-center justify-center text-5xl`}>🐓</div>
          )}
          {hasVideo && <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-1.5 py-0.5 rounded z-10">🎬</div>}
          {totalMedia > 1 && <div className="absolute top-2 right-2 bg-black/60 text-white text-xs px-1.5 py-0.5 rounded z-10">+{totalMedia - 1}</div>}
          {aiScore && <div className="absolute bottom-2 right-2 bg-yellow-400 text-black text-xs px-1.5 py-0.5 rounded-full font-bold z-10">★ {aiScore}</div>}
        </div>
        <div className="p-2 md:p-3">
          <div className="text-xs text-red-800 font-semibold mb-0.5 truncate">{ga.loai_ga}</div>
          <div className="font-bold text-xs md:text-sm text-gray-800 truncate">{ga.ten}</div>
          <div className="text-red-800 font-black text-xs md:text-sm mt-1">{formatGia(parseInt(ga.gia))}</div>
          <div className="mt-1"><span className="text-xs text-gray-500">📍 {ga.khu_vuc}</span></div>
        </div>
      </div>
    </>
  );
}

function FilterPanel({ khuVuc, loaiGa, giaMax, setKhuVuc, setLoaiGa, setGiaMax, onClose }: any) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <h3 className="font-black text-gray-800 mb-4">Loc ket qua</h3>
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-600 mb-1">Muc gia toi da</div>
        <div className="flex justify-between text-xs text-gray-500 mb-1"><span>0d</span><span>{formatGia(giaMax)}</span></div>
        <input type="range" min="500000" max="50000000" step="500000" value={giaMax} onChange={e => setGiaMax(Number(e.target.value))} className="w-full accent-red-800" aria-label="Muc gia toi da" />
      </div>
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-600 mb-2">Khu vuc</div>
        <select value={khuVuc} onChange={e => setKhuVuc(e.target.value)} className="w-full border rounded-lg px-2 py-1.5 text-sm" aria-label="Chon khu vuc">
          {KhuVuc.map(k => <option key={k}>{k}</option>)}
        </select>
      </div>
      <div className="mb-4">
        <div className="text-sm font-semibold text-gray-600 mb-2">Loai ga</div>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {LoaiGa.map(l => (
            <label key={l} className="flex items-center gap-2 text-sm cursor-pointer hover:text-red-800">
              <input type="radio" name="loaiga" checked={loaiGa === l} onChange={() => setLoaiGa(l)} className="accent-red-800" />
              {l}
            </label>
          ))}
        </div>
      </div>
      <button onClick={() => { setKhuVuc('Tat ca'); setLoaiGa('Tat ca'); setGiaMax(50000000); onClose(); }}
        className="w-full border border-red-800 text-red-800 rounded-lg py-2 text-sm font-semibold hover:bg-red-50">
        Xoa bo loc
      </button>
    </div>
  );
}

export default function ChoClient({ initialData }: { initialData: any[] }) {
  const [khuVuc, setKhuVuc] = useState('Tat ca');
  const [loaiGa, setLoaiGa] = useState('Tat ca');
  const [giaMax, setGiaMax] = useState(50000000);
  const [sapXep, setSapXep] = useState('Moi nhat');
  const [showMobileFilter, setShowMobileFilter] = useState(false);
  const [page, setPage] = useState(1);

  const filtered = initialData
    .filter(g => parseInt(g.gia) <= giaMax)
    .filter(g => khuVuc === 'Tat ca' || g.khu_vuc === khuVuc)
    .filter(g => loaiGa === 'Tat ca' || g.loai_ga === loaiGa);

  const sorted = [...filtered].sort((a, b) => {
    if (sapXep === 'Gia thap nhat') return parseInt(a.gia) - parseInt(b.gia);
    if (sapXep === 'Gia cao nhat') return parseInt(b.gia) - parseInt(a.gia);
    if (sapXep === 'Diem AI cao nhat') return (b.ai_analysis?.[0]?.total_score || 0) - (a.ai_analysis?.[0]?.total_score || 0);
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
  });

  useEffect(() => { setPage(1); }, [khuVuc, loaiGa, giaMax, sapXep]);

  const visible = sorted.slice(0, page * PAGE_SIZE);
  const hasMore = visible.length < sorted.length;
  const fp = { khuVuc, loaiGa, giaMax, setKhuVuc, setLoaiGa, setGiaMax, onClose: () => setShowMobileFilter(false) };

  return (
    <div className="max-w-6xl mx-auto px-3 py-4">
      {showMobileFilter && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-end md:hidden" onClick={() => setShowMobileFilter(false)}>
          <div className="w-full bg-white rounded-t-2xl p-4 max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex justify-between items-center mb-3">
              <h3 className="font-black text-gray-800">Bo loc</h3>
              <button onClick={() => setShowMobileFilter(false)} className="text-gray-400 text-2xl">x</button>
            </div>
            <FilterPanel {...fp} />
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <div className="hidden md:block w-56 flex-shrink-0">
          <div className="sticky top-20"><FilterPanel {...fp} /></div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-3">
            <div>
              <h1 className="font-black text-lg text-gray-800">Cho Ga Viet</h1>
              <p className="text-xs text-gray-600">{sorted.length} ket qua</p>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowMobileFilter(true)} className="md:hidden border border-gray-300 rounded-lg px-3 py-1.5 text-sm text-gray-600 bg-white">Loc</button>
              <select value={sapXep} onChange={e => setSapXep(e.target.value)} className="border rounded-lg px-2 py-1.5 text-xs md:text-sm" aria-label="Sap xep">
                <option>Moi nhat</option>
                <option>Gia thap nhat</option>
                <option>Gia cao nhat</option>
                <option>Diem AI cao nhat</option>
              </select>
            </div>
          </div>

          {sorted.length > 0 ? (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {visible.map((ga, idx) => <GaCard key={ga.id} ga={ga} idx={idx} priority={idx < 4} />)}
              </div>
              {hasMore && (
                <div className="mt-6 text-center">
                  <button onClick={() => setPage(p => p + 1)} className="border-2 border-red-800 text-red-800 font-bold px-8 py-2.5 rounded-full hover:bg-red-50 transition text-sm">
                    Xem them ({sorted.length - visible.length} con nua)
                  </button>
                </div>
              )}
              <div className="mt-6 bg-gradient-to-r from-red-900 to-red-700 rounded-xl p-5 text-white text-center">
                <div className="font-black text-lg mb-1">🐓 Ban co ga muon ban?</div>
                <p className="text-red-200 text-sm mb-3">Dang ban mien phi, AI tu dong phan tich</p>
                <Link href="/dang-ga" className="bg-yellow-400 text-black font-black px-6 py-2 rounded-full hover:bg-yellow-300 transition inline-block">Dang ga ngay</Link>
              </div>
            </>
          ) : (
            <div className="text-center py-20 text-gray-400">
              <div className="text-5xl mb-4">🐓</div>
              <div className="font-semibold">Chua co ga nao</div>
              <Link href="/dang-ga" className="mt-4 inline-block bg-red-800 text-white px-6 py-2 rounded-full text-sm font-bold">Dang ga ngay</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
