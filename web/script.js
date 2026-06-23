console.log("Script loaded");

async function loadConfig() {
    try {
        const response = await fetch('/config');
        const data = await response.json();
        const configInfo = document.getElementById('configInfo');
        if (configInfo) {
            configInfo.textContent = `Downloads will be saved to: ${data.download_path}`;
        }
    } catch (error) {
        console.error('Could not load config:', error);
    }
}

async function download() {
    const spotifyLink = document.getElementById('spotifyLink').value;

    if (!spotifyLink) {
        document.getElementById('result').innerText = "Please enter a Spotify or YouTube link.";
        return;
    }

    const logsElement = document.getElementById('logs');
    logsElement.innerHTML = "";
    document.getElementById('result').innerText = "";

    const progressBar = document.getElementById('progress');
    progressBar.style.display = 'block';
    progressBar.value = 0;
    const increment = 10;

    const eventSource = new EventSource(`/download?spotify_link=${encodeURIComponent(spotifyLink)}`);

    eventSource.onmessage = function(event) {
        const log = event.data;

        if (log.startsWith("DOWNLOAD:")) {
            progressBar.value = 100;
            const downloadPath = log.split("DOWNLOAD: ")[1].trim();

            const downloadLink = document.createElement('a');
            downloadLink.href = downloadPath;
            downloadLink.target = '_blank';
            downloadLink.download = decodeURIComponent(downloadPath.split('/').pop());
            downloadLink.innerText = "Open downloaded file";
            document.getElementById('result').appendChild(downloadLink);
            downloadLink.click();

            eventSource.close();
            progressBar.style.display = 'none';
        } else if (log.includes("Download completed")) {
            logsElement.innerHTML += "Download completed successfully.<br>";
        } else if (log.startsWith("Error")) {
            document.getElementById('result').innerText = `Error: ${log}`;
            eventSource.close();
            progressBar.style.display = 'none';
        } else {
            progressBar.value = Math.min(progressBar.value + increment, 95);
            logsElement.innerHTML += log + "<br>";
            logsElement.scrollTop = logsElement.scrollHeight;
        }
    };

    eventSource.onerror = function() {
        if (!logsElement.innerHTML.includes("Download completed successfully")) {
            document.getElementById('result').innerText = "Error occurred while downloading.";
        }
        progressBar.style.display = 'none';
        eventSource.close();
    };
}

window.onload = loadConfig;