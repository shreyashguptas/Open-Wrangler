# Open‑Wrangler

An open‑source, community‑driven data viewing and cleaning tool for VS Code and compatible editors. The goal is to help data scientists and analysts quickly explore tabular data in notebooks and files, apply transformations, see column statistics, and export reproducible Pandas code.

### Project status
- Pre‑alpha planning and scaffolding
- Primary runtime: VS Code desktop; compatibility with OpenVSCode/Code‑OSS

## Develop and run locally

Prereqs
- Node.js 18+ and npm
- VS Code 1.84+
- Recommended VS Code extensions: Python, Jupyter, TypeScript + ESLint

Install dependencies
```bash
npm install
```

Build once or watch for changes
```bash
# one-time build
npm run compile

# or auto-rebuild on save
npm run watch
```

Launch the extension for development
- Press F5 in VS Code to start a new “Extension Development Host”, or run:
```bash
# From a terminal (VS Code must be installed and on PATH)
code --extensionDevelopmentPath=$(pwd)
```

Test with the sample notebook
- In the dev host, open `testing-extension/test-jupyter-notebook.ipynb`
- Execute a cell that produces a DataFrame
- Click the cell’s status bar action “Open in Open‑Wrangler” or run the command
  “Open‑Wrangler: Open DataFrame from Cell” from the Command Palette

Debug/logging
- View logs in the Output panel → “Open‑Wrangler”

Package a VSIX (optional)
```bash
npm run package
# then install the .vsix via Extensions panel → … → Install from VSIX
```

## Vision and scope
Open‑Wrangler aims to provide these capabilities for everyday data wrangling:
- Fast data grid to preview, filter, and sort tabular data
- Column statistics, summaries, and quick insights
- One‑click operations (drop/select/rename/clone/change type, dedupe, fill/replace, split/join, text case ops, groupby/aggregate, encode, round/scale)
- Edit pipeline with step history and diff view
- Code generation: export reproducible Pandas code back to your notebook or script
- Launch from notebooks (DataFrame variables) and from files in the Explorer

See the living feature checklist in `docs/feature-parity.md`.

## Contributing
- Review the feature checklist in `docs/feature-parity.md`
- Open issues for design/UX and implementation discussions

## Documentation
- Architecture: `docs/architecture.md`
- Feature parity checklist: `docs/feature-parity.md`

---
Copyright (c) The Open‑Wrangler Authors. MIT License.