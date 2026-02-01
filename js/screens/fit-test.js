import { getFitTest, saveFitTest, markInsanityWorkoutComplete } from '../db.js';
import { navigate } from '../router.js';

const FIT_TEST_EXERCISES = [
    'Switch Kicks',
    'Power Jacks',
    'Power Knees',
    'Power Jumps',
    'Globe Jumps',
    'Suicide Jumps',
    'Push-Up Jacks',
    'Low Plank Oblique'
];

const FIT_TEST_DAYS = [1, 15, 36, 50, 63];

export async function renderFitTest(params) {
    const day = parseInt(params.day);
    const testNumber = FIT_TEST_DAYS.indexOf(day) + 1;

    if (testNumber === 0) {
        return {
            html: '<div class="screen"><p>Invalid fit test day</p></div>',
            title: 'Fit Test'
        };
    }

    const existingTest = await getFitTest(testNumber);

    const html = `
        <div class="screen">
            <div style="text-align: center; margin-bottom: var(--space-lg);">
                <div style="font-size: var(--font-size-xxl); font-weight: 700; color: var(--accent-warning);">
                    Fit Test ${testNumber}
                </div>
                <div style="color: var(--text-secondary);">Day ${day} of 63</div>
            </div>

            <p style="color: var(--text-secondary); margin-bottom: var(--space-lg); text-align: center;">
                Complete as many reps as possible for each exercise in 1 minute.
            </p>

            <form id="fit-test-form" class="fit-test-form">
                ${FIT_TEST_EXERCISES.map((exercise, index) => `
                    <div class="fit-test-exercise">
                        <span class="name">${exercise}</span>
                        <div class="number-input">
                            <button type="button" class="decrement" data-index="${index}">−</button>
                            <input type="number"
                                   name="exercise-${index}"
                                   value="${existingTest?.exercises?.[index]?.reps || 0}"
                                   min="0"
                                   max="999"
                                   inputmode="numeric">
                            <button type="button" class="increment" data-index="${index}">+</button>
                        </div>
                    </div>
                `).join('')}

                <button type="submit" class="btn btn-primary btn-block btn-lg" style="margin-top: var(--space-lg);">
                    ${existingTest ? 'Update Results' : 'Save Results'}
                </button>
            </form>
        </div>
    `;

    return {
        html,
        title: `Fit Test ${testNumber}`,
        showBack: true,
        backPath: '/insanity',
        onMount: () => {
            const form = document.getElementById('fit-test-form');

            // Number input buttons
            document.querySelectorAll('.decrement').forEach(btn => {
                btn.addEventListener('click', () => {
                    const input = btn.parentElement.querySelector('input');
                    const value = parseInt(input.value) || 0;
                    input.value = Math.max(0, value - 1);
                });
            });

            document.querySelectorAll('.increment').forEach(btn => {
                btn.addEventListener('click', () => {
                    const input = btn.parentElement.querySelector('input');
                    const value = parseInt(input.value) || 0;
                    input.value = Math.min(999, value + 1);
                });
            });

            // Form submission
            form.addEventListener('submit', async (e) => {
                e.preventDefault();

                const exercises = FIT_TEST_EXERCISES.map((name, index) => {
                    const input = form.querySelector(`[name="exercise-${index}"]`);
                    return {
                        name,
                        reps: parseInt(input.value) || 0
                    };
                });

                const testData = {
                    testNumber,
                    day,
                    exercises,
                    completedAt: Date.now()
                };

                await saveFitTest(testData);

                // Also mark the day as completed
                await markInsanityWorkoutComplete(day, 'Fit Test');

                navigate('/insanity');
            });
        }
    };
}
