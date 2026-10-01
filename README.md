# Kestrel – wallet home screen

Pixel-measured clone of a crypto wallet home screen at iPhone 16 Pro size (402 x 874 pt, 3x).

## Run

Serve the folder over HTTP (the font and price APIs need a real origin):

    python3 serve.py 8770

(`serve.py` is a plain static server that adds no-cache headers so the iPhone always loads the latest files.)

Then open http://localhost:8770 on your Mac, or http://<your-mac-ip>:8770 on your iPhone
(add it to the Home Screen for a fullscreen, status-bar-free version).

## Features

- Tap the Cash card or any token row to edit SOL, USDC, BTC, ETH, ZEC, HYPE and cash amounts.
  Dollar values, the daily +/- and the percentage are recalculated and saved in the browser.
  BTC, ETH, ZEC and HYPE rows appear once their amount is above zero; rows sort by value.
- Token prices and perp 24h changes (BTC, ETH, ZEC, HYPE, CL) come from Hyperliquid; the
  direction of USDC's daily move comes from CoinGecko. Everything refreshes every 30 seconds.
- Tap the avatar for the side drawer, the + button for the action sheet.
- Launch intro: `splash.html` (purple splash, 1s) -> home. `faceid.html` (simulated Dynamic Island Face ID)
  is parked and not in the flow; see the comment in `splash.html` to re-enable it.
  They are separate pages because iOS 26 samples each page's colour once for the status bar strip.
- Add `?state=drawer|actions|sheet|bottom|perps` to the URL to open a state directly (skips the intro);
  `faceid.html?state=faceid|facescan|faceok` freezes a Face ID step.

## Layout

- `index.html`, `css/styles.css`, `js/app.js` – the app
- `fonts/SF-Pro.ttf` – SF Pro copied from macOS, used at the Display optical size like the original
- `assets/` – logos and icons cropped from the original screenshots
- `reference/` – the original screenshots
