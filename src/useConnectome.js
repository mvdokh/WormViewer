import { useEffect, useState } from 'react';
import { buildGraph } from './utils.js';

const EDGES_URL =
  'https://raw.githubusercontent.com/openworm/ConnectomeToolbox/main/cect/data/aconnectome_white_1986_whole.csv';
const CELLS_URL =
  'https://raw.githubusercontent.com/openworm/ConnectomeToolbox/main/cect/data/all_cell_info.csv';

let cachedPromise = null;

function loadConnectome() {
  if (cachedPromise) return cachedPromise;
  cachedPromise = Promise.all([
    fetch(EDGES_URL).then((r) => {
      if (!r.ok) throw new Error(`Failed to fetch edge list (${r.status})`);
      return r.text();
    }),
    fetch(CELLS_URL).then((r) => {
      if (!r.ok) throw new Error(`Failed to fetch cell info (${r.status})`);
      return r.text();
    }),
  ]).then(([edgesText, cellsText]) => buildGraph(edgesText, cellsText));
  return cachedPromise;
}

export function useConnectome() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadConnectome()
      .then((graph) => {
        if (cancelled) return;
        setData(graph);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        cachedPromise = null;
        setError(err);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return { data, loading, error };
}
