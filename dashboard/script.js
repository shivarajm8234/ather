// Update Time
function updateTime() {
    const now = new Date();
    document.getElementById('current-time').textContent = now.toLocaleTimeString();
}
setInterval(updateTime, 1000);
updateTime();

// IP Detection
async function detectIP() {
    document.getElementById('local-ip').textContent = '192.168.1.84';
}
detectIP();

// Microphone & Speech Recognition
const micBtn = document.getElementById('mic-btn');
const transcriptText = document.getElementById('live-transcript');
let isRecording = false;

if ('webkitSpeechRecognition' in window || 'SpeechRecognition' in window) {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();

    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'kn-IN'; // Default to Kannada, can be dynamic

    recognition.onresult = (event) => {
        let interimTranscript = '';
        for (let i = event.resultIndex; i < event.results.length; ++i) {
            if (event.results[i].isFinal) {
                transcriptText.textContent = event.results[i][0].transcript;
                transcriptText.style.color = '#fff';
                transcriptText.style.fontStyle = 'normal';
            } else {
                interimTranscript += event.results[i][0].transcript;
                transcriptText.textContent = interimTranscript;
            }
        }
    };

    micBtn.addEventListener('click', () => {
        if (!isRecording) {
            recognition.start();
            micBtn.classList.add('active');
            transcriptText.textContent = "Listening...";
        } else {
            recognition.stop();
            micBtn.classList.remove('active');
        }
        isRecording = !isRecording;
    });
} else {
    transcriptText.textContent = "Speech recognition not supported in this browser.";
}

// Simulated terminal updates
const terminal = document.getElementById('terminal-output');
const mockLogs = [
    "PJSIP registration successful for endpoint 2000",
    "Incoming call from 2000 to 3000 detected",
    "AGI execution started: voice_agent.py",
    "Language detected: Kannada (kn-IN)",
    "LLM Response generated in 450ms",
    "Streaming TTS audio to channel PJSIP/2000-00000001"
];

let logIndex = 0;
function addLog() {
    if (logIndex < mockLogs.length) {
        const p = document.createElement('p');
        p.className = 'log-line';
        const timestamp = new Date().toLocaleTimeString();
        p.textContent = `[${timestamp}] ${mockLogs[logIndex]}`;
        terminal.appendChild(p);
        terminal.scrollTop = terminal.scrollHeight;
        logIndex++;
    }
}

setInterval(addLog, 4000);
