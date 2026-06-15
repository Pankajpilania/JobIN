/**
 * Floating score badge injected into job listing pages.
 * Rendered inside a Shadow DOM for complete CSS isolation from the host page.
 */

const BADGE_ID = 'jobin-badge-root';

interface BadgeOptions {
  score?:      number | null;   // 0–100, null = loading
  label?:      string;
  onOpen?:     () => void;      // callback when user clicks "Open JobIN"
}

export function injectBadge(options: BadgeOptions = {}): () => void {
  // Remove any existing badge
  removeBadge();

  // Create host element (will not inherit page styles)
  const host = document.createElement('div');
  host.id = BADGE_ID;
  host.setAttribute('aria-label', 'JobIN Copilot');
  Object.assign(host.style, {
    position:  'fixed',
    bottom:    '24px',
    right:     '24px',
    zIndex:    '2147483647',
    fontFamily:'sans-serif',
  });

  // Shadow DOM for CSS isolation
  const shadow = host.attachShadow({ mode: 'open' });

  // Styles
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }

    .badge {
      display: flex;
      align-items: center;
      gap: 10px;
      background: linear-gradient(135deg, #0f0f1a 0%, #1a1a2e 100%);
      border: 1px solid rgba(99, 102, 241, 0.4);
      border-radius: 16px;
      padding: 10px 16px;
      cursor: pointer;
      box-shadow: 0 8px 32px rgba(0,0,0,0.5), 0 0 0 1px rgba(99,102,241,0.1);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      user-select: none;
      min-width: 160px;
    }
    .badge:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(0,0,0,0.6), 0 0 0 1px rgba(99,102,241,0.3);
    }
    .badge:active { transform: translateY(0); }

    .logo {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, #6366f1, #8b5cf6);
      border-radius: 8px;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 14px;
      font-weight: 800;
      color: white;
      flex-shrink: 0;
      font-family: 'Segoe UI', sans-serif;
    }

    .info { display: flex; flex-direction: column; gap: 1px; }

    .title {
      font-size: 11px;
      font-weight: 600;
      color: rgba(255,255,255,0.5);
      letter-spacing: 0.05em;
      text-transform: uppercase;
      font-family: 'Segoe UI', sans-serif;
    }

    .score-row {
      display: flex;
      align-items: center;
      gap: 6px;
    }

    .score {
      font-size: 18px;
      font-weight: 800;
      font-family: 'Segoe UI', 'Arial', sans-serif;
    }

    .score.loading { color: rgba(255,255,255,0.3); font-size: 13px; }
    .score.grade-a { color: #34d399; }
    .score.grade-b { color: #60a5fa; }
    .score.grade-c { color: #f59e0b; }
    .score.grade-d { color: #f97316; }
    .score.grade-f { color: #ef4444; }

    .pulse {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #6366f1;
      animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.5; transform: scale(0.8); }
    }

    .cta {
      margin-top: 4px;
      font-size: 10px;
      color: rgba(99,102,241,0.8);
      font-family: 'Segoe UI', sans-serif;
    }

    .dismiss {
      position: absolute;
      top: 6px; right: 8px;
      font-size: 11px;
      color: rgba(255,255,255,0.2);
      cursor: pointer;
      line-height: 1;
      transition: color 0.15s;
    }
    .dismiss:hover { color: rgba(255,255,255,0.6); }
  `;
  shadow.appendChild(style);

  // Render badge DOM
  const badge = document.createElement('div');
  badge.className = 'badge';
  badge.setAttribute('role', 'button');
  badge.setAttribute('tabindex', '0');

  const score      = options.score;
  const isLoading  = score === null || score === undefined;
  const grade      = !isLoading ? getGrade(score!) : '';
  const scoreClass = isLoading ? 'loading' : `grade-${grade.toLowerCase()}`;
  const scoreText  = isLoading ? 'Analysing…' : `${score}/100`;

  badge.innerHTML = `
    <div class="logo">J</div>
    <div class="info">
      <span class="title">JobIN Match</span>
      <div class="score-row">
        ${isLoading ? '<div class="pulse"></div>' : ''}
        <span class="score ${scoreClass}">${scoreText}</span>
      </div>
      <span class="cta">Click to tailor → open panel</span>
    </div>
  `;

  // Dismiss button
  const dismiss = document.createElement('span');
  dismiss.className = 'dismiss';
  dismiss.textContent = '✕';
  dismiss.setAttribute('role', 'button');
  dismiss.setAttribute('aria-label', 'Dismiss JobIN badge');
  dismiss.addEventListener('click', (e) => { e.stopPropagation(); removeBadge(); });
  badge.appendChild(dismiss);

  badge.addEventListener('click', () => {
    options.onOpen?.();
    chrome.runtime.sendMessage({ type: 'OPEN_SIDE_PANEL' });
  });
  badge.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' || e.key === ' ') badge.click();
  });

  shadow.appendChild(badge);
  document.body.appendChild(host);

  // Entry animation
  requestAnimationFrame(() => {
    badge.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
    badge.style.opacity = '0';
    badge.style.transform = 'translateY(12px)';
    requestAnimationFrame(() => {
      badge.style.opacity = '1';
      badge.style.transform = 'translateY(0)';
    });
  });

  return removeBadge;
}

/** Update the badge score without re-creating it */
export function updateBadgeScore(score: number): void {
  const host = document.getElementById(BADGE_ID);
  if (!host?.shadowRoot) return;
  const scoreEl = host.shadowRoot.querySelector('.score');
  if (!scoreEl) return;
  const grade = getGrade(score);
  scoreEl.textContent = `${score}/100`;
  scoreEl.className = `score grade-${grade.toLowerCase()}`;
  const pulse = host.shadowRoot.querySelector('.pulse');
  pulse?.remove();
}

export function removeBadge(): void {
  document.getElementById(BADGE_ID)?.remove();
}

function getGrade(score: number): string {
  if (score >= 85) return 'A';
  if (score >= 70) return 'B';
  if (score >= 55) return 'C';
  if (score >= 40) return 'D';
  return 'F';
}
