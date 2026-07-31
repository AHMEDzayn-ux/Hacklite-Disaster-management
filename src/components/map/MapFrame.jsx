import React, { useCallback, useRef, useState } from 'react';

// Sri Lanka is a tall, narrow island (~roughly 3:5 width:height). Letting a
// Leaflet map fill the full width of a wide card forces it to zoom out until
// that width is filled, which just reveals empty ocean on either side. This
// frame instead sizes the map from its height using the island's real
// proportions, so the map only takes the width it actually needs.
//
// Resizing is done with a custom drag handle rather than the native CSS
// `resize` property: once a browser applies `resize`, it "pins" the box to
// whatever pixel size the user last dragged it to (or its first-render size)
// and it stops responding to flex/width changes afterwards - so a fill-width
// map that gets dragged even slightly would get stuck at that size forever.
// Keeping the size in React state means an untouched frame always renders at
// its natural (fill or aspect-ratio) size, and only becomes a fixed pixel box
// once the user actually drags it - reversible with a double-click.
export default function MapFrame({
    height,
    className = '',
    style = {},
    resizable = false,
    fillWidth = false,
    minHeight = 320,
    maxHeight = '90vh',
    minWidth = 280,
    maxWidth = '100%',
    children,
}) {
    const frameRef = useRef(null);
    const [customSize, setCustomSize] = useState(null); // { width, height } in px, or null = natural size

    const handlePointerDown = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        const el = frameRef.current;
        if (!el) return;
        const rect = el.getBoundingClientRect();
        const startX = e.clientX;
        const startY = e.clientY;
        const startWidth = rect.width;
        const startHeight = rect.height;
        const prevUserSelect = document.body.style.userSelect;
        document.body.style.userSelect = 'none';

        const onMove = (moveEvent) => {
            setCustomSize({
                width: Math.max(minWidth, startWidth + (moveEvent.clientX - startX)),
                height: Math.max(minHeight, startHeight + (moveEvent.clientY - startY)),
            });
        };
        const onUp = () => {
            document.body.style.userSelect = prevUserSelect;
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('pointerup', onUp);
        };
        window.addEventListener('pointermove', onMove);
        window.addEventListener('pointerup', onUp);
    }, [minWidth, minHeight]);

    const resetSize = useCallback((e) => {
        e.stopPropagation();
        setCustomSize(null);
    }, []);

    // fillWidth opts out of the aspect-ratio sizing so the map stretches to
    // whatever space its container gives it.
    const sizingClass = fillWidth ? 'w-full' : 'mx-auto w-auto max-w-full';

    return (
        <div
            ref={frameRef}
            className={`relative overflow-hidden ${sizingClass} ${className}`}
            style={{
                height: customSize?.height ?? height,
                width: customSize?.width,
                aspectRatio: fillWidth ? undefined : '3 / 5',
                minHeight,
                maxHeight,
                ...(fillWidth ? { minWidth, maxWidth } : {}),
                ...style,
            }}
        >
            {children}

            {resizable && (
                <div
                    onPointerDown={handlePointerDown}
                    onDoubleClick={resetSize}
                    title="Drag to resize · double-click to reset"
                    className="group absolute bottom-0 right-0 h-5 w-5 cursor-nwse-resize touch-none"
                    style={{ zIndex: 1000 }}
                >
                    <svg
                        viewBox="0 0 16 16"
                        className="absolute bottom-0.5 right-0.5 h-3 w-3 text-slate-500 opacity-60 group-hover:opacity-100 group-hover:text-primary-400 transition-opacity"
                        fill="none"
                        stroke="currentColor"
                        strokeWidth="1.75"
                        strokeLinecap="round"
                    >
                        <path d="M14 2 L2 14 M14 7 L7 14 M14 12 L12 14" />
                    </svg>
                </div>
            )}
        </div>
    );
}
