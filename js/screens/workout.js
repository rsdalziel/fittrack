import { saveStrongliftsWorkout, getLastStrongliftsWorkout, getAllStrongliftsWorkouts, getSetting } from '../db.js';
import { navigate } from '../router.js';

// Starting weights (in lbs)
const DEFAULT_WEIGHTS = {
    'Squat': 45,
    'Bench Press': 45,
    'Barbell Row': 65,
    'Overhead Press': 45,
    'Deadlift': 95
};

const WORKOUT_A = ['Squat', 'Bench Press', 'Barbell Row'];
const WORKOUT_B = ['Squat', 'Overhead Press', 'Deadlift'];

export async function renderWorkout(params) {
    const workoutType = params.type.toUpperCase();
    const exercises = workoutType === 'A' ? WORKOUT_A : WORKOUT_B;
    const unit = await getSetting('weightUnit') || 'lbs';

    // Get weights from last workout or defaults
    const weights = await getCurrentWeights();

    // Build initial workout state
    const workoutState = {
        date: new Date().toISOString().split('T')[0],
        workoutType,
        exercises: exercises.map(name => ({
            name,
            weight: weights[name] || DEFAULT_WEIGHTS[name],
            sets: Array(name === 'Deadlift' ? 1 : 5).fill().map(() => ({
                targetReps: 5,
                completedReps: null,
                completed: false
            }))
        })),
        completed: false,
        startedAt: Date.now()
    };

    const html = `
        <div class="screen" id="workout-screen">
            <div style="text-align: center; margin-bottom: var(--space-lg);">
                <div class="workout-badge ${workoutType.toLowerCase()}" style="font-size: var(--font-size-lg); padding: var(--space-sm) var(--space-lg);">
                    Workout ${workoutType}
                </div>
            </div>

            <div id="exercises-container">
                ${workoutState.exercises.map((ex, exIndex) => renderExercise(ex, exIndex, unit)).join('')}
            </div>

            <button class="btn btn-success btn-block btn-lg" id="finish-workout-btn" style="margin-top: var(--space-lg);" disabled>
                Complete Workout
            </button>

            <button class="btn btn-secondary btn-block" id="cancel-workout-btn" style="margin-top: var(--space-md);">
                Cancel
            </button>
        </div>
    `;

    return {
        html,
        title: `Workout ${workoutType}`,
        showBack: true,
        backPath: '/stronglifts',
        onMount: () => {
            let state = workoutState;

            // Set button handlers
            document.querySelectorAll('.set-btn').forEach(btn => {
                btn.addEventListener('click', () => handleSetClick(btn, state, unit));
            });

            // Weight adjustment
            document.querySelectorAll('.weight-minus').forEach(btn => {
                btn.addEventListener('click', () => adjustWeight(btn, state, -5, unit));
            });

            document.querySelectorAll('.weight-plus').forEach(btn => {
                btn.addEventListener('click', () => adjustWeight(btn, state, 5, unit));
            });

            // Finish button
            document.getElementById('finish-workout-btn').addEventListener('click', async () => {
                state.completed = true;
                state.completedAt = Date.now();

                // Calculate if weights should increase
                const updatedExercises = state.exercises.map(ex => {
                    const allSetsCompleted = ex.sets.every(s => s.completed && s.completedReps >= 5);
                    return {
                        ...ex,
                        shouldIncrease: allSetsCompleted
                    };
                });

                state.exercises = updatedExercises;
                await saveStrongliftsWorkout(state);

                showCompletionScreen(state, unit);
            });

            // Cancel button
            document.getElementById('cancel-workout-btn').addEventListener('click', () => {
                if (confirm('Are you sure you want to cancel this workout?')) {
                    navigate('/stronglifts');
                }
            });
        }
    };
}

function renderExercise(exercise, exIndex, unit) {
    const setCount = exercise.sets.length;
    const isDeadlift = exercise.name === 'Deadlift';

    return `
        <div class="exercise-row" data-exercise="${exIndex}">
            <div class="exercise-header">
                <div>
                    <div class="exercise-name">${exercise.name}</div>
                    <div class="exercise-weight">${isDeadlift ? '1×5' : '5×5'}</div>
                </div>
                <div class="weight-adjust">
                    <button class="btn btn-secondary weight-minus" data-exercise="${exIndex}" style="padding: var(--space-sm);">−5</button>
                    <span class="current-weight" style="min-width: 70px; text-align: center; font-weight: 600;">
                        ${exercise.weight} ${unit}
                    </span>
                    <button class="btn btn-secondary weight-plus" data-exercise="${exIndex}" style="padding: var(--space-sm);">+5</button>
                </div>
            </div>
            <div class="sets-row">
                ${exercise.sets.map((set, setIndex) => `
                    <button class="set-btn" data-exercise="${exIndex}" data-set="${setIndex}">
                        <span class="set-num">Set ${setIndex + 1}</span>
                        <span class="reps">${set.targetReps}</span>
                    </button>
                `).join('')}
            </div>
        </div>
    `;
}

function handleSetClick(btn, state, unit) {
    const exIndex = parseInt(btn.dataset.exercise);
    const setIndex = parseInt(btn.dataset.set);
    const set = state.exercises[exIndex].sets[setIndex];

    if (!set.completed) {
        // First click - mark as completed with target reps
        set.completed = true;
        set.completedReps = set.targetReps;
        btn.classList.add('completed');
        btn.querySelector('.reps').textContent = '✓';
    } else if (set.completedReps === set.targetReps) {
        // Second click - show rep picker
        showRepPicker(btn, set, state);
    } else {
        // Third click - reset
        set.completed = false;
        set.completedReps = null;
        btn.classList.remove('completed', 'failed');
        btn.querySelector('.reps').textContent = set.targetReps;
    }

    updateFinishButton(state);
}

function showRepPicker(btn, set, state) {
    const currentReps = set.completedReps;

    // Create modal content
    const modalHtml = `
        <div class="modal-title">Completed Reps</div>
        <div style="display: flex; flex-wrap: wrap; gap: var(--space-sm); justify-content: center;">
            ${[0, 1, 2, 3, 4, 5].map(reps => `
                <button class="btn ${reps === currentReps ? 'btn-success' : 'btn-secondary'} rep-option"
                        data-reps="${reps}"
                        style="width: 56px; height: 56px; font-size: var(--font-size-lg);">
                    ${reps}
                </button>
            `).join('')}
        </div>
    `;

    const modal = document.getElementById('modal-overlay');
    const modalContent = document.getElementById('modal-content');
    modalContent.innerHTML = modalHtml;
    modal.classList.remove('hidden');

    // Handle rep selection
    modalContent.querySelectorAll('.rep-option').forEach(option => {
        option.addEventListener('click', () => {
            const reps = parseInt(option.dataset.reps);
            set.completedReps = reps;
            set.completed = reps > 0;

            if (reps < 5) {
                btn.classList.remove('completed');
                btn.classList.add('failed');
                btn.querySelector('.reps').textContent = reps;
            } else {
                btn.classList.remove('failed');
                btn.classList.add('completed');
                btn.querySelector('.reps').textContent = '✓';
            }

            modal.classList.add('hidden');
            updateFinishButton(state);
        });
    });

    // Close on overlay click
    modal.addEventListener('click', (e) => {
        if (e.target === modal) {
            modal.classList.add('hidden');
        }
    });
}

function adjustWeight(btn, state, delta, unit) {
    const exIndex = parseInt(btn.dataset.exercise);
    const exercise = state.exercises[exIndex];
    exercise.weight = Math.max(0, exercise.weight + delta);

    const row = btn.closest('.exercise-row');
    row.querySelector('.current-weight').textContent = `${exercise.weight} ${unit}`;
}

function updateFinishButton(state) {
    const allSetsAttempted = state.exercises.every(ex =>
        ex.sets.every(s => s.completed || s.completedReps !== null)
    );

    const finishBtn = document.getElementById('finish-workout-btn');
    finishBtn.disabled = !allSetsAttempted;
}

async function getCurrentWeights() {
    const workouts = await getAllStrongliftsWorkouts();
    const weights = { ...DEFAULT_WEIGHTS };

    if (workouts.length === 0) return weights;

    // Get the most recent completed workout for each exercise
    const sortedWorkouts = workouts
        .filter(w => w.completed)
        .sort((a, b) => new Date(b.date) - new Date(a.date));

    for (const workout of sortedWorkouts) {
        for (const ex of workout.exercises) {
            if (weights[ex.name] === DEFAULT_WEIGHTS[ex.name]) {
                // Use last workout weight, add 5 if all sets were completed
                const allCompleted = ex.sets.every(s => s.completed && s.completedReps >= 5);
                weights[ex.name] = allCompleted ? ex.weight + 5 : ex.weight;
            }
        }
    }

    return weights;
}

function showCompletionScreen(state, unit) {
    const mainContent = document.getElementById('main-content');

    const exerciseSummary = state.exercises.map(ex => {
        const completedSets = ex.sets.filter(s => s.completed && s.completedReps >= 5).length;
        const totalSets = ex.sets.length;
        const allCompleted = completedSets === totalSets;

        return `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: var(--space-md); background: var(--bg-elevated); border-radius: var(--radius-sm); margin-bottom: var(--space-sm);">
                <span>${ex.name}</span>
                <span>
                    ${ex.weight} ${unit}
                    ${allCompleted ?
                        `<span style="color: var(--accent-success); margin-left: var(--space-sm);">→ ${ex.weight + 5} ${unit}</span>` :
                        '<span style="color: var(--text-muted); margin-left: var(--space-sm);">same</span>'
                    }
                </span>
            </div>
        `;
    }).join('');

    mainContent.innerHTML = `
        <div class="screen">
            <div class="workout-complete-banner">
                <h2>Workout Complete!</h2>
                <p>Great work on Workout ${state.workoutType}</p>
            </div>

            <div class="card">
                <h3 style="margin-bottom: var(--space-md);">Summary</h3>
                ${exerciseSummary}
            </div>

            <button class="btn btn-primary btn-block btn-lg" onclick="location.hash='/stronglifts'" style="margin-top: var(--space-lg);">
                Back to StrongLifts
            </button>
        </div>
    `;
}
