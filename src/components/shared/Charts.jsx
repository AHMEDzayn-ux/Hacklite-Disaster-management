/* eslint-disable react-refresh/only-export-components -- palette constant is intentionally colocated with the chart primitives */
import React, { useState, useRef, useLayoutEffect } from 'react';

/**
 * Zero-dependency SVG/HTML chart primitives for the Emergency Operations
 * Center dashboard. Built by hand (no chart library) to keep the bundle small,
 * respect the app's lite-mode, and stay fully controllable/compact.
 *
 * All charts are theme-consistent, accept an explicit color per series/slice,
 * and degrade gracefully with empty data.
 */

// Categorical palette — hex so it works inside SVG (Tailwind `fill-*`/`bg-*`
// utilities are unreliable on arbitrary elements and some tokens like
// `warning`/`info` aren't even defined in this project's tailwind config).
export const CHART_COLORS = [
    '#2563eb', '#dc2626', '#16a34a', '#f59e0b', '#7c3aed',
    '#0891b2', '#db2777', '#ea580c', '#0d9488', '#64748b',
];

function niceCeil(v) {
    if (v <= 5) return 5;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const n = v / pow;
    const m = n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10;
    return m * pow;
}

// Measures its container so SVGs render at real pixel width (no non-uniform
// scaling distortion, and pointer coords map 1:1 for hover interactions).
function useWidth(fallback = 560) {
    const ref = useRef(null);
    const [w, setW] = useState(fallback);
    useLayoutEffect(() => {
        if (!ref.current) return undefined;
        const el = ref.current;
        const ro = new ResizeObserver(entries => {
            const cw = entries[0]?.contentRect?.width;
            if (cw) setW(cw);
        });
        ro.observe(el);
        if (el.clientWidth) setW(el.clientWidth);
        return () => ro.disconnect();
    }, []);
    return [ref, w];
}

/** Donut / pie chart with an inline legend. data: [{ label, value, color }] */
export function Donut({ data, size = 132, thickness = 22, centerLabel, centerSub }) {
    const total = data.reduce((s, d) => s + d.value, 0);
    const r = (size - thickness) / 2;
    const c = 2 * Math.PI * r;
    let acc = 0;
    return (
        <div className="flex items-center gap-4">
            <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="flex-shrink-0">
                <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
                    <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#f1f5f9" strokeWidth={thickness} />
                    {total > 0 && data.map((d, i) => {
                        const dash = (d.value / total) * c;
                        const el = (
                            <circle
                                key={i} cx={size / 2} cy={size / 2} r={r} fill="none"
                                stroke={d.color} strokeWidth={thickness}
                                strokeDasharray={`${dash} ${c - dash}`} strokeDashoffset={-acc}
                            >
                                <title>{`${d.label}: ${d.value} (${Math.round((d.value / total) * 100)}%)`}</title>
                            </circle>
                        );
                        acc += dash;
                        return el;
                    })}
                </g>
                {centerLabel != null && (
                    <text x="50%" y="48%" textAnchor="middle" fill="#1f2937" style={{ fontSize: size * 0.24, fontWeight: 700 }}>{centerLabel}</text>
                )}
                {centerSub && (
                    <text x="50%" y="64%" textAnchor="middle" fill="#9ca3af" style={{ fontSize: size * 0.1 }}>{centerSub}</text>
                )}
            </svg>
            <div className="space-y-1 min-w-0 flex-1">
                {data.map((d, i) => (
                    <div key={i} className="flex items-center gap-2 text-xs">
                        <span className="w-2.5 h-2.5 rounded-sm flex-shrink-0" style={{ background: d.color }} />
                        <span className="text-gray-600 truncate">{d.label}</span>
                        <span className="ml-auto font-semibold text-gray-800">{d.value}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}

/** Vertical bar chart. data: [{ label, value, color }] */
export function VBars({ data, height = 128 }) {
    const max = Math.max(1, ...data.map(d => d.value));
    return (
        <div className="w-full">
            <div className="flex items-end gap-1.5" style={{ height }}>
                {data.map((d, i) => (
                    <div key={i} className="flex-1 flex items-end justify-center h-full relative group">
                        <div
                            className="w-full rounded-t-sm transition-all"
                            style={{ height: `${(d.value / max) * 100}%`, minHeight: d.value > 0 ? 3 : 0, background: d.color || CHART_COLORS[0] }}
                        />
                        <span className="absolute -top-4 left-1/2 -translate-x-1/2 text-[10px] font-semibold text-gray-700 opacity-0 group-hover:opacity-100 transition-opacity">{d.value}</span>
                    </div>
                ))}
            </div>
            <div className="flex gap-1.5 mt-1">
                {data.map((d, i) => (
                    <span key={i} className="flex-1 text-[9px] leading-tight text-gray-500 text-center truncate" title={d.label}>{d.label}</span>
                ))}
            </div>
        </div>
    );
}

/** Horizontal bars — good for rankings (districts, resources). */
export function HBars({ data, max, valueSuffix = '', labelWidth = 92 }) {
    const m = max || Math.max(1, ...data.map(d => d.value));
    if (data.length === 0) return <p className="text-xs text-gray-400">No data in this range.</p>;
    return (
        <div className="space-y-1.5">
            {data.map((d, i) => (
                <div key={i} className="flex items-center gap-2">
                    <span className="text-xs text-gray-600 truncate flex-shrink-0" style={{ width: labelWidth }} title={d.label}>{d.label}</span>
                    <div className="flex-1 bg-gray-100 rounded-full h-3 overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${(d.value / m) * 100}%`, background: d.color || CHART_COLORS[0] }} />
                    </div>
                    <span className="w-9 text-xs font-semibold text-gray-700 text-right flex-shrink-0">{d.value}{valueSuffix}</span>
                </div>
            ))}
        </div>
    );
}

/**
 * Multi-series line chart with an interactive hover guide + tooltip.
 * series: [{ label, color, values:[] }] ; labels: string[] (x axis)
 */
export function TrendLine({ series, labels, height = 168, area = true }) {
    const [ref, width] = useWidth();
    const [hover, setHover] = useState(null);
    const padL = 30, padR = 10, padT = 12, padB = 22;
    const n = labels.length;
    const W = Math.max(width, 220);
    const plotW = W - padL - padR;
    const plotH = height - padT - padB;
    const maxY = niceCeil(Math.max(1, ...series.flatMap(s => s.values)));
    const x = i => padL + (n <= 1 ? plotW / 2 : (i / (n - 1)) * plotW);
    const y = v => padT + plotH - (v / maxY) * plotH;
    const grid = [0, 0.5, 1].map(f => ({ v: Math.round(maxY * f), yy: padT + plotH - f * plotH }));
    const xStep = Math.max(1, Math.ceil(n / 6));

    const handleMove = e => {
        const rect = e.currentTarget.getBoundingClientRect();
        const px = e.clientX - rect.left;
        const i = Math.round(((px - padL) / plotW) * (n - 1));
        if (i >= 0 && i < n) setHover(i); else setHover(null);
    };

    return (
        <div ref={ref} className="relative w-full">
            <svg width={W} height={height} className="block">
                {grid.map((g, i) => (
                    <g key={i}>
                        <line x1={padL} y1={g.yy} x2={W - padR} y2={g.yy} stroke="#f1f5f9" strokeWidth={1} />
                        <text x={0} y={g.yy + 3} fill="#9ca3af" style={{ fontSize: 9 }}>{g.v}</text>
                    </g>
                ))}
                {labels.map((l, i) => (i % xStep === 0 || i === n - 1) && (
                    <text key={i} x={x(i)} y={height - 6} textAnchor="middle" fill="#9ca3af" style={{ fontSize: 9 }}>{l}</text>
                ))}
                {series.map((s, si) => {
                    const pts = s.values.map((v, i) => `${x(i)},${y(v)}`).join(' ');
                    return (
                        <g key={si}>
                            {area && n > 1 && (
                                <polygon
                                    points={`${padL},${padT + plotH} ${pts} ${padL + plotW},${padT + plotH}`}
                                    fill={s.color} opacity={0.08}
                                />
                            )}
                            <polyline points={pts} fill="none" stroke={s.color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
                            {hover != null && (
                                <circle cx={x(hover)} cy={y(s.values[hover])} r={3.5} fill="#fff" stroke={s.color} strokeWidth={2} />
                            )}
                        </g>
                    );
                })}
                {hover != null && (
                    <line x1={x(hover)} y1={padT} x2={x(hover)} y2={padT + plotH} stroke="#cbd5e1" strokeWidth={1} strokeDasharray="3 3" />
                )}
                <rect x={padL} y={padT} width={plotW} height={plotH} fill="transparent"
                    onMouseMove={handleMove} onMouseLeave={() => setHover(null)} />
            </svg>
            {hover != null && (
                <div
                    className="absolute pointer-events-none bg-gray-900 text-white text-[10px] rounded px-2 py-1 shadow-lg z-10 whitespace-nowrap"
                    style={{ left: Math.min(Math.max(x(hover), 40), W - 90), top: 4, transform: 'translateX(-50%)' }}
                >
                    <div className="font-semibold text-gray-300">{labels[hover]}</div>
                    {series.map((s, i) => (
                        <div key={i} className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-sm" style={{ background: s.color }} />
                            <span>{s.label}: <strong>{s.values[hover]}</strong></span>
                        </div>
                    ))}
                </div>
            )}
            <div className="flex flex-wrap gap-3 mt-1 justify-center">
                {series.map((s, i) => (
                    <span key={i} className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        <span className="w-2.5 h-2.5 rounded-sm" style={{ background: s.color }} />{s.label}
                    </span>
                ))}
            </div>
        </div>
    );
}
