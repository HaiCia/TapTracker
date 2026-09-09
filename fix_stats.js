const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');

// Replace the pub-info innerText line
const oldLine = 'if (pubInfoEl) pubInfoEl.innerText = `VISIBLE: ${visibleCount}`;';
const newBlock = `if (pubInfoEl) {
    const totalFiltered = state.markers.filter(m => m.matchesFilters).length;
    const visitedFiltered = state.markers.filter(m => m.matchesFilters && m.pubData.visited).length;
    const pct = totalFiltered > 0 ? Math.round((visitedFiltered / totalFiltered) * 100) : 0;
    if (state.isListOnly) {
      pubInfoEl.innerHTML = \`<div style="display:flex; gap:14px; align-items:center; flex-wrap:wrap; font-size:12px;">
        <span>📍 \${visibleCount} visible</span>
        <span style="color:#2ecc71;">✔️ \${visitedFiltered} visited</span>
        <span>➕ \${totalFiltered - visitedFiltered} to visit</span>
        <span style="color:#f39c12; font-weight:900;">\${pct}% done</span>
      </div>\`;
    } else {
      pubInfoEl.innerText = \`VISIBLE: \${visibleCount}\`;
    }
  }`;

ui = ui.replace(oldLine, newBlock);
fs.writeFileSync('ui.js', ui);
console.log('Stats block inserted:', ui.includes('pct}% done'));
