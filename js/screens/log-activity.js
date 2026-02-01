import { saveActivity, getActivity, updateActivity, deleteActivity } from '../db.js';
import { navigate, getRouteParams } from '../router.js';

const ACTIVITY_CONFIG = {
    walk: { label: 'Walk', icon: 'walk', category: 'cardio', hasDistance: true },
    hike: { label: 'Hike', icon: 'hike', category: 'cardio', hasDistance: true },
    ruck: { label: 'Ruck', icon: 'ruck', category: 'cardio', hasDistance: true },
    peloton: { label: 'Peloton', icon: 'peloton', category: 'cardio', hasDistance: false },
    zone2: { label: 'Zone 2', icon: 'zone2', category: 'cardio', hasDistance: false },
    sauna: { label: 'Sauna', icon: 'sauna', category: 'recovery', hasDistance: false },
    ice_bath: { label: 'Ice Bath', icon: 'ice_bath', category: 'recovery', hasDistance: false }
};

export async function renderLogActivity(params) {
    const activityType = params.type;
    const editId = params.id ? parseInt(params.id) : null;
    const config = ACTIVITY_CONFIG[activityType];

    if (!config) {
        return {
            html: '<div class="screen"><p>Unknown activity type</p></div>',
            title: 'Error'
        };
    }

    // If editing, load existing activity
    let existingActivity = null;
    if (editId) {
        existingActivity = await getActivity(editId);
    }

    const isCardio = config.category === 'cardio';

    // Get date from URL query params or use today
    const urlParams = new URLSearchParams(window.location.hash.split('?')[1] || '');
    const dateParam = urlParams.get('date');
    const activityDate = existingActivity?.date || dateParam || new Date().toISOString().split('T')[0];

    const html = `
        <div class="screen">
            <div class="card">
                <div class="activity-form-header">
                    <div class="activity-type-icon ${activityType}">
                        ${getActivityIcon(activityType)}
                    </div>
                    <h2>${editId ? 'Edit' : 'Log'} ${config.label}</h2>
                </div>

                <form id="activity-form" class="activity-form">
                    ${isCardio ? `
                        <div class="form-group">
                            <label>Duration (minutes)</label>
                            <div class="duration-input">
                                <button type="button" class="duration-btn" data-delta="-5">-5</button>
                                <input type="number" id="duration" name="duration"
                                       value="${existingActivity?.duration || 30}"
                                       min="1" max="300" required>
                                <button type="button" class="duration-btn" data-delta="5">+5</button>
                            </div>
                        </div>

                        ${config.hasDistance ? `
                            <div class="form-group">
                                <label>Distance (miles, optional)</label>
                                <input type="number" id="distance" name="distance"
                                       value="${existingActivity?.distance || ''}"
                                       step="0.1" min="0" max="100"
                                       placeholder="e.g., 3.5"
                                       class="form-input">
                            </div>
                        ` : ''}

                        <div class="form-group">
                            <label>Heart Rate Zone</label>
                            <div class="zone-selector">
                                <button type="button" class="zone-btn ${(!existingActivity?.heartRateZone || existingActivity?.heartRateZone === 'zone2') ? 'active' : ''}" data-zone="zone2">
                                    Zone 2
                                    <span class="zone-desc">Fat Burn</span>
                                </button>
                                <button type="button" class="zone-btn ${existingActivity?.heartRateZone === 'zone3' ? 'active' : ''}" data-zone="zone3">
                                    Zone 3
                                    <span class="zone-desc">Cardio</span>
                                </button>
                                <button type="button" class="zone-btn ${existingActivity?.heartRateZone === 'zone4' ? 'active' : ''}" data-zone="zone4">
                                    Zone 4
                                    <span class="zone-desc">Peak</span>
                                </button>
                            </div>
                            <input type="hidden" id="heartRateZone" name="heartRateZone" value="${existingActivity?.heartRateZone || 'zone2'}">
                        </div>

                        <div class="form-group">
                            <label>Notes (optional)</label>
                            <textarea id="notes" name="notes"
                                      placeholder="How did it feel? Any observations..."
                                      class="form-textarea"
                                      rows="3">${existingActivity?.notes || ''}</textarea>
                        </div>
                    ` : `
                        <div class="recovery-info">
                            <p>Tap save to log your ${config.label.toLowerCase()} session.</p>
                        </div>
                    `}

                    <div class="form-actions">
                        ${editId ? `
                            <button type="button" id="delete-btn" class="btn btn-danger">Delete</button>
                        ` : ''}
                        <button type="submit" class="btn btn-primary btn-block">
                            ${editId ? 'Update' : 'Save'} ${config.label}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    `;

    return {
        html,
        title: config.label,
        showBack: true,
        backPath: `/day/${activityDate}`,
        onMount: () => {
            const form = document.getElementById('activity-form');

            // Duration buttons
            document.querySelectorAll('.duration-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    const input = document.getElementById('duration');
                    const delta = parseInt(btn.dataset.delta);
                    const newValue = Math.max(1, Math.min(300, parseInt(input.value) + delta));
                    input.value = newValue;
                });
            });

            // Zone selector
            document.querySelectorAll('.zone-btn').forEach(btn => {
                btn.addEventListener('click', () => {
                    document.querySelectorAll('.zone-btn').forEach(b => b.classList.remove('active'));
                    btn.classList.add('active');
                    document.getElementById('heartRateZone').value = btn.dataset.zone;
                });
            });

            // Form submit
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const activity = {
                    date: activityDate,
                    type: activityType,
                    category: config.category
                };

                if (isCardio) {
                    activity.duration = parseInt(document.getElementById('duration').value);

                    const distanceInput = document.getElementById('distance');
                    if (distanceInput && distanceInput.value) {
                        activity.distance = parseFloat(distanceInput.value);
                    }

                    activity.heartRateZone = document.getElementById('heartRateZone').value;
                    activity.notes = document.getElementById('notes').value.trim();
                }

                if (editId) {
                    activity.id = editId;
                    activity.completedAt = existingActivity.completedAt;
                    await updateActivity(activity);
                } else {
                    await saveActivity(activity);
                }

                navigate(`/day/${activityDate}`);
            });

            // Delete button
            const deleteBtn = document.getElementById('delete-btn');
            if (deleteBtn) {
                deleteBtn.addEventListener('click', async () => {
                    if (confirm('Delete this activity?')) {
                        await deleteActivity(editId);
                        navigate(`/day/${activityDate}`);
                    }
                });
            }
        }
    };
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
