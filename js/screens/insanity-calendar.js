import { getAllInsanityWorkouts, toggleInsanityWorkout, getProgramState, saveProgramState } from '../db.js';
import { navigate } from '../router.js';

let schedule = null;

async function loadSchedule() {
    if (!schedule) {
        const response = await fetch('./data/insanity-schedule.json');
        schedule = await response.json();
    }
    return schedule;
}

export async function renderInsanityCalendar() {
    const scheduleData = await loadSchedule();
    const workouts = await getAllInsanityWorkouts();
    const programState = await getProgramState('insanity');

    const completedMap = new Map();
    workouts.forEach(w => completedMap.set(w.day, w.completed));

    const html = `
        <div class="screen">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: var(--space-md);">
                <h2 style="font-size: var(--font-size-lg);">60-Day Program</h2>
                <button class="btn btn-secondary" id="fit-test-progress-btn" style="padding: var(--space-sm) var(--space-md);">
                    Fit Tests
                </button>
            </div>

            ${!programState ? `
                <div class="card" style="text-align: center; margin-bottom: var(--space-lg);">
                    <p style="margin-bottom: var(--space-md); color: var(--text-secondary);">Ready to begin your transformation?</p>
                    <button class="btn btn-primary btn-lg" id="start-program-btn">Start Day 1</button>
                </div>
            ` : ''}

            <div id="calendar-container">
                ${scheduleData.weeks.map(week => renderWeek(week, completedMap, programState)).join('')}
            </div>
        </div>
    `;

    return {
        html,
        title: 'Insanity',
        onMount: () => {
            // Day click handlers
            document.querySelectorAll('.calendar-day[data-day]').forEach(el => {
                el.addEventListener('click', async () => {
                    const day = parseInt(el.dataset.day);
                    const workoutName = el.dataset.workout;
                    const isFitTest = el.dataset.fitTest === 'true';
                    const isRest = el.dataset.rest === 'true';

                    if (isRest) return;

                    if (isFitTest) {
                        navigate(`/fit-test/${day}`);
                    } else {
                        await toggleInsanityWorkout(day, workoutName);
                        // Refresh the calendar
                        const newContent = await renderInsanityCalendar();
                        document.getElementById('main-content').innerHTML = newContent.html;
                        newContent.onMount();
                    }
                });
            });

            // Start program button
            const startBtn = document.getElementById('start-program-btn');
            if (startBtn) {
                startBtn.addEventListener('click', async () => {
                    await saveProgramState({
                        program: 'insanity',
                        startDate: new Date().toISOString(),
                        currentDay: 1
                    });
                    navigate('/fit-test/1');
                });
            }

            // Fit test progress button
            document.getElementById('fit-test-progress-btn')?.addEventListener('click', () => {
                navigate('/fit-test-progress');
            });
        }
    };
}

function renderWeek(week, completedMap, programState) {
    return `
        <div class="week-section" style="margin-bottom: var(--space-lg);">
            <div class="week-label">Week ${week.week}</div>
            <div class="calendar-grid">
                ${week.days.map(day => renderDay(day, completedMap.get(day.day), programState)).join('')}
            </div>
        </div>
    `;
}

function renderDay(day, isCompleted, programState) {
    const classes = ['calendar-day'];

    // Calculate if this day is missed (in the past, not completed, not a rest day)
    const isMissed = !isCompleted && !day.rest && isDayInPast(day.day, programState);
    const isToday = isDayToday(day.day, programState);

    if (isCompleted) classes.push('completed');
    if (day.rest) classes.push('rest');
    if (day.fitTest && !isCompleted) classes.push('fit-test');
    if (isMissed) classes.push('missed');
    if (isToday) classes.push('today');

    const shortName = getShortName(day.workout);

    return `
        <div class="${classes.join(' ')}"
             data-day="${day.day}"
             data-workout="${day.workout}"
             data-fit-test="${day.fitTest || false}"
             data-rest="${day.rest || false}">
            <span>${day.day}</span>
            <span class="workout-name">${shortName}</span>
        </div>
    `;
}

function isDayInPast(dayNumber, programState) {
    if (!programState || !programState.startDate) return false;

    const startDate = new Date(programState.startDate);
    startDate.setHours(0, 0, 0, 0);

    // Calculate the date for this day in the program
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + dayNumber - 1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return dayDate < today;
}

function isDayToday(dayNumber, programState) {
    if (!programState || !programState.startDate) return false;

    const startDate = new Date(programState.startDate);
    startDate.setHours(0, 0, 0, 0);

    // Calculate the date for this day in the program
    const dayDate = new Date(startDate);
    dayDate.setDate(dayDate.getDate() + dayNumber - 1);

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    return dayDate.getTime() === today.getTime();
}

function getShortName(workout) {
    const shortNames = {
        'Fit Test': 'FIT',
        'Fit Test (Final)': 'FIT',
        'Plyometric Cardio Circuit': 'Plyo',
        'Cardio Power & Resistance': 'Pwr',
        'Cardio Recovery': 'Rec',
        'Pure Cardio': 'Pure',
        'Pure Cardio & Cardio Abs': 'Pure+',
        'Core Cardio & Balance': 'Core',
        'Max Interval Circuit': 'MIC',
        'Max Interval Plyo': 'MIP',
        'Max Cardio Conditioning': 'MCC',
        'Max Cardio Conditioning & Cardio Abs': 'MCC+',
        'Max Recovery': 'MRec',
        'Rest': 'REST'
    };
    return shortNames[workout] || workout.substring(0, 4);
}
