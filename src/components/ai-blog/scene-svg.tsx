import type { RenderScene, SceneGradient, SceneNode } from "@/lib/ai-blog/render/scene";
import { RENDER_FONT_FAMILY } from "@/lib/ai-blog/render/scene";
import { cn } from "@/lib/utils";

/**
 * 렌더 장면 → SVG (화면 미리보기).
 *
 * viewBox 를 실제 출력 해상도로 두고 CSS 로만 줄이기 때문에,
 * 화면에 보이는 배치와 다운로드 파일의 배치가 완전히 같다.
 */

function gradientCoords(direction: SceneGradient["direction"]) {
  if (direction === "horizontal") return { x1: "0%", y1: "0%", x2: "100%", y2: "0%" };
  if (direction === "diagonal") return { x1: "0%", y1: "0%", x2: "100%", y2: "100%" };
  return { x1: "0%", y1: "0%", x2: "0%", y2: "100%" };
}

function Node({ node, id }: { node: SceneNode; id: string }) {
  if (node.kind === "rect") {
    return (
      <rect
        x={node.x}
        y={node.y}
        width={node.w}
        height={node.h}
        rx={node.radius}
        ry={node.radius}
        fill={node.gradient ? `url(#${id})` : (node.fill ?? "none")}
        stroke={node.stroke}
        strokeWidth={node.strokeWidth}
        strokeDasharray={node.dash?.join(" ")}
        opacity={node.opacity}
      />
    );
  }

  if (node.kind === "circle") {
    return (
      <circle
        cx={node.cx}
        cy={node.cy}
        r={node.r}
        fill={node.gradient ? `url(#${id})` : (node.fill ?? "none")}
        stroke={node.stroke}
        strokeWidth={node.strokeWidth}
        strokeDasharray={node.dash?.join(" ")}
        opacity={node.opacity}
      />
    );
  }

  if (node.kind === "line") {
    return (
      <line
        x1={node.x1}
        y1={node.y1}
        x2={node.x2}
        y2={node.y2}
        stroke={node.stroke}
        strokeWidth={node.strokeWidth}
        strokeDasharray={node.dash?.join(" ")}
        strokeLinecap="round"
        opacity={node.opacity}
      />
    );
  }

  if (node.kind === "arrow") {
    const { x, y, size } = node;
    const points =
      node.direction === "right"
        ? `${x},${y - size / 2} ${x},${y + size / 2} ${x + size},${y}`
        : `${x - size / 2},${y} ${x + size / 2},${y} ${x},${y + size}`;
    return <polygon points={points} fill={node.fill} />;
  }

  if (node.kind === "path") {
    const scale = node.size / (node.viewport ?? 24);
    return (
      <path
        d={node.d}
        transform={`translate(${node.x} ${node.y}) scale(${scale})`}
        fill={node.fill ?? "none"}
        stroke={node.stroke}
        strokeWidth={node.strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        opacity={node.opacity}
      />
    );
  }

  if (node.kind === "image") {
    return (
      <image
        href={node.href}
        x={node.x}
        y={node.y}
        width={node.w}
        height={node.h}
        opacity={node.opacity}
        preserveAspectRatio="xMidYMid slice"
      />
    );
  }

  const anchor = node.align === "center" ? "middle" : node.align === "right" ? "end" : "start";
  return (
    <text
      x={node.x}
      y={node.y}
      fill={node.color}
      fontSize={node.size}
      fontWeight={node.weight}
      fontFamily={RENDER_FONT_FAMILY}
      textAnchor={anchor}
      opacity={node.opacity}
    >
      {node.lines.map((line, i) => (
        <tspan key={`${line}-${i}`} x={node.x} dy={i === 0 ? 0 : node.lineHeight}>
          {line}
        </tspan>
      ))}
    </text>
  );
}

export function SceneSvg({ scene, className }: { scene: RenderScene; className?: string }) {
  const gradients = scene.nodes
    .map((node, i) => ({ node, i }))
    .filter(({ node }) => (node.kind === "rect" || node.kind === "circle") && node.gradient);

  return (
    <svg
      viewBox={`0 0 ${scene.width} ${scene.height}`}
      className={cn("block h-auto w-full", className)}
      role="img"
      aria-label="이미지 미리보기"
    >
      <defs>
        {scene.backgroundGradient && (
          <linearGradient id="scene-bg" {...gradientCoords(scene.backgroundGradient.direction)}>
            <stop offset="0%" stopColor={scene.backgroundGradient.from} />
            <stop offset="100%" stopColor={scene.backgroundGradient.to} />
          </linearGradient>
        )}
        {gradients.map(({ node, i }) => {
          const gradient = (node as { gradient?: SceneGradient }).gradient;
          if (!gradient) return null;
          return (
            <linearGradient key={i} id={`scene-g-${i}`} {...gradientCoords(gradient.direction)}>
              <stop offset="0%" stopColor={gradient.from} />
              <stop offset="100%" stopColor={gradient.to} />
            </linearGradient>
          );
        })}
      </defs>

      <rect
        x={0}
        y={0}
        width={scene.width}
        height={scene.height}
        fill={scene.backgroundGradient ? "url(#scene-bg)" : scene.background}
      />
      {scene.nodes.map((node, i) => (
        <Node key={`${node.kind}-${i}`} node={node} id={`scene-g-${i}`} />
      ))}
    </svg>
  );
}
