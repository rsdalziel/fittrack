// IndexedDB Database Layer
const DB_NAME = 'FitTrackDB';
const DB_VERSION = 2;

let db = null;

export async function initDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onerror = () => reject(request.error);
        request.onsuccess = () => {
            db = request.result;
            resolve(db);
        };

        request.onupgradeneeded = (event) => {
            const database = event.target.result;

            // Insanity workouts store
            if (!database.objectStoreNames.contains('insanityWorkouts')) {
                const insanityStore = database.createObjectStore('insanityWorkouts', { keyPath: 'day' });
                insanityStore.createIndex('completed', 'completed');
            }

            // Fit tests store
            if (!database.objectStoreNames.contains('fitTests')) {
                database.createObjectStore('fitTests', { keyPath: 'testNumber' });
            }

            // StrongLifts workouts store
            if (!database.objectStoreNames.contains('strongliftsWorkouts')) {
                const slStore = database.createObjectStore('strongliftsWorkouts', { keyPath: 'id', autoIncrement: true });
                slStore.createIndex('date', 'date');
            }

            // Settings store
            if (!database.objectStoreNames.contains('settings')) {
                database.createObjectStore('settings', { keyPath: 'key' });
            }

            // Program state store (start dates, etc.)
            if (!database.objectStoreNames.contains('programState')) {
                database.createObjectStore('programState', { keyPath: 'program' });
            }

            // Activities store (walks, hikes, rucks, peloton, sauna, ice bath)
            if (!database.objectStoreNames.contains('activities')) {
                const activitiesStore = database.createObjectStore('activities', { keyPath: 'id', autoIncrement: true });
                activitiesStore.createIndex('date', 'date');
                activitiesStore.createIndex('type', 'type');
            }
        };
    });
}

// Generic CRUD helpers
function getStore(storeName, mode = 'readonly') {
    const transaction = db.transaction(storeName, mode);
    return transaction.objectStore(storeName);
}

function promisifyRequest(request) {
    return new Promise((resolve, reject) => {
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

// ============ INSANITY WORKOUTS ============

export async function getInsanityWorkout(day) {
    const store = getStore('insanityWorkouts');
    return promisifyRequest(store.get(day));
}

export async function getAllInsanityWorkouts() {
    const store = getStore('insanityWorkouts');
    return promisifyRequest(store.getAll());
}

export async function saveInsanityWorkout(workout) {
    const store = getStore('insanityWorkouts', 'readwrite');
    return promisifyRequest(store.put(workout));
}

export async function toggleInsanityWorkout(day, workoutName) {
    const existing = await getInsanityWorkout(day);
    const workout = {
        day,
        workoutName,
        completed: existing ? !existing.completed : true,
        completedAt: existing?.completed ? null : Date.now()
    };
    return saveInsanityWorkout(workout);
}

export async function markInsanityWorkoutComplete(day, workoutName) {
    const workout = {
        day,
        workoutName,
        completed: true,
        completedAt: Date.now()
    };
    return saveInsanityWorkout(workout);
}

export async function getInsanityProgress() {
    const workouts = await getAllInsanityWorkouts();
    const completed = workouts.filter(w => w.completed).length;
    return { completed, total: 63 };
}

// ============ FIT TESTS ============

export async function getFitTest(testNumber) {
    const store = getStore('fitTests');
    return promisifyRequest(store.get(testNumber));
}

export async function getAllFitTests() {
    const store = getStore('fitTests');
    return promisifyRequest(store.getAll());
}

export async function saveFitTest(testData) {
    const store = getStore('fitTests', 'readwrite');
    return promisifyRequest(store.put(testData));
}

// ============ STRONGLIFTS WORKOUTS ============

export async function getStrongliftsWorkout(id) {
    const store = getStore('strongliftsWorkouts');
    return promisifyRequest(store.get(id));
}

export async function getAllStrongliftsWorkouts() {
    const store = getStore('strongliftsWorkouts');
    return promisifyRequest(store.getAll());
}

export async function getStrongliftsWorkoutByDate(date) {
    const workouts = await getAllStrongliftsWorkouts();
    return workouts.find(w => w.date === date);
}

export async function saveStrongliftsWorkout(workout) {
    const store = getStore('strongliftsWorkouts', 'readwrite');
    return promisifyRequest(store.put(workout));
}

export async function getLastStrongliftsWorkout() {
    const workouts = await getAllStrongliftsWorkouts();
    if (workouts.length === 0) return null;
    return workouts.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
}

export async function getStrongliftsStats() {
    const workouts = await getAllStrongliftsWorkouts();
    const completed = workouts.filter(w => w.completed).length;

    // Get current weights for each exercise
    const currentWeights = {};
    if (workouts.length > 0) {
        const lastWorkout = workouts.sort((a, b) => new Date(b.date) - new Date(a.date))[0];
        lastWorkout.exercises.forEach(ex => {
            currentWeights[ex.name] = ex.weight;
        });
    }

    return { completed, currentWeights };
}

// ============ SETTINGS ============

export async function getSetting(key) {
    const store = getStore('settings');
    const result = await promisifyRequest(store.get(key));
    return result?.value;
}

export async function saveSetting(key, value) {
    const store = getStore('settings', 'readwrite');
    return promisifyRequest(store.put({ key, value }));
}

export async function getAllSettings() {
    const store = getStore('settings');
    const settings = await promisifyRequest(store.getAll());
    const result = {};
    settings.forEach(s => result[s.key] = s.value);
    return result;
}

// ============ PROGRAM STATE ============

export async function getProgramState(program) {
    const store = getStore('programState');
    return promisifyRequest(store.get(program));
}

export async function saveProgramState(state) {
    const store = getStore('programState', 'readwrite');
    return promisifyRequest(store.put(state));
}

// ============ DATA MANAGEMENT ============

export async function clearAllData() {
    const stores = ['insanityWorkouts', 'fitTests', 'strongliftsWorkouts', 'programState', 'activities'];

    for (const storeName of stores) {
        const store = getStore(storeName, 'readwrite');
        await promisifyRequest(store.clear());
    }
}

export async function clearInsanityData() {
    const store1 = getStore('insanityWorkouts', 'readwrite');
    await promisifyRequest(store1.clear());

    const store2 = getStore('fitTests', 'readwrite');
    await promisifyRequest(store2.clear());

    // Clear insanity program state
    const store3 = getStore('programState', 'readwrite');
    store3.delete('insanity');
}

export async function clearStrongliftsData() {
    const store = getStore('strongliftsWorkouts', 'readwrite');
    await promisifyRequest(store.clear());

    const store2 = getStore('programState', 'readwrite');
    store2.delete('stronglifts');
}

export async function exportData() {
    const data = {
        insanityWorkouts: await getAllInsanityWorkouts(),
        fitTests: await getAllFitTests(),
        strongliftsWorkouts: await getAllStrongliftsWorkouts(),
        activities: await getAllActivities(),
        settings: await getAllSettings(),
        exportDate: new Date().toISOString()
    };
    return JSON.stringify(data, null, 2);
}

// ============ ACTIVITIES ============

export async function saveActivity(activity) {
    const store = getStore('activities', 'readwrite');
    // Add completedAt timestamp if not present
    if (!activity.completedAt) {
        activity.completedAt = Date.now();
    }
    return promisifyRequest(store.put(activity));
}

export async function getActivity(id) {
    const store = getStore('activities');
    return promisifyRequest(store.get(id));
}

export async function getAllActivities() {
    const store = getStore('activities');
    return promisifyRequest(store.getAll());
}

export async function getActivitiesByDate(date) {
    const activities = await getAllActivities();
    return activities.filter(a => a.date === date);
}

export async function getTodaysActivities() {
    const today = new Date().toISOString().split('T')[0];
    return getActivitiesByDate(today);
}

export async function updateActivity(activity) {
    const store = getStore('activities', 'readwrite');
    return promisifyRequest(store.put(activity));
}

export async function deleteActivity(id) {
    const store = getStore('activities', 'readwrite');
    return promisifyRequest(store.delete(id));
}

// Helper to get today's date string
export function getTodayDateString() {
    return new Date().toISOString().split('T')[0];
}
