# Development guide: code structure and locations

This file explains where things live and where to add new features.

## Directory map

```
src/
  activation/
    activate.ts              # small entry that wires activation
    registerCommands.ts      # registers commands (Command Palette etc.)
    registerStatusBar.ts     # notebook cell status bar provider
  features/
    openFromCell/
      resolveActiveCellTable.ts  # reads the active cell outputs -> table preview payload
      types.ts                   # TablePreview/typed contracts
  parsing/
    outputParsing.ts         # output parsers (Data Resource JSON / HTML / plain text) and helpers
  webview/
    previewPanel.ts          # creates the preview WebviewPanel + HTML shell
  utils/
    logging.ts               # shared output channel + log helpers
    variableGuess.ts         # best-effort variable name inference from cell source

webview-src/                 # source for webview UI (TypeScript + CSS)
  previewApp.ts              # client-side grid with paging + sorting + context menu
  styles.css                 # webview CSS

media/                       # built webview assets (generated)
  preview.js
  styles.css

scripts/
  build-webview.mjs          # esbuild bundling for webview-src -> media
```

## Responsibilities
- src/activation/*: extension activation only. Keep this thin; no business logic here.
- src/features/*: feature modules (e.g., open from cell). Each feature should own:
  - its types/contracts,
  - data gathering or orchestration logic,
  - and narrowly scoped helpers.
- src/parsing/*: pure functions to parse notebook outputs into a row matrix plus accurate row/column counts.
- src/webview/*: creation of the webview panel and HTML shell. Today the webview still uses inline HTML for bootstrap; webview-src contains the TypeScript UI that is built to media/preview.js for a stricter CSP path.
- webview-src/*: the client UI (sorting, paging, header menu). Build outputs land in media/.
- src/utils/*: small, reusable utilities (logging, variable name guessing, etc.).

## Adding a new feature
1. Create a new folder under `src/features/<featureName>/`.
2. Put feature-specific types in `types.ts` and the main logic in a separate file (e.g., `index.ts` or `<verb>.ts`).
3. Register commands in `src/activation/registerCommands.ts` (add command id, call your feature module).
4. If the feature needs UI inside the preview panel:
   - Extend the webview client in `webview-src/previewApp.ts` (for client-only interactions like menus, sorting, filters).
   - If you need host <-> webview messaging, add a typed `postMessage` channel in `src/webview/previewPanel.ts` and handle it in `webview-src/previewApp.ts`.
5. If the feature needs to parse notebook outputs or files, add pure helpers to `src/parsing/`.
6. Log important steps via `src/utils/logging.ts` so they appear in Output -> "Open-Wrangler".

## Building and running
- One-time install: `npm install`
- Build extension + webview bundle: `npm run compile`
- Dev host: press F5 in VS Code

`npm run compile` performs two steps:
- TypeScript compile for the extension: `tsc -p ./`
- Webview bundle: `node scripts/build-webview.mjs` -> writes `media/preview.js` and `media/styles.css`

## Webview implementation notes
- The current preview uses inline HTML to bootstrap quickly. The bundled assets in `media/` are generated and ready for adopting a stricter CSP by loading the script via `panel.webview.asWebviewUri(...)` and a nonce.
- The client UI (in `webview-src/previewApp.ts`) implements:
  - paging (10/25/50),
  - header context menu (three-dots hover) with Sort ascending/descending and Clear sort,
  - numeric-aware sorting with stable handling of missing values,
  - indicators (▲/▼) on the sorted column.

## Parsing rules (quick reference)
- Prefer `application/vnd.dataresource+json` -> `text/html` -> `text/plain`.
- Extract accurate counts when available (e.g., "300 rows × 4 columns").
- Remove Pandas implicit index when detected; adjust reported column count.

## Conventions
- Keep functions pure where possible (especially in `parsing/`).
- Avoid long files; when a module grows past ~300 lines, split it.
- Name functions with verbs and variables with descriptive nouns.

## Where to look for examples
- Sorting menu and paging: `webview-src/previewApp.ts` and `src/webview/previewPanel.ts`.
- Cell output parsing and count detection: `src/parsing/outputParsing.ts`.
- Launch from cell: `src/features/openFromCell/resolveActiveCellTable.ts` + `src/activation/registerCommands.ts`.

## Roadmap (structural)
- Switch preview to load `media/preview.js` + `media/styles.css` with a strict CSP and nonce.
- Introduce a typed message contract for host <-> webview interactions as features expand (filters, summaries, export).
