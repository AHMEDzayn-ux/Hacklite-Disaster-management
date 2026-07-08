/**
 * Connection quality detection for citizen report forms only (per design:
 * responders/admins assume connectivity and are excluded from this path).
 * Uses the Network Information API where available (Chrome/Android - exactly
 * the devices most likely to be on 2G in the field); browsers without it
 * (Safari/Firefox) fall back to treating the connection as normal, since
 * there is no reliable signal to act on.
 */
import { useState, useEffect } from 'react';

export function getConnectionInfo() {
    const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
    if (!conn) return { supported: false, isSlow: false, effectiveType: null };

    const isSlow = conn.saveData === true || conn.effectiveType === 'slow-2g' || conn.effectiveType === '2g';
    return { supported: true, isSlow, effectiveType: conn.effectiveType };
}

/** React hook version - re-evaluates on the Network Information API's change event. */
export function useConnectionQuality() {
    const [info, setInfo] = useState(getConnectionInfo);

    useEffect(() => {
        const conn = navigator.connection || navigator.mozConnection || navigator.webkitConnection;
        if (!conn) return undefined;

        const update = () => setInfo(getConnectionInfo());
        conn.addEventListener('change', update);
        return () => conn.removeEventListener('change', update);
    }, []);

    return info;
}
