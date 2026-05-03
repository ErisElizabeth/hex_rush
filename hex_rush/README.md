# Hex Rush V3.2

A small embeddable HTML canvas game inspired by classic reflex Flash games. It uses only static files, so it can be hosted on most websites without a build step.

## V3.2 Changes

- Reduced volume by 40%
- Increased speed of black hexagons entering another 25%

## V3.1 Changes

- Fixed the little audio skip by scheduling the loop after the intro with Web Audio when possible
- Made the sound code cleaner with one music controller
- Kept HTML audio as a backup plan for browsers or local file paths that are picky

## V3.0 Changes

- Added sound
- "Digital Adrenaline" Top-Flow pixabay.com
- `hex_audio_intro.mp3` plays first
- `hex_audio_loop.ogg` plays in a continuous loop after that

## V2.0 Changes

- Removed the blue and yellow hexagons
- Black hexagons now travel in a linear fasion, only on the x and y axis
- All entering hexagons are 25% faster
- The main collecter hexagone moves without mouseclicks and becomes the cursor

## Files

- `index.html` - page shell and HUD
- `styles.css` - responsive full-screen game styling
- `game.js` - game loop, controls, scoring, collision, and rendering
- `hex_audio_intro.mp3` - intro audio
- `hex_audio_loop.ogg` - looping audio

## Embed

Upload the folder to your site, then embed it with an iframe:

```html
<iframe
  src="/games/hex-rush/index.html"
  title="Hex Rush"
  style="width:100%;height:720px;border:0;display:block;"
  allow="fullscreen"
></iframe>
```

For mobile pages, put the iframe in a container that has a stable height, such as `height: 100svh` for a full-screen game page.

## Controls

- Mouse, touch, or stylus: move over the game and the collecter hexagone follows
- Keyboard: WASD or arrow keys
- Space: start or pause
