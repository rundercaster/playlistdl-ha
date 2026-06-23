# Audio Downloader

A self-hosted web application for downloading songs, albums, or playlists from Spotify and YouTube as MP3 files. It can be run with Docker Compose or installed as a Home Assistant OS add-on.

## Features

- Download Spotify and YouTube playlists and albums
- Session-based download directories for each request
- Admin mode for saving downloads to a configured server path
- Real-time progress and download logs in the web UI
- Automatic cleanup of temporary session folders

## Home Assistant add-on

1. Add this repository to Home Assistant as a custom add-on repository:
   - URL: https://github.com/rundercaster/playlistdl-ha
   - Branch: homeassistant-addon
2. Open the add-on store in Home Assistant and install "Audio Downloader".
3. Configure the add-on options:
   - admin_username
   - admin_password
   - audio_download_path (recommended: /share/playlistdl)
   - cleanup_interval
4. Start the add-on and open the web interface on port 5000.

## Docker Compose

Use the existing `docker-compose.yml` if you want to run the app outside Home Assistant.

```yaml
services:
  playlistdl:
    build: .
    ports:
      - "4827:5000"
    environment:
      - ADMIN_USERNAME=admin
      - ADMIN_PASSWORD=changeme
      - AUDIO_DOWNLOAD_PATH=/downloads
      - CLEANUP_INTERVAL=300
```

## Configuration

The add-on reads its options from Home Assistant and maps them to the following environment variables:

- `ADMIN_USERNAME`
- `ADMIN_PASSWORD`
- `AUDIO_DOWNLOAD_PATH`
- `CLEANUP_INTERVAL`

For admin downloads, the recommended storage path is `/share/playlistdl` so the files remain persistent across restarts.
