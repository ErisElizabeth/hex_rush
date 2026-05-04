# hex rush v6.7

A small embeddable HTML canvas game inspired by classic reflex Flash games. It uses only static files, so it can be hosted on most websites without a build step.

## v6.7 changes

- high score actively retreives from Supabase on page load, play start, loss, and after saving a name
- loss screen checks the shared database before deciding if this player beat the high score

## v6.6 changes

- high score can load/save from Supabase so all users see the same score
- localStorage stays as the fallback if database is not available

## Supabase setup

Run this in the Supabase SQL editor:

```sql
create table if not exists public.hex_rush_score (
  id integer primary key,
  high_score integer not null default 0,
  player_name text not null default '',
  updated_at timestamptz not null default now()
);

insert into public.hex_rush_score (id, high_score, player_name)
values (1, 0, '')
on conflict (id) do nothing;

alter table public.hex_rush_score enable row level security;

drop policy if exists "hex rush public read" on public.hex_rush_score;
create policy "hex rush public read"
on public.hex_rush_score
for select
to anon
using (id = 1);

drop policy if exists "hex rush public higher score update" on public.hex_rush_score;
create policy "hex rush public higher score update"
on public.hex_rush_score
for update
to anon
using (id = 1)
with check (id = 1);
```

The game only sends an update when its local score is higher than the loaded high score.

## v6.5 changes

- added a smaller text under high score with the high score person's name
- added if a person beats the high score, can enter their name in the loss screen
- will be displayed on the loss screen under `[high score]`
- limit 40 charactors, allow all letters, numbers,  and `@_():/"'-=+$%#!.,;*&[]{}`

## v6.3 changes

- forced mobile devices into landscape (trust me)
- from the first second of game play, in addition to collecting hexagons, the score automatically goes up 1 point
- then another point every 5 secons after that
- increase speed of that score going up by 10% for every 100 poins scored
- garamond wasnt working, back to the origanal font
- mobile rotate prompt removed, restored normal mobile behavior

## v6.2 changes

- the 35% decrease was a mistake, fixing it

## v6.1 changes

- changed red circles to dark circles
- collecttor hexagon spin is increasing too fast, reduced to 7% of before
- changed entrence screen text to `collect dark hexagons` / `avoid red ones`
- changed all font to Garamond for shits and giggles
- increased frequency of circles from 1:22 to 1:14
- dialed down the speed up by 335%

## v6.0 changes

- added red circles that slow game play down 25% very 1 for every 22 red hexagon
- gameplay speeds back up as before from the new point
- circle hitbox is 50% size of collector hex

## v5.2 changes

- upon restarting the game from the `loss` screen
- the cursor dipped down to the bottom of the screen
- patched the error by restarting in the middle of the screen

## v5.1 changes

- Changed center score to `#d9d9d9`
- Eliminated `score`, `best`, and `pause` from the visible UI
- Eliminated `game over`; the center score becomes `#f5f5f5`
- Added a 20% zoom on the center score upon a loss
- Added `high score: [high_score]` below the score on the loss screen at 50% size
- Moved the `again?` button lower
- Eliminated capital letters throughout the visible game UI
- Increased background hexagon size by 300%

## V5.0 Changes

- Added very muted score in the middle of the screen `#8A8A8A`
- Changed the texture of the background to a dark honeycomb hex patern in muted tones
- Set background to `#0A0A0A` and boarders to `#303030`
- Changed Play and Again? buttons to `#252525`
- Changed `Play Again` to `Again?`

## V4.2 Changes

- Fixed the touchscreen case where holding the screen during game over could automatically restart
- Tracks active touches while the game is running
- Blocks the old touch release from becoming a Play Again click
- how to get this to behave on a touchscreen???

## V4.1 Changes

- Fixed mobile auto-restart after losing
- Pointer movement can still start the first game
- After game over, Play Again now needs an actual click/tap
- ohh, I'm dumb, it must be about the "no need to click" to move the cursur function

## V4.0 Changes

- Added lost-state audio
- If the player looses during the normal intro, the game swaps to `hex_audio_intro_lost.mp3` at the same file time
- If the player looses during the normal loop, the game swaps to `hex_audio_loop_lost.ogg` at the same file time
- `hex_audio_intro_lost.mp3` is followed by the continuous lost loop
- If the player chooses to play again in the same window, the music swaps back to the matching normal file at the same file time
- Fingers crossed let's see

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
- `hex_audio_intro_lost.mp3` - lost intro audio
- `hex_audio_loop_lost.ogg` - lost looping audio

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
