import { useEffect, useMemo, useRef, useState } from 'react';
import Graph from './Graph.jsx';
import Sidebar from './Sidebar.jsx';
import { useConnectome } from './useConnectome.js';
import { NEURON_COLORS, NEURON_TYPE_LABELS, computeNeighborhood } from './utils.js';

function Spinner({ label }) {
  return (
    <div className="flex h-full w-full items-center justify-center bg-neutral-950">
      <div className="flex flex-col items-center gap-3">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-neutral-700 border-t-indigo-400" />
        <div className="text-xs text-neutral-500">{label}</div>
      </div>
    </div>
  );
}

function Legend() {
  const items = [
    { type: 'sensory' },
    { type: 'motor' },
    { type: 'interneuron' },
    { type: 'other' },
  ];
  return (
    <div className="absolute bottom-3 left-3 z-10 rounded-md border border-neutral-800 bg-neutral-950/85 px-3 py-2 text-xs backdrop-blur">
      <div className="mb-1.5 text-[10px] font-medium uppercase tracking-wider text-neutral-500">
        Legend
      </div>
      <div className="space-y-1">
        {items.map((i) => (
          <div key={i.type} className="flex items-center gap-2">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: NEURON_COLORS[i.type] }}
            />
            <span className="text-neutral-300">{NEURON_TYPE_LABELS[i.type]}</span>
          </div>
        ))}
        <div className="mt-1.5 border-t border-neutral-800 pt-1.5">
          <div className="flex items-center gap-2">
            <span className="h-px w-4 bg-neutral-400" />
            <span className="text-neutral-400">chemical</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className="h-px w-4"
              style={{
                backgroundImage:
                  'repeating-linear-gradient(to right, #facc15 0, #facc15 2px, transparent 2px, transparent 4px)',
              }}
            />
            <span className="text-neutral-400">electrical</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function App() {
  const { data, loading, error } = useConnectome();

  const [selectedId, setSelectedId] = useState(null);
  const [hoverId, setHoverId] = useState(null);
  const [typeFilter, setTypeFilter] = useState('all');
  const [minSynapses, setMinSynapses] = useState(1);

  const graphRef = useRef(null);

  const typeCounts = useMemo(() => {
    const counts = { sensory: 0, motor: 0, interneuron: 0, other: 0 };
    if (!data) return counts;
    for (const n of data.nodes) counts[n.type] = (counts[n.type] || 0) + 1;
    return counts;
  }, [data]);

  const filteredGraph = useMemo(() => {
    if (!data) return { nodes: [], links: [] };
    const links = data.links.filter((l) => l.value >= minSynapses);

    let nodes = data.nodes;
    if (typeFilter !== 'all') {
      nodes = nodes.filter((n) => n.type === typeFilter);
    }
    const allowed = new Set(nodes.map((n) => n.id));

    const finalLinks = links.filter((l) => {
      const s = typeof l.source === 'object' ? l.source.id : l.source;
      const t = typeof l.target === 'object' ? l.target.id : l.target;
      return allowed.has(s) && allowed.has(t);
    });

    if (typeFilter !== 'all') {
      const keep = new Set();
      for (const l of finalLinks) {
        const s = typeof l.source === 'object' ? l.source.id : l.source;
        const t = typeof l.target === 'object' ? l.target.id : l.target;
        keep.add(s);
        keep.add(t);
      }
      nodes = nodes.filter((n) => keep.has(n.id));
    }

    return { nodes, links: finalLinks };
  }, [data, typeFilter, minSynapses]);

  const focusId = selectedId || hoverId;
  const { neighbors: highlightedNodes, linkKeys: highlightedLinks } = useMemo(() => {
    if (!data || !focusId) return { neighbors: new Set(), linkKeys: new Set() };
    return computeNeighborhood(data, focusId);
  }, [data, focusId]);

  useEffect(() => {
    if (selectedId && data && !data.nodes.find((n) => n.id === selectedId)) {
      setSelectedId(null);
    }
  }, [data, selectedId]);

  const handleFocus = (id) => {
    if (!graphRef.current || !data) return;
    const node = data.nodes.find((n) => n.id === id);
    if (!node) return;
    const tryCenter = (attempt = 0) => {
      if (typeof node.x === 'number' && typeof node.y === 'number') {
        graphRef.current.centerAt(node.x, node.y, 700);
        graphRef.current.zoom(5, 700);
      } else if (attempt < 20) {
        setTimeout(() => tryCenter(attempt + 1), 80);
      }
    };
    tryCenter();
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-neutral-950 text-neutral-100">
      <Sidebar
        graph={data}
        filteredGraph={filteredGraph}
        selectedId={selectedId}
        onSelect={setSelectedId}
        onFocus={handleFocus}
        typeFilter={typeFilter}
        setTypeFilter={setTypeFilter}
        minSynapses={minSynapses}
        setMinSynapses={setMinSynapses}
        typeCounts={typeCounts}
      />

      <main className="relative flex-1">
        {loading && <Spinner label="Fetching connectome…" />}
        {error && !loading && (
          <div className="flex h-full items-center justify-center p-6">
            <div className="max-w-md rounded-md border border-red-800 bg-red-950/40 p-4 text-sm text-red-200">
              <div className="mb-1 font-semibold">Failed to load connectome data</div>
              <div className="text-xs text-red-300/80">{String(error.message || error)}</div>
              <button
                type="button"
                onClick={() => window.location.reload()}
                className="mt-3 rounded border border-red-700 px-2 py-1 text-xs text-red-100 hover:bg-red-900/40"
              >
                Retry
              </button>
            </div>
          </div>
        )}
        {!loading && !error && data && (
          <>
            <Graph
              ref={graphRef}
              data={filteredGraph}
              selectedId={selectedId}
              hoverId={hoverId}
              highlightedNodes={highlightedNodes}
              highlightedLinks={highlightedLinks}
              onNodeClick={setSelectedId}
              onNodeHover={setHoverId}
            />
            <Legend />
          </>
        )}
      </main>
    </div>
  );
}
