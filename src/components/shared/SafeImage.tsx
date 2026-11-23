import React, { useEffect, useState } from 'react';
import { User } from 'lucide-react';

export interface SafeImageProps
  extends Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src' | 'alt'> {
  src: string;
  alt: string;
  fallbackLabel?: string;
  variant?: 'avatar' | 'backdrop';
}

export const SafeImage: React.FC<SafeImageProps> = ({
  src,
  alt,
  fallbackLabel,
  variant = 'avatar',
  className = '',
  loading = 'eager',
  decoding = 'async',
  onError,
  ...rest
}) => {
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setFailed(false);
  }, [src]);

  if (failed) {
    if (variant === 'backdrop') {
      return (
        <div
          aria-hidden="true"
          className={`${className} bg-gradient-to-br from-[#0E1E4A] via-[#09122B] to-[#070B19]`}
        />
      );
    }

    const initials = (fallbackLabel || alt)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? '')
      .join('');

    return (
      <div
        role="img"
        aria-label={alt}
        className={`${className} inline-flex items-center justify-center bg-slate-800 text-xs font-bold text-cyan-200 select-none`}
      >
        {initials ? <span>{initials}</span> : <User className="h-4 w-4 text-slate-300" />}
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      loading={loading}
      decoding={decoding}
      onError={(event) => {
        console.error(`[EduLevel] Failed to load image asset: ${src}`);
        setFailed(true);
        onError?.(event);
      }}
      className={className}
      {...rest}
    />
  );
};
