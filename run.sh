#!/bin/sh
set -eu

CONFIG_FILE=/data/options.json

get_option() {
  key="$1"
  default_value="$2"
  python3 - "$CONFIG_FILE" "$key" "$default_value" <<'PY'
import json
import sys

config_path, key, default_value = sys.argv[1], sys.argv[2], sys.argv[3]

try:
    with open(config_path, "r", encoding="utf-8") as handle:
        data = json.load(handle)
except (FileNotFoundError, json.JSONDecodeError):
    print(default_value)
    sys.exit(0)

value = data.get(key, default_value)
if value is None:
    value = default_value
print(value)
PY
}

ADMIN_USERNAME=$(get_option "admin_username" "admin")
ADMIN_PASSWORD=$(get_option "admin_password" "changeme")
AUDIO_DOWNLOAD_PATH=$(get_option "audio_download_path" "/share/playlistdl")
CLEANUP_INTERVAL=$(get_option "cleanup_interval" "300")

mkdir -p "${AUDIO_DOWNLOAD_PATH}"
export ADMIN_USERNAME ADMIN_PASSWORD AUDIO_DOWNLOAD_PATH CLEANUP_INTERVAL

echo "Starting Audio Downloader..."
echo "Download path: ${AUDIO_DOWNLOAD_PATH}"
echo "Cleanup interval: ${CLEANUP_INTERVAL}s"

exec python3 /app/main.py
