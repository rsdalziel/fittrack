import { getAllActivities, getAllInsanityWorkouts, getProgramState } from '../db.js';
import { navigate } from '../router.js';

export async function renderCalendar() {
    const today = new Date();
    const currentDay = today.getDate();
    const currentMonth = today.getMonth();
    const currentYear = today.getFullYear();

    const dayOfWeek = today.toLocaleDateString('en-US', { weekday: 'long' }).toUpperCase();
    const fullDate = today.toLocaleDateString('en-US', { day: '2-digit', month: 'long', year: 'numeric' });

    // Pre-render the month grid
    const monthGridHtml = await renderMonth(currentYear, currentMonth, today);

    const html = `
        <div class="calendar-split">
            <div class="calendar-left">
                <div class="big-day">${String(currentDay).padStart(2, '0')}</div>
                <div class="day-label">${dayOfWeek}</div>
                <div class="date-label">${fullDate}</div>
            </div>
            <div class="calendar-right">
                <div class="month-nav-row">
                    <span class="month-year-label" id="month-title">${formatMonthYear(currentMonth, currentYear)}</span>
                    <div class="month-arrows">
                        <button class="arrow-btn" id="prev-month">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M15 18l-6-6 6-6"/>
                            </svg>
                        </button>
                        <button class="arrow-btn" id="next-month">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <path d="M9 18l6-6-6-6"/>
                            </svg>
                        </button>
                    </div>
                </div>

                <div class="weekday-row">
                    <span>M</span>
                    <span>T</span>
                    <span>W</span>
                    <span>T</span>
                    <span>F</span>
                    <span>S</span>
                    <span>S</span>
                </div>

                <div id="calendar-grid" class="days-grid">
                    ${monthGridHtml}
                </div>
            </div>
        </div>
    `;

    return {
        html,
        title: 'FitTrack',
        onMount: () => {
            let displayMonth = currentMonth;
            let displayYear = currentYear;

            // Day click handlers
            attachDayClickHandlers();

            // Month navigation
            document.getElementById('prev-month').addEventListener('click', async () => {
                displayMonth--;
                if (displayMonth < 0) {
                    displayMonth = 11;
                    displayYear--;
                }
                await updateCalendar(displayYear, displayMonth, today);
            });

            document.getElementById('next-month').addEventListener('click', async () => {
                displayMonth++;
                if (displayMonth > 11) {
                    displayMonth = 0;
                    displayYear++;
                }
                await updateCalendar(displayYear, displayMonth, today);
            });
        }
    };
}

function attachDayClickHandlers() {
    document.querySelectorAll('.day-cell:not(.empty)').forEach(el => {
        el.addEventListener('click', () => {
            const date = el.dataset.date;
            if (date) navigate(`/day/${date}`);
        });
    });
}

async function updateCalendar(year, month, today) {
    document.getElementById('month-title').textContent = formatMonthYear(month, year);
    document.getElementById('calendar-grid').innerHTML = await renderMonth(year, month, today);
    attachDayClickHandlers();
}

async function renderMonth(year, month, today) {
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const daysInMonth = lastDay.getDate();

    // Get day of week (0=Sun, adjust so Mon=0)
    let startDayOfWeek = firstDay.getDay() - 1;
    if (startDayOfWeek < 0) startDayOfWeek = 6;

    // Get activities for this month
    const activitiesByDate = await getMonthActivities(year, month);
    const insanityByDate = await getMonthInsanity(year, month);

    let html = '';

    // Empty cells for days before the 1st
    for (let i = 0; i < startDayOfWeek; i++) {
        html += '<div class="day-cell empty"></div>';
    }

    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const date = new Date(year, month, day);
        const dateStr = formatDateStr(date);
        const isToday = date.toDateString() === today.toDateString();
        const dayOfWeek = date.getDay(); // 0=Sun, 6=Sat
        const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
        const hasActivities = activitiesByDate[dateStr]?.length > 0;
        const hasInsanity = insanityByDate[dateStr];

        const classes = ['day-cell'];
        if (isToday) classes.push('today');
        if (isWeekend) classes.push('weekend');
        if (hasActivities) classes.push('has-activity');
        if (hasInsanity) classes.push('has-insanity');

        html += `
            <div class="${classes.join(' ')}" data-date="${dateStr}">
                <span>${day}</span>
            </div>
        `;
    }

    return html;
}

async function getMonthActivities(year, month) {
    const activities = await getAllActivities();
    const byDate = {};

    activities.forEach(a => {
        const actDate = new Date(a.date);
        if (actDate.getFullYear() === year && actDate.getMonth() === month) {
            if (!byDate[a.date]) byDate[a.date] = [];
            byDate[a.date].push(a);
        }
    });

    return byDate;
}

async function getMonthInsanity(year, month) {
    const workouts = await getAllInsanityWorkouts();
    const programState = await getProgramState('insanity');
    const byDate = {};

    if (!programState?.startDate) return byDate;

    const startDate = new Date(programState.startDate);

    workouts.forEach(w => {
        if (w.completed) {
            const workoutDate = new Date(startDate);
            workoutDate.setDate(workoutDate.getDate() + w.day - 1);

            if (workoutDate.getFullYear() === year && workoutDate.getMonth() === month) {
                const dateStr = formatDateStr(workoutDate);
                byDate[dateStr] = true;
            }
        }
    });

    return byDate;
}

function formatMonthYear(month, year) {
    const months = ['JANUARY', 'FEBRUARY', 'MARCH', 'APRIL', 'MAY', 'JUNE',
                    'JULY', 'AUGUST', 'SEPTEMBER', 'OCTOBER', 'NOVEMBER', 'DECEMBER'];
    return `${months[month]} ${year}`;
}

function formatDateStr(date) {
    return date.toISOString().split('T')[0];
}
