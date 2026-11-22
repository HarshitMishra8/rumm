import type { ArtKind } from "@/lib/types";

/** Mix a hex colour toward white (amt > 0) or black (amt < 0). amt in -1..1 */
export function shade(hex: string, amt: number): string {
  const n = parseInt(hex.slice(1), 16);
  const ch = [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((c) =>
    Math.round(amt >= 0 ? c + (255 - c) * amt : c * (1 + amt)),
  );
  return `#${ch.map((c) => c.toString(16).padStart(2, "0")).join("")}`;
}

/** fill via style so colour changes animate with a CSS transition */
const f = (fill: string) => ({ style: { fill } });

interface Props {
  kind: ArtKind;
  color: string;
  wood: string;
  className?: string;
  title?: string;
  /** omit the floor shadow, e.g. when composed into a room */
  bare?: boolean;
  /** position when nested inside another svg */
  x?: number;
  y?: number;
  width?: number;
  height?: number;
}

const VIEW: Record<ArtKind, string> = {
  sofa: "0 0 400 300",
  armchair: "0 0 400 300",
  coffeetable: "0 0 400 300",
  floorlamp: "0 0 400 300",
  bookcase: "0 0 400 300",
  rug: "0 0 400 300",
  bed: "0 0 400 300",
  nightstand: "0 0 400 300",
  dresser: "0 0 400 300",
  diningtable: "0 0 400 300",
  chair: "0 0 400 300",
  pendant: "0 0 400 300",
  desk: "0 0 400 300",
  plant: "0 0 400 300",
  cushion: "0 0 400 300",
  mugs: "0 0 400 300",
  basket: "0 0 400 300",
};

export function ProductArt({ kind, color, wood, className, title, bare, x, y, width, height }: Props) {
  const c = color;
  const dark = shade(c, -0.18);
  const darker = shade(c, -0.32);
  const light = shade(c, 0.12);
  const w = wood;
  const wd = shade(wood, -0.22);
  const shadow = !bare && kind !== "pendant" && kind !== "rug";

  return (
    <svg
      viewBox={VIEW[kind]}
      className={className}
      x={x}
      y={y}
      width={width}
      height={height}
      overflow="visible"
      role={title ? "img" : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : true}
      xmlns="http://www.w3.org/2000/svg"
    >
      {shadow && <ellipse cx="200" cy="272" rx={kind === "plant" || kind === "mugs" || kind === "floorlamp" ? 80 : 160} ry="7" fill="rgba(23,48,41,.14)" />}
      {art()}
    </svg>
  );

  function art() {
    switch (kind) {
      case "sofa":
        return (
          <g>
            <rect x="74" y="236" width="10" height="34" rx="3" {...f(w)} transform="rotate(6 79 236)" />
            <rect x="316" y="236" width="10" height="34" rx="3" {...f(w)} transform="rotate(-6 321 236)" />
            <rect x="66" y="104" width="268" height="104" rx="22" {...f(dark)} />
            <rect x="84" y="114" width="112" height="78" rx="18" {...f(c)} />
            <rect x="204" y="114" width="112" height="78" rx="18" {...f(c)} />
            <rect x="48" y="184" width="304" height="58" rx="14" {...f(dark)} />
            <rect x="84" y="174" width="114" height="34" rx="12" {...f(light)} />
            <rect x="202" y="174" width="114" height="34" rx="12" {...f(light)} />
            <rect x="34" y="146" width="54" height="98" rx="22" {...f(c)} />
            <rect x="312" y="146" width="54" height="98" rx="22" {...f(c)} />
          </g>
        );
      case "armchair":
        return (
          <g>
            <path d="M118 270 L130 150" stroke={wd} strokeWidth="10" strokeLinecap="round" />
            <path d="M282 270 L270 150" stroke={wd} strokeWidth="10" strokeLinecap="round" />
            <rect x="132" y="70" width="136" height="140" rx="26" {...f(dark)} />
            <rect x="142" y="80" width="116" height="118" rx="22" {...f(c)} />
            <rect x="124" y="184" width="152" height="44" rx="16" {...f(light)} />
            <rect x="96" y="150" width="70" height="14" rx="7" {...f(w)} />
            <rect x="234" y="150" width="70" height="14" rx="7" {...f(w)} />
            <path d="M144 228 L136 272" stroke={w} strokeWidth="10" strokeLinecap="round" />
            <path d="M256 228 L264 272" stroke={w} strokeWidth="10" strokeLinecap="round" />
          </g>
        );
      case "coffeetable":
        return (
          <g>
            <path d="M84 186 L72 270" stroke={darker} strokeWidth="10" strokeLinecap="round" />
            <path d="M316 186 L328 270" stroke={darker} strokeWidth="10" strokeLinecap="round" />
            <rect x="96" y="226" width="208" height="10" rx="5" {...f(dark)} />
            <path d="M112 190 L118 266" stroke={dark} strokeWidth="9" strokeLinecap="round" />
            <path d="M288 190 L282 266" stroke={dark} strokeWidth="9" strokeLinecap="round" />
            <rect x="56" y="170" width="288" height="20" rx="10" {...f(c)} />
            <rect x="56" y="170" width="288" height="6" rx="3" {...f(light)} />
            <rect x="168" y="214" width="44" height="12" rx="2" fill="#3E5E78" />
            <rect x="174" y="206" width="36" height="8" rx="2" fill="#C9962E" />
          </g>
        );
      case "floorlamp":
        return (
          <g>
            <defs>
              <radialGradient id="glow-floorlamp" cx="50%" cy="0%" r="80%">
                <stop offset="0%" stopColor="#FFE6A8" stopOpacity=".7" />
                <stop offset="100%" stopColor="#FFE6A8" stopOpacity="0" />
              </radialGradient>
            </defs>
            <ellipse cx="200" cy="150" rx="110" ry="110" fill="url(#glow-floorlamp)" className="lamp-glow" />
            <ellipse cx="200" cy="266" rx="40" ry="8" {...f(dark)} />
            <rect x="196" y="80" width="8" height="186" rx="4" {...f(c)} />
            <path d="M150 92 L250 92 L232 30 L168 30 Z" fill="#EFE6D2" />
            <path d="M150 92 L250 92 L246 80 L154 80 Z" fill="#E2D6BC" />
            <circle cx="232" cy="258" r="5" {...f(darker)} />
          </g>
        );
      case "bookcase":
        return (
          <g>
            <rect x="122" y="22" width="156" height="248" rx="4" {...f(dark)} />
            <rect x="130" y="30" width="140" height="232" rx="2" {...f(shade(c, -0.08))} />
            {[76, 124, 172, 220].map((y) => (
              <rect key={y} x="130" y={y} width="140" height="6" {...f(c)} />
            ))}
            {/* books */}
            <g>
              <rect x="138" y="40" width="10" height="36" fill="#3E5E78" />
              <rect x="150" y="46" width="8" height="30" fill="#C9962E" />
              <rect x="160" y="42" width="12" height="34" fill="#A5502F" />
              <rect x="176" y="50" width="30" height="26" rx="13" fill="#8FA08A" />
              <rect x="226" y="92" width="10" height="32" fill="#26343F" />
              <rect x="238" y="96" width="10" height="28" fill="#C9BBA2" />
              <rect x="250" y="88" width="8" height="36" fill="#5E6B45" />
              <rect x="140" y="140" width="40" height="32" rx="3" fill="#BFA06A" />
              <rect x="210" y="182" width="12" height="38" fill="#B9826A" />
              <rect x="224" y="186" width="10" height="34" fill="#3B4F7A" />
              <rect x="236" y="190" width="40" height="8" transform="rotate(-20 236 190)" fill="#E8E4DC" />
              <circle cx="160" cy="246" r="14" fill="#B8693F" />
            </g>
          </g>
        );
      case "rug":
        return (
          <g>
            <path d="M70 250 L330 250 L380 196 L120 196 Z" {...f(c)} />
            {[0.2, 0.4, 0.6, 0.8].map((t) => {
              const y = 250 - t * 54;
              const x1 = 70 + t * 50;
              return <path key={t} d={`M${x1} ${y} L${x1 + 260} ${y}`} stroke={shade(c, -0.25)} strokeWidth="5" />;
            })}
            <path d="M70 250 L330 250 L380 196 L120 196 Z" fill="none" stroke={shade(c, 0.35)} strokeWidth="4" />
            {Array.from({ length: 14 }, (_, i) => (
              <path key={i} d={`M${76 + i * 18} 252 l0 8`} stroke={shade(c, 0.3)} strokeWidth="2" />
            ))}
          </g>
        );
      case "bed":
        return (
          <g>
            <rect x="60" y="70" width="280" height="170" rx="18" {...f(c)} />
            <rect x="72" y="82" width="256" height="70" rx="12" {...f(light)} />
            <rect x="50" y="200" width="300" height="44" rx="8" {...f(w)} />
            <rect x="62" y="160" width="276" height="48" rx="10" fill="#F4F1EA" />
            <rect x="92" y="132" width="96" height="38" rx="16" fill="#FBFAF6" />
            <rect x="212" y="132" width="96" height="38" rx="16" fill="#FBFAF6" />
            <path d="M62 186 Q200 172 338 186 L338 214 L62 214 Z" {...f(shade(c, 0.35))} />
            <rect x="64" y="244" width="10" height="26" rx="3" {...f(wd)} />
            <rect x="326" y="244" width="10" height="26" rx="3" {...f(wd)} />
          </g>
        );
      case "nightstand":
        return (
          <g>
            <path d="M156 232 L148 272" stroke={wd} strokeWidth="8" strokeLinecap="round" />
            <path d="M244 232 L252 272" stroke={wd} strokeWidth="8" strokeLinecap="round" />
            <rect x="136" y="120" width="128" height="112" rx="8" {...f(c)} />
            <rect x="136" y="120" width="128" height="8" rx="4" {...f(light)} />
            <rect x="146" y="138" width="108" height="40" rx="4" {...f(dark)} />
            <rect x="180" y="154" width="40" height="6" rx="3" {...f(darker)} />
            <rect x="146" y="186" width="108" height="36" rx="4" {...f(shade(c, -0.08))} />
            <rect x="160" y="96" width="28" height="24" rx="3" fill="#3E5E78" />
            <rect x="214" y="78" width="6" height="42" fill="#26343F" />
            <path d="M196 80 L238 80 L230 56 L204 56 Z" fill="#EFE6D2" />
          </g>
        );
      case "dresser":
        return (
          <g>
            <path d="M92 236 L86 272" stroke={wd} strokeWidth="9" strokeLinecap="round" />
            <path d="M308 236 L314 272" stroke={wd} strokeWidth="9" strokeLinecap="round" />
            <rect x="78" y="96" width="244" height="142" rx="8" {...f(c)} />
            <rect x="78" y="96" width="244" height="8" rx="4" {...f(light)} />
            {[0, 1, 2].map((r) =>
              [0, 1].map((col) => (
                <g key={`${r}${col}`}>
                  <rect x={90 + col * 114} y={112 + r * 42} width="106" height="36" rx="4" {...f(shade(c, -0.07))} />
                  <rect x={127 + col * 114} y={113 + r * 42} width="32" height="5" rx="2.5" {...f(darker)} />
                </g>
              )),
            )}
            <circle cx="116" cy="82" r="14" fill="#B8693F" />
            <path d="M116 68 q-12 -18 -2 -30 q8 12 2 30" fill="#5E6B45" />
            <rect x="250" y="62" width="44" height="34" rx="3" fill="#E8E4DC" />
            <rect x="256" y="68" width="32" height="22" fill="#8FA08A" />
          </g>
        );
      case "diningtable":
        return (
          <g>
            <path d="M88 150 L74 270" stroke={dark} strokeWidth="12" strokeLinecap="round" />
            <path d="M312 150 L326 270" stroke={dark} strokeWidth="12" strokeLinecap="round" />
            <path d="M124 150 L132 258" stroke={darker} strokeWidth="10" strokeLinecap="round" />
            <path d="M276 150 L268 258" stroke={darker} strokeWidth="10" strokeLinecap="round" />
            <rect x="44" y="132" width="312" height="22" rx="8" {...f(c)} />
            <rect x="44" y="132" width="312" height="7" rx="3.5" {...f(light)} />
            <ellipse cx="200" cy="124" rx="34" ry="8" fill="#E8E4DC" />
            <circle cx="160" cy="118" r="10" fill="#C9962E" />
            <circle cx="244" cy="114" r="6" fill="#A5502F" />
            <path d="M244 108 l0 -12" stroke="#5E6B45" strokeWidth="3" />
          </g>
        );
      case "chair":
        return (
          <g>
            <path d="M160 180 L148 272" stroke={dark} strokeWidth="9" strokeLinecap="round" />
            <path d="M240 180 L252 272" stroke={dark} strokeWidth="9" strokeLinecap="round" />
            <path d="M174 186 L180 262" stroke={darker} strokeWidth="7" strokeLinecap="round" />
            <path d="M226 186 L220 262" stroke={darker} strokeWidth="7" strokeLinecap="round" />
            <path d="M154 176 L160 60" stroke={c} strokeWidth="10" strokeLinecap="round" />
            <path d="M246 176 L240 60" stroke={c} strokeWidth="10" strokeLinecap="round" />
            <path d="M158 70 Q200 58 242 70 L240 104 Q200 92 160 104 Z" {...f(c)} />
            <rect x="142" y="168" width="116" height="20" rx="9" {...f(light)} />
          </g>
        );
      case "pendant":
        return (
          <g>
            <defs>
              <radialGradient id="glow-pendant" cx="50%" cy="0%" r="90%">
                <stop offset="0%" stopColor="#FFE6A8" stopOpacity=".75" />
                <stop offset="100%" stopColor="#FFE6A8" stopOpacity="0" />
              </radialGradient>
            </defs>
            <path d="M120 150 L280 150 L360 290 L40 290 Z" fill="url(#glow-pendant)" className="lamp-glow" />
            <line x1="200" y1="0" x2="200" y2="96" stroke="#26343F" strokeWidth="3" />
            <rect x="192" y="88" width="16" height="16" rx="3" fill="#26343F" />
            <path d="M120 152 Q124 104 200 100 Q276 104 280 152 Z" {...f(c)} />
            <path d="M120 152 L280 152" stroke={dark} strokeWidth="4" strokeLinecap="round" />
            <ellipse cx="200" cy="154" rx="20" ry="8" fill="#FFF3CF" />
          </g>
        );
      case "desk":
        return (
          <g>
            <path d="M80 146 L80 270" stroke="#26343F" strokeWidth="8" strokeLinecap="round" />
            <path d="M320 146 L320 270" stroke="#26343F" strokeWidth="8" strokeLinecap="round" />
            <path d="M80 268 L120 268 M280 268 L320 268" stroke="#26343F" strokeWidth="8" strokeLinecap="round" />
            <rect x="96" y="150" width="208" height="12" rx="3" {...f(dark)} />
            <rect x="200" y="152" width="96" height="22" rx="4" {...f(shade(c, -0.08))} />
            <rect x="236" y="160" width="24" height="5" rx="2.5" {...f(darker)} />
            <rect x="56" y="134" width="288" height="18" rx="6" {...f(c)} />
            <rect x="56" y="134" width="288" height="6" rx="3" {...f(light)} />
            <path d="M120 134 L130 92 L198 92 L188 134 Z" fill="#26343F" />
            <rect x="110" y="130" width="100" height="5" rx="2" fill="#4A5A66" />
            <rect x="262" y="104" width="22" height="30" rx="4" fill="#E6E0D4" />
            <path d="M284 112 q10 0 10 9 q0 8 -10 8" fill="none" stroke="#E6E0D4" strokeWidth="4" />
          </g>
        );
      case "plant":
        return (
          <g>
            <path d="M200 160 C170 120 130 120 110 90 C150 92 180 110 198 150" fill="#5E6B45" />
            <path d="M202 158 C220 110 260 100 290 70 C276 116 240 130 206 160" fill="#6F7F52" />
            <path d="M198 160 C196 110 200 70 214 30 C228 76 216 120 204 160" fill="#4E5B38" />
            <path d="M200 160 C176 140 150 150 128 140 C150 128 180 132 200 156" fill="#7C8D5C" />
            <ellipse cx="200" cy="262" rx="76" ry="10" {...f(dark)} />
            <path d="M138 160 L262 160 L248 256 L152 256 Z" {...f(c)} />
            <rect x="132" y="152" width="136" height="16" rx="6" {...f(light)} />
          </g>
        );
      case "cushion": {
        const dots = [];
        for (let x = 0; x < 5; x++)
          for (let y = 0; y < 5; y++)
            dots.push(
              <g key={`${x}-${y}`} transform={`translate(${132 + x * 34} ${88 + y * 34})`}>
                <circle r="7" fill={shade(c, 0.55)} />
                <circle r="2.5" {...f(c)} />
              </g>,
            );
        return (
          <g>
            <path d="M110 70 Q200 58 290 70 Q302 160 290 250 Q200 262 110 250 Q98 160 110 70 Z" {...f(c)} />
            {dots}
            <path d="M110 70 Q200 58 290 70 Q302 160 290 250 Q200 262 110 250 Q98 160 110 70 Z" fill="none" stroke={dark} strokeWidth="5" />
          </g>
        );
      }
      case "mugs":
        return (
          <g>
            {[
              { x: 108, y: 160, s: 1 },
              { x: 206, y: 140, s: 1.15 },
            ].map(({ x, y, s }, i) => (
              <g key={i} transform={`translate(${x} ${y}) scale(${s})`}>
                <path d="M74 30 q30 0 30 26 q0 26 -30 26" fill="none" stroke={dark} strokeWidth="10" />
                <rect x="0" y="10" width="80" height="94" rx="12" {...f(c)} />
                <ellipse cx="40" cy="12" rx="40" ry="8" {...f(dark)} />
                <ellipse cx="40" cy="14" rx="34" ry="5" fill="#7A5236" />
                {[18, 44, 58, 30, 66].map((dx, j) => (
                  <circle key={j} cx={dx} cy={34 + j * 12} r="1.8" fill={shade(c, -0.45)} />
                ))}
              </g>
            ))}
          </g>
        );
      case "basket":
        return (
          <g>
            <path d="M104 120 L296 120 L280 262 L120 262 Z" {...f(c)} />
            {Array.from({ length: 9 }, (_, i) => (
              <path key={i} d={`M${106 + i * 1.8} ${136 + i * 14} L${294 - i * 1.8} ${136 + i * 14}`} stroke={dark} strokeWidth="3" />
            ))}
            {Array.from({ length: 12 }, (_, i) => (
              <path key={`v${i}`} d={`M${118 + i * 15} 124 L${124 + i * 13.4} 260`} stroke={shade(c, 0.18)} strokeWidth="2" opacity=".7" />
            ))}
            <rect x="98" y="112" width="204" height="14" rx="7" {...f(dark)} />
            <path d="M120 120 q-26 -20 4 -36" fill="none" stroke="#E6E0D4" strokeWidth="7" strokeLinecap="round" />
            <path d="M280 120 q26 -20 -4 -36" fill="none" stroke="#E6E0D4" strokeWidth="7" strokeLinecap="round" />
            <path d="M150 112 Q190 70 250 112" fill="#8FA08A" />
          </g>
        );
    }
  }
}
