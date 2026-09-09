const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');

ui = ui.replace(/color: #555;/g, 'color: var(--text-secondary);');
ui = ui.replace(/background: #f0f2f5;/g, 'background: var(--bg-app);');
ui = ui.replace(/color: #111;/g, 'color: var(--text-primary);');
ui = ui.replace(/color: #333;/g, 'color: var(--text-secondary);');
ui = ui.replace(/border-bottom: 1px solid #ddd;/g, 'border-bottom: 1px solid var(--border-light);');
ui = ui.replace(/background: #fff8e1;/g, 'background: rgba(243, 156, 18, 0.1);');
ui = ui.replace(/background: #e8f8f5;/g, 'background: rgba(26, 188, 156, 0.1);');

ui = ui.replace(
  'loading="lazy" style="width: 75px; height: 75px; object-fit: cover;',
  'loading="lazy" onclick="event.stopPropagation(); window.openPubDetails(\'${pubId}\')" style="cursor:pointer; width: 75px; height: 75px; object-fit: cover;'
);
ui = ui.replace(
  '<div style="width: 75px; height: 75px; background: var(--bg-app);',
  '<div onclick="event.stopPropagation(); window.openPubDetails(\'${pubId}\')" style="cursor:pointer; width: 75px; height: 75px; background: var(--bg-app);'
);

ui = ui.replace('background: white; padding: 20px;', 'background: var(--bg-primary); color: var(--text-primary); padding: 20px;');
ui = ui.replace('background: #eee; border-radius: 50%;', 'background: var(--bg-app); color: var(--text-primary); border-radius: 50%;');
ui = ui.replace('background: #f8f9fa; padding: 10px;', 'background: var(--bg-app); padding: 10px;');
ui = ui.replace(/border-top: 1px solid #ddd;/g, 'border-top: 1px solid var(--border-color);');
ui = ui.replace(/border: 1px solid #ccc;/g, 'border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary);');

ui = ui.replace(
  '<button class="pub-status-btn ${isVisited ? "status-visited" : "status-unvisited"}" onclick="event.stopPropagation(); window.toggleVisitState(\'${pubId}\')" style="padding: 6px 12px; font-size: 10px; border-radius: 20px; font-weight: 900; box-shadow: 0 2px 5px rgba(0,0,0,0.1); width: 100%;">\n                    ${isVisited ? "UNMARK" : "+ ADD VISIT"}\n                </button>',
  '<button class="pub-status-btn status-unvisited" onclick="event.stopPropagation(); window.handleAddVisit(\'${pubId}\')" style="padding: 6px 12px; font-size: 10px; border-radius: 20px; font-weight: 900; box-shadow: 0 2px 5px rgba(0,0,0,0.1); width: 100%;">\n                    + ADD VISIT\n                </button>'
);
ui = ui.replace(
  'background: #f0f2f5; border: 1px solid #ddd; color: #444;',
  'background: var(--bg-app); border: 1px solid var(--border-color); color: var(--text-secondary);'
);

ui = ui.replace(
  '${isVisited ? `<button onclick="if(confirm(\'Delete ALL visits?\')) { window.removeVisit(\'${pubId}\'); document.getElementById(\'pub-modal-overlay\').remove(); }" style="background: #fff; color: #e74c3c; border: 1px solid #e74c3c; padding: 8px; border-radius: 4px; cursor: pointer; width: 100%; font-size: 12px; font-weight:bold;">🗑️ Remove pub from list</button>` : ""}',
  '${!isVisited ? `<button onclick="window.handleAddVisit(\'${pubId}\')" style="background: #2ecc71; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold; width: 100%;">+ ADD VISIT</button>` : `<button onclick="if(confirm(\\\'Delete ALL visits?\\\')) { window.toggleVisitState(\'${pubId}\'); document.getElementById(\\\'pub-modal-overlay\\\').remove(); }" style="background: var(--bg-primary); color: #e74c3c; border: 1px solid #e74c3c; padding: 10px; border-radius: 4px; cursor: pointer; width: 100%; font-weight: bold; font-size: 13px;">❌ UNMARK (Delete Visits)</button>`}'
);
ui = ui.replace('<button onclick="window.handleAddVisit(\'${pubId}\')" style="background: #2ecc71; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold;">${buttonAddText}</button>', '');
ui = ui.replace('const buttonAddText = isVisited ? "+ Add another visit" : "+ Add your first visit";', '');

ui = ui.replace(
  '? pub.visit_history.map((d) => `<li style="margin-bottom:4px;">${escapeHTML(d)}</li>`).join("")',
  '? pub.visit_history.map((d, index) => `<li style="margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">${escapeHTML(d)} ${state.currentUser ? `<button onclick="window.removeSingleVisit(\\\'${pubId}\\\', ${index})" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:12px;">✖</button>` : ""}</li>`).join("")'
);
ui = ui.replace(
  '? `<li>${escapeHTML(pub.visit_date)}</li>`',
  '? `<li style="margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">${escapeHTML(pub.visit_date)} ${state.currentUser ? `<button onclick="if(confirm(\\\'Delete visit?\\\')) window.toggleVisitState(\\\'${pubId}\\\')" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:12px;">✖</button>` : ""}</li>`'
);

const reviewsButton = `
        \${(comm && comm.reviewsList && comm.reviewsList.length > 0) ? \`
        <div style="margin-bottom: 15px;">
          <button onclick="document.getElementById('community-reviews-\${pubId}').style.display='block'; this.style.display='none';" style="background:none; border:none; color:#2196f3; font-weight:bold; cursor:pointer; font-size:12px; text-decoration:underline;">
            👀 View Community Reviews (\${comm.reviewsList.length})
          </button>
          <div id="community-reviews-\${pubId}" style="display:none; text-align:left; background:var(--bg-app); padding: 10px; border-radius: 6px; font-size: 11px; color: var(--text-secondary); max-height: 100px; overflow-y:auto; margin-top:8px;">
            \${comm.reviewsList.map(r => \`<div style="margin-bottom:6px; padding-bottom:6px; border-bottom:1px solid var(--border-color);">"\${escapeHTML(r)}"</div>\`).join('')}
          </div>
        </div>
        \` : ''}
`;

ui = ui.replace(
  '<label style="font-size: 11px; font-weight: bold; color: var(--text-secondary); display: block; margin-bottom: 3px;">🔒 Private Note:</label>',
  reviewsButton + '\n          <label style="font-size: 11px; font-weight: bold; color: var(--text-secondary); display: block; margin-bottom: 3px;">🔒 Private Note:</label>'
);

fs.writeFileSync('ui.js', ui);
