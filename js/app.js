// Main App Entry Point
import { initDB } from './db.js';
import { initRouter, registerRoute } from './router.js';
import { renderCalendar } from './screens/calendar.js';
import { renderDayView } from './screens/home.js';
import { renderInsanityCalendar } from './screens/insanity-calendar.js';
import { renderFitTest } from './screens/fit-test.js';
import { renderFitTestProgress } from './screens/fit-test-progress.js';
import { renderStrongliftsCalendar } from './screens/stronglifts-calendar.js';
import { renderWorkout } from './screens/workout.js';
import { renderSettings } from './screens/settings.js';
import { renderLogActivity } from './screens/log-activity.js';

// Initialize the app
async function init() {
    try {
        // Initialize IndexedDB
        await initDB();
        console.log('Database initialized');

        // Register routes
        registerRoute('/', renderCalendar);
        registerRoute('/day/:date', renderDayView);
        registerRoute('/insanity', renderInsanityCalendar);
        registerRoute('/fit-test/:day', renderFitTest);
        registerRoute('/fit-test-progress', renderFitTestProgress);
        registerRoute('/stronglifts', renderStrongliftsCalendar);
        registerRoute('/workout/:type', renderWorkout);
        registerRoute('/settings', renderSettings);
        registerRoute('/log-activity/:type', renderLogActivity);
        registerRoute('/log-activity/:type/:id', renderLogActivity);

        // Initialize router (will render initial route)
        initRouter();

        // Register service worker
        if ('serviceWorker' in navigator) {
            try {
                const registration = await navigator.serviceWorker.register('./sw.js');
                console.log('Service Worker registered:', registration.scope);
            } catch (error) {
                console.log('Service Worker registration failed:', error);
            }
        }

        // Handle PWA install prompt
        let deferredPrompt;
        window.addEventListener('beforeinstallprompt', (e) => {
            e.preventDefault();
            deferredPrompt = e;

            // Could show a custom install button here
            console.log('PWA install prompt available');
        });

        // Log when PWA is installed
        window.addEventListener('appinstalled', () => {
            console.log('PWA installed successfully');
            deferredPrompt = null;
        });

    } catch (error) {
        console.error('Failed to initialize app:', error);
        document.getElementById('main-content').innerHTML = `
            <div class="screen" style="text-align: center; padding-top: 100px;">
                <h2>Failed to load app</h2>
                <p style="color: var(--text-secondary); margin-top: var(--space-md);">
                    ${error.message}
                </p>
                <button class="btn btn-primary" onclick="location.reload()" style="margin-top: var(--space-lg);">
                    Retry
                </button>
            </div>
        `;
    }
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}
