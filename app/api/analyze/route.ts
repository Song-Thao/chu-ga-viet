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
          content: 'Bạn là chuyên gia xem tướng gà chiến Việt Nam 20 năm kinh nghiệm. Chỉ trả về JSON thuần, không markdown, không backtick, không giải thích thêm.'
        },
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: `Phân tích kỹ con gà trong ảnh dựa trên tướng số thực tế. 

Thang điểm giá theo tổng điểm:
- Dưới 6 điểm: 500.000 - 1.500.000đ
- 6.0 - 6.9: 1.500.000 - 3.000.000đ  
- 7.0 - 7.9: 3.000.000 - 6.000.000đ
- 8.0 - 8.9: 6.000.000 - 15.000.000đ
- 9.0 - 10: 15.000.000 - 30.000.000đ

Trả về JSON này (không có backtick):
{"tong_diem":8.5,"nhan_xet":"nhận xét chi tiết về tướng số con gà dựa trên ảnh thực tế","chi_tiet":[{"phan":"👁 Mắt","diem":9,"mo_ta":"mô tả thực tế mắt gà"},{"phan":"🦵 Chân","diem":8,"mo_ta":"mô tả thực tế chân gà"},{"phan":"🐾 Vảy","diem":7.5,"mo_ta":"mô tả thực tế vảy gà"},{"phan":"🐓 Đầu","diem":8.5,"mo_ta":"mô tả thực tế đầu gà"},{"phan":"💪 Thân","diem":8,"mo_ta":"mô tả thực tế thân gà"},{"phan":"🪶 Lông","diem":8,"mo_ta":"mô tả thực tế lông gà"}],"gia_de_xuat":"X.000.000 - Y.000.000"}`
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

    try {
      const result = JSON.parse(content);
      return NextResponse.json(result);
    } catch {
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
