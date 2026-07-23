import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { QrCode, Scan, Camera, CameraOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export function QRScannerButton() {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [manualHash, setManualHash] = useState("");
  const [showManual, setShowManual] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const startCamera = async () => {
    setError("");
    setScanning(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 480 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
        scanLoop();
      }
    } catch {
      setError("Câmara não disponível ou permissão negada.");
      setScanning(false);
    }
  };

  const scanLoop = () => {
    const video = videoRef.current;
    if (!video || video.readyState < 2) { setTimeout(scanLoop, 300); return; }

    // Try native BarcodeDetector first (Chrome, Edge)
    if ("BarcodeDetector" in window) {
      const detector = new (window as any).BarcodeDetector({ formats: ["qr_code"] });
      const detect = () => {
        if (!streamRef.current) return;
        detector.detect(video).then((codes: any[]) => {
          if (codes.length > 0) {
            const result = codes[0].rawValue;
            stopCamera();
            const parts = result.split("/consulta/");
            const hash = parts.length > 1 ? parts[parts.length - 1].split("?")[0] : result;
            if (hash.length > 5) { setOpen(false); navigate(`/consulta/${hash}`); }
            return;
          }
          if (streamRef.current) requestAnimationFrame(detect);
        }).catch(() => { if (streamRef.current) setTimeout(detect, 500); });
      };
      detect();
    } else {
      // Fallback: show manual input
      stopCamera();
      setError("Scanner não suportado neste navegador. Use o campo manual abaixo.");
      setShowManual(true);
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    setScanning(false);
  };

  useEffect(() => {
    return () => { if (streamRef.current) stopCamera(); };
  }, []);

  useEffect(() => {
    if (!open) { stopCamera(); setShowManual(false); setManualHash(""); setError(""); }
  }, [open]);

  const handleManualSubmit = () => {
    const h = manualHash.trim();
    if (!h) return;
    const parts = h.split("/consulta/");
    const finalHash = parts.length > 1 ? parts[parts.length - 1].split("?")[0] : h;
    setOpen(false);
    navigate(`/consulta/${finalHash}`);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title="Ler QR Code">
          <QrCode className="h-5 w-5" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Scan className="h-5 w-5" /> Ler QR Code
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          {!scanning && !showManual && (
            <div className="text-center py-8">
              <Camera className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-sm text-muted-foreground mb-4">
                Aponte a câmara para o QR Code do equipamento
              </p>
              <Button onClick={startCamera}>
                <Camera className="mr-2 h-4 w-4" /> Ativar Câmara
              </Button>
              <div className="mt-4">
                <Button variant="link" size="sm" onClick={() => setShowManual(true)}>
                  Ou digitar manualmente
                </Button>
              </div>
            </div>
          )}

          {scanning && (
            <div className="relative">
              <video ref={videoRef} className="w-full rounded-lg bg-black" playsInline muted />
              <div className="absolute inset-0 border-2 border-primary rounded-lg pointer-events-none" />
              <div className="flex justify-center items-center gap-2 mt-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                <span className="text-sm text-muted-foreground">A ler QR Code...</span>
              </div>
              <Button variant="outline" className="w-full mt-2" onClick={stopCamera}>
                <CameraOff className="mr-2 h-4 w-4" /> Parar Câmara
              </Button>
            </div>
          )}

          {error && (
            <div className="text-center py-4">
              <CameraOff className="h-8 w-8 mx-auto mb-2 text-destructive" />
              <p className="text-sm text-destructive mb-2">{error}</p>
              <Button variant="outline" size="sm" onClick={startCamera}>
                Tentar novamente
              </Button>
            </div>
          )}

          {showManual && (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Digite ou cole o código do QR Code:
              </p>
              <div className="flex gap-2">
                <Input placeholder="Ex: 8e25c8df89aa6cce" value={manualHash}
                  onChange={e => setManualHash(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && handleManualSubmit()} autoFocus />
                <Button onClick={handleManualSubmit}>Consultar</Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
