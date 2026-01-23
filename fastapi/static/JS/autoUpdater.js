// static/JS/autoUpdater.js
import { getCurrentPos } from './globals.js';

let PosUpdateInterval;
let debounceTimer;

export async function updatePos() {
    const posID = getCurrentPos();
    if (!posID) return;
    
    try {
        // Call YOUR API endpoint
        const response = await fetch(`/api/v1/gps/pos/${posID}`);
        
        if (!response.ok) {
            const PosCard = document.getElementById('Pos-card');
            PosCard.innerHTML = `
                <div class="Pos-error">
                    <p>Unable to fetch Pos for "${posID}"</p>
                    <small>Check the city name and try again</small>
                </div>
            `;
            return;
        }
        
        const posData = await response.json();
        renderGpsCard(posData);
    } catch (error) {
        console.error('Error fetching Pos:', error);
    }
}

function renderGpsCard(data) {
    const PosCard = document.getElementById('Pos-card');
    PosCard.innerHTML = `
        <div class="Pos-card">
            <h2>Pos in ${data.posID}, ${data.tourID}</h2>
            <div class="Pos-details">
                <p><strong>Date/Time:</strong> ${data.recordTime}</p>
                <p><strong>Latitude:</strong> ${data.latitude}</p>
            </div>
        </div>
    `;
}

// Debounced version for input
export function debouncedUpdatePos() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(updatePos, 500);
}

export function startPosUpdates(intervalMs = 60000) {
    if (PosUpdateInterval) clearInterval(PosUpdateInterval);
    
    // Initial update
    updatePos();
    
    // Set up interval
    PosUpdateInterval = setInterval(updatePos, intervalMs);
}

export function stopPosUpdates() {
    if (PosUpdateInterval) {
        clearInterval(PosUpdateInterval);
        PosUpdateInterval = null;
    }
}

export function healthCheck() {
    fetch('/api/v2/health')
        .then(response => response.json())
        .then(data => {
            console.log('Server health:', data.status);
        })
        .catch(error => {
            console.error('Health check failed:', error);
        });
}