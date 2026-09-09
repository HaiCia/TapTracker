const fs = require('fs');

// 1. Fix openPubDetails in ui.js
let ui = fs.readFileSync('ui.js', 'utf8');
ui = ui.replace('const pub = state.markers.find((m) => m.pubData.id === pubId).pubData;', 'const pub = state.markers.find((m) => String(m.pubData.id) === String(pubId)).pubData;');

// 2. Remove Chat from Modal
const modalChatRegex = /<div style="margin-bottom: 20px; text-align: left; border: 1px solid var\(--border-color\); border-radius: 6px; overflow: hidden; display: flex; flex-direction: column; background: var\(--bg-app\);">[\s\S]*?<\/div>\s*<\/div>\s*<div style="display: flex; flex-direction: column; gap: 8px;">/m;
ui = ui.replace(modalChatRegex, '<div style="display: flex; flex-direction: column; gap: 8px;">');

// 3. Add Chat to Sidebar List
// find updateSidebarList in ui.js
const sidebarListRegex = /<span style="font-size: 10px; font-weight: 900; color: \$\{isVisited \? '#27ae60' : '#7f8c8d'\}; text-transform: uppercase;">[\s\S]*?<\/span>[\s\S]*?\$\{state\.checkins && state\.checkins\[pubId\] > 0 \? `<span style="margin-left: 8px; font-size: 10px; font-weight: bold; background: #2196f3; color: white; padding: 2px 6px; border-radius: 12px;">👥 \$\{state\.checkins\[pubId\]\} here<\/span>` : ""\}/m;

const replacementSidebar = `<span style="font-size: 10px; font-weight: 900; color: \${isVisited ? '#27ae60' : '#7f8c8d'}; text-transform: uppercase;">
                  \${isVisited ? "✔️ VISITED" : "➕ TO VISIT"}
                </span>
                \${state.checkins && state.checkins[pubId] > 0 ? \`<span style="margin-left: 8px; font-size: 10px; font-weight: bold; background: #2196f3; color: white; padding: 2px 6px; border-radius: 12px;">👥 \${state.checkins[pubId]} here</span>\` : ""}
              </div>
              <button onclick="event.stopPropagation(); window.toggleSidebarChat('\${pubId}')" style="background:none; border:none; color:#2196f3; font-weight:bold; font-size:11px; cursor:pointer; padding: 4px 0; margin-top: 4px;">💬 View Live Chat</button>
              <div id="sidebar-chat-container-\${pubId}" style="display:none; margin-top: 8px; border: 1px solid var(--border-color); border-radius: 6px; background: var(--bg-app); cursor: default;" onclick="event.stopPropagation()">
                <div id="sidebar-chat-messages-\${pubId}" style="height: 120px; overflow-y: auto; padding: 8px; font-size: 11px; display: flex; flex-direction: column; gap: 6px;">
                  <div style="color: var(--text-secondary); text-align: center; margin: auto;">Loading messages...</div>
                </div>
                <div style="display: flex; border-top: 1px solid var(--border-color);">
                  <input type="text" id="sidebar-chat-input-\${pubId}" placeholder="Type message..." style="flex: 1; border: none; padding: 6px; font-size: 11px; background: transparent; color: var(--text-primary); outline: none;" onkeypress="if(event.key === 'Enter') window.sendChatMessage('\${pubId}')">
                  <button onclick="window.sendChatMessage('\${pubId}')" style="background: #2196f3; color: white; border: none; padding: 0 10px; font-weight: bold; cursor: pointer; font-size: 11px;">Send</button>
                </div>`;

ui = ui.replace(sidebarListRegex, replacementSidebar);

// Also we must strip the extra `</div>` that was part of the original HTML because we included `</div>` in `replacementSidebar`.
// Actually wait, let's look at listHtml original:
/*
<div style="display: flex; align-items: center; justify-content: space-between; margin-top: 5px;">
                <span style="...">
                  ${isVisited ? "✔️ VISITED" : "➕ TO VISIT"}
                </span>
                ${state.checkins ... > 0 ? `...` : ""}
              </div>
            </div>
*/
// If we replace just up to the checkins badge, we need to carefully match.
// Let's use string manipulation instead of complex regex.

fs.writeFileSync('ui.js', ui);
