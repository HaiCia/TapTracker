const supabaseClient = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

let map;
let markers = [];
let markerCluster;
let currentUser = null;
let currentFilterType = "all";
let currentSearchQuery = "";
let isSidebarHidden = false;
let isListOnly = false;
let friendVisitData = {};
let isComparing = false;

async function startApp() {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  if (!session) {
    window.location.href = "login.html";
    return;
  }
  currentUser = session.user;

  setupUserProfile();
  initMap();
}

function toggleUserMenu() {
  const dropdown = document.getElementById("user-dropdown");
  if (dropdown) dropdown.classList.toggle("show");
}

// --- PROFIL UŻYTKOWNIKA I KODY ZNAJOMYCH ---
async function setupUserProfile() {
  let displayName = currentUser.email.split("@")[0];

  const { data, error } = await supabaseClient
    .from("profiles")
    .select("friend_code, nickname")
    .eq("id", currentUser.id);

  if (error) {
    console.error("Profile fetch error:", error.message);
  }

  if (data && data.length > 0) {
    const profile = data[0];
    document.getElementById("my-friend-code").innerText =
      profile.friend_code || "⏳...";

    if (profile.nickname) {
      displayName = profile.nickname;
    }
  } else {
    generateNewFriendCode();
  }

  document.getElementById("user-display").innerText = displayName + " ▼";
}

async function generateNewFriendCode() {
  const newCode =
    "TAP-" + Math.random().toString(36).substring(2, 6).toUpperCase();
  const { error } = await supabaseClient
    .from("profiles")
    .upsert({ id: currentUser.id, friend_code: newCode });
  if (!error) {
    document.getElementById("my-friend-code").innerText = newCode;
  }
}

async function rotateFriendCode() {
  if (confirm("Resetting your code will invalidate the old one. Continue?")) {
    await generateNewFriendCode();
  }
}

function copyFriendCode() {
  const codeText = document.getElementById("my-friend-code").innerText;
  if (!codeText || codeText.includes("⏳")) return;
  navigator.clipboard
    .writeText(codeText)
    .then(() => alert("Copied: " + codeText));
}

async function changeNickname() {
  const currentName = document
    .getElementById("user-display")
    .innerText.replace(" ▼", "");
  const newName = window.prompt("Enter new nickname:", currentName);

  if (!newName || newName.trim() === "" || newName === currentName) return;

  const cleanName = newName.trim();

  const { error } = await supabaseClient
    .from("profiles")
    .update({ nickname: cleanName })
    .eq("id", currentUser.id);

  if (error) {
    alert("Error changing nickname: " + error.message);
    console.error("Supabase error details:", error);
  } else {
    document.getElementById("user-display").innerText = cleanName + " ▼";
  }
}

async function changePassword() {
  const newPassword = window.prompt(
    "Enter new password (minimum 6 characters):",
  );

  if (!newPassword || newPassword.trim() === "") return;

  if (newPassword.length < 6) {
    alert("Password is too short! It must be at least 6 characters.");
    return;
  }

  const { error } = await supabaseClient.auth.updateUser({
    password: newPassword,
  });

  if (error) {
    alert("Error changing password: " + error.message);
    console.error("Error details:", error);
  } else {
    alert(
      "Your password has been successfully changed! You can use it on your next login.",
    );
  }
}

async function logout() {
  await supabaseClient.auth.signOut();
  window.location.reload();
}

// --- MAPA I PUBY ---
function initMap() {
  map = L.map("map").setView([53.8008, -1.5491], 13);
  L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
    maxZoom: 19,
  }).addTo(map);

  markerCluster = L.markerClusterGroup({
    maxClusterRadius: 40,
    disableClusteringAtZoom: 16,
  });
  map.addLayer(markerCluster);

  loadPubs();
}

async function loadPubs() {
  const { data: pubs } = await supabaseClient.from("pubs").select("*");
  const { data: visits } = await supabaseClient
    .from("visits")
    .select("*")
    .eq("user_id", currentUser.id);

  const visitedMap = {};
  if (visits) {
    visits.forEach((v) => {
      visitedMap[v.pub_id] = { date: v.visit_date, note: v.note };
    });
  }

  markers = [];
  if (pubs) {
    pubs.forEach((pub) => {
      const isVisited = !!visitedMap[pub.id];
      pub.visited = isVisited;
      pub.visit_date = isVisited ? visitedMap[pub.id].date : null;
      pub.note = isVisited ? visitedMap[pub.id].note : null;

      const marker = L.marker([pub.lat, pub.lng], {
        icon: L.divIcon({
          html: getMarkerHtml(isVisited, pub.id, false),
          className: "custom-icon",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
      });
      marker.pubData = pub;
      markers.push(marker);
    });
  }
  applyFilters();
}

function getMarkerHtml(isVisited, pubId, isFriendVisited = false) {
  let containerClass = "";
  let innerHtml = "<span>🍺</span>";

  if (isVisited && isFriendVisited) {
    containerClass = "is-both-visited";
    innerHtml += '<div class="tick">🤝</div>';
  } else if (isVisited) {
    containerClass = "is-visited";
    innerHtml += '<div class="tick">✓</div>';
  } else if (isFriendVisited) {
    containerClass = "is-friend-visited";
    innerHtml += '<div class="tick">👋</div>';
  }
  return `<div class="pub-icon-container ${containerClass}" onclick="toggleVisitState('${pubId}')">${innerHtml}</div>`;
}

function applyFilters() {
  let visibleCount = 0;
  let listHtml = "";
  markerCluster.clearLayers();

  markers.forEach((marker) => {
    const isVisited = marker.pubData.visited;
    const pubId = marker.pubData.id;
    const isFriendVisited =
      isComparing &&
      (friendVisitData[pubId] ||
        friendVisitData[String(pubId)] ||
        friendVisitData[Number(pubId)]);

    const matchesFilter =
      currentFilterType === "all" ||
      (currentFilterType === "visited" && (isVisited || isFriendVisited)) ||
      (currentFilterType === "unvisited" && !isVisited);

    const matchesSearch = marker.pubData.name
      .toLowerCase()
      .includes(currentSearchQuery);

    const updatedHtml = getMarkerHtml(isVisited, pubId, isFriendVisited);
    marker.setIcon(
      L.divIcon({
        html: updatedHtml,
        className: "custom-icon",
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      }),
    );

    if (matchesFilter && matchesSearch) {
      markerCluster.addLayer(marker);
      visibleCount++;

      let noteHtml = marker.pubData.note
        ? `<div style="font-size: 10px; color: #333;">⚠️ ${marker.pubData.note}</div>`
        : "";
      let dateHtml =
        isVisited && marker.pubData.visit_date
          ? `
                <div style="font-size: 10px; color: #555;">
                    <span onclick="event.stopPropagation(); editVisitDate('${pubId}')" style="cursor:pointer; font-weight: bold;" title="Edit date">✏️ ${marker.pubData.visit_date}</span>
                </div>`
          : "";

      // UWAGA: Upewnij się, że ADMIN_EMAILS jest zdefiniowane w config.js!
      let adminButtons =
        typeof ADMIN_EMAILS !== "undefined" &&
        ADMIN_EMAILS.includes(currentUser.email)
          ? `<button onclick="event.stopPropagation(); editNote('${pubId}')" style="background:none; border:none; cursor:pointer; font-size:10px;">✏️ note</button>`
          : "";

      listHtml += `
                <div class="pub-list-item" onclick="flyToPub(${marker.pubData.lat}, ${marker.pubData.lng})">
                    <div class="pub-info-group">
                        <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                            <span class="pub-name">${marker.pubData.name}</span>
                            ${adminButtons}
                        </div>
                        ${dateHtml}
                        ${noteHtml}
                    </div>
                    <div class="pub-list-bottom">
                        <span style="font-size: 8px; font-weight: 900; color: #666; text-transform: uppercase;">
                            ${isVisited ? "VISITED" : "TO VISIT"}
                        </span>
                        <button class="pub-status-btn ${isVisited ? "status-visited" : "status-unvisited"}" onclick="event.stopPropagation(); toggleVisitState('${pubId}')">
                            ${isVisited ? "✓ VISITED" : "+ MARK"}
                        </button>
                    </div>
                </div>
            `;
    }
  });

  document.getElementById("pub-info").innerText = `MATCHING: ${visibleCount}`;
  document.getElementById("pub-list-container").innerHTML = listHtml;
}

function setFilter(type, btn) {
  currentFilterType = type;
  document
    .querySelectorAll(".filters-container .filter-btn")
    .forEach((b) => b.classList.remove("active"));
  btn.classList.add("active");
  applyFilters();
}

function handleSearch(e) {
  currentSearchQuery = e.target.value.toLowerCase().trim();
  applyFilters();
}

function flyToPub(lat, lng) {
  map.setView([lat, lng], 16);
}

async function toggleVisitState(pubId) {
  const marker = markers.find((m) => String(m.pubData.id) === String(pubId));
  if (!marker) return;

  if (marker.pubData.visited) {
    await supabaseClient
      .from("visits")
      .delete()
      .eq("user_id", currentUser.id)
      .eq("pub_id", pubId);
    marker.pubData.visited = false;
    marker.pubData.visit_date = null;
    marker.pubData.note = null;
  } else {
    const today = new Date().toISOString().split("T")[0];
    await supabaseClient
      .from("visits")
      .insert([{ user_id: currentUser.id, pub_id: pubId, visit_date: today }]);
    marker.pubData.visited = true;
    marker.pubData.visit_date = today;
  }
  applyFilters();
}

async function editVisitDate(pubId) {
  const newDate = prompt(
    "Enter visit date (YYYY-MM-DD):",
    new Date().toISOString().split("T")[0],
  );
  if (!newDate) return;
  await supabaseClient
    .from("visits")
    .update({ visit_date: newDate })
    .eq("user_id", currentUser.id)
    .eq("pub_id", pubId);
  loadPubs();
}

// --- PORÓWNYWANIE MAP ---
async function compareMap() {
  const code = window.prompt("Enter friend's code (e.g. TAP-A1B2):");
  if (!code || !code.trim()) return;

  const cleanCode = code.trim().toUpperCase();
  const { data: profiles } = await supabaseClient
    .from("profiles")
    .select("id")
    .eq("friend_code", cleanCode);
  if (!profiles || profiles.length === 0) {
    alert("Friend not found!");
    return;
  }

  const friendId = profiles[0].id;
  const { data: visits } = await supabaseClient
    .from("visits")
    .select("pub_id")
    .eq("user_id", friendId)
    .limit(3000);

  friendVisitData = {};
  if (visits) visits.forEach((v) => (friendVisitData[String(v.pub_id)] = true));

  isComparing = true;
  document.getElementById("stop-compare-btn").style.display = "block";
  alert(`Loaded ${visits ? visits.length : 0} pubs from friend.`);
  applyFilters();
}

function stopComparing() {
  isComparing = false;
  friendVisitData = {};
  document.getElementById("stop-compare-btn").style.display = "none";
  applyFilters();
}

// --- WIDOKI ---
function toggleSidebar() {
  const contentArea = document.querySelector(".content-area");
  const btn = document.getElementById("sidebar-toggle-btn");
  if (isListOnly) toggleViewMode();

  isSidebarHidden = !isSidebarHidden;
  if (isSidebarHidden) {
    contentArea.classList.add("sidebar-hidden");
    btn.innerText = "◀";
  } else {
    contentArea.classList.remove("sidebar-hidden");
    btn.innerText = "▶";
    setTimeout(() => {
      if (map) map.invalidateSize();
    }, 100);
  }
}

function toggleViewMode() {
  const contentArea = document.querySelector(".content-area");
  const btn = document.getElementById("view-toggle-btn");
  if (isSidebarHidden) {
    isSidebarHidden = false;
    contentArea.classList.remove("sidebar-hidden");
    document.getElementById("sidebar-toggle-btn").innerText = "▶";
  }

  isListOnly = !isListOnly;
  if (isListOnly) {
    contentArea.classList.add("list-only-mode");
    btn.innerText = "🗺️ Map";
  } else {
    contentArea.classList.remove("list-only-mode");
    btn.innerText = "Full List";
    setTimeout(() => {
      if (map) map.invalidateSize();
    }, 100);
  }
}

window.changePassword = changePassword;
window.changeNickname = changeNickname;
window.onload = startApp;
