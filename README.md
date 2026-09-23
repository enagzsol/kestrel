# Kestrel – wallet home screen

Pixel-measured clone of a crypto wallet home screen at iPhone 16 Pro size (402 x 874 pt, 3x).

## Run

Serve the folder over HTTP (the font and price APIs need a real origin):

    python3 serve.py 8766

(`serve.py` is a plain static server that adds no-cache headers so the iPhone always loads the latest files.)

Then open http://localhost:8766 on your Mac, or http://<your-mac-ip>:8766 on your iPhone
(add it to the Home Screen for a fullscreen, status-bar-free version).

## Features

- Tap the Cash card or any token row to edit SOL, USDC and cash amounts. Dollar values,
  the daily +/- and the percentage are recalculated and saved in the browser.
- SOL and USDC prices come from CoinGecko; perp 24h changes (BTC, ETH, ZEC, HYPE, CL)
  come from Hyperliquid. Everything refreshes every 30 seconds.
- Tap the avatar for the side drawer, the + button for the action sheet.
- Add `?state=drawer|actions|sheet|bottom|perps` to the URL to open a state directly.

## Layout

- `index.html`, `css/styles.css`, `js/app.js` – the app
- `fonts/SF-Pro.ttf` – SF Pro copied from macOS, used at the Display optical size like the original
- `assets/` – logos and icons cropped from the original screenshots
- `reference/` – the original screenshots
