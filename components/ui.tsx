import type { ReactNode } from "react";
import type { TermRow } from "@/lib/model";
import { STATUS_LABEL } from "@/lib/model";

export const Check = ({ size = 16, color = "currentColor" }: { size?: number; color?: string }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M20 6 9 17l-5-5" />
  </svg>
);

export const Back = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const Play = ({ size = 16 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="#FFFFFF" aria-hidden="true">
    <path d="M8 5v14l11-7z" />
  </svg>
);

export function Status({ status, style }: { status: string; style?: React.CSSProperties }) {
  if (!status) return null;
  return (
    <span className={`st st-${status}`} style={style}>
      {STATUS_LABEL[status] ?? status}
    </span>
  );
}

export function TermsList({ rows, extra }: { rows: TermRow[]; extra?: ReactNode }) {
  return (
    <dl className="terms">
      {rows.map((t) => (
        <div key={t.k} style={{ display: "contents" }}>
          <dt>{t.k}</dt>
          <dd>
            <p className="v">{t.v}</p>
            <p className="n">{t.n}</p>
          </dd>
        </div>
      ))}
      {extra}
    </dl>
  );
}

export function Thumb({ src, pos, dur, plat, className = "", playSize = 16, alt = "" }: { src: string; pos: string; dur?: string; plat?: string; className?: string; playSize?: number; alt?: string }) {
  return (
    <span className={`thumb ${className}`}>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} style={{ objectPosition: pos }} />
      {plat && <span className="plat">{plat}</span>}
      <span className="play" aria-hidden="true">
        <Play size={playSize} />
      </span>
      {dur && <span className="dur">{dur}</span>}
    </span>
  );
}

export function SelfReported() {
  return <span className="selfrep">Self-reported</span>;
}
