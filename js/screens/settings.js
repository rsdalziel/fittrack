import { getSetting, saveSetting, clearAllData, clearInsanityData, clearStrongliftsData, exportData } from '../db.js';
import { navigate } from '../router.js';

export async function renderSettings() {
    const weightUnit = await getSetting('weightUnit') || 'lbs';

    const html = `
        <div class="screen">
            <div class="settings-section">
                <div class="settings-title">Units</div>
                <div class="settings-item">
                    <label>Weight Unit</label>
                    <select id="weight-unit-select">
                        <option value="lbs" ${weightUnit === 'lbs' ? 'selected' : ''}>Pounds (lbs)</option>
                        <option value="kg" ${weightUnit === 'kg' ? 'selected' : ''}>Kilograms (kg)</option>
                    </select>
                </div>
            </div>

            <div class="settings-section">
                <div class="settings-title">Data Management</div>

                <div class="settings-item" id="export-data">
                    <label>Export Data</label>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3"/>
                    </svg>
                </div>

                <div class="settings-item" id="reset-insanity" style="color: var(--accent-warning);">
                    <label>Reset Insanity Progress</label>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                </div>

                <div class="settings-item" id="reset-stronglifts" style="color: var(--accent-warning);">
                    <label>Reset StrongLifts Progress</label>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"/>
                    </svg>
                </div>

                <div class="settings-item" id="reset-all" style="color: var(--accent-danger);">
                    <label>Reset All Data</label>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="width: 20px; height: 20px;">
                        <path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6"/>
                    </svg>
                </div>
            </div>

            <div class="settings-section">
                <div class="settings-title">About</div>
                <div class="settings-item">
                    <label>Version</label>
                    <span style="color: var(--text-secondary);">1.0.0</span>
                </div>
                <div class="settings-item">
                    <label>Storage</label>
                    <span id="storage-usage" style="color: var(--text-secondary);">Calculating...</span>
                </div>
            </div>
        </div>
    `;

    return {
        html,
        title: 'Settings',
        onMount: async () => {
            // Weight unit change
            document.getElementById('weight-unit-select').addEventListener('change', async (e) => {
                await saveSetting('weightUnit', e.target.value);
            });

            // Export data
            document.getElementById('export-data').addEventListener('click', async () => {
                const data = await exportData();
                const blob = new Blob([data], { type: 'application/json' });
                const url = URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `fittrack-backup-${new Date().toISOString().split('T')[0]}.json`;
                a.click();
                URL.revokeObjectURL(url);
            });

            // Reset Insanity
            document.getElementById('reset-insanity').addEventListener('click', async () => {
                if (confirm('Are you sure you want to reset all Insanity progress? This cannot be undone.')) {
                    await clearInsanityData();
                    alert('Insanity progress has been reset.');
                    navigate('/');
                }
            });

            // Reset StrongLifts
            document.getElementById('reset-stronglifts').addEventListener('click', async () => {
                if (confirm('Are you sure you want to reset all StrongLifts progress? This cannot be undone.')) {
                    await clearStrongliftsData();
                    alert('StrongLifts progress has been reset.');
                    navigate('/');
                }
            });

            // Reset All
            document.getElementById('reset-all').addEventListener('click', async () => {
                if (confirm('Are you sure you want to reset ALL data? This includes both programs and cannot be undone.')) {
                    if (confirm('This is your last chance. Delete everything?')) {
                        await clearAllData();
                        alert('All data has been reset.');
                        navigate('/');
                    }
                }
            });

            // Calculate storage usage
            if (navigator.storage && navigator.storage.estimate) {
                const estimate = await navigator.storage.estimate();
                const usedMB = (estimate.usage / (1024 * 1024)).toFixed(2);
                document.getElementById('storage-usage').textContent = `${usedMB} MB used`;
            } else {
                document.getElementById('storage-usage').textContent = 'N/A';
            }
        }
    };
}
