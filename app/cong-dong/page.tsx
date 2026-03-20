'use client';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';

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
  const [tab, setTab] = useState<'feed' | 'video'>('feed');
  const [user, setUser] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [videos, setVideos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showPostForm, setShowPostForm] = useState(false);
  const [showVideoForm, setShowVideoForm] = useState(false);
  const [activeVideo, setActiveVideo] = useState<number | null>(null);
  const [likedVideos, setLikedVideos] = useState<Set<number>>(new Set());
  const [likedPosts, setLikedPosts] = useState<Set<number>>(new Set());
  const [expandedComments, setExpandedComments] = useState<Set<number>>(new Set());
  const [comments, setComments] = useState<Record<number, any[]>>({});
  const [newComment, setNewComment] = useState<Record<number, string>>({});
  const [reportingId, setReportingId] = useState<number | null>(null);

  // Form bài viết
  const [postForm, setPostForm] = useState({ noi_dung: '', image_url: '' });
  const [postImage, setPostImage] = useState<string | null>(null);
  const [postSubmitting, setPostSubmitting] = useState(false);

  // Form video
  const [videoForm, setVideoForm] = useState({
    youtube_url: '', title: '', description: '', match_result: 'tap_luyen'
  });
  const [videoSubmitting, setVideoSubmitting] = useState(false);
  const [videoSubmitResult, setVideoSubmitResult] = useState<any>(null);
  const [urlError, setUrlError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetchPosts();
    fetchVideos();
  }, []);

  const fetchPosts = async () => {
    const { data } = await supabase
      .from('posts')
      .select('*, profiles(username)')
      .order('created_at', { ascending: false })
      .limit(20);
    setPosts(data || []);
    setLoading(false);
  };

  const fetchVideos = async () => {
    const res = await fetch('/api/videos?limit=12');
    const data = await res.json();
    setVideos(data.data || []);
  };

  const fetchComments = async (postId: number) => {
    const { data } = await supabase
      .from('comments')
      .select('*, profiles(username)')
      .eq('ga_id', postId)
      .order('created_at', { ascending: true })
      .limit(10);
    setComments(prev => ({ ...prev, [postId]: data || [] }));
  };

  const toggleComments = async (postId: number) => {
    if (!expandedComments.has(postId)) {
      await fetchComments(postId);
    }
    setExpandedComments(prev => {
      const next = new Set(prev);
      next.has(postId) ? next.delete(postId) : next.add(postId);
      return next;
    });
  };

  const submitComment = async (postId: number) => {
    if (!user || !newComment[postId]?.trim()) return;
    const { data } = await supabase.from('comments').insert({
      ga_id: postId, user_id: user.id, noi_dung: newComment[postId]
    }).select('*, profiles(username)').single();
    if (data) {
      setComments(prev => ({ ...prev, [postId]: [...(prev[postId] || []), data] }));
      setNewComment(prev => ({ ...prev, [postId]: '' }));
    }
  };

  const handlePostImage = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => setPostImage(ev.target?.result as string);
    reader.readAsDataURL(file);
  };

  const submitPost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !postForm.noi_dung.trim()) return;
    setPostSubmitting(true);
    await supabase.from('posts').insert({
      user_id: user.id,
      noi_dung: postForm.noi_dung,
      image_url: postImage || null,
    });
    setPostForm({ noi_dung: '', image_url: '' });
    setPostImage(null);
    setShowPostForm(false);
    setPostSubmitting(false);
    await fetchPosts();
  };

  const likePost = async (postId: number) => {
    if (!user) return;
    const isLiked = likedPosts.has(postId);
    setLikedPosts(prev => { const n = new Set(prev); isLiked ? n.delete(postId) : n.add(postId); return n; });
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes: (p.likes || 0) + (isLiked ? -1 : 1) } : p));
    await supabase.from('posts').update({ likes: posts.find(p => p.id === postId)?.likes + (isLiked ? -1 : 1) }).eq('id', postId);
  };

  const validateUrl = (url: string) => {
    setUrlError(getYoutubeId(url) ? '' : url ? 'Link không hợp lệ — cần link YouTube' : '');
  };

  const submitVideo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !getYoutubeId(videoForm.youtube_url)) return;
    setVideoSubmitting(true);
    const res = await fetch('/api/videos', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...videoForm, user_id: user.id }),
    });
    const data = await res.json();
    if (!data.error) {
      setVideoSubmitResult(data);
      setVideoForm({ youtube_url: '', title: '', description: '', match_result: 'tap_luyen' });
      setTimeout(() => { setShowVideoForm(false); setVideoSubmitResult(null); fetchVideos(); }, 3000);
    }
    setVideoSubmitting(false);
  };

  const likeVideo = async (videoId: number) => {
    if (!user) { alert('Vui lòng đăng nhập'); return; }
    const res = await fetch('/api/videos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'like', video_id: videoId, user_id: user.id }),
    });
    const data = await res.json();
    setLikedVideos(prev => { const n = new Set(prev); data.liked ? n.add(videoId) : n.delete(videoId); return n; });
    setVideos(prev => prev.map(v => v.id === videoId ? { ...v, like_count: data.liked ? v.like_count + 1 : Math.max(0, v.like_count - 1) } : v));
  };

  const handleReport = async (videoId: number, reason: string) => {
    if (!user) return;
    await fetch('/api/videos', {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'report', video_id: videoId, user_id: user.id, reason }),
    });
    setReportingId(null);
    alert('Đã báo cáo. Cảm ơn bạn!');
  };

  const timeAgo = (date: string) => {
    const d = Math.floor((Date.now() - new Date(date).getTime()) / 1000);
    if (d < 60) return 'vừa xong';
    if (d < 3600) return `${Math.floor(d/60)} phút trước`;
    if (d < 86400) return `${Math.floor(d/3600)} giờ trước`;
    return `${Math.floor(d/86400)} ngày trước`;
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-4">

      {/* HEADER */}
      <div className="flex items-center justify-between mb-4">
        <h1 className="font-black text-xl text-gray-800">👥 Cộng đồng Chủ Gà Việt</h1>
        <div className="flex gap-2">
          <button onClick={() => { setShowPostForm(!showPostForm); setShowVideoForm(false); }}
            className="bg-[#8B1A1A] text-white text-sm font-bold px-3 py-2 rounded-xl hover:bg-[#6B0F0F] transition">
            ✍️ Đăng bài
          </button>
          <button onClick={() => { setShowVideoForm(!showVideoForm); setShowPostForm(false); }}
            className="bg-gray-700 text-white text-sm font-bold px-3 py-2 rounded-xl hover:bg-gray-800 transition">
            🎬 Video
          </button>
        </div>
      </div>

      {/* FORM ĐĂNG BÀI */}
      {showPostForm && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border border-red-100">
          <h3 className="font-bold text-gray-700 mb-3">✍️ Đăng bài viết</h3>
          <form onSubmit={submitPost} className="space-y-3">
            <textarea value={postForm.noi_dung} onChange={e => setPostForm({...postForm, noi_dung: e.target.value})}
              placeholder="Chia sẻ kinh nghiệm, hỏi đáp về gà chọi..."
              rows={4} className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
            <label className="block cursor-pointer">
              <input type="file" accept="image/*" className="hidden" onChange={handlePostImage} />
              <div className="border-2 border-dashed border-gray-200 rounded-xl p-3 text-center hover:border-red-300 hover:bg-red-50 transition">
                {postImage ? (
                  <img src={postImage} alt="" className="w-full h-40 object-cover rounded-lg" />
                ) : (
                  <div className="text-gray-400 text-sm">📷 Thêm ảnh (tùy chọn)</div>
                )}
              </div>
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={postSubmitting || !postForm.noi_dung.trim()}
                className="flex-1 bg-[#8B1A1A] text-white font-bold py-2 rounded-xl hover:bg-[#6B0F0F] transition disabled:opacity-50 text-sm">
                {postSubmitting ? '⏳ Đang đăng...' : '📝 Đăng bài'}
              </button>
              <button type="button" onClick={() => { setShowPostForm(false); setPostImage(null); }}
                className="border border-gray-300 text-gray-600 px-4 py-2 rounded-xl text-sm hover:bg-gray-50 transition">
                Hủy
              </button>
            </div>
          </form>
        </div>
      )}

      {/* FORM ĐĂNG VIDEO */}
      {showVideoForm && (
        <div className="bg-white rounded-xl shadow-sm p-4 mb-4 border border-gray-200">
          <h3 className="font-bold text-gray-700 mb-3">🎬 Đăng video YouTube</h3>
          {videoSubmitResult ? (
            <div className="text-center py-4">
              <div className="text-3xl mb-2">🎉</div>
              <div className="font-bold text-gray-700">Đăng video thành công!</div>
              {videoSubmitResult.ai_enhanced && (
                <div className="text-xs text-purple-600 mt-1">🤖 AI đã tối ưu tiêu đề</div>
              )}
            </div>
          ) : (
            <form onSubmit={submitVideo} className="space-y-3">
              <div>
                <input value={videoForm.youtube_url}
                  onChange={e => { setVideoForm({...videoForm, youtube_url: e.target.value}); validateUrl(e.target.value); }}
                  placeholder="https://youtube.com/watch?v=... hoặc https://youtu.be/..."
                  className={`w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 ${urlError ? 'border-red-400' : ''}`} />
                {urlError && <div className="text-xs text-red-500 mt-1">⚠️ {urlError}</div>}
                {videoForm.youtube_url && !urlError && getYoutubeId(videoForm.youtube_url) && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={`https://img.youtube.com/vi/${getYoutubeId(videoForm.youtube_url)}/default.jpg`}
                      alt="" className="w-20 h-12 object-cover rounded" />
                    <span className="text-xs text-green-600 font-semibold">✓ Link hợp lệ</span>
                  </div>
                )}
              </div>
              <input value={videoForm.title} onChange={e => setVideoForm({...videoForm, title: e.target.value})}
                placeholder="Tiêu đề video (AI sẽ tối ưu)"
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
              <textarea value={videoForm.description} onChange={e => setVideoForm({...videoForm, description: e.target.value})}
                placeholder="Mô tả trận đấu..." rows={2}
                className="w-full border rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 resize-none" />
              <div className="flex gap-2 flex-wrap">
                {[{v:'tap_luyen',l:'💪 Tập'},{v:'thang',l:'🏆 Thắng'},{v:'thua',l:'❌ Thua'},{v:'xo',l:'🤝 Xổ'}].map(k => (
                  <button type="button" key={k.v} onClick={() => setVideoForm({...videoForm, match_result: k.v})}
                    className={`px-3 py-1 rounded-full text-xs border transition ${videoForm.match_result === k.v ? 'bg-[#8B1A1A] text-white border-[#8B1A1A]' : 'bg-white text-gray-600 border-gray-300'}`}>
                    {k.l}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <button type="submit" disabled={videoSubmitting || !!urlError || !videoForm.youtube_url}
                  className="flex-1 bg-gray-700 text-white font-bold py-2 rounded-xl text-sm hover:bg-gray-800 transition disabled:opacity-50">
                  {videoSubmitting ? '⏳ AI đang xử lý...' : '🤖 Đăng + AI tối ưu'}
                </button>
                <button type="button" onClick={() => setShowVideoForm(false)}
                  className="border border-gray-300 text-gray-600 px-4 py-2 rounded-xl text-sm">Hủy</button>
              </div>
            </form>
          )}
        </div>
      )}

      {/* TABS */}
      <div className="flex gap-1 bg-white rounded-xl shadow-sm p-1 mb-4">
        <button onClick={() => setTab('feed')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${tab === 'feed' ? 'bg-[#8B1A1A] text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          📰 Bài viết ({posts.length})
        </button>
        <button onClick={() => setTab('video')}
          className={`flex-1 py-2 rounded-lg text-sm font-bold transition ${tab === 'video' ? 'bg-gray-700 text-white' : 'text-gray-600 hover:bg-gray-50'}`}>
          🎬 Video ({videos.length})
        </button>
      </div>

      {/* FEED BÀI VIẾT */}
      {tab === 'feed' && (
        <div className="space-y-4">
          {loading ? (
            [1,2,3].map(i => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm animate-pulse">
                <div className="flex gap-3 mb-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full"></div>
                  <div className="flex-1 space-y-2">
                    <div className="bg-gray-200 h-3 rounded w-1/4"></div>
                    <div className="bg-gray-200 h-3 rounded w-1/3"></div>
                  </div>
                </div>
                <div className="bg-gray-200 h-20 rounded-xl"></div>
              </div>
            ))
          ) : posts.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm">
              <div className="text-5xl mb-3">📝</div>
              <div className="font-semibold text-gray-500">Chưa có bài viết nào</div>
              <button onClick={() => setShowPostForm(true)}
                className="mt-3 bg-[#8B1A1A] text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-[#6B0F0F] transition">
                Viết bài đầu tiên
              </button>
            </div>
          ) : (
            posts.map(post => (
              <div key={post.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                {/* HEADER BÀI */}
                <div className="p-4 flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#8B1A1A] rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
                    {(post.profiles?.username || 'U')[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <div className="font-bold text-sm text-gray-800">{post.profiles?.username || 'Người dùng'}</div>
                    <div className="text-xs text-gray-400">{timeAgo(post.created_at)}</div>
                  </div>
                </div>

                {/* NỘI DUNG */}
                <div className="px-4 pb-3">
                  <p className="text-gray-700 text-sm leading-relaxed whitespace-pre-wrap">{post.noi_dung}</p>
                </div>

                {/* ẢNH */}
                {post.image_url && (
                  <img src={post.image_url} alt="" className="w-full max-h-80 object-cover" />
                )}

                {/* ACTIONS */}
                <div className="px-4 py-3 border-t flex items-center gap-4">
                  <button onClick={() => likePost(post.id)}
                    className={`flex items-center gap-1.5 text-sm font-semibold transition ${likedPosts.has(post.id) ? 'text-red-600' : 'text-gray-500 hover:text-red-500'}`}>
                    {likedPosts.has(post.id) ? '❤️' : '🤍'} {post.likes || 0}
                  </button>
                  <button onClick={() => toggleComments(post.id)}
                    className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-blue-500 font-semibold transition">
                    💬 {expandedComments.has(post.id) ? 'Ẩn' : 'Bình luận'}
                  </button>
                </div>

                {/* BÌNH LUẬN */}
                {expandedComments.has(post.id) && (
                  <div className="px-4 pb-4 border-t bg-gray-50">
                    <div className="space-y-3 py-3 max-h-48 overflow-y-auto">
                      {(comments[post.id] || []).map((c: any) => (
                        <div key={c.id} className="flex gap-2">
                          <div className="w-7 h-7 bg-gray-300 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                            {(c.profiles?.username || 'U')[0].toUpperCase()}
                          </div>
                          <div className="bg-white rounded-xl px-3 py-2 flex-1 shadow-sm">
                            <div className="font-semibold text-xs text-gray-700">{c.profiles?.username || 'Ẩn'}</div>
                            <div className="text-sm text-gray-600">{c.noi_dung}</div>
                          </div>
                        </div>
                      ))}
                      {(comments[post.id] || []).length === 0 && (
                        <div className="text-xs text-gray-400 text-center py-2">Chưa có bình luận</div>
                      )}
                    </div>
                    <div className="flex gap-2 mt-2">
                      <input value={newComment[post.id] || ''} onChange={e => setNewComment(prev => ({...prev, [post.id]: e.target.value}))}
                        onKeyDown={e => e.key === 'Enter' && submitComment(post.id)}
                        placeholder="Viết bình luận..."
                        className="flex-1 border rounded-full px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-red-300" />
                      <button onClick={() => submitComment(post.id)}
                        className="bg-[#8B1A1A] text-white w-8 h-8 rounded-full flex items-center justify-center text-xs hover:bg-[#6B0F0F] transition">
                        ➤
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      )}

      {/* VIDEO */}
      {tab === 'video' && (
        <div>
          {videos.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl shadow-sm">
              <div className="text-5xl mb-3">🎬</div>
              <div className="font-semibold text-gray-500">Chưa có video nào</div>
              <button onClick={() => setShowVideoForm(true)}
                className="mt-3 bg-gray-700 text-white px-5 py-2 rounded-full text-sm font-bold hover:bg-gray-800 transition">
                Đăng video đầu tiên
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {videos.map(v => (
                <div key={v.id} className="bg-white rounded-xl overflow-hidden shadow-sm hover:shadow-md transition">

                  {activeVideo === v.id ? (
                    <iframe src={`${v.embed_url}?autoplay=1&rel=0`}
                      className="w-full h-48" allow="autoplay; encrypted-media" allowFullScreen />
                  ) : (
                    <div className="relative cursor-pointer group" onClick={async () => {
                      setActiveVideo(v.id);
                      await fetch('/api/videos', { method: 'PATCH', headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ action: 'view', video_id: v.id }) });
                      setVideos(prev => prev.map(x => x.id === v.id ? { ...x, view_count: x.view_count + 1 } : x));
                    }}>
                      <img src={`https://img.youtube.com/vi/${getYoutubeId(v.youtube_url)}/mqdefault.jpg`}
                        alt={v.title} className="w-full h-48 object-cover" />
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
                          'bg-blue-500 text-white'}`}>
                          {KetQuaLabel[v.match_result] || v.match_result}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="p-3">
                    <div className="font-bold text-sm text-gray-800 line-clamp-2 mb-1">{v.title}</div>
                    {v.description && <div className="text-xs text-gray-500 line-clamp-2 mb-2">{v.description}</div>}
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-gray-400">👁 {v.view_count} • {timeAgo(v.created_at)}</span>
                      <div className="flex items-center gap-2">
                        <button onClick={() => likeVideo(v.id)}
                          className={`flex items-center gap-1 text-xs px-2 py-1 rounded-full transition ${likedVideos.has(v.id) ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-500 hover:bg-red-50'}`}>
                          {likedVideos.has(v.id) ? '❤️' : '🤍'} {v.like_count}
                        </button>
                        <div className="relative">
                          <button onClick={() => setReportingId(reportingId === v.id ? null : v.id)}
                            className="text-xs text-gray-400 hover:text-red-500 px-1">⚑</button>
                          {reportingId === v.id && (
                            <div className="absolute right-0 bottom-8 bg-white shadow-lg rounded-xl p-2 z-10 w-36 border">
                              <div className="text-xs font-bold text-gray-600 mb-1 px-1">Báo cáo:</div>
                              {['Sai nội dung', 'Lừa đảo', 'Spam'].map(r => (
                                <button key={r} onClick={() => handleReport(v.id, r)}
                                  className="w-full text-left text-xs px-2 py-1.5 hover:bg-red-50 rounded text-gray-600 hover:text-red-600">
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
      )}
    </div>
  );
}
