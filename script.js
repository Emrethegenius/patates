// Global variables
let marker = null;
let correctMarker = null;
let line = null;
let currentQuestion = 0;
let allGuesses = [];
let allMarkers = [];
let allLines = [];
let map, correctLocation, canGuess = true, totalScore = 0, roundsPlayed = 0;
let currentGuess = null;
let mapClickEnabled = true; // Added this line

// Initial theme setup
const savedTheme = localStorage.getItem('theme') || 'light';
document.documentElement.setAttribute('data-theme', savedTheme);

// Questions array
const questions = [
    {
        question: "Where is the world's oldest stock exchange still in operation?",
        answer: [52.3702, 4.8952],
        name: "Amsterdam Stock Exchange",
        image: "images/Hendrick_de_Keyser_exchange-1024x808.jpg",
        info: "Established in 1602 by the Dutch East India Company, the Amsterdam Stock Exchange is considered the world's oldest 'modern' securities market. It pioneered many financial innovations including continuous trading and options trading."
    },
    {
        question: "Where is the coldest permanently inhabited place on Earth?",
        answer: [63.4641, 142.7737],
        name: "Oymyakon, Russia",
        image: "images/oymyakon-1[3].jpg",
        info: "Oymyakon in Siberia holds the record for the coldest permanently inhabited place, with temperatures dropping to -71.2°C (-96.16°F). Around 500 people live in this extreme environment where ground is permanently frozen."
    },
    {
        question: "Where was the Apollo 11 command module recovered after splashdown?",
        answer: [13.3290, 169.1490],
        name: "Pacific Ocean Recovery Site",
        image: "images/Splashdown_3.jpg",
        info: "On July 24, 1969, Apollo 11 splashed down 900 miles southwest of Hawaii. The USS Hornet recovered the command module Columbia and its crew, marking the successful completion of the first human moon landing mission."
    },
    {
        question: "Where was the first written peace treaty in history signed?",
        answer: [34.5679, 36.0513],
        name: "Kadesh, Syria",
        image: "images/200px-Treaty_of_Kadesh.jpg",
        info: "The Treaty of Kadesh (1259 BCE), signed between Egyptian Pharaoh Ramesses II and Hittite King Hattusili III, is the oldest known peace treaty. A copy is displayed at the UN Headquarters as a symbol of diplomatic relations."
    },
    {
        question: "Where was the first successful human heart transplant performed?",
        answer: [-33.94113063924009, 18.462912490286236],
        name: "Groote Schuur Hospital, Cape Town",
        image: "images/treaty-of-kadesh-3.jpg",
        info: "On December 3, 1967, Dr. Christiaan Barnard performed the world's first successful human heart transplant at Groote Schuur Hospital. The patient, Louis Washkansky, lived for 18 days after the groundbreaking surgery."
    }
];

// Icon definitions
const userIcon = L.divIcon({
    className: 'user-guess-pin',
    html: `
        <div class="pin-wrapper">
            <div class="pin-head"></div>
            <div class="pin-point"></div>
        </div>
    `,
    iconSize: [30, 30],
    iconAnchor: [15, 30]
});

const correctIcon = L.divIcon({
    className: 'correct-pin',
    html: `
        <div class="fancy-plus">
            <div class="plus-circle">
                <span class="plus-icon">+</span>
            </div>
            <div class="pulse-ring"></div>
            <div class="pulse-ring delay"></div>
        </div>
    `,
    iconSize: [50, 50],
    iconAnchor: [25, 25]
});


function initializeMap() {
    map = L.map('map', {
        minZoom: 2,
        maxZoom: 18,
        worldCopyJump: true,
        center: [20, 0],
        zoom: 2,
        wheelDebounceTime: 150,
        wheelPxPerZoomLevel: 120
    });

    L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>',
        subdomains: 'abcd',
        maxZoom: 20,
    }).addTo(map);

    map.scrollWheelZoom.enable();
    map.on('click', handleGuess);

    let zoomTimeout;
    map.on('zoomend', () => {
        clearTimeout(zoomTimeout);
        zoomTimeout = setTimeout(() => {
            if (correctMarker) {
                updatePinSize(map, correctMarker);
                if (line) {
                    updateLine();
                }
            }
        }, 100); // Adjust the delay (in milliseconds) as needed
    });
}


function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
}

function handleGuess(e) {
    if (!canGuess || !mapClickEnabled) return; // Modified this line
    
    const userGuess = e.latlng;
    currentGuess = userGuess;
    
    if (marker && map) {
        map.removeLayer(marker);
    }
    
    marker = L.marker([userGuess.lat, userGuess.lng], { icon: userIcon }).addTo(map);
    document.getElementById('submit-guess').style.display = 'block';
}

function showGuessAndCorrectLocation(userGuess, correctLatLng) {
    correctMarker = L.marker([correctLatLng.lat, correctLatLng.lng], {
        icon: correctIcon,
        interactive: true
    }).addTo(map);

    const updateLine = () => {
        if (line) {
            map.removeLayer(line);
        }

        line = L.polyline([
            [userGuess.lat, userGuess.lng],
            [correctLatLng.lat, correctLatLng.lng]
        ], {
            color: '#7ac5f0',
            weight: 3,
            opacity: 0.8,
            smoothFactor: 1,
            dashArray: '10',
            className: 'animated-line'
        }).addTo(map);
    };

    updateLine();

    const currentQuestionInfo = questions[currentQuestion];
    const popupContent = `
        <div class="location-info">
            <h3>${currentQuestionInfo.name}</h3>
            <img src="${currentQuestionInfo.image}" alt="${currentQuestionInfo.name}">
            <p>${currentQuestionInfo.info}</p>
        </div>
    `;

    const popup = L.popup({
        maxWidth: 300,
        className: 'location-popup',
        autoPan: true,
        keepInView: true,
        offset: [0, -25],
        closeButton: true,
        autoClose: false,
        closeOnClick: false
    }).setContent(popupContent);

    correctMarker.bindPopup(popup);
    correctMarker.on('click', function(e) {
        this.openPopup();
    });

    const bounds = L.latLngBounds([
        [userGuess.lat, userGuess.lng],
        [correctLatLng.lat, correctLatLng.lng]
    ]);

    const distance = calculateDistance(userGuess.lat, userGuess.lng, correctLatLng.lat, correctLatLng.lng);
    let padValue = 0.2;

    if (distance > 5000) {
        padValue = 0.1;
    }
    if (distance > 10000) {
        padValue = 0.05;
    }

    const extendedBounds = bounds.pad(padValue);
    map.fitBounds(extendedBounds, {
        padding: [50, 50],
        duration: 0.5,
        animate: true
    });

    // Zoom in on correct location after initial zoom out
    setTimeout(() => {
        map.flyTo(correctLatLng, 12, { // Changed this line
            duration: 1,
            animate: true
        });
    }, 600);

    map.off('click', handleGuess);

    // Re-enable map dragging and other interactions here
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.scrollWheelZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
    if (map.tap) map.tap.enable();

    updatePinSize(map, correctMarker);

    map.on('zoomend', () => {
        updateLine();
        updatePinSize(map, correctMarker);
    });
}





function showAllGuessesOnMap() {
    const mapElement = document.getElementById('map');


    if (marker) map.removeLayer(marker);
    if (correctMarker) map.removeLayer(correctMarker);
    if (line) map.removeLayer(line);

    allGuesses.forEach((guess, index) => {
        const question = questions[index];
        const userMarker = L.marker([guess.lat, guess.lng], { icon: userIcon }).addTo(map);
        const correctMarker = L.marker([question.answer[0], question.answer[1]], {
            icon: correctIcon,
            interactive: true
        }).addTo(map);
        const line = L.polyline([
            [guess.lat, guess.lng],
            [question.answer[0], question.answer[1]]
        ], {
            color: '#7ac5f0',
            weight: 3,
            opacity: 0.8,
            smoothFactor: 1,
            dashArray: '10',
            className: 'animated-line'
        }).addTo(map);

        const popupContent = `
            <div class="location-info">
                <h3>${question.name}</h3>
                <img src="${question.image}" alt="${question.name}">
                <p>${question.info}</p>
            </div>
        `;

        correctMarker.bindPopup(popupContent);
    });

    const allPoints = allGuesses.concat(questions.map(q => L.latLng(q.answer[0], q.answer[1])));
    const bounds = L.latLngBounds(allPoints);
    map.fitBounds(bounds, { padding: [50, 50] });

    const endScreen = document.getElementById('end-screen');
    const endContent = document.querySelector('.end-content');
    endContent.classList.add('minimized');
    endScreen.classList.add('minimized');

    const expandButton = document.createElement('button');
    expandButton.className = 'expand-button';
    expandButton.innerHTML = '↑';
    expandButton.onclick = () => {
        endContent.classList.remove('minimized');
        endScreen.classList.remove('minimized');
        expandButton.remove();
        mapElement.style.height = 'calc(100vh - 200px)';

        // Use requestAnimationFrame to ensure the height change is applied
        requestAnimationFrame(() => {
            // Use setTimeout to delay invalidateSize and re-enable interactions
            setTimeout(() => {
                map.invalidateSize();
                mapClickEnabled = true; // Re-enable map click
                // Re-enable map interactions
                map.dragging.enable();
                map.touchZoom.enable();
                map.doubleClickZoom.enable();
                map.scrollWheelZoom.enable();
                map.boxZoom.enable();
                map.keyboard.enable();
                if (map.tap) map.tap.enable();
                map.on('click', handleGuess); // Add the event listener back
            }, 0);
        });
    };
    endContent.appendChild(expandButton);
 // Set initial height for minimized state
    map.invalidateSize();

    // Re-enable map interactions after minimizing
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.scrollWheelZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
    if (map.tap) map.tap.enable();

    mapClickEnabled = false; // Added this line
    // Disable map interactions
    map.off('click', handleGuess); // Remove the event listener
}



function shareResults() {
    const finalScore = totalScore;
    const averageDistance = allGuesses.reduce((acc, guess, index) => {
        const correctAnswer = questions[index].answer;
        return acc + calculateDistance(guess.lat, guess.lng, correctAnswer[0], correctAnswer[1]);
    }, 0) / questions.length;
    
    const accuracy = Math.max(0, 100 - (averageDistance / 100)).toFixed(1);
    const shareText = `🌍 Daily Geo Quiz\nScore: ${finalScore}/20000\nAccuracy: ${accuracy}%\n\nPlay at: ${window.location.href}`;
    
    if (navigator.share) {
        navigator.share({
            title: 'Daily Geo Quiz Results',
            text: shareText,
            url: window.location.href
        }).catch(() => {
            copyToClipboard(shareText);
        });
    } else {
        copyToClipboard(shareText);
    }
}

function copyToClipboard(text) {
    navigator.clipboard.writeText(text)
        .then(() => alert('Results copied to clipboard!'))
        .catch(() => alert('Unable to share results'));
}

function getScoreFeedback(distance) {
    if (distance < 5) {
        return { icon: '🌟', color: 'green' };
    } else if (distance < 50) {
        return { icon: '🥇', color: 'gold' };
    } else if (distance < 500) {
        return { icon: '🥈', color: 'silver' };
    } else if (distance < 1000) {
        return { icon: '🥉', color: 'bronze' };
    } else {
        return { icon: '❌', color: 'red' };
    }
}

function endGame() {
    const statsContainer = document.querySelector('.stats-container');
    const questionContainer = document.getElementById('question-container');
    const placeholder = document.createElement('div');

    placeholder.style.height = questionContainer.offsetHeight + 'px';
    placeholder.id = 'question-placeholder';

    questionContainer.parentNode.replaceChild(placeholder, questionContainer);
    statsContainer.style.display = 'none';

    const endScreen = document.getElementById('end-screen');
    const finalScore = document.getElementById('final-score');
    const finalStats = document.getElementById('final-stats');

    let totalDistance = 0;
    let guessDetails = '';

    questions.forEach((question, index) => {
        const guess = allGuesses[index];
        const distance = calculateDistance(guess.lat, guess.lng, question.answer[0], question.answer[1]);
        totalDistance += distance;

        const feedback = getScoreFeedback(distance);
        guessDetails += `
            <div class="guess-detail">
                ${index + 1}. <span style="color: ${feedback.color};">${feedback.icon}</span> (Distance: ${Math.round(distance)} km)
            </div>
        `;
    });

    const averageDistance = totalDistance / questions.length;
    const accuracy = Math.max(0, 100 - (averageDistance / 100));

    finalScore.textContent = `Final Score: ${totalScore}`;
    finalStats.innerHTML = `
        <div class="accuracy">Accuracy: ${accuracy.toFixed(1)}%</div>
        <div class="guess-history">
            <h3>Your Guesses:</h3>
            ${guessDetails}
        </div>
    `;

    endScreen.style.display = 'flex';

    const endButtons = document.querySelector('.end-buttons');
    endButtons.innerHTML = `
        <button id="see-results-map" class="end-button">See Results on Map</button>
        <button id="share-results" class="end-button">Share Results</button>
    `;
    document.getElementById('see-results-map').addEventListener('click', showAllGuessesOnMap);
    document.getElementById('share-results').addEventListener('click', shareResults);
    mapClickEnabled = false;
}



// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    const themeToggle = document.getElementById('theme-toggle');
    if (themeToggle) {
        themeToggle.checked = localStorage.getItem('theme') === 'dark';
        
        themeToggle.addEventListener('change', () => {
            const newTheme = themeToggle.checked ? 'dark' : 'light';
            document.documentElement.setAttribute('data-theme', newTheme);
            localStorage.setItem('theme', newTheme);
        });

     }
    const startGame = document.getElementById("start-game");
    if (startGame) {
        startGame.onclick = function() {
            const heroContainer = document.querySelector('.hero-container');
            const gameSection = document.getElementById('game-section');
            
            if (heroContainer && gameSection) {
                heroContainer.style.display = "none";
                gameSection.style.display = "block";
                initializeMap();
                document.getElementById("question").textContent = questions[currentQuestion].question;
            }
        };
    }
    document.getElementById('submit-guess').addEventListener('click', function() {
        if (!currentGuess) return;
        
        canGuess = false;
        const correctAnswer = questions[currentQuestion].answer;
        const distance = calculateDistance(currentGuess.lat, currentGuess.lng, correctAnswer[0], correctAnswer[1]);
        
        allGuesses.push(currentGuess);
        
        const nextButton = document.querySelector('.next-button');
        nextButton.style.display = 'block';
        this.style.display = 'none';
        
        if (currentQuestion === questions.length - 1) {
            nextButton.textContent = 'See Results';
        } else {
            nextButton.textContent = 'Next Question';
        }
        
        const score = Math.max(0, Math.round(4000 * (1 - distance/20000)));
        totalScore += score;
        
        document.getElementById('score').textContent = `Score: ${totalScore}`;
        document.getElementById('distance').textContent = `Distance: ${Math.round(distance)} km`;
        
        showGuessAndCorrectLocation(currentGuess, L.latLng(correctAnswer[0], correctAnswer[1]));
    });
document.querySelector('.next-button').addEventListener('click', function() {
    if (currentQuestion === questions.length - 1) {
        endGame();
        return;
    }
    
    currentQuestion++;
    canGuess = true;
    
    if (marker) map.removeLayer(marker);
    if (correctMarker) map.removeLayer(correctMarker);
    if (line) map.removeLayer(line);
    
    map.setView([20, 0], 2);
    map.on('click', handleGuess);
    
    document.getElementById('question').textContent = questions[currentQuestion].question;
    document.getElementById('distance').textContent = 'Distance: -';
    document.getElementById('score').textContent = 'Score: -';
    
    this.style.display = 'none';
    
    map.dragging.enable();
    map.touchZoom.enable();
    map.doubleClickZoom.enable();
    map.scrollWheelZoom.enable();
    map.boxZoom.enable();
    map.keyboard.enable();
    if (map.tap) map.tap.enable();
    mapClickEnabled = true;
});


    const endScreen = document.getElementById('end-screen');
    if (endScreen) {
        const seeResultsBtn = endScreen.querySelector('#see-results-map');
        const shareResultsBtn = endScreen.querySelector('#share-results');
        
        if (seeResultsBtn) {
            seeResultsBtn.addEventListener('click', showAllGuessesOnMap);
        }
        
        if (shareResultsBtn) {
            shareResultsBtn.addEventListener('click', shareResults);
        }
    }
});
