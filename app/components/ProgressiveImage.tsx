"use client";

import React, { useState } from "react";
import Image, { ImageProps } from "next/image";

interface ProgressiveImageProps extends Omit<ImageProps, "onLoad" | "onError"> {
  containerClassName?: string;
  skeletonClassName?: string;
  showSpinner?: boolean;
}

export default function ProgressiveImage({
  src,
  alt,
  className = "",
  containerClassName = "",
  skeletonClassName = "",
  showSpinner = false,
  fill,
  priority,
  ...props
}: ProgressiveImageProps) {
  const [isLoaded, setIsLoaded] = useState(false);
  const [hasError, setHasError] = useState(false);

  return (
    <div className={`relative overflow-hidden ${fill ? "w-full h-full" : ""} ${containerClassName}`}>
      {/* Shimmer Skeleton & Loading Progression */}
      {!isLoaded && !hasError && (
        <div
          className={`absolute inset-0 z-10 flex flex-col items-center justify-center bg-stone-900/60 backdrop-blur-xs animate-pulse ${skeletonClassName}`}
        >
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-amber-100/10 to-transparent -translate-x-full animate-[shimmer_2s_infinite]" />
          {showSpinner && (
            <div className="flex flex-col items-center gap-2 z-20">
              <div className="w-6 h-6 rounded-full border-2 border-amber-200/30 border-t-amber-200 animate-spin" />
              <span className="text-[9px] tracking-[0.2em] uppercase text-amber-100/70 font-serif">Memuat Foto...</span>
            </div>
          )}
        </div>
      )}

      {/* Actual Next.js Image with Smooth Fade-in */}
      <Image
        src={src}
        alt={alt}
        fill={fill}
        priority={priority}
        onLoad={() => setIsLoaded(true)}
        onError={() => setHasError(true)}
        className={`transition-all duration-700 ease-out ${
          isLoaded ? "opacity-100 blur-0 scale-100" : "opacity-0 blur-xs scale-102"
        } ${className}`}
        {...props}
      />
    </div>
  );
}
