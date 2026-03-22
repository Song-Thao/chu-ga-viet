import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// GET — Lấy danh sách gà
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const loai = searchParams.get('loai');
    const khu_vuc = searchParams.get('khu_vuc');
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = supabase
      .from('ga')
      .select(`
        id, ten, loai_ga, gia, can_nang, tuoi, khu_vuc, mo_ta,
        video_url, status, view_count, created_at,
        ga_images (url, is_primary),
        ai_analysis (total_score)
      `)
      .eq('status', 'active')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (loai) query = query.eq('loai_ga', loai);
    if (khu_vuc) query = query.eq('khu_vuc', khu_vuc);

    const { data, error } = await query;
    if (error) throw error;

    return NextResponse.json({ data });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// POST — Đăng gà mới
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { ten, loai_ga, gia, can_nang, tuoi, khu_vuc, mo_ta, user_id, images, video_url, ai_result } = body;

    if (!ten || !gia || !user_id) {
      return NextResponse.json({ error: 'Thiếu thông tin bắt buộc' }, { status: 400 });
    }

    // 1. Lưu gà vào database (thêm video_url)
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

    // 2. Lưu ảnh nếu có
    if (images && images.length > 0) {
      const imageInserts = images.map((url: string, i: number) => ({
        ga_id: gaId,
        url,
        is_primary: i === 0,
      }));
      await supabase.from('ga_images').insert(imageInserts);
    }

    // 3. Lưu kết quả AI nếu có
    if (ai_result) {
      await supabase.from('ai_analysis').insert({
        ga_id: gaId,
        total_score: ai_result.tong_diem,
        nhan_xet: ai_result.nhan_xet_tong,
        mat_score: null,
        chan_score: null,
        vay_score: null,
        dau_score: null,
      });
    }

    return NextResponse.json({ success: true, ga_id: gaId });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
