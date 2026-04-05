import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

// Tăng timeout Vercel lên 30s
export const maxDuration = 30;

// Cache response 60 giây — giảm tải Supabase
export const revalidate = 3600;

function getSupabase() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key'
  );
}

// ── GET — Lấy danh sách gà ───────────────────────────────────
export async function GET(req: NextRequest) {
  try {
    const supabase = getSupabase();
    const { searchParams } = new URL(req.url);
    const loai    = searchParams.get('loai');
    const khu_vuc = searchParams.get('khu_vuc');
    const limit   = Math.min(parseInt(searchParams.get('limit') || '20'), 50);

    let query = supabase
      .from('ga')
      .select(`
        id, ten, loai_ga, gia, can_nang, tuoi,
        khu_vuc, mo_ta, video_url, status,
        view_count, created_at,
        ga_images (url, is_primary),
        ai_analysis (total_score)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (loai)    query = query.eq('loai_ga', loai);
    if (khu_vuc) query = query.eq('khu_vuc', khu_vuc);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json(
      { data: data ?? [] },
      {
        headers: {
          // Cache trên CDN Vercel 60s, stale thêm 300s
          'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        },
      }
    );
  } catch (error: any) {
    console.error('[GET /api/ga]', error?.message);
    return NextResponse.json({ error: error.message, data: [] }, { status: 500 });
  }
}

// ── POST — Đăng gà mới ───────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      ten, loai_ga, gia, can_nang, tuoi,
      khu_vuc, mo_ta, user_id, images,
      video_url, ai_result,
    } = body;

    if (!ten || !gia || !user_id) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    const authHeader = req.headers.get('authorization');
    const supabase = authHeader
      ? createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
          process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'placeholder-anon-key',
          { global: { headers: { Authorization: authHeader } } }
        )
      : createClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://placeholder.supabase.co',
          (process.env.SUPABASE_SERVICE_ROLE_KEY ?? process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) || 'placeholder-anon-key'
        );

    // 1. Lưu gà
    const { data: gaData, error: gaError } = await supabase
      .from('ga')
      .insert({
        user_id,
        ten,
        loai_ga,
        gia: parseInt(gia),
        can_nang: parseFloat(can_nang) || null,
        tuoi: parseInt(tuoi) || null,
        khu_vuc,
        mo_ta,
        video_url: video_url || null,
        status: 'active',
        view_count: 0,
      })
      .select()
      .single();

    if (gaError) throw gaError;
    const gaId = gaData.id;

    // 2. Lưu ảnh + AI song song
    await Promise.all([
      images?.length > 0
        ? supabase.from('ga_images').insert(
            images.map((url: string, i: number) => ({
              ga_id: gaId, url, is_primary: i === 0,
            }))
          )
        : Promise.resolve(),

      ai_result
        ? supabase.from('ai_analysis').insert({
            ga_id: gaId,
            total_score: ai_result.tong_diem,
            nhan_xet: ai_result.nhan_xet_tong,
            mat_score: null,
            chan_score: null,
            vay_score: null,
            dau_score: null,
          })
        : Promise.resolve(),
    ]);

    return NextResponse.json({ success: true, ga_id: gaId });
  } catch (error: any) {
    console.error('[POST /api/ga]', error?.message);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
