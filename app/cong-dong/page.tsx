'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

const KetQua = [
  { value: 'thang', label: '🏆 Thắng' },
  { value: 'thua', label: '❌ Thua' },
  { value: 'xo', label: '🤝 Xổ' },
  { value: 'tap_luyen', label: '💪 Tập luyện' },
];

const KetQuaLabel: any = {
  thang: '🏆 Thắng', thua: '❌ Thua', xo: '🤝 Xổ', tap_luyen: '💪 Tập luyện'
};

function getYoutubeId(url: string): string | null {
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
    /youtube\.com\/shorts\/([^&\n?#]+)/,
  ];
  for (const p of patterns) {
    const match = url.match(p);
    if (match) return match[1];
  }
  return null;
}

export default function CongDongPage() {
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [showForm, setShowForm] = useState(false);
  const [activeVideo, setActiveVideo] = useState<number | null>(null);
  const [likedVideos, setLikedVideos] = useState<Set<number>>(new Set());
  const [reportingId, setReportingId] = useState<number | null>(null);

  const [form, setForm] = useState({
    youtube_url: '', title: '', description: '', match_result: 'tap_luyen'
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitResult, setSubmitResult] = useState<any>(null);
  const [urlError, setUrlError] = useState('');

  useEffect(() => {
    fetchVideos();
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
  }, []);

  const fetchVideos = async () => {
    const res = await fetch('/api/videos?limit=12');
    const data = await res.json();
    setVideos(data.data || []);
    setLoading(false);
  };

  const validateUrl = (url: string) => {
    if (!url) return;
    const id = getYoutubeId(url);
    setUrlError(id ? '' : 'Link không hợp lệ — cần link YouTube');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) { alert('Vui lòng đăng nhập'); return; }
    if (!getYoutubeId(form.youtube_url)) { setUrlError('Link YouTube không hợp lệ'); return; }

    setSubmitting(true);
    const res = await fetch('/api/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, user_id: user.id }),
    });
    const data = await res.json();

    if (data.error) {
      alert(data.error);
    } else {
      setSubmitResult(data);
      setForm({ youtube_url: '', title: '', description: '', match_result: 'tap_luyen' });
      setTimeout(() => { setShowForm(false); setSubmitResult(null); fetchVideos(); }, 3000);
    }
    setSubmitting(false);
  };

  const handleLike = async (videoId: number) => {
    if (!user) { alert('Vui lòng đăng nhập để thích video'); return; }
    const res = await fetch('/api/videos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'like', video_id: videoId, user_id: user.id }),
    });
    const data = await res.json();
    setLikedVideos(prev => {
      const next = new Set(prev);
      data.liked ? next.add(videoId) : next.delete(videoId);
      return next;
    });
    setVideos(prev => prev.map(v => v.id === videoId ? {
      ...v, like_count: data.liked ? v.like_count + 1 : Math.max(0, v.like_count - 1)
    } : v));
  };

  const handleView = async (videoId: number) => {
    setActiveVideo(videoId);
    await fetch('/api/videos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'view', video_id: videoId }),
    });
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, view_count: v.view_count + 1 } : v));
  };

  const handleReport = async (videoId: number, reason: string) => {
    if (!user) { alert('Vui lòng đăng nhập'); return; }
    await fetch('/api/videos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'report', video_id: videoId, user_id: user.id, reason }),
    });
    setReportingId(null);
    alert('Đã báo cáo video. Cảm ơn bạn!');
  };

  return (
    <div className="max-w-6xl mx-auto px-4 py-4">

      {/* HEADER */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="font-black text-2xl text-gray-800">🎬 Video Cộng Đồng</h1>
          <p className="text-gray-500 text-sm mt-1">Chia sẻ video gà chọi — AI tự tối ưu nội dung</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          className="bg-[#8B1A1A] text-white font-black px-4 py-2.5 rounded-xl hover:bg-[#6B0F0F] transition flex items-center gap-2">
          {showForm ? '✕ Đóng' : '📹 Đăng video'}
        </button>
      </div>

      {/* FORM ĐĂNG VIDEO */}
      {showForm && (
        <div className="bg-white rounded-xl shadow-sm p-5 mb-6 border border-red-100">
          <h2 className="font-black text-gray-800 mb-4">📹 Đăng video gà chọi</h2>

          {submitResult ? (
            <div className="text-center py-6">
              <div className="text-4xl mb-3">🎉</div>
              <div className="font-black text-lg text-gray-800 mb-2">Đăng video thành công!</div>
              {submitResult.ai_enhanced && (
                <div className="bg-purple-50 border border-purple-200 rounded-xl p-3 text-left mt-3">
                  <div className="text-xs font-bold text-purple-700 mb-1">🤖 AI đã tối ưu nội dung:</div>
                  <div className="text-sm text-gray-700">{submitResult.video?.title}</div>
                </div>
              )}
              <div className={`mt-3 text-sm ${submitResult.video?.status === 'active' ? 'text-green-600' : 'text-yellow-600'}`}>
                {submitResult.video?.status === 'active' ? '✅ Video đã được đăng tự động' : '⏳ Video đang chờ admin duyệt'}
              </div>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">Link YouTube *</label>
                <input value={form.youtube_url}
                  onChange={e => { setForm({...form, youtube_url: e.target.value}); validateUrl(e.target.value); }}
                  placeholder="https://www.youtube.com/watch?v=... hoặc https://youtu.be/..."
                  className={`w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 ${urlError ? 'border-red-400' : ''}`} />
                {urlError && <div className="text-xs text-red-500 mt-1">⚠️ {urlError}</div>}
                {form.youtube_url && !urlError && getYoutubeId(form.youtube_url) && (
                  <div className="mt-2 bg-gray-50 rounded-lg overflow-hidden">
                    <img src={`https://img.youtube.com/vi/${getYoutubeId(form.youtube_url)}/mqdefault.jpg`}
                      alt="thumbnail" className="w-full h-28 object-cover rounded-lg" />
                    <div className="text-xs text-green-600 p-2">✓ Link hợp lệ</div>
                  </div>
                )}
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">Tiêu đề</label>
                <input value={form.title} onChange={e => setForm({...form, title: e.target.value})}
                  placeholder="VD: Gà tre đòn hiểm — trận kinh điển..."
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                <div className="text-xs text-purple-500 mt-1">🤖 AI sẽ tối ưu tiêu đề sau khi đăng</div>
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">Mô tả</label>
                <textarea value={form.description} onChange={e => setForm({...form, description: e.target.value})}
                  placeholder="Mô tả trận đấu, đặc điểm gà, kết quả..."
                  rows={3} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
              </div>

              <div>
                <label className="text-sm font-semibold text-gray-600 block mb-1">Kết quả trận</label>
                <div className="flex gap-2 flex-wrap">
                  {KetQua.map(k => (
                    <button type="button" key={k.value} onClick={() => setForm({...form, match_result: k.value})}
                      className={`px-3 py-1.5 rounded-full text-sm border transition ${form.match_result === k.value ? 'bg-[#8B1A1A] text-white border-[#8B1A1A]' : 'bg-white text-gray-600 border-gray-300 hover:border-red-400'}`}>
                      {k.label}
                    </button>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={submitting || !!urlError || !form.youtube_url}
                className="w-full bg-[#8B1A1A] text-white font-black py-3 rounded-xl hover:bg-[#6B0F0F] transition disabled:opacity-50 flex items-center justify-center gap-2">
                {submitting ? (
                  <><div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div> AI đang tối ưu nội dung...</>
                ) : '🤖 Đăng video + AI tối ưu'}
              </button>
            </form>
          )}
        </div>
      )}

      {/* DANH SÁCH VIDEO */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1,2,3].map(i => (
            <div key={i} className="bg-white rounded-xl overflow-hidden shadow-sm animate-pulse">
              <div className="bg-gray-200 h-48"></div>
              <div className="p-3 space-y-2">
                <div className="bg-gray-200 h-4 rounded w-3/4"></div>
                <div className="bg-gray-200 h-3 rounded w-1/2"></div>
              </div>
            </div>
          ))}
        </div>
      ) : videos.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-xl shadow-sm">
          <div className="text-5xl mb-3">🎬</div>
          <div className="font-semibold text-gray-500">Chưa có video nào</div>
          <div className="text-sm text-gray-400 mt-1">Hãy là người đầu tiên đăng video!</div>
          <button onClick={() => setShowForm(true)}
            className="mt-4 bg-[#8B1A1A] text-white px-6 py-2 rounded-full text-sm font-bold hover:bg-[#6B0F0F] transition">
            Đăng video ngay
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {videos.map(v => (
            <div key={v.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">

              {/* VIDEO / THUMBNAIL */}
              {activeVideo === v.id ? (
                <iframe
                  src={`${v.embed_url}?autoplay=1&rel=0`}
                  className="w-full h-48"
                  allow="autoplay; encrypted-media"
                  allowFullScreen
                />
              ) : (
                <div className="relative cursor-pointer group" onClick={() => handleView(v.id)}>
                  <img
                    src={`https://img.youtube.com/vi/${getYoutubeId(v.youtube_url)}/mqdefault.jpg`}
                    alt={v.title}
                    className="w-full h-48 object-cover"
                  />
                  <div className="absolute inset-0 bg-black/30 group-hover:bg-black/40 flex items-center justify-center transition">
                    <div className="w-14 h-14 bg-white/90 rounded-full flex items-center justify-center group-hover:scale-110 transition">
                      <div className="text-red-600 text-2xl ml-1">▶</div>
                    </div>
                  </div>
                  <div className="absolute top-2 left-2">
                    <span className={`text-xs px-2 py-1 rounded-full font-semibold ${
                      v.match_result === 'thang' ? 'bg-green-500 text-white' :
                      v.match_result === 'thua' ? 'bg-red-500 text-white' :
                      v.match_result === 'xo' ? 'bg-yellow-500 text-white' :
                      'bg-blue-500 text-white'
                    }`}>
                      {KetQuaLabel[v.match_result] || v.match_result}
                    </span>
                  </div>
                </div>
              )}

              {/* INFO */}
              <div className="p-3">
                <div className="font-bold text-sm text-gray-800 line-clamp-2 mb-1">{v.title}</div>
                {v.description && (
                  <div className="text-xs text-gray-500 line-clamp-2 mb-2">{v.description}</div>
                )}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3 text-xs text-gray-400">
                    <span>👁 {v.view_count}</span>
                    <span>📅 {new Date(v.created_at).toLocaleDateString('vi-VN')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {/* LIKE */}
                    <button onClick={() => handleLike(v.id)}
                      className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition ${likedVideos.has(v.id) ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500 hover:bg-red-50 hover:text-red-500'}`}>
                      ❤️ {v.like_count}
                    </button>
                    {/* REPORT */}
                    <div className="relative">
                      <button onClick={() => setReportingId(reportingId === v.id ? null : v.id)}
                        className="text-xs text-gray-400 hover:text-red-500 px-1 transition">
                        ⚑
                      </button>
                      {reportingId === v.id && (
                        <div className="absolute right-0 bottom-8 bg-white shadow-lg rounded-xl p-2 z-10 w-40 border">
                          <div className="text-xs font-bold text-gray-600 mb-1 px-1">Báo cáo vì:</div>
                          {['Sai nội dung', 'Lừa đảo', 'Không đúng mô tả', 'Spam'].map(r => (
                            <button key={r} onClick={() => handleReport(v.id, r)}
                              className="w-full text-left text-xs px-2 py-1.5 hover:bg-red-50 rounded-lg text-gray-600 hover:text-red-600 transition">
                              {r}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
