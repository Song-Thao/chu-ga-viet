'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

// ============================================================
// HELPERS
// ============================================================
function getYoutubeId(raw: string): string | null {
  if (!raw) return null;
  let url = raw;
  if (raw.includes('<iframe')) {
    const m = raw.match(/src=["']([^"']+)["']/);
    if (!m) return null;
    url = m[1];
  }
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const m = url.match(p);
    if (m) return m[1];
  }
  return null;
}

// ✅ Detect Facebook video link (thêm share/r/ và /videos/)
function getFacebookVideoUrl(raw: string): string | null {
  if (!raw) return null;
  const isFb =
    raw.includes('facebook.com/watch') ||
    raw.includes('facebook.com/share/v/') ||
    raw.includes('facebook.com/share/r/') ||
    raw.includes('fb.watch') ||
    raw.includes('facebook.com/video') ||
    raw.includes('facebook.com/videos/') ||
    raw.includes('facebook.com/reel');
  return isFb ? raw.trim() : null;
}

// ✅ Detect TikTok
function getTikTokUrl(raw: string): string | null {
  if (!raw) return null;
  const isTikTok =
    raw.includes('tiktok.com/@') ||
    raw.includes('tiktok.com/v/') ||
    raw.includes('vm.tiktok.com') ||
    raw.includes('vt.tiktok.com');
  return isTikTok ? raw.trim() : null;
}

// ✅ Detect Instagram
function getInstagramUrl(raw: string): string | null {
  if (!raw) return null;
  const isIg =
    raw.includes('instagram.com/p/') ||
    raw.includes('instagram.com/reel/') ||
    raw.includes('instagram.com/tv/');
  return isIg ? raw.trim() : null;
}

// ✅ Detect Zalo
function getZaloUrl(raw: string): string | null {
  if (!raw) return null;
  const isZalo =
    raw.includes('zalo.me') ||
    raw.includes('video.zalo.me') ||
    raw.includes('zalo.com.vn');
  return isZalo ? raw.trim() : null;
}

function timeAgo(dateStr: string): string {
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ`;
  return `${Math.floor(diff / 86400)} ngày`;
}

function formatNum(n: number): string {
  if (!n) return '0';
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1).replace('.0', '') + 'Tr';
  if (n >= 1000) return (n / 1000).toFixed(1).replace('.0', '') + 'K';
  return String(n);
}

// ============================================================
// TYPES
// ============================================================
interface Post {
  id: string;
  user_id: string;
  noi_dung: string;
  content?: string;
  youtube_url: string;
  likes?: number;
  like_count: number;
  comment_count: number;
  share_count: number;
  report_count: number;
  image_url?: string;
  image_urls?: string[];
  status: string;
  created_at: string;
  profiles?: { full_name: string; avatar_url: string };
}

interface Comment {
  id: string;
  post_id: string;
  user_id: string;
  content: string;
  created_at: string;
  profiles?: { full_name: string; avatar_url: string };
}

interface Banner {
  vi_tri: number;
  tieu_de: string;
  tieu_de_phu: string;
  link: string;
}

const PAGE_SIZE = 10;

// ============================================================
// MEDIA GRID
// ============================================================
function MediaGrid({ images, priority = false }: { images: string[]; priority?: boolean }) {
  const imgs = images.slice(0, 3);
  if (imgs.length === 0) return null;

  if (imgs.length === 1) {
    return (
      <div style={{ position: 'relative', width: '100%', height: 300, background: '#000' }}>
        <Image src={imgs[0]} alt="ảnh bài đăng" fill className="object-cover"
          sizes="(max-width: 640px) 100vw, 600px" priority={priority} loading={priority ? 'eager' : 'lazy'} />
      </div>
    );
  }
  if (imgs.length === 2) {
    return (
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, height: 240 }}>
        {imgs.map((src, i) => (
          <div key={i} style={{ position: 'relative', overflow: 'hidden', background: '#000' }}>
            <Image src={src} alt="" fill className="object-cover" sizes="50vw" loading="lazy" />
          </div>
        ))}
      </div>
    );
  }
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 2, height: 280 }}>
      <div style={{ position: 'relative', overflow: 'hidden', background: '#000' }}>
        <Image src={imgs[0]} alt="" fill className="object-cover" sizes="66vw" loading="lazy" />
      </div>
      <div style={{ display: 'grid', gridTemplateRows: '1fr 1fr', gap: 2 }}>
        {imgs.slice(1).map((src, i) => (
          <div key={i} style={{ position: 'relative', overflow: 'hidden', background: '#000' }}>
            <Image src={src} alt="" fill className="object-cover" sizes="33vw" loading="lazy" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ============================================================
// FLOATING VIDEO POPUP
// ============================================================
function FloatingVideoPopup({ ytId, onClose, startX, startY, popupW }: {
  ytId: string; onClose: () => void;
  startX: number; startY: number; popupW: number;
}) {
  const [pos, setPos] = useState({ x: startX, y: startY });
  const dragging = useRef(false);
  const dragOffset = useRef({ x: 0, y: 0 });
  const popupH = Math.round(popupW * 0.5625) + 36;

  useEffect(() => {
    function onMouseMove(e: MouseEvent) {
      if (!dragging.current) return;
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - popupW, e.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - popupH, e.clientY - dragOffset.current.y)),
      });
    }
    function onMouseUp() { dragging.current = false; }
    function onTouchMove(e: TouchEvent) {
      if (!dragging.current) return;
      const t = e.touches[0];
      setPos({
        x: Math.max(0, Math.min(window.innerWidth - popupW, t.clientX - dragOffset.current.x)),
        y: Math.max(0, Math.min(window.innerHeight - popupH, t.clientY - dragOffset.current.y)),
      });
      e.preventDefault();
    }
    function onTouchEnd() { dragging.current = false; }
    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('touchmove', onTouchMove, { passive: false });
    window.addEventListener('touchend', onTouchEnd);
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [popupW, popupH]);

  return (
    <div style={{
      position: 'fixed', left: pos.x, top: pos.y, width: popupW,
      zIndex: 9999, borderRadius: 10, overflow: 'hidden',
      boxShadow: '0 8px 32px rgba(0,0,0,0.6)', background: '#000',
    }}>
      <div
        onMouseDown={e => { dragging.current = true; dragOffset.current = { x: e.clientX - pos.x, y: e.clientY - pos.y }; e.preventDefault(); }}
        onTouchStart={e => { dragging.current = true; const t = e.touches[0]; dragOffset.current = { x: t.clientX - pos.x, y: t.clientY - pos.y }; }}
        style={{ height: 32, background: 'rgba(0,0,0,0.88)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0 10px', cursor: 'grab', userSelect: 'none', touchAction: 'none' }}>
        <span style={{ color: '#777', fontSize: 10 }}>⠿ Kéo</span>
        <button onClick={onClose} style={{ background: 'rgba(255,255,255,0.18)', border: 'none', borderRadius: '50%', color: '#fff', width: 22, height: 22, cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
      </div>
      <div style={{ paddingBottom: '56.25%', position: 'relative' }}>
        <iframe
          src={`https://www.youtube.com/embed/${ytId}?autoplay=1&mute=0&controls=1&loop=1&playlist=${ytId}&rel=0`}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
          allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
          allowFullScreen
        />
      </div>
    </div>
  );
}

// ============================================================
// VIDEO POST — YouTube (giữ nguyên)
// ============================================================
function VideoPost({ ytId }: { ytId: string }) {
  const [popup, setPopup] = useState<{ x: number; y: number; w: number } | null>(null);
  const ref = useRef<HTMLDivElement>(null);

  function openPopup() {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const w = Math.min(560, window.innerWidth - 12);
    const h = Math.round(w * 0.5625) + 32;
    const x = Math.max(6, Math.min(rect.left + rect.width / 2 - w / 2, window.innerWidth - w - 6));
    const y = Math.max(6, Math.min(rect.top + rect.height / 2 - h / 2, window.innerHeight - h - 6));
    setPopup({ x, y, w });
  }

  return (
    <>
      {popup && <FloatingVideoPopup ytId={ytId} onClose={() => setPopup(null)} startX={popup.x} startY={popup.y} popupW={popup.w} />}
      <div ref={ref} onClick={openPopup}
        style={{ paddingBottom: '52%', position: 'relative', background: '#111', cursor: 'pointer', maxHeight: 280, overflow: 'hidden' }}>
        <img src={`https://img.youtube.com/vi/${ytId}/hqdefault.jpg`} loading="lazy" decoding="async"
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} alt="video" />
        <div style={{ position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ width: 48, height: 48, background: 'rgba(0,0,0,0.65)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '9px 0 9px 18px', borderColor: 'transparent transparent transparent #fff', marginLeft: 3 }} />
          </div>
        </div>
      </div>
    </>
  );
}

// ============================================================
// VIDEO POST — Facebook (giữ nguyên)
// ============================================================
function FacebookVideoPost({ url }: { url: string }) {
  const [show, setShow] = useState(false);
  const encodedUrl = encodeURIComponent(url);
  const embedSrc = `https://www.facebook.com/plugins/video.php?href=${encodedUrl}&show_text=false&width=560&mute=0`;

  if (!show) {
    return (
      <div
        onClick={() => setShow(true)}
        style={{
          position: 'relative', background: '#1877f2', cursor: 'pointer',
          height: 220, display: 'flex', flexDirection: 'column',
          alignItems: 'center', justifyContent: 'center', gap: 10,
        }}
      >
        <div style={{ width: 56, height: 56, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
          f
        </div>
        <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Video Facebook</div>
        <div style={{
          background: 'rgba(255,255,255,0.25)', borderRadius: 20,
          padding: '6px 18px', color: '#fff', fontSize: 13, fontWeight: 600,
        }}>
          ▶ Nhấn để xem
        </div>
        <div style={{ position: 'absolute', bottom: 8, fontSize: 10, color: 'rgba(255,255,255,0.6)' }}>
          {url.length > 50 ? url.slice(0, 50) + '...' : url}
        </div>
      </div>
    );
  }

  return (
    <div style={{ position: 'relative', background: '#000', paddingBottom: '56.25%' }}>
      <iframe
        src={embedSrc}
        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 'none' }}
        allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; web-share"
        allowFullScreen
        scrolling="no"
      />
    </div>
  );
}

// ============================================================
// VIDEO POST — TikTok (không embed được, hiện card thân thiện)
// ============================================================
function TikTokPost({ url }: { url: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #010101 0%, #1a1a2e 100%)',
      padding: '20px 16px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 12, position: 'relative', overflow: 'hidden',
    }}>
      <div style={{ position: 'absolute', top: -20, right: -20, width: 100, height: 100, borderRadius: '50%', background: 'rgba(254,44,85,0.15)' }} />
      <div style={{ position: 'absolute', bottom: -15, left: -15, width: 70, height: 70, borderRadius: '50%', background: 'rgba(0,242,234,0.12)' }} />

      <div style={{ display: 'flex', alignItems: 'center', gap: 10, zIndex: 1 }}>
        <div style={{ width: 44, height: 44, background: '#010101', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid rgba(254,44,85,0.4)', flexShrink: 0 }}>
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.95a8.16 8.16 0 004.77 1.52V7.01a4.85 4.85 0 01-1-.32z" fill="#fe2c55"/>
          </svg>
        </div>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Video TikTok</div>
          <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11, marginTop: 2 }}>
            {url.length > 42 ? url.slice(0, 42) + '...' : url}
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: '10px 14px', zIndex: 1, width: '100%', boxSizing: 'border-box' }}>
        <div style={{ color: 'rgba(255,255,255,0.75)', fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>
          ℹ️ <strong style={{ color: '#fff' }}>TikTok không cho phép nhúng trực tiếp.</strong><br />
          Để xem video này bạn cần mở TikTok. Nếu muốn mọi người xem ngay trên trang, hãy <strong style={{ color: '#00f2ea' }}>tải video về rồi đăng lên YouTube</strong> rồi dán link YouTube vào.
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'linear-gradient(90deg,#fe2c55,#ff6b81)', color: '#fff', borderRadius: 8, padding: '9px 0', fontWeight: 700, fontSize: 13, textDecoration: 'none', width: '100%' }}>
          ▶ Xem trên TikTok
        </a>
      </div>
    </div>
  );
}

// ============================================================
// VIDEO POST — Instagram (không embed được)
// ============================================================
function InstagramPost({ url }: { url: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #405de6, #5851db, #833ab4, #c13584, #e1306c, #fd1d1d)',
      padding: '20px 16px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="white">
            <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z"/>
          </svg>
        </div>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Video Instagram</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 }}>
            {url.includes('/reel/') ? 'Reels' : url.includes('/tv/') ? 'IGTV' : 'Post'}
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(0,0,0,0.25)', borderRadius: 10, padding: '10px 14px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>
          ℹ️ <strong style={{ color: '#fff' }}>Instagram không cho nhúng video vào trang ngoài.</strong><br />
          Gợi ý: <strong style={{ color: '#ffe066' }}>Đăng video lên YouTube</strong> rồi dán link YouTube để mọi người xem ngay tại đây.
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(255,255,255,0.25)', color: '#fff', borderRadius: 8, padding: '9px 0', fontWeight: 700, fontSize: 13, textDecoration: 'none', width: '100%' }}>
          ▶ Xem trên Instagram
        </a>
      </div>
    </div>
  );
}

// ============================================================
// VIDEO POST — Zalo (không embed được)
// ============================================================
function ZaloPost({ url }: { url: string }) {
  return (
    <div style={{
      background: 'linear-gradient(135deg, #0068ff 0%, #0052cc 100%)',
      padding: '20px 16px', display: 'flex', flexDirection: 'column',
      alignItems: 'center', gap: 12,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{ width: 44, height: 44, background: 'rgba(255,255,255,0.2)', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, color: '#fff', fontWeight: 900, fontSize: 18, letterSpacing: -1 }}>
          Z
        </div>
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>Video Zalo</div>
          <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11, marginTop: 2 }}>
            {url.length > 42 ? url.slice(0, 42) + '...' : url}
          </div>
        </div>
      </div>

      <div style={{ background: 'rgba(0,0,0,0.2)', borderRadius: 10, padding: '10px 14px', width: '100%', boxSizing: 'border-box' }}>
        <div style={{ color: 'rgba(255,255,255,0.85)', fontSize: 12, lineHeight: 1.5, marginBottom: 8 }}>
          ℹ️ <strong style={{ color: '#fff' }}>Zalo không hỗ trợ nhúng video vào web.</strong><br />
          Gợi ý: <strong style={{ color: '#ffe066' }}>Tải video về và đăng lên YouTube</strong> để mọi người trong cộng đồng xem trực tiếp mà không cần rời trang.
        </div>
        <a href={url} target="_blank" rel="noopener noreferrer"
          style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, background: 'rgba(255,255,255,0.2)', color: '#fff', borderRadius: 8, padding: '9px 0', fontWeight: 700, fontSize: 13, textDecoration: 'none', width: '100%' }}>
          ▶ Xem trên Zalo
        </a>
      </div>
    </div>
  );
}

// ============================================================
// POST CONTENT
// ============================================================
function PostContent({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = text.length > 180 || text.split('\n').length > 3;
  const preview = isLong && !expanded ? text.slice(0, 180) : text;

  return (
    <div style={{ padding: '6px 12px 8px', fontSize: 14, lineHeight: 1.5, color: '#050505' }}>
      <span style={{ whiteSpace: 'pre-wrap' }}>{preview}</span>
      {isLong && !expanded && '... '}
      {isLong && (
        <button onClick={() => setExpanded(e => !e)}
          style={{ background: 'none', border: 'none', color: '#65676b', fontWeight: 700, fontSize: 13, cursor: 'pointer', padding: 0 }}>
          {expanded ? 'Thu gọn' : 'Xem thêm'}
        </button>
      )}
    </div>
  );
}

// ============================================================
// POST MENU
// ============================================================
function PostMenu({ post, currentUserId, onDelete, onReport }: {
  post: Post; currentUserId: string | null; onDelete: () => void; onReport: () => void;
}) {
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState(post.noi_dung || '');
  const menuRef = useRef<HTMLDivElement>(null);
  const isAuthor = currentUserId === post.user_id;

  useEffect(() => {
    function h(e: MouseEvent) { if (menuRef.current && !menuRef.current.contains(e.target as Node)) setOpen(false); }
    if (open) document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, [open]);

  async function handleEdit() {
    if (!editText.trim()) return;
    await supabase.from('posts').update({ noi_dung: editText.trim() }).eq('id', post.id);
    setEditing(false); setOpen(false); window.location.reload();
  }

  async function handleDelete() {
    if (!confirm('Bạn chắc chắn muốn xóa?')) return;
    await supabase.from('posts').delete().eq('id', post.id);
    setOpen(false); onDelete();
  }

  return (
    <div ref={menuRef} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)}
        style={{ background: '#f0f2f5', border: 'none', borderRadius: '50%', width: 32, height: 32, cursor: 'pointer', fontSize: 18, color: '#65676b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        ···
      </button>
      {open && (
        <div style={{ position: 'absolute', right: 0, top: 36, background: '#fff', borderRadius: 8, boxShadow: '0 4px 20px rgba(0,0,0,0.18)', minWidth: 200, zIndex: 200, overflow: 'hidden' }}>
          {isAuthor ? (
            <>
              <button onClick={() => { setEditing(true); setOpen(false); }}
                style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
                ✏️ Chỉnh sửa
              </button>
              <button onClick={handleDelete}
                style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 13, color: '#e74c3c', display: 'flex', alignItems: 'center', gap: 10 }}>
                🗑️ Xóa bài viết
              </button>
            </>
          ) : (
            <button onClick={() => { onReport(); setOpen(false); }}
              style={{ width: '100%', padding: '10px 14px', border: 'none', background: 'none', textAlign: 'left', cursor: 'pointer', fontSize: 13, display: 'flex', alignItems: 'center', gap: 10 }}>
              ⚠️ Báo cáo
            </button>
          )}
        </div>
      )}
      {editing && (
        <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 12px' }}>
          <div style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 460, padding: 16 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
              <span style={{ fontWeight: 700, fontSize: 15 }}>Chỉnh sửa bài viết</span>
              <button onClick={() => setEditing(false)} style={{ background: '#e4e6ea', border: 'none', borderRadius: '50%', width: 26, height: 26, cursor: 'pointer' }}>×</button>
            </div>
            <textarea value={editText} onChange={e => setEditText(e.target.value)} rows={5}
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: 10, fontSize: 14, resize: 'none', outline: 'none', boxSizing: 'border-box' }} />
            <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
              <button onClick={() => setEditing(false)} style={{ flex: 1, padding: 9, border: '1px solid #ddd', borderRadius: 7, background: '#fff', cursor: 'pointer', fontSize: 13 }}>Hủy</button>
              <button onClick={handleEdit} style={{ flex: 1, padding: 9, border: 'none', borderRadius: 7, background: '#c0392b', color: '#fff', cursor: 'pointer', fontWeight: 700, fontSize: 13 }}>Lưu</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// POST CARD
// ============================================================
interface PostCardProps {
  post: Post; comments: Comment[]; liked: boolean; expanded: boolean;
  commentInput: string; currentUserAvatar: string; currentUserId: string | null;
  priority?: boolean;
  onLike: () => void; onToggleComments: () => void;
  onCommentChange: (v: string) => void; onCommentSubmit: () => void;
  onShare: () => void; onReport: () => void; onDelete: () => void;
}

function PostCard({ post, comments, liked, expanded, commentInput, currentUserAvatar, currentUserId, priority = false, onLike, onToggleComments, onCommentChange, onCommentSubmit, onShare, onReport, onDelete }: PostCardProps) {
  const ytId = getYoutubeId(post.youtube_url);
  const fbUrl = !ytId ? getFacebookVideoUrl(post.youtube_url) : null;
  const ttUrl = !ytId && !fbUrl ? getTikTokUrl(post.youtube_url) : null;
  const igUrl = !ytId && !fbUrl && !ttUrl ? getInstagramUrl(post.youtube_url) : null;
  const zaloUrl = !ytId && !fbUrl && !ttUrl && !igUrl ? getZaloUrl(post.youtube_url) : null;

  const avatarUrl = post.profiles?.avatar_url
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(post.profiles?.full_name || 'U')}&background=8B0000&color=fff`;
  const name = post.profiles?.full_name || 'Người dùng';
  const postText = post.noi_dung || post.content || '';
  const likeCount = post.like_count ?? post.likes ?? 0;
  const images: string[] = post.image_urls?.length
    ? post.image_urls.slice(0, 3)
    : post.image_url ? [post.image_url] : [];

  return (
    <div id={`post-${post.id}`} style={{ background: '#fff', marginBottom: 8, boxShadow: '0 1px 0 rgba(0,0,0,0.08)' }}>
      {/* Header */}
      <div style={{ padding: '10px 12px 4px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <img src={avatarUrl} loading="lazy" decoding="async"
            style={{ width: 36, height: 36, borderRadius: '50%', border: '1.5px solid #e4e6ea', flexShrink: 0, objectFit: 'cover' }}
            alt={name} />
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#050505', lineHeight: 1.2 }}>{name}</div>
            <div style={{ fontSize: 11, color: '#65676b', marginTop: 1 }}>{timeAgo(post.created_at)} trước</div>
          </div>
        </div>
        <PostMenu post={post} currentUserId={currentUserId} onDelete={onDelete} onReport={onReport} />
      </div>

      {postText.length > 0 && <PostContent text={postText} />}

      {/* Media — ưu tiên: ảnh > YouTube > Facebook > TikTok > Instagram > Zalo */}
      {images.length > 0 && <MediaGrid images={images} priority={priority} />}
      {!images.length && ytId && <VideoPost ytId={ytId} />}
      {!images.length && !ytId && fbUrl && <FacebookVideoPost url={fbUrl} />}
      {!images.length && !ytId && !fbUrl && ttUrl && <TikTokPost url={ttUrl} />}
      {!images.length && !ytId && !fbUrl && !ttUrl && igUrl && <InstagramPost url={igUrl} />}
      {!images.length && !ytId && !fbUrl && !ttUrl && !igUrl && zaloUrl && <ZaloPost url={zaloUrl} />}

      {/* Counts */}
      {(likeCount > 0 || post.comment_count > 0) && (
        <div style={{ padding: '5px 12px', display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid #e4e6ea' }}>
          {likeCount > 0 && (
            <span style={{ fontSize: 12, color: '#65676b', display: 'flex', alignItems: 'center', gap: 3 }}>
              <span style={{ background: 'linear-gradient(135deg,#c0392b,#e74c3c)', borderRadius: '50%', width: 16, height: 16, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', fontSize: 9, color: '#fff' }}>👍</span>
              {formatNum(likeCount)}
            </span>
          )}
          {post.comment_count > 0 && (
            <span style={{ fontSize: 12, color: '#65676b', marginLeft: 'auto' }}>{formatNum(post.comment_count)} bình luận</span>
          )}
        </div>
      )}

      {/* Actions */}
      <div style={{ display: 'flex', borderBottom: expanded ? '1px solid #e4e6ea' : 'none' }}>
        {[
          { label: 'Thích', color: liked ? '#c0392b' : '#65676b', weight: liked ? 700 : 400, action: onLike },
          { label: 'Bình luận', color: '#65676b', weight: 400, action: onToggleComments },
          { label: 'Chia sẻ', color: '#65676b', weight: 400, action: onShare },
        ].map(btn => (
          <button key={btn.label} onClick={btn.action}
            style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '7px 4px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, fontWeight: btn.weight, color: btn.color }}>
            {btn.label}
          </button>
        ))}
      </div>

      {/* Comments */}
      {expanded && (
        <div style={{ padding: '8px 12px 10px' }}>
          {comments.length === 0 && (
            <p style={{ color: '#8a8d91', fontSize: 12, margin: '0 0 8px', textAlign: 'center' }}>Chưa có bình luận</p>
          )}
          {comments.map(c => (
            <div key={c.id} style={{ display: 'flex', gap: 7, marginBottom: 8 }}>
              <img src={c.profiles?.avatar_url || `https://ui-avatars.com/api/?name=U&background=8B0000&color=fff`}
                loading="lazy" style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} alt="" />
              <div>
                <div style={{ background: '#f0f2f5', borderRadius: 14, padding: '6px 11px', display: 'inline-block' }}>
                  <div style={{ fontWeight: 700, fontSize: 12, color: '#050505' }}>{c.profiles?.full_name || 'Người dùng'}</div>
                  <div style={{ fontSize: 13, color: '#050505', marginTop: 1 }}>{c.content}</div>
                </div>
                <div style={{ fontSize: 10, color: '#8a8d91', marginTop: 2, paddingLeft: 4 }}>{timeAgo(c.created_at)} trước</div>
              </div>
            </div>
          ))}
          <div style={{ display: 'flex', gap: 7, alignItems: 'center', marginTop: 6 }}>
            <img src={currentUserAvatar} loading="lazy"
              style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0, objectFit: 'cover' }} alt="" />
            <div style={{ flex: 1, background: '#f0f2f5', borderRadius: 18, padding: '7px 12px', display: 'flex', alignItems: 'center', gap: 6 }}>
              <input value={commentInput} onChange={e => onCommentChange(e.target.value)}
                onKeyDown={e => e.key === 'Enter' && onCommentSubmit()}
                placeholder="Viết bình luận..."
                style={{ flex: 1, border: 'none', background: 'none', outline: 'none', fontSize: 13, color: '#050505' }} />
              <button onClick={onCommentSubmit}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#c0392b', fontSize: 15, padding: 0 }}>
                ➤
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================
// CREATE POST BAR
// ============================================================
function CreatePostBar({ userAvatar, onOpen }: { userAvatar: string; onOpen: () => void }) {
  return (
    <div style={{ background: '#fff', padding: '8px 12px', marginBottom: 8, boxShadow: '0 1px 0 rgba(0,0,0,0.08)' }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <img src={userAvatar} loading="lazy"
          style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} alt="" />
        <div onClick={onOpen}
          style={{ flex: 1, background: '#f0f2f5', borderRadius: 20, padding: '8px 14px', cursor: 'pointer', color: '#65676b', fontSize: 14, border: '1px solid #e4e6ea' }}>
          Bạn đang nghĩ gì? 🐓
        </div>
      </div>
      <div style={{ display: 'flex', borderTop: '1px solid #e4e6ea', marginTop: 8, paddingTop: 4 }}>
        <button onClick={onOpen} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '5px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#65676b', fontWeight: 600 }}>
          📷 <span>Ảnh/Video</span>
        </button>
        <button onClick={onOpen} style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 5, padding: '5px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 13, color: '#65676b', fontWeight: 600 }}>
          ✍️ <span>Viết bài</span>
        </button>
      </div>
    </div>
  );
}

// ============================================================
// CREATE POST MODAL
// ============================================================
function CreatePostModal({ user, userAvatar, userName, onSubmit, onClose }: {
  user: any; userAvatar: string; userName: string;
  onSubmit: (content: string, youtube: string, images: File[]) => Promise<void>;
  onClose: () => void;
}) {
  const [postContent, setPostContent] = useState('');
  const [postYoutube, setPostYoutube] = useState('');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [imagePreviews, setImagePreviews] = useState<string[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const popupRef = useRef<HTMLDivElement>(null);

  const ytIdPreview = getYoutubeId(postYoutube);
  const fbUrlPreview = !ytIdPreview ? getFacebookVideoUrl(postYoutube) : null;
  const ttUrlPreview = !ytIdPreview && !fbUrlPreview ? getTikTokUrl(postYoutube) : null;
  const igUrlPreview = !ytIdPreview && !fbUrlPreview && !ttUrlPreview ? getInstagramUrl(postYoutube) : null;
  const zaloUrlPreview = !ytIdPreview && !fbUrlPreview && !ttUrlPreview && !igUrlPreview ? getZaloUrl(postYoutube) : null;

  function handleImages(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files || []).slice(0, 3);
    setImageFiles(files);
    setImagePreviews(files.map(f => URL.createObjectURL(f)));
  }

  async function handleSubmit() {
    if (!postContent.trim()) return;
    setSubmitting(true);
    await onSubmit(postContent, postYoutube, imageFiles);
    setSubmitting(false);
  }

  useEffect(() => {
    function h(e: MouseEvent) { if (popupRef.current && !popupRef.current.contains(e.target as Node)) onClose(); }
    document.addEventListener('mousedown', h);
    return () => document.removeEventListener('mousedown', h);
  }, []);

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 8px' }}>
      <div ref={popupRef} style={{ background: '#fff', borderRadius: 10, width: '100%', maxWidth: 500, maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 8px 32px rgba(0,0,0,0.25)' }}>
        <div style={{ padding: '12px 14px', borderBottom: '1px solid #e4e6ea', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 1 }}>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#050505' }}>Tạo bài viết</span>
          <button onClick={onClose} style={{ background: '#e4e6ea', border: 'none', borderRadius: '50%', width: 28, height: 28, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>×</button>
        </div>
        <div style={{ padding: '12px 14px' }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 10 }}>
            <img src={userAvatar} style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} alt="" />
            <span style={{ fontWeight: 600, fontSize: 14, color: '#050505' }}>{userName}</span>
          </div>
          <textarea value={postContent} onChange={e => setPostContent(e.target.value)}
            placeholder="Bạn đang nghĩ gì? 🐓" autoFocus
            style={{ width: '100%', minHeight: 100, border: 'none', outline: 'none', resize: 'none', fontSize: 16, fontFamily: 'inherit', boxSizing: 'border-box', color: '#050505', lineHeight: 1.5 }} />

          {/* Preview ảnh */}
          {imagePreviews.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: imagePreviews.length === 1 ? '1fr' : '1fr 1fr', gap: 4, marginTop: 8, borderRadius: 8, overflow: 'hidden' }}>
              {imagePreviews.map((src, i) => (
                <div key={i} style={{ position: 'relative' }}>
                  <img src={src} style={{ width: '100%', height: 120, objectFit: 'cover', display: 'block' }} alt="" />
                  <button onClick={() => { setImageFiles(p => p.filter((_, idx) => idx !== i)); setImagePreviews(p => p.filter((_, idx) => idx !== i)); }}
                    style={{ position: 'absolute', top: 4, right: 4, background: 'rgba(0,0,0,0.55)', color: '#fff', border: 'none', borderRadius: '50%', width: 22, height: 22, cursor: 'pointer', fontSize: 12 }}>×</button>
                </div>
              ))}
            </div>
          )}

          {/* Preview video link trong modal */}
          {postYoutube && !imagePreviews.length && (
            <div style={{ marginTop: 8, borderRadius: 8, overflow: 'hidden', border: '1px solid #e4e6ea', display: 'flex', flexDirection: 'column', gap: 0 }}>
              {ytIdPreview && (
                <div style={{ position: 'relative', paddingBottom: '52%', background: '#000' }}>
                  <img src={`https://img.youtube.com/vi/${ytIdPreview}/hqdefault.jpg`}
                    style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} alt="preview" />
                  <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <div style={{ width: 40, height: 40, background: 'rgba(0,0,0,0.6)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '8px 0 8px 16px', borderColor: 'transparent transparent transparent #fff', marginLeft: 3 }} />
                    </div>
                  </div>
                  <div style={{ position: 'absolute', top: 6, left: 6, background: '#ff0000', color: '#fff', fontSize: 10, fontWeight: 700, padding: '2px 6px', borderRadius: 3 }}>YouTube</div>
                </div>
              )}
              {fbUrlPreview && (
                <div style={{ background: '#1877f2', padding: '12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.2)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 18, flexShrink: 0 }}>f</div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Video Facebook</div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Sẽ hiển thị khi đăng</div>
                  </div>
                  <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '4px 10px', color: '#fff', fontSize: 11 }}>✓ Hợp lệ</div>
                </div>
              )}
              {ttUrlPreview && (
                <div style={{ background: '#010101', padding: '12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, background: 'rgba(254,44,85,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                      <path d="M19.59 6.69a4.83 4.83 0 01-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 01-2.88 2.5 2.89 2.89 0 01-2.89-2.89 2.89 2.89 0 012.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 00-.79-.05 6.34 6.34 0 00-6.34 6.34 6.34 6.34 0 006.34 6.34 6.34 6.34 0 006.33-6.34V8.95a8.16 8.16 0 004.77 1.52V7.01a4.85 4.85 0 01-1-.32z" fill="#fe2c55"/>
                    </svg>
                  </div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Video TikTok</div>
                    <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 11 }}>Sẽ hiện nút mở TikTok (không nhúng được)</div>
                  </div>
                  <div style={{ marginLeft: 'auto', background: 'rgba(254,44,85,0.2)', borderRadius: 12, padding: '4px 10px', color: '#fe2c55', fontSize: 11, fontWeight: 700 }}>✓</div>
                </div>
              )}
              {igUrlPreview && (
                <div style={{ background: 'linear-gradient(90deg,#833ab4,#e1306c)', padding: '12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 12, flexShrink: 0 }}>IG</div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Video Instagram</div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Sẽ hiện nút mở Instagram (không nhúng được)</div>
                  </div>
                  <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '4px 10px', color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</div>
                </div>
              )}
              {zaloUrlPreview && (
                <div style={{ background: '#0068ff', padding: '12px', display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, background: 'rgba(255,255,255,0.2)', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 900, fontSize: 16, flexShrink: 0 }}>Z</div>
                  <div>
                    <div style={{ color: '#fff', fontWeight: 700, fontSize: 13 }}>Video Zalo</div>
                    <div style={{ color: 'rgba(255,255,255,0.7)', fontSize: 11 }}>Sẽ hiện nút mở Zalo (không nhúng được)</div>
                  </div>
                  <div style={{ marginLeft: 'auto', background: 'rgba(255,255,255,0.2)', borderRadius: 12, padding: '4px 10px', color: '#fff', fontSize: 11, fontWeight: 700 }}>✓</div>
                </div>
              )}
              {postYoutube && !ytIdPreview && !fbUrlPreview && !ttUrlPreview && !igUrlPreview && !zaloUrlPreview && (
                <div style={{ padding: '10px 12px', background: '#fff8e1', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 16 }}>⚠️</span>
                  <span style={{ fontSize: 12, color: '#856404' }}>Link không nhận dạng được — hỗ trợ YouTube, Facebook, TikTok, Instagram, Zalo</span>
                </div>
              )}
            </div>
          )}

          <div style={{ border: '1px solid #e4e6ea', borderRadius: 8, padding: '10px 12px', marginTop: 10, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ fontSize: 13, fontWeight: 600, color: '#050505' }}>Thêm vào bài viết</span>
            <button onClick={() => fileInputRef.current?.click()} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 20, padding: '0 4px' }}>📷</button>
          </div>
          <input ref={fileInputRef} type="file" accept="image/*" multiple style={{ display: 'none' }} onChange={handleImages} />

          <input value={postYoutube} onChange={e => setPostYoutube(e.target.value)}
            placeholder="🎬 Link YouTube, Facebook, TikTok, Instagram, Zalo... (không bắt buộc)"
            style={{ width: '100%', border: '1px solid #ddd', borderRadius: 8, padding: '8px 12px', fontSize: 13, marginTop: 8, boxSizing: 'border-box', outline: 'none', color: '#555' }} />

          <button onClick={handleSubmit} disabled={submitting || !postContent.trim()}
            style={{ width: '100%', marginTop: 10, padding: '11px', background: !postContent.trim() || submitting ? '#bcc0c4' : '#c0392b', color: '#fff', border: 'none', borderRadius: 8, fontWeight: 700, fontSize: 15, cursor: postContent.trim() && !submitting ? 'pointer' : 'not-allowed' }}>
            {submitting ? 'Đang đăng...' : 'Đăng'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ============================================================
// MAIN PAGE
// ============================================================
export default function CongDongPage() {
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<Post[]>([]);
  const [comments, setComments] = useState<Record<string, Comment[]>>({});
  const [likedPosts, setLikedPosts] = useState<Record<string, boolean>>({});
  const [expandedComments, setExpandedComments] = useState<Record<string, boolean>>({});
  const [commentInputs, setCommentInputs] = useState<Record<string, string>>({});
  const [showPopup, setShowPopup] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [fetchError, setFetchError] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [page, setPage] = useState(0);
  const [sortBy, setSortBy] = useState<'newest' | 'hot'>('newest');
  const [hotPosts, setHotPosts] = useState<Post[]>([]);
  const [featuredVideos, setFeaturedVideos] = useState<any[]>([]);
  const [topSuKe, setTopSuKe] = useState<any[]>([]);
  const [banners, setBanners] = useState<Banner[]>([]);
  const bannerColors = ['#7B1818', '#1a3a6e', '#4a1a00'];
  const bannerEmojis = ['💊', '🥚', '🌾'];
  const loaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data?.user ?? null));
  }, []);

  useEffect(() => {
    setPosts([]); setPage(0); setHasMore(true); fetchPosts(0, true);
  }, [sortBy]);

  useEffect(() => { fetchSidebarData(); }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { if (entries[0].isIntersecting && hasMore && !loadingMore && !loading) loadMore(); },
      { threshold: 0.1 }
    );
    if (loaderRef.current) observer.observe(loaderRef.current);
    return () => observer.disconnect();
  }, [hasMore, loadingMore, loading, page]);

  async function fetchPosts(pageNum: number, reset = false) {
    if (pageNum === 0) setLoading(true); else setLoadingMore(true);
    const from = pageNum * PAGE_SIZE;
    const to = from + PAGE_SIZE - 1;
    let query = supabase.from('posts').select('*').eq('status', 'active');
    query = sortBy === 'newest'
      ? query.order('created_at', { ascending: false })
      : query.order('like_count', { ascending: false });
    const { data, error } = await query.range(from, to);
    if (error) {
      console.error(error.message);
      if (pageNum === 0) setFetchError(true);
      setLoading(false); setLoadingMore(false); return;
    }
    setFetchError(false);
    if (data && data.length > 0) {
      const userIds = [...new Set(data.map((p: any) => p.user_id))];
      const { data: profilesData } = await supabase.from('profiles').select('id, full_name, avatar_url').in('id', userIds);
      const profileMap: Record<string, any> = {};
      profilesData?.forEach((p: any) => { profileMap[p.id] = p; });
      const newPosts = data.map((p: any) => ({ ...p, profiles: profileMap[p.user_id] || null })) as Post[];
      setPosts(prev => reset ? newPosts : [...prev, ...newPosts]);
      setHasMore(data.length === PAGE_SIZE);
      setPage(pageNum + 1);
    } else {
      if (reset) setPosts([]);
      setHasMore(false);
    }
    setLoading(false); setLoadingMore(false);
  }

  function loadMore() { if (!loadingMore && hasMore) fetchPosts(page); }

  async function fetchSidebarData() {
    const [hotRes, vidRes, suKeRes, bannerRes] = await Promise.all([
      supabase.from('posts').select('id, noi_dung, like_count').eq('status', 'active').order('like_count', { ascending: false }).limit(5),
      supabase.from('videos').select('*').limit(5),
      supabase.from('profiles').select('id, username, avatar_url, trust_score').order('trust_score', { ascending: false }).limit(5),
      supabase.from('banners').select('*').order('vi_tri'),
    ]);
    if (hotRes.data) setHotPosts(hotRes.data as Post[]);
    if (vidRes.data) setFeaturedVideos(vidRes.data);
    if (suKeRes.data) setTopSuKe(suKeRes.data);
    if (bannerRes.data && bannerRes.data.length > 0) setBanners(bannerRes.data);
  }

  async function fetchComments(postId: string) {
    const { data } = await supabase.from('comments')
      .select('*, profiles(full_name, avatar_url)').eq('post_id', postId).order('created_at', { ascending: true });
    if (data) setComments(prev => ({ ...prev, [postId]: data as Comment[] }));
  }

  async function handleSubmitPost(content: string, youtube: string, images: File[]) {
    if (!user) return;
    let cleanYoutube = youtube.trim();
    if (cleanYoutube.includes('<iframe')) {
      const m = cleanYoutube.match(/src=["']([^"']+)["']/);
      cleanYoutube = m ? m[1] : '';
    }
    const uploadedUrls: string[] = [];
    for (const file of images.slice(0, 3)) {
      const ext = file.name.split('.').pop();
      const fileName = `posts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { data: up, error: upErr } = await supabase.storage.from('images').upload(fileName, file, { upsert: true });
      if (!upErr && up) {
        const { data: urlData } = supabase.storage.from('images').getPublicUrl(fileName);
        uploadedUrls.push(urlData.publicUrl);
      }
    }
    const { data, error } = await supabase.from('posts').insert({
      user_id: user.id, noi_dung: content.trim(), youtube_url: cleanYoutube,
      image_url: uploadedUrls[0] || null,
      image_urls: uploadedUrls.length > 0 ? uploadedUrls : null,
      comment_count: 0, share_count: 0, report_count: 0, status: 'active',
    }).select().single();
    if (error) { alert(`❌ Lỗi: ${error.message}`); return; }
    if (data) {
      setPosts(prev => [{
        ...data, noi_dung: content.trim(),
        image_url: uploadedUrls[0] || null, image_urls: uploadedUrls, like_count: 0,
        profiles: { full_name: user.user_metadata?.full_name || 'Bạn', avatar_url: user.user_metadata?.avatar_url || '' },
      } as Post, ...prev]);
      setShowPopup(false);
    }
  }

  async function likePost(postId: string) {
    if (!user) return;
    const already = likedPosts[postId];
    setLikedPosts(prev => ({ ...prev, [postId]: !already }));
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, like_count: (p.like_count ?? 0) + (already ? -1 : 1) } : p));
    await supabase.rpc('toggle_like', { post_id: postId, delta: already ? -1 : 1 });
  }

  async function submitComment(postId: string) {
    const text = commentInputs[postId]?.trim();
    if (!text || !user) return;
    const { data } = await supabase.from('comments').insert({ post_id: postId, user_id: user.id, content: text })
      .select('*, profiles(full_name, avatar_url)').single();
    if (data) {
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data as Comment] }));
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comment_count: p.comment_count + 1 } : p));
      setCommentInputs(prev => ({ ...prev, [postId]: '' }));
    }
  }

  function toggleComments(postId: string) {
    const next = !expandedComments[postId];
    setExpandedComments(prev => ({ ...prev, [postId]: next }));
    if (next && !comments[postId]) fetchComments(postId);
  }

  function sharePost(postId: string) {
    const url = `${window.location.origin}/cong-dong?post=${postId}`;
    navigator.clipboard?.writeText(url).then(() => alert('✅ Đã copy link!'));
  }

  async function reportPost(postId: string) {
    if (!user) return;
    await supabase.rpc('report_post', { post_id: postId });
    alert('Đã báo cáo. Cảm ơn!');
  }

  const userAvatar = user?.user_metadata?.avatar_url
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.user_metadata?.full_name || 'U')}&background=8B0000&color=fff`;
  const userName = user?.user_metadata?.full_name || 'Bạn';
  const currentUserId = user?.id ?? null;

  return (
    <div style={{ backgroundColor: '#f0f2f5', minHeight: '100vh', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>
      {showPopup && (
        <CreatePostModal user={user} userAvatar={userAvatar} userName={userName}
          onSubmit={handleSubmitPost} onClose={() => setShowPopup(false)} />
      )}

      <div className="cgv-grid" style={{ maxWidth: 1200, margin: '0 auto', display: 'grid', gridTemplateColumns: '240px 1fr 280px', gap: 16, padding: '12px 10px', alignItems: 'start' }}>

        {/* LEFT SIDEBAR */}
        <aside className="cgv-left" style={{ position: 'sticky', top: 60, height: 'fit-content' }}>
          <div style={{ background: '#fff', borderRadius: 10, overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.1)', marginBottom: 10 }}>
            {[
              { href: '/', icon: '🏠', label: 'Trang chủ' },
              { href: '/cong-dong', icon: '👥', label: 'Cộng đồng', active: true },
              { href: '/cho', icon: '🐓', label: 'Gà đang bán' },
              { href: '/thu-vien', icon: '🎬', label: 'Video' },
              { href: '/thu-vien', icon: '📚', label: 'Kiến thức' },
            ].map((item, idx) => (
              <Link key={idx} href={item.href} style={{ textDecoration: 'none' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 14px', background: item.active ? '#fdf0f0' : 'transparent', borderLeft: `3px solid ${item.active ? '#c0392b' : 'transparent'}`, color: item.active ? '#c0392b' : '#333', fontWeight: item.active ? 700 : 400, fontSize: 13 }}>
                  <span style={{ fontSize: 15 }}>{item.icon}</span>{item.label}
                </div>
              </Link>
            ))}
          </div>
          <div style={{ background: '#fff', borderRadius: 10, padding: 12, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: 700, color: '#c0392b', fontSize: 12, marginBottom: 8 }}>🏆 Top sự kê uy tín</div>
            {topSuKe.map((sk, i) => {
              const skName = sk.username || 'Người dùng';
              const av = sk.avatar_url || `https://ui-avatars.com/api/?name=${encodeURIComponent(skName)}&background=8B0000&color=fff`;
              return (
                <Link key={sk.id} href={`/ho-so/${sk.id}`} style={{ textDecoration: 'none' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 7 }}>
                    <div style={{ position: 'relative', flexShrink: 0 }}>
                      <img src={av} loading="lazy" style={{ width: 30, height: 30, borderRadius: '50%', objectFit: 'cover' }} alt={skName} />
                      {i === 0 && <span style={{ position: 'absolute', top: -3, right: -3, fontSize: 9 }}>👑</span>}
                    </div>
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 600, color: '#333' }}>{skName}</div>
                      {sk.trust_score > 0 && <div style={{ fontSize: 10, color: '#c0392b' }}>⭐ {sk.trust_score}</div>}
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        </aside>

        {/* CENTER FEED */}
        <main style={{ minWidth: 0 }}>
          <CreatePostBar userAvatar={userAvatar}
            onOpen={() => user ? setShowPopup(true) : alert('Vui lòng đăng nhập!')} />

          <div style={{ background: '#fff', padding: '6px 12px', marginBottom: 8, display: 'flex', gap: 6, boxShadow: '0 1px 0 rgba(0,0,0,0.08)' }}>
            {([['newest', '🕐 Mới nhất'], ['hot', '🔥 Nổi bật']] as const).map(([v, l]) => (
              <button key={v} onClick={() => setSortBy(v)}
                style={{ padding: '5px 12px', borderRadius: 16, border: 'none', background: sortBy === v ? '#fdf0f0' : '#f0f2f5', color: sortBy === v ? '#c0392b' : '#65676b', fontWeight: sortBy === v ? 700 : 500, fontSize: 12, cursor: 'pointer' }}>
                {l}
              </button>
            ))}
          </div>

          {loading && (
            <div style={{ background: '#fff', padding: 28, textAlign: 'center', color: '#8a8d91', fontSize: 13 }}>
              <div style={{ width: 28, height: 28, border: '3px solid #e4e6ea', borderTop: '3px solid #c0392b', borderRadius: '50%', margin: '0 auto 8px', animation: 'spin 0.8s linear infinite' }} />
              Đang tải bài viết...
            </div>
          )}

          {!loading && fetchError && (
            <div style={{ background: '#fff', padding: 32, textAlign: 'center', borderRadius: 10 }}>
              <div style={{ fontSize: 36, marginBottom: 8 }}>⚠️</div>
              <p style={{ color: '#555', marginBottom: 12, fontSize: 14 }}>Không tải được bài viết. Kiểm tra kết nối và thử lại.</p>
              <button
                onClick={() => { setPosts([]); setPage(0); setHasMore(true); fetchPosts(0, true); }}
                style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: 7, padding: '9px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}
              >
                Tải lại
              </button>
            </div>
          )}

          {!loading && posts.map((post, index) => (
            <PostCard key={post.id} post={post} comments={comments[post.id] || []}
              liked={!!likedPosts[post.id]} expanded={!!expandedComments[post.id]}
              commentInput={commentInputs[post.id] || ''} currentUserAvatar={userAvatar}
              currentUserId={currentUserId} priority={index === 0}
              onLike={() => likePost(post.id)}
              onToggleComments={() => toggleComments(post.id)}
              onCommentChange={v => setCommentInputs(prev => ({ ...prev, [post.id]: v }))}
              onCommentSubmit={() => submitComment(post.id)}
              onShare={() => sharePost(post.id)}
              onReport={() => reportPost(post.id)}
              onDelete={() => setPosts(prev => prev.filter(p => p.id !== post.id))}
            />
          ))}

          <div ref={loaderRef} style={{ height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {loadingMore && (
              <div style={{ width: 24, height: 24, border: '3px solid #e4e6ea', borderTop: '3px solid #c0392b', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
            )}
            {!hasMore && posts.length > 0 && (
              <p style={{ color: '#8a8d91', fontSize: 12 }}>Đã xem hết bài viết</p>
            )}
          </div>

          {!loading && posts.length === 0 && (
            <div style={{ background: '#fff', padding: 40, textAlign: 'center', borderRadius: 10 }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>📝</div>
              <p style={{ color: '#8a8d91', marginBottom: 12, fontSize: 14 }}>Chưa có bài viết nào</p>
              <button onClick={() => setShowPopup(true)} style={{ background: '#c0392b', color: '#fff', border: 'none', borderRadius: 7, padding: '9px 20px', fontWeight: 700, cursor: 'pointer', fontSize: 13 }}>
                Viết bài đầu tiên
              </button>
            </div>
          )}
        </main>

        {/* RIGHT SIDEBAR */}
        <aside className="cgv-right" style={{ position: 'sticky', top: 60, height: 'fit-content' }}>
          <div style={{ background: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, marginBottom: 8 }}>🎬 Video nổi bật</div>
            {featuredVideos.length === 0
              ? <p style={{ color: '#aaa', fontSize: 12 }}>Chưa có video</p>
              : featuredVideos.map((v: any) => {
                const ytRaw = v.youtube_url || v.embed_url || v.video_url || v.url || v.link || '';
                const ytId = getYoutubeId(ytRaw);
                if (!ytId) return null;
                const title = v.tieu_de || v.title || v.ten || 'Video';
                const thumb = v.thumbnail || v.anh_dai_dien || v.image_url || `https://img.youtube.com/vi/${ytId}/mqdefault.jpg`;
                return (
                  <div key={v.id} style={{ marginBottom: 8 }}>
                    <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', background: '#000', paddingBottom: '56.25%' }}>
                      <img src={thumb} loading="lazy" decoding="async"
                        style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }} alt={title} />
                      <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ background: 'rgba(0,0,0,0.55)', borderRadius: '50%', width: 26, height: 26, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                          <div style={{ width: 0, height: 0, borderStyle: 'solid', borderWidth: '5px 0 5px 10px', borderColor: 'transparent transparent transparent #fff', marginLeft: 2 }} />
                        </div>
                      </div>
                    </div>
                    <p style={{ margin: '3px 0 0', fontSize: 11, fontWeight: 600, lineHeight: 1.3, color: '#333' }}>{title}</p>
                  </div>
                );
              })}
          </div>

          <div style={{ background: '#fff', borderRadius: 10, padding: 12, marginBottom: 10, boxShadow: '0 1px 2px rgba(0,0,0,0.1)' }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#c0392b', marginBottom: 8 }}>🔥 Bài viết hot</div>
            {hotPosts.map(p => {
              const text = p.noi_dung || p.content || '';
              return (
                <div key={p.id} onClick={() => document.getElementById(`post-${p.id}`)?.scrollIntoView({ behavior: 'smooth' })}
                  style={{ display: 'flex', alignItems: 'flex-start', gap: 5, marginBottom: 7, cursor: 'pointer' }}>
                  <span style={{ color: '#c0392b', flexShrink: 0, marginTop: 2 }}>▪</span>
                  <span style={{ fontSize: 12, color: '#333', lineHeight: 1.4 }}>{text.length > 55 ? text.slice(0, 55) + '...' : text}</span>
                </div>
              );
            })}
          </div>

          {(banners.length > 0 ? banners : [
            { vi_tri: 1, tieu_de: 'Vitamin B12', tieu_de_phu: 'CHO GÀ', link: '' },
            { vi_tri: 2, tieu_de: 'Máy ấp trứng', tieu_de_phu: 'Tự động', link: '' },
            { vi_tri: 3, tieu_de: 'Thức ăn', tieu_de_phu: 'Cho gà đá', link: '' },
          ] as Banner[]).map((b, idx) => {
            const inner = (
              <div style={{ background: bannerColors[idx] || '#7B1818', borderRadius: 8, padding: '10px 12px', marginBottom: 7, color: '#fff', display: 'flex', alignItems: 'center', gap: 9 }}>
                <span style={{ fontSize: 20, flexShrink: 0 }}>{bannerEmojis[idx] || '📢'}</span>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 12 }}>{b.tieu_de}</div>
                  {b.tieu_de_phu && <div style={{ fontSize: 10, opacity: 0.8, marginTop: 1 }}>{b.tieu_de_phu}</div>}
                </div>
              </div>
            );
            return b.link
              ? <a key={b.vi_tri} href={b.link} target="_blank" rel="noopener noreferrer" style={{ textDecoration: 'none', display: 'block' }}>{inner}</a>
              : <div key={b.vi_tri}>{inner}</div>;
          })}
        </aside>
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @media (max-width: 1024px) {
          .cgv-grid { grid-template-columns: 180px 1fr 220px !important; gap: 10px !important; padding: 8px !important; }
        }
        @media (max-width: 820px) {
          .cgv-grid { grid-template-columns: 1fr !important; gap: 0 !important; padding: 0 !important; }
          .cgv-left { display: none !important; }
          .cgv-right { display: none !important; }
          main { border-radius: 0 !important; }
        }
      `}</style>
    </div>
  );
}
