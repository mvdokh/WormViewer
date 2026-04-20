import { useEffect, useMemo, useRef, useState } from 'react';
import { NEURON_COLORS, NEURON_TYPE_LABELS, topPartners } from './utils.js';

const TYPE_OPTIONS = ['all', 'sensory', 'motor', 'interneuron'];

function TypePill({ type, active, count, onClick }) {
  const color = type === 'all' ? '#a3a3a3' : NEURON_COLORS[type];
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex items-center gap-2 rounded-full px-3 py-1 text-xs font-medium transition border ${
        active
          ? 'bg-neutral-800 border-neutral-600 text-neutral-50'
          : 'bg-neutral-900 border-neutral-800 text-neutral-400 hover:text-neutral-200'
      }`}
    >
      <span
        className="inline-block h-2 w-2 rounded-full"
        style={{ backgroundColor: color }}
        aria-hidden
      />
      <span className="capitalize">{type === 'all' ? 'All' : NEURON_TYPE_LABELS[type]}</span>
      {count != null && <span className="text-neutral-500">({count})</span>}
    </button>
  );
}

function NeuronTypeChip({ type }) {
  const color = NEURON_COLORS[type] || NEURON_COLORS.other;
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs"
      style={{ backgroundColor: `${color}22`, color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: color }} />
      {NEURON_TYPE_LABELS[type] || 'Unknown'}
    </span>
  );
}

function useDescription(neuronId) {
  const [state, setState] = useState({ loading: false, text: null, error: null });

  useEffect(() => {
    if (!neuronId) {
      setState({ loading: false, text: null, error: null });
      return undefined;
    }
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 6000);
    setState({ loading: true, text: null, error: null });

    const url = `https://www.wormbase.org/rest/field/gene/${encodeURIComponent(
      neuronId,
    )}/concise_description`;

    fetch(url, {
      headers: { Accept: 'application/json' },
      signal: controller.signal,
    })
      .then(async (res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const text =
          json?.concise_description?.data?.text ||
          json?.fields?.concise_description?.data?.text ||
          (typeof json?.concise_description?.data === 'string'
            ? json.concise_description.data
            : null);
        if (!text) throw new Error('No description in response');
        setState({ loading: false, text, error: null });
      })
      .catch((err) => {
        if (err.name === 'AbortError') return;
        setState({ loading: false, text: null, error: err.message || 'unavailable' });
      })
      .finally(() => clearTimeout(timeoutId));

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
  }, [neuronId]);

  return state;
}

export default function Sidebar({
  graph,
  filteredGraph,
  selectedId,
  onSelect,
  onFocus,
  typeFilter,
  setTypeFilter,
  minSynapses,
  setMinSynapses,
  typeCounts,
}) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef(null);

  const allIds = useMemo(() => (graph ? graph.nodes.map((n) => n.id) : []), [graph]);
  const idToNode = useMemo(() => {
    const m = new Map();
    if (graph) for (const n of graph.nodes) m.set(n.id, n);
    return m;
  }, [graph]);

  const suggestions = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.trim().toUpperCase();
    return allIds.filter((id) => id.toUpperCase().includes(q)).slice(0, 8);
  }, [query, allIds]);

  const handleSubmit = (e) => {
    e.preventDefault();
    const exact = allIds.find((id) => id.toUpperCase() === query.trim().toUpperCase());
    const target = exact || suggestions[0];
    if (target) {
      onSelect(target);
      onFocus(target);
      setQuery(target);
      setShowSuggestions(false);
      inputRef.current?.blur();
    }
  };

  const selectedNode = selectedId ? idToNode.get(selectedId) : null;
  const partners = useMemo(
    () => (graph && selectedId ? topPartners(graph, selectedId, 12) : []),
    [graph, selectedId],
  );
  const description = useDescription(selectedId);

  const maxLinkValue = graph?.maxLinkValue || 1;
  const sliderMax = Math.max(1, Math.min(50, maxLinkValue));

  return (
    <aside className="flex h-full w-[360px] flex-col border-r border-neutral-800 bg-neutral-950">
      <div className="border-b border-neutral-800 px-5 py-4">
        <h1 className="text-lg font-semibold tracking-tight text-neutral-50">WormViewer</h1>
        <p className="mt-0.5 text-xs text-neutral-500">
          C. elegans connectome · White et al. 1986
        </p>
      </div>

      <div className="space-y-4 border-b border-neutral-800 px-5 py-4">
        <form onSubmit={handleSubmit} className="relative">
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShowSuggestions(true);
            }}
            onFocus={() => setShowSuggestions(true)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
            placeholder="Search neuron (e.g. AVAL, ASHL)"
            className="w-full rounded-md border border-neutral-800 bg-neutral-900 px-3 py-2 text-sm text-neutral-100 placeholder-neutral-500 focus:border-indigo-500 focus:outline-none"
            autoComplete="off"
            spellCheck={false}
          />
          {showSuggestions && suggestions.length > 0 && (
            <ul className="absolute z-10 mt-1 max-h-56 w-full overflow-y-auto rounded-md border border-neutral-800 bg-neutral-900 shadow-lg">
              {suggestions.map((id) => {
                const node = idToNode.get(id);
                return (
                  <li key={id}>
                    <button
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        setQuery(id);
                        setShowSuggestions(false);
                        onSelect(id);
                        onFocus(id);
                      }}
                      className="flex w-full items-center justify-between px-3 py-2 text-left text-sm text-neutral-200 hover:bg-neutral-800"
                    >
                      <span className="font-medium">{id}</span>
                      <span
                        className="text-xs"
                        style={{ color: NEURON_COLORS[node?.type] || NEURON_COLORS.other }}
                      >
                        {NEURON_TYPE_LABELS[node?.type] || 'Other'}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </form>

        <div>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
            Neuron type
          </div>
          <div className="flex flex-wrap gap-1.5">
            {TYPE_OPTIONS.map((t) => (
              <TypePill
                key={t}
                type={t}
                active={typeFilter === t}
                count={t === 'all' ? null : typeCounts?.[t]}
                onClick={() => setTypeFilter(t)}
              />
            ))}
          </div>
        </div>

        <div>
          <div className="mb-1 flex items-center justify-between text-xs">
            <span className="font-medium uppercase tracking-wider text-neutral-500">
              Min synapses per edge
            </span>
            <span className="font-mono text-neutral-300">{minSynapses}</span>
          </div>
          <input
            type="range"
            min={1}
            max={sliderMax}
            value={minSynapses}
            onChange={(e) => setMinSynapses(Number(e.target.value))}
            className="w-full"
          />
          <div className="mt-1 flex justify-between text-[10px] text-neutral-600">
            <span>1</span>
            <span>{sliderMax}</span>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs">
          <div className="rounded border border-neutral-800 bg-neutral-900/50 px-2 py-1.5">
            <div className="text-neutral-500">Visible neurons</div>
            <div className="text-base font-semibold text-neutral-100">
              {filteredGraph?.nodes.length || 0}
            </div>
          </div>
          <div className="rounded border border-neutral-800 bg-neutral-900/50 px-2 py-1.5">
            <div className="text-neutral-500">Visible edges</div>
            <div className="text-base font-semibold text-neutral-100">
              {filteredGraph?.links.length || 0}
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        {!selectedNode && (
          <div className="text-sm text-neutral-500">
            <p className="mb-2 text-neutral-300">No neuron selected.</p>
            <p>Click a node in the graph or search above to inspect a neuron.</p>
            <ul className="mt-4 space-y-1.5 text-xs text-neutral-500">
              <li>
                <span className="font-mono text-neutral-400">click</span> – highlight
                connections
              </li>
              <li>
                <span className="font-mono text-neutral-400">scroll</span> – zoom
              </li>
              <li>
                <span className="font-mono text-neutral-400">drag bg</span> – pan
              </li>
            </ul>
          </div>
        )}

        {selectedNode && (
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold text-neutral-50">{selectedNode.id}</h2>
                <NeuronTypeChip type={selectedNode.type} />
              </div>
              {selectedNode.classification && (
                <p className="mt-0.5 text-xs text-neutral-500">{selectedNode.classification}</p>
              )}
              {selectedNode.nameDetails && (
                <p className="mt-1 text-xs italic text-neutral-500">{selectedNode.nameDetails}</p>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2 text-center">
              <div className="rounded border border-neutral-800 bg-neutral-900/50 py-2">
                <div className="text-[10px] uppercase tracking-wider text-neutral-500">Total</div>
                <div className="text-base font-semibold text-neutral-100">
                  {selectedNode.degree}
                </div>
              </div>
              <div className="rounded border border-neutral-800 bg-neutral-900/50 py-2">
                <div className="text-[10px] uppercase tracking-wider text-neutral-500">In</div>
                <div className="text-base font-semibold text-neutral-100">
                  {selectedNode.inDeg}
                </div>
              </div>
              <div className="rounded border border-neutral-800 bg-neutral-900/50 py-2">
                <div className="text-[10px] uppercase tracking-wider text-neutral-500">Out</div>
                <div className="text-base font-semibold text-neutral-100">
                  {selectedNode.outDeg}
                </div>
              </div>
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Description
              </div>
              {description.loading && (
                <div className="text-xs text-neutral-500">Loading from WormBase…</div>
              )}
              {description.text && (
                <p className="text-xs leading-relaxed text-neutral-300">{description.text}</p>
              )}
              {!description.loading && !description.text && (
                <div className="text-xs text-neutral-500">
                  Live description unavailable.{' '}
                  <a
                    href={`https://wormbase.org/species/c_elegans/gene/${encodeURIComponent(selectedNode.id)}`}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-indigo-400 hover:text-indigo-300"
                  >
                    Open on WormBase ↗
                  </a>
                </div>
              )}
            </div>

            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-500">
                Top partners
              </div>
              {partners.length === 0 && (
                <div className="text-xs text-neutral-500">No connections in dataset.</div>
              )}
              <ul className="space-y-1">
                {partners.map((p) => {
                  const node = idToNode.get(p.id);
                  const color = NEURON_COLORS[node?.type] || NEURON_COLORS.other;
                  return (
                    <li key={p.id}>
                      <button
                        type="button"
                        onClick={() => {
                          onSelect(p.id);
                          onFocus(p.id);
                        }}
                        className="flex w-full items-center justify-between rounded border border-neutral-800 bg-neutral-900/40 px-2 py-1.5 text-xs text-neutral-200 transition hover:border-neutral-700 hover:bg-neutral-800"
                      >
                        <span className="flex items-center gap-2">
                          <span
                            className="h-2 w-2 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="font-mono">{p.id}</span>
                        </span>
                        <span className="flex items-center gap-2 text-neutral-500">
                          {p.in > 0 && <span title="incoming">↓{p.in}</span>}
                          {p.out > 0 && <span title="outgoing">↑{p.out}</span>}
                          <span className="font-mono text-neutral-300">{p.total}</span>
                        </span>
                      </button>
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-neutral-800 px-5 py-3 text-[10px] text-neutral-600">
        Data:{' '}
        <a
          href="https://github.com/openworm/ConnectomeToolbox"
          target="_blank"
          rel="noreferrer noopener"
          className="text-neutral-400 hover:text-neutral-200"
        >
          openworm/ConnectomeToolbox
        </a>
      </div>
    </aside>
  );
}
