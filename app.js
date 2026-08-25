const STORAGE_KEY = "jinxuan_conversations_v1";
const ACTIVE_KEY = "jinxuan_active_conversation";
const THEME_KEY = "jinxuan_theme";

const WELCOME_TEXT =
  "Chào bạn 🌷 Mình là **JinXuan**, trợ lý tư vấn tình cảm của bạn.\n\nDù là crush, yêu đương hay chia tay... cứ tâm sự với mình nha, mình luôn sẵn lòng lắng nghe 💕";

const chatBox = document.getElementById("chatBox");
const chatForm = document.getElementById("chatForm");
const messageInput = document.getElementById("messageInput");
const suggestionsEl = document.getElementById("suggestions");
const convListEl = document.getElementById("convList");
const sidebarEl = document.getElementById("sidebar");
const backdropEl = document.getElementById("sidebarBackdrop");
const themeToggleBtn = document.getElementById("themeToggle");

let conversations = [];
let activeId = null;
let abortController = null;

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
  if (e.key === "Escape") closeSidebar();
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
    avatar.textContent = "💗";
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

function addUserMessage(text, ts) {
  const { wrapper, bubble } = createMessageEl("user", ts);
  bubble.textContent = text;
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
    '<div class="msg-avatar">💗</div><div class="msg-body"><div class="bubble typing"><span></span><span></span><span></span></div></div>';
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
        addUserMessage(m.text, m.ts);
      } else {
        const el = addBotMessage(m.text, m.ts, { quiet: true });
        if (!m.synthetic) attachActions(el.wrapper, m);
      }
    }
    scrollBottom();
  }
  updateRegenVisibility();
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

async function streamChat({ message, history, signal, onDelta }) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message, history }),
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

async function requestBotReply(conv, message, hist) {
  abortController = new AbortController();
  const typing = showTyping();
  updateRegenVisibility();

  let acc = "";
  let el = null;

  try {
    await streamChat({
      message,
      history: hist,
      signal: abortController.signal,
      onDelta: (text) => {
        acc = text;
        if (!el) {
          removeTyping();
          el = addBotMessage("", Date.now(), { quiet: true });
        }
        el.bubble.innerHTML = renderRich(acc) + '<span class="caret"></span>';
        scrollBottom();
      }
    });

    const reply = acc.trim() || "Xin lỗi, mình chưa trả lời được lúc này 🌷";
    const botMsg = { role: "bot", text: reply, ts: Date.now() };
    conv.messages.push(botMsg);
    persist();

    if (el) {
      el.bubble.innerHTML = renderRich(reply);
      attachActions(el.wrapper, botMsg);
    } else {
      removeTyping();
      const fresh = addBotMessage(reply, botMsg.ts);
      attachActions(fresh.wrapper, botMsg);
    }
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
  conv.messages.push({ role: "user", text: message, ts: Date.now() });

  if (conv.messages.filter((m) => m.role === "user").length === 1) {
    conv.title = message.length > 42 ? message.slice(0, 42) + "…" : message;
  }
  persist();
  renderConvList();

  addUserMessage(message);
  suggestionsEl.classList.add("hidden");

  try {
    await requestBotReply(conv, message, hist);
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
  try {
    await requestBotReply(conv, lastUser.text, hist);
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
  sendMessage(chip.textContent.replace(/[^\p{L}\p{N}?.,! ]/gu, "").trim());
});

/* ---------- Khởi động ---------- */

spawnHearts();

conversations = loadConversations();
if (conversations.length) {
  const saved = localStorage.getItem(ACTIVE_KEY);
  activeId = conversations.some((c) => c.id === saved) ? saved : conversations[0].id;
  renderConvList();
  renderMessages(getActive());
} else {
  createConversation();
}

/* Hiệu ứng trái tim nền (giữ nguyên từ bản cũ) */
function spawnHearts() {
  const decor = document.getElementById("bgDecor");
  const symbols = ["💗", "🩷", "💕", "🌸", "✨"];
  for (let i = 0; i < 14; i++) {
    const h = document.createElement("span");
    h.className = "heart";
    h.textContent = symbols[i % symbols.length];
    h.style.left = Math.random() * 100 + "%";
    h.style.fontSize = 12 + Math.random() * 16 + "px";
    h.style.setProperty("--o", (0.15 + Math.random() * 0.25).toFixed(2));
    h.style.animationDuration = 10 + Math.random() * 12 + "s";
    h.style.animationDelay = -Math.random() * 20 + "s";
    decor.appendChild(h);
  }
}
