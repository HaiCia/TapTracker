const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');

// 1. Add Check-in UI
const favoriteBtnHtml = `<button id="favorite-btn" onclick="window.toggleFavorite('\${pubId}')" style="background: none; border: 1px solid \${pub.is_favorite ? "#e74c3c" : "#ccc"}; padding: 6px 12px; border-radius: 20px; cursor: pointer; font-size: 13px; font-weight: bold; margin-bottom: 15px; color: \${pub.is_favorite ? "#e74c3c" : "#777"};">
          \${pub.is_favorite ? "❤️ Favorited" : "🤍 Mark as Favorite"}
        </button>`;

const checkinStatusHtml = `
        <div id="checkin-container" style="background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; margin-bottom: 15px; text-align: center;">
          <div id="checkin-status" style="font-size: 12px; font-weight: bold; margin-bottom: 8px; color: var(--text-primary);">
            \${state.myCheckin && state.myCheckin.pub_id === pubId 
              ? '✅ You are checked in here' 
              : '\${state.checkins && state.checkins[pubId] ? \`👥 \${state.checkins[pubId]} people here\` : "No one is here right now"}'}
          </div>
          \${state.myCheckin && state.myCheckin.pub_id === pubId
            ? \`<button onclick="window.checkOut()" style="background: #e74c3c; color: white; border: none; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; cursor: pointer;">CHECK OUT</button>\`
            : \`<button onclick="window.checkIn('\${pubId}')" style="background: #2196f3; color: white; border: none; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; cursor: pointer;">📍 CHECK IN</button>\`}
        </div>
`;

// wait, the favoriteBtn string has color: ${pub.is_favorite ? "#e74c3c" : "#777"}
// Actually, let's use a regex to be safe
const favoriteRegex = /<button id="favorite-btn"[\s\S]*?<\/button>/;
ui = ui.replace(favoriteRegex, match => match + '\\n' + checkinStatusHtml);

// 2. Add Chat UI
const historyRegex = /<div style="margin-bottom: 20px;">[\s\S]*?<strong style="font-size: 13px; color: var\(--text-secondary\);">History \(\${visitsCount}\):<\/strong>[\s\S]*?<\/ul>[\s\S]*?<\/div>/;

const chatHtml = `
        <div style="margin-bottom: 20px; text-align: left; border: 1px solid var(--border-color); border-radius: 6px; overflow: hidden; display: flex; flex-direction: column; background: var(--bg-app);">
          <div style="background: var(--bg-primary); padding: 8px 12px; font-weight: bold; font-size: 13px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <span>💬 Pub Chat</span>
          </div>
          <div id="chat-messages-\${pubId}" style="height: 150px; overflow-y: auto; padding: 10px; font-size: 12px; display: flex; flex-direction: column; gap: 8px;">
            <div style="color: var(--text-secondary); text-align: center; margin: auto;">Loading messages...</div>
          </div>
          <div style="display: flex; border-top: 1px solid var(--border-color);">
            <input type="text" id="chat-input-\${pubId}" placeholder="Type a message..." style="flex: 1; border: none; padding: 8px 12px; font-size: 12px; background: transparent; color: var(--text-primary); outline: none;" onkeypress="if(event.key === 'Enter') window.sendChatMessage('\${pubId}')">
            <button onclick="window.sendChatMessage('\${pubId}')" style="background: #2196f3; color: white; border: none; padding: 0 15px; font-weight: bold; cursor: pointer;">Send</button>
          </div>
        </div>
`;

ui = ui.replace(historyRegex, match => match + '\\n' + chatHtml);

// 3. Update the global window.openPubDetails to load chat messages when modal opens
const openPubDetailsRegex = /export function openPubDetails\(pubId\) \{[\s\S]*?document\.body\.insertAdjacentHTML\("beforeend", modalHtml\);/;
const openPubDetailsReplacement = `export function openPubDetails(pubId) {
  state.currentPubId = pubId;
  const pub = state.markers.find((m) => m.pubData.id === pubId).pubData;
  const isVisited = pub.visited;

  const currentRating = pub.rating || 0;
  let visitsCount = pub.visit_history ? pub.visit_history.length : (isVisited && pub.visit_date ? 1 : 0);
  
  let historyHtml = pub.visit_history && pub.visit_history.length > 0
    ? pub.visit_history.map((d, index) => \`<li style="margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">\${escapeHTML(d)} \${state.currentUser ? \`<button onclick="window.removeSingleVisit('\${pubId}', \${index})" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:12px;">✖</button>\` : ""}</li>\`).join("")
    : isVisited && pub.visit_date
      ? \`<li style="margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">\${escapeHTML(pub.visit_date)} \${state.currentUser ? \`<button onclick="if(confirm('Delete visit?')) window.toggleVisitState('\${pubId}')" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:12px;">✖</button>\` : ""}</li>\`
      : \`<li style="color: #999; font-style: italic;">No visits yet</li>\`;

  let addressHtml = pub.address ? \`<p style="font-size: 11px; color: var(--text-secondary); margin: 0 0 10px 0;">\${escapeHTML(pub.address)}</p>\` : "";
  let imgHtml = pub.image_url
        ? \`<img onclick="event.stopPropagation(); window.flyToPub(\${pub.lat}, \${pub.lng}); window.openPubDetails('\${pubId}')" src="\${escapeHTML(pub.image_url)}" loading="lazy" style="cursor:pointer; width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">\`
        : \`<div style="width: 100%; height: 120px; background: var(--bg-app); border-radius: 8px; margin-bottom: 15px; display:flex; align-items:center; justify-content:center; color:var(--text-secondary); font-size: 32px;"><i class="fa-solid fa-beer-mug-empty"></i></div>\`;

  const comm = pub.community;
  let communityText = "No community ratings yet";
  if (comm && comm.count > 0) {
    communityText = \`<strong>\${comm.avg}</strong> ⭐ (\${comm.count} ratings)\`;
  }

  const modalHtml = \`
    <div id="pub-modal-overlay" onclick="if(event.target === this) document.getElementById('pub-modal-overlay').remove()" style="position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; justify-content: center; align-items: center; font-family: sans-serif;">
      <div style="background: var(--bg-primary); color: var(--text-primary); padding: 20px; border-radius: 8px; width: 90%; max-width: 320px; position: relative; box-shadow: 0 4px 15px rgba(0,0,0,0.3); max-height: 90vh; overflow-y: auto; text-align: center;">
        
        <button onclick="document.getElementById('pub-modal-overlay').remove()" style="position: absolute; top: 12px; right: 12px; border: none; background: var(--bg-app); color: var(--text-primary); border-radius: 50%; width: 26px; height: 26px; font-size: 14px; cursor: pointer; z-index: 10; display:flex; align-items:center; justify-content:center;">✖</button>
        
        <h2 style="margin: 0 0 5px 0; font-size: 20px; padding-right: 25px;">\${escapeHTML(pub.name)}</h2>
        \${addressHtml}
        \${imgHtml}
        
        <button id="favorite-btn" onclick="window.toggleFavorite('\${pubId}')" style="background: none; border: 1px solid \${pub.is_favorite ? "#e74c3c" : "#ccc"}; padding: 6px 12px; border-radius: 20px; cursor: pointer; font-size: 13px; font-weight: bold; margin-bottom: 15px; color: \${pub.is_favorite ? "#e74c3c" : "var(--text-secondary)"};">
          \${pub.is_favorite ? "❤️ Favorited" : "🤍 Mark as Favorite"}
        </button>

        <div id="checkin-container" style="background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; margin-bottom: 15px; text-align: center;">
          <div id="checkin-status" style="font-size: 12px; font-weight: bold; margin-bottom: 8px; color: var(--text-primary);">
            \${state.myCheckin && state.myCheckin.pub_id === pubId 
              ? '✅ You are checked in here' 
              : (state.checkins && state.checkins[pubId] ? \`👥 \${state.checkins[pubId]} people here\` : "No one is here right now")}
          </div>
          \${state.myCheckin && state.myCheckin.pub_id === pubId
            ? \`<button onclick="window.checkOut()" style="background: #e74c3c; color: white; border: none; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; cursor: pointer;">CHECK OUT</button>\`
            : \`<button onclick="window.checkIn('\${pubId}')" style="background: #2196f3; color: white; border: none; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; cursor: pointer;">📍 CHECK IN</button>\`}
        </div>

        <div style="background: var(--bg-app); padding: 10px; border-radius: 6px; margin-bottom: 15px;">
          <span style="font-size: 12px; font-weight: bold; color: var(--text-secondary);">Your rating:</span><br>
          \${getStarsHtml(pubId, currentRating)}
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color);">\${communityText}</div>
        </div>
        
        <div style="margin-bottom: 15px; text-align: left;">
          
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

          <label style="font-size: 11px; font-weight: bold; color: var(--text-secondary); display: block; margin-bottom: 3px;">🔒 Private Note:</label>
          <textarea id="modal-note" style="width: 100%; height: 45px; font-size: 12px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); border-radius: 4px; padding: 6px; margin-bottom: 8px; box-sizing: border-box;">\${escapeHTML(pub.note || "")}</textarea>

          <label style="font-size: 11px; font-weight: bold; color: var(--text-secondary); display: block; margin-bottom: 3px;">💬 Public Review:</label>
          <textarea id="modal-review" style="width: 100%; height: 45px; font-size: 12px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); border-radius: 4px; padding: 6px; margin-bottom: 8px; box-sizing: border-box;">\${escapeHTML(pub.review || "")}</textarea>
          
          <button onclick="window.savePubTexts('\${pubId}')" style="background: #f39c12; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; width: 100%; font-weight: bold;">💾 Save Note & Review</button>
        </div>
        
        <div style="margin-bottom: 20px;">
          <strong style="font-size: 13px; color: var(--text-secondary);">History (\${visitsCount}):</strong>
          <ul style="padding-left: 20px; margin-top: 8px; font-size: 13px; color: var(--text-secondary); max-height: 80px; overflow-y: auto; text-align: left;">\${historyHtml}</ul>
        </div>

        <div style="margin-bottom: 20px; text-align: left; border: 1px solid var(--border-color); border-radius: 6px; overflow: hidden; display: flex; flex-direction: column; background: var(--bg-app);">
          <div style="background: var(--bg-primary); padding: 8px 12px; font-weight: bold; font-size: 13px; border-bottom: 1px solid var(--border-color); display: flex; justify-content: space-between; align-items: center;">
            <span>💬 Pub Chat</span>
          </div>
          <div id="chat-messages-\${pubId}" style="height: 150px; overflow-y: auto; padding: 10px; font-size: 12px; display: flex; flex-direction: column; gap: 8px;">
            <div style="color: var(--text-secondary); text-align: center; margin: auto;">Loading messages...</div>
          </div>
          <div style="display: flex; border-top: 1px solid var(--border-color);">
            <input type="text" id="chat-input-\${pubId}" placeholder="Type a message..." style="flex: 1; border: none; padding: 8px 12px; font-size: 12px; background: transparent; color: var(--text-primary); outline: none;" onkeypress="if(event.key === 'Enter') window.sendChatMessage('\${pubId}')">
            <button onclick="window.sendChatMessage('\${pubId}')" style="background: #2196f3; color: white; border: none; padding: 0 15px; font-weight: bold; cursor: pointer;">Send</button>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          \${!isVisited ? \`<button onclick="window.handleAddVisit('\${pubId}')" style="background: #2ecc71; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold; width: 100%;">+ ADD VISIT</button>\` : \`<button onclick="if(confirm('Delete ALL visits?')) { window.toggleVisitState('\${pubId}'); document.getElementById('pub-modal-overlay').remove(); }" style="background: var(--bg-primary); color: #e74c3c; border: 1px solid var(--border-color); padding: 10px; border-radius: 4px; cursor: pointer; width: 100%; font-weight: bold; font-size: 13px;">❌ UNMARK (Delete Visits)</button>\`}
        </div>

        \${(state.isAdmin || state.isSuperadmin) ? \`
          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);">
            <strong style="font-size: 13px; color: var(--text-secondary); display: block; margin-bottom: 8px; text-align:left;">Admin Pub Info:</strong>
            <label style="font-size:11px; text-align:left; display:block; color:var(--text-secondary);">Address:</label>
            <input type="text" id="admin-pub-address" value="\${escapeHTML(pub.address || "")}" style="width:100%; font-size:12px; padding:6px; margin-bottom:8px; background:var(--bg-primary); color:var(--text-primary); border:1px solid var(--border-color); border-radius:4px; box-sizing:border-box;">
            
            <label style="font-size:11px; text-align:left; display:block; color:var(--text-secondary);">Image URL:</label>
            <input type="text" id="admin-pub-image" value="\${escapeHTML(pub.image_url || "")}" style="width:100%; font-size:12px; padding:6px; margin-bottom:8px; background:var(--bg-primary); color:var(--text-primary); border:1px solid var(--border-color); border-radius:4px; box-sizing:border-box;">
            
            <button onclick="window.saveAdminPubInfo('\${pubId}')" style="background:#34495e; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:11px; width:100%; font-weight:bold;">Save Admin Info</button>
          </div>
        \` : ''}
      </div>
    </div>
  \`;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  window.loadChatMessages(pubId);`;

const fullFile = fs.readFileSync('ui.js', 'utf8');
const beforeModal = fullFile.substring(0, fullFile.indexOf('export function openPubDetails'));
const afterModal = fullFile.substring(fullFile.indexOf('document.body.insertAdjacentHTML("beforeend", modalHtml);') + 'document.body.insertAdjacentHTML("beforeend", modalHtml);'.length);

fs.writeFileSync('ui.js', beforeModal + openPubDetailsReplacement + afterModal);
