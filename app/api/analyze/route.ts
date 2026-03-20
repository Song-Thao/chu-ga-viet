import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

const fallback = {
  tong_diem: 7.5,
  nhan_xet: 'Không thể phân tích ảnh. Vui lòng thử lại với ảnh rõ hơn.',
  chi_tiet: [
    { phan: '👁 Mắt', diem: 7.5, mo_ta: 'Cần ảnh rõ hơn để phân tích' },
    { phan: '🦵 Chân', diem: 7.5, mo_ta: 'Cần ảnh rõ hơn để phân tích' },
    { phan: '🐾 Vảy', diem: 7.5, mo_ta: 'Cần ảnh rõ hơn để phân tích' },
    { phan: '🐓 Đầu', diem: 7.5, mo_ta: 'Cần ảnh rõ hơn để phân tích' },
    { phan: '💪 Thân', diem: 7.5, mo_ta: 'Cần ảnh rõ hơn để phân tích' },
    { phan: '🪶 Lông', diem: 7.5, mo_ta: 'Cần ảnh rõ hơn để phân tích' },
  ],
  gia_de_xuat: '3.000.000 - 5.000.000'
};

export async function POST(req: NextRequest) {
  try {
    const { imageBase64 } = await req.json();

    if (!imageBase64) {
      return NextResponse.json(fallback);
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1000,
      messages: [
        {
          role: 'system',
          content: 'Bạn là chuyên gia xem tướng gà chiến Việt Nam. Chỉ trả về JSON thuần, không markdown, không giải thích.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Phân tích con gà trong ảnh. Trả về JSON với format sau, không có backtick, không có markdown:
{"tong_diem":8.5,"nhan_xet":"nhận xét tổng quan","chi_tiet":[{"phan":"👁 Mắt","diem":9,"mo_ta":"mô tả"},{"phan":"🦵 Chân","diem":8,"mo_ta":"mô tả"},{"phan":"🐾 Vảy","diem":7.5,"mo_ta":"mô tả"},{"phan":"🐓 Đầu","diem":8.5,"mo_ta":"mô tả"},{"phan":"💪 Thân","diem":8,"mo_ta":"mô tả"},{"phan":"🪶 Lông","diem":8,"mo_ta":"mô tả"}],"gia_de_xuat":"3.000.000 - 5.000.000"}`
            },
            {
              type: 'image_url',
              image_url: { url: imageBase64 },
            },
          ],
        },
      ],
    });

    const content = response.choices[0].message.content || '';
    console.log('AI response:', content);

    // Thử parse trực tiếp
    try {
      const result = JSON.parse(content);
      return NextResponse.json(result);
    } catch {
      // Tìm JSON trong content
      const match = content.match(/\{[\s\S]*\}/);
      if (match) {
        const result = JSON.parse(match[0]);
        return NextResponse.json(result);
      }
      return NextResponse.json(fallback);
    }

  } catch (error: any) {
    console.error('AI Error:', error?.message || error);
    return NextResponse.json(fallback);
  }
}
