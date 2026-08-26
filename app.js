const STORAGE_KEY = "jinxuan_conversations_v1";
const ACTIVE_KEY = "jinxuan_active_conversation";
const THEME_KEY = "jinxuan_theme";
const PERSONA_KEY = "jinxuan_persona";
const MOODS_KEY = "jinxuan_moods_v1";
const CHECKIN_KEY = "jinxuan_last_checkin";
const TTS_KEY = "jinxuan_tts_enabled";

const WELCOME_TEXT =
  "Chào bạn 🌷 Mình là **JinXuan**, trợ lý tư vấn tình cảm của bạn.\n\nDù là crush, yêu đương hay chia tay... cứ tâm sự với mình nha, mình luôn sẵn lòng lắng nghe 💕";

/* ---------- Nhân vật (đồng bộ với api/chat.js) ---------- */

const PERSONAS = {
  ban_than: { short: "Bạn thân", desc: "Thẳng thắn, vui vẻ", avatar: "😎", tagline: "Thẳng thắn · Vui vẻ" },
  chuyen_gia: { short: "Chuyên gia", desc: "Dịu dàng, sâu sắc", avatar: "🩺", tagline: "Dịu dàng · Sâu sắc" },
  chi_da: { short: "Chị đại", desc: "Sắc sảo, thực tế", avatar: "💅", tagline: "Sắc sảo · Thực tế" }
};
const DEFAULT_PERSONA = "chuyen_gia";

function getPersonaKey() {
  const saved = localStorage.getItem(PERSONA_KEY);
  return saved && PERSONAS[saved] ? saved : DEFAULT_PERSONA;
}

function personaAvatar() {
  return PERSONAS[getPersonaKey()].avatar;
}

/* ---------- Cảm xúc & tâm trạng ---------- */

const EMOTIONS = {
  happy:   { emoji: "😊", score: 5,   label: "Vui vẻ",      color: "#fbbf24",
             words: ["vui", "vui vẻ", "hạnh phúc", "happy", "tuyệt", "cười", "mừng", "phấn khích", "yêu đời", "hào hứng", "sướng"] },
  love:    { emoji: "🥰", score: 4,   label: "Yêu thương",  color: "#ec4899",
             words: ["yêu", "thương", "crush", "tỏ tình", "hẹn hò", "tim đập", "bị đổ", "say đắm", "rung động"] },
  neutral: { emoji: "🙂", score: 3,   label: "Bình thường", color: "#94a3b8",
             words: [] },
  tired:   { emoji: "😞", score: 2.5, label: "Hơi mệt",     color: "#818cf8",
             words: ["mệt", "kiệt sức", "uể oải", "burnout", "hết sức", "chai sạn", "chán nản"] },
  anxious: { emoji: "😰", score: 2,   label: "Lo lắng",     color: "#38bdf8",
             words: ["lo", "lo lắng", "sợ", "hoảng", "áp lực", "stress", "bồn chồn", "trăn trở", "bất an", "hay nghĩ"] },
  sad:     { emoji: "😢", score: 1.5, label: "Buồn",        color: "#60a5fa",
             words: ["buồn", "khóc", "cô đơn", "tủi thân", "chia tay", "thất vọng", "đau lòng", "sầu", "tiếc", "trống trải", "nặng lòng"] },
  angry:   { emoji: "😠", score: 1,   label: "Tức giận",    color: "#ef4444",
             words: ["tức", "giận", "bực", "khó chịu", "ức chế", "điên", "ghét", "cãi nhau", "tát", "xúc phạm"] }
};

function detectEmotion(text) {
  const lower = text.toLowerCase();
  let best = null;
  let bestCount = 0;
  for (const [key, emo] of Object.entries(EMOTIONS)) {
    if (!emo.words.length) continue;
    let count = 0;
    for (const w of emo.words) {
      if (lower.includes(w)) count++;
    }
    if (count > bestCount) {
      bestCount = count;
      best = key;
    }
  }
  return best;
}

function todayStr(d = new Date()) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

let moodLog = (() => {
  try {
    const raw = JSON.parse(localStorage.getItem(MOODS_KEY));
    return Array.isArray(raw) ? raw : [];
  } catch {
    return [];
  }
})();

function persistMoods() {
  try {
    localStorage.setItem(MOODS_KEY, JSON.stringify(moodLog.slice(-500)));
  } catch {}
}

function addMoodEntry(entry) {
  moodLog.push(entry);
  persistMoods();
  renderMoodChart(currentRange);
}

const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const suggestionsEl = document.getElementById("suggestions");
const convListEl = document.getElementById("convList");
const sidebarEl = document.getElementById("sidebar");
const backdropEl = document.getElementById("sidebarBackdrop");
const themeToggleBtn = document.getElementById("themeToggle");
const personaBtn = document.getElementById("personaBtn");
const personaBtnLabel = document.getElementById("personaBtnLabel");
const personaMenu = document.getElementById("personaMenu");
const personaPickerEl = document.getElementById("personaPicker");
const headerAvatarEl = document.getElementById("headerAvatar");
const botTaglineEl = document.getElementById("botTagline");
const micBtn = document.getElementById("micBtn");
const ttsBtn = document.getElementById("ttsBtn");
const moodChartEl = document.getElementById("moodChart");
const weeklySummaryBtn = document.getElementById("weeklySummaryBtn");
const musicBtn = document.getElementById("musicBtn");
const moodTintEl = document.getElementById("moodTint");
const rehearsalOpenBtn = document.getElementById("rehearsalOpenBtn");
const rehearsalBannerEl = document.getElementById("rehearsalBanner");
const rehearsalRoleNameEl = document.getElementById("rehearsalRoleName");
const endRehearsalBtn = document.getElementById("endRehearsalBtn");
const rehearsalModalEl = document.getElementById("rehearsalModal");
const rehearsalCloseBtn = document.getElementById("rehearsalCloseBtn");
const roleGridEl = document.getElementById("roleGrid");
const roleNameInput = document.getElementById("roleNameInput");
const situationInput = document.getElementById("situationInput");
const goalInput = document.getElementById("goalInput");
const rehearsalStartBtn = document.getElementById("rehearsalStartBtn");
const councilOpenBtn = document.getElementById("councilOpenBtn");
const councilModalEl = document.getElementById("councilModal");
const councilCloseBtn = document.getElementById("councilCloseBtn");
const councilSituationInput = document.getElementById("councilSituationInput");
const councilQuestionInput = document.getElementById("councilQuestionInput");
const councilStartBtn = document.getElementById("councilStartBtn");

let conversations = [];
let activeId = null;
let abortController = null;
let currentRange = "week";

const SUGGESTIONS_DEFAULT_HTML = suggestionsEl.innerHTML;

/* ---------- Theme ---------- */

function applyTheme(theme) {
  document.body.dataset.theme = theme;
  themeToggleBtn.textContent = theme === "dark" ? "☀️" : "🌙";
  themeToggleBtn.title = theme === "dark" ? "Chế độ sáng" : "Chế độ tối";
  localStorage.setItem(THEME_KEY, theme);
}

applyTheme(
  localStorage.getItem(THEME_KEY) ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light")
);

themeToggleBtn.addEventListener("click", () => {
  applyTheme(document.body.dataset.theme === "dark" ? "light" : "dark");
});

/* ---------- Chọn nhân vật ---------- */

function applyPersonaVisual() {
  const p = PERSONAS[getPersonaKey()];
  headerAvatarEl.textContent = p.avatar;
  botTaglineEl.textContent = `Trực tuyến · ${p.tagline}`;
  personaBtnLabel.textContent = `${p.avatar} ${p.short}`;
}

function renderPersonaMenu() {
  personaMenu.innerHTML = "";
  for (const [key, p] of Object.entries(PERSONAS)) {
    const opt = document.createElement("button");
    opt.type = "button";
    opt.className = "persona-option" + (key === getPersonaKey() ? " active" : "");
    opt.innerHTML =
      `<span class="po-emoji">${p.avatar}</span>` +
      `<span class="po-text"><strong>${p.short}</strong><small>${p.desc}</small></span>` +
      `<span class="po-check">✓</span>`;
    opt.addEventListener("click", () => {
      localStorage.setItem(PERSONA_KEY, key);
      applyPersonaVisual();
      renderPersonaMenu();
      closePersonaMenu();
    });
    personaMenu.appendChild(opt);
  }
}

function closePersonaMenu() {
  personaMenu.classList.remove("open");
  personaPickerEl.classList.remove("menu-open");
}

personaBtn.addEventListener("click", (e) => {
  e.stopPropagation();
  if (personaMenu.classList.contains("open")) {
    closePersonaMenu();
  } else {
    renderPersonaMenu();
    personaMenu.classList.add("open");
    personaPickerEl.classList.add("menu-open");
  }
});

document.addEventListener("click", (e) => {
  if (!personaPickerEl.contains(e.target)) closePersonaMenu();
});
applyPersonaVisual();

/* ---------- Lưu trữ hội thoại ---------- */

function uid() {
  return typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : Date.now().toString(36) + Math.random().toString(36).slice(2);
}

function loadConversations() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
    return Array.isArray(raw)
      ? raw.filter(
          (c) => c && typeof c.id === "string" && Array.isArray(c.messages)
        )
      : [];
  } catch {
    return [];
  }
}

function persist() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
    localStorage.setItem(ACTIVE_KEY, activeId || "");
  } catch {
    // hết bộ nhớ thì bỏ qua
  }
}

function getActive() {
  return conversations.find((c) => c.id === activeId) || null;
}

function createConversation() {
  const conv = {
    id: uid(),
    title: "Tâm sự mới 💭",
    messages: [{ role: "bot", synthetic: true, text: WELCOME_TEXT, ts: Date.now() }],
    createdAt: Date.now()
  };
  conversations.unshift(conv);
  activeId = conv.id;
  persist();
  renderConvList();
  renderMessages(conv);
  return conv;
}

function switchConversation(id) {
  if (id === activeId) {
    closeSidebar();
    return;
  }
  abortCurrentStream();
  stopSpeaking();
  activeId = id;
  persist();
  renderConvList();
  renderMessages(getActive());
  closeSidebar();
}

function deleteConversation(id) {
  const conv = conversations.find((c) => c.id === id);
  if (!conv) return;
  if (!confirm(`Xoá hội thoại "${conv.title}"?`)) return;

  if (id === activeId) abortCurrentStream();
  conversations = conversations.filter((c) => c.id !== id);

  if (id === activeId) {
    if (conversations.length) {
      activeId = conversations[0].id;
      persist();
      renderConvList();
      renderMessages(getActive());
    } else {
      createConversation();
    }
  } else {
    persist();
    renderConvList();
  }
}

function renameConversation(id) {
  const conv = conversations.find((c) => c.id === id);
  if (!conv) return;
  const name = prompt("Đổi tên hội thoại:", conv.title);
  if (name === null) return;
  const trimmed = name.trim();
  if (trimmed) {
    conv.title = trimmed.slice(0, 60);
    persist();
    renderConvList();
  }
}

/* ---------- Sidebar ---------- */

function openSidebar() {
  sidebarEl.classList.add("open");
  backdropEl.classList.add("show");
  renderMoodChart(currentRange);
}

function closeSidebar() {
  sidebarEl.classList.remove("open");
  backdropEl.classList.remove("show");
}

document.getElementById("sidebarToggle").addEventListener("click", () =>
  sidebarEl.classList.contains("open") ? closeSidebar() : openSidebar()
);
backdropEl.addEventListener("click", closeSidebar);
document.getElementById("newChatBtn").addEventListener("click", () => {
  abortCurrentStream();
  createConversation();
  closeSidebar();
});
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") {
    closeSidebar();
    closePersonaMenu();
  }
});

function renderConvList() {
  convListEl.innerHTML = "";

  if (!conversations.length) {
    const empty = document.createElement("li");
    empty.className = "conv-empty";
    empty.textContent = "Chưa có hội thoại nào";
    convListEl.appendChild(empty);
    return;
  }

  for (const conv of conversations) {
    const item = document.createElement("li");
    item.className = "conv-item" + (conv.id === activeId ? " active" : "");

    const title = document.createElement("span");
    title.className = "conv-title";
    title.textContent = conv.title;
    item.appendChild(title);

    const actions = document.createElement("span");
    actions.className = "conv-item-actions";

    const renameBtn = document.createElement("button");
    renameBtn.type = "button";
    renameBtn.className = "conv-action";
    renameBtn.title = "Đổi tên";
    renameBtn.textContent = "✏️";
    renameBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      renameConversation(conv.id);
    });

    const delBtn = document.createElement("button");
    delBtn.type = "button";
    delBtn.className = "conv-action";
    delBtn.title = "Xoá";
    delBtn.textContent = "🗑️";
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteConversation(conv.id);
    });

    actions.append(renameBtn, delBtn);
    item.appendChild(actions);
    item.addEventListener("click", () => switchConversation(conv.id));
    convListEl.appendChild(item);
  }
}

/* ---------- Render tin nhắn ---------- */

function escapeHtml(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderRich(text) {
  const escaped = escapeHtml(text);
  const lines = escaped.split("\n");
  const out = [];
  let listItems = [];

  const flushList = () => {
    if (listItems.length) {
      out.push("<ul>" + listItems.map((li) => `<li>${li}</li>`).join("") + "</ul>");
      listItems = [];
    }
  };

  for (const line of lines) {
    const bullet = line.match(/^\s*[-•*]\s+(.*)$/);
    if (bullet) {
      listItems.push(bullet[1]);
    } else {
      flushList();
      if (line.trim()) out.push(line);
    }
  }
  flushList();

  return out
    .map((part) => (part.startsWith("<ul>") ? part : part.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>").replace(/\n/g, "<br>")))
    .join("");
}

function formatTime(ts) {
  return new Date(ts || Date.now()).toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function createMessageEl(role, ts) {
  const wrapper = document.createElement("div");
  wrapper.className = `message ${role}`;

  if (role === "bot") {
    const avatar = document.createElement("div");
    avatar.className = "msg-avatar";
    avatar.textContent = personaAvatar();
    wrapper.appendChild(avatar);
  }

  const body = document.createElement("div");
  body.className = "msg-body";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  body.appendChild(bubble);

  const time = document.createElement("div");
  time.className = "timestamp";
  time.textContent = formatTime(ts);
  body.appendChild(time);

  wrapper.appendChild(body);
  return { wrapper, body, bubble };
}

function scrollBottom() {
  chatBox.scrollTop = chatBox.scrollHeight;
}

function addUserMessage(text, ts, mood) {
  const { wrapper, bubble } = createMessageEl("user", ts);
  bubble.textContent = text;
  if (mood && EMOTIONS[mood]) {
    const reaction = document.createElement("span");
    reaction.className = "reaction";
    reaction.textContent = EMOTIONS[mood].emoji;
    reaction.title = "JinXuan thấy bạn đang: " + EMOTIONS[mood].label;
    bubble.appendChild(reaction);
  }
  chatBox.appendChild(wrapper);
  scrollBottom();
}

function addBotMessage(text, ts, opts = {}) {
  const el = createMessageEl("bot", ts);
  el.bubble.innerHTML = renderRich(text);
  chatBox.appendChild(el.wrapper);
  if (!opts.quiet) scrollBottom();
  return el;
}

function showTyping() {
  const wrapper = document.createElement("div");
  wrapper.className = "message bot";
  wrapper.id = "typing";
  wrapper.innerHTML =
    `<div class="msg-avatar">${personaAvatar()}</div><div class="msg-body"><div class="bubble typing"><span></span><span></span><span></span></div></div>`;
  chatBox.appendChild(wrapper);
  scrollBottom();
  return wrapper;
}

function removeTyping() {
  document.getElementById("typing")?.remove();
}

function renderMessages(conv) {
  chatBox.innerHTML = "";

  if (!conv || !conv.messages.length) {
    suggestionsEl.classList.remove("hidden");
  } else {
    suggestionsEl.classList.add("hidden");
    for (const m of conv.messages) {
      if (m.role === "user") {
        addUserMessage(m.text, m.ts, m.mood);
      } else {
        const el = addBotMessage(m.text, m.ts, { quiet: true });
        if (m.council) {
          el.bubble.classList.add("council");
          el.bubble.innerHTML = renderCouncilCards(m.text);
        }
        if (!m.synthetic) attachActions(el.wrapper, m);
      }
    }
    scrollBottom();
  }
  updateRegenVisibility();
  updateRehearsalBanner();
}

/* ---------- Action bar (copy / hỏi lại / đánh giá) ---------- */

function attachActions(wrapper, msg) {
  const bar = document.createElement("div");
  bar.className = "msg-actions";
  bar.innerHTML =
    '<button type="button" class="action-btn" data-action="copy" title="Copy">&#128203;</button>' +
    '<button type="button" class="action-btn" data-action="regen" title="Trả lời lại">&#128260;</button>' +
    '<button type="button" class="action-btn rate-btn" data-action="up" title="Hữu ích">&#128077;</button>' +
    '<button type="button" class="action-btn rate-btn" data-action="down" title="Chưa tốt">&#128078;</button>';
  wrapper.querySelector(".msg-body").appendChild(bar);
  refreshRateState(bar, msg);

  bar.addEventListener("click", async (e) => {
    const btn = e.target.closest(".action-btn");
    if (!btn) return;
    const action = btn.dataset.action;

    if (action === "copy") {
      const ok = await copyText(msg.text);
      btn.textContent = ok ? "✅" : "❌";
      setTimeout(() => (btn.innerHTML = "&#128203;"), 1200);
    } else if (action === "regen") {
      regenerate();
    } else if (action === "up" || action === "down") {
      msg.rating = msg.rating === action ? undefined : action;
      persist();
      refreshRateState(bar, msg);
    }
  });
}

function refreshRateState(bar, msg) {
  bar.querySelectorAll(".rate-btn").forEach((b) => {
    b.classList.toggle("rated", b.dataset.action === msg.rating);
  });
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      ta.remove();
      return true;
    } catch {
      return false;
    }
  }
}

function updateRegenVisibility() {
  const bots = [...chatBox.querySelectorAll(".message.bot")];
  const last = bots[bots.length - 1];
  bots.forEach((w) => {
    const regen = w.querySelector('[data-action="regen"]');
    if (regen) regen.style.display = w === last && !sendMessage.busy ? "" : "none";
  });
}

/* ---------- Gọi API với streaming ---------- */

function abortCurrentStream() {
  if (abortController) {
    abortController.abort();
    abortController = null;
  }
}

async function streamChat({ message, history, mood, extra = {}, signal, onDelta }) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history, persona: getPersonaKey(), mood, ...extra }),
    signal
  });

  if (!res.ok) {
    const data = await res.json().catch(() => null);
    throw Object.assign(
      new Error(
        res.status === 429
          ? "Bot đang quá tải, bạn chờ chút rồi thử lại nhé 🌷"
          : data?.error || `HTTP ${res.status}`
      ),
      { httpError: true }
    );
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let full = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const events = buffer.split("\n\n");
    buffer = events.pop() || "";

    for (const event of events) {
      const line = event.trim();
      if (!line.startsWith("data:")) continue;
      const payload = line.slice(5).trim();
      if (!payload || payload === "[DONE]") continue;

      let obj;
      try {
        obj = JSON.parse(payload);
      } catch {
        continue;
      }
      if (obj.error) throw new Error(obj.error);
      if (obj.text) {
        full += obj.text;
        onDelta(full);
      }
    }
  }
  return full;
}

function buildHistory(conv) {
  return (conv?.messages || [])
    .filter((m) => !m.synthetic && m.text)
    .map((m) => ({ role: m.role === "bot" ? "model" : "user", parts: [{ text: m.text }] }));
}

async function requestBotReply(conv, message, hist, mood, extra = {}) {
  abortController = new AbortController();
  const typing = showTyping();
  updateRegenVisibility();
  const isCouncil = extra.mode === "council";

  let acc = "";
  let el = null;

  try {
    await streamChat({
      message,
      history: hist,
      mood,
      extra,
      signal: abortController.signal,
      onDelta: (text) => {
        acc = text;
        if (!el) {
          removeTyping();
          el = addBotMessage("", Date.now(), { quiet: true });
        }
        if (isCouncil) {
          el.bubble.classList.add("council");
          el.bubble.innerHTML = renderCouncilCards(acc) + '<span class="caret"></span>';
        } else {
          el.bubble.innerHTML = renderRich(acc) + '<span class="caret"></span>';
        }
        scrollBottom();
      }
    });

    const reply = acc.trim() || "Xin lỗi, mình chưa trả lời được lúc này 🌷";
    const botMsg = { role: "bot", text: reply, ts: Date.now() };
    if (isCouncil) botMsg.council = true;
    conv.messages.push(botMsg);
    persist();

    if (el) {
      if (isCouncil) {
        el.bubble.classList.add("council");
        el.bubble.innerHTML = renderCouncilCards(reply);
      } else {
        el.bubble.innerHTML = renderRich(reply);
      }
      attachActions(el.wrapper, botMsg);
    } else {
      removeTyping();
      const fresh = addBotMessage(reply, botMsg.ts);
      if (isCouncil) {
        fresh.bubble.classList.add("council");
        fresh.bubble.innerHTML = renderCouncilCards(reply);
      }
      attachActions(fresh.wrapper, botMsg);
    }
    speak(reply);
  } catch (e) {
    removeTyping();

    if (e.name === "AbortError") {
      if (acc.trim()) {
        const botMsg = { role: "bot", text: acc.trim() + "\n\n_(đã dừng)_", ts: Date.now() };
        conv.messages.push(botMsg);
        persist();
        const fresh = addBotMessage(botMsg.text, botMsg.ts);
        attachActions(fresh.wrapper, botMsg);
      }
    } else if (acc.trim() && el) {
      const botMsg = { role: "bot", text: acc.trim(), ts: Date.now() };
      conv.messages.push(botMsg);
      persist();
      el.bubble.innerHTML = renderRich(botMsg.text);
      attachActions(el.wrapper, botMsg);
      addBotMessage(`⚠️ Mất kết nối giữa chừng: ${e.message}`, Date.now());
    } else {
      const hint =
        e.message === "Failed to fetch"
          ? "Mất kết nối mạng. Bạn kiểm tra internet rồi thử lại nhé 📶"
          : `Có lỗi xảy ra: ${e.message}`;
      addBotMessage(`⚠️ ${hint}`, Date.now());
    }
  } finally {
    abortController = null;
    updateRegenVisibility();
    scrollBottom();
  }
}

async function sendMessage(text) {
  const message = text.trim();
  if (!message || sendMessage.busy) return;
  sendMessage.busy = true;

  let conv = getActive();
  if (!conv) conv = createConversation();

  const hist = buildHistory(conv);
  const mood = detectEmotion(message);
  conv.messages.push({
    role: "user",
    text: message,
    ts: Date.now(),
    ...(mood ? { mood } : {})
  });

  if (mood) {
    addMoodEntry({ date: todayStr(), mood, source: "chat", ts: Date.now() });
  }
  setMoodAmbience(mood || "neutral");

  if (conv.messages.filter((m) => m.role === "user").length === 1) {
    conv.title = message.length > 42 ? message.slice(0, 42) + "…" : message;
  }
  persist();
  renderConvList();

  addUserMessage(message, Date.now(), mood);
  suggestionsEl.classList.add("hidden");

  const extra =
    conv.mode === "rehearsal" && !conv.rehearsalEnded
      ? { mode: "rehearsal", scenario: conv.scenario }
      : conv.mode === "council"
        ? { mode: "council", scenario: conv.scenario }
        : {};

  try {
    await requestBotReply(conv, message, hist, mood, extra);
  } finally {
    sendMessage.busy = false;
    updateRegenVisibility();
    messageInput.focus();
  }
}

async function regenerate() {
  if (sendMessage.busy) return;
  const conv = getActive();
  if (!conv) return;

  const lastBotIdx = [...conv.messages].reverse().findIndex((m) => m.role === "bot" && !m.synthetic);
  if (lastBotIdx === -1) return;
  const botIdx = conv.messages.length - 1 - lastBotIdx;

  const lastUser = [...conv.messages.slice(0, botIdx)].reverse().find((m) => m.role === "user");
  if (!lastUser) return;

  sendMessage.busy = true;
  conv.messages.splice(botIdx, 1);
  persist();
  renderMessages(conv);

  const hist = buildHistory(conv).slice(0, -1);
  const extra =
    conv.mode === "rehearsal" && !conv.rehearsalEnded
      ? { mode: "rehearsal", scenario: conv.scenario }
      : conv.mode === "council"
        ? { mode: "council", scenario: conv.scenario }
        : {};
  try {
    await requestBotReply(conv, lastUser.text, hist, lastUser.mood, extra);
  } finally {
    sendMessage.busy = false;
    updateRegenVisibility();
    messageInput.focus();
  }
}

/* ---------- Sự kiện ---------- */

chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  sendMessage(messageInput.value);
  messageInput.value = "";
});

suggestionsEl.addEventListener("click", (e) => {
  const chip = e.target.closest(".chip");
  if (!chip) return;

  if (suggestionsEl.dataset.mode === "checkin") {
    const mood = chip.dataset.mood;
    if (mood) answerCheckIn(mood);
    return;
  }
  sendMessage(chip.textContent.replace(/[^\p{L}\p{N}?.,! ]/gu, "").trim());
});

/* ---------- Chat bằng giọng nói ---------- */

let ttsEnabled = localStorage.getItem(TTS_KEY) === "1";

function updateTtsBtn() {
  ttsBtn.textContent = ttsEnabled ? "🔊" : "🔇";
  ttsBtn.title = ttsEnabled ? "Tắt đọc phản hồi" : "Đọc phản hồi bằng giọng nói";
  ttsBtn.classList.toggle("active", ttsEnabled);
}

function cleanForSpeech(text) {
  return text
    .replace(/\*\*/g, "")
    .replace(/^\s*[-•*]\s+/gm, "")
    .replace(/[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{2B00}-\u{2BFF}\u{FE00}-\u{FE0F}\u{2190}-\u{21FF}]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function stopSpeaking() {
  if ("speechSynthesis" in window) speechSynthesis.cancel();
}

function speak(text) {
  if (!ttsEnabled || !("speechSynthesis" in window)) return;
  speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(cleanForSpeech(text));
  utter.lang = "vi-VN";
  utter.rate = 1;
  const voice = speechSynthesis.getVoices().find((v) => /^vi/i.test(v.lang));
  if (voice) utter.voice = voice;
  speechSynthesis.speak(utter);
}

if ("speechSynthesis" in window) {
  speechSynthesis.onvoiceschanged = () => {};
}
updateTtsBtn();

ttsBtn.addEventListener("click", () => {
  ttsEnabled = !ttsEnabled;
  localStorage.setItem(TTS_KEY, ttsEnabled ? "1" : "0");
  if (!ttsEnabled) stopSpeaking();
  updateTtsBtn();
});

const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
let recognition = null;
let listening = false;

if (SpeechRec) {
  recognition = new SpeechRec();
  recognition.lang = "vi-VN";
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    messageInput.value = transcript;
    sendMessage(transcript);
    messageInput.value = "";
  };
  const stopListen = () => {
    listening = false;
    micBtn.classList.remove("listening");
  };
  recognition.onend = stopListen;
  recognition.onerror = stopListen;

  micBtn.addEventListener("click", () => {
    if (listening) {
      recognition.stop();
      return;
    }
    if (sendMessage.busy) return;
    stopSpeaking();
    try {
      recognition.start();
      listening = true;
      micBtn.classList.add("listening");
    } catch {}
  });
} else {
  micBtn.style.display = "none";
  micBtn.title = "Trình duyệt không hỗ trợ nhận giọng nói";
}

/* ---------- Check-in hằng ngày ---------- */

function maybeCheckIn() {
  if (localStorage.getItem(CHECKIN_KEY) === todayStr()) return;
  setTimeout(() => {
    const conv = getActive();
    if (!conv) return;
    const text = "☀️ **Check-in nhanh** nè: hôm nay bạn cảm thấy thế nào?";
    conv.messages.push({ role: "bot", synthetic: true, text, ts: Date.now() });
    persist();
    addBotMessage(text);
    showCheckInChips();
  }, 1000);
}

function showCheckInChips() {
  const options = ["happy", "neutral", "tired", "sad"];
  suggestionsEl.dataset.mode = "checkin";
  suggestionsEl.innerHTML = "";
  for (const key of options) {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "chip";
    btn.dataset.mood = key;
    btn.textContent = `${EMOTIONS[key].emoji} ${EMOTIONS[key].label}`;
    suggestionsEl.appendChild(btn);
  }
  suggestionsEl.classList.remove("hidden");
}

function restoreSuggestions() {
  delete suggestionsEl.dataset.mode;
  suggestionsEl.innerHTML = SUGGESTIONS_DEFAULT_HTML;
}

const CHECKIN_REPLIES = {
  happy: "Nghe bạn vui là mình mừng quá! 🎉 Giữ năng lượng này nha, muốn kể gì cứ kể mình nghe 💕",
  neutral: "Một ngày bình thường cũng là một ngày ổn 👍 Khi nào muốn tâm sự gì thì mình luôn ở đây nha 🌷",
  tired: "Mệt thì cứ nghỉ một chút nha, không phải lúc nào cũng phải gồng 💗 Uống nước, vươn vai rồi từ từ tính tiếp!",
  sad: "Cảm ơn bạn đã chia sẻ với mình 🌷 Bạn không cần gồng lên trước mình đâu. Muốn tâm sự chuyện gì thì mình nghe hết nha."
};

function answerCheckIn(mood) {
  localStorage.setItem(CHECKIN_KEY, todayStr());
  addMoodEntry({ date: todayStr(), mood, source: "checkin", ts: Date.now() });
  setMoodAmbience(mood);
  restoreSuggestions();
  suggestionsEl.classList.add("hidden");

  const conv = getActive();
  if (conv) {
    const text = CHECKIN_REPLIES[mood] || CHECKIN_REPLIES.neutral;
    conv.messages.push({ role: "bot", synthetic: true, text, ts: Date.now() });
    persist();
    addBotMessage(text);
  }
  messageInput.focus();
}

/* ---------- Biểu đồ tâm trạng ---------- */

const WEEKDAY_LABELS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

function lastNDates(n) {
  const out = [];
  const now = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    out.push(d);
  }
  return out;
}

function renderMoodChart(range) {
  currentRange = range;
  document.querySelectorAll(".mood-tab").forEach((b) => {
    b.classList.toggle("active", b.dataset.range === range);
  });

  moodChartEl.innerHTML = "";
  const days = lastNDates(range === "week" ? 7 : 30);
  const byDate = {};
  for (const entry of moodLog) {
    (byDate[entry.date] = byDate[entry.date] || []).push(entry);
  }

  for (const day of days) {
    const dateStr = todayStr(day);
    const entries = byDate[dateStr] || [];

    const col = document.createElement("div");
    col.className = "chart-col";

    const track = document.createElement("div");
    track.className = "chart-track";

    const bar = document.createElement("div");
    bar.className = "chart-bar";

    if (entries.length) {
      let sum = 0;
      const counts = {};
      for (const e of entries) {
        sum += EMOTIONS[e.mood]?.score ?? 3;
        counts[e.mood] = (counts[e.mood] || 0) + 1;
      }
      const avg = sum / entries.length;
      const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
      bar.style.height = Math.max(10, Math.round((avg / 5) * 100)) + "%";
      bar.style.background = EMOTIONS[top].color;
      col.title = `${dateStr}: ${EMOTIONS[top].emoji} ${EMOTIONS[top].label} (${entries.length} lần ghi nhận)`;
    } else {
      bar.classList.add("empty");
      bar.style.height = "6%";
    }

    track.appendChild(bar);
    col.appendChild(track);

    const label = document.createElement("span");
    label.className = "chart-label";
    label.textContent =
      range === "week" ? WEEKDAY_LABELS[day.getDay()] : String(day.getDate());
    col.appendChild(label);

    moodChartEl.appendChild(col);
  }
}

document.querySelectorAll(".mood-tab").forEach((tab) => {
  tab.addEventListener("click", () => renderMoodChart(tab.dataset.range));
});

/* ---------- Tổng kết tuần ---------- */

function buildWeeklySummary() {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - 7);
  const cutoffStr = todayStr(cutoff);
  const recent = moodLog.filter((e) => e.date >= cutoffStr);

  if (!recent.length) {
    return "Tuần này bạn chưa ghi lại tâm trạng nào cả 🥺 Check-in mỗi sáng hoặc cứ trò chuyện với mình — mình sẽ tự để ý cảm xúc của bạn và tổng kết giúp nha!";
  }

  const counts = {};
  for (const e of recent) {
    counts[e.mood] = (counts[e.mood] || 0) + 1;
  }
  const ranked = Object.entries(counts).sort((a, b) => b[1] - a[1]);
  const dominant = ranked[0][0];

  const openers = {
    happy: "Nghe kể tuần này bạn khá vui vẻ đó nha 🎉 Mình vui thay!",
    love: "Tuần này tràn ngập sắc hồng nhỉ 🥰 Thật đáng mừng!",
    neutral: "Tuần này của bạn khá êm đềm, ổn định 👍",
    tired: "Tuần này bạn có vẻ hơi mệt 😞 Cho mình ôm bạn một cái nha 🫂",
    anxious: "Tuần này bạn lo nghĩ nhiều quá 😰 Không sao đâu, có mình ở đây.",
    sad: "Tuần này bạn hơi buồn nha 🌷 Cảm ơn bạn vì vẫn cố gắng qua từng ngày.",
    angry: "Tuần này có nhiều chuyện làm bạn bực mình nhỉ 😤 Giận thì giận, nhưng đừng quên thương bản thân nha."
  };

  const tips = {
    happy: "Tip nhỏ: lưu lại những khoảnh khắc vui này vào nhật ký, lúc buồn đọc lại sẽ đỡ hơn nhiều đó 💛",
    love: "Tip nhỏ: tình cảm đẹp nhất khi cả hai đều chủ quan ngang nhau, nhớ giữ sự tự tin của bạn nhé 💕",
    neutral: "Tip nhỏ: thử hẹn một hoạt động mới trong tuần tới cho cuộc sống thêm màu sắc nha ✨",
    tired: "Tip nhỏ: ngủ đủ giường + bớt một việc không cần thiết trong tuần này nhé. Bạn không máy móc mà 💗",
    anxious: "Tip nhỏ: viết ra hết điều bạn lo ra giấy, rồi chia 'lo được kiểm soát' và 'không kiểm soát' — bạn sẽ nhẹ hơn ngay 🌷",
    sad: "Tip nhỏ: đừng ép mình phải vui ngay. Tự cho phép mình buồn, rồi từng bước một, mình đi cùng bạn nha 💙",
    angry: "Tip nhỏ: trước khi phản hồi ai đó khi đang giận, hít thở sâu đếm đến 10 rồi hãy nhắn tin nha 🔥"
  };

  const lines = ranked.map(
    ([mood, count]) => `- ${EMOTIONS[mood].emoji} **${EMOTIONS[mood].label}**: ${count} lần`
  );

  return (
    openers[dominant] +
    "\n\nTổng kết 7 ngày qua:\n" +
    lines.join("\n") +
    "\n\n" +
    tips[dominant]
  );
}

weeklySummaryBtn.addEventListener("click", () => {
  if (sendMessage.busy) return;
  abortCurrentStream();
  const conv = getActive() || createConversation();
  const text = buildWeeklySummary();
  conv.messages.push({ role: "bot", synthetic: true, text, ts: Date.now() });
  persist();
  addBotMessage(text);
  speak(text);
  closeSidebar();
});

/* ---------- Rehearsal Mode: luyện nói trước khi nói thật ---------- */

const REHEARSAL_ROLES = [
  { key: "crush", label: "Crush", emoji: "😊" },
  { key: "partner", label: "Người yêu", emoji: "💑" },
  { key: "ex", label: "Người yêu cũ", emoji: "💔" },
  { key: "friend", label: "Bạn thân", emoji: "🤝" },
  { key: "parent", label: "Bố/Mẹ", emoji: "👪" },
  { key: "boss", label: "Sếp", emoji: "👔" },
  { key: "custom", label: "Khác", emoji: "✏️" }
];

let selectedRole = "crush";

function updateRehearsalBanner() {
  const conv = getActive();
  const show = conv && conv.mode === "rehearsal" && !conv.rehearsalEnded;
  rehearsalBannerEl.classList.toggle("hidden", !show);
  if (show) {
    const role = REHEARSAL_ROLES.find((r) => r.key === conv.scenario.role);
    rehearsalRoleNameEl.textContent =
      conv.scenario.roleName || `${role?.emoji || ""} ${role?.label || "nhân vật"}`.trim();
  }
}

function renderRoleGrid() {
  roleGridEl.innerHTML = "";
  for (const r of REHEARSAL_ROLES) {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "role-chip" + (r.key === selectedRole ? " active" : "");
    chip.textContent = `${r.emoji} ${r.label}`;
    chip.addEventListener("click", () => {
      selectedRole = r.key;
      renderRoleGrid();
    });
    roleGridEl.appendChild(chip);
  }
}

function openRehearsalModal() {
  renderRoleGrid();
  rehearsalModalEl.classList.remove("hidden");
}

function closeRehearsalModal() {
  rehearsalModalEl.classList.add("hidden");
}

rehearsalOpenBtn.addEventListener("click", () => {
  closeSidebar();
  openRehearsalModal();
});
rehearsalCloseBtn.addEventListener("click", closeRehearsalModal);
rehearsalModalEl.addEventListener("click", (e) => {
  if (e.target === rehearsalModalEl) closeRehearsalModal();
});

rehearsalStartBtn.addEventListener("click", async () => {
  const situation = situationInput.value.trim();
  if (!situation) {
    situationInput.classList.add("error");
    situationInput.focus();
    setTimeout(() => situationInput.classList.remove("error"), 1500);
    return;
  }

  abortCurrentStream();
  const conv = createConversation();
  conv.mode = "rehearsal";
  conv.scenario = {
    role: selectedRole,
    roleName: roleNameInput.value.trim(),
    situation,
    goal: goalInput.value.trim()
  };
  const role = REHEARSAL_ROLES.find((r) => r.key === selectedRole);
  conv.title = `🎭 ${role?.label || "Luyện tập"}${conv.scenario.roleName ? ` · ${conv.scenario.roleName}` : ""}`;
  persist();
  renderConvList();
  renderMessages(conv);

  closeRehearsalModal();
  roleNameInput.value = "";
  situationInput.value = "";
  goalInput.value = "";

  updateRehearsalBanner();
  const kick = "(Bắt đầu phiên luyện tập. Hãy mở đầu đúng vai — nói câu đầu tiên như nhân vật sẽ nói trong tình huống này.)";
  sendMessage.busy = true;
  try {
    await requestBotReply(conv, kick, [], null, { mode: "rehearsal", scenario: conv.scenario });
  } finally {
    sendMessage.busy = false;
    updateRegenVisibility();
  }
});

endRehearsalBtn.addEventListener("click", async () => {
  if (sendMessage.busy) return;
  const conv = getActive();
  if (!conv || conv.mode !== "rehearsal" || conv.rehearsalEnded) return;

  sendMessage.busy = true;
  endRehearsalBtn.disabled = true;
  const hist = buildHistory(conv);
  conv.rehearsalEnded = true;
  persist();
  updateRehearsalBanner();

  try {
    await requestBotReply(
      conv,
      "(Người dùng bấm kết thúc phiên. Hãy chuyển sang vai huấn luyện viên và đưa nhận xét.)",
      hist,
      null,
      { endRehearsal: true }
    );
  } finally {
    sendMessage.busy = false;
    endRehearsalBtn.disabled = false;
    updateRegenVisibility();
    updateRehearsalBanner();
  }
});

/* ---------- Hội đồng tư vấn ---------- */

function parseCouncil(text) {
  const re = /\[(BẠN THÂN|CHUYÊN GIA|CHỊ ĐẠI|KẾT LUẬN)[^\]]*\]/g;
  const sections = [];
  let match;
  let lastIndex = 0;
  let current = null;
  while ((match = re.exec(text))) {
    if (current) current.body = text.slice(lastIndex, match.index).trim();
    current = { name: match[1], body: "" };
    sections.push(current);
    lastIndex = re.lastIndex;
  }
  if (current) current.body = text.slice(lastIndex).trim();
  return sections;
}

function councilMeta(name) {
  if (name.includes("BẠN THÂN")) return { emoji: "😎", label: "Bạn thân" };
  if (name.includes("CHUYÊN GIA")) return { emoji: "🩺", label: "Chuyên gia" };
  if (name.includes("CHỊ ĐẠI")) return { emoji: "💅", label: "Chị đại" };
  return { emoji: "✨", label: "Kết luận hội đồng", final: true };
}

function renderCouncilCards(text) {
  const sections = parseCouncil(text);
  if (!sections.length) return renderRich(text);
  return sections
    .map((s) => {
      const meta = councilMeta(s.name);
      return (
        `<div class="council-card${meta.final ? " final" : ""}">` +
        `<div class="cc-head"><span class="cc-emoji">${meta.emoji}</span><span class="cc-name">${meta.label}</span></div>` +
        `<div class="cc-body">${renderRich(s.body)}</div>` +
        `</div>`
      );
    })
    .join("");
}

function openCouncilModal() {
  councilModalEl.classList.remove("hidden");
  councilSituationInput.focus();
}

function closeCouncilModal() {
  councilModalEl.classList.add("hidden");
}

councilOpenBtn.addEventListener("click", () => {
  closeSidebar();
  openCouncilModal();
});
councilCloseBtn.addEventListener("click", closeCouncilModal);
councilModalEl.addEventListener("click", (e) => {
  if (e.target === councilModalEl) closeCouncilModal();
});

councilStartBtn.addEventListener("click", async () => {
  const situation = councilSituationInput.value.trim();
  if (!situation) {
    councilSituationInput.classList.add("error");
    councilSituationInput.focus();
    setTimeout(() => councilSituationInput.classList.remove("error"), 1500);
    return;
  }

  abortCurrentStream();
  const conv = createConversation();
  conv.mode = "council";
  conv.scenario = {
    situation,
    question: councilQuestionInput.value.trim()
  };
  conv.title = "👥 " + (situation.length > 34 ? situation.slice(0, 34) + "…" : situation);
  persist();
  renderConvList();
  renderMessages(conv);

  closeCouncilModal();
  councilSituationInput.value = "";
  councilQuestionInput.value = "";

  const kick = "(Bắt đầu hội đồng. Hãy phân tích tình huống và cho lời khuyên theo đúng định dạng.)";
  sendMessage.busy = true;
  try {
    await requestBotReply(conv, kick, [], null, { mode: "council", scenario: conv.scenario });
  } finally {
    sendMessage.busy = false;
    updateRegenVisibility();
  }
});

/* ---------- Âm nhạc & thời tiết theo tâm trạng ---------- */

const MOOD_THEMES = {
  happy:   { root: 523.25, intervals: [0, 4, 7, 9, 12], wave: "triangle", rate: 420,  cutoff: 2400, gain: 0.05 },
  love:    { root: 440.0,  intervals: [0, 3, 7, 10, 12], wave: "sine",     rate: 560,  cutoff: 1800, gain: 0.05 },
  neutral: { root: 392.0,  intervals: [0, 2, 4, 7, 9],   wave: "sine",     rate: 750,  cutoff: 1400, gain: 0.045 },
  tired:   { root: 349.23, intervals: [0, 3, 7, 10, 14], wave: "sine",     rate: 950,  cutoff: 1000, gain: 0.04 },
  anxious: { root: 415.3,  intervals: [0, 2, 5, 7, 10],  wave: "sawtooth", rate: 400,  cutoff: 1500, gain: 0.03 },
  sad:     { root: 329.63, intervals: [0, 3, 7, 10, 15], wave: "sine",     rate: 1000, cutoff: 900,  gain: 0.045 },
  angry:   { root: 220.0,  intervals: [0, 3, 6, 7, 10],  wave: "square",   rate: 480,  cutoff: 750,  gain: 0.03 }
};

const MOOD_TINTS = {
  happy: "#fbbf24",
  love: "#ec4899",
  neutral: "#a855f7",
  tired: "#818cf8",
  anxious: "#38bdf8",
  sad: "#60a5fa",
  angry: "#ef4444"
};

const MOOD_WEATHER = {
  happy: "sparkle",
  love: "heart",
  neutral: "heart",
  tired: "zzz",
  anxious: "leaf",
  sad: "rain",
  angry: "ember"
};

let currentMood = "neutral";
let musicEnabled = false;
let audioCtx = null;
let musicMaster = null;
let delayNode = null;
let musicTimer = null;
let noteCounter = 0;

function applyWeather(mood) {
  const decor = document.getElementById("bgDecor");
  decor.innerHTML = "";
  const kind = MOOD_WEATHER[mood] || "heart";

  if (kind === "rain") {
    for (let i = 0; i < 42; i++) {
      const d = document.createElement("span");
      d.className = "drop";
      d.style.left = Math.random() * 100 + "%";
      d.style.animationDuration = 0.8 + Math.random() * 0.9 + "s";
      d.style.animationDelay = -Math.random() * 2 + "s";
      d.style.opacity = 0.25 + Math.random() * 0.35;
      decor.appendChild(d);
    }
    return;
  }

  const sets = {
    heart: ["💗", "🩷", "💕", "🌸", "✨"],
    sparkle: ["✨", "⭐", "🌟", "💫", "🌸"],
    ember: ["🔥", "✨"],
    leaf: ["🍃", "🌿"],
    zzz: ["💤"]
  };
  const symbols = sets[kind] || sets.heart;
  const baseDur = kind === "ember" ? 5 : kind === "zzz" ? 14 : 10;

  for (let i = 0; i < 14; i++) {
    const h = document.createElement("span");
    h.className = "heart";
    h.textContent = symbols[i % symbols.length];
    h.style.left = Math.random() * 100 + "%";
    h.style.fontSize = 12 + Math.random() * 16 + "px";
    h.style.setProperty("--o", (0.15 + Math.random() * 0.25).toFixed(2));
    h.style.animationDuration = baseDur + Math.random() * 10 + "s";
    h.style.animationDelay = -Math.random() * 20 + "s";
    decor.appendChild(h);
  }
}

function setMoodAmbience(mood) {
  if (!mood || !MOOD_TINTS[mood]) return;
  currentMood = mood;
  try {
    localStorage.setItem("jinxuan_ambient_mood", mood);
  } catch {}
  moodTintEl.style.background = MOOD_TINTS[mood];
  moodTintEl.style.opacity = mood === "neutral" ? 0.07 : 0.14;
  applyWeather(mood);
}

function ensureAudio() {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || window.webkitAudioContext)();
    musicMaster = audioCtx.createGain();
    musicMaster.gain.value = 0.6;
    musicMaster.connect(audioCtx.destination);

    delayNode = audioCtx.createDelay(1);
    delayNode.delayTime.value = 0.32;
    const feedback = audioCtx.createGain();
    feedback.gain.value = 0.35;
    const wet = audioCtx.createGain();
    wet.gain.value = 0.4;
    delayNode.connect(feedback).connect(delayNode);
    delayNode.connect(wet).connect(musicMaster);
  }
  if (audioCtx.state === "suspended") audioCtx.resume();
  return audioCtx;
}

function playNote(theme, opts = {}) {
  const t = audioCtx.currentTime;
  const osc = audioCtx.createOscillator();
  osc.type = opts.bass ? "sine" : theme.wave;
  const semi = opts.bass ? 0 : theme.intervals[Math.floor(Math.random() * theme.intervals.length)];
  osc.frequency.value =
    theme.root * (opts.bass ? 0.5 : Math.random() < 0.3 ? 2 : 1) * Math.pow(2, semi / 12);

  const g = audioCtx.createGain();
  const peak = opts.bass ? theme.gain * 1.4 : theme.gain;
  const dur = opts.bass ? 2.6 : 1.8;
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + (opts.bass ? 0.15 : 0.02));
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);

  const f = audioCtx.createBiquadFilter();
  f.type = "lowpass";
  f.frequency.value = opts.bass ? 500 : theme.cutoff;

  osc.connect(f);
  f.connect(g);
  g.connect(musicMaster);
  g.connect(delayNode);
  osc.start(t);
  osc.stop(t + dur + 0.1);
}

function musicTick() {
  const theme = MOOD_THEMES[currentMood] || MOOD_THEMES.neutral;
  playNote(theme);
  if (noteCounter++ % 4 === 0) playNote(theme, { bass: true });
  musicTimer = setTimeout(musicTick, theme.rate * (0.7 + Math.random() * 0.6));
}

function startMusic() {
  ensureAudio();
  clearTimeout(musicTimer);
  musicTick();
}

function stopMusic() {
  clearTimeout(musicTimer);
  musicTimer = null;
  if (audioCtx) audioCtx.suspend();
}

function updateMusicBtn() {
  musicBtn.textContent = musicEnabled ? "🎶" : "🎵";
  musicBtn.title = musicEnabled ? "Tắt nhạc nền" : "Nhạc nền theo tâm trạng";
  musicBtn.classList.toggle("music-on", musicEnabled);
}

musicBtn.addEventListener("click", () => {
  musicEnabled = !musicEnabled;
  try {
    localStorage.setItem("jinxuan_music", musicEnabled ? "1" : "0");
  } catch {}
  if (musicEnabled) startMusic();
  else stopMusic();
  updateMusicBtn();
});

document.addEventListener("click", function resumeAudioOnce() {
  if (musicEnabled) ensureAudio();
  document.removeEventListener("click", resumeAudioOnce);
});

/* ---------- Khởi động ---------- */

musicEnabled = localStorage.getItem("jinxuan_music") === "1";
updateMusicBtn();

const savedAmbientMood = localStorage.getItem("jinxuan_ambient_mood");
if (savedAmbientMood && MOOD_TINTS[savedAmbientMood]) currentMood = savedAmbientMood;
moodTintEl.style.background = MOOD_TINTS[currentMood];
moodTintEl.style.opacity = currentMood === "neutral" ? 0.07 : 0.14;
applyWeather(currentMood);
if (musicEnabled) startMusic();

conversations = loadConversations();
if (conversations.length) {
  const saved = localStorage.getItem(ACTIVE_KEY);
  activeId = conversations.some((c) => c.id === saved) ? saved : conversations[0].id;
  renderConvList();
  renderMessages(getActive());
} else {
  createConversation();
}

renderMoodChart("week");
maybeCheckIn();

