# Hex Rush

A small embeddable HTML canvas game inspired by classic reflex Flash games. It uses only static files, so it can be hosted on most websites without a build step.

## Files

- `index.html` - page shell and HUD
- `styles.css` - responsive full-screen game styling
- `game.js` - game loop, controls, scoring, collision, and rendering

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

- Mouse, touch, or stylus: press and drag to steer the player hexagon
- Keyboard: WASD or arrow keys
- Space: start or pause

