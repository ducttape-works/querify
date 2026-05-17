import type { BTreeNode, BTreeStep, StepType } from "../../lib/btree";

const KEY_W = 40;
const NODE_H = 36;
const H_PAD = 8;
const V_GAP = 56;
const H_GAP = 12;
const CANVAS_PAD = 24;
const MIN_NODE_W = KEY_W + H_PAD * 2;

const STEP_BG: Record<StepType, string> = {
  traverse: "var(--accent)",
  insert: "#2563eb",
  split: "#d97706",
  found: "#16a34a",
  "not-found": "#dc2626",
};

type Pos = { node: BTreeNode; x: number; y: number; w: number };

function nodeW(node: BTreeNode) {
  return Math.max(node.keys.length * KEY_W + H_PAD * 2, MIN_NODE_W);
}

function subtreeW(node: BTreeNode): number {
  if (node.isLeaf || !node.children.length) return nodeW(node);
  const childTotal =
    node.children.reduce((s, c) => s + subtreeW(c), 0) +
    H_GAP * (node.children.length - 1);
  return Math.max(nodeW(node), childTotal);
}

function buildLayout(node: BTreeNode, x: number, y: number, out: Pos[]) {
  const sw = subtreeW(node);
  const nw = nodeW(node);
  out.push({ node, x: x + (sw, nw) / 2, y, w: nw });

  if (!node.isLeaf && node.children.length) {
    let cx = x;
    for (const child of node.children) {
      const csw = subtreeW(child);
      buildLayout(child, cx, y + NODE_H + V_GAP, out);
      cx += csw + H_GAP;
    }
  }
}

export function BTreeVisual({ step }: { step: BTreeStep }) {
  const positions: Pos[] = [];
  buildLayout(step.root, 0, 0, positions);

  const posMap = new Map(positions.map((p) => [p.node.id, p]));
  const maxX = Math.max(...positions.map((p) => p.x + p.w), MIN_NODE_W);
  const maxY = Math.max(...positions.map((p) => p.y), 0);
  const svgW = maxX + CANVAS_PAD * 2;
  const svgH = maxY + NODE_H + CANVAS_PAD * 2;

  const hlColor = STEP_BG[step.type];

  return (
    <svg
      width={svgW}
      height={svgH}
      viewBox={`0 0 ${svgW} ${svgH}`}
      style={{ display: "block", overflow: "visible", maxWidth: "100%", height: "auto" }}
    >
      {positions.flatMap(({ node, x, y }) =>
        node.isLeaf || !node.children.length
          ? []
          : node.children.map((child, ci) => {
              const cp = posMap.get(child.id);
              if (!cp) return null;
              const ex = CANVAS_PAD + x + H_PAD + ci * KEY_W;
              const ey = CANVAS_PAD + y + NODE_H;
              const tx = CANVAS_PAD + cp.x + cp.w / 2;
              const ty = CANVAS_PAD + cp.y;
              const my = (ey + ty) / 2;
              return (
                <path
                  key={`e-${node.id}-${ci}`}
                  d={`M ${ex} ${ey} C ${ex} ${my}, ${tx} ${my}, ${tx} ${ty}`}
                  fill="none"
                  stroke="#b0a89f"
                  strokeWidth={1.5}
                />
              );
            }),
      )}

      {positions.map(({ node, x, y, w }) => {
        const isHL = node.id === step.highlightNodeId;
        const px = CANVAS_PAD + x;
        const py = CANVAS_PAD + y;

        return (
          <g key={node.id}>
            <rect
              x={px}
              y={py}
              width={w}
              height={NODE_H}
              rx={6}
              fill={isHL ? hlColor : "var(--surface)"}
              stroke={isHL ? hlColor : "var(--border)"}
              strokeWidth={1.5}
              style={{ transition: "fill 80ms, stroke 80ms" }}
            />

            {node.keys.length === 0 && (
              <text
                x={px + w / 2}
                y={py + NODE_H / 2}
                textAnchor="middle"
                dominantBaseline="middle"
                fill="var(--text-muted)"
                fontSize={11}
                fontFamily="var(--mono)"
              >
                empty
              </text>
            )}

            {node.keys.map((key, ki) => {
              const isKeyHL = isHL && ki === step.highlightKeyIdx;
              const kx = px + H_PAD + ki * KEY_W + KEY_W / 2;
              const ky = py + NODE_H / 2;

              return (
                <g key={ki}>
                  {ki > 0 && (
                    <line
                      x1={px + H_PAD + ki * KEY_W}
                      y1={py + 6}
                      x2={px + H_PAD + ki * KEY_W}
                      y2={py + NODE_H - 6}
                      stroke={isHL ? "rgba(255,255,255,0.3)" : "var(--border)"}
                      strokeWidth={1}
                    />
                  )}
                  {isKeyHL && (
                    <rect
                      x={px + H_PAD + ki * KEY_W + 2}
                      y={py + 4}
                      width={KEY_W - 4}
                      height={NODE_H - 8}
                      rx={3}
                      fill="rgba(255,255,255,0.25)"
                    />
                  )}
                  <text
                    x={kx}
                    y={ky}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    fill={isHL ? "#fff" : "var(--text)"}
                    fontSize={13}
                    fontFamily="var(--mono)"
                    fontWeight={isKeyHL ? 700 : 500}
                  >
                    {key}
                  </text>
                </g>
              );
            })}
          </g>
        );
      })}
    </svg>
  );
}
