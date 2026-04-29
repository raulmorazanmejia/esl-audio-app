import React, { useMemo, useState } from "react";
import ReliableAudioPlayer from "./ReliableAudioPlayer";

type LazyAudioPlayerProps = {
  src: string;
  label?: string;
  style?: React.CSSProperties;
  compact?: boolean;
  initiallyLoaded?: boolean;
  submissionIdForDebug?: string;
};

export default function LazyAudioPlayer({ src, label = "Load recording", style, compact = false, initiallyLoaded = false, submissionIdForDebug }: LazyAudioPlayerProps) {
  const [isLoaded, setIsLoaded] = useState(initiallyLoaded);

  const canRenderAudio = isLoaded && Boolean(src);

  const buttonLabel = useMemo(() => {
    if (!src) return "No audio";
    return label;
  }, [label, src]);

  if (!src) return <div style={{ fontSize: 13, color: "#64748b" }}>No audio.</div>;

  return canRenderAudio ? (
    <ReliableAudioPlayer src={src} style={style} />
  ) : (
    <button
      type="button"
      onClick={() => {
        if (process.env.NODE_ENV === "development" && submissionIdForDebug) {
          console.debug("Loading audio for submission", submissionIdForDebug);
        }
        setIsLoaded(true);
      }}
      style={{
        minHeight: compact ? 30 : 34,
        borderRadius: 10,
        border: "1px solid #cbd5e1",
        background: "#fff",
        color: "#334155",
        fontWeight: 700,
        padding: compact ? "0 8px" : "0 10px",
      }}
    >
      {buttonLabel}
    </button>
  );
}
