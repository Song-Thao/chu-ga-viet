import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// ===== TỪ ĐIỂN VẢY =====
const VAY_TOT: Record<string, { dac_diem: string; vi_tri: string; y_nghia: string }> = {
  'Án Thiên':     { dac_diem: 'vảy lớn nổi bật sát gối phía trên',        vi_tri: 'sat_goi',     y_nghia: 'Ra đòn chính xác và hiểm — gà chiến tốt' },
  'Phủ Địa':     { dac_diem: 'vảy nổi to sát chậu phía dưới chân',       vi_tri: 'sat_chau',    y_nghia: 'Bền bỉ, lì đòn — gà dai sức' },
  'Huyền Trâm':  { dac_diem: 'vảy nhỏ mọc ngang vị trí cựa',             vi_tri: 'ngang_cua',   y_nghia: 'Đòn độc, khó đoán — gà tài' },
  'Khai Vương':  { dac_diem: '4 vảy tạo thành hình chữ Vương',            vi_tri: 'chu_vuong',   y_nghia: 'Quý tướng hiếm gặp — rất giá trị' },
  'Ám Long':     { dac_diem: 'vảy nhỏ ẩn dưới ngón giữa',               vi_tri: 'ngon_giua',   y_nghia: 'Hiếm và hay — giá trị cao' },
  'Gạc Thập':    { dac_diem: 'vảy xếp hình chữ thập ở chân',             vi_tri: 'chu_thap',    y_nghia: 'Đá tàn, bền — gà chiến lâu dài' },
  'Song Phủ Đao':{ dac_diem: '2 vảy đối xứng như lưỡi dao hai bên chân', vi_tri: 'doi_xung',    y_nghia: 'Đòn hai bên mạnh — nguy hiểm' },
  'Tam Tài':     { dac_diem: '3 vảy xếp hàng dọc đều nhau',              vi_tri: 'hang_doc',    y_nghia: 'Cân bằng tốt — gà toàn diện' },
};

const VAY_XAU: Record<string, { dac_diem: string; canh_bao: string }> = {
  'Tứ Hoành Khai': { dac_diem: '4 vảy nằm ngang cùng cấp',          canh_bao: 'Dễ bỏ chạy giữa trận' },
  'Dậm Chậu':      { dac_diem: 'vảy đè lên chậu chân',              canh_bao: 'Yếu chân, dễ gãy' },
  'Rọc Chậu':      { dac_diem: 'vảy cắt ngang chậu',                canh_bao: 'Không bền, mau bỏ' },
  'Liên Giáp':     { dac_diem: 'nhiều vảy dày sát nhau liên tiếp',  canh_bao: 'Tướng xấu toàn diện' },
  'Khai Hậu':      { dac_diem: 'vảy mở ở phía sau gót chân',        canh_bao: 'Hay lùi, thiếu tiến công' },
  'Nát Hàng':      { dac_diem: 'vảy xếp không đều lộn xộn',         canh_bao: 'Không có tướng đặc biệt' },
};

function mapVay(moTaVay: string) {
  const obs = moTaVay.toLowerCase();

  for (const [ten, data] of Object.entries(VAY_TOT)) {
    if (obs.includes(ten.toLowerCase()) || obs.includes(data.vi_tri)) {
      const tinCay = obs.includes('rõ') || obs.includes('xác định') ? 80
        : obs.includes('dấu hiệu') ? 55 : 40;
      return { ten, loai: 'tot' as const, y_nghia: data.y_nghia, tin_cay: tinCay };
    }
  }
  for (const [ten, data] of Object.entries(VAY_XAU)) {
    if (obs.includes(ten.toLowerCase())) {
      return { ten, loai: 'xau' as const, y_nghia: data.canh_bao, tin_cay: 70 };
    }
  }
  return {
    ten: null, loai: 'thuong' as const, tin_cay: 50,
    y_nghia: 'Không quan sát thấy vảy quý hay vảy xấu đặc biệt. Gà thuộc dạng vảy phổ thông — giá trị phụ thuộc thể lực, nuôi và luyện.',
  };
}

function tinhDiem(nhanDien: string, mappedVay: ReturnType<typeof mapVay>, doRo: number) {
  let s = 5.0;
  const nd = nhanDien.toLowerCase();
  if (nd.includes('sáng') || nd.includes('linh hoạt')) s += 0.5;
  if (nd.includes('khô') || nd.includes('gân nổi')) s += 0.4;
  if (nd.includes('thẳng') || nd.includes('cân đối')) s += 0.3;
  if (mappedVay.loai === 'tot') s += mappedVay.tin_cay >= 75 ? 2.0 : 1.2;
  if (mappedVay.loai === 'xau') s -= 1.5;
  if (doRo < 50) s -= 1.0;
  else if (doRo < 65) s -= 0.5;
  return Math.round(Math.max(3.0, Math.min(10.0, s)) * 10) / 10;
}

function tinhGia(diem: number, loaiVay: string) {
  if (loaiVay === 'xau') return '500.000 - 1.500.000';
  if (diem >= 9.0) return '15.000.000 - 30.000.000';
  if (diem >= 8.0) return '6.000.000 - 15.000.000';
  if (diem >= 7.0) return '3.000.000 - 6.000.000';
  if (diem >= 6.0) return '1.500.000 - 3.000.000';
  return '500.000 - 1.500.000';
}

const SYSTEM_PROMPT = `Bạn là chuyên gia phân tích gà chọi Việt Nam. Nhiệm vụ: QUAN SÁT và MÔ TẢ thực tế từ ảnh.

QUAN TRỌNG NHẤT:
- Tất cả ảnh được gửi là CÙNG MỘT CON GÀ, chụp từ nhiều góc khác nhau
- Không biết trước ảnh nào là mặt, chân hay toàn thân — hãy TỰ NHẬN DIỆN từng ảnh
- Tổng hợp thông tin từ TẤT CẢ ảnh để phân tích đầy đủ nhất
- Nếu 2 ảnh cùng chụp chân → lấy ảnh rõ hơn để phân tích vảy

QUY TẮC MÔ TẢ:
- Chỉ mô tả những gì THỰC SỰ THẤY RÕ
- KHÔNG tự đặt tên vảy — chỉ mô tả hình dạng, vị trí, kích thước
- Nếu không rõ → ghi cụ thể lý do không rõ (mờ, góc khuất, thiếu ảnh...)
- Mỗi lần phân tích phải dùng cách diễn đạt khác, không lặp mẫu

QUY TẮC ĐỘ TIN CẬY:
- "thấy rõ" = rõ nét 80%+
- "có dấu hiệu" = nhìn thấy khoảng 60%  
- "không quan sát được rõ" = dưới 50% — phải nói lý do`;

const USER_PROMPT = `Nhìn tất cả ảnh tôi gửi. Đây là nhiều góc của CÙNG MỘT CON GÀ.

Bước 1: Tự nhận diện mỗi ảnh chụp phần gì (mặt/chân/thân/toàn thân/không rõ).
Bước 2: Tổng hợp thông tin từ tất cả ảnh.
Bước 3: Mô tả thực tế những gì thấy được.

Trả về JSON thuần, không backtick:
{
  "so_anh_nhan_duoc": 2,
  "nhan_dien_anh": "Ảnh 1: [chụp phần gì, rõ hay mờ]. Ảnh 2: [chụp phần gì, rõ hay mờ]...",
  "do_ro_trung_binh": 70,
  "phan_thay_ro": "liệt kê những phần nhìn thấy rõ: mắt/chân/vảy/thân...",
  "phan_khong_ro": "liệt kê những phần không thấy rõ và lý do",
  "mat": "mô tả màu sắc, độ sáng, độ sâu — hoặc 'không quan sát được rõ vì [lý do]'",
  "chan": "mô tả màu chân, độ khô, gân nổi hay không — hoặc 'không quan sát được rõ'",
  "long_dang": "mô tả màu lông, dáng đứng, thể trạng thấy được",
  "vay_quan_sat": "MÔ TẢ KỸ những vảy thấy được: vị trí chính xác (sát gối/sát chậu/ngang cựa/dưới ngón giữa/khác), kích thước (to/vừa/nhỏ), hình dạng đặc biệt nếu có. KHÔNG đặt tên vảy. Nếu không thấy rõ vảy → ghi rõ lý do",
  "diem_manh": "2-3 điểm mạnh thực sự thấy được từ ảnh",
  "diem_han_che": "điểm yếu hoặc phần không quan sát được đủ",
  "nhan_xet_tong": "nhận xét tổng thể theo kiểu dân chơi gà miền Tây, dựa trên những gì thực sự thấy, không nịnh gà, không phán bừa"
}`;

export async function POST(req: NextRequest) {
  try {
    const { images } = await req.json();
    const validImages = (images || []).filter(Boolean);

    if (validImages.length === 0) {
      return NextResponse.json({ error: 'Cần ít nhất 1 ảnh' }, { status: 400 });
    }

    // Gửi tất cả ảnh — AI tự nhận diện từng ảnh là gì
    const content: any[] = [{ type: 'text', text: USER_PROMPT }];
    validImages.forEach((img: string, i: number) => {
      content.push({ type: 'text', text: `--- Ảnh ${i + 1} ---` });
      content.push({ type: 'image_url', image_url: { url: img, detail: 'high' } });
    });

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      max_tokens: 1500,
      temperature: 0.8,
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content },
      ],
    });

    const raw = response.choices[0].message.content || '';
    console.log('AI raw:', raw);

    let ai: any;
    try { ai = JSON.parse(raw); }
    catch {
      const m = raw.match(/\{[\s\S]*\}/);
      if (!m) return NextResponse.json({ error: 'Không parse được kết quả AI' }, { status: 500 });
      ai = JSON.parse(m[0]);
    }

    // Map vảy từ mô tả AI — không để AI tự đặt tên
    const mappedVay = mapVay(ai.vay_quan_sat || '');
    const doRo = ai.do_ro_trung_binh || 60;
    const tongDiem = tinhDiem(`${ai.mat} ${ai.chan} ${ai.long_dang}`, mappedVay, doRo);
    const doTinCay = Math.min(90, Math.round(doRo * 0.5 + mappedVay.tin_cay * 0.5));
    const gia = tinhGia(tongDiem, mappedVay.loai);

    return NextResponse.json({
      // Thông tin AI quan sát
      so_anh: validImages.length,
      nhan_dien_anh: ai.nhan_dien_anh,
      do_ro: doRo,
      chat_luong: ai.phan_thay_ro,
      phan_khong_ro: ai.phan_khong_ro,

      // Nội dung phân tích
      mat: ai.mat,
      chan: ai.chan,
      long_dang: ai.long_dang,
      vay_quan_sat: ai.vay_quan_sat,
      diem_manh: ai.diem_manh,
      diem_han_che: ai.diem_han_che,
      nhan_xet_tong: ai.nhan_xet_tong,

      // Kết luận từ code (không phải AI tự set)
      vay_ten: mappedVay.ten,
      vay_loai: mappedVay.loai,
      vay_ket_luan: mappedVay.ten
        ? `${mappedVay.loai === 'xau' ? '⚠️' : '✅'} Phát hiện vảy ${mappedVay.ten}`
        : '📊 Vảy phổ thông — không phát hiện vảy quý hay vảy xấu',
      vay_y_nghia: mappedVay.y_nghia,

      tong_diem: tongDiem,
      do_tin_cay: doTinCay,
      gia_de_xuat: gia,
      ly_do_gia: `Điểm ${tongDiem}/10 — ${mappedVay.ten ? `phát hiện ${mappedVay.ten}` : 'vảy phổ thông'} — độ rõ ảnh ${doRo}%`,

      yeu_cau_bo_sung: doRo < 70 || ai.phan_khong_ro?.includes('vảy')
        ? `Cần thêm ảnh: ${ai.phan_khong_ro || 'ảnh chân rõ sát gối và ngang cựa để xác định vảy chính xác'}`
        : validImages.length < 4
          ? `Hiện có ${validImages.length}/4 ảnh. Thêm ảnh để phân tích đầy đủ hơn.`
          : 'Ảnh đủ góc. Nếu có video đá thử càng chính xác hơn.',

      canh_bao: 'Nhận định AI từ hình ảnh — không phải đánh giá thực chiến. Giá tham khảo thị trường. Kết quả phụ thuộc nuôi dưỡng và luyện tập.',
    });

  } catch (error: any) {
    console.error('Error:', error?.message);
    return NextResponse.json({ error: error?.message }, { status: 500 });
  }
}
