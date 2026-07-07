import React from "react";
import { interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import type { VisualElement } from "../../types";
import { palette } from "../MotionGraphicsComponents";

type ElementOf<T extends VisualElement["type"]> = Extract<VisualElement, { type: T }>;

const stageProgress = (index = 0) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const entrance = spring({ frame: frame - index * 5, fps, config: { damping: 22, stiffness: 95, mass: 0.8 } });
  const action = interpolate(frame, [18 + index * 4, 72 + index * 4], [0, 1], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return { frame, entrance, action };
};

const panelStyle = (index = 0): React.CSSProperties => {
  const { entrance } = stageProgress(index);
  return {
    transform: `translateY(${(1 - entrance) * 34}px) scale(${0.96 + entrance * 0.04})`,
    opacity: entrance,
    padding: 28,
    border: `1px solid ${palette.border}`,
    borderRadius: 24,
    background: palette.surface,
    boxShadow: "0 24px 70px rgba(0,0,0,0.28)",
  };
};

const cellStyle = (active: boolean, index = 0): React.CSSProperties => {
  const { frame, action } = stageProgress(index);
  const pulse = active ? 0.72 + Math.sin(frame / 8) * 0.2 : 0;
  return {
    display: "grid",
    placeItems: "center",
    minWidth: 86,
    height: 72,
    padding: "0 16px",
    borderRadius: 16,
    border: `2px solid ${active ? palette.amber : palette.border}`,
    background: active ? `rgba(255,200,87,${0.28 + pulse * 0.28})` : palette.surfaceStrong,
    color: active ? palette.amber : palette.text,
    fontSize: 26,
    fontWeight: 760,
    transform: active ? `translateY(${-8 * action}px) scale(${1 + action * 0.08})` : "none",
  };
};

export const HashTableBuckets: React.FC<{ element: ElementOf<"hash_table_buckets">; index?: number }> = ({ element, index = 0 }) => {
  const { action } = stageProgress(index);
  const collisionSet = new Set(element.collisionIndices ?? []);
  return (
    <div style={{ ...panelStyle(index), display: "grid", gap: 18, minWidth: 520 }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", color: palette.muted, fontSize: 24 }}>
        <span>hash buckets</span>
        {element.keyLabel ? <strong style={{ color: palette.cyan }}>key: {element.keyLabel}</strong> : null}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.min(6, element.buckets.length)}, minmax(72px, 1fr))`, gap: 12 }}>
        {element.buckets.slice(0, 12).map((bucket, bucketIndex) => {
          const active = bucketIndex === element.activeIndex;
          const colliding = collisionSet.has(bucketIndex);
          return (
            <div key={`${bucket}-${bucketIndex}`} style={{ ...cellStyle(active || colliding, bucketIndex), height: 92 }}>
              <span style={{ fontSize: 18, color: palette.muted }}>#{bucket}</span>
              <span>{active ? "target" : colliding ? "chain" : "empty"}</span>
              {active ? <span style={{ width: `${Math.max(18, action * 100)}%`, height: 4, borderRadius: 999, background: palette.cyan }} /> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const HashFunctionPanel: React.FC<{ element: ElementOf<"hash_function_panel">; index?: number }> = ({ element, index = 0 }) => {
  const { action } = stageProgress(index);
  return (
    <div style={{ ...panelStyle(index), display: "grid", gridTemplateColumns: "1fr 72px 1fr 72px 1fr", alignItems: "center", gap: 18, minWidth: 760 }}>
      <StepBox label="input" value={element.inputKey} active={action > 0.12} />
      <FlowArrow active={action > 0.2} />
      <StepBox label="rule" value={element.expression} active={action > 0.42} />
      <FlowArrow active={action > 0.58} />
      <StepBox label="index" value={String(element.outputIndex)} active={action > 0.72} />
    </div>
  );
};

export const CollisionChain: React.FC<{ element: ElementOf<"collision_chain">; index?: number }> = ({ element, index = 0 }) => {
  const { action } = stageProgress(index);
  return (
    <div style={{ ...panelStyle(index), display: "grid", gap: 20, minWidth: 620 }}>
      <strong style={{ color: palette.amber, fontSize: 28 }}>bucket #{element.bucketIndex} collision chain</strong>
      <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
        {element.nodes.map((node, nodeIndex) => (
          <React.Fragment key={`${node}-${nodeIndex}`}>
            <StepBox label={`node ${nodeIndex}`} value={node} active={nodeIndex <= Math.round(action * Math.max(1, element.nodes.length - 1)) || nodeIndex === element.activeNodeIndex} />
            {nodeIndex < element.nodes.length - 1 ? <FlowArrow active={action > nodeIndex / Math.max(1, element.nodes.length)} /> : null}
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export const ArrayCells: React.FC<{ element: ElementOf<"array_cells">; index?: number }> = ({ element, index = 0 }) => {
  const active = new Set(element.activeIndices ?? []);
  return (
    <div style={{ ...panelStyle(index), display: "grid", gap: 16 }}>
      <div style={{ display: "flex", gap: 10, alignItems: "end", justifyContent: "center" }}>
        {element.items.slice(0, 10).map((item, itemIndex) => (
          <div key={`${item}-${itemIndex}`} style={{ display: "grid", justifyItems: "center", gap: 8 }}>
            <span style={{ color: palette.muted, fontSize: 17 }}>{element.pointerLabels?.[String(itemIndex)] ?? itemIndex}</span>
            <div style={cellStyle(active.has(itemIndex), itemIndex)}>{item}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const LinkedListNodes: React.FC<{ element: ElementOf<"linked_list_nodes">; index?: number }> = ({ element, index = 0 }) => (
  <div style={{ ...panelStyle(index), display: "flex", alignItems: "center", gap: 18 }}>
    {element.nodes.map((node, nodeIndex) => (
      <React.Fragment key={`${node}-${nodeIndex}`}>
        <StepBox label={nodeIndex === 0 ? "head" : nodeIndex === element.nodes.length - 1 ? "tail" : `node ${nodeIndex}`} value={node} active={nodeIndex === (element.activeIndex ?? 0)} />
        {nodeIndex < element.nodes.length - 1 ? <FlowArrow active label={element.pointerLabel ?? "next"} /> : null}
      </React.Fragment>
    ))}
  </div>
);

export const StackBlocks: React.FC<{ element: ElementOf<"stack_blocks">; index?: number }> = ({ element, index = 0 }) => {
  const { action } = stageProgress(index);
  const activeIndex = element.activeIndex ?? element.items.length - 1;
  return (
    <div style={{ ...panelStyle(index), display: "grid", justifyItems: "center", gap: 18, minWidth: 330 }}>
      <strong style={{ color: palette.cyan, fontSize: 28 }}>{element.operation}</strong>
      <div style={{ display: "flex", flexDirection: "column-reverse", gap: 10 }}>
        {element.items.map((item, itemIndex) => {
          const active = itemIndex === activeIndex;
          return (
            <div key={`${item}-${itemIndex}`} style={{ ...cellStyle(active, itemIndex), width: 220, transform: active ? `translateY(${-28 * action}px) scale(${1 + action * 0.06})` : undefined }}>
              {item}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export const QueueLine: React.FC<{ element: ElementOf<"queue_line">; index?: number }> = ({ element, index = 0 }) => {
  const head = element.headIndex ?? 0;
  const tail = element.tailIndex ?? Math.max(0, element.items.length - 1);
  return (
    <div style={{ ...panelStyle(index), display: "grid", gap: 18 }}>
      <strong style={{ color: palette.cyan, fontSize: 28 }}>{element.operation}</strong>
      <div style={{ display: "flex", gap: 10 }}>
        {element.items.map((item, itemIndex) => (
          <div key={`${item}-${itemIndex}`} style={{ display: "grid", justifyItems: "center", gap: 8 }}>
            <span style={{ color: itemIndex === head || itemIndex === tail ? palette.amber : palette.muted, fontSize: 18 }}>{itemIndex === head ? "head" : itemIndex === tail ? "tail" : itemIndex}</span>
            <div style={cellStyle(itemIndex === head || itemIndex === tail, itemIndex)}>{item}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const TreeNodeGraph: React.FC<{ element: ElementOf<"tree_node_graph">; index?: number }> = ({ element, index = 0 }) => {
  const { action } = stageProgress(index);
  const active = new Set(element.activePath ?? []);
  const nodes = element.nodes.slice(0, 7);
  return (
    <div style={{ ...panelStyle(index), position: "relative", width: 700, height: 360 }}>
      <svg width="700" height="360" style={{ position: "absolute", inset: 0 }}>
        {(element.edges ?? []).map(([from, to], edgeIndex) => {
          const fromIndex = Math.max(0, nodes.indexOf(from));
          const toIndex = Math.max(0, nodes.indexOf(to));
          const a = treePoint(fromIndex);
          const b = treePoint(toIndex);
          return <line key={`${from}-${to}-${edgeIndex}`} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke={palette.border} strokeWidth={4} opacity={0.35 + action * 0.5} />;
        })}
      </svg>
      {nodes.map((node, nodeIndex) => {
        const point = treePoint(nodeIndex);
        return (
          <div key={`${node}-${nodeIndex}`} style={{ ...cellStyle(active.has(node), nodeIndex), position: "absolute", left: point.x - 58, top: point.y - 36, width: 116, minWidth: 116 }}>
            {node}
          </div>
        );
      })}
    </div>
  );
};

export const CodeTracePanel: React.FC<{ element: ElementOf<"code_trace_panel">; index?: number }> = ({ element, index = 0 }) => {
  const { action } = stageProgress(index);
  const activeLine = element.activeLineIndex ?? Math.floor(action * Math.max(0, element.codeLines.length - 1));
  return (
    <div style={{ ...panelStyle(index), display: "grid", gridTemplateColumns: "1.35fr 0.65fr", gap: 22, minWidth: 740 }}>
      <div style={{ display: "grid", gap: 8 }}>
        {element.codeLines.slice(0, 7).map((line, lineIndex) => (
          <div key={`${line}-${lineIndex}`} style={{ padding: "10px 14px", borderRadius: 10, background: lineIndex === activeLine ? "rgba(255,200,87,0.2)" : "rgba(255,255,255,0.04)", color: lineIndex === activeLine ? palette.amber : palette.text, fontSize: 22, fontFamily: "Consolas, monospace" }}>
            {line}
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gap: 10, alignContent: "start" }}>
        {Object.entries(element.variables ?? {}).map(([name, value]) => (
          <StepBox key={name} label={name} value={value} active />
        ))}
      </div>
    </div>
  );
};

export const PointerArrow: React.FC<{ element: ElementOf<"pointer_arrow">; index?: number }> = ({ element, index = 0 }) => (
  <div style={{ ...panelStyle(index), display: "flex", alignItems: "center", gap: 16 }}>
    <StepBox label="from" value={element.fromLabel} active />
    <FlowArrow active label={element.label} />
    <StepBox label="to" value={element.toLabel} active />
  </div>
);

export const MemoryBox: React.FC<{ element: ElementOf<"memory_box">; index?: number }> = ({ element, index = 0 }) => (
  <div style={{ ...panelStyle(index), display: "grid", gap: 10, minWidth: 290 }}>
    <span style={{ color: palette.muted, fontSize: 20 }}>{element.address}</span>
    <div style={cellStyle(Boolean(element.active), index)}>{element.value}</div>
  </div>
);

export const ComplexityChart: React.FC<{ element: ElementOf<"complexity_chart">; index?: number }> = ({ element, index = 0 }) => {
  const { action } = stageProgress(index);
  const activeIndex = element.activeIndex ?? 0;
  return (
    <div style={{ ...panelStyle(index), display: "grid", gap: 18, minWidth: 560 }}>
      <strong style={{ color: palette.amber, fontSize: 28 }}>{element.label}</strong>
      {element.items.slice(0, 5).map((item, itemIndex) => (
        <div key={`${item}-${itemIndex}`} style={{ display: "grid", gridTemplateColumns: "160px 1fr", gap: 16, alignItems: "center" }}>
          <span style={{ color: itemIndex === activeIndex ? palette.cyan : palette.text, fontSize: 24 }}>{item}</span>
          <div style={{ height: 22, borderRadius: 999, background: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
            <div style={{ width: `${(itemIndex === activeIndex ? 78 : 34 + itemIndex * 10) * action}%`, height: "100%", background: itemIndex === activeIndex ? palette.cyan : palette.blue }} />
          </div>
        </div>
      ))}
    </div>
  );
};

const StepBox: React.FC<{ label: string; value: string; active: boolean }> = ({ label, value, active }) => (
  <div style={{ ...cellStyle(active), minWidth: 130, height: 96, display: "grid", gap: 4 }}>
    <span style={{ fontSize: 17, color: palette.muted }}>{label}</span>
    <strong>{value}</strong>
  </div>
);

const FlowArrow: React.FC<{ active: boolean; label?: string }> = ({ active, label }) => {
  const { action } = stageProgress();
  return (
    <div style={{ display: "grid", justifyItems: "center", gap: 4, color: active ? palette.cyan : palette.muted }}>
      {label ? <span style={{ fontSize: 16 }}>{label}</span> : null}
      <svg width="72" height="28" viewBox="0 0 72 28" fill="none">
        <path d="M4 14h54" stroke="currentColor" strokeWidth="4" strokeLinecap="round" pathLength="1" strokeDasharray="1" strokeDashoffset={active ? 1 - action : 0.65} />
        <path d="m51 5 14 9-14 9" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" opacity={active ? action : 0.45} />
      </svg>
    </div>
  );
};

const treePoint = (index: number) => {
  const points = [
    { x: 350, y: 62 },
    { x: 205, y: 165 },
    { x: 495, y: 165 },
    { x: 120, y: 280 },
    { x: 288, y: 280 },
    { x: 412, y: 280 },
    { x: 580, y: 280 },
  ];
  return points[index] ?? points[0];
};
