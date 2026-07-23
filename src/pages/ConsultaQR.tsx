import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { equipmentAPI } from "@/lib/api";
import { Equipment } from "@/types";
import { ArrowLeft, QrCode, ExternalLink } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string }> = {
  disponivel: { label: "Disponível", color: "bg-success text-success-foreground" },
  emprestado: { label: "Emprestado", color: "bg-info text-info-foreground" },
  reservado: { label: "Reservado", color: "bg-warning text-warning-foreground" },
  manutencao: { label: "Manutenção", color: "bg-destructive text-destructive-foreground" },
  inativo: { label: "Inativo", color: "bg-muted text-muted-foreground" },
};

export function ConsultaQR() {
  const { hash } = useParams();
  const { user } = useAuth();
  const [equip, setEquip] = useState<Equipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadEquipment = async () => {
    if (!hash) return;
    setLoading(true);
    try {
      const resp = await equipmentAPI.byQRCode(hash);
      if (resp.type === 'equipment') {
        setEquip(resp.data);
        setError("");
      } else if (resp.type === 'loan_request') {
        setError("QR Code de uma solicitação. Consulte em Solicitações.");
      } else {
        setError("Tipo não reconhecido.");
      }
    } catch {
      setError("Nada encontrado para este QR Code.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadEquipment(); }, [hash]);

  const isTechOrAdmin = user?.role && ["admin", "tecnico"].includes(user.role);

  return (
    <MainLayout>
      <div className="max-w-2xl mx-auto space-y-4">
        <Link to="/" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" /> Voltar
        </Link>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <QrCode className="h-5 w-5" /> Consulta por QR Code
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading && <p className="text-muted-foreground">A carregar...</p>}

            {error && (
              <div className="text-center py-8">
                <p className="text-destructive font-medium">{error}</p>
                <p className="text-sm text-muted-foreground mt-1">Código: {hash}</p>
              </div>
            )}

            {equip && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-2xl font-bold">{equip.brand} {equip.model}</h2>
                  <Badge className={`mt-2 ${statusConfig[equip.status]?.color || ""}`}>
                    {statusConfig[equip.status]?.label || equip.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div><span className="text-muted-foreground">Tipo:</span> <span className="font-medium capitalize">{equip.type}</span></div>
                  <div><span className="text-muted-foreground">Serial:</span> <span className="font-mono">{equip.serialNumber}</span></div>
                  {equip.location && <div><span className="text-muted-foreground">Local:</span> <span>{equip.location}</span></div>}
                  {equip.category && <div><span className="text-muted-foreground">Categoria:</span> <span>{equip.category}</span></div>}
                  {equip.color && <div><span className="text-muted-foreground">Cor:</span> <span>{equip.color}</span></div>}
                  <div><span className="text-muted-foreground">Aquisição:</span> <span>{equip.acquisitionDate ? new Date(equip.acquisitionDate).toLocaleDateString('pt-BR') : '-'}</span></div>
                </div>

                {equip.description && (
                  <div><span className="text-sm text-muted-foreground">Descrição:</span><p className="text-sm mt-1">{equip.description}</p></div>
                )}

                <div className="flex justify-center pt-2">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${window.location.origin}/consulta/${equip.qrcode_hash}`}
                    alt="QR Code" className="inline-block" />
                </div>

                {isTechOrAdmin && (
                  <div className="flex gap-2 justify-center pt-2">
                    <Button size="sm" variant="outline" onClick={() => {
                      equipmentAPI.setMaintenance(equip.id);
                      toast.success("Marcado para manutenção");
                      loadEquipment();
                    }}>Manutenção</Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      equipmentAPI.setAvailable(equip.id);
                      toast.success("Marcado como disponível");
                      loadEquipment();
                    }}>Disponível</Button>
                    <Button size="sm" variant="outline" onClick={() => {
                      equipmentAPI.setInactive(equip.id);
                      toast.success("Desativado");
                      loadEquipment();
                    }}>Inativar</Button>
                  </div>
                )}

                <div className="text-center pt-2">
                  <a href={`/equipamentos`} className="text-sm text-primary underline inline-flex items-center gap-1">
                    <ExternalLink className="h-3 w-3" /> Ir para Gestão de Equipamentos
                  </a>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </MainLayout>
  );
}
