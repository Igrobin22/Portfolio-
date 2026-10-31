# Animated homepage hero

The marked homepage tagline, headline, paragraph, scroll label and rotating blueprint are replaced with the approved NVISUALS composition. The existing navigation, opening splash, Work/Contact destinations and remaining page sections are retained.

The hero contains the green grid, responsive heading, code-animated character, decorated app icons, floating vectors, proximity response, subtle text energy and experience callout. Themadi is used up to 700 px and Delirium above that. The text slides up 150 ms before the character; icons follow and decorative shapes appear afterward. The entrance waits for the existing opening splash. A small pause button controls the hero, and animation pauses offscreen or on other pages.

The standalone preview controls and mobile experimental copy were outside the marked replacement area and are not included. The original button destinations are connected to the site's existing router.

## Files

- `index.html`: homepage hero markup and script/style references; obsolete blueprint markup, styling and controller removed.
- `assets/nvisuals-hero/hero-layout.css`: hero-only responsive layout and typography.
- `assets/nvisuals-hero/hero-effects.css`: scoped decorative, proximity, callout and entrance styles.
- `assets/nvisuals-hero/hero-site.js`: integration with font sizing, the opening splash, visibility, and pause state.
- Other assets in that directory are copied from the approved local prototype. Font source/license records are retained alongside the files. This local integration does not establish any new font license.
- `tools/prepare-hero-assets.py`: refresh assets/effect styles from a supplied prototype directory without replacing an already integrated page.
- `tools/responsive-review.html`: side-by-side phone frames for local review.

## Preview

From this directory, run `python -m http.server 4189 --bind 127.0.0.1` and open `http://127.0.0.1:4189/`. The mobile review is at `/tools/responsive-review.html`.

## Validation — 28 October 2026

- Inspected the desktop homepage and both phone frames. Both mobile layouts selected Themadi and had matching viewport/document widths (304 px and 374 px usable content inside 320/390 px frames with desktop scrollbars).
- View Work opened the original portfolio page. The logo returned home, and Start a Project scrolled to the existing Contact form. No form was submitted.
- Hero motion paused when navigating away or scrolling to Contact; the pause button toggled playback.
- The experience callout opened in the phone frame and dismissed with Escape. Desktop pointer input revealed the local Soft aura effect.
- Character, heading, icons and vector assets loaded, and the entrance reached its completed state after the original splash. The browser reported no errors or warnings.
- New JavaScript syntax and Git whitespace checks passed. Navigation and content after the hero were checked against the original source.

Prepared on `codex/nvisuals-animated-hero` in a separate Git worktree based on `origin/main`. The primary checkout is preserved. Site deployment follows the repository's hosting configuration.

## Cloudflare deployment configuration — 29 October 2026

`wrangler.jsonc` declares the repository root as the static asset directory for the existing `portfolio` Worker. It uses the compatibility date from Cloudflare's original configuration proposal. Connected Workers Builds can override the Worker name for the second `portfolio-1` build.

`.assetsignore` excludes Git metadata, local caches, development tools and deployment configuration from the published assets. The site remains a static deployment with no Worker application script or build dependency required.

Before this configuration was added, `wrangler deploy --dry-run` failed with a missing Worker/script or assets entry point. With Wrangler 4.154.0, the normal dry run and a second dry run using `WRANGLER_CI_OVERRIDE_NAME=portfolio-1` both completed successfully.

## Animation performance — 29 October 2026

The character renderer now draws only the padded artwork region instead of the mostly transparent full composition. It keeps the original source coordinates and mesh spacing, reducing geometry from 50,400 to 16,896 triangles and the measured backing buffer from 664,092 to 197,238 pixels. Character shadows use the smaller surface as well. Motion follows each display callback instead of skipping frames unevenly on high refresh rate screens.

Pointer interaction caches geometry while its spring settles and sleeps when stationary. The opening splash also suspends hero motion until the composition can be seen.

`node --test tools/test-hero-renderer.mjs` passes four checks covering desktop/phone alignment, 60/75/144 Hz timing, pause/resume and pointer settling. JavaScript syntax and Git whitespace checks pass. These are rendering-work and scheduling checks, not a measured device FPS improvement: browser benchmarking was affected by background throttling, and further automated browser inspection was stopped because Chrome's current URL could not be verified.

## Opening slide performance — 29 October 2026

The reported remaining lag was specifically the opening slide in desktop Chrome. The entrance now waits until the splash curtain is fully hidden. It moves cached layers using transform and opacity, with temporary layer hints, while the character shader, icon drift, SVG stroke runners and pointer effects remain paused. Those effects resume after the entrance completes. The text still leads the character by 150 ms, followed by the icons and then the decorative shapes; existing font and artwork scales are preserved.

A subsequent isolated Playwright/CDP comparison at 1600 × 900 on the same Intel UHD GPU compared the published version with this change over each roughly 2.6-second entrance. The original produced 4,817 Paint events, 217 character draws and two long animation frames (the longest about 206 ms). The new version produced four Paint events, zero character draws and no long animation frames during that window. The 95th percentile interval between frame callbacks changed from 12.3 ms to 6.2 ms. These are local lab results, not a guarantee for every device.

All six Node tests pass, including splash/entrance sequencing, pause/resume, preserved scales and effect cleanup. Browser checks confirmed that ambient effects stay paused throughout entry, normal motion and Soft aura hover resume afterward, desktop uses Delirium, the 390 px mobile view uses Themadi without horizontal overflow, reduced motion skips the entrance, temporary layer hints are released, and no page script errors occur. Final desktop and mobile screenshots were inspected. The local static server's existing Cloudflare email-decoder 404 is unrelated to the hero.

## Heading flash before entry — 29 October 2026

The heading's default `#hero.nv-hero .hero-title` opacity rule outranked the initial hiding selector. While the splash curtain cleared, the heading appeared at its final position before the animation hid and slid it in. Matching the heading selector's ID specificity in the pending-state rule keeps it hidden until the existing animation takes over. The effect stylesheet URL is versioned to refresh cached CSS.

`tools/check-hero-title-visibility.cjs` runs through Playwright CLI against the local server. It samples the real computed opacity before, throughout and for 500 ms after entry. Desktop (1600 px), mobile (390 px) and reduced-motion checks pass: zero visible frames before entry, zero opacity drops, and final opacity one. The reduced-motion view remains immediately visible. The compositor animation and timing code are unchanged.

## Homepage loading and continuous motion — 31 October 2026

An uncached desktop test of the live homepage downloaded about 59.3 MB, including 57.4 MB of images and 1.8 MB of media data. Hidden portfolio pages were competing with the homepage: 42 external images had eager loading, and 16 videos did not specify a preload limit. Those images now use native lazy loading and asynchronous decoding; all videos use preload none. Hero images retain their existing priority, and full-size gallery URLs and video playback handlers stay intact.

The small SVG stroke runners also repainted every display frame through nested blur/drop-shadow filters. Decorative vectors now omit those parent filters and advance their normalized strokes in short steps (roughly 26–39 updates per second depending on the existing loop duration). Their float transforms, pointer response and continuously traveling lines remain active. Character and app-icon shadows are retained.

The updated local preview downloaded about 2.34 MB in the same desktop audit, with no video data requested on the homepage. At 1600 × 900 on an RTX 4060 Laptop GPU, the 95th percentile idle frame interval changed from 28.2 ms to 9.8 ms; hover changed from 30.5 ms to 8.3 ms. These are lab samples, not a guarantee for every visitor. The original 3.5-second brand splash remains an intentional part of the sequence.

All six Node checks pass. `tools/check-media-loading.cjs` verifies that gallery/video downloads wait, the hero retains priority, vector lines still move, the gallery opens the original image, and clicking a video plays and closes it. The standalone prototype at port 4188 has separate older source; the integrated preview is at port 4189.

## Full interaction update — 31 October 2026

The hover canvas and its glyph mask now cover only the pointer's small local region: 188 × 188 pixels at desktop DPR 1, capped at 376 × 376 at higher density. It follows display callbacks, preserves the heading's transformed glyph alignment, and caches the mask while stationary. Aura, wisps and dust remain available in the prototype.

The custom cursor coalesces pointer input into one display callback and stops scheduling once its ring settles. Its follow time is independent of refresh rate, and the ring stays centered when its hover diameter changes. Touch devices use the native cursor behavior. Proximity geometry reads are limited to four updates per second during sustained pointer input; its visible spring still updates every frame. Entering controls no longer wakes an idle proximity loop.

Ambient hero rendering pauses while the page scrolls, resumes 140 ms after input settles, and stays paused offscreen. The brand splash exits when fonts/artwork/icons are ready, after a 1.2-second minimum; the 3.5-second timer remains a failure fallback. The original hero slide durations and text's 150 ms lead are retained.

The standalone prototype at port 4188 is now synchronized with the tight renderer, cached proximity geometry, bounded hover effect and compositor entrance. Its original source is preserved in `cape-animation/references/performance-sync-20261031`. Its existing layout and font/effect controls remain available.

Ten Node tests pass, including cursor idle scheduling, sustained pointer geometry budget, readiness/fallback timing and scrolling suspension. Browser checks cover desktop DPR 1/2, touch emulation, all three prototype energy modes, pause/resume during scrolling, offscreen suspension and heading visibility. Hover screenshots were inspected. Local hero entry began around 2.4 seconds after navigation, versus roughly 5.3 seconds in the earlier live probe; this includes local/network differences and is not a universal load-time guarantee. CPU-throttled stress runs still show frame stalls, so these checks do not guarantee a fixed FPS on every device or under heavy system load.
