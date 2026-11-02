# Glass portfolio folders

The six portfolio category cards use the supplied glass-folder component. Both the homepage's Selected Work section and the dedicated Work page mount the same React component. The existing gallery pages and their hashes remain the destinations. The standalone hero preview's `site-context.html` uses a copy of the compiled assets.

## Project structure

The site originally had no React, TypeScript, Tailwind, or component directory. It now has a small Vite component build, rather than a full-page React migration. [React documents this incremental integration pattern](https://react.dev/learn/add-react-to-an-existing-project).

- `components/ui/glass-folder-cards.tsx`: reusable component and public prop types.
- `components/ui/glass-folder-cards.css`: the component's glass, hinge, file fan, menu, focus, and reduced-motion styles.
- `components/ui/glass-folder-art.ts`: the supplied seeded liquid-art generator and presets, also re-exported by the component.
- `components/ui/demo.tsx`: Add / More / Open demonstration, separate from the public portfolio.
- `src/portfolio-folders.tsx`: portfolio data adapter, responsive grid, and connection to the existing router.
- `styles/globals.css`: Tailwind v4 imports and portfolio-specific styling.
- `lib/utils.ts`: standard `cn` helper for future shadcn components.
- `components.json`: shadcn paths and theme configuration.
- `tsconfig.json`: strict TypeScript, JSX, and the `@/*` alias.
- `vite.config.ts`: the browser-only component build.
- `assets/glass-folders/`: compiled JavaScript/CSS, small loader, and prebuilt WebP artwork. These files are ready for the existing static hosting setup.

`components/ui` is now the default UI component path. The shadcn `ui` alias points there, which keeps copied/CLI-generated components and imports consistent. Style sources live in `styles` and beside their component; generated CSS lives in `assets/glass-folders`.

## Setup and local development

Node.js and npm are required for development. Dependencies and their exact versions are in `package-lock.json`.

```sh
npm ci
npm run build
npm run dev -- --host 127.0.0.1
```

After changing a component, run `npm run build` and reload the static preview. The existing Python previews also serve the built files on ports 4188/4189. Visitors need no npm, Node.js, or runtime compiler.

The equivalent initial dependencies, already installed here, are:

```sh
npm install react react-dom lucide-react clsx tailwind-merge class-variance-authority
npm install -D typescript @types/react @types/react-dom @types/node vite tailwindcss @tailwindcss/vite esbuild sharp
```

The shadcn structure is configured manually following its [manual installation guide](https://ui.shadcn.com/docs/installation/manual) and [components.json reference](https://ui.shadcn.com/docs/components-json). For future UI components:

```sh
npx shadcn@latest add button
```

There is no need to run `shadcn init` again. For a separate fresh project, `npx shadcn@latest init` can create the initial structure; use `@/components/ui` for UI and configure the `@/*` alias for TypeScript and the bundler. This project uses `tw:` prefixed Tailwind v4 utilities. Tailwind Preflight is omitted so its reset cannot alter the existing site's navigation, typography, galleries, or forms, as supported by [Tailwind's documented integration option](https://tailwindcss.com/docs/preflight#disabling-preflight).

## Data and behavior

The adapter reads the six existing fallback category anchors and their matching gallery pages. Labels are Graphic Work, Podcast Video, Event Video, Short Form & Real Estate, Website, and Logo Animation. It uses the category's existing images/video poster stills for up to three file previews. Each preview leads to that category's full gallery. A visible View collection link also provides direct navigation. Modifier-clicks retain native link behavior.

The folder front opens and closes with click, Enter, or Space. Files leave the tab order while closed. Escape closes the folder and returns focus to its trigger; outside clicks also close it. Only one folder per grid stays open. Public portfolio folders use `action="none"`; file upload/rename actions would be inappropriate for visitors. The reusable component retains Add, More, controlled/uncontrolled open state, callbacks, and its menu keyboard handling. No context providers or external state store are required.

Desktop has three columns, tablet two, and phone one. A ResizeObserver fits the actual folder to its column. Reduced-motion users get immediate transitions and no pointer tilt.

The provided art presets create the folder back panels. `tools/build-folder-art.mjs` paints them once during the build and encodes them as WebP. The public portfolio never calls the noise painter. Existing work supplies the file previews, so stock images are not presented as portfolio projects. The component still supports an `image` prop or live generated artwork in other uses.

## Loading and hosting

The loader is small and defers React/CSS until a portfolio grid approaches the viewport. Existing anchors remain usable before loading, if JavaScript is unavailable, or if the folder assets fail. There is no perpetual folder animation loop: pointer updates coalesce into a single requestAnimationFrame and stop at rest. The existing site's custom cursor is rebound after mounting.

Build output is committed alongside the static site assets. Cloudflare's existing directory-based deployment can publish them without a new build service. Source/config/dependency directories are excluded by `.assetsignore`; no hosting migration is needed.

## Validation

- `npm run build`: strict TypeScript check, artwork generation, production bundle.
- `npm test`: existing hero entrance, renderer, cursor, and intro-readiness checks.
- Browser: desktop folder artwork, opening/file fan, Escape focus return, Enter activation, all six gallery links and Back to Work routes; tablet/phone layouts and horizontal overflow.

The `"use client"` module-directive warnings from the library build are informational: this build runs entirely in the browser. The directive stays in the reusable TSX source for compatibility when it is copied into a server-component framework.
