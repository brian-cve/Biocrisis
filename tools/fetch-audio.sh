#!/bin/zsh
# Rebuilds public/audio from the CC0 sources listed in public/audio/CREDITS.md.
# macOS only (uses afconvert). Usage: tools/fetch-audio.sh
set -e
OUT="$(cd "$(dirname "$0")/.." && pwd)/public/audio"
TMP="$(mktemp -d)"
B=https://opengameart.org/sites/default/files
mkdir -p "$OUT/sfx" "$OUT/music"
cd "$TMP"

get() { curl -sfLo "$2" "$B/$1"; }
wav() { afconvert -f WAVE -d LEI16@22050 -c 1 "$1" "$OUT/sfx/$2.wav"; }   # mono, 22 kHz
m4a() { afconvert -f m4af -d aac -b "$3" -c "${4:-2}" "$1" "$OUT/music/$2.m4a"; }

# guns
get sounds.zip sounds.zip && unzip -qo sounds.zip
python3 - <<'PY'
import wave
def cut(src, dst, a, b):
    r = wave.open(src); rate = r.getframerate(); r.setpos(int(a * rate)); data = r.readframes(int((b - a) * rate))
    w = wave.open(dst, 'wb'); w.setparams(r.getparams()); w.writeframes(data); w.close()
cut('sounds/cz.wav', 'pistol_raw.wav', 0.25, 1.4)
PY
wav pistol_raw.wav pistol
wav sounds/shotty.wav shotgun
get reload.wav reload.wav && wav reload.wav reload
get shotgunsounds.zip shotgunsounds.zip && unzip -qo shotgunsounds.zip
wav "ShotgunSounds/Rack.mp3" shotgun_rack
wav "ShotgunSounds/First Shell.mp3" shotgun_shell1
wav "ShotgunSounds/Subsequent Shells.mp3" shotgun_shell2

# zombies
get zombies.zip zombies.zip && unzip -qo zombies.zip
for i in {1..24}; do wav zombies/zombie-$i.wav zombie_$i; done

# heartbeat
get heartbeat_slow_0.wav hb_slow.wav; get heartbeat_fast_0.wav hb_fast.wav
wav hb_slow.wav heartbeat_slow; wav hb_fast.wav heartbeat_fast

# environment, doors, items (sfx_100_v2) and footsteps; ogg is copied untouched
get sfx_100_v2.zip sfx.zip && unzip -qo sfx.zip
for n in door_01 door_02 door_03 lock_open_01 thunder_01 items_01 items_02 switch_01 switch_02 hit_01 footstep_01 footstep_02 footstep_wood_01 footstep_wood_02 footstep_wet_01; do
  cp "sfx100v2_$n.ogg" "$OUT/sfx/$n.ogg"
done

# music
get safe_space_loop.flac safe.flac && m4a safe.flac explore 96000
get Horror_2.mp3 horror.mp3 && m4a horror.mp3 menu 64000
get Chase.mp3 chase.mp3 && m4a chase.mp3 chase 80000
get freezer_0.ogg freezer.ogg && cp freezer.ogg "$OUT/music/wind.ogg"
rm -rf "$TMP"
