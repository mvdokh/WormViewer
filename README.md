# WormViewer

Interactive C. elegans connectome visualizer — a single-page React app that renders the
White et al. 1986 hermaphrodite connectome as a force-directed graph.

## Stack

- **React + Vite** for the SPA
- **react-force-graph-2d** for canvas-based force-directed rendering
- **Papa Parse** for CSV parsing
- **Tailwind CSS** (dark theme)

## Data sources

Loaded at runtime from the [openworm/ConnectomeToolbox](https://github.com/openworm/ConnectomeToolbox)
repository (CORS-allowed via `raw.githubusercontent.com`):

- `cect/data/aconnectome_white_1986_whole.csv` — chemical + electrical synapses
- `cect/data/all_cell_info.csv` — neuron type / classification metadata

On neuron click the app additionally tries to fetch the WormBase concise description from
`https://www.wormbase.org/rest/field/gene/{name}/concise_description` (best-effort; may be
blocked by Cloudflare's bot challenge — falls back to a link to the full WormBase page).

## Running

```bash
npm install
npm run dev
```

Then open http://localhost:5173/.

## Build

```bash
npm run build
npm run preview
```

## Features

- Force-directed graph of all 302 neurons (plus a few non-neuronal cells from the source dataset),
  colored by type:
  - blue — sensory
  - red — motor
  - green — interneuron
  - grey — other / unclassified
- Edge thickness scales logarithmically with synapse count; electrical synapses are dashed yellow.
- Click a neuron to highlight its direct partners and dim everything else.
- Hover for a tooltip with name, type, and connection count.
- Sidebar with:
  - search box (autocomplete, focuses the graph on selection)
  - type filter pills with counts
  - min-synapses-per-edge slider
  - selected neuron card with type, in/out/total degree, top partners, and live WormBase description

## File structure

```
src/
  App.jsx            layout, state, derived filtered/highlighted data
  Graph.jsx          react-force-graph-2d wrapper with custom paint
  Sidebar.jsx        search, filters, selected-neuron info card
  useConnectome.js   data fetching + transformation hook with module-level cache
  utils.js           color map, type classifier, CSV → graph builder, neighborhood helpers
  index.css          Tailwind directives + dark-theme base styles
  main.jsx           Vite entrypoint
```
