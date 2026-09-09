const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');

// 1. list item styles
ui = ui.replace(/color: #555;/g, 'color: var(--text-secondary);');
ui = ui.replace(/background: #f0f2f5;/g, 'background: var(--bg-app);');
ui = ui.replace(/color: #111;/g, 'color: var(--text-primary);');
ui = ui.replace(/color: #333;/g, 'color: var(--text-secondary);');
ui = ui.replace(/border-bottom: 1px solid #ddd;/g, 'border-bottom: 1px solid var(--border-light);');
ui = ui.replace(/background: #fff8e1;/g, 'background: rgba(243, 156, 18, 0.1);');
ui = ui.replace(/background: #e8f8f5;/g, 'background: rgba(26, 188, 156, 0.1);');

// 2. image onclick
ui = ui.replace(
  'loading="lazy" style="width: 75px; height: 75px; object-fit: cover; border-radius: 8px; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">',
  'loading="lazy" onclick="event.stopPropagation(); window.openPubDetails(\'${pubId}\')" style="cursor: pointer; width: 75px; height: 75px; object-fit: cover; border-radius: 8px; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">'
);
ui = ui.replace(
  '<div style="width: 75px; height: 75px; background: var(--bg-app); border-radius: 8px; flex-shrink: 0; display:flex; align-items:center; justify-content:center; color:#ccc; font-size: 24px;"><i class="fa-solid fa-beer-mug-empty"></i></div>',
  '<div onclick="event.stopPropagation(); window.openPubDetails(\'${pubId}\')" style="cursor: pointer; width: 75px; height: 75px; background: var(--bg-app); border-radius: 8px; flex-shrink: 0; display:flex; align-items:center; justify-content:center; color:#ccc; font-size: 24px;"><i class="fa-solid fa-beer-mug-empty"></i></div>'
);

// 3. list action buttons
ui = ui.replace(
  '<button class="pub-status-btn ${isVisited ? "status-visited" : "status-unvisited"}" onclick="event.stopPropagation(); window.toggleVisitState(\'${pubId}\')" style="padding: 6px 12px; font-size: 10px; border-radius: 20px; font-weight: 900; box-shadow: 0 2px 5px rgba(0,0,0,0.1); width: 100%;">\n                    ${isVisited ? "UNMARK" : "+ ADD VISIT"}\n                </button>',
  '<button class="pub-status-btn status-unvisited" onclick="event.stopPropagation(); window.handleAddVisit(\'${pubId}\')" style="padding: 6px 12px; font-size: 10px; border-radius: 20px; font-weight: 900; box-shadow: 0 2px 5px rgba(0,0,0,0.1); width: 100%;">\n                    + ADD VISIT\n                </button>'
);
ui = ui.replace(
  'background: #f0f2f5; border: 1px solid #ddd; color: var(--text-secondary);',
  'background: var(--bg-app); border: 1px solid var(--border-color); color: var(--text-secondary);'
);

// 4. Modal HTML
let modalIdx1 = ui.indexOf('const modalHtml = `');
let modalIdx2 = ui.indexOf('`;', modalIdx1);
let modalHTML = ui.substring(modalIdx1, modalIdx2);

modalHTML = modalHTML.replace('background: white;', 'background: var(--bg-primary); color: var(--text-primary);');
modalHTML = modalHTML.replace('background: #eee;', 'background: var(--bg-app); color: var(--text-primary);');
modalHTML = modalHTML.replace('color: #777;', 'color: var(--text-secondary);');
modalHTML = modalHTML.replace('background: #f8f9fa;', 'background: var(--bg-app);');
modalHTML = modalHTML.replace(/color: #555;/g, 'color: var(--text-secondary);');
modalHTML = modalHTML.replace(/color: #666;/g, 'color: var(--text-secondary);');
modalHTML = modalHTML.replace(/color: #333;/g, 'color: var(--text-primary);');
modalHTML = modalHTML.replace(/border-top: 1px solid #ddd;/g, 'border-top: 1px solid var(--border-color);');
modalHTML = modalHTML.replace(/border: 1px solid #ccc;/g, 'border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary);');
modalHTML = modalHTML.replace(
  '${isVisited ? `<button onclick="if(confirm(\'Delete ALL visits?\')) { window.removeVisit(\'${pubId}\'); document.getElementById(\'pub-modal-overlay\').remove(); }" style="background: #fff; color: #e74c3c; border: 1px solid #e74c3c; padding: 8px; border-radius: 4px; cursor: pointer; width: 100%; font-size: 12px; font-weight:bold;">🗑️ Remove pub from list</button>` : ""}',
  '${!isVisited ? `<button onclick="window.handleAddVisit(\'${pubId}\')" style="background: #2ecc71; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold; width: 100%;">+ ADD VISIT</button>` : `<button onclick="if(confirm(\'Delete ALL visits?\')) { window.toggleVisitState(\'${pubId}\'); document.getElementById(\'pub-modal-overlay\').remove(); }" style="background: var(--bg-primary); color: #e74c3c; border: 1px solid #e74c3c; padding: 10px; border-radius: 4px; cursor: pointer; width: 100%; font-weight: bold; font-size: 13px;">❌ UNMARK (Delete Visits)</button>`}'
);
modalHTML = modalHTML.replace('<button onclick="window.handleAddVisit(\'${pubId}\')" style="background: #2ecc71; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold;">${buttonAddText}</button>', '');
modalHTML = modalHTML.replace('const buttonAddText = isVisited ? "+ Add another visit" : "+ Add your first visit";', '');

ui = ui.substring(0, modalIdx1) + modalHTML + ui.substring(modalIdx2);

// 5. historyHtml with removeSingleVisit
ui = ui.replace(
  '? pub.visit_history.map((d) => `<li style="margin-bottom:4px;">${escapeHTML(d)}</li>`).join("")',
  '? pub.visit_history.map((d, index) => `<li style="margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">${escapeHTML(d)} ${state.currentUser ? `<button onclick="window.removeSingleVisit(\'${pubId}\', ${index})" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:12px;">✖</button>` : ""}</li>`).join("")'
);
ui = ui.replace(
  '? `<li>${escapeHTML(pub.visit_date)}</li>`',
  '? `<li style="margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">${escapeHTML(pub.visit_date)} ${state.currentUser ? `<button onclick="if(confirm(\'Delete visit?\')) window.toggleVisitState(\'${pubId}\')" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:12px;">✖</button>` : ""}</li>`'
);


