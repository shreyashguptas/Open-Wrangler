# Open‑Wrangler

An open‑source, community‑driven data viewing and cleaning tool for VS Code and compatible editors. The goal is to help data scientists and analysts quickly explore tabular data in notebooks and files, apply transformations, see column statistics, and export reproducible Pandas code.

### Project status
- Pre‑alpha planning and scaffolding
- Primary runtime: VS Code desktop; compatibility with OpenVSCode/Code‑OSS

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