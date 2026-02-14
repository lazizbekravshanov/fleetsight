const state = {
  sessionToken: "",
  currentConversationId: null,
  uploadedPath: "",
  role: "",
};

function q(id) {
  return document.getElementById(id);
}

function setStatus(text) {
  q("auth-status").textContent = text;
}

function appendMessage(role, content) {
  const box = q("messages");
  const item = document.createElement("div");
  item.className = `msg ${role}`;
  item.innerHTML = `<div class="role">${role}</div><pre>${escapeHtml(content)}</pre>`;
  box.appendChild(item);
  box.scrollTop = box.scrollHeight;
}

function escapeHtml(s) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

async function api(path, opts = {}) {
  const headers = opts.headers || {};
  if (state.sessionToken) {
    headers["x-session-token"] = state.sessionToken;
  }
  const res = await fetch(path, { ...opts, headers });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const msg = data.detail || `Request failed: ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

async function loadConversations() {
  if (!state.sessionToken) return;
  const data = await api("/api/conversations");
  const el = q("conversations");
  el.innerHTML = "";
  data.items.forEach((c) => {
    const b = document.createElement("button");
    b.className = "conv";
    b.textContent = c.title || `Conversation ${c.id}`;
    b.onclick = async () => {
      state.currentConversationId = c.id;
      q("messages").innerHTML = "";
      const history = await api(`/api/conversations/${c.id}`);
      history.messages.forEach((m) => appendMessage(m.role, m.content));
    };
    el.appendChild(b);
  });
}

q("signup").onclick = async () => {
  try {
    const data = await api("/api/auth/signup", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: q("email").value,
        password: q("password").value,
        role: q("role").value,
      }),
    });
    q("verify-token").value = data.debug_verify_token || "";
    setStatus("Signup complete. Verify email next.");
  } catch (e) {
    setStatus(e.message);
  }
};

q("verify").onclick = async () => {
  try {
    await api("/api/auth/verify-email", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ token: q("verify-token").value }),
    });
    setStatus("Email verified. Login now.");
  } catch (e) {
    setStatus(e.message);
  }
};

q("login").onclick = async () => {
  try {
    const data = await api("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        email: q("email").value,
        password: q("password").value,
      }),
    });
    state.sessionToken = data.session_token;
    state.role = data.role || "";
    setStatus(`Logged in as ${q("email").value} (${data.role})`);
    toggleAdminPanel();
    await loadConversations();
  } catch (e) {
    setStatus(e.message);
  }
};

q("upload").onclick = async () => {
  const file = q("csv-file").files[0];
  if (!file) {
    setStatus("Select a CSV file first.");
    return;
  }
  const form = new FormData();
  form.append("file", file);
  try {
    const data = await api("/api/analysis/upload", { method: "POST", body: form });
    state.uploadedPath = data.path;
    q("uploaded-path").textContent = data.display_path;
    setStatus("CSV uploaded.");
    appendMessage("assistant", `CSV uploaded at ${data.path}`);
  } catch (e) {
    setStatus(e.message);
  }
};

q("analyze-latest").onclick = async () => {
  q("prompt").value = "/fleetsight analyze latest --top 50 --threshold 30";
  q("send").click();
};

q("send").onclick = async () => {
  const text = q("prompt").value.trim();
  if (!text) return;
  appendMessage("user", text);
  q("prompt").value = "";
  try {
    const data = await api("/api/chat/message", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        conversation_id: state.currentConversationId,
        message: text,
      }),
    });
    state.currentConversationId = data.conversation_id;
    appendMessage("assistant", data.reply);
    await loadConversations();
  } catch (e) {
    appendMessage("assistant", `Error: ${e.message}`);
  }
};

q("new-chat").onclick = () => {
  state.currentConversationId = null;
  q("messages").innerHTML = "";
  appendMessage("assistant", "New chat started. Upload a CSV then run /fleetsight analyze <path>.");
};

function toggleAdminPanel() {
  const panel = q("admin-panel");
  if (state.role === "admin") {
    panel.classList.remove("hidden");
  } else {
    panel.classList.add("hidden");
  }
}

async function loadPendingUsers() {
  if (state.role !== "admin") return;
  const data = await api("/api/admin/pending-usdot");
  const box = q("pending-users");
  box.innerHTML = "";
  if (!data.items.length) {
    const empty = document.createElement("div");
    empty.className = "pending-item";
    empty.textContent = "No pending USDOT accounts.";
    box.appendChild(empty);
    return;
  }
  data.items.forEach((u) => {
    const row = document.createElement("div");
    row.className = "pending-item";
    row.innerHTML = `
      <div class="email">${escapeHtml(u.email)}</div>
      <div class="meta-line">id=${u.id} verified=${u.email_verified ? "yes" : "no"} created=${u.created_at}</div>
    `;
    const approveBtn = document.createElement("button");
    approveBtn.textContent = "Approve";
    approveBtn.onclick = async () => {
      try {
        await api("/api/admin/approve-user", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ user_id: u.id, approve: true }),
        });
        setStatus(`Approved user ${u.email}`);
        await loadPendingUsers();
      } catch (e) {
        setStatus(e.message);
      }
    };
    row.appendChild(approveBtn);
    box.appendChild(row);
  });
}

q("refresh-pending").onclick = async () => {
  try {
    await loadPendingUsers();
  } catch (e) {
    setStatus(e.message);
  }
};
