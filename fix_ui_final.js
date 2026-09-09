const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');

// 1. Change "tu jest" to "checked in"
ui = ui.replace('tu jest</div>', 'checked in</div>');

// 2. Wrap pub name instead of truncate
const nameTruncateRegex = /<span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">\$\{escapeHTML\(marker\.pubData\.name\)\}<\/span>/g;
ui = ui.replace(nameTruncateRegex, '<span style="word-break: break-word;">${escapeHTML(marker.pubData.name)}</span>');

// 3. Move CHECK IN from modal to sidebar
// First, remove checkin-container from modal
const modalCheckinRegex = /<div id="checkin-container"[\s\S]*?<\/div>\s*(<div style="background: var\(--bg-app\); padding: 10px; border-radius: 6px; margin-bottom: 15px;">)/;
if (ui.match(modalCheckinRegex)) {
  ui = ui.replace(modalCheckinRegex, '$1');
} else {
  console.log("Could not find checkin-container in modal");
}

// Next, add CHECK IN to sidebar list
const sidebarButtonsRegex = /(<button class="pub-status-btn status-unvisited"[\s\S]*?<\/button>\s*)\$\{state\.checkins && state\.checkins\[pubId\] > 0 \? `<div style="margin-top:4px; font-size:10px; font-weight:bold; background:#2196f3; color:white; padding:4px 6px; border-radius:12px; text-align:center;">👥 \$\{state\.checkins\[pubId\]\} checked in<\/div>` : ""\}/;

if (ui.match(sidebarButtonsRegex)) {
  const replaceStr = `$1\${state.checkins && state.checkins[pubId] > 0 ? \`<div style="margin-top:4px; font-size:10px; font-weight:bold; background:#2196f3; color:white; padding:4px 6px; border-radius:12px; text-align:center;">👥 \${state.checkins[pubId]} checked in</div>\` : ""}
                \${state.myCheckin && state.myCheckin.pub_id === pubId
                  ? \`<button onclick="event.stopPropagation(); window.checkOut()" style="padding: 6px 12px; font-size: 10px; border-radius: 20px; font-weight: 900; background: #e74c3c; border: none; color: white; width: 100%; cursor: pointer; margin-top: 4px;">CHECK OUT</button>\`
                  : \`<button onclick="event.stopPropagation(); window.checkIn('\${pubId}')" style="padding: 6px 12px; font-size: 10px; border-radius: 20px; font-weight: 900; background: #2196f3; border: none; color: white; width: 100%; cursor: pointer; margin-top: 4px;">📍 CHECK IN</button>\`}`;
  ui = ui.replace(sidebarButtonsRegex, replaceStr);
} else {
  console.log("Could not find sidebar buttons to inject CHECK IN");
}

fs.writeFileSync('ui.js', ui);
