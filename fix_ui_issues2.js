const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');

// Fix openPubDetails TypeError
ui = ui.replace('const pub = state.markers.find((m) => m.pubData.id === pubId).pubData;', 'const pub = state.markers.find((m) => String(m.pubData.id) === String(pubId)).pubData;');

// Fix chat realtime typing mismatch in app.js
let app = fs.readFileSync('app.js', 'utf8');
app = app.replace('if (state.currentPubId === pubId)', 'if (String(state.currentPubId) === String(pubId))');
fs.writeFileSync('app.js', app);

// Remove Chat from Modal
const modalChatRegex = /<div style="margin-bottom: 20px; text-align: left; border: 1px solid var\(--border-color\); border-radius: 6px; overflow: hidden; display: flex; flex-direction: column; background: var\(--bg-app\);">[\s\S]*?<\/div>\s*<\/div>\s*<div style="display: flex; flex-direction: column; gap: 8px;">/m;
ui = ui.replace(modalChatRegex, '<div style="display: flex; flex-direction: column; gap: 8px;">');

// Find where to insert chat in sidebar
const targetStr = `</span>
                \${state.checkins && state.checkins[pubId] > 0 ? \`<span style="margin-left: 8px; font-size: 10px; font-weight: bold; background: #2196f3; color: white; padding: 2px 6px; border-radius: 12px;">👥 \${state.checkins[pubId]} here</span>\` : ""}
              </div>`;

const replaceStr = `</span>
                \${state.checkins && state.checkins[pubId] > 0 ? \`<span style="margin-left: 8px; font-size: 10px; font-weight: bold; background: #2196f3; color: white; padding: 2px 6px; border-radius: 12px;">👥 \${state.checkins[pubId]} here</span>\` : ""}
              </div>
              <button onclick="event.stopPropagation(); window.toggleSidebarChat('\${pubId}')" style="background:none; border:none; color:#2196f3; font-weight:bold; font-size:11px; cursor:pointer; padding: 4px 0; margin-top: 4px; display:flex; align-items:center;">💬 View Live Chat</button>
              <div id="sidebar-chat-container-\${pubId}" style="display:none; margin-top: 8px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-app); cursor: default;" onclick="event.stopPropagation()">
                <div id="sidebar-chat-messages-\${pubId}" style="height: 120px; overflow-y: auto; padding: 8px; font-size: 11px; display: flex; flex-direction: column; gap: 6px;">
                  <div style="color: var(--text-secondary); text-align: center; margin: auto;">Loading messages...</div>
                </div>
                <div style="display: flex; border-top: 1px solid var(--border-color);">
                  <input type="text" id="sidebar-chat-input-\${pubId}" placeholder="Type message..." style="flex: 1; border: none; padding: 6px; font-size: 11px; background: transparent; color: var(--text-primary); outline: none;" onkeypress="if(event.key === 'Enter') window.sendChatMessage('\${pubId}')">
                  <button onclick="window.sendChatMessage('\${pubId}')" style="background: #2196f3; color: white; border: none; padding: 0 10px; font-weight: bold; cursor: pointer; font-size: 11px;">Send</button>
                </div>
              </div>`;

ui = ui.replace(targetStr, replaceStr);

// Update sendChatMessage, loadChatMessages, renderChatMessages to use sidebar IDs
ui = ui.replace(/'chat-input-'/g, "'sidebar-chat-input-'");
ui = ui.replace(/'chat-messages-'/g, "'sidebar-chat-messages-'");

// Add toggleSidebarChat function
ui += `\nexport function toggleSidebarChat(pubId) {
  const container = document.getElementById('sidebar-chat-container-' + pubId);
  if (!container) return;
  if (container.style.display === 'none') {
    container.style.display = 'block';
    window.loadChatMessages(pubId);
  } else {
    container.style.display = 'none';
  }
}\n`;

fs.writeFileSync('ui.js', ui);

// Also add toggleSidebarChat to app.js window object
app = app.replace('window.loadChatMessages = loadChatMessages;', 'window.loadChatMessages = loadChatMessages;\nwindow.toggleSidebarChat = toggleSidebarChat;');
app = app.replace('import { checkIn, checkOut, sendChatMessage, loadChatMessages, renderChatMessages } from \'./ui.js\';', 'import { checkIn, checkOut, sendChatMessage, loadChatMessages, renderChatMessages, toggleSidebarChat } from \'./ui.js\';');
fs.writeFileSync('app.js', app);

