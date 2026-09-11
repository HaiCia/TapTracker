import { supabaseClient } from './api.js';
import { state } from './state.js';
import {
  setupUserProfile,
  generateNewFriendCode,
  copyFriendCode,
  changeNickname,
  rotateFriendCode,
  changePassword,
  logout,
  grantAdminStatus,
  revokeAdminStatus
} from './auth.js';
import { initMap, loadPubs, applyFilters, flyToPub, selectPub, panToWithVerticalOffset } from './map.js';
import {
  showToast,
  getMarkerHtml,
  getStarsHtml,
  highlightSidebar,
  updateSidebarList,
  setFilter,
  handleSearch,
  toggleVisitState,
  compareMap,
  stopComparing,
  toggleSidebar,
  toggleViewMode,
  saveRating,
  markAsVisited,
  removeVisit,
  toggleFavorite,
  openPubDetails,
  savePubTexts,
  handleAddVisit,
  saveAdminPubInfo,
  removeSingleVisit,
  checkIn,
  checkOut,
  sendChatMessage,
  loadChatMessages,
  renderChatMessages,
  toggleSidebarChat,
  toggleLegend
} from './ui.js';
import { initBottomSheet, initSidebarEventIsolation } from './sheet.js';
import { initPwa, handlePwaInstall, closeIosInstallModal } from './pwa.js';

// Initialize PWA Controller immediately to capture early beforeinstallprompt
initPwa();

async function startApp() {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  
  if (!session) {
    window.location.href = "login.html";
    return;
  }
  
  state.currentUser = session.user;

  if (window.innerWidth >= 1025) {
    state.isSidebarHidden = false;
    document.querySelector(".content-area")?.classList.remove("sidebar-hidden");
    document.querySelector(".sidebar")?.classList.remove("is-collapsed");
  } else if (state.isSidebarHidden && window.innerWidth > 768) {
    document.querySelector(".content-area")?.classList.add("sidebar-hidden");
    document.querySelector(".sidebar")?.classList.add("is-collapsed");
  }

  setupUserProfile();
  initMap();

  if (window.innerWidth >= 1025) {
    setTimeout(() => {
      if (state.map) state.map.invalidateSize();
    }, 150);
  }

  const sheetEl = document.querySelector('.sidebar');
  const handleEl = document.querySelector('.sheet-handle-zone');
  if (sheetEl) {
    initSidebarEventIsolation(sheetEl);
    if (handleEl) {
      initBottomSheet(sheetEl, handleEl);
    }
  }
}

function toggleUserMenu() {
  const dropdown = document.getElementById("user-dropdown");
  if (dropdown) dropdown.classList.toggle("show");
}

// Bind functions to window so inline HTML onclick attributes can access them
window.toggleUserMenu = toggleUserMenu;
window.copyFriendCode = copyFriendCode;
window.changeNickname = changeNickname;
window.rotateFriendCode = rotateFriendCode;
window.changePassword = changePassword;
window.logout = logout;
window.grantAdminStatus = grantAdminStatus;
window.revokeAdminStatus = revokeAdminStatus;

window.compareMap = compareMap;
window.stopComparing = stopComparing;

window.toggleSidebar = toggleSidebar;
window.toggleViewMode = toggleViewMode;
window.toggleLegend = toggleLegend;
window.setFilter = setFilter;
window.handleSearch = handleSearch;
window.handlePwaInstall = handlePwaInstall;
window.closeIosInstallModal = closeIosInstallModal;

window.flyToPub = flyToPub;
window.selectPub = selectPub;
window.panToWithVerticalOffset = panToWithVerticalOffset;
window.highlightSidebar = highlightSidebar;
window.toggleVisitState = toggleVisitState;
window.saveRating = saveRating;
window.markAsVisited = markAsVisited;
window.removeVisit = removeVisit;
window.toggleFavorite = toggleFavorite;
window.openPubDetails = openPubDetails;
window.savePubTexts = savePubTexts;
window.handleAddVisit = handleAddVisit;
window.saveAdminPubInfo = saveAdminPubInfo;
window.removeSingleVisit = removeSingleVisit;

window.toggleDarkMode = function() {
  document.body.classList.toggle("dark-mode");
  const isDark = document.body.classList.contains("dark-mode");
  const theme = isDark ? "dark" : "light";
  document.documentElement.setAttribute("data-theme", theme);
  document.body.setAttribute("data-theme", theme);
  localStorage.setItem("taptracker_darkmode", isDark);
};

document.addEventListener('click', function(event) {
  const dropdown = document.getElementById("user-dropdown");
  const btn = document.getElementById("user-display");
  if (dropdown && dropdown.classList.contains("show")) {
    if (!dropdown.contains(event.target) && event.target !== btn) {
      dropdown.classList.remove("show");
    }
  }
});

window.addEventListener('resize', () => {
  const sidebarBtn = document.getElementById("sidebar-toggle-btn");
  if (window.innerWidth >= 1025) {
    if (state.isSidebarHidden) {
      state.isSidebarHidden = false;
      document.querySelector(".content-area")?.classList.remove("sidebar-hidden");
      document.querySelector(".sidebar")?.classList.remove("is-collapsed");
    }
    if (sidebarBtn) {
      sidebarBtn.style.display = "none";
    }
  } else if (window.innerWidth >= 769 && window.innerWidth <= 1024) {
    if (sidebarBtn && !state.isListOnly) {
      sidebarBtn.style.display = "flex";
      sidebarBtn.innerText = state.isSidebarHidden ? "◀" : "▶";
    }
  } else {
    // Mobile <= 768px
    if (sidebarBtn) {
      sidebarBtn.style.display = "none";
    }
  }
  if (state.map) {
    state.map.invalidateSize();
  }
});

// Load dark mode preference on startup
const isDarkModeStored = localStorage.getItem("taptracker_darkmode") === "true";
if (isDarkModeStored) {
  document.body.classList.add("dark-mode");
  document.documentElement.setAttribute("data-theme", "dark");
  document.body.setAttribute("data-theme", "dark");
} else {
  document.body.classList.remove("dark-mode");
  document.documentElement.setAttribute("data-theme", "light");
  document.body.setAttribute("data-theme", "light");
}
window.editNote = function(pubId) {
    alert("Edit note function is not implemented yet. Use 'note' in pub details.");
};





window.checkIn = checkIn;
window.checkOut = checkOut;
window.sendChatMessage = sendChatMessage;
window.loadChatMessages = loadChatMessages;
window.toggleSidebarChat = toggleSidebarChat;
window.updateSidebarList = updateSidebarList;

// Setup Realtime
function setupRealtime() {
  const channel = supabaseClient.channel('public_room');

  channel.on('postgres_changes', { event: '*', schema: 'public', table: 'checkins' }, payload => {
    // Reload pubs to update checkin counts and markers
    loadPubs();
    // Update modal if open
    if (state.currentPubId) {
      const pubId = state.currentPubId;
      const statusEl = document.getElementById('checkin-status');
      if (statusEl) {
        statusEl.innerText = (state.myCheckin && state.myCheckin.pub_id === pubId)
          ? '✅ You are checked in here'
          : (state.checkins && state.checkins[pubId] ? `👥 ${state.checkins[pubId]} people here` : "No one is here right now");
      }
    }
  });

  channel.on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'pub_messages' }, payload => {
    const newMsg = payload.new;
    const pubId = newMsg.pub_id;
    if (!state.pubMessages[pubId]) state.pubMessages[pubId] = [];
    state.pubMessages[pubId].push(newMsg);
    if (String(state.currentPubId) === String(pubId)) {
      renderChatMessages(pubId);
    }
    window.updateSidebarList();
  });

  channel.subscribe();
}

const originalStartApp = startApp;
const newStartApp = async function() {
  await originalStartApp();
  
  // also get my current checkin
  const { data } = await supabaseClient.from('checkins').select('*').eq('user_id', state.currentUser.id).gt('expires_at', new Date().toISOString());
  if (data && data.length > 0) {
    state.myCheckin = data[0];
  }

  setupRealtime();
};
window.onload = newStartApp;

