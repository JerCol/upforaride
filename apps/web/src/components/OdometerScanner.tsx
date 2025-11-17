import { useEffect, useRef, useState } from "react";
import { API_BASE } from "../api";

interface OdometerScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onValueDetected: (value: number) => void;
}

function preprocessOdometerFrame(video: HTMLVideoElement): HTMLCanvasElement {
  const w = video.videoWidth;
  const h = video.videoHeight;

  const srcCanvas = document.createElement("canvas");
  const srcCtx = srcCanvas.getContext("2d");
  if (!srcCtx || !w || !h) {
    throw new Error("Camera not ready");
  }

  // --- 1) Crop a horizontal band where digits likely are (middle 30%) ---
  const roiHeight = h * 0.3;
  const roiY = h * 0.35; // adjust up/down if needed

  srcCanvas.width = w;
  srcCanvas.height = roiHeight;

  srcCtx.drawImage(
    video,
    0,
    roiY,
    w,
    roiHeight,
    0,
    0,
    w,
    roiHeight
  );

  // --- 2) Convert to high-contrast BW, emphasize red channel ---
  const imageData = srcCtx.getImageData(0, 0, srcCanvas.width, srcCanvas.height);
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const r = data[i];
    const g = data[i + 1];
    const b = data[i + 2];

    // emphasize red, penalize green/blue (since digits are red, background black)
    const intensity = r * 0.9 - g * 0.3 - b * 0.3;

    // threshold – you can tweak 40/60 depending on how bright your display is
    const v = intensity > 40 ? 255 : 0; // 255 = white digit, 0 = black background

    data[i] = v;
    data[i + 1] = v;
    data[i + 2] = v;
  }

  srcCtx.putImageData(imageData, 0, 0);

  // --- 3) Scale up to help Tesseract ---
  const scale = 3; // 3x bigger
  const outCanvas = document.createElement("canvas");
  outCanvas.width = srcCanvas.width * scale;
  outCanvas.height = srcCanvas.height * scale;
  const outCtx = outCanvas.getContext("2d")!;
  outCtx.imageSmoothingEnabled = false;
  outCtx.drawImage(
    srcCanvas,
    0,
    0,
    srcCanvas.width,
    srcCanvas.height,
    0,
    0,
    outCanvas.width,
    outCanvas.height
  );

  return outCanvas;
}

export function OdometerScanner({
  isOpen,
  onClose,
  onValueDetected,
}: OdometerScannerProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Start/stop camera when isOpen changes
  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      return;
    }

    async function startCamera() {
      setError(null);
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
        }
      } catch (err) {
        console.error(err);
        setError("Cannot access camera. Please check permissions.");
      }
    }

    startCamera();

    return () => {
      stopCamera();
    };
  }, [isOpen]);

  function stopCamera() {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  }
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
  
      // ✅ Draw the FULL frame, but downscale to keep size reasonable
      const maxWidth = 1024; // good compromise for mobile
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
  
      ctx.drawImage(
        video,
        0,
        0,
        w,
        h,
        0,
        0,
        targetWidth,
        targetHeight
      );
  
      // Convert to JPEG blob
      const blob: Blob = await new Promise((resolve, reject) => {
        canvas.toBlob((b) => {
          if (!b) reject(new Error("Failed to create image blob"));
          else resolve(b);
        }, "image/jpeg", 0.9);
      });
  
      // Blob -> base64
      const arrayBuffer = await blob.arrayBuffer();
      const bytes = new Uint8Array(arrayBuffer);
      let binary = "";
      for (let i = 0; i < bytes.length; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      const base64 = btoa(binary);
  
      // Call backend OCR
      const res = await fetch(`${API_BASE}/api/odometer-ocr`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ imageData: base64 }),
      });
  
      if (!res.ok) {
        setError("Server OCR failed. Try again.");
        setIsProcessing(false);
        return;
      }
  
      const data = (await res.json()) as {
        value: number | null;
        rawText?: string;
        digitsOnly?: string;
        message?: string;
      };
  
      console.log("OCR backend response:", data);
  
      if (!data.value) {
        setError(
          data.message ||
            "Kon geen geldige kilometerstand herkennen. Probeer opnieuw."
        );
        setIsProcessing(false);
        return;
      }
  
      onValueDetected(data.value);
      setIsProcessing(false);
      onClose();
    } catch (err) {
      console.error(err);
      setError("Er ging iets mis bij het herkennen. Probeer nog eens.");
      setIsProcessing(false);
    }
  }
  
  

  if (!isOpen) return null;

  return (
    <div className="scanner-backdrop">
      <div className="scanner-dialog">
        <h2>Scan odometer</h2>
        <p className="scanner-instruction">
          Point the camera at the odometer so the digits are centered.
        </p>

        <div className="scanner-video-wrapper">
          <video
            ref={videoRef}
            autoPlay
            playsInline
            className="scanner-video"
          />
          <div className="scanner-overlay"></div>
        </div>

        {error && <p className="scanner-error">{error}</p>}

        <div className="scanner-actions">
          <button
            type="button"
            className="scanner-button-secondary"
            onClick={onClose}
            disabled={isProcessing}
          >
            Cancel
          </button>
          <button
            type="button"
            className="scanner-button-primary"
            onClick={handleCapture}
            disabled={isProcessing}
          >
            {isProcessing ? "Reading…" : "Capture"}
          </button>
        </div>
      </div>
    </div>
  );
}
