import { useEffect } from 'react';
import { useMap } from 'react-leaflet';

/**
 * Leaflet caches its container size at init time. When a MapContainer mounts
 * inside a flex/grid layout, a hidden tab, or before fonts/images finish
 * reflowing the page, that cached size is wrong and markers/tiles render in
 * the wrong place until something (like a manual zoom) forces a recalculation.
 * This forces that recalculation on mount and whenever the container resizes.
 */
function MapResizeFix() {
    const map = useMap();

    useEffect(() => {
        map.invalidateSize();
        const raf = requestAnimationFrame(() => map.invalidateSize());
        const timeout = setTimeout(() => map.invalidateSize(), 300);

        const container = map.getContainer();
        const observer = new ResizeObserver(() => map.invalidateSize());
        observer.observe(container);

        return () => {
            cancelAnimationFrame(raf);
            clearTimeout(timeout);
            observer.disconnect();
        };
    }, [map]);

    return null;
}

export default MapResizeFix;
