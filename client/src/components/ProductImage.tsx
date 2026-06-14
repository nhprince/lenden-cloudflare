import { useState, useEffect } from 'react';

interface ProductImageProps {
    src?: string;
    alt: string;
    className?: string;
    imgClassName?: string;
    fallbackSrc?: string;
}

export const ProductImage = ({
    src,
    alt,
    className = "",
    imgClassName = "",
    fallbackSrc = '/placeholder-product.png'
}: ProductImageProps) => {
    const [imgSrc, setImgSrc] = useState<string>(src || fallbackSrc);
    const [hasError, setHasError] = useState(false);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        // Reset states when src changes
        if (src) {
            setImgSrc(src);
            setHasError(false);
            // Don't show loading for Base64 images as they load instantly
            setIsLoading(!src.startsWith('data:'));
        } else {
            setImgSrc(fallbackSrc);
            setHasError(false);
            setIsLoading(true);
        }
    }, [src, fallbackSrc]);

    const handleError = () => {
        // Don't treat Base64 data URLs as errors - they should always work
        if (imgSrc.startsWith('data:')) {
            setIsLoading(false);
            return;
        }

        if (!hasError) {
            setHasError(true);
            // Try the provided fallback first, then the default placeholder
            if (imgSrc !== fallbackSrc) {
                setImgSrc(fallbackSrc);
            } else {
                setImgSrc('https://placehold.co/400x400?text=No+Image');
            }
        }
        setIsLoading(false);
    };

    const handleLoad = () => {
        setIsLoading(false);
    };

    return (
        <div className={`relative overflow-hidden ${className}`}>

            {/* Loading Skeleton - Don't show for Base64 images */}
            {isLoading && !imgSrc.startsWith('data:') && (
                <div className="absolute inset-0 bg-gray-200 dark:bg-gray-700 animate-pulse z-10" />
            )}

            <img
                src={imgSrc}
                alt={alt}
                onError={handleError}
                onLoad={handleLoad}
                className={`w-full h-full object-cover transition-opacity duration-300 ${isLoading && !imgSrc.startsWith('data:') ? 'opacity-0' : 'opacity-100'} ${imgClassName}`}
                loading="lazy"
            />

            {/* Fallback overlay if image is completely missing/broken even after fallback */}
            {hasError && imgSrc.includes('placehold.co') && (
                <div className="absolute inset-0 flex items-center justify-center bg-gray-100 dark:bg-gray-800 text-gray-400">
                    <span className="material-symbols-outlined text-4xl">image_not_supported</span>
                </div>
            )}
        </div>
    );
};
