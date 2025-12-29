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

// Format update timestamp
function formatUpdateTime(dateStr) {
  const date = new Date(dateStr);
  return date.toLocaleString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
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
  
  li.innerHTML = `
    <div class="item-rank"></div>
    <div class="item-content">
      <h3 class="item-title">
        <a href="${item.url || '#'}" target="_blank" rel="noopener">${escapeHtml(item.title)}</a>
        ${domainHtml}
      </h3>
      ${item.summary !== item.title ? `<p class="item-summary">${escapeHtml(item.summary)}</p>` : ''}
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

// Initialize
async function init() {
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

