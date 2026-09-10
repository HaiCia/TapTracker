import { supabaseClient } from './api.js';
import { state } from './state.js';
import { applyFilters } from './map.js';

// --- XSS Protection Function ---
export function escapeHTML(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

export function getMarkerHtml(isVisited, pubId, isFriendVisited = false, isFavorite = false) {
  let containerClass = "";
  let innerHtml = '<i class="fa-solid fa-beer-mug-empty icon-inner"></i>';

  if (isVisited && isFriendVisited) {
    containerClass = "is-both-visited";
    innerHtml = '<i class="fa-solid fa-champagne-glasses icon-inner"></i>';
  } else if (isVisited) {
    containerClass = "is-visited";
    innerHtml = '<i class="fa-solid fa-check icon-inner"></i>';
  } else if (isFriendVisited) {
    containerClass = "is-friend-visited";
    innerHtml = '<i class="fa-solid fa-user-group icon-inner"></i>';
  }

  if (isFavorite) {
    innerHtml += '<div class="favorite-badge">❤️</div>';
  }

  return `<div class="pub-icon-container ${containerClass}">${innerHtml}</div>`;
}

export function getStarsHtml(pubId, currentRating) {
  const rating = currentRating || 0;
  let html = '<div class="star-rating-container">';
  html += '<div class="stars" style="display: flex; flex-direction: row; justify-content: center;">';

  for (let i = 1; i <= 5; i++) {
    const isChecked = i === rating ? "checked" : "";
    html += `<input type="radio" id="star-${i}-${pubId}" name="rating-${pubId}" value="${i}" ${isChecked} onchange="window.saveRating('${pubId}', ${i})">`;
    html += `<label for="star-${i}-${pubId}" style="cursor:pointer; padding: 0 2px;">★</label>`;
  }

  html += "</div></div>";
  return html;
}

export function highlightSidebar(pubId) {
  document.querySelectorAll(".pub-list-item").forEach((el) => el.classList.remove("active-sidebar-item"));
  const activeItem = document.getElementById(`sidebar-item-${pubId}`);
  if (activeItem) {
    activeItem.classList.add("active-sidebar-item");
    activeItem.scrollIntoView({ behavior: "smooth", block: "center" });
  }
}

export function updateSidebarList() {
  let visibleCount = 0;
  let listHtml = "";

  if (!state.map) return;
  const currentBounds = state.map.getBounds();

  state.markers.forEach((marker) => {
    const isVisible = state.isListOnly ? marker.matchesFilters : (marker.matchesFilters && currentBounds.contains(marker.getLatLng()));
    if (isVisible) {
      visibleCount++;
      const pubId = marker.pubData.id;
      const isVisited = marker.pubData.visited;


      // TOP ROW: Image and Content
      let imgHtml = marker.pubData.image_url
        ? `<img src="${escapeHTML(marker.pubData.image_url)}" class="pub-card-thumbnail" loading="lazy" alt="Pub thumbnail">`
        : `<div class="pub-card-thumbnail"><i class="fa-solid fa-beer-mug-empty"></i></div>`;

      const comm = marker.pubData.community || { avg: 0, count: 0 };
      let ratingHtml = '';
      if (comm.count > 0) {
        ratingHtml = `<div class="pub-card-badge rating">⭐ ${comm.avg} (${comm.count})</div>`;
      } else {
        ratingHtml = `<div class="pub-card-badge">No reviews</div>`;
      }

      let visitsCount = marker.pubData.visit_history ? marker.pubData.visit_history.length : (isVisited ? 1 : 0);
      let visitBadge = isVisited 
        ? `<div class="pub-card-badge" style="color:#4ade80; background:rgba(74, 222, 128, 0.15)">✔️ ${visitsCount} visit${visitsCount > 1 ? 's' : ''}</div>` 
        : `<div class="pub-card-badge">To visit</div>`;

      let activeCheckinsHtml = (state.checkins && state.checkins[pubId] > 0) 
        ? `<div class="pub-card-badge checkin">👥 ${state.checkins[pubId]}</div>` 
        : '';
        
      let unreadChatHtml = (state.pubMessages && state.pubMessages[pubId] && state.pubMessages[pubId].length > 0)
        ? `<div class="pub-card-badge" style="background:rgba(239, 68, 68, 0.15); color:#f87171;">💬 ${state.pubMessages[pubId].length}</div>`
        : '';

      let adminButtons = (state.isAdmin || state.isSuperadmin)
          ? `<span style="font-size:12px; cursor:pointer;" onclick="event.stopPropagation(); window.openPubDetails('${pubId}')">✏️</span>`
          : "";

      // Action Buttons
      let favClass = marker.pubData.is_favorite ? 'is-favorite' : '';
      let favIconHtml = `<button class="pub-card-icon-btn ${favClass}" aria-label="Favorite" onclick="event.stopPropagation(); window.toggleFavorite('${pubId}')">❤️</button>`;

      listHtml += `
        <div id="sidebar-item-${pubId}" class="pub-card" onclick="window.flyToPub(${marker.pubData.lat}, ${marker.pubData.lng}); window.highlightSidebar('${pubId}'); window.openPubDetails('${pubId}');">
            
            <div class="pub-card-top">
                ${imgHtml}
                <div class="pub-card-content">
                    <div class="pub-card-title">
                        ${escapeHTML(marker.pubData.name)} ${adminButtons}
                    </div>
                    <div class="pub-card-address" title="${escapeHTML(marker.pubData.address || '')}">
                        ${marker.pubData.address ? escapeHTML(marker.pubData.address) : 'No address provided'}
                    </div>
                    <div class="pub-card-meta">
                        ${ratingHtml}
                        ${visitBadge}
                        ${activeCheckinsHtml}
                        ${unreadChatHtml}
                    </div>
                </div>
            </div>

            <div class="pub-card-bottom">
                <div class="pub-card-actions">
                    <button class="pub-card-btn ${isVisited ? '' : 'primary'}" onclick="event.stopPropagation(); window.handleAddVisit('${pubId}')">
                        ${isVisited ? "ADD AGAIN" : "MARK VISITED"}
                    </button>
                    <button class="pub-card-btn" onclick="event.stopPropagation(); window.openPubDetails('${pubId}')">
                        VIEW DETAILS
                    </button>
                    ${state.isListOnly ? `<button class="pub-card-btn" onclick="event.stopPropagation(); window.toggleViewMode(); setTimeout(() => window.flyToPub(${marker.pubData.lat}, ${marker.pubData.lng}), 100);">MAP</button>` : ''}
                </div>
                ${favIconHtml}
            </div>

        </div>
      `;
    }
  });

  const pubInfoEl = document.getElementById("pub-info");
  if (pubInfoEl) {
    const totalFiltered = state.markers.filter(m => m.matchesFilters).length;
    const visitedFiltered = state.markers.filter(m => m.matchesFilters && m.pubData.visited).length;
    const pct = totalFiltered > 0 ? Math.round((visitedFiltered / totalFiltered) * 100) : 0;
    if (state.isListOnly) {
      pubInfoEl.innerHTML = `<div style="display:flex; gap:14px; align-items:center; flex-wrap:wrap; font-size:12px;">
        <span>📍 ${visibleCount} visible</span>
        <span style="color:#2ecc71;">✔️ ${visitedFiltered} visited</span>
        <span>➕ ${totalFiltered - visitedFiltered} to visit</span>
        <span style="color:#f39c12; font-weight:900;">${pct}% done</span>
      </div>`;
    } else {
      pubInfoEl.innerText = `VISIBLE: ${visibleCount}`;
    }
  }

  const pubListContainerEl = document.getElementById("pub-list-container");
  if (pubListContainerEl) {
    if (visibleCount === 0) {
      pubListContainerEl.innerHTML = `
        <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; color:var(--text-secondary); text-align:center; padding: 40px 20px;">
          <div style="font-size: 48px; margin-bottom: 16px; opacity: 0.2;"><i class="fa-solid fa-beer-mug-empty"></i></div>
          <div style="font-size: 16px; font-weight: 900; margin-bottom: 8px;">No pubs found!</div>
          <div style="font-size: 12px; max-width: 200px;">Try changing the map area, your search phrase or the selected filter.</div>
        </div>
      `;
    } else {
      pubListContainerEl.innerHTML = listHtml;
    }
  }

  const sidebarBtn = document.getElementById("sidebar-toggle-btn");
  if (sidebarBtn) {
    if (window.innerWidth <= 768) {
      const arrow = state.isSidebarHidden ? "▲" : "▼";
      sidebarBtn.innerHTML = `${arrow} LIST (${visibleCount}) ${arrow}`;
    } else {
      sidebarBtn.innerText = state.isSidebarHidden ? "◀" : "▶";
    }
  }
}

export function setFilter(type, btn) {
  state.currentFilterType = type;
  document.querySelectorAll(".filters-container .filter-btn").forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  applyFilters();
}

export function handleSearch(e) {
  state.currentSearchQuery = e.target.value.toLowerCase().trim();
  applyFilters();
}

export async function toggleVisitState(pubId) {
  const marker = state.markers.find((m) => String(m.pubData.id) === String(pubId));
  if (!marker) return;

  if (marker.pubData.visited) {
    await supabaseClient.from("visits").delete().eq("user_id", state.currentUser.id).eq("pub_id", pubId);
    marker.pubData.visited = false;
    marker.pubData.visit_date = null;
    marker.pubData.note = null;
    marker.pubData.review = null;
    marker.pubData.rating = 0;
    marker.pubData.is_favorite = false;
    marker.pubData.visit_history = [];
    marker.closePopup();
  } else {
    const today = new Date().toISOString().split("T")[0];
    await supabaseClient.from("visits").insert([{
      user_id: state.currentUser.id,
      pub_id: pubId,
      visit_date: today,
      rating: 0,
      is_favorite: false,
      visit_history: [today],
    }]);
    marker.pubData.visited = true;
    marker.pubData.visit_date = today;
    marker.pubData.rating = 0;
    marker.pubData.is_favorite = false;
    marker.pubData.visit_history = [today];
  }
  applyFilters();
}

export async function compareMap() {
  const code = window.prompt("Enter friend's code (e.g. TAP-A1B2):");
  if (!code || !code.trim()) return;

  const cleanCode = code.trim().toUpperCase();
  const { data: profiles } = await supabaseClient.from("profiles").select("id").eq("friend_code", cleanCode);
  if (!profiles || profiles.length === 0) {
    alert("Friend not found!");
    return;
  }

  const friendId = profiles[0].id;
  const { data: visits } = await supabaseClient.from("visits").select("pub_id").eq("user_id", friendId).limit(3000);

  state.friendVisitData = {};
  if (visits) visits.forEach((v) => (state.friendVisitData[String(v.pub_id)] = true));

  state.isComparing = true;
  document.getElementById("stop-compare-btn").style.display = "block";
  alert(`Loaded ${visits ? visits.length : 0} pubs from friend.`);
  applyFilters();
}

export function stopComparing() {
  state.isComparing = false;
  state.friendVisitData = {};
  document.getElementById("stop-compare-btn").style.display = "none";
  applyFilters();
}

export function toggleSidebar() {
  const contentArea = document.querySelector(".content-area");
  if (state.isListOnly) toggleViewMode();

  state.isSidebarHidden = !state.isSidebarHidden;
  if (state.isSidebarHidden) {
    contentArea.classList.add("sidebar-hidden");
  } else {
    contentArea.classList.remove("sidebar-hidden");
    setTimeout(() => { if (state.map) state.map.invalidateSize(); }, 100);
  }
  updateSidebarList();
}

export function toggleViewMode() {
  const contentArea = document.querySelector(".content-area");
  const btn = document.getElementById("view-toggle-btn");
  const sidebarBtn = document.getElementById("sidebar-toggle-btn");

  if (state.isSidebarHidden) {
    state.isSidebarHidden = false;
    contentArea.classList.remove("sidebar-hidden");
  }

  state.isListOnly = !state.isListOnly;
  if (state.isListOnly) {
    contentArea.classList.add("list-only-mode");
    btn.innerText = "🗺️ Map";
    sidebarBtn.style.display = "none";
  } else {
    contentArea.classList.remove("list-only-mode");
    btn.innerText = "Full List";
    sidebarBtn.style.display = "flex";
    setTimeout(() => { if (state.map) state.map.invalidateSize(); }, 100);
  }
  updateSidebarList();
}

export async function saveRating(pubId, ratingValue) {
  try {
    const marker = state.markers.find((m) => String(m.pubData.id) === String(pubId));
    if (!marker) return;

    const today = new Date().toISOString().split("T")[0];

    if (!marker.pubData.visited) {
      await supabaseClient.from("visits").insert([{
        user_id: state.currentUser.id,
        pub_id: pubId,
        visit_date: today,
        rating: ratingValue,
        is_favorite: false,
        visit_history: [today],
      }]);
      marker.pubData.visited = true;
      marker.pubData.visit_date = today;
      marker.pubData.visit_history = [today];
      marker.pubData.rating = ratingValue;
      applyFilters();
    if (document.getElementById('pub-modal-overlay')) openPubDetails(pubId);
    return;
    }

    await supabaseClient.from("visits").update({ rating: ratingValue }).eq("pub_id", pubId).eq("user_id", state.currentUser.id);
    marker.pubData.rating = ratingValue;
  } catch (err) {
    console.error("Error saving rating:", err.message);
  }
}

export async function markAsVisited(pubId) {
  const marker = state.markers.find((m) => String(m.pubData.id) === String(pubId));
  if (!marker || marker.pubData.visited) return;

  const today = new Date().toISOString().split("T")[0];
  await supabaseClient.from("visits").insert([{
    user_id: state.currentUser.id,
    pub_id: pubId,
    visit_date: today,
    rating: 0,
    is_favorite: false,
    visit_history: [today],
  }]);

  marker.pubData.visited = true;
  marker.pubData.visit_date = today;
  marker.pubData.rating = 0;
  marker.pubData.is_favorite = false;
  marker.pubData.visit_history = [today];
}

export async function saveAdminPubInfo(pubId) {
  if (!state.isAdmin && !state.isSuperadmin) return;
  const newAddress = document.getElementById("admin-address").value;
  const newImage = document.getElementById("admin-image").value;

  const { error } = await supabaseClient
    .from("pubs")
    .update({ address: newAddress, image_url: newImage })
    .eq("id", pubId);

  if (error) {
    console.error("Error updating pub info:", error);
    alert("Błąd: Nie udało się zaktualizować danych pubu. Sprawdź RLS.");
  } else {
    const marker = state.markers.find((m) => String(m.pubData.id) === String(pubId));
    if (marker) {
      marker.pubData.address = newAddress;
      marker.pubData.image_url = newImage;
    }
    updateSidebarList();
    openPubDetails(pubId);
    alert("Dane pubu zaktualizowane globalnie!");
  }
}

export async function removeVisit(pubId) {
  const marker = state.markers.find((m) => String(m.pubData.id) === String(pubId));
  if (!marker) return;

  await supabaseClient.from("visits").delete().eq("user_id", state.currentUser.id).eq("pub_id", pubId);

  marker.pubData.visited = false;
  marker.pubData.visit_date = null;
  marker.pubData.note = null;
  marker.pubData.review = null;
  marker.pubData.rating = 0;
  marker.pubData.visit_history = [];
  marker.pubData.is_favorite = false;
  marker.closePopup();
  applyFilters();
}

export async function toggleFavorite(pubId) {
  const marker = state.markers.find((m) => String(m.pubData.id) === String(pubId));
  if (!marker) return;

  const newState = !marker.pubData.is_favorite;
  const today = new Date().toISOString().split("T")[0];

  if (!marker.pubData.visited) {
    await supabaseClient.from("visits").insert([{
      user_id: state.currentUser.id,
      pub_id: pubId,
      visit_date: today,
      rating: 0,
      is_favorite: newState,
      visit_history: [today],
    }]);
    marker.pubData.visited = true;
    marker.pubData.visit_date = today;
    marker.pubData.visit_history = [today];
    marker.pubData.is_favorite = newState;
    applyFilters();
    if (document.getElementById('pub-modal-overlay')) openPubDetails(pubId);
    return;
  }

  const { error } = await supabaseClient.from("visits").update({ is_favorite: newState }).eq("user_id", state.currentUser.id).eq("pub_id", pubId);

  if (!error) {
    marker.pubData.is_favorite = newState;
    const btn = document.getElementById("favorite-btn");
    if (btn) {
      btn.style.color = newState ? "#e74c3c" : "#777";
      btn.style.borderColor = newState ? "#e74c3c" : "#ccc";
      btn.innerHTML = newState ? "❤️ Favorited" : "🤍 Mark as Favorite";
    }
    applyFilters();
  }
}

export function openPubDetails(pubId) {
  const existingModal = document.getElementById('pub-modal-overlay');
  if (existingModal) existingModal.remove();
  state.currentPubId = pubId;
  const pub = state.markers.find((m) => String(m.pubData.id) === String(pubId)).pubData;
  const isVisited = pub.visited;

  const currentRating = pub.rating || 0;
  let visitsCount = pub.visit_history ? pub.visit_history.length : (isVisited && pub.visit_date ? 1 : 0);
  
  let historyHtml = pub.visit_history && pub.visit_history.length > 0
    ? pub.visit_history.map((d, index) => `<li style="margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">${escapeHTML(d)} ${state.currentUser ? `<button onclick="window.removeSingleVisit('${pubId}', ${index})" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:12px;">✖</button>` : ""}</li>`).join("")
    : isVisited && pub.visit_date
      ? `<li style="margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">${escapeHTML(pub.visit_date)} ${state.currentUser ? `<button onclick="if(confirm('Delete visit?')) window.toggleVisitState('${pubId}')" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:12px;">✖</button>` : ""}</li>`
      : `<li style="color: #999; font-style: italic;">No visits yet</li>`;

  let addressHtml = pub.address ? `<p style="font-size: 11px; color: var(--text-secondary); margin: 0 0 10px 0;">${escapeHTML(pub.address)}</p>` : "";
  let imgHtml = pub.image_url
        ? `<img onclick="event.stopPropagation(); window.flyToPub(${pub.lat}, ${pub.lng}); window.openPubDetails('${pubId}')" src="${escapeHTML(pub.image_url)}" loading="lazy" style="cursor:pointer; width: 100%; height: 120px; object-fit: cover; border-radius: 8px; margin-bottom: 15px; box-shadow: 0 2px 8px rgba(0,0,0,0.15);">`
        : `<div style="width: 100%; height: 120px; background: var(--bg-app); border-radius: 8px; margin-bottom: 15px; display:flex; align-items:center; justify-content:center; color:var(--text-secondary); font-size: 32px;"><i class="fa-solid fa-beer-mug-empty"></i></div>`;

  const comm = pub.community;
  let communityText = "No community ratings yet";
  if (comm && comm.count > 0) {
    communityText = `<strong>${comm.avg}</strong> ⭐ (${comm.count} ratings)`;
  }

  const modalHtml = `
    <div id="pub-modal-overlay" onclick="if(event.target === this) document.getElementById('pub-modal-overlay').remove()" style="position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; justify-content: center; align-items: center; font-family: sans-serif;">
      <div style="background: var(--bg-primary); color: var(--text-primary); padding: 20px; border-radius: 8px; width: 90%; max-width: 320px; position: relative; box-shadow: 0 4px 15px rgba(0,0,0,0.3); max-height: 90vh; overflow-y: auto; text-align: center;">
        
        <button onclick="document.getElementById('pub-modal-overlay').remove()" style="position: absolute; top: 12px; right: 12px; border: none; background: var(--bg-app); color: var(--text-primary); border-radius: 50%; width: 26px; height: 26px; font-size: 14px; cursor: pointer; z-index: 10; display:flex; align-items:center; justify-content:center;">✖</button>
        
        <h2 style="margin: 0 0 5px 0; font-size: 20px; padding-right: 25px;">${escapeHTML(pub.name)}</h2>
        ${addressHtml}
        ${imgHtml}
        
        <button id="favorite-btn" onclick="window.toggleFavorite('${pubId}')" style="background: none; border: 1px solid ${pub.is_favorite ? "#e74c3c" : "#ccc"}; padding: 6px 12px; border-radius: 20px; cursor: pointer; font-size: 13px; font-weight: bold; margin-bottom: 15px; color: ${pub.is_favorite ? "#e74c3c" : "var(--text-secondary)"};">
          ${pub.is_favorite ? "❤️ Favorited" : "🤍 Mark as Favorite"}
        </button>

        <div style="background: var(--bg-app); padding: 10px; border-radius: 6px; margin-bottom: 15px;">
          <span style="font-size: 12px; font-weight: bold; color: var(--text-secondary);">Your rating:</span><br>
          ${getStarsHtml(pubId, currentRating)}
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color);">${communityText}</div>
        </div>
        
        
        <div id="checkin-container" style="background: var(--bg-app); border: 1px solid var(--border-color); border-radius: 8px; padding: 10px; margin-bottom: 15px; text-align: center;">
          <div id="checkin-status" style="font-size: 12px; font-weight: bold; margin-bottom: 8px; color: var(--text-primary);">
            ${state.myCheckin && String(state.myCheckin.pub_id) === String(pubId) 
              ? '✅ You are checked in here' 
              : (state.checkins && state.checkins[pubId] ? `👥 ${state.checkins[pubId]} people here` : "No one is here right now")}
          </div>
          ${state.myCheckin && String(state.myCheckin.pub_id) === String(pubId)
            ? `<button onclick="window.checkOut()" style="background: #e74c3c; color: white; border: none; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; cursor: pointer;">CHECK OUT</button>`
            : `<button onclick="window.checkIn('${pubId}')" style="background: #2196f3; color: white; border: none; padding: 6px 16px; border-radius: 20px; font-size: 12px; font-weight: bold; cursor: pointer;">📍 CHECK IN</button>`}
        </div>

        <div id="modal-chat-container" style="background: var(--bg-app); padding: 10px; border-radius: 6px; margin-bottom: 15px; text-align: left; border: 1px solid var(--border-color);">
          <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
            <strong style="font-size: 12px; color: var(--text-secondary);">💬 Live Chat</strong>
            <span style="font-size:10px; background:#e74c3c; color:white; padding:2px 6px; border-radius:10px; font-weight:bold; display:${state.pubMessages && state.pubMessages[pubId] && state.pubMessages[pubId].length > 0 ? 'block' : 'none'}">${state.pubMessages && state.pubMessages[pubId] ? state.pubMessages[pubId].length : 0} msgs</span>
          </div>
          <div id="sidebar-chat-messages-${pubId}" style="height: 150px; overflow-y: auto; padding: 8px; font-size: 11px; display: flex; flex-direction: column; gap: 6px; border: 1px solid var(--border-color); border-radius: 4px; margin-bottom: 6px; background: var(--bg-primary);">
            <div style="color: var(--text-secondary); text-align: center; margin: auto;">Loading messages...</div>
          </div>
          <div style="display: flex; gap: 4px;">
            <input type="text" id="sidebar-chat-input-${pubId}" placeholder="Type message..." style="flex: 1; border: 1px solid var(--border-color); border-radius: 4px; padding: 6px; font-size: 11px; background: var(--bg-primary); color: var(--text-primary); outline: none;" onkeypress="if(event.key === 'Enter') window.sendChatMessage('${pubId}')">
            <button onclick="window.sendChatMessage('${pubId}')" style="background: #2196f3; color: white; border: none; padding: 0 10px; border-radius: 4px; font-weight: bold; cursor: pointer; font-size: 11px;">Send</button>
          </div>
        </div>

        <div style="margin-bottom: 15px; text-align: left;">
          
        ${(comm && comm.reviewsList && comm.reviewsList.length > 0) ? `
        <div style="margin-bottom: 15px;">
          <button onclick="document.getElementById('community-reviews-${pubId}').style.display='block'; this.style.display='none';" style="background:none; border:none; color:#2196f3; font-weight:bold; cursor:pointer; font-size:12px; text-decoration:underline;">
            👀 View Community Reviews (${comm.reviewsList.length})
          </button>
          <div id="community-reviews-${pubId}" style="display:none; text-align:left; background:var(--bg-app); padding: 10px; border-radius: 6px; font-size: 11px; color: var(--text-secondary); max-height: 100px; overflow-y:auto; margin-top:8px;">
            ${comm.reviewsList.map(r => `<div style="margin-bottom:6px; padding-bottom:6px; border-bottom:1px solid var(--border-color);">"${escapeHTML(r)}"</div>`).join('')}
          </div>
        </div>
        ` : ''}

          <label style="font-size: 11px; font-weight: bold; color: var(--text-secondary); display: block; margin-bottom: 3px;">🔒 Private Note:</label>
          <textarea id="modal-note" style="width: 100%; height: 45px; font-size: 12px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); border-radius: 4px; padding: 6px; margin-bottom: 8px; box-sizing: border-box;">${escapeHTML(pub.note || "")}</textarea>

          <label style="font-size: 11px; font-weight: bold; color: var(--text-secondary); display: block; margin-bottom: 3px;">💬 Public Review:</label>
          <textarea id="modal-review" style="width: 100%; height: 45px; font-size: 12px; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); border-radius: 4px; padding: 6px; margin-bottom: 8px; box-sizing: border-box;">${escapeHTML(pub.review || "")}</textarea>
          
          <button onclick="window.savePubTexts('${pubId}')" style="background: #f39c12; color: white; border: none; padding: 6px 12px; border-radius: 4px; cursor: pointer; font-size: 11px; width: 100%; font-weight: bold;">💾 Save Note & Review</button>
        </div>
        
        <div style="margin-bottom: 20px;">
          <strong style="font-size: 13px; color: var(--text-secondary);">History (${visitsCount}):</strong>
          <ul style="padding-left: 20px; margin-top: 8px; font-size: 13px; color: var(--text-secondary); max-height: 80px; overflow-y: auto; text-align: left;">${historyHtml}</ul>
        </div>

        <div style="display: flex; flex-direction: column; gap: 8px;">
          ${!isVisited ? `<button onclick="window.handleAddVisit('${pubId}')" style="background: #2ecc71; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold; width: 100%;">+ ADD VISIT</button>` : `<button onclick="if(confirm('Delete ALL visits?')) { window.toggleVisitState('${pubId}'); document.getElementById('pub-modal-overlay').remove(); }" style="background: var(--bg-primary); color: #e74c3c; border: 1px solid var(--border-color); padding: 10px; border-radius: 4px; cursor: pointer; width: 100%; font-weight: bold; font-size: 13px;">❌ UNMARK (Delete Visits)</button>`}
        </div>

        ${(state.isAdmin || state.isSuperadmin) ? `
          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid var(--border-color);">
            <strong style="font-size: 13px; color: var(--text-secondary); display: block; margin-bottom: 8px; text-align:left;">Admin Pub Info:</strong>
            <label style="font-size:11px; text-align:left; display:block; color:var(--text-secondary);">Address:</label>
            <input type="text" id="admin-pub-address" value="${escapeHTML(pub.address || "")}" style="width:100%; font-size:12px; padding:6px; margin-bottom:8px; background:var(--bg-primary); color:var(--text-primary); border:1px solid var(--border-color); border-radius:4px; box-sizing:border-box;">
            
            <label style="font-size:11px; text-align:left; display:block; color:var(--text-secondary);">Image URL:</label>
            <input type="text" id="admin-pub-image" value="${escapeHTML(pub.image_url || "")}" style="width:100%; font-size:12px; padding:6px; margin-bottom:8px; background:var(--bg-primary); color:var(--text-primary); border:1px solid var(--border-color); border-radius:4px; box-sizing:border-box;">
            
            <button onclick="window.saveAdminPubInfo('${pubId}')" style="background:#34495e; color:white; border:none; padding:6px 12px; border-radius:4px; cursor:pointer; font-size:11px; width:100%; font-weight:bold;">Save Admin Info</button>
          </div>
        ` : ''}
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
  window.loadChatMessages(pubId);
}

export async function savePubTexts(pubId) {
  const noteVal = document.getElementById("modal-note").value;
  const reviewVal = document.getElementById("modal-review").value;
  const marker = state.markers.find((m) => String(m.pubData.id) === String(pubId));
  if (!marker) return;

  const today = new Date().toISOString().split("T")[0];

  if (!marker.pubData.visited) {
    await supabaseClient.from("visits").insert([{
      user_id: state.currentUser.id,
      pub_id: pubId,
      visit_date: today,
      rating: 0,
      is_favorite: false,
      visit_history: [today],
      note: noteVal,
      review: reviewVal,
    }]);
    marker.pubData.visited = true;
    marker.pubData.visit_date = today;
    marker.pubData.visit_history = [today];
    marker.pubData.note = noteVal;
    marker.pubData.review = reviewVal;
    applyFilters();
    openPubDetails(pubId);
    alert("Visit created & Text saved! 💾");
    return;
  }

  const { error } = await supabaseClient.from("visits").update({ note: noteVal, review: reviewVal }).eq("user_id", state.currentUser.id).eq("pub_id", pubId);

  if (!error) {
    marker.pubData.note = noteVal;
    marker.pubData.review = reviewVal;
    // We should reload pubs if necessary, but simply alerting is fine here for refactoring
    alert("Note & Review saved successfully! 💾");
  } else {
    alert("Error saving text: " + error.message);
  }
}

export async function handleAddVisit(pubId) {
  const marker = state.markers.find((m) => String(m.pubData.id) === String(pubId));
  if (!marker) return;

  const isFirstVisit = !marker.pubData.visited;
  const promptText = isFirstVisit ? "Enter your first visit date (YYYY-MM-DD):" : "Enter new visit date (YYYY-MM-DD):";

  const newDate = window.prompt(promptText, new Date().toISOString().split("T")[0]);
  if (!newDate) return;

  if (isFirstVisit) {
    const { error } = await supabaseClient.from("visits").insert([{
      user_id: state.currentUser.id,
      pub_id: pubId,
      visit_date: newDate,
      rating: 0,
      is_favorite: false,
      visit_history: [newDate],
    }]);

    if (!error) {
      marker.pubData.visited = true;
      marker.pubData.visit_date = newDate;
      marker.pubData.rating = 0;
      marker.pubData.is_favorite = false;
      marker.pubData.visit_history = [newDate];
    } else {
      alert("Error marking pub as visited: " + error.message);
      return;
    }
  } else {
    const history = [...(marker.pubData.visit_history || [])];
    history.push(newDate);
    history.sort().reverse();

    const { error } = await supabaseClient.from("visits").update({ visit_history: history, visit_date: history[0] }).eq("user_id", state.currentUser.id).eq("pub_id", pubId);

    if (!error) {
      marker.pubData.visit_history = history;
      marker.pubData.visit_date = history[0];
    } else {
      alert("Error adding visit: " + error.message);
      return;
    }
  }

  applyFilters();
  if (document.getElementById('pub-modal-overlay')) openPubDetails(pubId);
}


export async function removeSingleVisit(pubId, index) {
  const marker = state.markers.find((m) => String(m.pubData.id) === String(pubId));
  if (!marker) return;

  let history = marker.pubData.visit_history || [];
  if (history.length <= 1) {
    if (confirm("This is your last visit. Delete it completely?")) {
      await toggleVisitState(pubId);
      const modal = document.getElementById('pub-modal-overlay');
      if (modal) modal.remove();
    }
    return;
  }

  history.splice(index, 1);
  const { error } = await supabaseClient.from("visits").update({
    visit_history: history,
    visit_date: history[history.length - 1]
  }).eq("user_id", state.currentUser.id).eq("pub_id", pubId);

  if (!error) {
    marker.pubData.visit_history = history;
    marker.pubData.visit_date = history[history.length - 1];
    const modal = document.getElementById('pub-modal-overlay');
    if (modal) modal.remove();
    openPubDetails(pubId);
    updateSidebarList();
  }
}


export async function checkIn(pubId) {
  const { data, error } = await supabaseClient.from('checkins').upsert({
    user_id: state.currentUser.id,
    pub_id: pubId,
    nickname: state.profile ? state.profile.nickname : 'Anonymous',
    checked_in_at: new Date().toISOString(),
    expires_at: new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString()
  }).select();
  if (!error && data) {
    state.myCheckin = data[0];
    updateSidebarList();
  }
}

export async function checkOut() {
  if (!state.myCheckin) return;
  const pubId = state.myCheckin.pub_id;
  await supabaseClient.from('checkins').delete().eq('id', state.myCheckin.id);
  state.myCheckin = null;
  updateSidebarList();
}

export async function sendChatMessage(pubId) {
  const input = document.getElementById('sidebar-chat-input-' + pubId);
  if (!input || !input.value.trim()) return;
  const text = input.value.trim();
  input.value = '';
  await supabaseClient.from('pub_messages').insert({
    user_id: state.currentUser.id,
    pub_id: pubId,
    nickname: state.profile ? state.profile.nickname : 'Anonymous',
    message: text
  });
}

export async function loadChatMessages(pubId) {
  const container = document.getElementById('sidebar-chat-messages-' + pubId);
  if (!container) return;
  const { data } = await supabaseClient.from('pub_messages').select('*').eq('pub_id', pubId).order('created_at', { ascending: true });
  if (data) {
    state.pubMessages[pubId] = data;
    renderChatMessages(pubId);
  }
}

export function renderChatMessages(pubId) {
  const container = document.getElementById('sidebar-chat-messages-' + pubId);
  if (!container) return;
  const msgs = state.pubMessages[pubId] || [];
  if (msgs.length === 0) {
    container.innerHTML = '<div style="color: var(--text-secondary); text-align: center; margin: auto;">No messages yet. Say hi!</div>';
    return;
  }
  container.innerHTML = msgs.map(m => `
    <div style="margin-bottom: 4px; line-height: 1.3;">
      <span style="font-weight: bold; color: ${m.user_id === state.currentUser.id ? '#2ecc71' : 'var(--text-primary)'};">${escapeHTML(m.nickname)}</span>
      <span style="color: var(--text-secondary); font-size: 10px; margin-left: 4px;">${new Date(m.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span><br>
      <span style="color: var(--text-primary);">${escapeHTML(m.message)}</span>
    </div>
  `).join('');
  container.scrollTop = container.scrollHeight;
}

export function toggleSidebarChat(pubId) {
  const container = document.getElementById('sidebar-chat-container-' + pubId);
  if (!container) return;
  if (container.style.display === 'none') {
    container.style.display = 'block';
    window.loadChatMessages(pubId);
  } else {
    container.style.display = 'none';
  }
}
