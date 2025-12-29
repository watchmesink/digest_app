// State
let currentFilter = '';
let feedData = null;

// DOM Elements
const feedList = document.querySelector('.feed-list');
const feedLoading = document.querySelector('.feed-loading');
const feedEmpty = document.querySelector('.feed-empty');
const itemCount = document.querySelector('.item-count');
const lastUpdated = document.querySelector('.last-updated');
const navLinks = document.querySelectorAll('.nav-link');

// Fetch feed data
async function fetchFeed(source = '') {
  try {
    const url = source ? `/api/feed?source=${source}` : '/api/feed';
    const response = await fetch(url);
    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching feed:', error);
    return null;
  }
}

// Format relative time
function formatRelativeTime(dateStr) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now - date;
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);
  
  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Format update timestamp (using local time)
function formatUpdateTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

// Extract domain from URL
function extractDomain(url) {
  if (!url) return null;
  try {
    const domain = new URL(url).hostname.replace('www.', '');
    return domain;
  } catch {
    return null;
  }
}

// Create feed item HTML
function createFeedItem(item, index) {
  const domain = item.meta.domain || extractDomain(item.url);
  const domainHtml = domain ? `<span class="item-domain">(${domain})</span>` : '';
  const isTelegram = item.source === 'telegram';
  const hasFullContent = isTelegram && (item.meta.fullText || (item.meta.images && item.meta.images.length > 0));
  
  // Build meta parts
  const metaParts = [];
  
  // Source badge
  metaParts.push(`<span class="meta-source source-${item.source}">${item.sourceLabel}</span>`);
  
  // Upvotes/views
  if (item.meta.upvotes !== undefined) {
    metaParts.push(`<span>▲ ${item.meta.upvotes}</span>`);
  }
  
  // Comments
  if (item.meta.comments !== undefined) {
    metaParts.push(`<span>💬 ${item.meta.comments}</span>`);
  }
  
  // Author
  if (item.meta.author) {
    metaParts.push(`<span>by ${item.meta.author}</span>`);
  }
  
  // Channel (for Telegram)
  if (item.meta.channel) {
    metaParts.push(`<span>${item.meta.channel}</span>`);
  }
  
  // Time
  metaParts.push(`<span>${formatRelativeTime(item.postedAt)}</span>`);
  
  const li = document.createElement('li');
  li.className = 'feed-item';
  li.style.animationDelay = `${index * 30}ms`;
  if (isTelegram) {
    li.classList.add('telegram-item');
  }
  
  // For Telegram, show title as link to Telegram post
  const titleHtml = isTelegram 
    ? `<h3 class="item-title">
        <a href="${item.url || '#'}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a>
      </h3>`
    : `
    <h3 class="item-title">
      <a href="${item.url || '#'}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a>
      ${domainHtml}
    </h3>
  `;
  
  // Telegram full content (always shown)
  let telegramContent = '';
  if (hasFullContent) {
    // Use HTML if available, otherwise use plain text
    const fullTextContent = item.meta.fullTextHtml 
      ? sanitizeHtml(item.meta.fullTextHtml)
      : escapeHtml(item.meta.fullText || item.summary);
    
    const imagesHtml = item.meta.images && item.meta.images.length > 0
      ? item.meta.images.map(img => `<a href="${escapeHtml(img)}" target="_blank" rel="noopener"><img src="${escapeHtml(img)}" alt="Telegram post image" class="telegram-image" loading="lazy"></a>`).join('')
      : '';
    
    telegramContent = `
      <div class="telegram-expanded">
        <div class="telegram-full-text">${fullTextContent}</div>
        ${imagesHtml ? `<div class="telegram-images">${imagesHtml}</div>` : ''}
      </div>
    `;
  }
  
  // For Telegram, show full content instead of summary
  const contentHtml = isTelegram && hasFullContent 
    ? telegramContent
    : (item.summary !== item.title ? `<p class="item-summary">${escapeHtml(item.summary)}</p>` : '');
  
  li.innerHTML = `
    <div class="item-content">
      ${titleHtml}
      ${contentHtml}
      <div class="item-meta">
        ${metaParts.join('')}
      </div>
    </div>
  `;
  
  return li;
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// Sanitize HTML - allow basic formatting tags but remove dangerous ones
function sanitizeHtml(html) {
  const div = document.createElement('div');
  div.innerHTML = html;
  
  // Remove script tags and event handlers
  const scripts = div.querySelectorAll('script');
  scripts.forEach(script => script.remove());
  
  // Remove dangerous attributes
  const allElements = div.querySelectorAll('*');
  allElements.forEach(el => {
    // Remove event handlers
    Array.from(el.attributes).forEach(attr => {
      if (attr.name.startsWith('on')) {
        el.removeAttribute(attr.name);
      }
    });
    
    // Allow only safe tags: p, br, strong, b, em, i, u, a, code, pre, blockquote, ul, ol, li
    const allowedTags = ['p', 'br', 'strong', 'b', 'em', 'i', 'u', 'a', 'code', 'pre', 'blockquote', 'ul', 'ol', 'li', 'span', 'div'];
    if (!allowedTags.includes(el.tagName.toLowerCase())) {
      // Replace with span to preserve content
      const span = document.createElement('span');
      span.innerHTML = el.innerHTML;
      el.parentNode?.replaceChild(span, el);
    }
  });
  
  return div.innerHTML;
}

// Render feed
function renderFeed(data) {
  feedLoading.style.display = 'none';
  feedList.innerHTML = '';
  
  if (!data || !data.items || data.items.length === 0) {
    feedEmpty.style.display = 'block';
    itemCount.textContent = '0 items';
    return;
  }
  
  feedEmpty.style.display = 'none';
  
  data.items.forEach((item, index) => {
    feedList.appendChild(createFeedItem(item, index));
  });
  
  // Update meta
  itemCount.textContent = `${data.filteredCount} items${data.filteredCount !== data.totalCount ? ` (of ${data.totalCount})` : ''}`;
  lastUpdated.textContent = `Updated: ${formatUpdateTime(data.lastUpdated)}`;
}

// Handle filter click
function handleFilterClick(e) {
  e.preventDefault();
  
  const filter = e.target.dataset.filter;
  
  // Update active state
  navLinks.forEach(link => {
    link.classList.toggle('active', link.dataset.filter === filter);
  });
  
  currentFilter = filter;
  
  // Show loading
  feedLoading.style.display = 'flex';
  feedList.innerHTML = '';
  
  // Fetch and render
  fetchFeed(filter).then(data => {
    feedData = data;
    renderFeed(data);
  });
}

// Theme management
function initTheme() {
  const savedTheme = localStorage.getItem('theme') || 'light';
  if (savedTheme === 'dark') {
    document.body.classList.add('dark-theme');
  }
  
  const themeToggle = document.querySelector('.theme-toggle');
  if (themeToggle) {
    themeToggle.addEventListener('click', () => {
      const isDark = document.body.classList.toggle('dark-theme');
      localStorage.setItem('theme', isDark ? 'dark' : 'light');
    });
  }
}

// Initialize
async function init() {
  // Initialize theme
  initTheme();
  
  // Attach filter handlers
  navLinks.forEach(link => {
    link.addEventListener('click', handleFilterClick);
  });
  
  // Initial load
  feedData = await fetchFeed();
  renderFeed(feedData);
  
  // Auto-refresh every 5 minutes (the server updates every 30 mins, but check more often for freshness)
  setInterval(async () => {
    const data = await fetchFeed(currentFilter);
    if (data) {
      feedData = data;
      renderFeed(data);
    }
  }, 5 * 60 * 1000);
}

// Start
document.addEventListener('DOMContentLoaded', init);

