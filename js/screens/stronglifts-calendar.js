import { getAllStrongliftsWorkouts, getLastStrongliftsWorkout, getSetting } from '../db.js';
import { navigate } from '../router.js';

export async function renderStrongliftsCalendar() {
    const workouts = await getAllStrongliftsWorkouts();
    const lastWorkout = await getLastStrongliftsWorkout();
    const unit = await getSetting('weightUnit') || 'lbs';

    // Determine next workout type
    const completedCount = workouts.filter(w => w.completed).length;
    const nextType = completedCount % 2 === 0 ? 'A' : 'B';

    // Group workouts by month for display
    const workoutsByDate = new Map();
    workouts.forEach(w => {
        workoutsByDate.set(w.date, w);
    });

    // Generate calendar for current and past months
    const today = new Date();
    const months = getRecentMonths(3);

    const html = `
        <div class="screen">
            <!-- Next Workout Card -->
            <div class="card" style="text-align: center;">
                <div style="font-size: var(--font-size-sm); color: var(--text-secondary); margin-bottom: var(--space-sm);">
                    Next Workout
                </div>
                <div style="font-size: var(--font-size-xxl); font-weight: 700; color: var(--accent-stronglifts);">
                    Workout ${nextType}
                </div>
                <div style="font-size: var(--font-size-sm); color: var(--text-secondary); margin-top: var(--space-sm);">
                    ${getWorkoutDescription(nextType)}
                </div>
                <button class="btn btn-primary btn-block" id="start-workout-btn"
                        style="margin-top: var(--space-lg);">
                    Start Workout ${nextType}
                </button>
            </div>

            <!-- Stats -->
            <div class="stats-row">
                <div class="stat-card">
                    <div class="stat-value">${completedCount}</div>
                    <div class="stat-label">Total Workouts</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value">${getStreak(workouts)}</div>
                    <div class="stat-label">Week Streak</div>
                </div>
            </div>

            <!-- Current Weights -->
            ${lastWorkout ? renderCurrentWeights(lastWorkout, unit) : ''}

            <!-- Calendar View -->
            <div style="margin-top: var(--space-lg);">
                <h3 style="font-size: var(--font-size-md); margin-bottom: var(--space-md);">Workout History</h3>
                ${months.map(month => renderMonth(month, workoutsByDate, today)).join('')}
            </div>
        </div>
    `;

    return {
        html,
        title: 'StrongLifts',
        onMount: () => {
            document.getElementById('start-workout-btn')?.addEventListener('click', () => {
                navigate(`/workout/${nextType}`);
            });

            // Calendar day clicks to view past workouts
            document.querySelectorAll('.calendar-day.completed[data-date]').forEach(el => {
                el.addEventListener('click', () => {
                    const date = el.dataset.date;
                    navigate(`/workout-view/${date}`);
                });
            });
        }
    };
}

function getWorkoutDescription(type) {
    if (type === 'A') {
        return 'Squat • Bench Press • Barbell Row';
    } else {
        return 'Squat • Overhead Press • Deadlift';
    }
}

function renderCurrentWeights(lastWorkout, unit) {
    return `
        <div class="card" style="margin-top: var(--space-md);">
            <h3 style="font-size: var(--font-size-md); margin-bottom: var(--space-md);">Current Weights</h3>
            <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--space-md);">
                ${lastWorkout.exercises.map(ex => `
                    <div style="text-align: center; padding: var(--space-sm); background: var(--bg-elevated); border-radius: var(--radius-sm);">
                        <div style="font-size: var(--font-size-xs); color: var(--text-secondary);">${ex.name}</div>
                        <div style="font-size: var(--font-size-lg); font-weight: 600;">${ex.weight} ${unit}</div>
                    </div>
                `).join('')}
            </div>
        </div>
    `;
}

function getRecentMonths(count) {
    const months = [];
    const today = new Date();

    for (let i = 0; i < count; i++) {
        const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
        months.push(date);
    }

    return months;
}

function renderMonth(monthDate, workoutsByDate, today) {
    const year = monthDate.getFullYear();
    const month = monthDate.getMonth();
    const monthName = monthDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const days = [];

    // Empty cells for days before start of month
    for (let i = 0; i < firstDay; i++) {
        days.push('<div class="calendar-day" style="opacity: 0;"></div>');
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const workout = workoutsByDate.get(date);
        const isToday = today.toISOString().split('T')[0] === date;

        let classes = 'calendar-day';
        let content = day;

        if (workout?.completed) {
            classes += ' completed';
            content = `<span>${day}</span><span class="workout-badge ${workout.workoutType.toLowerCase()}">${workout.workoutType}</span>`;
        } else {
            content = `<span>${day}</span>`;
        }

        if (isToday) {
            classes += ' today';
        }

        days.push(`
            <div class="${classes}" data-date="${date}" style="height: 52px;">
                ${content}
            </div>
        `);
    }

    return `
        <div style="margin-bottom: var(--space-lg);">
            <div class="week-label">${monthName}</div>
            <div class="calendar-header">
                <span>S</span><span>M</span><span>T</span><span>W</span><span>T</span><span>F</span><span>S</span>
            </div>
            <div class="calendar-grid">
                ${days.join('')}
            </div>
        </div>
    `;
}

function getStreak(workouts) {
    if (workouts.length === 0) return 0;

    // Count consecutive weeks with at least one workout
    const sortedWorkouts = workouts
        .filter(w => w.completed)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    if (sortedWorkouts.length === 0) return 0;

    let streak = 1;
    const now = new Date();
    const lastWorkoutDate = new Date(sortedWorkouts[0].date);

    // Check if last workout was within past week
    const daysSinceLastWorkout = Math.floor((now - lastWorkoutDate) / (1000 * 60 * 60 * 24));
    if (daysSinceLastWorkout > 7) return 0;

    // Count consecutive weeks
    for (let i = 1; i < sortedWorkouts.length; i++) {
        const prevDate = new Date(sortedWorkouts[i - 1].date);
        const currDate = new Date(sortedWorkouts[i].date);
        const daysBetween = Math.floor((prevDate - currDate) / (1000 * 60 * 60 * 24));

        if (daysBetween <= 7) {
            streak++;
        } else {
            break;
        }
    }

    return Math.ceil(streak / 3); // Roughly 3 workouts per week
}
