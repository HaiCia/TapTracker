const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');

// 1. Rewrite checkIn and checkOut to update the MODAL and the SIDEBAR (since we're moving it back to modal)
// Actually we can just call openPubDetails(pubId) and updateSidebarList() in checkIn/Out.
ui = ui.replace("state.myCheckin = data[0];\n    updateSidebarList();", "state.myCheckin = data[0];\n    window.updateSidebarList();\n    window.openPubDetails(pubId);");
ui = ui.replace("state.myCheckin = null;\n  updateSidebarList();", "state.myCheckin = null;\n  window.updateSidebarList();\n  window.openPubDetails(pubId);");


// 2. Remove buttons and chat container from listHtml
const sidebarButtonsRegex = /<button class="pub-status-btn status-unvisited"[\s\S]*?<div id="sidebar-chat-container-\$\{pubId\}"[\s\S]*?<\/div>\s*<\/div>\s*`;/m;

const replacementSidebar = `\${state.checkins && state.checkins[pubId] > 0 ? \`<div style="margin-top:4px; font-size:10px; font-weight:bold; background:#2196f3; color:white; padding:4px 6px; border-radius:12px; text-align:center;">👥 \${state.checkins[pubId]} checked in</div>\` : ""}
                <button onclick="event.stopPropagation(); window.openPubDetails('\${pubId}')" style="padding: 6px 12px; font-size: 10px; border-radius: 20px; font-weight: 900; background: var(--bg-app); border: 1px solid var(--border-color); color: var(--text-secondary); width: 100%; cursor: pointer;">
                    📖 VIEW
                </button>
                \${state.isListOnly ? \`<button onclick="event.stopPropagation(); window.toggleViewMode(); setTimeout(() => window.flyToPub(\${marker.pubData.lat}, \${marker.pubData.lng}), 100);" style="padding: 6px 12px; font-size: 10px; border-radius: 20px; font-weight: 900; background: #2196f3; border: none; color: white; width: 100%; cursor: pointer; margin-top: 4px;">🗺️ SEE ON MAP</button>\` : ''}
            </div>
        </div>
      \`;`;

if (ui.match(sidebarButtonsRegex)) {
  ui = ui.replace(sidebarButtonsRegex, replacementSidebar);
} else {
  console.log("Could not find listHtml buttons to replace");
}

// 3. Add Check-in and Chat to Modal
const modalInsertionRegex = /(<div style="margin-bottom: 15px; text-align: left;">)/;

const modalComponents = `
        <div id="checkin-container" style="background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; margin-bottom: 15px; text-align: center;">
          <div id="checkin-status" style="font-size: 12px; font-weight: bold; margin-bottom: 8px; color: var(--text-primary);">
            \${state.myCheckin && String(state.myCheckin.pub_id) === String(pubId) 
              ? '✅ You are checked in here' 
              : (state.checkins && state.checkins[pubId] ? \`👥 \${state.checkins[pubId]} people here\` : "No one is here right now")}
          </div>
          \${state.myCheckin && String(state.myCheckin.pub_id) === String(pubId)
            ? \`<button onclick="window.checkOut()" style="background: #e74c3c; color: white; border: none; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; cursor: pointer;">CHECK OUT</button>\`
            : \`<button onclick="window.checkIn('\${pubId}')" style="background: #2196f3; color: white; border: none; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; cursor: pointer;">📍 CHECK IN</button>\`}
        </div>

        <div id="modal-chat-container" style="background: var(--bg-app); padding: 10px; border-radius: 6px; margin-bottom: 15px; text-align: left; border: 1px solid var(--border-color);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <strong style="font-size: 12px; color: var(--text-secondary);">💬 Live Chat</strong>
            <span style="font-size:10px; background:#e74c3c; color:white; padding:2px 6px; border-radius:10px; font-weight:bold; display:\${state.pubMessages && state.pubMessages[pubId] && state.pubMessages[pubId].length > 0 ? 'block' : 'none'}">\${state.pubMessages && state.pubMessages[pubId] ? state.pubMessages[pubId].length : 0} msgs</span>
          </div>
          <div id="sidebar-chat-messages-\${pubId}" style="height: 150px; overflow-y: auto; padding: 8px; font-size: 11px; display: flex; flex-direction: column; gap: 6px; border: 1px solid var(--border-color); border-radius: 4px; margin-bottom: 6px; background: var(--bg-primary);">
            <div style="color: var(--text-secondary); text-align: center; margin: auto;">Loading messages...</div>
          </div>
          <div style="display: flex; gap: 4px;">
            <input type="text" id="sidebar-chat-input-\${pubId}" placeholder="Type message..." style="flex: 1; border: 1px solid var(--border-color); border-radius: 4px; padding: 6px; font-size: 11px; background: var(--bg-primary); color: var(--text-primary); outline: none;" onkeypress="if(event.key === 'Enter') window.sendChatMessage('\${pubId}')">
            <button onclick="window.sendChatMessage('\${pubId}')" style="background: #2196f3; color: white; border: none; padding: 0 10px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 11px;">Send</button>
          </div>
        </div>

        $1`;

if (ui.match(modalInsertionRegex)) {
  ui = ui.replace(modalInsertionRegex, modalComponents);
} else {
  console.log("Could not find modal insertion point");
}

fs.writeFileSync('ui.js', ui);
