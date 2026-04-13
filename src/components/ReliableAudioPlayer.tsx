import React, { useEffect, useMemo, useState } from "react";

type ReliableAudioPlayerProps = {
  src: string;
  style?: React.CSSProperties;
};

export default function ReliableAudioPlayer({ src, style }: ReliableAudioPlayerProps) {
  const [retryCount, setRetryCount] = useState(0);

  useEffect(() => {
    setRetryCount(0);
  }, [src]);

  const resolvedSrc = useMemo(() => {
    if (!src) return "";
    if (retryCount === 0) return src;

    const separator = src.includes("?") ? "&" : "?";
    return `${src}${separator}retry=${Date.now()}`;
  }, [retryCount, src]);

  return (
    <audio
      key={resolvedSrc}
      controls
      playsInline
      preload="metadata"
      src={resolvedSrc}
      onError={() => {
        if (retryCount < 1) {
          setRetryCount((prev) => prev + 1);
        }
      }}
      style={style}
    />
  );
}
