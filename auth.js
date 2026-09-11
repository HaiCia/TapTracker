import { supabaseClient } from './api.js';
import { state } from './state.js';

export async function setupUserProfile() {
  let displayName = state.currentUser.email.split('@')[0];

  const { data, error } = await supabaseClient
    .from('profiles')
    .select('friend_code, nickname, is_admin, is_superadmin, last_nickname_change, last_friend_code_change')
    .eq('id', state.currentUser.id);

  if (error) console.error('Profile fetch error:', error.message);

  if (data && data.length > 0) {
    const profile = data[0];
    state.profile = profile;
    state.isAdmin = profile.is_admin === true;
    state.isSuperadmin = profile.is_superadmin === true;
    state.lastNicknameChange = profile.last_nickname_change;
    state.lastFriendCodeChange = profile.last_friend_code_change;

    document.getElementById('friend-code-input').value = profile.friend_code || '⏳...';
    if (profile.nickname) displayName = profile.nickname;
  } else {
    generateNewFriendCode();
  }

  let displayHtml = `${displayName} ▼`;
  if (state.isSuperadmin) displayHtml = `👑 ${displayName} ▼`;
  else if (state.isAdmin) displayHtml = `🛠️ ${displayName} ▼`;

  document.getElementById('user-display').innerText = displayHtml;

  if (state.isSuperadmin) {
    let dropdown = document.getElementById('user-dropdown');
    if (dropdown && !document.getElementById('btn-make-admin')) {
      const grantBtn = document.createElement('button');
      grantBtn.id = 'btn-make-admin';
      grantBtn.innerHTML = '👑 Grant Admin';
      grantBtn.style.color = '#f39c12';
      grantBtn.onclick = window.grantAdminStatus;
      dropdown.insertBefore(grantBtn, dropdown.firstChild);

      const revokeBtn = document.createElement('button');
      revokeBtn.id = 'btn-revoke-admin';
      revokeBtn.innerHTML = '❌ Revoke Admin';
      revokeBtn.style.color = '#e74c3c';
      revokeBtn.onclick = window.revokeAdminStatus;
      dropdown.insertBefore(revokeBtn, grantBtn.nextSibling);
    }
  }
}

export async function generateNewFriendCode() {
  const newCode = 'TAP-' + Math.random().toString(36).substring(2, 6).toUpperCase();
  const { error } = await supabaseClient
    .from('profiles')
    .upsert({ id: state.currentUser.id, friend_code: newCode });
  if (!error) {
    document.getElementById('friend-code-input').value = newCode;
  }
}

export function copyFriendCode() {
  const input = document.getElementById('friend-code-input');
  const codeText = input ? input.value : '';
  if (!codeText || codeText.includes('⏳')) return;
  navigator.clipboard
    .writeText(codeText)
    .then(() => window.showToast && window.showToast('Code copied! 📋', 'success'))
    .catch(() => window.showToast && window.showToast('Copy failed — try manually', 'error'));
}

function getDaysRemaining(lastDateString) {
  if (!lastDateString) return 0;
  const lastDate = new Date(lastDateString);
  const now = new Date();
  const diffTime = now - lastDate;
  const daysPassed = Math.floor(diffTime / (1000 * 60 * 60 * 24));
  return Math.max(0, 30 - daysPassed);
}

export async function changeNickname() {
  const daysLeft = getDaysRemaining(state.lastNicknameChange);
  if (daysLeft > 0) {
    alert(`You can only change your nickname once every 30 days. Please wait ${daysLeft} more days.`);
    return;
  }

  const currentName = document.getElementById('user-display').innerText.replace(/ ▼|👑 |🛠️ /g, '');
  const newName = window.prompt('Enter new nickname:', currentName);

  if (!newName || newName.trim() === '' || newName === currentName) return;

  const cleanName = newName.trim();
  const nowIso = new Date().toISOString();

  const { error } = await supabaseClient
    .from('profiles')
    .update({ nickname: cleanName, last_nickname_change: nowIso })
    .eq('id', state.currentUser.id);

  if (error) {
    alert('Error changing nickname: ' + error.message);
  } else {
    state.lastNicknameChange = nowIso;
    setupUserProfile();
    alert('Nickname updated successfully!');
  }
}

export async function rotateFriendCode() {
  const daysLeft = getDaysRemaining(state.lastFriendCodeChange);
  if (daysLeft > 0) {
    window.showToast && window.showToast(`Wait ${daysLeft} more days to regenerate.`, 'error');
    return;
  }

  if (confirm('Resetting your code will invalidate the old one. Continue?')) {
    const newCode = 'TAP-' + Math.random().toString(36).substring(2, 6).toUpperCase();
    const nowIso = new Date().toISOString();

    const { error } = await supabaseClient
      .from('profiles')
      .update({ friend_code: newCode, last_friend_code_change: nowIso })
      .eq('id', state.currentUser.id);

    if (error) {
      window.showToast && window.showToast('Error generating new code.', 'error');
    } else {
      state.lastFriendCodeChange = nowIso;
      document.getElementById('friend-code-input').value = newCode;
      window.showToast && window.showToast('New friend code generated! 🔄', 'success');
    }
  }
}

export async function changePassword() {
  const newPassword = window.prompt('Enter new password (minimum 6 characters):');
  if (!newPassword || newPassword.trim() === '') return;
  if (newPassword.length < 6) {
    alert('Password is too short! It must be at least 6 characters.');
    return;
  }

  const { error } = await supabaseClient.auth.updateUser({ password: newPassword });
  if (error) {
    alert('Error changing password: ' + error.message);
    console.error('Error details:', error);
  } else {
    alert('Your password has been successfully changed! You can use it on your next login.');
  }
}

export async function logout() {
  await supabaseClient.auth.signOut();
  window.location.reload();
}

export async function grantAdminStatus() {
  if (!state.isSuperadmin) {
    alert('Only a Superadmin can grant permissions.');
    return;
  }

  const code = window.prompt('Enter the Friend Code to promote to Admin (e.g. TAP-A1B2):');
  if (!code || !code.trim()) return;
  const cleanCode = code.trim().toUpperCase();

  const { data: profiles, error: searchError } = await supabaseClient
    .from('profiles')
    .select('id, nickname')
    .eq('friend_code', cleanCode);

  if (searchError || !profiles || profiles.length === 0) {
    alert('User not found! Make sure the Friend Code is correct.');
    return;
  }

  const targetUserId = profiles[0].id;
  const targetName = profiles[0].nickname || cleanCode;

  if (confirm(`Are you sure you want to make ${targetName} a Moderator (Admin)?`)) {
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ is_admin: true })
      .eq('id', targetUserId);

    if (updateError) {
      alert('Error updating database. Check permissions.');
      console.error(updateError);
    } else {
      alert(`Success! ${targetName} is now an Admin 🛠️.`);
    }
  }
}

export async function revokeAdminStatus() {
  if (!state.isSuperadmin) {
    alert('Only a Superadmin can revoke permissions.');
    return;
  }

  const code = window.prompt('Enter the Friend Code to REMOVE Admin rights from (e.g. TAP-A1B2):');
  if (!code || !code.trim()) return;
  const cleanCode = code.trim().toUpperCase();

  const { data: profiles, error: searchError } = await supabaseClient
    .from('profiles')
    .select('id, nickname')
    .eq('friend_code', cleanCode);

  if (searchError || !profiles || profiles.length === 0) {
    alert('User not found! Make sure the Friend Code is correct.');
    return;
  }

  const targetUserId = profiles[0].id;
  const targetName = profiles[0].nickname || cleanCode;

  if (confirm(`Are you absolutely sure you want to REVOKE Admin rights from ${targetName}?`)) {
    const { error: updateError } = await supabaseClient
      .from('profiles')
      .update({ is_admin: false })
      .eq('id', targetUserId);

    if (updateError) {
      alert('Error updating database. Check permissions.');
      console.error(updateError);
    } else {
      alert(`Success! ${targetName} is no longer an Admin.`);
    }
  }
}

/**
 * Sign up a new user with email, password, and required Cloudflare Turnstile captcha token.
 */
export async function signUpUser(email, password, captchaToken, client = supabaseClient) {
  const cleanEmail = (email || '').trim();
  if (!cleanEmail) {
    return { data: null, error: { message: 'Fill in all fields!' } };
  }
  if (!password) {
    return { data: null, error: { message: 'Fill in all fields!' } };
  }
  if (!captchaToken || typeof captchaToken !== 'string' || !captchaToken.trim()) {
    return { data: null, error: { message: 'Please complete the Cloudflare Turnstile verification.' } };
  }

  return await client.auth.signUp({
    email: cleanEmail,
    password,
    options: {
      captchaToken: captchaToken.trim()
    }
  });
}

/**
 * Sign in an existing user with email, password, and required Cloudflare Turnstile captcha token.
 */
export async function signInUser(email, password, captchaToken, client = supabaseClient) {
  const cleanEmail = (email || '').trim();
  if (!cleanEmail) {
    return { data: null, error: { message: 'Fill in all fields!' } };
  }
  if (!password) {
    return { data: null, error: { message: 'Fill in all fields!' } };
  }
  if (!captchaToken || typeof captchaToken !== 'string' || !captchaToken.trim()) {
    return { data: null, error: { message: 'Please complete the Cloudflare Turnstile verification.' } };
  }

  return await client.auth.signInWithPassword({
    email: cleanEmail,
    password,
    options: {
      captchaToken: captchaToken.trim()
    }
  });
}

