const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');

// 1. Add SEE ON MAP button after VIEW button
const viewBtnSearch = `📖 VIEW`;
const idx = ui.indexOf(viewBtnSearch);
if (idx === -1) { console.log('VIEW not found'); process.exit(1); }

// Find the closing </button> after VIEW
const closeBtn = ui.indexOf('</button>', idx);
const insertAt = closeBtn + '</button>'.length;

const seeOnMapBtn = `
                \${state.isListOnly ? \`<button onclick="event.stopPropagation(); window.toggleViewMode(); setTimeout(() => window.flyToPub(\${marker.pubData.lat}, \${marker.pubData.lng}), 100);" style="padding: 6px 12px; font-size: 10px; border-radius: 20px; font-weight: 900; background: #2196f3; border: none; color: white; width: 100%; cursor: pointer; margin-top: 4px;">🗺️ SEE ON MAP</button>\` : ''}`;

ui = ui.slice(0, insertAt) + seeOnMapBtn + ui.slice(insertAt);

// 2. Replace the pub-info update section
const oldInfoLine = `const pubInfoEl = document.getElementById("pub-info");
  if (pubInfoEl) pubInfoEl.innerText = \`VISIBLE: \${visibleCount}\`;`;

const newInfoLine = `const totalFiltered = state.markers.filter(m => m.matchesFilters).length;
  const visitedFiltered = state.markers.filter(m => m.matchesFilters && m.pubData.visited).length;
  const pct = totalFiltered > 0 ? Math.round((visitedFiltered / totalFiltered) * 100) : 0;

  const pubInfoEl = document.getElementById("pub-info");
  if (pubInfoEl) {
    if (state.isListOnly) {
      pubInfoEl.innerHTML = \`<div style="display:flex; gap:14px; align-items:center; flex-wrap:wrap; font-size:12px;">
        <span>📍 \${visibleCount} visible</span>
        <span style="color:#2ecc71;">✔️ \${visitedFiltered} visited</span>
        <span>➕ \${totalFiltered - visitedFiltered} to visit</span>
        <span style="color:#f39c12; font-weight:900;">\${pct}% done</span>
        <div id="stats-placeholder" style="display:none;"></div>
      </div>\`;
    } else {
      pubInfoEl.innerText = \`VISIBLE: \${visibleCount}\`;
    }
  }`;

ui = ui.replace(oldInfoLine, newInfoLine);

// 3. Bigger images in full list mode
ui = ui.replace(
  'style="cursor:pointer; width: 75px; height: 75px; object-fit: cover; border-radius: 8px; flex-shrink: 0;',
  'style="cursor:pointer; width: ${state.isListOnly ? \'110px\' : \'75px\'}; height: ${state.isListOnly ? \'110px\' : \'75px\'}; object-fit: cover; border-radius: 8px; flex-shrink: 0;'
);
ui = ui.replace(
  'style="cursor:pointer; width: 75px; height: 75px; background: var(--bg-app); border-radius: 8px; flex-shrink: 0;',
  'style="cursor:pointer; width: ${state.isListOnly ? \'110px\' : \'75px\'}; height: ${state.isListOnly ? \'110px\' : \'75px\'}; background: var(--bg-app); border-radius: 8px; flex-shrink: 0;'
);

fs.writeFileSync('ui.js', ui);
console.log('SEE ON MAP:', ui.includes('SEE ON MAP'));
console.log('stats-placeholder:', ui.includes('stats-placeholder'));
console.log('isListOnly img:', ui.includes("isListOnly ? '110px'"));
