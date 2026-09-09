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
import { initMap, loadPubs, applyFilters, flyToPub } from './map.js';
import {
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
  saveAdminPubInfo
} from './ui.js';

async function startApp() {
  const {
    data: { session },
  } = await supabaseClient.auth.getSession();
  
  if (!session) {
    window.location.href = "login.html";
    return;
  }
  
  state.currentUser = session.user;

  if (state.isSidebarHidden) {
    document.querySelector(".content-area").classList.add("sidebar-hidden");
  }

  setupUserProfile();
  initMap();
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
window.setFilter = setFilter;
window.handleSearch = handleSearch;

window.flyToPub = flyToPub;
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
  localStorage.setItem("taptracker_darkmode", isDark);
};

document.addEventListener('click', function(event) {
  const dropdown = document.getElementById("user-dropdown");
  const btn = document.getElementById("user-display");
  if (dropdown && !dropdown.classList.contains("hidden")) {
    if (!dropdown.contains(event.target) && event.target !== btn) {
      dropdown.classList.add("hidden");
    }
  }
});

// Load dark mode preference on startup
if (localStorage.getItem("taptracker_darkmode") === "true") {
  document.body.classList.add("dark-mode");
}
window.editNote = function(pubId) {
    alert("Edit note function is not implemented yet. Use 'note' in pub details.");
};

window.onload = startApp;
