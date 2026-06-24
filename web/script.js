console.log("Script loaded");

const vuBars = () => document.querySelectorAll('#vuBars i');
const statusLed = () => document.getElementById('statusLed');
const eq = () => document.getElementById('eq');
const logsElement = () => document.getElementById('logs');

let vuLevel = 0;

function setStatus(state, title) {
    const el = statusLed();
    el.dataset.state = state;
    el.title = title;
}

function setVu(level) {
    vuLevel = Math.max(0, Math.min(10, level));
    vuBars().forEach((bar, i) => {
        bar.classList.toggle('lit', i < vuLevel);
    });
}

function bumpVu() {
    setVu(Math.min(vuLevel + 1, 9));
}

function appendLog(text, cls) {
    const line = document.createElement('div');
    line.className = 'console__line' + (cls ? ' ' + cls : '');
    line.textContent = text;
    const logs = logsElement();
    logs.appendChild(line);
    logs.scrollTop = logs.scrollHeight;
}

async function loadConfig() {
    try {
        const response = await fetch('/config');
        const data = await response.json();
        const configInfo = document.getElementById('configInfo');
        if (configInfo) {
            configInfo.textContent = `Files save to: ${data.download_path}`;
        }
    } catch (error) {
        console.error('Could not load config:', error);
    }
}

async function download() {
    const spotifyLink = document.getElementById('spotifyLink').value;

    if (!spotifyLink) {
        document.getElementById('result').textContent = "Paste a Spotify or YouTube link first.";
        return;
    }

    logsElement().innerHTML = "";
    document.getElementById('result').innerHTML = "";
    setVu(0);
    setStatus('working', 'Downloading');
    eq().classList.add('active');

    const eventSource = new EventSource(`/download?spotify_link=${encodeURIComponent(spotifyLink)}`);

    eventSource.onmessage = function (event) {
        const log = event.data;

        if (log.startsWith("DOWNLOAD:")) {
            setVu(10);
            const downloadPath = log.split("DOWNLOAD: ")[1].trim();

            const resultEl = document.getElementById('result');
            resultEl.innerHTML = "";
            const link = document.createElement('a');
            link.href = downloadPath;
            link.target = '_blank';
            link.className = 'result__link';
            link.textContent = 'Saved on server — view file';
            resultEl.appendChild(link);

        } else if (log.startsWith("Download completed")) {
            appendLog(log, 'console__line--ok');
            setStatus('done', 'Done');
            eq().classList.remove('active');
            eventSource.close();

        } else if (log.startsWith("FAILED:")) {
            appendLog(log, 'console__line--fail');

        } else if (log.startsWith("Warning:")) {
            appendLog(log, 'console__line--warn');

        } else if (log.startsWith("-----")) {
            appendLog(log, 'console__line--divider');

        } else if (log.startsWith("Error")) {
            appendLog(log, 'console__line--fail');
            document.getElementById('result').textContent = log;
            setStatus('error', 'Error');
            eq().classList.remove('active');
            eventSource.close();

        } else {
            appendLog(log);
            bumpVu();
        }
    };

    eventSource.onerror = function () {
        if (statusLed().dataset.state === 'working') {
            appendLog("Error: connection to server was lost.", 'console__line--fail');
            setStatus('error', 'Error');
        }
        eq().classList.remove('active');
        eventSource.close();
    };
}

window.onload = loadConfig;