import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import { NEURON_COLORS, linkKey } from './utils.js';

function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16);
  const g = parseInt(h.substring(2, 4), 16);
  const b = parseInt(h.substring(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

const Graph = forwardRef(function Graph(
  { data, selectedId, hoverId, highlightedNodes, highlightedLinks, onNodeClick, onNodeHover },
  ref,
) {
  const containerRef = useRef(null);
  const [size, setSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const update = () => {
      setSize({ width: el.clientWidth, height: el.clientHeight });
    };
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const hasSelection = Boolean(selectedId || hoverId);

  const nodePaint = useMemo(() => {
    return (node, ctx, globalScale) => {
      const color = NEURON_COLORS[node.type] || NEURON_COLORS.other;
      const isHighlighted = !hasSelection || highlightedNodes.has(node.id);
      const alpha = isHighlighted ? 1 : 0.12;
      const radius = Math.max(2, Math.sqrt(node.degree + 1) * 1.1);

      ctx.beginPath();
      ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
      ctx.fillStyle = hexToRgba(color, alpha);
      ctx.fill();

      if (node.id === selectedId || node.id === hoverId) {
        ctx.lineWidth = 2 / globalScale;
        ctx.strokeStyle = '#ffffff';
        ctx.stroke();
      }

      if (globalScale >= 2.5 && isHighlighted) {
        ctx.font = `${10 / globalScale}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = `rgba(245,245,245,${alpha})`;
        ctx.fillText(node.id, node.x, node.y + radius + 6 / globalScale);
      }
    };
  }, [hasSelection, highlightedNodes, selectedId, hoverId]);

  const linkColor = (link) => {
    const key = linkKey(link);
    const isHighlighted = !hasSelection || highlightedLinks.has(key);
    const baseAlpha = isHighlighted ? 0.55 : 0.04;
    if (link.kind === 'electrical') return `rgba(250, 204, 21, ${baseAlpha})`;
    return `rgba(180, 180, 200, ${baseAlpha})`;
  };

  const linkWidth = (link) => {
    const w = Math.max(0.4, Math.log2(link.value + 1) * 0.7);
    const key = linkKey(link);
    const isHighlighted = !hasSelection || highlightedLinks.has(key);
    return isHighlighted ? w : w * 0.6;
  };

  const linkLineDash = (link) => (link.kind === 'electrical' ? [2, 2] : null);

  return (
    <div ref={containerRef} className="absolute inset-0">
      <ForceGraph2D
        ref={ref}
        width={size.width}
        height={size.height}
        graphData={data}
        backgroundColor="#0a0a0a"
        nodeId="id"
        nodeRelSize={4}
        nodeCanvasObject={nodePaint}
        nodePointerAreaPaint={(node, color, ctx) => {
          const radius = Math.max(4, Math.sqrt(node.degree + 1) * 1.5);
          ctx.beginPath();
          ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
          ctx.fillStyle = color;
          ctx.fill();
        }}
        nodeLabel={(node) =>
          `<div style="background:#0a0a0a;color:#f5f5f5;padding:6px 8px;border:1px solid #404040;border-radius:6px;font-size:12px;font-family:sans-serif;">
            <div style="font-weight:600">${node.id}</div>
            <div style="color:#a3a3a3;text-transform:capitalize">${node.type}${node.classification ? ' · ' + node.classification : ''}</div>
            <div style="color:#a3a3a3">${node.degree} connections (${node.synapseTotal} synapses)</div>
          </div>`
        }
        linkColor={linkColor}
        linkWidth={linkWidth}
        linkLineDash={linkLineDash}
        linkDirectionalParticles={0}
        cooldownTicks={120}
        d3VelocityDecay={0.35}
        onNodeClick={(node) => onNodeClick && onNodeClick(node.id)}
        onNodeHover={(node) => onNodeHover && onNodeHover(node ? node.id : null)}
        onBackgroundClick={() => onNodeClick && onNodeClick(null)}
      />
    </div>
  );
});

export default Graph;
