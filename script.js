const map = L.map('map', {
    zoomControl: false
}).setView([-3.7575, 102.2755], 16);

L.control.zoom({ position: 'bottomright' }).addTo(map);

L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors'
}).addTo(map);

const locations = {
    "Gerbang Utama": [-3.760568, 102.272638],
    "Gedung Layanan Terpadu": [-3.758209, 102.272176],
    "Laboratorium Fisika": [-3.755810, 102.273885],
    "Gedung Bersama III": [-3.756111, 102.276192],
    "Gedung Bersama V": [-3.755753, 102.276481],
    "Gerbang Kedua (Akses Gang Juwita)": [-3.759452, 102.27506],
    "Gedung Serba Guna": [-3.757851, 102.276916],
    "Dekanat Teknik": [-3.758285, 102.276653],
    "Laboratorium Teknik": [-3.758558, 102.276267],
    "Gerbang Keluar": [-3.759387, 102.276240]
};

const startSelect = document.getElementById('start');
const destinationSelect = document.getElementById('destination');

Object.keys(locations).forEach(location => {
    const option1 = document.createElement('option');
    option1.value = location;
    option1.textContent = location;
    startSelect.appendChild(option1);

    const option2 = document.createElement('option');
    option2.value = location;
    option2.textContent = location;
    destinationSelect.appendChild(option2);
});

startSelect.value = "Gerbang Utama";
destinationSelect.value = "Gedung Bersama V";

let routeLine = null;
let startMarker = null;
let destinationMarker = null;

function getDirectionIcon(type, stepText = '') {
    let t = type ? type.toLowerCase() : '';
    let txt = stepText ? stepText.toLowerCase() : '';
    
    if (t.includes('start') || t.includes('mulai') || txt.includes('mulai')) {
        return '<i class="fa-solid fa-play text-start"></i>';
    } 
    else if (t.includes('straight') || t.includes('lurus') || txt.includes('lurus')) {
        return '<i class="fa-solid fa-arrow-up text-straight"></i>';
    } 
    else if (t.includes('left') || txt.includes('belok kiri') || txt.includes('kiri')) {
        return '<i class="fa-solid fa-arrow-turn-up text-left"></i>';
    } 
    else if (t.includes('right') || txt.includes('belok kanan') || txt.includes('kanan')) {
        return '<i class="fa-solid fa-arrow-turn-up text-right"></i>';
    } 
    else if (t.includes('u-turn') || t.includes('putar') || txt.includes('putar balik')) {
        return '<i class="fa-solid fa-arrow-rotate-left text-uturn"></i>';
    } 
    else if (t.includes('destination') || t.includes('tiba') || t.includes('tujuan') || txt.includes('tiba')) {
        return '<i class="fa-solid fa-flag-checkered text-dest"></i>';
    } 
    else {
        return '<i class="fa-solid fa-diamond"></i>';
    }
}

async function findRoute(){
    const start = document.getElementById('start').value;
    const destination = document.getElementById('destination').value;
    const vehicle = document.getElementById('vehicle').value;

    const btn = document.getElementById('searchBtn');
    btn.innerHTML = '<span>Menghitung Rute...</span> <i class="fa-solid fa-spinner fa-spin"></i>';

    try {
        const response = await fetch('http://127.0.0.1:5000/route', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ start, destination, vehicle })
        });

        const data = await response.json();

        if(routeLine) map.removeLayer(routeLine);
        if(startMarker) map.removeLayer(startMarker);
        if(destinationMarker) map.removeLayer(destinationMarker);

        const markerIcon = (color) => L.divIcon({
            className: 'custom-marker',
            html: `<div style="background-color: ${color}; width:14px; height:14px; border-radius:50%; border: 2px solid white; box-shadow: 0 2px 6px rgba(0,0,0,0.3);"></div>`,
            iconSize: [14, 14]
        });

        startMarker = L.marker(locations[start], {icon: markerIcon('#0070f3')}).addTo(map)
            .bindPopup(`<b>Titik Awal:</b><br>${start}`);

        destinationMarker = L.marker(locations[destination], {icon: markerIcon('#ff3d00')}).addTo(map)
            .bindPopup(`<b>Tujuan:</b><br>${destination}`);

        const pathCoordinates = data.path.map(point => [point.lat, point.lng]);

        pathCoordinates.unshift(locations[start]);       
        pathCoordinates.push(locations[destination]);   

        routeLine = L.polyline(pathCoordinates, {
            color: '#0052cc',
            weight: 6,
            opacity: 0.85,
            lineCap: 'round',
            lineJoin: 'round'
        }).addTo(map);

        map.fitBounds(routeLine.getBounds(), { padding: [50, 50] });

        document.getElementById('distance').innerText = `${data.distance} m`;
        document.getElementById('duration').innerText = `${data.duration} mnt`;

        if(data.ui_stats) {
            const labelElem = document.getElementById('dynamic-label');
            const valueElem = document.getElementById('dynamic-value');
            const iconElem = document.getElementById('dynamic-icon');

            if (labelElem) labelElem.innerText = data.ui_stats.label;
            if (valueElem) valueElem.innerText = data.ui_stats.value;
            
            if (iconElem) {
                iconElem.className = `fa-solid fa-${data.ui_stats.icon}`;
                iconElem.style.setProperty('color', '#0070f3', 'important');
            }
        }

        const instructionsDiv = document.getElementById('instructions');
        instructionsDiv.innerHTML = '';

        data.instructions.forEach((step) => {
            const item = document.createElement('div');
            item.className = 'instruction-card';
            
            item.innerHTML = `
                <div class="direction-icon-holder">
                    ${getDirectionIcon(step.type, step.text)}
                </div>
                <div class="direction-text">
                    ${step.text}
                </div>
            `;
            instructionsDiv.appendChild(item);
        });

        const clearBtn = document.getElementById('clearBtn');
        if (clearBtn) clearBtn.classList.add('active');

    } catch (error) {
        console.error("Error fetching route:", error);
    } finally {
        btn.innerHTML = '<span>Cari Jalur Terbaik</span> <i class="fa-solid fa-arrow-trend-up"></i>';
    }
}

function clearRoute() {
    if (routeLine) map.removeLayer(routeLine);
    if (startMarker) map.removeLayer(startMarker);
    if (destinationMarker) map.removeLayer(destinationMarker);

    routeLine = null;
    startMarker = null;
    destinationMarker = null;

    document.getElementById('distance').innerText = '-';
    document.getElementById('duration').innerText = '-';
    document.getElementById('dynamic-value').innerText = '-';

    const instructionsDiv = document.getElementById('instructions');
    if (instructionsDiv) {
        instructionsDiv.innerHTML = '<p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 20px;">Silakan pilih lokasi dan cari jalur untuk melihat panduan rute.</p>';
    }

    const clearBtn = document.getElementById('clearBtn');
    if (clearBtn) clearBtn.classList.remove('active');

    map.flyTo([-3.7575, 102.2755], 16, {
        animate: true,
        duration: 1.5
    });
}

window.onload = () => {
    const instructionsDiv = document.getElementById('instructions');
    if (instructionsDiv) {
        instructionsDiv.innerHTML = '<p style="color: #94a3b8; font-size: 13px; text-align: center; margin-top: 20px;">Silakan pilih lokasi dan cari jalur untuk melihat panduan rute.</p>';
    }
};