# Feature checklist

Launch & sources
- [x] Launch from Notebook DataFrame (basic) — open from Jupyter cell via status bar or command; detects DataFrame‑like outputs (Data Resource JSON, HTML table, plain text fallback)
- [ ] Launch from file (CSV/TSV, Excel, Parquet)

Viewing
- [x] Paginated preview grid (10/25/50 per page with paging controls)
- [x] Accurate row/column counts; auto‑hide Pandas implicit index
- [x] Dynamic title: “Open '<var>' in Open‑Wrangler” using best‑effort variable‑name detection
- [x] Output parsing: prefer `application/vnd.dataresource+json`, then HTML table, then plain‑text fallback
- [ ] Virtualized data grid
- [ ] Column summaries and quick insights
- [ ] Sort & filter

Editing & operations
- [ ] Step history with data diff
- [ ] Export reproducible Pandas code
- [ ] Sort
- [ ] Filter
- [ ] Calculate text length
- [ ] One‑hot encode / multi‑label binarizer
- [ ] Formula column
- [ ] Change column type
- [ ] Drop/select/rename/clone column
- [ ] Drop missing / fill missing
- [ ] Drop duplicates
- [ ] Find & replace
- [ ] Groupby & aggregate
- [ ] Split text / strip whitespace
- [ ] Case transforms (lower/upper/capitalize)
- [ ] String transform by example
- [ ] DateTime formatting by example
- [ ] New column by example
- [ ] Scale min/max, round, floor, ceil
- [ ] Custom operation from examples

Export
- [ ] Export code to notebook
- [ ] Export data to CSV/Parquet

