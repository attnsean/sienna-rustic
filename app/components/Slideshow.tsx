"use client";

import React, { useState, useEffect } from "react";
import Image from "next/image";

const defaultImages = [
  'https://www.serastory.com/storage/undangan/templates/onyx-1/01.webp',
  'https://www.serastory.com/storage/undangan/templates/onyx-1/02.webp',
  'https://www.serastory.com/storage/undangan/templates/onyx-1/03.webp'
];

interface SlideshowProps {
  images?: (string | any)[];
  intervalMs?: number;
  overlayClassName?: string;
  onFirstImageLoaded?: () => void;
}

export default function Slideshow({ 
  images = defaultImages,
  intervalMs = 4000, 
  overlayClassName = "bg-gradient-to-b from-black/60 via-black/40 to-black/80 backdrop-blur-[2px]",
  onFirstImageLoaded,
}: SlideshowProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loadedMap, setLoadedMap] = useState<Record<number, boolean>>({});

  // Safeguard if images array is empty or undefined
  const activeImages = images && images.length > 0 ? images : defaultImages;

  const handleImageLoad = (index: number) => {
    setLoadedMap((prev) => ({ ...prev, [index]: true }));
    if (index === 0) {
      onFirstImageLoaded?.();
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % activeImages.length);
    }, intervalMs);
    return () => clearInterval(timer);
  }, [intervalMs, activeImages.length]);

  return (
    <>
      {activeImages.map((img, index) => {
        const isCurrent = index === currentIndex;
        const isLoaded = !!loadedMap[index];
        return (
          <Image
            key={index}
            src={img}
            alt={`Background slide ${index + 1}`}
            fill
            unoptimized={typeof img === 'string'}
            sizes="(max-width: 768px) 100vw, 30vw"
            onLoad={() => handleImageLoad(index)}
            className={`object-cover object-[center_35%] transition-all duration-1000 ease-out absolute inset-0 ${
              isCurrent && isLoaded ? "opacity-100 scale-100 blur-0 z-0" : "opacity-0 scale-102 -z-10"
            }`}
            priority={index === 0}
          />
        );
      })}
      {/* Dark Overlay */}
      <div className={`absolute inset-0 z-10 pointer-events-none ${overlayClassName}`}></div>
    </>
  );
}
