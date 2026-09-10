const fs = require('fs');

let css = fs.readFileSync('style.css', 'utf8');

const newCSS = `
/* --- NEW PUB CARD LAYOUT --- */
.pub-card {
  background-color: #18181b;
  border: 1px solid #27272a;
  border-radius: 0.5rem;
  padding: 0.75rem;
  margin-bottom: 0.5rem;
  transition: background-color 0.2s, border-color 0.2s;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.pub-card:hover {
  border-color: #3f3f46;
  background-color: #1f1f22;
}
.pub-card.active-sidebar-item {
  border-color: #2196f3;
  background-color: #1a2530;
}

.pub-card-top {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.pub-card-thumbnail {
  width: 80px;
  height: 80px;
  border-radius: 0.375rem;
  object-fit: cover;
  flex-shrink: 0;
  background-color: #27272a;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #52525b;
  font-size: 24px;
}

.pub-card-content {
  flex-grow: 1;
  min-width: 0; /* needed for truncate */
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: 0.25rem;
}

.pub-card-title {
  font-weight: 600;
  font-size: 15px;
  color: #f4f4f5;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 4px;
}

.pub-card-address {
  color: #a1a1aa;
  font-size: 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.pub-card-meta {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-top: 0.25rem;
  flex-wrap: wrap;
}

.pub-card-badge {
  background-color: #27272a;
  color: #d4d4d8;
  font-size: 10px;
  padding: 2px 6px;
  border-radius: 9999px;
  font-weight: 600;
  display: inline-flex;
  align-items: center;
  gap: 4px;
}

.pub-card-badge.rating {
  background-color: rgba(245, 158, 11, 0.15);
  color: #fbbf24;
}

.pub-card-badge.checkin {
  background-color: rgba(33, 150, 243, 0.15);
  color: #3bf;
}

.pub-card-bottom {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: space-between;
  border-top: 1px solid #27272a;
  padding-top: 0.75rem;
}

.pub-card-actions {
  display: flex;
  gap: 0.5rem;
  flex: 1;
}

.pub-card-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background-color: #27272a;
  color: #e4e4e7;
  border: none;
  border-radius: 0.375rem;
  padding: 6px 12px;
  font-size: 11px;
  font-weight: 600;
  cursor: pointer;
  transition: background-color 0.2s;
  flex: 1;
}
.pub-card-btn:hover {
  background-color: #3f3f46;
}

.pub-card-btn.primary {
  background-color: #2196f3;
  color: #fff;
}
.pub-card-btn.primary:hover {
  background-color: #1976d2;
}

.pub-card-icon-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border-radius: 50%;
  background-color: transparent;
  border: 1px solid #3f3f46;
  color: #a1a1aa;
  cursor: pointer;
  flex-shrink: 0;
  transition: all 0.2s;
}
.pub-card-icon-btn:hover {
  background-color: #27272a;
  color: #f4f4f5;
}
.pub-card-icon-btn.is-favorite {
  color: #ef4444;
  border-color: #ef4444;
  background-color: rgba(239, 68, 68, 0.1);
}
`;

if (!css.includes('.pub-card {')) {
  css += newCSS;
  fs.writeFileSync('style.css', css);
  console.log('Appended pub-card CSS');
}

// Modify dark mode background
css = css.replace('--bg-primary: #1e1e1e;', '--bg-primary: #0f172a;');
fs.writeFileSync('style.css', css);

