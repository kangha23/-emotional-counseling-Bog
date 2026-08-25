const API_URL = "https://generativelanguage.googleapis.com/v1beta/models/";
const MODEL = "gemini-3.5-flash-lite";

const SYSTEM_PROMPT = `Bạn là JinXuan, một trợ lý AI tư vấn tình cảm người Việt Nam, ấm áp, thấu hiểu và khéo léo.

Nguyên tắc trả lời:
- Luôn trả lời bằng tiếng Việt, giọng điệu gần gũi như một người bạn thân đáng tin cậy.
- Lắng nghe và thấu hiểu cảm xúc của người dùng trước khi đưa lời khuyên.
- Đưa ra lời khuyên thực tế, cụ thể, dễ áp dụng, có thể gợi ý theo từng bước.
- Trung lập, không phán xét, không đứng về phía nào khi hai bên có mâu thuẫn.
- Khuyến khích sự tôn trọng, trung thực và ranh giới lành mạnh trong các mối quan hệ.
- Nếu câu hỏi liên quan đến bạo lực, quấy rối hoặc tình huống nguy hiểm, nhẹ nhàng khuyên người dùng tìm đến sự giúp đỡ từ người thân đáng tin cậy hoặc cơ quan chức năng.
- Trả lời ngắn gọn, dễ đọc, có thể xuống dòng hoặc gạch đầu dòng khi cần. Hạn chế dưới 250 từ.`;

module.exports = async function handler(req, res) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) return res.status(500).json({ error: "Thiếu biến môi trường GEMINI_API_KEY" });

  try {
    const { message, history = [] } = req.body || {};
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Thiếu nội dung tin nhắn" });
    }

    const contents = [...history, { role: "user", parts: [{ text: message.slice(0, 4000) }] }];

    const upstream = await fetch(`${API_URL}${MODEL}:generateContent`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "x-goog-api-key": apiKey },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: SYSTEM_PROMPT }] },
        contents,
        generationConfig: { temperature: 0.8, maxOutputTokens: 1024 }
      })
    });

    const data = await upstream.json();
    if (!upstream.ok) {
      return res.status(upstream.status).json({ error: data?.error?.message || "Lỗi từ Gemini API" });
    }

    const reply =
      data.candidates?.[0]?.content?.parts?.map((p) => p.text).join("") ||
      "Xin lỗi, mình chưa trả lời được lúc này.";

    res.status(200).json({ reply: reply.trim() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
};

module.exports.maxDuration = 60;
