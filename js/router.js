// Simple hash-based router

const routes = {};
let currentScreen = null;

export function registerRoute(path, handler) {
    routes[path] = handler;
}

export function navigate(path) {
    window.location.hash = path;
}

export function getCurrentPath() {
    const hash = window.location.hash.slice(1) || '/';
    // Strip query string for route matching
    return hash.split('?')[0];
}

export function getRouteParams() {
    const path = getCurrentPath();
    const parts = path.split('/').filter(Boolean);
    return parts;
}

async function handleRoute() {
    const path = getCurrentPath();
    const mainContent = document.getElementById('main-content');
    const pageTitle = document.getElementById('page-title');
    const backBtn = document.getElementById('back-btn');

    // Find matching route
    let handler = null;
    let params = {};

    // Check for exact match first
    if (routes[path]) {
        handler = routes[path];
    } else {
        // Check for parameterized routes
        for (const [routePath, routeHandler] of Object.entries(routes)) {
            if (routePath.includes(':')) {
                const routeParts = routePath.split('/');
                const pathParts = path.split('/');

                if (routeParts.length === pathParts.length) {
                    let match = true;
                    const extractedParams = {};

                    for (let i = 0; i < routeParts.length; i++) {
                        if (routeParts[i].startsWith(':')) {
                            extractedParams[routeParts[i].slice(1)] = pathParts[i];
                        } else if (routeParts[i] !== pathParts[i]) {
                            match = false;
                            break;
                        }
                    }

                    if (match) {
                        handler = routeHandler;
                        params = extractedParams;
                        break;
                    }
                }
            }
        }
    }

    if (!handler) {
        handler = routes['/'] || (() => '<div class="screen"><p>Page not found</p></div>');
    }

    // Call handler to get screen content and config
    const result = await handler(params);

    // Handle both simple HTML string and object with config
    if (typeof result === 'string') {
        mainContent.innerHTML = result;
        pageTitle.textContent = 'FitTrack';
        backBtn.classList.add('hidden');
    } else {
        mainContent.innerHTML = result.html;
        pageTitle.textContent = result.title || 'FitTrack';

        if (result.showBack) {
            backBtn.classList.remove('hidden');
            backBtn.onclick = () => navigate(result.backPath || '/');
        } else {
            backBtn.classList.add('hidden');
        }

        // Call onMount if provided
        if (result.onMount) {
            result.onMount();
        }
    }

    // Update nav active state
    updateNavState(path);

    currentScreen = path;
}

function updateNavState(path) {
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.classList.remove('active');
        const screen = item.dataset.screen;

        if (screen === 'home' && (path === '/' || path.startsWith('/day/'))) {
            item.classList.add('active');
        } else if (screen === 'insanity' && path.includes('insanity')) {
            item.classList.add('active');
        } else if (screen === 'stronglifts' && (path.includes('stronglifts') || path.includes('workout'))) {
            item.classList.add('active');
        } else if (screen === 'settings' && path.includes('settings')) {
            item.classList.add('active');
        }
    });
}

export function initRouter() {
    // Handle hash changes
    window.addEventListener('hashchange', handleRoute);

    // Handle initial route
    if (!window.location.hash) {
        window.location.hash = '/';
    } else {
        handleRoute();
    }
}
