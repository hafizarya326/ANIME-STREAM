/* eslint-disable @next/next/no-img-element */
"use client";

import { useState, useEffect } from "react";

interface SafeImageProps {
  src: string | null;
  alt: string;
  className?: string;
}

export function SafeImage({ src, alt, className }: SafeImageProps) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const resolvedSrc = !hasError && src ? src : "/placeholder.svg";

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      onError={() => setHasError(true)}
    />
  );
}
