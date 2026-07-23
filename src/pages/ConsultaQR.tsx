import { useState, useEffect } from "react";
import { useParams, Link } from "react-router-dom";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { equipmentAPI } from "@/lib/api";
import { Equipment, LoanRequest } from "@/types";
import { ArrowLeft, QrCode, ExternalLink, FileText } from "lucide-react";

const statusConfig: Record<string, { label: string; color: string }> = {
  disponivel: { label: "Disponível", color: "bg-success text-success-foreground" },
  emprestado: { label: "Emprestado", color: "bg-info text-info-foreground" },
  reservado: { label: "Reservado", color: "bg-warning text-warning-foreground" },
  manutencao: { label: "Manutenção", color: "bg-destructive text-destructive-foreground" },
  inativo: { label: "Inativo", color: "bg-muted text-muted-foreground" },
};

const reqStatusConfig: Record<string, { label: string; color: string }> = {
  pendente: { label: "Pendente", color: "bg-warning text-warning-foreground" },
  autorizado: { label: "Autorizado", color: "bg-info text-info-foreground" },
  rejeitado: { label: "Rejeitado", color: "bg-destructive text-destructive-foreground" },
  cancelado: { label: "Cancelado", color: "bg-muted text-muted-foreground" },
};

export function ConsultaQR() {
  const { hash } = useParams();
  const { user } = useAuth();
  const [equip, setEquip] = useState<Equipment | null>(null);
  const [loanReq, setLoanReq] = useState<any>(null);
  const [type, setType] = useState<'' | 'equipment' | 'loan_request'>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const loadData = async () => {
    if (!hash) return;
    setLoading(true);
    try {
      const resp = await equipmentAPI.byQRCode(hash);
      if (resp.type === 'equipment') {
        setEquip(resp.data);
        setType('equipment');
        setError("");
      } else if (resp.type === 'loan_request') {
        setLoanReq(resp.data);
        setType('loan_request');
        setError("");
      } else {
        setError("Tipo não reconhecido.");
      }
    } catch {
      setError("Nada encontrado para este QR Code.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { loadData(); }, [hash]);

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

            {/* EQUIPMENT */}
            {equip && type === 'equipment' && (
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

                {equip.description && <div><span className="text-sm text-muted-foreground">Descrição:</span><p className="text-sm mt-1">{equip.description}</p></div>}

                <div className="flex justify-center pt-2">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${window.location.origin}/consulta/${equip.qrcode_hash}`} alt="QR" className="inline-block" />
                </div>

                {isTechOrAdmin && (
                  <div className="flex gap-2 justify-center pt-2">
                    <Button size="sm" variant="outline" onClick={() => { equipmentAPI.setMaintenance(equip.id); toast.success("Manutenção"); loadData(); }}>Manutenção</Button>
                    <Button size="sm" variant="outline" onClick={() => { equipmentAPI.setAvailable(equip.id); toast.success("Disponível"); loadData(); }}>Disponível</Button>
                    <Button size="sm" variant="outline" onClick={() => { equipmentAPI.setInactive(equip.id); toast.success("Inativado"); loadData(); }}>Inativar</Button>
                  </div>
                )}
                <div className="text-center pt-2">
                  <a href="/equipamentos" className="text-sm text-primary underline inline-flex items-center gap-1"><ExternalLink className="h-3 w-3" /> Ir para Equipamentos</a>
                </div>
              </div>
            )}

            {/* LOAN REQUEST */}
            {loanReq && type === 'loan_request' && (
              <div className="space-y-4">
                <div className="text-center">
                  <h2 className="text-2xl font-bold">Solicitação #{loanReq.id}</h2>
                  <Badge className={`mt-2 ${reqStatusConfig[loanReq.status]?.color || ""}`}>
                    {reqStatusConfig[loanReq.status]?.label || loanReq.status}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="col-span-2">
                    <span className="text-muted-foreground">Equipamento:</span>
                    <span className="font-medium ml-1">
                      {loanReq.pacote_detail
                        ? `Pacote: ${loanReq.pacote_detail.name}`
                        : loanReq.equipments_detail && loanReq.equipments_detail.length > 0
                          ? loanReq.equipments_detail.map((e: any) => e.full_name || `${e.brand||''} ${e.model||''}`).join(', ')
                          : loanReq.quantity > 0 ? `${loanReq.quantity} equipamentos` : '-'}
                    </span>
                  </div>
                  <div><span className="text-muted-foreground">Utente:</span> <span className="font-medium">{loanReq.user_name || '-'}</span></div>
                  <div><span className="text-muted-foreground">Finalidade:</span> <span>{loanReq.purpose || '-'}</span></div>
                  <div><span className="text-muted-foreground">Data Devolução:</span> <span>{loanReq.expected_return_date ? new Date(loanReq.expected_return_date).toLocaleDateString('pt-BR') : '-'}</span></div>
                  {loanReq.tecnico_name && <div><span className="text-muted-foreground">Técnico:</span> <span>{loanReq.tecnico_name}</span></div>}
                  {loanReq.devolucao_mesmo_dia && <div><span className="text-muted-foreground">Devolução:</span> <span>Mesmo dia</span></div>}
                  <div><span className="text-muted-foreground">Criada em:</span> <span>{loanReq.created_at ? new Date(loanReq.created_at).toLocaleDateString('pt-BR') : '-'}</span></div>
                </div>

                {loanReq.motivo_decisao && (
                  <div><span className="text-sm text-muted-foreground">Motivo:</span><p className="text-sm mt-1">{loanReq.motivo_decisao}</p></div>
                )}

                <div className="flex justify-center pt-2">
                  <img src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${window.location.origin}/consulta/${loanReq.qrcode_hash}`} alt="QR" className="inline-block" />
                </div>

                <div className="text-center pt-2">
                  <a href="/solicitacoes" className="text-sm text-primary underline inline-flex items-center gap-1">
                    <FileText className="h-3 w-3" /> Ir para Solicitações
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
