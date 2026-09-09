const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');

// The reviews button code
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
  '<label style="font-size: 11px; font-weight: bold; color: #555; display: block; margin-bottom: 3px;">🔒 Private Note:</label>',
  reviewsButton + '\n          <label style="font-size: 11px; font-weight: bold; color: var(--text-secondary); display: block; margin-bottom: 3px;">🔒 Private Note:</label>'
);

fs.writeFileSync('ui.js', ui);
