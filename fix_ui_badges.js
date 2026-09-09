const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');

// 1. Update getMarkerHtml
const oldMarkerHtml = `if (isFavorite) {
    innerHtml += '<div class="favorite-badge">❤️</div>';
  }`;
const newMarkerHtml = `if (isFavorite) {
    innerHtml += '<div class="favorite-badge">❤️</div>';
  }
  if (state.checkins && state.checkins[pubId] > 0) {
    innerHtml += \`<div style="position:absolute; top:-10px; right:-10px; background:#2196f3; color:white; border-radius:50%; width:20px; height:20px; font-size:10px; display:flex; align-items:center; justify-content:center; border:2px solid white; box-shadow:0 2px 4px rgba(0,0,0,0.2); z-index:10;">\${state.checkins[pubId]}</div>\`;
  }`;

ui = ui.replace(oldMarkerHtml, newMarkerHtml);

// 2. Update listHtml in updateSidebarList to show badge
const oldListHtml = `<span style="font-size: 10px; font-weight: 900; color: \${isVisited ? '#27ae60' : '#7f8c8d'}; text-transform: uppercase;">
                  \${isVisited ? "✔️ VISITED" : "➕ TO VISIT"}
                </span>`;
const newListHtml = `<span style="font-size: 10px; font-weight: 900; color: \${isVisited ? '#27ae60' : '#7f8c8d'}; text-transform: uppercase;">
                  \${isVisited ? "✔️ VISITED" : "➕ TO VISIT"}
                </span>
                \${state.checkins && state.checkins[pubId] > 0 ? \`<span style="margin-left: 8px; font-size: 10px; font-weight: bold; background: #2196f3; color: white; padding: 2px 6px; border-radius: 12px;">👥 \${state.checkins[pubId]} here</span>\` : ""}`;

ui = ui.replace(oldListHtml, newListHtml);

fs.writeFileSync('ui.js', ui);
