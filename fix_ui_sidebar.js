const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');

const targetStr = '${isVisited ? "+ ADD AGAIN" : "+ ADD VISIT"}\n                </button>';

const replacementStr = `\${isVisited ? "+ ADD AGAIN" : "+ ADD VISIT"}
                </button>
                \${state.checkins && state.checkins[pubId] > 0 ? \`<div style="margin-top:4px; font-size:10px; font-weight:bold; background:#2196f3; color:white; padding:4px 6px; border-radius:12px; text-align:center;">👥 \${state.checkins[pubId]} tu jest</div>\` : ""}
                <button onclick="event.stopPropagation(); window.toggleSidebarChat('\${pubId}')" style="padding: 6px 12px; font-size: 10px; border-radius: 20px; font-weight: 900; background: none; border: 1px solid #2196f3; color: #2196f3; width: 100%; cursor: pointer; margin-top: 4px;">💬 CZAT</button>`;

ui = ui.replace(targetStr, replacementStr);

const targetStr2 = '</div>\n        </div>\n      `;';
const replacementStr2 = `</div>\n        </div>
        <div id="sidebar-chat-container-\${pubId}" style="display:none; padding: 10px; background: var(--bg-app); border-bottom: 1px solid var(--border-light); cursor: default;" onclick="event.stopPropagation()">
          <div id="sidebar-chat-messages-\${pubId}" style="height: 120px; overflow-y: auto; padding: 8px; font-size: 11px; display: flex; flex-direction: column; gap: 6px; border: 1px solid var(--border-color); border-radius: 4px; margin-bottom: 6px;">
            <div style="color: var(--text-secondary); text-align: center; margin: auto;">Loading messages...</div>
          </div>
          <div style="display: flex; gap: 4px;">
            <input type="text" id="sidebar-chat-input-\${pubId}" placeholder="Type message..." style="flex: 1; border: 1px solid var(--border-color); border-radius: 4px; padding: 6px; font-size: 11px; background: var(--bg-primary); color: var(--text-primary); outline: none;" onkeypress="if(event.key === 'Enter') window.sendChatMessage('\${pubId}')">
            <button onclick="window.sendChatMessage('\${pubId}')" style="background: #2196f3; color: white; border: none; padding: 0 10px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 11px;">Wyślij</button>
          </div>
        </div>
      \`;`;

ui = ui.replace(targetStr2, replacementStr2);

fs.writeFileSync('ui.js', ui);
