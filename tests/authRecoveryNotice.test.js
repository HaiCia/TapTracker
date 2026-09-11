import { describe, it, expect } from 'vitest';
import { Window } from 'happy-dom';
import fs from 'node:fs';
import path from 'node:path';

describe('Manual Password Reset Recovery Notice', () => {
  const htmlPath = path.resolve(__dirname, '../login.html');
  const htmlContent = fs.readFileSync(htmlPath, 'utf-8');

  const window = new Window();
  window.document.write(htmlContent);
  const document = window.document;

  it('renders the .auth-recovery-notice container in the DOM', () => {
    const notice = document.querySelector('.auth-recovery-notice');
    expect(notice).not.toBeNull();
  });

  it('contains the recovery prompt with a functional mailto: link', () => {
    const notice = document.querySelector('.auth-recovery-notice');
    const mailtoLink = notice.querySelector('a[href^="mailto:"]');
    expect(mailtoLink).not.toBeNull();
    expect(mailtoLink.getAttribute('href')).toBe('mailto:taptracker@outlook.com');
    expect(notice.textContent).toContain('Forgot your password? Send an email to');
    expect(notice.textContent).toContain('taptracker@outlook.com');
    expect(notice.textContent).toContain('and we will reset it for you.');
  });

  it('verifies the presence of the security text constraint inside the DOM', () => {
    const notice = document.querySelector('.auth-recovery-notice');
    const expectedSecurityCondition =
      'Note: For security reasons, password resets can only be processed for requests sent directly from the email address registered to the account.';
    expect(notice.textContent).toContain(expectedSecurityCondition);
  });

  it('is placed beneath authentication submit actions inside .login-container', () => {
    const container = document.querySelector('.login-container');
    const loginBtn = container.querySelector('#login-btn');
    const toggleBtn = container.querySelector('.toggle-mode-btn');
    const notice = container.querySelector('.auth-recovery-notice');

    expect(notice).not.toBeNull();
    expect(loginBtn).not.toBeNull();
    expect(toggleBtn).not.toBeNull();

    const children = Array.from(container.children);
    const loginIndex = children.indexOf(loginBtn);
    const toggleIndex = children.indexOf(toggleBtn);
    const noticeIndex = children.indexOf(notice);

    expect(noticeIndex).toBeGreaterThan(loginIndex);
    expect(noticeIndex).toBeGreaterThan(toggleIndex);
  });
});
