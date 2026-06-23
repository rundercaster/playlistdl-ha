from flask import Flask, send_from_directory, jsonify, request, Response
import subprocess
import os
import zipfile
import uuid
import shutil
import threading
import time
import re

app = Flask(__name__, static_folder='web')
BASE_DOWNLOAD_FOLDER = '/app/downloads'
AUDIO_DOWNLOAD_PATH = os.getenv('AUDIO_DOWNLOAD_PATH', '/media')
CLEANUP_INTERVAL = os.getenv('CLEANUP_INTERVAL', '300')

os.makedirs(BASE_DOWNLOAD_FOLDER, exist_ok=True)
os.makedirs(AUDIO_DOWNLOAD_PATH, exist_ok=True)


@app.route('/')
def serve_index():
    return send_from_directory(app.static_folder, 'index.html')


@app.route('/<path:path>')
def serve_static(path):
    return send_from_directory(app.static_folder, path)


@app.route('/config')
def get_config():
    return jsonify({"download_path": AUDIO_DOWNLOAD_PATH})


@app.route('/download')
def download_media():
    spotify_link = request.args.get('spotify_link')
    if not spotify_link:
        return jsonify({"status": "error", "output": "No link provided"}), 400

    session_id = str(uuid.uuid4())
    temp_download_folder = os.path.join(BASE_DOWNLOAD_FOLDER, session_id)
    os.makedirs(temp_download_folder, exist_ok=True)

    if "spotify" in spotify_link:
        command = [
            'spotdl',
            '--output', f"{temp_download_folder}/{{artist}}/{{album}}/{{title}}.{{output-ext}}",
            spotify_link
        ]
    else:
        command = [
            'yt-dlp', '-x', '--audio-format', 'mp3',
            '-o', f"{temp_download_folder}/%(uploader)s/%(album)s/%(title)s.%(ext)s",
            spotify_link
        ]

    return Response(generate(command, temp_download_folder), mimetype='text/event-stream')


def generate(command, temp_download_folder):
    album_name = None
    try:
        process = subprocess.Popen(command, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)

        for line in process.stdout:
            print(f"▶️ {line.strip()}")
            yield f"data: {line.strip()}\n\n"

            match = re.search(r'Found \d+ songs in (.+?) \\(', line)
            if match:
                album_name = match.group(1).strip()

        process.stdout.close()
        process.wait()

        if process.returncode != 0:
            yield f"data: Error: Download exited with code {process.returncode}.\\n\\n"
            return

        downloaded_files = []
        for root, _, files in os.walk(temp_download_folder):
            for file in files:
                full_path = os.path.join(root, file)
                downloaded_files.append(full_path)

        valid_audio_files = [f for f in downloaded_files if f.lower().endswith(('.mp3', '.m4a', '.flac', '.wav', '.ogg'))]

        if not valid_audio_files:
            yield f"data: Error: No valid audio files found. Please check the link.\\n\\n"
            return

        moved_paths = []
        for file_path in valid_audio_files:
            relative_path = os.path.relpath(file_path, temp_download_folder)
            target_path = os.path.join(AUDIO_DOWNLOAD_PATH, relative_path)
            os.makedirs(os.path.dirname(target_path), exist_ok=True)
            try:
                shutil.move(file_path, target_path)
                moved_paths.append(relative_path)
            except Exception as move_error:
                print(f"❌ Failed to move {file_path} to {target_path}: {move_error}")

        shutil.rmtree(temp_download_folder, ignore_errors=True)

        if len(moved_paths) > 1:
            zip_filename = f"{album_name}.zip" if album_name else "playlist.zip"
            zip_path = os.path.join(AUDIO_DOWNLOAD_PATH, zip_filename)
            with zipfile.ZipFile(zip_path, 'w', zipfile.ZIP_DEFLATED) as zipf:
                for relative_path in moved_paths:
                    full_path = os.path.join(AUDIO_DOWNLOAD_PATH, relative_path)
                    zipf.write(full_path, arcname=relative_path)

            from urllib.parse import quote
            yield f"data: DOWNLOAD: /files/{quote(zip_filename)}\\n\\n"
        else:
            from urllib.parse import quote
            relative_path = moved_paths[0].replace(os.sep, '/')
            encoded_path = quote(relative_path)
            yield f"data: DOWNLOAD: /files/{encoded_path}\\n\\n"

        yield f"data: Download completed. Files saved to {AUDIO_DOWNLOAD_PATH}.\\n\\n"

    except Exception as e:
        yield f"data: Error: {str(e)}\\n\\n"


def delayed_delete(folder_path):
    try:
        delay = int(CLEANUP_INTERVAL)
    except ValueError:
        delay = 300
    time.sleep(delay)
    shutil.rmtree(folder_path, ignore_errors=True)


@app.route('/files/<path:filename>')
def serve_download(filename):
    if ".." in filename or filename.startswith("/"):
        return "Invalid filename", 400

    full_path = os.path.join(AUDIO_DOWNLOAD_PATH, filename)
    if not os.path.isfile(full_path):
        return "File not found", 404

    return send_from_directory(AUDIO_DOWNLOAD_PATH, filename, as_attachment=True)


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)