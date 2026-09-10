const fs = require('fs');
let ui = fs.readFileSync('ui.js', 'utf8');

const startString = `      let addressHtml = marker.pubData.address`;
const endString = `\${state.isListOnly ? \`<button onclick="event.stopPropagation(); window.toggleViewMode(); setTimeout(() => window.flyToPub(\${marker.pubData.lat}, \${marker.pubData.lng}), 100);" style="padding: 6px 12px; font-size: 10px; border-radius: 20px; font-weight: 900; background: #2196f3; border: none; color: white; width: 100%; cursor: pointer; margin-top: 4px;">🗺️ SEE ON MAP</button>\` : ''}
            </div>
        </div>
      \`;`;

const startIndex = ui.indexOf(startString);
const endIndex = ui.indexOf(endString) + endString.length;

if (startIndex !== -1 && endIndex !== -1) {
  const replacement = `
      // TOP ROW: Image and Content
      let imgHtml = marker.pubData.image_url
        ? \`<img src="\${escapeHTML(marker.pubData.image_url)}" class="pub-card-thumbnail" loading="lazy" alt="Pub thumbnail">\`
        : \`<div class="pub-card-thumbnail"><i class="fa-solid fa-beer-mug-empty"></i></div>\`;

      const comm = marker.pubData.community || { avg: 0, count: 0 };
      let ratingHtml = '';
      if (comm.count > 0) {
        ratingHtml = \`<div class="pub-card-badge rating">⭐ \${comm.avg} (\${comm.count})</div>\`;
      } else {
        ratingHtml = \`<div class="pub-card-badge">No reviews</div>\`;
      }

      let visitsCount = marker.pubData.visit_history ? marker.pubData.visit_history.length : (isVisited ? 1 : 0);
      let visitBadge = isVisited 
        ? \`<div class="pub-card-badge" style="color:#4ade80; background:rgba(74, 222, 128, 0.15)">✔️ \${visitsCount} visit\${visitsCount > 1 ? 's' : ''}</div>\` 
        : \`<div class="pub-card-badge">To visit</div>\`;

      let activeCheckinsHtml = (state.checkins && state.checkins[pubId] > 0) 
        ? \`<div class="pub-card-badge checkin">👥 \${state.checkins[pubId]}</div>\` 
        : '';
        
      let unreadChatHtml = (state.pubMessages && state.pubMessages[pubId] && state.pubMessages[pubId].length > 0)
        ? \`<div class="pub-card-badge" style="background:rgba(239, 68, 68, 0.15); color:#f87171;">💬 \${state.pubMessages[pubId].length}</div>\`
        : '';

      let adminButtons = (state.isAdmin || state.isSuperadmin)
          ? \`<span style="font-size:12px; cursor:pointer;" onclick="event.stopPropagation(); window.openPubDetails('\${pubId}')">✏️</span>\`
          : "";

      // Action Buttons
      let favClass = marker.pubData.is_favorite ? 'is-favorite' : '';
      let favIconHtml = \`<button class="pub-card-icon-btn \${favClass}" aria-label="Favorite" onclick="event.stopPropagation(); window.toggleFavorite('\${pubId}')">❤️</button>\`;

      listHtml += \`
        <div id="sidebar-item-\${pubId}" class="pub-card" onclick="window.flyToPub(\${marker.pubData.lat}, \${marker.pubData.lng}); window.highlightSidebar('\${pubId}'); window.openPubDetails('\${pubId}');">
            
            <div class="pub-card-top">
                \${imgHtml}
                <div class="pub-card-content">
                    <div class="pub-card-title">
                        \${escapeHTML(marker.pubData.name)} \${adminButtons}
                    </div>
                    <div class="pub-card-address" title="\${escapeHTML(marker.pubData.address || '')}">
                        \${marker.pubData.address ? escapeHTML(marker.pubData.address) : 'No address provided'}
                    </div>
                    <div class="pub-card-meta">
                        \${ratingHtml}
                        \${visitBadge}
                        \${activeCheckinsHtml}
                        \${unreadChatHtml}
                    </div>
                </div>
            </div>

            <div class="pub-card-bottom">
                <div class="pub-card-actions">
                    <button class="pub-card-btn \${isVisited ? '' : 'primary'}" onclick="event.stopPropagation(); window.handleAddVisit('\${pubId}')">
                        \${isVisited ? "ADD AGAIN" : "MARK VISITED"}
                    </button>
                    <button class="pub-card-btn" onclick="event.stopPropagation(); window.openPubDetails('\${pubId}')">
                        VIEW DETAILS
                    </button>
                    \${state.isListOnly ? \`<button class="pub-card-btn" onclick="event.stopPropagation(); window.toggleViewMode(); setTimeout(() => window.flyToPub(\${marker.pubData.lat}, \${marker.pubData.lng}), 100);">MAP</button>\` : ''}
                </div>
                \${favIconHtml}
            </div>

        </div>
      \`;`;
      
  ui = ui.substring(0, startIndex) + replacement + ui.substring(endIndex);
  fs.writeFileSync('ui.js', ui);
  console.log('Successfully replaced sidebar layout!');
} else {
  console.log('Failed to find exact block');
}
