import { useState } from "react";
import { MainLayout } from "@/components/layout/MainLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { atribuidoresAPI } from "@/lib/api";
import { AtribuidorEventual } from "@/types";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { UserPlus, Search, RotateCcw, Power, PowerOff } from "lucide-react";

export function Atribuidores() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");

  const { data: list, isLoading } = useQuery({
    queryKey: ["atribuidores", search],
    queryFn: () => atribuidoresAPI.list({ search, is_active: undefined }),
  });

  const activateMut = useMutation({
    mutationFn: (id: string) => atribuidoresAPI.activate(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["atribuidores"] }); toast.success("Ativado"); },
  });

  const deactivateMut = useMutation({
    mutationFn: (id: string) => atribuidoresAPI.deactivate(id),
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ["atribuidores"] }); toast.success("Desativado"); },
  });

  const atribuidores: AtribuidorEventual[] = (list as any)?.data ?? list ?? [];

  return (
    <MainLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Atribuidores Eventuais</h1>
          <Button onClick={() => toast.info("Formulário de criação — implementar.")}>
            <UserPlus className="mr-2 h-4 w-4" /> Novo Atribuidor
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Pesquisar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
          <Button variant="outline" size="icon" onClick={() => { setSearch(""); queryClient.invalidateQueries({ queryKey: ["atribuidores"] }); }}>
            <RotateCcw className="h-4 w-4" />
          </Button>
        </div>

        {isLoading ? (
          <p className="text-muted-foreground">A carregar...</p>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {atribuidores.map((a) => (
              <Card key={a.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-center justify-between">
                    <CardTitle className="text-base">{a.nome}</CardTitle>
                    <Badge variant={a.is_active ? "default" : "secondary"}>
                      {a.is_active ? "Ativo" : "Inativo"}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent className="space-y-1 text-sm text-muted-foreground">
                  <p><span className="font-medium">Função:</span> {a.funcao}</p>
                  <p><span className="font-medium">Grau:</span> {a.grau_academico}</p>
                  {a.entidade_empregadora && <p><span className="font-medium">Empregador:</span> {a.entidade_empregadora}</p>}
                  {a.morada && <p><span className="font-medium">Morada:</span> {a.morada}</p>}
                  <div className="flex gap-2 pt-2">
                    {a.is_active ? (
                      <Button size="sm" variant="outline" onClick={() => deactivateMut.mutate(a.id)}>
                        <PowerOff className="mr-1 h-3 w-3" /> Desativar
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" onClick={() => activateMut.mutate(a.id)}>
                        <Power className="mr-1 h-3 w-3" /> Ativar
                      </Button>
                    )}
                    <Button size="sm" variant="outline" onClick={() => toast.info("Editar — implementar.")}>Editar</Button>
                  </div>
                </CardContent>
              </Card>
            ))}
            {atribuidores.length === 0 && (
              <p className="text-muted-foreground col-span-full text-center py-8">
                Nenhum atribuidor eventual encontrado.
              </p>
            )}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
