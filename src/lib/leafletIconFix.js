import L from 'leaflet';
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

// Fix Leaflet default marker icon issue
delete L.Icon.Default.prototype._getIconUrl;

L.Icon.Default.mergeOptions({
    iconRetinaUrl: markerIcon2x,
    iconUrl: markerIcon,
    shadowUrl: markerShadow,
});

// Create custom colored marker icons using data URIs to avoid external requests
const createColoredIcon = (color) => {
    const svgIcon = `
        <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 25 41" width="25" height="41">
            <defs>
                <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
                    <feGaussianBlur in="SourceAlpha" stdDeviation="2"/>
                    <feOffset dx="0" dy="2" result="offsetblur"/>
                    <feComponentTransfer>
                        <feFuncA type="linear" slope="0.5"/>
                    </feComponentTransfer>
                    <feMerge>
                        <feMergeNode/>
                        <feMergeNode in="SourceGraphic"/>
                    </feMerge>
                </filter>
            </defs>
            <path fill="${color}" stroke="#000" stroke-width="1" d="M12.5,0 C5.6,0 0,5.6 0,12.5 C0,19.4 12.5,41 12.5,41 S25,19.4 25,12.5 C25,5.6 19.4,0 12.5,0 Z" filter="url(#shadow)"/>
            <circle fill="#fff" cx="12.5" cy="12.5" r="5"/>
        </svg>
    `;
    
    return new L.Icon({
        iconUrl: `data:image/svg+xml;base64,${btoa(svgIcon)}`,
        shadowUrl: markerShadow,
        iconSize: [25, 41],
        iconAnchor: [12, 41],
        popupAnchor: [1, -34],
        shadowSize: [41, 41]
    });
};

// Predefined colored icons
export const redIcon = createColoredIcon('#dc2626');      // Active/Urgent
export const greenIcon = createColoredIcon('#16a34a');    // Resolved/Available
export const orangeIcon = createColoredIcon('#ea580c');   // Warning/Medium
export const greyIcon = createColoredIcon('#6b7280');     // Inactive/Full
export const blueIcon = createColoredIcon('#2563eb');     // Default

export { markerIcon, markerIcon2x, markerShadow };
