import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { QrCode, Scan, Camera } from "lucide-react";
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
  const [hash, setHash] = useState("");
  const [open, setOpen] = useState(false);
  const [scanning, setScanning] = useState(false);

  const handleSubmit = () => {
    const h = hash.trim();
    if (!h) return;
    // Extract hash from URL if pasted full URL
    const parts = h.split("/consulta/");
    const finalHash = parts.length > 1 ? parts[parts.length - 1].split("?")[0] : h;
    setOpen(false);
    setHash("");
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
          <p className="text-sm text-muted-foreground">
            Digite ou cole o código do QR Code ou a URL completa:
          </p>
          <div className="flex gap-2">
            <Input
              placeholder="Ex: 8e25c8df89aa6cce"
              value={hash}
              onChange={(e) => setHash(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
              autoFocus
            />
            <Button onClick={handleSubmit}>Consultar</Button>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Dica: Aponte a câmara do seu telemóvel para o QR Code e cole aqui o link
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
