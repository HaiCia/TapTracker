const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');

const regex = /<span style="font-size: 10px; font-weight: 900; color: \$\{isVisited \? '#27ae60' : '#7f8c8d'\}; text-transform: uppercase;">[\s\S]*?👥 \$\{state\.checkins\[pubId\]\} here<\/span>` : ""\}[\s\S]*?<\/div>/;

const replaceStr = `<span style="font-size: 10px; font-weight: 900; color: \${isVisited ? '#27ae60' : '#7f8c8d'}; text-transform: uppercase;">
                  \${isVisited ? "✔️ VISITED" : "➕ TO VISIT"}
                </span>
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

if (ui.match(regex)) {
  ui = ui.replace(regex, replaceStr);
  fs.writeFileSync('ui.js', ui);
  console.log("Replaced sidebar HTML successfully");
} else {
  console.log("Regex not found!");
}
