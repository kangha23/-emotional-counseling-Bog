const assert = require("assert");
const parser = require("../council-parser.js");

const VALID_JSON = JSON.stringify({
  needsClarification: false,
  clarifyingQuestions: [],
  members: [
    { id: "friend", opinion: "Tớ nghĩ cậu ấy thích mày thật mà.", knownFacts: ["Gặp nhau vui"], assumptions: ["Có lẽ ẻm đang bận"], responseToPrevious: "" },
    { id: "expert", opinion: "Tôi không đồng ý với 'thích thật mà', cần thêm dữ kiện.", knownFacts: [], assumptions: [], responseToPrevious: "Tôi không đồng ý với câu 'thích thật mà'." },
    { id: "sister", opinion: "Hai cậu đều phiến diện. Chị thấy cần quan sát thêm.", knownFacts: [], assumptions: [], responseToPrevious: "Hai cậu đều sai." }
  ],
  decisionOptions: [
    { title: "Hành động ngay", benefits: ["Nhanh"], risks: ["Dễ bị từ chối"], verify: ["Xem cậu ấy chủ động không"], fit: "medium" },
    { title: "Quan sát thêm", benefits: ["An toàn"], risks: ["Lỡ thời cơ"], verify: [], fit: "high" }
  ],
  boundaries: ["Không hạ thấp bản thân"],
  consensus: "Cần thêm tín hiệu.",
  uncertainties: ["Ý định thật của đối phương"],
  recommendation: "Quan sát thêm 1 tuần rồi hẹn gặp.",
  confidence: "medium",
  actionPlan: [
    { title: "Giảm nhắn tin chủ động", timing: "trong tuần này" },
    { title: "Hẹn gặp cà phê", timing: "cuối tuần sau" }
  ]
});

// 1. JSON hợp lệ thuần
{
  const res = parser.parseCouncilResponse(VALID_JSON);
  assert.strictEqual(res.kind, "json");
  assert.strictEqual(res.data.members.length, 3);
  assert.strictEqual(res.data.members[0].id, "friend");
  assert.strictEqual(res.data.decisionOptions[1].fit, "high");
  assert.strictEqual(res.data.actionPlan.length, 2);
  assert.strictEqual(res.data.actionPlan[0].done, false);
  console.log("PASS: JSON hợp lệ thuần");
}

// 2. JSON trong markdown code fence
{
  const res = parser.parseCouncilResponse("```json\n" + VALID_JSON + "\n```");
  assert.strictEqual(res.kind, "json");
  assert.strictEqual(res.data.recommendation, "Quan sát thêm 1 tuần rồi hẹn gặp.");
  console.log("PASS: JSON trong code fence");
}

// 3. JSON kèm chữ phía trước/sau + fence không nhãn
{
  const res = parser.parseCouncilResponse("Đây là phân tích của hội đồng:\n```\n" + VALID_JSON + "\n```\nCảm ơn bạn!");
  assert.strictEqual(res.kind, "json");
  assert.strictEqual(res.data.confidence, "medium");
  console.log("PASS: JSON kèm chữ thừa + fence không nhãn");
}

// 4. JSON thiếu nhiều trường -> chuẩn hoá bằng default
{
  const res = parser.parseCouncilResponse('{"members":[{"id":"expert","opinion":"Cần bình tĩnh."}]}');
  assert.strictEqual(res.kind, "json");
  assert.strictEqual(res.data.members.length, 1);
  assert.strictEqual(res.data.members[0].id, "expert");
  assert.deepStrictEqual(res.data.decisionOptions, []);
  assert.strictEqual(res.data.confidence, "medium");
  assert.strictEqual(res.data.needsClarification, false);
  assert.strictEqual(res.data.actionPlan.length, 0);
  console.log("PASS: JSON thiếu trường -> default an toàn");
}

// 5. JSON lỗi hoàn toàn -> fallback legacy section
{
  const broken = '{ "members": [ { "id": "friend", "opinion": "Thiếu ngoặc...';
  const res = parser.parseCouncilResponse(broken);
  assert.strictEqual(res, null);
  console.log("PASS: JSON lỗi -> null (không crash)");
}

// 6. JSON needsClarification
{
  const res = parser.parseCouncilResponse(
    JSON.stringify({ needsClarification: true, clarifyingQuestions: ["Hai người quen nhau bao lâu?", "Gần đây có cãi nhau không?"] })
  );
  assert.strictEqual(res.kind, "json");
  assert.strictEqual(res.data.needsClarification, true);
  assert.strictEqual(res.data.clarifyingQuestions.length, 2);
  console.log("PASS: JSON hỏi làm rõ");
}

// 7. needsClarification=true nhưng không có câu hỏi -> coerce false và bị loại (rác)
{
  const normalized = parser.normalizeCouncilData({ needsClarification: true, clarifyingQuestions: [] });
  assert.strictEqual(normalized.needsClarification, false);
  assert.strictEqual(
    parser.parseCouncilResponse('{"needsClarification":true,"clarifyingQuestions":[]}'),
    null,
    "phản hồi rác -> null, client hiển thị raw + cảnh báo"
  );
  console.log("PASS: needsClarification không có câu hỏi -> false / bị loại");
}

// 8. Định dạng Hội đồng cũ (section markers)
{
  const legacy = "[BẠN THÂN 😎]\nTớ nghĩ nên nói thẳng!\n\n[CHUYÊN GIA 🩺]\nTôi không đồng ý, nên từ từ.\n\n[CHỊ ĐẠI 💅]\nHai cậu đều gà.\n\n[KẾT LUẬN ✨]\nQuan sát thêm.";
  const res = parser.parseCouncilResponse(legacy);
  assert.strictEqual(res.kind, "legacy");
  assert.strictEqual(res.sections.length, 4);
  assert.strictEqual(res.sections[0].name.includes("BAN THAN"), true);
  console.log("PASS: định dạng legacy section");
}

// 9. Legacy: marker không dấu, viết thường, bọc bold
{
  const legacy = "**[ban than]**\nNói thẳng đi!\n\n**[chuyen gia]**\nTừ từ thôi.";
  const res = parser.parseCouncilResponse(legacy);
  assert.strictEqual(res.kind, "legacy");
  assert.strictEqual(res.sections.length, 2);
  assert.strictEqual(res.sections[0].body, "Nói thẳng đi!");
  console.log("PASS: legacy không dấu + bold");
}

// 10. fit/confidence giá trị lạ -> medium
{
  const res = parser.parseCouncilResponse(
    JSON.stringify({ members: [{ id: "friend", opinion: "ok" }], confidence: "rat-cao", decisionOptions: [{ title: "A", fit: "sieu cao" }] })
  );
  assert.strictEqual(res.data.confidence, "medium");
  assert.strictEqual(res.data.decisionOptions[0].fit, "medium");
  console.log("PASS: fit/confidence lạ -> medium");
}

// 11. Chuỗi rỗng / null
{
  assert.strictEqual(parser.parseCouncilResponse(""), null);
  assert.strictEqual(parser.parseCouncilResponse(null), null);
  console.log("PASS: chuỗi rỗng/null -> null");
}

// 12. normalizeCouncilData an toàn với input phi object
{
  assert.strictEqual(parser.normalizeCouncilData("hack"), null);
  assert.strictEqual(parser.normalizeCouncilData([1, 2]), null);
  assert.strictEqual(parser.normalizeCouncilData(null), null);
  console.log("PASS: normalizeCouncilData từ chối input phi object");
}

console.log("\nTất cả parser tests PASSED ✅");
