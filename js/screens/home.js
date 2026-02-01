import { getInsanityProgress, getStrongliftsStats, getAllFitTests, getProgramState, getActivitiesByDate, saveActivity, deleteActivity } from '../db.js';
import { navigate } from '../router.js';

const ACTIVITY_TYPES = {
    walk: { label: 'Walk', emoji: 'walk', category: 'cardio' },
    hike: { label: 'Hike', emoji: 'hike', category: 'cardio' },
    ruck: { label: 'Ruck', emoji: 'ruck', category: 'cardio' },
    peloton: { label: 'Peloton', emoji: 'peloton', category: 'cardio' },
    zone2: { label: 'Zone 2', emoji: 'zone2', category: 'cardio' },
    sauna: { label: 'Sauna', emoji: 'sauna', category: 'recovery' },
    ice_bath: { label: 'Ice Bath', emoji: 'ice_bath', category: 'recovery' }
};

export async function renderDayView(params) {
    // Get the date from params or default to today
    const dateStr = params?.date || new Date().toISOString().split('T')[0];
    const viewDate = new Date(dateStr + 'T12:00:00'); // Noon to avoid timezone issues
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const isToday = viewDate.toDateString() === today.toDateString();
    const isFuture = viewDate > today;

    const insanityProgress = await getInsanityProgress();
    const slStats = await getStrongliftsStats();
    const fitTests = await getAllFitTests();
    const insanityState = await getProgramState('insanity');
    const dayActivities = await getActivitiesByDate(dateStr);

    const insanityPercent = Math.round((insanityProgress.completed / insanityProgress.total) * 100);
    const nextFitTest = getNextFitTest(fitTests);

    const displayDate = formatDisplayDate(viewDate, isToday);

    const html = `
        <div class="screen">
            <!-- Date Header -->
            <div class="day-header">
                <h2>${displayDate}</h2>
                ${!isToday ? `<span class="day-badge ${isFuture ? 'future' : 'past'}">${isFuture ? 'Upcoming' : 'Past'}</span>` : ''}
            </div>

            <!-- Insanity Card -->
            <div class="card" id="insanity-card">
                <div class="card-header">
                    <div class="card-icon insanity">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/>
                        </svg>
                    </div>
                    <div>
                        <div class="card-title">BODI Insanity</div>
                        <div class="card-subtitle">60-Day Total Body Conditioning</div>
                    </div>
                </div>

                <div class="progress-bar">
                    <div class="progress-fill insanity" style="width: ${insanityPercent}%"></div>
                </div>

                <div class="stats-row">
                    <div class="stat-card">
                        <div class="stat-value">${insanityProgress.completed}</div>
                        <div class="stat-label">Workouts Done</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${insanityProgress.total - insanityProgress.completed}</div>
                        <div class="stat-label">Remaining</div>
                    </div>
                </div>

                ${nextFitTest ? `
                    <div style="margin-top: var(--space-md); padding: var(--space-md); background: var(--accent-insanity-dim); border-radius: var(--radius-md);">
                        <div style="font-weight: 600; color: var(--accent-insanity);">Next Fit Test: Day ${nextFitTest}</div>
                    </div>
                ` : ''}

                <button class="btn btn-primary btn-block" style="margin-top: var(--space-md);" id="goto-insanity">
                    ${insanityState ? 'Continue Program' : 'Start Program'}
                </button>
            </div>

            <!-- StrongLifts Card -->
            <div class="card" id="stronglifts-card">
                <div class="card-header">
                    <div class="card-icon stronglifts">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M6.5 6.5h11M6.5 17.5h11M4 6.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM4 12a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM20 6.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5zM20 12a2.5 2.5 0 100 5 2.5 2.5 0 000-5z"/>
                        </svg>
                    </div>
                    <div>
                        <div class="card-title">StrongLifts 5x5</div>
                        <div class="card-subtitle">Build Strength with Barbell Training</div>
                    </div>
                </div>

                <div class="stats-row">
                    <div class="stat-card">
                        <div class="stat-value">${slStats.completed}</div>
                        <div class="stat-label">Workouts Logged</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${getNextWorkoutType(slStats.completed)}</div>
                        <div class="stat-label">Next Workout</div>
                    </div>
                </div>

                ${Object.keys(slStats.currentWeights).length > 0 ? `
                    <div style="margin-top: var(--space-md); font-size: var(--font-size-sm); color: var(--text-secondary);">
                        Current weights: ${formatWeights(slStats.currentWeights)}
                    </div>
                ` : ''}

                <button class="btn btn-secondary btn-block" style="margin-top: var(--space-md); border: 2px solid var(--accent-stronglifts); color: var(--accent-stronglifts);" id="goto-stronglifts">
                    ${slStats.completed > 0 ? 'Continue Training' : 'Start Training'}
                </button>
            </div>

            <!-- Quick Actions for Programs -->
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: var(--space-md); margin-top: var(--space-md);">
                <button class="btn btn-secondary" id="quick-insanity-workout">
                    Log Insanity
                </button>
                <button class="btn btn-secondary" id="quick-stronglifts-workout">
                    Log Lifts
                </button>
            </div>

            <!-- Activities Quick-Log Section -->
            <div class="activities-section">
                <h3 class="section-title">Log Activity</h3>

                <div class="activity-grid">
                    <button class="activity-btn cardio" data-type="walk" data-category="cardio">
                        <span class="activity-icon">${getActivityIcon('walk')}</span>
                        <span>Walk</span>
                    </button>
                    <button class="activity-btn cardio" data-type="hike" data-category="cardio">
                        <span class="activity-icon">${getActivityIcon('hike')}</span>
                        <span>Hike</span>
                    </button>
                    <button class="activity-btn cardio" data-type="ruck" data-category="cardio">
                        <span class="activity-icon">${getActivityIcon('ruck')}</span>
                        <span>Ruck</span>
                    </button>
                    <button class="activity-btn cardio" data-type="peloton" data-category="cardio">
                        <span class="activity-icon">${getActivityIcon('peloton')}</span>
                        <span>Peloton</span>
                    </button>
                    <button class="activity-btn recovery" data-type="sauna" data-category="recovery">
                        <span class="activity-icon">${getActivityIcon('sauna')}</span>
                        <span>Sauna</span>
                    </button>
                    <button class="activity-btn recovery" data-type="ice_bath" data-category="recovery">
                        <span class="activity-icon">${getActivityIcon('ice_bath')}</span>
                        <span>Ice Bath</span>
                    </button>
                </div>
            </div>

            <!-- Day's Activity Log -->
            ${dayActivities.length > 0 ? `
                <div class="todays-log">
                    <h3 class="section-title">${isToday ? "Today's" : "Day's"} Log</h3>
                    <div class="activity-log-list">
                        ${dayActivities.map(activity => renderActivityCard(activity)).join('')}
                    </div>
                </div>
            ` : ''}
        </div>
    `;

    return {
        html,
        title: displayDate,
        showBack: true,
        backPath: '/',
        onMount: () => {
            document.getElementById('goto-insanity').addEventListener('click', () => navigate('/insanity'));
            document.getElementById('goto-stronglifts').addEventListener('click', () => navigate('/stronglifts'));
            document.getElementById('quick-insanity-workout').addEventListener('click', () => navigate('/insanity'));
            document.getElementById('quick-stronglifts-workout').addEventListener('click', () => navigate('/stronglifts'));

            // Activity quick-log buttons
            document.querySelectorAll('.activity-btn').forEach(btn => {
                btn.addEventListener('click', async () => {
                    const type = btn.dataset.type;
                    const category = btn.dataset.category;

                    // Recovery activities (sauna, ice_bath) are one-tap saves
                    if (category === 'recovery') {
                        await saveActivity({
                            date: dateStr,
                            type: type,
                            category: 'recovery'
                        });
                        // Refresh the page to show the new activity
                        const newContent = await renderDayView({ date: dateStr });
                        document.getElementById('main-content').innerHTML = newContent.html;
                        newContent.onMount();
                    } else {
                        // Cardio activities go to the form with date
                        navigate(`/log-activity/${type}?date=${dateStr}`);
                    }
                });
            });

            // Activity card click handlers for editing
            document.querySelectorAll('.activity-card').forEach(card => {
                card.addEventListener('click', () => {
                    const id = card.dataset.id;
                    const type = card.dataset.type;
                    navigate(`/log-activity/${type}/${id}`);
                });
            });
        }
    };
}

function getNextFitTest(fitTests) {
    const fitTestDays = [1, 15, 36, 50, 63];
    const completedTests = fitTests.map(t => t.testNumber);

    for (let i = 0; i < fitTestDays.length; i++) {
        if (!completedTests.includes(i + 1)) {
            return fitTestDays[i];
        }
    }
    return null;
}

function getNextWorkoutType(completedCount) {
    return completedCount % 2 === 0 ? 'A' : 'B';
}

function formatWeights(weights) {
    const exercises = Object.entries(weights);
    if (exercises.length === 0) return '';

    return exercises.slice(0, 3).map(([name, weight]) =>
        `${name.split(' ')[0]}: ${weight}lb`
    ).join(', ');
}

function renderActivityCard(activity) {
    const config = ACTIVITY_TYPES[activity.type] || { label: activity.type, emoji: '' };
    const isCardio = activity.category === 'cardio';

    let details = '';
    if (isCardio) {
        const parts = [];
        if (activity.duration) parts.push(`${activity.duration} min`);
        if (activity.distance) parts.push(`${activity.distance} mi`);
        if (activity.heartRateZone) parts.push(activity.heartRateZone.replace('zone', 'Z'));
        details = parts.join(' · ');
    } else {
        const time = new Date(activity.completedAt);
        details = time.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    }

    return `
        <div class="activity-card ${activity.category}" data-id="${activity.id}" data-type="${activity.type}">
            <div class="activity-card-icon ${activity.type}">
                ${getActivityIcon(activity.type)}
            </div>
            <div class="activity-card-content">
                <div class="activity-card-title">${config.label}</div>
                <div class="activity-card-details">${details}</div>
            </div>
            <div class="activity-card-check">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
                    <polyline points="20 6 9 17 4 12"/>
                </svg>
            </div>
        </div>
    `;
}

function getActivityIcon(type) {
    const icons = {
        walk: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="2"/><path d="M12 7v5l3 3M12 12l-3 3M9 21l2-5M15 21l-2-5"/></svg>',
        hike: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="5" r="2"/><path d="M12 7v4l3 2M12 11l-3 2M10 21l2-8M14 21l-2-8M4 14l4-3M20 14l-4-3"/></svg>',
        ruck: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="4" r="2"/><path d="M12 6v3M8 9h8v6a2 2 0 01-2 2h-4a2 2 0 01-2-2V9zM9 21l2-4M15 21l-2-4"/></svg>',
        peloton: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="5" cy="18" r="3"/><circle cx="19" cy="18" r="3"/><path d="M12 5a2 2 0 100-4 2 2 0 000 4zM12 5v4l4 4M12 9L8 13"/><path d="M5 18l7-9 7 9"/></svg>',
        zone2: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z"/></svg>',
        sauna: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 3v2M6 5l1 1M18 5l-1 1M4 12h2M18 12h2M7 19h10a2 2 0 002-2v-3a8 8 0 10-16 0v3a2 2 0 002 2z"/><path d="M9 14v2M12 14v2M15 14v2"/></svg>',
        ice_bath: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="4" y="8" width="16" height="12" rx="2"/><path d="M8 8V6a4 4 0 018 0v2"/><path d="M12 12l-1.5 2M12 12l1.5 2M8 14h8"/></svg>'
    };
    return icons[type] || '';
}

function formatDisplayDate(date, isToday) {
    if (isToday) return 'Today';

    const options = { weekday: 'short', month: 'short', day: 'numeric' };
    return date.toLocaleDateString('en-US', options);
}
