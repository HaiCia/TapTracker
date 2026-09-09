const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');

// 1. Add "See on Map" button next to VIEW button
ui = ui.replace(
  `<button onclick="event.stopPropagation(); window.openPubDetails('\${pubId}')" style="padding: 6px 12px; font-size: 10px; border-radius: 20px; font-weight: 900; background: var(--bg-app); border: 1px solid var(--border-color); color: var(--text-secondary); width: 100%; cursor: pointer;">
                    📖 VIEW
                </button>`,
  `<button onclick="event.stopPropagation(); window.openPubDetails('\${pubId}')" style="padding: 6px 12px; font-size: 10px; border-radius: 20px; font-weight: 900; background: var(--bg-app); border: 1px solid var(--border-color); color: var(--text-secondary); width: 100%; cursor: pointer;">
                    📖 VIEW
                </button>
                \${state.isListOnly ? \`<button onclick="event.stopPropagation(); window.toggleViewMode(); window.flyToPub(\${marker.pubData.lat}, \${marker.pubData.lng});" style="padding: 6px 12px; font-size: 10px; border-radius: 20px; font-weight: 900; background: #2196f3; border: none; color: white; width: 100%; cursor: pointer; margin-top: 4px;">
                    🗺️ SEE ON MAP
                </button>\` : ''}`
);

// 2. Update updateSidebarList to inject stats header
const oldInfoLine = `  const pubInfoEl = document.getElementById("pub-info");
  if (pubInfoEl) pubInfoEl.innerText = \`VISIBLE: \${visibleCount}\`;`;

const newInfoLine = `  const totalPubs = state.markers.filter(m => m.matchesFilters).length;
  const visitedCount = state.markers.filter(m => m.matchesFilters && m.pubData.visited).length;
  const pct = totalPubs > 0 ? Math.round((visitedCount / totalPubs) * 100) : 0;

  const pubInfoEl = document.getElementById("pub-info");
  if (pubInfoEl) {
    if (state.isListOnly) {
      pubInfoEl.innerHTML = \`
        <div style="display:flex; gap:16px; align-items:center; flex-wrap:wrap;">
          <span>📍 \${visibleCount} pubs</span>
          <span>✔️ \${visitedCount} visited</span>
          <span>➕ \${totalPubs - visitedCount} to visit</span>
          <span style="color:#2ecc71; font-weight:900;">\${pct}% done</span>
        </div>
        <div id="stats-placeholder"></div>
      \`;
    } else {
      pubInfoEl.innerText = \`VISIBLE: \${visibleCount}\`;
    }
  }`;

ui = ui.replace(oldInfoLine, newInfoLine);

// 3. Bigger images in list-only mode
ui = ui.replace(
  `src="\${escapeHTML(marker.pubData.image_url)}" loading="lazy" style="cursor:pointer; width: 75px; height: 75px; object-fit: cover;`,
  `src="\${escapeHTML(marker.pubData.image_url)}" loading="lazy" style="cursor:pointer; width: \${state.isListOnly ? '110px' : '75px'}; height: \${state.isListOnly ? '110px' : '75px'}; object-fit: cover;`
);
ui = ui.replace(
  `style="cursor:pointer; width: 75px; height: 75px; background: var(--bg-app);`,
  `style="cursor:pointer; width: \${state.isListOnly ? '110px' : '75px'}; height: \${state.isListOnly ? '110px' : '75px'}; background: var(--bg-app);`
);

fs.writeFileSync('ui.js', ui);
console.log('Done!');
