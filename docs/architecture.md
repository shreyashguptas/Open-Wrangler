# Architecture

High‑level components
- Extension Host (TypeScript): registers commands, contributes views/menus, coordinates with Python, and manages workspace operations
- Webview UI (vanilla TS for now): interactive, paginated preview grid rendered inside a WebviewPanel; future move to React
- Python runtime (Pandas): executes data operations in a sandboxed process; returns sampled/summary data and code snippets

Key flows
1. Launch
   - From a Notebook variable (DataFrame) via Notebook/Jupyter APIs. We detect DataFrame‑like outputs by inspecting cell output MIME items in priority order: `application/vnd.dataresource+json` → `text/html` → `text/plain`.
   - From a file in Explorer via a command (planned)
2. Data session lifecycle
   - Preview: render a paginated grid (10/25/50 per page). We compute accurate row/column counts and remove Pandas implicit index from the grid header.
   - Future: profile → virtualized grid → operations with step history → code generation
3. IPC
   - Webview ↔ Extension Host: not used yet; initial grid is bootstrapped as static payload in the HTML. Will evolve to a `postMessage` protocol with typed payloads for operations.
   - Extension Host ↔ Python: planned (JSON‑RPC over stdio or Node child process, with cancellation tokens)

Security and performance
- No arbitrary code execution from the webview
- Large data: sampling and server‑side aggregation; virtualized grid; stream reads
- Persist only user‑approved outputs

Performance‑oriented design (to implement next)
- Pluggable data engines: start with Pandas, add Polars and DuckDB; optional Dask/Spark adapters later
- Arrow everywhere: exchange table slices as Apache Arrow IPC/Feather rather than JSON
- Server‑side row model: push down sort/filter/aggregate to the engine and return only the viewport slice
- Lazy, columnar IO: prefer Parquet/Arrow datasets and load columns on demand
- Approximate stats at scale: sketches for quantiles/distinct counts on very large data

Code generation
- Export Pandas code first; design exporter so equivalent Polars and DuckDB SQL emitters can be added

Benchmarks and safeguards
- Maintain simple scenarios (open, filter, sort, groupby) to compare engines on 1–50 GB datasets
- Detect when data exceeds memory and recommend/auto‑switch to a better engine

