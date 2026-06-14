/**
 * Image compression utility for client-side image optimization
 * Compresses images before upload to reduce server load and storage
 */

export interface CompressionOptions {
    maxSizeMB?: number;
    maxWidthOrHeight?: number;
    quality?: number;
}

/**
 * Compress an image file to reduce its size
 * @param file - The image file to compress
 * @param options - Compression options
 * @returns Promise resolving to base64 data URL
 */
export const compressImage = (
    file: File,
    options: CompressionOptions = {}
): Promise<string> => {
    const {
        maxSizeMB = 0.5,
        maxWidthOrHeight = 1200,
        quality = 0.8
    } = options;

    return new Promise((resolve, reject) => {
        const reader = new FileReader();

        reader.onload = (e) => {
            const img = new Image();

            img.onload = () => {
                const canvas = document.createElement('canvas');
                let width = img.width;
                let height = img.height;

                // Calculate new dimensions while maintaining aspect ratio
                if (width > height && width > maxWidthOrHeight) {
                    height = (height / width) * maxWidthOrHeight;
                    width = maxWidthOrHeight;
                } else if (height > maxWidthOrHeight) {
                    width = (width / height) * maxWidthOrHeight;
                    height = maxWidthOrHeight;
                }

                canvas.width = width;
                canvas.height = height;

                const ctx = canvas.getContext('2d');
                if (!ctx) {
                    reject(new Error('Failed to get canvas context'));
                    return;
                }

                // Draw image on canvas
                ctx.drawImage(img, 0, 0, width, height);

                // Compress with quality adjustment
                let currentQuality = quality;
                let result = canvas.toDataURL('image/jpeg', currentQuality);

                // Reduce quality if still too large
                const maxBytes = maxSizeMB * 1024 * 1024;
                while (result.length > maxBytes && currentQuality > 0.1) {
                    currentQuality -= 0.1;
                    result = canvas.toDataURL('image/jpeg', currentQuality);
                }

                // If still too large after minimum quality, reject
                if (result.length > maxBytes) {
                    reject(new Error(`Image too large. Even at minimum quality, size is ${(result.length / 1024 / 1024).toFixed(2)}MB`));
                    return;
                }

                resolve(result);
            };

            img.onerror = () => reject(new Error('Failed to load image'));
            img.src = e.target?.result as string;
        };

        reader.onerror = () => reject(new Error('Failed to read file'));
        reader.readAsDataURL(file);
    });
};

/**
 * Get the size of a base64 string in MB
 * @param base64 - Base64 data URL
 * @returns Size in megabytes
 */
export const getBase64Size = (base64: string): number => {
    return base64.length / 1024 / 1024;
};
