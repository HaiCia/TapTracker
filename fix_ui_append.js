const fs = require('fs');

const uiAppend = `

export async function checkIn(pubId) {
  const { data, error } = await supabaseClient.from('checkins').upsert({
    user_id: state.currentUser.id,
    pub_id: pubId,
    nickname: state.profile ? state.profile.nickname : 'Anonymous',
    checked_in_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
  }).select();
  if (!error && data) {
    state.myCheckin = data[0];
    openPubDetails(pubId);
  }
}

export async function checkOut() {
  if (!state.myCheckin) return;
  const pubId = state.myCheckin.pub_id;
  await supabaseClient.from('checkins').delete().eq('id', state.myCheckin.id);
  state.myCheckin = null;
  openPubDetails(pubId);
}

export async function sendChatMessage(pubId) {
  const input = document.getElementById('chat-input-' + pubId);
  if (!input || !input.value.trim()) return;
  const text = input.value.trim();
  input.value = '';
  await supabaseClient.from('pub_messages').insert({
    user_id: state.currentUser.id,
    pub_id: pubId,
    nickname: state.profile ? state.profile.nickname : 'Anonymous',
    message: text
  });
}

export async function loadChatMessages(pubId) {
  const container = document.getElementById('chat-messages-' + pubId);
  if (!container) return;
  const { data } = await supabaseClient.from('pub_messages').select('*').eq('pub_id', pubId).order('created_at', { ascending: true });
  if (data) {
    state.pubMessages[pubId] = data;
    renderChatMessages(pubId);
  }
}

export function renderChatMessages(pubId) {
  const container = document.getElementById('chat-messages-' + pubId);
  if (!container) return;
  const msgs = state.pubMessages[pubId] || [];
  if (msgs.length === 0) {
    container.innerHTML = '<div style="color: var(--text-secondary); text-align: center; margin: auto;">No messages yet. Say hi!</div>';
    return;
  }
  container.innerHTML = msgs.map(m => \`
    <div style="margin-bottom: 4px; line-height: 1.3;">
      <span style="font-weight: bold; color: \${m.user_id === state.currentUser.id ? '#2ecc71' : 'var(--text-primary)'};">\${escapeHTML(m.nickname)}</span>
      <span style="color: var(--text-secondary); font-size: 10px; margin-left: 4px;">\${new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span><br>
      <span style="color: var(--text-primary);">\${escapeHTML(m.message)}</span>
    </div>
  \`).join('');
  container.scrollTop = container.scrollHeight;
}
`;

let ui = fs.readFileSync('ui.js', 'utf8');
ui += uiAppend;
fs.writeFileSync('ui.js', ui);
