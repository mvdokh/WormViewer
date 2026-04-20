import Papa from 'papaparse';

export const NEURON_COLORS = {
  sensory: '#3b82f6',
  motor: '#ef4444',
  interneuron: '#22c55e',
  other: '#9ca3af',
};

export const NEURON_TYPE_LABELS = {
  sensory: 'Sensory',
  motor: 'Motor',
  interneuron: 'Interneuron',
  other: 'Other',
};

export function classifyNeuron(typeStr = '', classificationStr = '') {
  const blob = `${typeStr} ${classificationStr}`.toLowerCase();
  if (/\bmotor\b|motorneuron|motoneuron/.test(blob)) return 'motor';
  if (/sensory|mechanosensor|chemosensor|thermosensor|polymodal|nociceptor|photoreceptor/.test(blob))
    return 'sensory';
  if (/interneuron|\bring\b/.test(blob)) return 'interneuron';
  return 'other';
}

function parseCsv(text, opts = {}) {
  const result = Papa.parse(text, {
    header: true,
    skipEmptyLines: true,
    dynamicTyping: false,
    transformHeader: (h) => h.trim(),
    ...opts,
  });
  return result.data;
}

/**
 * Build the graph data structure from the two raw CSV texts.
 * @param {string} edgesCsvText - aconnectome_white_1986_whole.csv (TSV-delimited)
 * @param {string} cellsCsvText - all_cell_info.csv (CSV)
 */
export function buildGraph(edgesCsvText, cellsCsvText) {
  const edgeRows = parseCsv(edgesCsvText, { delimiter: '\t' });
  const cellRows = parseCsv(cellsCsvText);

  const cellInfo = new Map();
  for (const row of cellRows) {
    const name = (row['Cell name'] || '').trim();
    if (!name) continue;
    cellInfo.set(name, {
      type: classifyNeuron(row['Type'] || '', row['Classification'] || ''),
      rawType: (row['Type'] || '').trim(),
      classification: (row['Classification'] || '').trim(),
      description: (row['Name details'] || '').trim(),
    });
  }

  const aggregated = new Map();
  const nodeIds = new Set();
  for (const row of edgeRows) {
    const pre = (row.pre || '').trim();
    const post = (row.post || '').trim();
    const synapses = Number(row.synapses) || 0;
    const kind = (row.type || '').trim().toLowerCase();
    if (!pre || !post || synapses <= 0) continue;
    nodeIds.add(pre);
    nodeIds.add(post);
    const key = `${pre}\u0000${post}\u0000${kind}`;
    aggregated.set(key, (aggregated.get(key) || 0) + synapses);
  }

  const inDeg = new Map();
  const outDeg = new Map();
  const totalSynapsesPerNode = new Map();
  const links = [];
  for (const [key, value] of aggregated) {
    const [source, target, kind] = key.split('\u0000');
    links.push({ source, target, value, kind });
    outDeg.set(source, (outDeg.get(source) || 0) + 1);
    inDeg.set(target, (inDeg.get(target) || 0) + 1);
    totalSynapsesPerNode.set(source, (totalSynapsesPerNode.get(source) || 0) + value);
    totalSynapsesPerNode.set(target, (totalSynapsesPerNode.get(target) || 0) + value);
  }

  const nodes = Array.from(nodeIds)
    .sort()
    .map((id) => {
      const info = cellInfo.get(id);
      return {
        id,
        type: info ? info.type : 'other',
        rawType: info ? info.rawType : '',
        classification: info ? info.classification : '',
        nameDetails: info ? info.description : '',
        inDeg: inDeg.get(id) || 0,
        outDeg: outDeg.get(id) || 0,
        degree: (inDeg.get(id) || 0) + (outDeg.get(id) || 0),
        synapseTotal: totalSynapsesPerNode.get(id) || 0,
      };
    });

  let maxLinkValue = 1;
  for (const l of links) if (l.value > maxLinkValue) maxLinkValue = l.value;

  return { nodes, links, maxLinkValue };
}

/**
 * Compute, for a given node id, the set of neighbor ids and the relevant link keys.
 */
export function computeNeighborhood(graph, id) {
  const neighbors = new Set();
  const linkKeys = new Set();
  if (!id) return { neighbors, linkKeys };
  for (const l of graph.links) {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    if (s === id) {
      neighbors.add(t);
      linkKeys.add(`${s}->${t}:${l.kind}`);
    } else if (t === id) {
      neighbors.add(s);
      linkKeys.add(`${s}->${t}:${l.kind}`);
    }
  }
  neighbors.add(id);
  return { neighbors, linkKeys };
}

export function linkKey(l) {
  const s = typeof l.source === 'object' ? l.source.id : l.source;
  const t = typeof l.target === 'object' ? l.target.id : l.target;
  return `${s}->${t}:${l.kind}`;
}

/**
 * Get top-N partners (sorted by total synapses) for a given neuron.
 */
export function topPartners(graph, id, limit = 10) {
  const partners = new Map();
  for (const l of graph.links) {
    const s = typeof l.source === 'object' ? l.source.id : l.source;
    const t = typeof l.target === 'object' ? l.target.id : l.target;
    let other = null;
    let direction = null;
    if (s === id) {
      other = t;
      direction = 'out';
    } else if (t === id) {
      other = s;
      direction = 'in';
    }
    if (!other) continue;
    const prev = partners.get(other) || { id: other, total: 0, chemical: 0, electrical: 0, in: 0, out: 0 };
    prev.total += l.value;
    if (l.kind === 'chemical') prev.chemical += l.value;
    else if (l.kind === 'electrical') prev.electrical += l.value;
    if (direction === 'in') prev.in += l.value;
    else prev.out += l.value;
    partners.set(other, prev);
  }
  return Array.from(partners.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, limit);
}
