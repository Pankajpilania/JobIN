/**
 * Floating score badge injected into job listing pages.
 * Rendered inside a Shadow DOM for complete CSS isolation from the host page.
 */

const BADGE_ID = 'jobin-badge-root';

interface BadgeOptions {
  score?: number | null; // 0–100, null = loading
  label?: string;
  onOpen?: () => void; // callback when user clicks "Open JobIN"
}

export function injectBadge(options: BadgeOptions = {}): () => void {
  // Remove any existing badge
  removeBadge();

  // Create host element (will not inherit page styles)
  const host = document.createElement('div');
  host.id = BADGE_ID;
  host.setAttribute('aria-label', 'JobIN Copilot');
  Object.assign(host.style, {
    position: 'fixed',
    bottom: '24px',
    right: '24px',
    zIndex: '2147483647',
    fontFamily: 'sans-serif',
  });

  // Shadow DOM for CSS isolation
  const shadow = host.attachShadow({ mode: 'open' });

  // Styles
  const style = document.createElement('style');
  style.textContent = `
    :host { all: initial; }

    .badge {
      position: relative;
      isolation: isolate;
      overflow: hidden;
      display: flex;
      align-items: center;
      gap: 10px;
      background: rgba(255,255,255,0.68);
      border: 1px solid rgba(255,255,255,0.86);
      border-radius: 16px;
      padding: 10px 16px;
      cursor: pointer;
      box-shadow: inset 0 1px 0 rgba(255,255,255,0.92), 0 8px 32px rgba(17,21,17,0.18), 0 0 0 1px rgba(0,140,96,0.08);
      backdrop-filter: blur(18px) saturate(1.35);
      -webkit-backdrop-filter: blur(18px) saturate(1.35);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      user-select: none;
      min-width: 160px;
    }
    .badge::before {
      position: absolute;
      z-index: 0;
      inset: 0;
      border-radius: inherit;
      background: linear-gradient(112deg, transparent 20%, rgba(255,255,255,0.72) 48%, transparent 76%);
      background-size: 220% 100%;
      animation: glass-sheen 7s ease-in-out infinite;
      content: '';
      pointer-events: none;
    }
    .badge > * { position: relative; z-index: 1; }
    .badge:hover {
      transform: translateY(-2px);
      box-shadow: 0 12px 40px rgba(17,21,17,0.22), 0 0 0 1px rgba(0,140,96,0.2);
    }
    .badge:active { transform: translateY(0); }

    .logo {
      width: 28px;
      height: 28px;
      background: linear-gradient(135deg, #00d991, #008c60);
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
      color: #536057;
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

    .score.loading { color: #738077; font-size: 13px; }
    .score.grade-a { color: #008c60; }
    .score.grade-b { color: #60a5fa; }
    .score.grade-c { color: #f59e0b; }
    .score.grade-d { color: #f97316; }
    .score.grade-f { color: #ef4444; }

    .pulse {
      width: 6px; height: 6px;
      border-radius: 50%;
      background: #00a86b;
      animation: pulse 1.5s ease-in-out infinite;
    }
    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50%       { opacity: 0.5; transform: scale(0.8); }
    }

    .cta {
      margin-top: 4px;
      font-size: 10px;
      color: #008c60;
      font-family: 'Segoe UI', sans-serif;
    }

    .dismiss {
      position: absolute;
      z-index: 2;
      top: 6px; right: 8px;
      font-size: 11px;
      color: #738077;
      cursor: pointer;
      line-height: 1;
      transition: color 0.15s;
    }
    .dismiss:hover { color: #111511; }
    @keyframes glass-sheen {
      0%, 18% { background-position: 130% 0; }
      60%, 78% { background-position: -35% 0; }
      100% { background-position: -80% 0; }
    }
    @media (prefers-reduced-motion: reduce) {
      .badge::before, .pulse { animation: none; }
      .pulse { opacity: 0.7; }
    }
  `;
  shadow.appendChild(style);

  // Render badge DOM
  const badge = document.createElement('div');
  badge.className = 'badge';
  badge.setAttribute('role', 'button');
  badge.setAttribute('tabindex', '0');

  const score = options.score;
  const isLoading = score === null || score === undefined;
  const grade = !isLoading ? getGrade(score!) : '';
  const scoreClass = isLoading ? 'loading' : `grade-${grade.toLowerCase()}`;
  const scoreText = isLoading ? 'Analysing…' : `${score}/100`;

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
  dismiss.addEventListener('click', (e) => {
    e.stopPropagation();
    removeBadge();
  });
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
  if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    requestAnimationFrame(() => {
      badge.style.transition = 'opacity 0.3s ease, transform 0.3s ease';
      badge.style.opacity = '0';
      badge.style.transform = 'translateY(12px)';
      requestAnimationFrame(() => {
        badge.style.opacity = '1';
        badge.style.transform = 'translateY(0)';
      });
    });
  }

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
