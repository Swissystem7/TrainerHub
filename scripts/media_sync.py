#!/usr/bin/env python3
"""Add hosted MP4 copies of new Drive clips to Swissystem7/TrainerHub-media.

Drive stays the source of truth. For every Drive id the app plays
(videos/drive-catalog.json and data/drive_videos.json) that is not yet in
videos/media-manifest.json, this script downloads the Drive file, transcodes it
(H.264/AAC, short side 360, faststart), writes it to <media-clone>/<folder>/<id>.mp4,
commits + pushes the media repo, tags it (v<N+1>) for jsDelivr, and updates the
manifest here (files + the pinned jsDelivr tag). Commit the manifest in a
TrainerHub PR afterwards.

Usage:  python3 scripts/media_sync.py /path/to/TrainerHub-media-clone [--no-push]
Needs:  ffmpeg, git, push access to the media repo.
"""
import json, os, re, subprocess, sys, urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, 'videos', 'media-manifest.json')
PAGES = 'https://swissystem7.github.io/TrainerHub-media/'
CDN = 'https://cdn.jsdelivr.net/gh/Swissystem7/TrainerHub-media@%s/'
FOLDER_HE = {'ידיים': 'arms', 'בטן': 'core', 'חזה': 'chest', 'גב': 'back', 'כתפיים': 'shoulders',
             'רגליים': 'legs', 'גוף מלא HIIT': 'full', 'חימום': 'warmup', 'קרדיו': 'cardio',
             'מתיחות וגמישות': 'mobility', 'זמן תגובה וקאורדינצייה': 'agility'}
FFMPEG_ARGS = ['-map', '0:v:0', '-map', '0:a:0?',
               '-vf', "scale='if(gt(iw,ih),-2,min(360,iw))':'if(gt(iw,ih),min(360,ih),-2)'",
               '-c:v', 'libx264', '-preset', 'slow', '-crf', '28', '-maxrate', '800k', '-bufsize', '1600k',
               '-profile:v', 'main', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', '-c:a', 'aac', '-b:a', '56k']
MAX_BYTES = 50 * 1000 * 1000


def wanted():
    out = {}
    cat = json.load(open(os.path.join(ROOT, 'videos', 'drive-catalog.json')))['items']
    cat += list(json.load(open(os.path.join(ROOT, 'js', 'catalog.json'))).values())
    for e in cat:
        if e.get('available') is False:
            continue
        pid = e.get('drivePlayId') if (str(e.get('file', '')).startswith('http') and e.get('drivePlayId')) else e.get('driveId')
        if pid:
            m = re.sub(r'[^a-z0-9_-]', '', ((e.get('muscles') or ['other'])[0]).lower()) or 'other'
            out.setdefault(pid, m)
    for x in json.load(open(os.path.join(ROOT, 'data', 'drive_videos.json'))):
        out.setdefault(x['fileId'], FOLDER_HE.get(x.get('muscleGroup'), 'other'))
    return out


def transcode(pid, dest):
    src = dest + '.src'
    urllib.request.urlretrieve('https://drive.usercontent.google.com/download?id=%s&export=download&confirm=t' % pid, src)
    subprocess.run(['ffmpeg', '-y', '-v', 'error', '-i', src] + FFMPEG_ARGS + [dest + '.tmp.mp4'], check=True)
    os.remove(src)
    os.replace(dest + '.tmp.mp4', dest)
    if os.path.getsize(dest) > MAX_BYTES:
        raise SystemExit('%s is over 50 MB after transcoding; trim it first' % pid)


def main():
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    media = sys.argv[1]
    push = '--no-push' not in sys.argv
    man = json.load(open(MANIFEST))
    todo = {pid: f for pid, f in wanted().items() if pid not in man['files']}
    print('new clips:', len(todo))
    if not todo:
        return
    for pid, folder in todo.items():
        rel = '%s/%s.mp4' % (folder, pid)
        os.makedirs(os.path.join(media, folder), exist_ok=True)
        if not os.path.exists(os.path.join(media, rel)):
            transcode(pid, os.path.join(media, rel))
        man['files'][pid] = rel
        print('ok', rel)
    git = lambda *a: subprocess.run(['git', '-C', media] + list(a), check=True, capture_output=True, text=True).stdout
    git('add', '-A')
    git('commit', '-m', 'Add %d clips' % len(todo))
    tags = [t for t in git('tag').split() if re.fullmatch(r'v\d+', t)]
    tag = 'v%d' % (max([int(t[1:]) for t in tags] or [0]) + 1)
    git('tag', tag)
    if push:
        git('push', 'origin', 'HEAD')
        git('push', 'origin', tag)
    man['hosts'] = [PAGES, CDN % tag]
    man['files'] = dict(sorted(man['files'].items()))
    with open(MANIFEST, 'w') as fh:
        json.dump(man, fh, indent=1, ensure_ascii=False)
        fh.write('\n')
    print('manifest updated, jsDelivr tag', tag)


if __name__ == '__main__':
    main()
