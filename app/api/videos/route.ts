import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import OpenAI from 'openai';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY || 'placeholder-key' });

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

// GET
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '12');

    const { data, error } = await supabase
      .from('videos')
      .select('*, profiles(username)')
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST
export async function POST(req: NextRequest) {
  try {
    const { youtube_url, title, description, match_result, user_id } = await req.json();

    if (!youtube_url || !user_id) {
      return NextResponse.json({ error: 'Thiếu thông tin' }, { status: 400 });
    }

    const videoId = getYoutubeId(youtube_url);
    if (!videoId) {
      return NextResponse.json({ error: 'Link YouTube không hợp lệ' }, { status: 400 });
    }

    const embedUrl = `https://www.youtube.com/embed/${videoId}`;

    const { data: cfg } = await supabase.from('config').select('mode_duyet').single();
    const modeDuyet = cfg?.mode_duyet || 'auto';

    let finalTitle = title || 'Video gà chọi';
    let finalDesc = description || '';

    try {
      const aiRes = await openai.chat.completions.create({
        model: 'gpt-4o',
        max_tokens: 200,
        messages: [{
          role: 'user',
          content: `Viết lại tiêu đề và mô tả hấp dẫn cho video gà chọi theo kiểu dân chơi miền Tây.
Tiêu đề gốc: "${title}"
Mô tả gốc: "${description || 'Không có'}"
Kết quả: ${match_result}
Trả về JSON thuần: {"title": "...", "description": "..."}`
        }],
      });
      const content = aiRes.choices[0].message.content || '';
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        const ai = JSON.parse(match[0]);
        if (ai.title) finalTitle = ai.title;
        if (ai.description) finalDesc = ai.description;
      }
    } catch { /* giữ nguyên nếu AI lỗi */ }

    const status = modeDuyet === 'auto' ? 'active' : 'pending';

    const { data, error } = await supabase
      .from('videos')
      .insert({
        user_id, youtube_url, embed_url: embedUrl,
        title: finalTitle, description: finalDesc,
        match_result, status,
        view_count: 0, like_count: 0, report_count: 0,
      })
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json({ success: true, video: data, ai_enhanced: finalTitle !== title });

  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// PATCH
export async function PATCH(req: NextRequest) {
  try {
    const { action, video_id, user_id, reason } = await req.json();

    if (action === 'view') {
      const { data: v } = await supabase
        .from('videos').select('view_count').eq('id', video_id).single();
      await supabase
        .from('videos').update({ view_count: (v?.view_count || 0) + 1 }).eq('id', video_id);
      return NextResponse.json({ success: true });
    }

    if (action === 'like' && user_id) {
      const { data: existing } = await supabase
        .from('video_likes').select('id')
        .eq('video_id', video_id).eq('user_id', user_id).maybeSingle();

      const { data: v } = await supabase
        .from('videos').select('like_count').eq('id', video_id).single();

      if (existing) {
        await supabase.from('video_likes').delete()
          .eq('video_id', video_id).eq('user_id', user_id);
        await supabase.from('videos')
          .update({ like_count: Math.max(0, (v?.like_count || 1) - 1) }).eq('id', video_id);
        return NextResponse.json({ liked: false });
      } else {
        await supabase.from('video_likes').insert({ video_id, user_id });
        await supabase.from('videos')
          .update({ like_count: (v?.like_count || 0) + 1 }).eq('id', video_id);
        return NextResponse.json({ liked: true });
      }
    }

    if (action === 'report' && user_id) {
      await supabase.from('video_reports')
        .insert({ video_id, user_id, reason: reason || 'Vi phạm' })
        .then(() => {});

      const { data: v } = await supabase
        .from('videos').select('report_count').eq('id', video_id).single();
      const newCount = (v?.report_count || 0) + 1;

      const { data: cfg } = await supabase.from('config').select('report_threshold').single();
      const threshold = cfg?.report_threshold || 5;

      if (newCount >= threshold) {
        await supabase.from('videos')
          .update({ report_count: newCount, status: 'hidden' }).eq('id', video_id);
      } else {
        await supabase.from('videos')
          .update({ report_count: newCount }).eq('id', video_id);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Action không hợp lệ' }, { status: 400 });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
