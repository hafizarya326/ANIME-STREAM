"use client";

import { useState } from "react";

interface SafeImageProps {
  src: string | null;
  alt: string;
  className?: string;
}

export function SafeImage({ src, alt, className }: SafeImageProps) {
  const [hasError, setHasError] = useState(false);
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
