'use client';
import { useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

const MauNen = ['bg-orange-800','bg-gray-700','bg-green-800','bg-red-900','bg-yellow-700','bg-teal-800'];
const MauBanner = ['from-red-900 to-red-700','from-gray-700 to-gray-600','from-yellow-800 to-yellow-700'];
const MauTieuDe = ['text-yellow-400','text-yellow-400','text-yellow-300'];

const KhuVuc = [
  'Tất cả','TP.HCM','Bình Dương','Đồng Nai','Long An',
  'Tiền Giang','Bến Tre','Vĩnh Long','Đồng Tháp',
  'An Giang','Kiên Giang','Cần Thơ','Hậu Giang','Sóc Trăng',
  'Bạc Liêu','Cà Mau','Tây Ninh','Bình Phước',
  'Đà Nẵng','Khánh Hòa','Bình Định','Huế',
  'Nghệ An','Thanh Hóa','Đắk Lắk','Lâm Đồng',
  'Hà Nội','Hải Phòng','Quảng Ninh',
];

const LoaiGa = [
  'Tất cả','Gà Tre','Gà Ri','Gà Đông Tảo','Gà Ta',
  'Gà Chọi','Gà Nòi','Gà Mã','Gà Peru','Gà Thái',
  'Gà Mỹ','Gà Tây','Gà Lôi','Gà Rừng','Khác',
];

const MucGia = [
  { label:'Mức giá', min:0, max:0 },
  { label:'Dưới 2 triệu', min:0, max:2000000 },
  { label:'2 - 5 triệu', min:2000000, max:5000000 },
  { label:'5 - 10 triệu', min:5000000, max:10000000 },
  { label:'10 - 20 triệu', min:10000000, max:20000000 },
  { label:'20 - 50 triệu', min:20000000, max:50000000 },
  { label:'Trên 50 triệu', min:50000000, max:0 },
];

function formatGia(gia: number) {
  if (gia >= 1000000) return `${(gia/1000000).toFixed(1).replace('.0','')} triệu đ`;
  return `${gia.toLocaleString('vi-VN')} đ`;
}

function formatNum(n: number) {
  if (n >= 1000) return (n/1000).toFixed(1).replace('.0','')+'K';
  return String(n);
}

function getYoutubeId(raw: string) {
  if (!raw) return null;
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const p of patterns) { const m = raw.match(p); if (m) return m[1]; }
  return null;
}

function VideoCard({ post }: { post: any }) {
  const [hovering, setHovering] = useState(false);
  const [muted, setMuted] = useState(true);
  const ytId = getYoutubeId(post.youtube_url);
  if (!ytId) return null;
  const title = post.noi_dung?.slice(0,60) || 'Video thực chiến';

  return (
    <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">
      <div className="relative" style={{ paddingBottom:'56.25%', background:'#000' }}
        onMouseEnter={()=>setHovering(true)} onMouseLeave={()=>{setHovering(false);setMuted(true);}}>
        {hovering ? (
          <>
            <iframe key={`${ytId}-${muted}`}
              src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=${muted?1:0}&controls=1&loop=1&playlist=${ytId}&rel=0`}
              style={{ position:'absolute', inset:0, width:'100%', height:'100%', border:'none' }}
              allow="autoplay; encrypted-media; fullscreen" allowFullScreen />
            <button onMouseDown={e=>{e.preventDefault();e.stopPropagation();setMuted(m=>!m);}}
              style={{ position:'absolute', top:8, right:8, zIndex:20, background:muted?'rgba(180,0,0,0.85)':'rgba(0,140,0,0.85)', border:'none', borderRadius:6, color:'#fff', fontSize:11, fontWeight:700, padding:'3px 8px', cursor:'pointer' }}>
              {muted?'🔇 Bật tiếng':'🔊 Có tiếng'}
            </button>
          </>
        ) : (
          <>
            <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} alt={title} loading="lazy" decoding="async"
              style={{ position:'absolute', inset:0, width:'100%', height:'100%', objectFit:'cover' }} />
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center' }}>
              <div style={{ background:'rgba(0,0,0,0.65)', borderRadius:'50%', width:48, height:48, display:'flex', alignItems:'center', justifyContent:'center', color:'#fff', fontSize:20 }}>▶</div>
            </div>
          </>
        )}
      </div>
      <div className="p-3">
        <div className="font-bold text-sm text-gray-800 line-clamp-2">{title}</div>
        <div className="flex gap-3 mt-1 text-xs text-gray-500">
          <span>👍 {formatNum(post.like_count??0)}</span>
          <span>💬 {formatNum(post.comment_count??0)}</span>
        </div>
      </div>
    </div>
  );
}

function GaCard({ ga, idx, priority=false }: { ga: any; idx: number; priority?: boolean }) {
  const anhChinh = ga.ga_images?.find((i: any)=>i.is_primary)?.url || ga.ga_images?.[0]?.url;
  const aiScore = ga.ai_analysis?.[0]?.total_score;
  return (
    <Link href={`/ga/${ga.id}`}>
      <div className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer">
        <div className="relative h-36 w-full bg-gray-100">
          {anhChinh ? (
            <Image src={anhChinh} alt={ga.ten} fill sizes="(max-width:640px) 50vw,(max-width:1024px) 25vw,20vw"
              className="object-cover" priority={priority} loading={priority?'eager':'lazy'} />
          ) : (
            <div className={`${MauNen[idx%MauNen.length]} h-full flex items-center justify-center text-5xl`}>🐓</div>
          )}
          {aiScore && <div className="absolute bottom-2 right-2 bg-yellow-400 text-black text-xs px-1.5 py-0.5 rounded-full font-bold z-10">⭐ {aiScore}</div>}
        </div>
        <div className="p-3">
          <div className="text-xs text-[#8B1A1A] font-semibold mb-0.5">{ga.loai_ga}</div>
          <div className="font-bold text-sm text-gray-800 truncate">{ga.ten}</div>
          <div className="text-[#8B1A1A] font-black text-sm mt-1">{formatGia(parseInt(ga.gia))}</div>
          <span className="text-xs text-gray-500">📍 {ga.khu_vuc}</span>
        </div>
      </div>
    </Link>
  );
}

const SkeletonCard = () => (
  <div className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
    <div className="bg-gray-200 h-36" />
    <div className="p-3 space-y-2">
      <div className="bg-gray-200 h-3 rounded w-1/3" />
      <div className="bg-gray-200 h-4 rounded w-3/4" />
      <div className="bg-gray-200 h-3 rounded w-1/2" />
    </div>
  </div>
);

interface Props {
  shopeeLink: string;
  banners: any[];
  gaMoiDang: any[];
  gaNoiBat: any[];
  topVideos: any[];
}

export default function HomeClient({ shopeeLink, banners, gaMoiDang, gaNoiBat, topVideos }: Props) {
  const router = useRouter();
  const [loai, setLoai] = useState('Tất cả');
  const [khuVuc, setKhuVuc] = useState('Tất cả');
  const [mucGiaIdx, setMucGiaIdx] = useState(0);

  const defaultBanners = [
    { vi_tri:1, tieu_de:'THUỐC BỔ GÀ', tieu_de_phu:'Tăng đòn • Tăng da • Tăng sức bền', link:'' },
    { vi_tri:2, tieu_de:'MÁY ẤP TRỨNG', tieu_de_phu:'Công nghệ mới nhất 2024', link:'' },
    { vi_tri:3, tieu_de:'THỨC ĂN', tieu_de_phu:'Dinh dưỡng cao cấp', link:'' },
  ];
  const displayBanners = banners.length > 0 ? banners : defaultBanners;
  const filteredVideos = topVideos.filter(p => getYoutubeId(p.youtube_url));

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (loai !== 'Tất cả') params.set('loai', loai);
    if (khuVuc !== 'Tất cả') params.set('khu_vuc', khuVuc);
    if (mucGiaIdx > 0) {
      const g = MucGia[mucGiaIdx];
      if (g.min > 0) params.set('gia_min', String(g.min));
      if (g.max > 0) params.set('gia_max', String(g.max));
    }
    router.push(`/cho?${params.toString()}`);
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">

      {/* BANNER 3 Ô */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        {displayBanners.map((b, idx) => {
          const content = (
            <div className={`bg-gradient-to-r ${MauBanner[idx]} text-white p-4 rounded-xl flex flex-col justify-center h-full`}>
              <div className={`text-xs font-bold ${MauTieuDe[idx]} mb-1`}>{b.tieu_de_phu}</div>
              <div className="font-black text-lg leading-tight">{b.tieu_de}</div>
            </div>
          );
          return b.link
            ? <a key={idx} href={b.link} target="_blank" rel="noopener noreferrer" className="hover:opacity-90 transition">{content}</a>
            : <div key={idx}>{content}</div>;
        })}
      </div>

      {/* SHOPEE BANNER */}
      <a href={shopeeLink} target="_blank" rel="noopener noreferrer" className="block mb-6 group">
        <div className="bg-gradient-to-r from-orange-500 to-orange-400 rounded-xl p-4 flex items-center gap-4 hover:opacity-95 transition shadow-sm">
          <div className="text-4xl">🛒</div>
          <div className="flex-1">
            <div className="font-black text-white text-lg">Mua phụ kiện gà chọi trên Shopee</div>
            <div className="text-orange-100 text-sm mt-0.5">Thức ăn • Thuốc bổ • Dụng cụ chăn nuôi • Giao hàng toàn quốc</div>
          </div>
          <div className="bg-white text-orange-500 font-black px-4 py-2 rounded-full text-sm group-hover:scale-105 transition">Mua ngay →</div>
        </div>
      </a>

      {/* SEARCH */}
      <div className="bg-white rounded-xl p-4 mb-6 shadow-sm">
        <div className="flex flex-wrap gap-3">
          <select value={loai} onChange={e=>setLoai(e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-red-300">
            {LoaiGa.map(l=><option key={l} value={l}>{l==='Tất cả'?'🐓 Loại gà':l}</option>)}
          </select>
          <select value={khuVuc} onChange={e=>setKhuVuc(e.target.value)} className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-red-300">
            {KhuVuc.map(k=><option key={k} value={k}>{k==='Tất cả'?'📍 Khu vực':k}</option>)}
          </select>
          <select value={mucGiaIdx} onChange={e=>setMucGiaIdx(Number(e.target.value))} className="border rounded-lg px-3 py-2 text-sm flex-1 min-w-[140px] focus:outline-none focus:ring-2 focus:ring-red-300">
            {MucGia.map((g,i)=><option key={i} value={i}>{i===0?'💰 Mức giá':g.label}</option>)}
          </select>
          <button onClick={handleSearch} className="bg-[#8B1A1A] text-white px-6 py-2 rounded-lg text-sm font-bold hover:bg-[#6B0F0F] transition">🔍 Tìm kiếm</button>
        </div>
        <div className="flex gap-2 mt-3 flex-wrap">
          {['Gà Nòi','Gà Tre','Gà Thái','Gà Peru','Gà Chọi'].map(tag=>(
            <button key={tag} onClick={()=>{setLoai(tag);setTimeout(handleSearch,100);}}
              className="text-xs bg-red-50 text-[#8B1A1A] border border-red-200 px-3 py-1 rounded-full hover:bg-red-100 transition font-semibold">{tag}</button>
          ))}
        </div>
      </div>

      {/* GÀ MỚI ĐĂNG */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-black text-lg text-gray-800 uppercase">🐓 Gà Mới Đăng</h2>
          <Link href="/cho" className="text-[#8B1A1A] text-sm font-semibold hover:underline">Xem thêm →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {gaMoiDang.length > 0
            ? gaMoiDang.map((ga,idx)=><GaCard key={ga.id} ga={ga} idx={idx} priority={idx<2} />)
            : <div className="col-span-4 text-center py-10 text-gray-400"><div className="text-4xl mb-2">🐓</div><div className="text-sm">Chưa có gà nào. <Link href="/dang-ga" className="text-[#8B1A1A] hover:underline">Đăng bán ngay!</Link></div></div>
          }
        </div>
      </section>

      {/* SHOPEE INLINE */}
      <a href={shopeeLink} target="_blank" rel="noopener noreferrer" className="block mb-8 group">
        <div className="bg-orange-50 border-2 border-orange-200 rounded-xl p-4 flex items-center gap-3 hover:border-orange-400 transition">
          <div className="text-3xl">🧴</div>
          <div className="flex-1">
            <div className="font-bold text-orange-800">Shopee — Thuốc & thức ăn gà chọi</div>
            <div className="text-xs text-orange-600 mt-0.5">Hàng nghìn sản phẩm chăm sóc gà chọi chất lượng cao</div>
          </div>
          <div className="text-orange-500 font-bold text-sm group-hover:translate-x-1 transition">Xem →</div>
        </div>
      </a>

      {/* GÀ NỔI BẬT */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-black text-lg text-gray-800 uppercase">🔥 Gà Nổi Bật</h2>
          <Link href="/cho" className="text-[#8B1A1A] text-sm font-semibold hover:underline">Xem tất cả →</Link>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {gaNoiBat.length > 0
            ? gaNoiBat.map((ga,idx)=><GaCard key={ga.id} ga={ga} idx={idx} priority={false} />)
            : <div className="col-span-4 text-center py-10 text-gray-400 text-sm">Chưa có gà nổi bật</div>
          }
        </div>
      </section>

      {/* VIDEO */}
      <section className="mb-8">
        <div className="flex justify-between items-center mb-3">
          <h2 className="font-black text-lg text-gray-800 uppercase">🎬 Video Thực Chiến</h2>
          <Link href="/cong-dong" className="text-[#8B1A1A] text-sm font-semibold hover:underline">Xem thêm →</Link>
        </div>
        {filteredVideos.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {filteredVideos.slice(0,3).map(post=><VideoCard key={post.id} post={post} />)}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-400 bg-white rounded-xl">
            <div className="text-4xl mb-2">🎬</div>
            <div className="text-sm">Chưa có video. Đăng bài có link YouTube trong <Link href="/cong-dong" className="text-[#8B1A1A] hover:underline">Cộng đồng</Link>!</div>
          </div>
        )}
      </section>

      {/* BOTTOM CTA */}
      <div className="grid grid-cols-2 gap-4 mb-8">
        <Link href="/thu-vien" className="bg-gradient-to-r from-amber-800 to-amber-700 text-white rounded-xl p-5 flex items-center gap-3 hover:opacity-90 transition">
          <div className="text-3xl">📚</div>
          <div><div className="font-black">BÀI VIẾT HƯỚNG DẪN</div><div className="text-xs text-amber-200 mt-1">Kiến thức từ chuyên gia</div></div>
        </Link>
        <a href={shopeeLink} target="_blank" rel="noopener noreferrer" className="bg-gradient-to-r from-orange-600 to-orange-500 text-white rounded-xl p-5 flex items-center gap-3 hover:opacity-90 transition">
          <div className="text-3xl">🛍️</div>
          <div><div className="font-black">PHỤ KIỆN GÀ SHOPEE</div><div className="text-xs text-orange-100 mt-1">Mua hàng — nhận hoa hồng</div></div>
        </a>
      </div>
    </div>
  );
}
