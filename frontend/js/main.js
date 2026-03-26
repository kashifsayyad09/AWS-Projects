// ============================================
// Problem Solving Platform - Main JavaScript
// ============================================

const API_URL = '/api';

// ============================================
// Theme Management
// ============================================

function initTheme() {
    const savedTheme = localStorage.getItem('theme') || 'light';
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
}

function toggleTheme() {
    const currentTheme = document.documentElement.getAttribute('data-theme');
    const newTheme = currentTheme === 'light' ? 'dark' : 'light';

    document.documentElement.setAttribute('data-theme', newTheme);
    localStorage.setItem('theme', newTheme);
    updateThemeIcon(newTheme);
}

function updateThemeIcon(theme) {
    const themeIcon = document.getElementById('theme-icon');
    if (themeIcon) {
        themeIcon.textContent = theme === 'light' ? '🌙' : '☀️';
    }
}

// ============================================
// Authentication
// ============================================

function getToken() {
    return localStorage.getItem('token');
}

function setToken(token) {
    localStorage.setItem('token', token);
}

function removeToken() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
}

function getUser() {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
}

function setUser(user) {
    localStorage.setItem('user', JSON.stringify(user));
}

function isAuthenticated() {
    return !!getToken();
}

function isAdmin() {
    const user = getUser();
    return user && user.role === 'admin';
}

function logout() {
    removeToken();
    window.location.href = '/login';
}

// ============================================
// API Calls
// ============================================

async function apiCall(endpoint, options = {}) {
    const token = getToken();
    const headers = {
        'Content-Type': 'application/json',
        ...options.headers
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    try {
        const response = await fetch(`${API_URL}${endpoint}`, {
            ...options,
            headers
        });

        const data = await response.json();

        if (!response.ok) {
            if (response.status === 401) {
                removeToken();
                window.location.href = '/login';
            }
            throw new Error(data.message || 'API request failed');
        }

        return data;
    } catch (error) {
        console.error('API Error:', error);
        throw error;
    }
}

// ============================================
// Categories
// ============================================

async function loadCategories() {
    try {
        const response = await apiCall('/categories');
        return response.data;
    } catch (error) {
        console.error('Error loading categories:', error);
        return [];
    }
}

async function renderCategories(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div class="loading">Loading categories...</div>';

    const categories = await loadCategories();

    if (categories.length === 0) {
        container.innerHTML = '<p class="text-center">No categories available.</p>';
        return;
    }

    container.innerHTML = categories.map(cat => `
        <a href="/category/${cat.slug}" class="category-card">
            <div class="category-icon"><i class="${cat.icon || 'fas fa-folder'}"></i></div>
            <div class="category-name">${cat.name}</div>
            <div class="category-desc">${cat.description || ''}</div>
        </a>
    `).join('');
}

// ============================================
// Problems
// ============================================

async function loadProblems(params = {}) {
    try {
        const queryString = new URLSearchParams(params).toString();
        const endpoint = `/problems${queryString ? '?' + queryString : ''}`;
        const response = await apiCall(endpoint);
        return response.data;
    } catch (error) {
        console.error('Error loading problems:', error);
        return { problems: [], pagination: {} };
    }
}

async function renderProblems(containerId, params = {}) {
    const container = document.getElementById(containerId);
    if (!container) return;

    container.innerHTML = '<div class="loading">Loading problems...</div>';

    const data = await loadProblems(params);
    const problems = data.problems;

    if (problems.length === 0) {
        container.innerHTML = '<p class="text-center">No problems found.</p>';
        return;
    }

    container.innerHTML = problems.map(problem => `
        <div class="problem-card">
            <div class="problem-header">
                <div>
                    <h3 class="problem-title">
                        <a href="/problem/${problem.id}" style="text-decoration: none; color: inherit;">
                            ${problem.title}
                        </a>
                    </h3>
                    <div class="problem-meta">
                        <span>📁 ${problem.category_name}</span>
                        <span>👤 ${problem.username}</span>
                        <span>📅 ${new Date(problem.created_at).toLocaleDateString()}</span>
                    </div>
                </div>
            </div>
            <p class="problem-description">${truncateText(problem.description, 200)}</p>
            <div class="problem-footer">
                <div class="problem-stats">
                    <span>👁️ ${problem.views} views</span>
                    <span>❤️ ${problem.likes} likes</span>
                </div>
                <a href="/problem/${problem.id}" class="btn-outline">Read More</a>
            </div>
        </div>
    `).join('');
}

function truncateText(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

// ============================================
// Search
// ============================================

function initSearch() {
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    if (searchBtn) {
        searchBtn.addEventListener('click', performSearch);
    }

    if (searchInput) {
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                performSearch();
            }
        });
    }
}

function performSearch() {
    const searchInput = document.getElementById('search-input');
    const query = searchInput.value.trim();

    if (query) {
        renderProblems('problems-container', { search: query });
    } else {
        renderProblems('problems-container');
    }
}

// ============================================
// Navigation
// ============================================

function updateNavigation() {
    const user = getUser();
    const authLinks = document.getElementById('auth-links');

    if (!authLinks) return;

    if (user) {
        authLinks.innerHTML = `
            <li><a href="/submit-problem">Submit Problem</a></li>
            <li><a href="/my-problems">My Problems</a></li>
            ${user.role === 'admin' ? '<li><a href="/admin">Admin Panel</a></li>' : ''}
            <li><span style="color: var(--text-secondary);">Hello, ${user.username}</span></li>
            <li><button onclick="logout()" class="btn-primary">Logout</button></li>
        `;
    } else {
        authLinks.innerHTML = `
            <li><a href="/login" class="btn-primary">Login</a></li>
            <li><a href="/signup" class="btn-outline">Sign Up</a></li>
        `;
    }
}

// ============================================
// Form Handling
// ============================================

function showError(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

function hideError(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = '';
        element.style.display = 'none';
    }
}

function showSuccess(elementId, message) {
    const element = document.getElementById(elementId);
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
}

// ============================================
// Initialize
// ============================================

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    updateNavigation();
    initSearch();
});

// Make functions globally available
window.toggleTheme = toggleTheme;
window.logout = logout;
window.isAuthenticated = isAuthenticated;
window.isAdmin = isAdmin;
window.getUser = getUser;
window.setUser = setUser;
window.getToken = getToken;
window.setToken = setToken;
window.removeToken = removeToken;
window.apiCall = apiCall;
window.loadCategories = loadCategories;
window.renderCategories = renderCategories;
window.loadProblems = loadProblems;
window.renderProblems = renderProblems;
window.showError = showError;
window.hideError = hideError;
window.showSuccess = showSuccess;
