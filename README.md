# נשימה · Yoga PWA

A personal Hebrew (RTL) yoga app, built as a gift. Static files only, no build step, hosted on GitHub Pages and installable as a PWA.

## What's inside
- **8 guided routines** (morning, sun salutation ×3, healthy back, bedtime, hips, strength & balance, 5 minutes, gentle) with a session player: animated figure that morphs between poses, countdown ring, Hebrew voice cues (if the device has a Hebrew voice), bells, vibration, screen wake lock, right/left sides, short/normal/long length.
- **38-pose library**: animated figures, steps, benefits, cautions, search, categories, favourites, "practise this pose now".
- **Custom flow builder**.
- **Breathing**: box, 4-7-8, coherent, long exhale, energising, with an animated breathing orb.
- **Meditation timer**: interval bells and synthesised ambient sound (waves, rain, deep tone).
- **Progress**: weekly goal ring, streak (Shabbat doesn't break it, optional), week chart, 18-week heatmap, 18 badges, journal with mood and notes, confetti.
- **Settings**: goal, sounds, voice, theme (auto/light/dark), pregnancy mode (flags poses that need adapting), daily calendar reminder (.ics), backup export/import.

All data stays in the phone's localStorage. Nothing is sent anywhere.

## Personalise
Edit `js/config.js` (the gift note, signature and app name). Bump `CACHE` in `sw.js` when you change files so installed copies update.

## Run locally
```
python -m http.server 8790
```
Open http://127.0.0.1:8790. The service worker only registers on HTTPS (GitHub Pages).

## Not verified
Tested in headless Edge at 320 and 390 px (all screens, a full session, toggles, dark mode). Not tested on a real iPhone or Android, real Hebrew speech, real vibration, or home-screen install.

General guidance, not medical advice. The pose cautions and pregnancy flags have not been reviewed by a yoga teacher or clinician.
