# Streamline

This is the COMBINED project — web source AND the native Android project,
already sitting correctly together in one place. Follow the steps below in
order; don't skip the `pnpm install` step even though `android/` already
exists — Capacitor's Android project needs `node_modules` sitting alongside
it to resolve correctly, which is exactly what caused earlier errors when
`android/` was extracted on its own.

## Setup — do this once

1. Extract this whole zip into a clean folder (e.g. `C:\Users\yourname\StreamlineApp`)
2. Open a terminal **inside that folder** (confirm with `dir` — you should see `package.json` AND `android` both listed)
3. Run:
   ```
   pnpm install
   ```
4. Open Android Studio → **File → Open** → select the `android` folder inside this same project → Open as Project
5. Let Gradle sync (first time takes a few minutes)
6. Set up an emulator or connect your phone (Device Manager in Android Studio)
7. Hit the green **▶ Run** button

That's it — this should launch the app.

## Making updates after this point

Whenever the app's source code changes (`src/App.jsx`):

```
pnpm run build
npx cap sync
```

Then just hit **Run ▶** again in Android Studio. No need to re-extract anything or go back to Replit — this loop is now fully local.

---

A paycheck planning, debt payoff, and budgeting app.

## Project structure

```
streamline/
├── index.html          # Entry HTML — viewport/meta tags for mobile correctness
├── package.json         # Dependencies: React + Vite
├── vite.config.js       # Build config
├── src/
│   ├── main.jsx         # Mounts the app
│   ├── App.jsx           # The entire app (single component, as built)
│   └── index.css        # Minimal global reset
└── public/
    ├── manifest.json    # PWA manifest (needed for Google Play TWA path)
    ├── icon-192.png      # App icon, 192×192
    ├── icon-512.png      # App icon, 512×512
    └── apple-touch-icon.png  # App icon, 180×180 (iOS home screen)
```

## Running it locally

You'll need [Node.js](https://nodejs.org) (18+) installed on your machine.

```bash
npm install
npm run dev
```

This starts a local dev server (usually `http://localhost:5173`) with hot-reload — edit `src/App.jsx` and see changes instantly.

## Building for production

```bash
npm run build
```

Outputs a deployable static site to `dist/`. This is what you'd point Vercel, Netlify, or any static host at.

---

## Next steps toward the App Store

**1. Deploy the web version first.** Push this to Vercel or Netlify (both have free tiers, both auto-detect Vite projects with zero config) so you have a real, working URL. This is worth doing even before touching native app stuff — it's the fastest way to test on a real phone.

**2. Replace the placeholder icons.** The icons in `public/` right now are a simple rasterized approximation of the logo mark, generated as a placeholder. Before submitting anywhere, export proper icon sets from the actual vector logo at full required resolution (App Store needs a 1024×1024 source; Google Play needs 512×512 minimum).

**3. Wrap it with Capacitor for native builds:**

```bash
npm install @capacitor/core @capacitor/cli
npx cap init Streamline com.yourcompany.streamline
npm run build
npx cap add ios
npx cap add android
npx cap sync
```

This generates real `ios/` and `android/` native project folders. From there:
- **iOS**: open `ios/App/App.xcworkspace` in Xcode, which requires a Mac and a free or paid Apple Developer account to run on a real device or simulator (paid $99/year account required to submit to the App Store).
- **Android**: open `android/` in Android Studio.

**4. Accounts you'll need before submitting:**
- Apple Developer Program — $99/year
- Google Play Developer account — $25 one-time

**5. Required before either store will accept a submission:**
- A privacy policy (hosted at a real URL — even local-only storage requires disclosing what data the app touches)
- App Store screenshots for each required device size
- Google Play's Data Safety form / Apple's Privacy Nutrition Label — both ask what data the app collects, even if the honest answer is "none, everything stays on-device"

## Notes on the app itself

- All data is currently stored in `localStorage` — nothing leaves the device. Worth confirming this is still true if/when account creation is added later, since that changes the privacy disclosures required above.
- The app already includes mobile-specific handling (safe-area insets, touch target sizing, momentum scroll, iOS zoom prevention on inputs) — this should translate cleanly into the Capacitor-wrapped native shell without extra native code.
