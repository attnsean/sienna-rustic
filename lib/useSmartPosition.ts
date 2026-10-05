import { useState, useEffect } from 'react';
import smartcrop from 'smartcrop';

/**
 * Custom React hook that loads an image URL, analyzes it using smartcrop.js,
 * and returns the optimal CSS object-position (X% Y%) to focus on the key subject.
 */
export function useSmartPosition(src?: string | null) {
  const [position, setPosition] = useState<string>('center 35%');

  useEffect(() => {
    if (!src || typeof window === 'undefined') {
      setPosition('center 35%');
      return;
    }

    // Only run on actual remote URLs or blobs
    if (!src.startsWith('http') && !src.startsWith('blob:') && !src.startsWith('data:')) {
      setPosition('center 35%');
      return;
    }

    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.src = src;

    img.onload = () => {
      // Analyze using a typical aspect ratio for portrait viewports
      smartcrop.crop(img, { width: 400, height: 600 })
        .then((result) => {
          if (result && result.topCrop) {
            const crop = result.topCrop;
            // Calculate center of focus area in percentages
            const centerX = ((crop.x + crop.width / 2) / img.width) * 100;
            const centerY = ((crop.y + crop.height / 2) / img.height) * 100;
            setPosition(`${centerX.toFixed(1)}% ${centerY.toFixed(1)}%`);
          } else {
            setPosition('center 35%');
          }
        })
        .catch((err) => {
          console.warn('[SmartCrop] Analysis failed, using fallback position:', err);
          setPosition('center 35%');
        });
    };

    img.onerror = () => {
      setPosition('center 35%');
    };
  }, [src]);

  return position;
}
