#!/usr/bin/env python3
"""Process data/reels_queue.json: download pending reels with yt-dlp, upload to the
Drive fitness folder (subfolder per muscle group), append to data/drive_videos.json
and mark queue items done/failed. Never deletes anything.

Queue item: {"url": "...", "group": "רגליים", "title": "optional Hebrew name"}
"""
import json, os, re, subprocess, sys, glob, datetime

QUEUE = "data/reels_queue.json"
VIDEOS = "data/drive_videos.json"
ROOT_FOLDER = os.environ.get("DRIVE_ROOT_FOLDER_ID", "1_Fh--5TnELtWLHvy1R_lnN1xAq17ZgYA")
WORK = "/tmp/reels"


def load(p, default):
    if not os.path.exists(p):
        return default
    with open(p, encoding="utf-8") as f:
        return json.load(f)


def save(p, data):
    with open(p, "w", encoding="utf-8") as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
        f.write("\n")


def reel_id(url):
    m = re.search(r"/(?:reel|reels|p|tv|shorts)/([A-Za-z0-9_-]+)", url)
    return m.group(1) if m else re.sub(r"\W", "", url)[-11:]


def download(url, rid):
    os.makedirs(WORK, exist_ok=True)
    cmd = ["yt-dlp", "--no-playlist", "-f", "bv*+ba/b", "--merge-output-format", "mp4",
           "-o", f"{WORK}/{rid}.%(ext)s", "--print-json", "--no-simulate", url]
    if os.path.exists("/tmp/ig_cookies.txt"):
        cmd[1:1] = ["--cookies", "/tmp/ig_cookies.txt"]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError((r.stderr or r.stdout).strip().splitlines()[-1][:300])
    info = json.loads(r.stdout.strip().splitlines()[-1])
    files = glob.glob(f"{WORK}/{rid}.mp4") or glob.glob(f"{WORK}/{rid}.*")
    if not files:
        raise RuntimeError("download produced no file")
    return files[0], info


def drive():
    from google.oauth2.credentials import Credentials
    from googleapiclient.discovery import build
    creds = Credentials(None, refresh_token=os.environ["GDRIVE_REFRESH_TOKEN"],
                        client_id=os.environ["GDRIVE_CLIENT_ID"],
                        client_secret=os.environ["GDRIVE_CLIENT_SECRET"],
                        token_uri="https://oauth2.googleapis.com/token",
                        scopes=["https://www.googleapis.com/auth/drive"])
    return build("drive", "v3", credentials=creds, cache_discovery=False)


_folders = {}
def group_folder(svc, group):
    if group in _folders:
        return _folders[group]
    q = (f"'{ROOT_FOLDER}' in parents and name = '{group}' and "
         "mimeType = 'application/vnd.google-apps.folder' and trashed = false")
    res = svc.files().list(q=q, fields="files(id)", supportsAllDrives=True,
                           includeItemsFromAllDrives=True).execute().get("files", [])
    if res:
        fid = res[0]["id"]
    else:
        fid = svc.files().create(body={"name": group, "parents": [ROOT_FOLDER],
                                       "mimeType": "application/vnd.google-apps.folder"},
                                 fields="id", supportsAllDrives=True).execute()["id"]
    _folders[group] = fid
    return fid


def upload(svc, path, name_mp4, group):
    from googleapiclient.http import MediaFileUpload
    parent = group_folder(svc, group)
    # Upload as .mov (video/quicktime) then rename to .mp4 - plays best in Drive.
    media = MediaFileUpload(path, mimetype="video/quicktime", resumable=True)
    f = svc.files().create(body={"name": name_mp4[:-4] + ".mov", "parents": [parent]},
                           media_body=media, fields="id", supportsAllDrives=True).execute()
    svc.files().update(fileId=f["id"], body={"name": name_mp4}, supportsAllDrives=True).execute()
    try:
        svc.permissions().create(fileId=f["id"], body={"type": "anyone", "role": "reader"},
                                 supportsAllDrives=True).execute()
    except Exception as e:  # sharing policy may forbid; not fatal
        print("warn: could not set link sharing:", e)
    return f["id"]


def main():
    test_url = os.environ.get("TEST_URL", "").strip()
    if test_url:
        try:
            path, info = download(test_url, reel_id(test_url))
            print(f"TEST OK: {path} {os.path.getsize(path)} bytes, duration={info.get('duration')}")
        except Exception as e:
            print("TEST FAILED:", e)
            sys.exit(1)
        return

    queue = load(QUEUE, [])
    pending = [q for q in queue if q.get("status") in (None, "", "pending")]
    if not pending:
        print("nothing pending")
        return
    videos = load(VIDEOS, [])
    known = {v.get("name", "").rsplit(" - ", 1)[-1][:-4] for v in videos}
    svc = drive()
    now = datetime.datetime.utcnow().strftime("%Y-%m-%dT%H:%MZ")
    for item in pending:
        url, group = item.get("url", ""), (item.get("group") or "").strip()
        rid = reel_id(url)
        item["processedAt"] = now
        if not url or not group:
            item["status"], item["error"] = "failed", "missing url or group"
            continue
        if rid in known:
            item["status"], item["error"] = "skipped", "already in drive_videos.json"
            continue
        try:
            path, info = download(url, rid)
            title = (item.get("title") or info.get("title") or rid).strip()
            title = re.sub(r'[\\/:*?"<>|\n\r]+', " ", title)[:80].strip()
            name = f"{title} - {rid}.mp4"
            fid = upload(svc, path, name, group)
            videos.append({"fileId": fid, "name": name, "folder": f"כושר/{group}",
                           "muscleGroup": group})
            known.add(rid)
            item["status"], item["fileId"] = "done", fid
            item.pop("error", None)
            print("done:", name)
        except Exception as e:
            item["status"], item["error"] = "failed", str(e)[:300]
            print("failed:", url, e)
    save(VIDEOS, videos)
    save(QUEUE, queue)


if __name__ == "__main__":
    main()
