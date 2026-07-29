import React from 'react';

// Sri Lanka is a tall, narrow island (~roughly 3:5 width:height). Letting a
// Leaflet map fill the full width of a wide card forces it to zoom out until
// that width is filled, which just reveals empty ocean on either side. This
// frame instead sizes the map from its height using the island's real
// proportions, so the map only takes the width it actually needs.
export default function MapFrame({ height, className = '', style = {}, children }) {
    return (
        <div
            className={`mx-auto w-auto max-w-full ${className}`}
            style={{ height, aspectRatio: '3 / 5', ...style }}
        >
            {children}
        </div>
    );
}
