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

      let addressHtml = marker.pubData.address
        ? `<div style="font-size: 11px; color: var(--text-secondary); margin-top: 3px; font-weight: 500;">📍 ${escapeHTML(marker.pubData.address)}</div>`
        : "";

      let imgHtml = marker.pubData.image_url
        ? `<img onclick="event.stopPropagation(); window.flyToPub(${marker.pubData.lat}, ${marker.pubData.lng}); window.openPubDetails('${pubId}')" src="${escapeHTML(marker.pubData.image_url)}" loading="lazy" style="cursor:pointer; width: 75px; height: 75px; object-fit: cover; border-radius: 8px; flex-shrink: 0; box-shadow: 0 2px 5px rgba(0,0,0,0.1);">`
        : `<div onclick="event.stopPropagation(); window.flyToPub(${marker.pubData.lat}, ${marker.pubData.lng}); window.openPubDetails('${pubId}')" style="cursor:pointer; width: 75px; height: 75px; background: var(--bg-app); border-radius: 8px; flex-shrink: 0; display:flex; align-items:center; justify-content:center; color:#ccc; font-size: 24px;"><i class="fa-solid fa-beer-mug-empty"></i></div>`;

      let noteHtml = marker.pubData.note
        ? `<div style="font-size: 11px; color: var(--text-primary); margin-top: 6px; background: rgba(243, 156, 18, 0.15); padding: 4px 6px; border-radius: 4px; border-left: 3px solid #f39c12; font-weight: 500;">🔒 ${escapeHTML(marker.pubData.note)}</div>`
        : "";

      let reviewHtml = marker.pubData.review
        ? `<div style="font-size: 11px; color: var(--text-primary); margin-top: 4px; background: rgba(26, 188, 156, 0.15); padding: 4px 6px; border-radius: 4px; border-left: 3px solid #1abc9c; font-weight: 500;">💬 ${escapeHTML(marker.pubData.review)}</div>`
        : "";

      const comm = marker.pubData.community || { avg: 0, count: 0 };
      const communityText = comm.count > 0
        ? `<span style="color: #f39c12; font-weight:900;">${comm.avg} ★</span> (${comm.count})`
        : `<span style="font-style:italic;">No ratings</span>`;

      const myRatingText = marker.pubData.rating && marker.pubData.rating > 0
        ? `<span style="color: #f39c12; font-weight:900;">${marker.pubData.rating} ★</span>`
        : `<span style="font-style:italic;">Unrated</span>`;

      let adminButtons = (state.isAdmin || state.isSuperadmin)
          ? `<button onclick="event.stopPropagation(); window.openPubDetails('${pubId}')" style="background:none; border:none; cursor:pointer; font-size:12px; margin-left: 5px;">✏️</button>`
          : "";

      const favIcon = marker.pubData.is_favorite ? '<span style="font-size: 14px; margin-right: 4px; filter: drop-shadow(0 0 2px rgba(0,0,0,0.3));">❤️</span>' : '';

      listHtml += `
        <div id="sidebar-item-${pubId}" class="pub-list-item" onclick="window.flyToPub(${marker.pubData.lat}, ${marker.pubData.lng}); window.highlightSidebar('${pubId}');" style="display: flex; align-items: center; padding: 12px; border-bottom: 1px solid var(--border-light); gap: 12px; cursor: pointer;">
            ${imgHtml}
            
            <div style="flex-grow: 1; display: flex; flex-direction: column; justify-content: center; overflow: hidden;">
                <div style="font-size: 15px; font-weight: 900; color: var(--text-primary); display: flex; align-items: center; line-height: 1.2;">
                    ${favIcon} <span style="white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${escapeHTML(marker.pubData.name)}</span> ${adminButtons}
                </div>
                ${addressHtml}
                
                <div style="font-size: 11px; color: var(--text-secondary); margin-top: 6px; font-weight: 700; display: flex; gap: 8px; flex-wrap: wrap;">
                    <span>⭐ ${myRatingText}</span>
                    <span>👥 ${communityText}</span>
                </div>
                
                <div style="font-size: 10px; color: var(--text-secondary); margin-top: 4px; font-style: italic;">
                    🕒 ${marker.pubData.visit_history && marker.pubData.visit_history.length > 0 ? `Visits: ${marker.pubData.visit_history.length} (Last: ${marker.pubData.visit_history[marker.pubData.visit_history.length - 1]})` : `Never visited`}
                </div>
                
                ${noteHtml}
                ${reviewHtml}
            </div>
            <div style="display: flex; flex-direction: column; align-items: flex-end; justify-content: center; gap: 6px; min-width: 120px;">
                <span style="font-size: 10px; font-weight: 900; color: ${isVisited ? '#27ae60' : '#7f8c8d'}; text-transform: uppercase;">
                    ${isVisited ? "✔️ VISITED" : "➕ TO VISIT"}
                </span>
                <button class="pub-status-btn status-unvisited" onclick="event.stopPropagation(); window.handleAddVisit('${pubId}')" style="padding: 6px 12px; font-size: 10px; border-radius: 20px; font-weight: 900; box-shadow: 0 2px 5px rgba(0,0,0,0.1); width: 100%;">
                    ${isVisited ? "+ ADD AGAIN" : "+ ADD VISIT"}
                </button>
                <button onclick="event.stopPropagation(); window.openPubDetails('${pubId}')" style="padding: 6px 12px; font-size: 10px; border-radius: 20px; font-weight: 900; background: var(--bg-app); border: 1px solid var(--border-color); color: var(--text-secondary); width: 100%; cursor: pointer;">
                    📖 VIEW
                </button>
            </div>
        </div>
      `;
    }
  });

  const pubInfoEl = document.getElementById("pub-info");
  if (pubInfoEl) pubInfoEl.innerText = `VISIBLE: ${visibleCount}`;

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
      openPubDetails(pubId);
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
    openPubDetails(pubId);
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
  const marker = state.markers.find((m) => String(m.pubData.id) === String(pubId));
  if (!marker) return;

  const pub = marker.pubData;
  const currentRating = pub.rating || 0;
  const comm = pub.community;
  const isVisited = pub.visited;

  const communityText = comm && comm.count > 0
    ? `Community: <strong style="color: #ffd700;">${comm.avg} ★</strong> <span style="font-size: 9px;">(${comm.count} total)</span>`
    : `No community ratings yet`;

  const oldModal = document.getElementById("pub-modal-overlay");
  if (oldModal) oldModal.remove();

  const imgHtml = pub.image_url
    ? `<img src="${escapeHTML(pub.image_url)}" style="width: 100%; height: 130px; object-fit: cover; border-radius: 6px; margin-bottom: 10px; box-shadow: 0 2px 4px rgba(0,0,0,0.1);">`
    : "";
  const addressHtml = pub.address
    ? `<div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 15px;">📍 ${escapeHTML(pub.address)}</div>`
    : "";

  let historyHtml = pub.visit_history && pub.visit_history.length > 0
    ? pub.visit_history.map((d, index) => `<li style="margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">${escapeHTML(d)} ${state.currentUser ? `<button onclick="window.removeSingleVisit('${pubId}', ${index})" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:12px;">✖</button>` : ""}</li>`).join("")
    : isVisited && pub.visit_date
      ? `<li style="margin-bottom:4px; display:flex; justify-content:space-between; align-items:center;">${escapeHTML(pub.visit_date)} ${state.currentUser ? `<button onclick="if(confirm('Delete visit?')) window.toggleVisitState('${pubId}')" style="background:none; border:none; color:#e74c3c; cursor:pointer; font-size:12px;">✖</button>` : ""}</li>`
      : `<li style="color: #999; font-style: italic;">No visits yet</li>`;

  const visitsCount = pub.visit_history ? pub.visit_history.length : isVisited ? 1 : 0;
  

  const modalHtml = `
    <div id="pub-modal-overlay" onclick="if(event.target === this) document.getElementById('pub-modal-overlay').remove()" style="position: fixed; top:0; left:0; width:100%; height:100%; background: rgba(0,0,0,0.7); z-index: 9999; display: flex; justify-content: center; align-items: center; font-family: sans-serif;">
      <div style="background: var(--bg-primary); color: var(--text-primary); padding: 20px; border-radius: 8px; width: 90%; max-width: 320px; position: relative; box-shadow: 0 4px 15px rgba(0,0,0,0.3); max-height: 90vh; overflow-y: auto; text-align: center;">
        
        <button onclick="document.getElementById('pub-modal-overlay').remove()" style="position: absolute; top: 12px; right: 12px; border: none; background: var(--bg-app); color: var(--text-primary); border-radius: 50%; width: 26px; height: 26px; font-size: 14px; cursor: pointer; z-index: 10; display:flex; align-items:center; justify-content:center;">✖</button>
        
        <h2 style="margin: 0 0 5px 0; font-size: 20px; padding-right: 25px;">${escapeHTML(pub.name)}</h2>
        ${addressHtml}
        ${imgHtml}
        
        <button id="favorite-btn" onclick="window.toggleFavorite('${pubId}')" style="background: none; border: 1px solid ${pub.is_favorite ? "#e74c3c" : "#ccc"}; padding: 6px 12px; border-radius: 20px; cursor: pointer; font-size: 13px; font-weight: bold; margin-bottom: 15px; color: ${pub.is_favorite ? "#e74c3c" : "#777"};">
          ${pub.is_favorite ? "❤️ Favorited" : "🤍 Mark as Favorite"}
        </button>

        <div style="background: var(--bg-app); padding: 10px; border-radius: 6px; margin-bottom: 15px;">
          <span style="font-size: 12px; font-weight: bold; color: var(--text-secondary);">Your rating:</span><br>
          ${getStarsHtml(pubId, currentRating)}
          <div style="font-size: 11px; color: var(--text-secondary); margin-top: 8px; padding-top: 8px; border-top: 1px solid var(--border-color);">${communityText}</div>
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
          ${!isVisited ? `<button onclick="window.handleAddVisit('${pubId}')" style="background: #2ecc71; color: white; border: none; padding: 10px; border-radius: 4px; cursor: pointer; font-size: 13px; font-weight: bold; width: 100%;">+ ADD VISIT</button>` : `<button onclick="if(confirm('Delete ALL visits?')) { window.toggleVisitState('${pubId}'); document.getElementById('pub-modal-overlay').remove(); }" style="background: var(--bg-primary); color: #e74c3c; border: 1px solid #e74c3c; padding: 10px; border-radius: 4px; cursor: pointer; width: 100%; font-weight: bold; font-size: 13px;">❌ UNMARK (Delete Visits)</button>`}
        </div>

        ${(state.isAdmin || state.isSuperadmin) ? `
          <div style="margin-top: 25px; padding-top: 15px; border-top: 2px dashed #e74c3c; text-align: left;">
            <strong style="font-size: 12px; color: #e74c3c;">🛠️ Admin Tools (Pub Data)</strong>
            <label style="font-size: 10px; color: var(--text-secondary); display: block; margin-top: 8px;">Address:</label>
            <input type="text" id="admin-address" value="${escapeHTML(pub.address || "")}" style="width: 100%; padding: 5px; font-size: 11px; margin-bottom: 8px; box-sizing: border-box; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); border-radius: 3px;">
            
            <label style="font-size: 10px; color: var(--text-secondary); display: block;">Image URL:</label>
            <input type="text" id="admin-image" value="${escapeHTML(pub.image_url || "")}" style="width: 100%; padding: 5px; font-size: 11px; margin-bottom: 8px; box-sizing: border-box; border: 1px solid var(--border-color); background: var(--bg-primary); color: var(--text-primary); border-radius: 3px;">
            
            <button onclick="window.saveAdminPubInfo('${pubId}')" style="background: #e74c3c; color: white; border: none; padding: 6px 10px; border-radius: 4px; cursor: pointer; font-size: 11px; width: 100%; font-weight: bold;">💾 Zapisz dane globalne pubu</button>
          </div>
        ` : ""}
      </div>
    </div>
  `;

  document.body.insertAdjacentHTML("beforeend", modalHtml);
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
  openPubDetails(pubId);
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
