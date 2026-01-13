import { useEffect, useRef, useState } from "react";
import { InlineNotification } from "./InlineNotification";

export interface OdometerScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onValueDetected: (value: number) => void;
}

const API_BASE = import.meta.env.VITE_API_BASE || "";

export function OdometerScanner({
  isOpen,
  onClose,
  onValueDetected,
}: OdometerScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  // ✅ IMPORTANT: component returns null when closed
  useEffect(() => {
    if (!isOpen) return;

    let cancelled = false;

    async function startCamera() {
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
          audio: false,
        });

        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }

        streamRef.current = stream;

        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (e) {
        console.error(e);
        setError("Could not access camera. Please allow camera access.");
      }
    }

    startCamera();

    return () => {
      cancelled = true;
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((t) => t.stop());
        streamRef.current = null;
      }
    };
  }, [isOpen]);

  async function handleCapture() {
    if (!videoRef.current) return;
    setIsProcessing(true);
    setError(null);

    try {
      const video = videoRef.current;
      const w = video.videoWidth;
      const h = video.videoHeight;

      if (!w || !h) {
        setError("Camera not ready yet, try again.");
        setIsProcessing(false);
        return;
      }

      // draw full frame
      const maxWidth = 1024;
      const scale = w > maxWidth ? maxWidth / w : 1;
      const targetWidth = Math.round(w * scale);
      const targetHeight = Math.round(h * scale);

      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;

      const ctx = canvas.getContext("2d");
      if (!ctx) {
        setError("Cannot capture frame.");
        setIsProcessing(false);
        return;
      }

      ctx.drawImage(video, 0, 0, w, h, 0, 0, targetWidth, targetHeight);

      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (!b) reject(new Error("Failed to create image blob"));
          else resolve(b);
        }, "image/jpeg", 0.9);
      });

      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
      const base64 = btoa(binary);

      // timeout to avoid endless "reading"
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 10000);

      let res: Response;
      try {
        res = await fetch(`${API_BASE}/api/odometer-ocr`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ imageData: base64 }),
          signal: controller.signal,
        });
      } finally {
        window.clearTimeout(timeoutId);
      }

      if (!res.ok) {
        setError("OCR failed. Try again.");
        setIsProcessing(false);
        return;
      }

      const data = (await res.json()) as { value: number | null; message?: string };

      if (!data.value) {
        setError(data.message || "No km detected. Try again.");
        setIsProcessing(false);
        return;
      }

      onValueDetected(data.value);
      setIsProcessing(false);
      onClose();
    } catch (e) {
      console.error(e);
      setError("Could not read the odometer. Try again.");
      setIsProcessing(false);
    }
  }

  // ✅ IMPORTANT: Always return something
  if (!isOpen) return null;

  return (
    <div className="scanner-modal">
      <div className="scanner-card">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ margin: 0 }}>Scan odometer</h2>
          <button className="scanner-button-secondary" onClick={onClose} type="button">
            ✕
          </button>
        </div>

        {error && (
          <div style={{ marginTop: 10 }}>
            <InlineNotification type="error" onClose={() => setError(null)}>
              {error}
            </InlineNotification>
          </div>
        )}

        <div style={{ marginTop: 10, borderRadius: 12, overflow: "hidden" }}>
          <video
            ref={videoRef}
            playsInline
            muted
            autoPlay
            style={{ width: "100%", display: "block" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12 }}>
          <button
            type="button"
            className="primary-button"
            onClick={handleCapture}
            disabled={isProcessing}
            style={{ flex: 1 }}
          >
            {isProcessing ? "Reading…" : "Capture"}
          </button>
        </div>

        <p style={{ fontSize: "0.8rem", opacity: 0.8, marginTop: 8 }}>
          Tip: move closer so the numbers fill the screen.
        </p>
      </div>
    </div>
  );
}
