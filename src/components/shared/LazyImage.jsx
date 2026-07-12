import React, { useState, useRef, useEffect } from 'react';

/**
 * LazyImage - Progressive image loading component
 * Shows placeholder/skeleton while image loads, uses native lazy loading
 */
function LazyImage({
    src,
    alt,
    className = '',
    placeholderClassName = '',
    fallbackSrc = null,
    aspectRatio = '4/3' // Default aspect ratio for placeholder
}) {
    const [isLoaded, setIsLoaded] = useState(false);
    const [hasError, setHasError] = useState(false);
    const [isInView, setIsInView] = useState(false);
    const imgRef = useRef(null);

    // Intersection Observer for lazy loading
    useEffect(() => {
        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) {
                    setIsInView(true);
                    observer.disconnect();
                }
            },
            {
                rootMargin: '100px', // Start loading 100px before entering viewport
                threshold: 0.01
            }
        );

        if (imgRef.current) {
            observer.observe(imgRef.current);
        }

        return () => observer.disconnect();
    }, []);

    const handleLoad = () => {
        setIsLoaded(true);
    };

    const handleError = () => {
        setHasError(true);
        setIsLoaded(true);
    };

    // Default placeholder with pulse animation
    const placeholderStyle = {
        aspectRatio: aspectRatio,
    };

    return (
        <div
            ref={imgRef}
            className={`relative overflow-hidden ${className}`}
            style={!isLoaded ? placeholderStyle : undefined}
        >
            {/* Skeleton placeholder - shows while loading */}
            {!isLoaded && (
                <div
                    className={`absolute inset-0 bg-white/10 animate-pulse flex items-center justify-center ${placeholderClassName}`}
                >
                    <svg
                        className="w-10 h-10 text-slate-500"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={1.5}
                            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                        />
                    </svg>
                </div>
            )}

            {/* Actual image - only start loading when in view */}
            {isInView && !hasError && src && (
                <img
                    src={src}
                    alt={alt}
                    className={`w-full h-full object-cover transition-opacity duration-300 ${isLoaded ? 'opacity-100' : 'opacity-0'}`}
                    onLoad={handleLoad}
                    onError={handleError}
                    loading="lazy"
                    decoding="async"
                />
            )}

            {/* Error fallback */}
            {(hasError || !src) && (
                <div className="absolute inset-0 bg-white/10 flex items-center justify-center">
                    {fallbackSrc ? (
                        <img src={fallbackSrc} alt={alt} className="w-full h-full object-cover" />
                    ) : (
                        <div className="text-center text-slate-500">
                            <svg
                                className="w-8 h-8 mx-auto mb-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={1.5}
                                    d="M6 18L18 6M6 6l12 12"
                                />
                            </svg>
                            <span className="text-xs">No image</span>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

export default LazyImage;
