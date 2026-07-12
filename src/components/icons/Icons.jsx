import React from 'react';

const iconProps = {
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 1.8,
    strokeLinecap: 'round',
    strokeLinejoin: 'round',
};

export function IconSiren({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0Z" />
            <line x1="12" y1="9" x2="12" y2="13" />
            <line x1="12" y1="17" x2="12.01" y2="17" />
        </svg>
    );
}

export function IconShieldLock({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z" />
            <rect x="9.25" y="11" width="5.5" height="4.25" rx="1" />
            <path d="M10.5 11V9.5a1.5 1.5 0 0 1 3 0V11" />
        </svg>
    );
}

export function IconMegaphone({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <path d="m3 11 18-5v12L3 14v-3z" />
            <path d="M11.6 16.8a3 3 0 1 1-5.8-1.6" />
        </svg>
    );
}

export function IconLifeBuoy({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="3.5" />
            <line x1="5.2" y1="5.2" x2="8.7" y2="8.7" />
            <line x1="15.3" y1="15.3" x2="18.8" y2="18.8" />
            <line x1="18.8" y1="5.2" x2="15.3" y2="8.7" />
            <line x1="8.7" y1="15.3" x2="5.2" y2="18.8" />
        </svg>
    );
}

export function IconChevronRight({ className }) {
    return (
        <svg {...iconProps} strokeWidth={2.25} className={className}>
            <path d="M9 6l6 6-6 6" />
        </svg>
    );
}

export function IconArrowRight({ className }) {
    return (
        <svg {...iconProps} strokeWidth={2.25} className={className}>
            <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
    );
}

export function IconCheck({ className }) {
    return (
        <svg {...iconProps} strokeWidth={2.5} className={className}>
            <path d="M20 6 9 17l-5-5" />
        </svg>
    );
}

export function IconPhone({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92Z" />
        </svg>
    );
}

export function IconBolt({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <path d="M13 2 3 14h7l-1 8 10-12h-7l1-8Z" />
        </svg>
    );
}

export function IconShieldCheck({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <path d="M12 2 4 5v6c0 5 3.4 9.4 8 11 4.6-1.6 8-6 8-11V5z" />
            <path d="m9 12 2 2 4-4" />
        </svg>
    );
}

export function IconUsers({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
            <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
    );
}

export function IconGlobe({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <circle cx="12" cy="12" r="9" />
            <line x1="3" y1="12" x2="21" y2="12" />
            <path d="M12 3a14 14 0 0 1 3.5 9A14 14 0 0 1 12 21a14 14 0 0 1-3.5-9A14 14 0 0 1 12 3Z" />
        </svg>
    );
}

export function IconUserSearch({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <circle cx="10" cy="7" r="4" />
            <path d="M4.5 20v-1a5.5 5.5 0 0 1 8.9-4.33" />
            <circle cx="17" cy="17" r="3" />
            <line x1="19.3" y1="19.3" x2="21.5" y2="21.5" />
        </svg>
    );
}

export function IconPawPrint({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <circle cx="12" cy="15.5" r="4" />
            <circle cx="6.5" cy="9" r="2" />
            <circle cx="12" cy="6" r="2" />
            <circle cx="17.5" cy="9" r="2" />
        </svg>
    );
}

export function IconTent({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <path d="M3 20 12 4l9 16Z" />
            <path d="M12 4 7.5 20" />
            <path d="M12 4 16.5 20" />
            <path d="M9.5 20 12 15l2.5 5" />
        </svg>
    );
}

export function IconCloud({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <path d="M17.5 19H9a7 7 0 1 1 6.71-9h.79a4.5 4.5 0 1 1 0 9Z" />
        </svg>
    );
}

export function IconMessageSquare({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2Z" />
        </svg>
    );
}

export function IconCamera({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <path d="M4 8a2 2 0 0 1 2-2h1.2l.9-1.5A2 2 0 0 1 9.83 3.5h4.34a2 2 0 0 1 1.73 1l.9 1.5H18a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z" />
            <circle cx="12" cy="13" r="3.5" />
        </svg>
    );
}

export function IconInfo({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <circle cx="12" cy="12" r="9" />
            <line x1="12" y1="11" x2="12" y2="16" />
            <line x1="12" y1="7.5" x2="12.01" y2="7.5" />
        </svg>
    );
}

export function IconFirstAid({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <rect x="3" y="6" width="18" height="14" rx="2" />
            <path d="M12 10v6M9 13h6" />
        </svg>
    );
}

export function IconHome({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <path d="M4 11.5 12 4l8 7.5" />
            <path d="M6 10v9a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1v-9" />
        </svg>
    );
}

export function IconUtensils({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <path d="M7 3v7a2 2 0 0 0 4 0V3" />
            <line x1="9" y1="10" x2="9" y2="21" />
            <path d="M17 3c-1.6 0-2.5 2.2-2.5 5.5S15.4 14 17 14v7" />
        </svg>
    );
}

export function IconDroplet({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <path d="M12 3s6 7.2 6 11.5A6 6 0 0 1 6 14.5C6 10.2 12 3 12 3Z" />
        </svg>
    );
}

export function IconFlask({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <path d="M9 2v6.5L4.4 18a2 2 0 0 0 1.8 3h11.6a2 2 0 0 0 1.8-3L15 8.5V2" />
            <line x1="8" y1="2" x2="16" y2="2" />
            <line x1="7" y1="14" x2="17" y2="14" />
        </svg>
    );
}

export function IconMapPin({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <path d="M12 21s7-6.5 7-12a7 7 0 1 0-14 0c0 5.5 7 12 7 12Z" />
            <circle cx="12" cy="9" r="2.5" />
        </svg>
    );
}

export function IconMap({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <path d="M9 4 3 6v14l6-2 6 2 6-2V4l-6 2-6-2Z" />
            <line x1="9" y1="4" x2="9" y2="18" />
            <line x1="15" y1="6" x2="15" y2="20" />
        </svg>
    );
}

export function IconSearch({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <circle cx="11" cy="11" r="7" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
    );
}

export function IconGrid({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <rect x="3" y="3" width="7" height="7" rx="1.5" />
            <rect x="14" y="3" width="7" height="7" rx="1.5" />
            <rect x="3" y="14" width="7" height="7" rx="1.5" />
            <rect x="14" y="14" width="7" height="7" rx="1.5" />
        </svg>
    );
}

export function IconClock({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3.5 2" />
        </svg>
    );
}

export function IconX({ className }) {
    return (
        <svg {...iconProps} strokeWidth={2.25} className={className}>
            <path d="M18 6 6 18M6 6l12 12" />
        </svg>
    );
}

export function IconHeart({ className }) {
    return (
        <svg {...iconProps} className={className}>
            <path d="M20.8 8.6c0-2.5-2-4.5-4.5-4.5-1.7 0-3.2.9-4 2.3-.8-1.4-2.3-2.3-4-2.3-2.5 0-4.5 2-4.5 4.5 0 6.5 8.5 11.4 8.5 11.4s8.5-4.9 8.5-11.4Z" />
        </svg>
    );
}
