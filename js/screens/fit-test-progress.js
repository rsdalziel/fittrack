import { getAllFitTests } from '../db.js';

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

export async function renderFitTestProgress() {
    const tests = await getAllFitTests();
    const sortedTests = tests.sort((a, b) => a.testNumber - b.testNumber);

    if (sortedTests.length === 0) {
        return {
            html: `
                <div class="screen">
                    <div class="empty-state">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                            <path d="M9 19V6l12-3v13M9 19c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zm12-3c0 1.105-1.343 2-3 2s-3-.895-3-2 1.343-2 3-2 3 .895 3 2zM9 10l12-3"/>
                        </svg>
                        <p>No fit tests completed yet.</p>
                        <p style="font-size: var(--font-size-sm); margin-top: var(--space-sm);">
                            Complete your first fit test on Day 1 to start tracking progress.
                        </p>
                    </div>
                </div>
            `,
            title: 'Fit Test Progress',
            showBack: true,
            backPath: '/insanity'
        };
    }

    const html = `
        <div class="screen">
            <div style="margin-bottom: var(--space-lg);">
                <h2 style="font-size: var(--font-size-lg); margin-bottom: var(--space-sm);">Your Progress</h2>
                <p style="color: var(--text-secondary); font-size: var(--font-size-sm);">
                    ${sortedTests.length} of 5 fit tests completed
                </p>
            </div>

            <div class="progress-chart">
                <table class="progress-table">
                    <thead>
                        <tr>
                            <th>Exercise</th>
                            ${sortedTests.map(t => `<th>Test ${t.testNumber}<br><small style="color: var(--text-muted);">Day ${FIT_TEST_DAYS[t.testNumber - 1]}</small></th>`).join('')}
                        </tr>
                    </thead>
                    <tbody>
                        ${FIT_TEST_EXERCISES.map((exercise, exIndex) => `
                            <tr>
                                <td>${exercise}</td>
                                ${sortedTests.map((test, testIndex) => {
                                    const reps = test.exercises[exIndex]?.reps || 0;
                                    const prevReps = testIndex > 0 ? sortedTests[testIndex - 1].exercises[exIndex]?.reps || 0 : null;
                                    const improvement = prevReps !== null && reps > prevReps ? reps - prevReps : null;

                                    return `
                                        <td>
                                            <strong>${reps}</strong>
                                            ${improvement ? `<div class="improvement">+${improvement}</div>` : ''}
                                        </td>
                                    `;
                                }).join('')}
                            </tr>
                        `).join('')}
                        <tr style="border-top: 2px solid var(--bg-elevated);">
                            <td><strong>Total</strong></td>
                            ${sortedTests.map((test, testIndex) => {
                                const total = test.exercises.reduce((sum, ex) => sum + (ex.reps || 0), 0);
                                const prevTotal = testIndex > 0
                                    ? sortedTests[testIndex - 1].exercises.reduce((sum, ex) => sum + (ex.reps || 0), 0)
                                    : null;
                                const improvement = prevTotal !== null && total > prevTotal ? total - prevTotal : null;

                                return `
                                    <td>
                                        <strong style="font-size: var(--font-size-lg);">${total}</strong>
                                        ${improvement ? `<div class="improvement">+${improvement}</div>` : ''}
                                    </td>
                                `;
                            }).join('')}
                        </tr>
                    </tbody>
                </table>
            </div>

            ${sortedTests.length >= 2 ? renderProgressSummary(sortedTests) : ''}
        </div>
    `;

    return {
        html,
        title: 'Fit Test Progress',
        showBack: true,
        backPath: '/insanity'
    };
}

function renderProgressSummary(tests) {
    const firstTest = tests[0];
    const lastTest = tests[tests.length - 1];

    const firstTotal = firstTest.exercises.reduce((sum, ex) => sum + (ex.reps || 0), 0);
    const lastTotal = lastTest.exercises.reduce((sum, ex) => sum + (ex.reps || 0), 0);
    const totalImprovement = lastTotal - firstTotal;
    const percentImprovement = firstTotal > 0 ? Math.round((totalImprovement / firstTotal) * 100) : 0;

    return `
        <div class="card" style="margin-top: var(--space-lg); text-align: center; background: linear-gradient(135deg, var(--accent-success), #96986c); color: var(--color-rich-black);">
            <div style="font-size: var(--font-size-sm); opacity: 0.8;">Overall Improvement</div>
            <div style="font-size: var(--font-size-xxl); font-weight: 700;">
                ${percentImprovement > 0 ? '+' : ''}${percentImprovement}%
            </div>
            <div style="font-size: var(--font-size-sm); opacity: 0.8;">
                ${firstTotal} → ${lastTotal} total reps
            </div>
        </div>
    `;
}
