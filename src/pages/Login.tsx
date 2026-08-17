import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Loader2, Lock, User as UserIcon, Landmark } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { BrandSplash } from '@/components/BrandSplash';

const DEMO_USERS = [
  { email: 'admin@unihub.com', role: 'Admin (DTI)', password: 'admin123' },
  { email: 'tecnico@unihub.com', role: 'Técnico', password: 'tecnico123' },
  { email: 'secretaria@unihub.com', role: 'Secretária', password: 'secretaria123' },
  { email: 'ana.santos@unihub.com', role: 'Docente', password: 'docente123' },
];

export const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const { login, isAuthenticated, isInitializing } = useAuth();
  const { toast } = useToast();

  // Evita mostrar o formulario num piscar antes de a sessao guardada ser validada
  if (isInitializing) {
    return <BrandSplash />;
  }

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const success = await login(email, password, remember);
      if (success) {
        toast({
          title: 'Sessão iniciada',
          description: 'A redirecionar para o painel...',
        });
      } else {
        setError('Credenciais inválidas. Tente novamente.');
      }
    } catch {
      setError('Não foi possível contactar o servidor. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-surface lg:grid lg:grid-cols-[1.05fr_1fr]">
      {/* ---------------- Painel institucional ---------------- */}
      <aside className="relative hidden overflow-hidden bg-[#F7F7F7] lg:flex lg:flex-col lg:justify-center">
        {/* Cunha vermelha do canto superior esquerdo */}
        <svg
          className="pointer-events-none absolute left-0 top-0 h-44 w-44"
          viewBox="0 0 200 200"
          preserveAspectRatio="xMinYMin meet"
          aria-hidden="true"
        >
          <path d="M0,0 L200,0 C110,18 34,86 0,200 Z" fill="hsl(var(--brand-red))" />
        </svg>

        {/* Faixa curva vermelha no canto inferior esquerdo */}
        <svg
          className="pointer-events-none absolute bottom-0 left-0 h-[78%] w-[78%]"
          viewBox="0 0 600 600"
          preserveAspectRatio="xMinYMax meet"
          aria-hidden="true"
        >
          <path
            d="M-10,150 C250,235 355,360 330,620"
            fill="none"
            stroke="hsl(var(--brand-red))"
            strokeWidth="42"
            strokeLinecap="square"
          />
        </svg>

        <div className="relative z-10 flex flex-col items-center px-16">
          <img
            src="/logo-metodista.png"
            alt="Universidade Metodista de Angola"
            className="w-[300px] max-w-full drop-shadow-sm"
          />
        </div>

        <div className="absolute bottom-8 left-8 z-10 max-w-[12rem]">
          <p className="text-sm font-semibold leading-snug text-primary">
            Excelência no Ensino,
            <br />
            Compromisso com a Transformação
          </p>
          <div className="mt-3 h-[3px] w-14 rounded-full bg-brand-red" />
        </div>
      </aside>

      {/* ---------------- Painel do formulário ---------------- */}
      <main className="flex min-h-screen items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-lg">
          {/* Logo em ecrãs pequenos, onde o painel institucional fica oculto */}
          <img
            src="/logo-metodista.png"
            alt="Universidade Metodista de Angola"
            className="mx-auto mb-8 w-40 lg:hidden"
          />

          <div className="overflow-hidden rounded-3xl bg-card shadow-xl">
            {/* Cabeçalho azul com a curva vermelha da identidade */}
            <div className="relative bg-primary px-8 pb-16 pt-10 text-center">
              <h1 className="text-2xl font-bold text-primary-foreground">Bem-vindo(a)</h1>
              <p className="mt-1 text-sm text-primary-foreground/85">Faça login para continuar</p>

              <svg
                className="absolute inset-x-0 bottom-0 h-16 w-full"
                viewBox="0 0 400 64"
                preserveAspectRatio="none"
                aria-hidden="true"
              >
                <path d="M0,64 L0,46 C110,4 260,-6 400,22 L400,64 Z" fill="hsl(var(--card))" />
                <path
                  d="M0,46 C110,4 260,-6 400,22"
                  fill="none"
                  stroke="hsl(var(--brand-red))"
                  strokeWidth="4"
                />
              </svg>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4 px-6 pb-8 pt-2 sm:px-8">
              <div className="relative">
                <UserIcon className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="email"
                  type="email"
                  autoComplete="username"
                  placeholder="Nome de utilizador ou e-mail"
                  aria-label="Nome de utilizador ou e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={loading}
                  className="h-14 rounded-2xl pl-12 text-base"
                />
              </div>

              <div className="relative">
                <Lock className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  placeholder="Senha"
                  aria-label="Senha"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  disabled={loading}
                  className="h-14 rounded-2xl pl-12 pr-12 text-base"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
                  className="absolute right-4 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </div>

              <div className="flex items-center justify-between pt-1">
                <label className="flex cursor-pointer items-center gap-2 text-sm text-foreground">
                  <Checkbox
                    checked={remember}
                    onCheckedChange={(v) => setRemember(v === true)}
                    disabled={loading}
                  />
                  Lembrar-me
                </label>
                <button
                  type="button"
                  onClick={() =>
                    toast({
                      title: 'Reposição de palavra-passe',
                      description:
                        'A reposição é feita pela DTI. Contacte o administrador do sistema para repor o seu acesso.',
                    })
                  }
                  className="text-sm font-semibold text-primary underline-offset-4 hover:underline"
                >
                  Esqueceu a senha?
                </button>
              </div>

              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <Button
                type="submit"
                disabled={loading}
                className="h-14 w-full rounded-2xl bg-primary text-base font-semibold hover:bg-primary-dark"
              >
                {loading ? (
                  <>
                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />A entrar...
                  </>
                ) : (
                  'Entrar'
                )}
              </Button>

              <div className="flex items-center gap-3 py-1">
                <span className="h-px flex-1 bg-border" />
                <span className="text-xs text-muted-foreground">ou</span>
                <span className="h-px flex-1 bg-border" />
              </div>

              <Button
                type="button"
                variant="outline"
                disabled
                title="Integração com o sistema institucional ainda não disponível"
                className="h-14 w-full rounded-2xl border-2 border-primary/30 px-3 text-sm font-semibold text-primary sm:text-base"
              >
                <Landmark className="mr-2 h-5 w-5 shrink-0" />
                Entrar com conta institucional
                <span className="ml-2 hidden rounded-full bg-muted px-2 py-0.5 text-[11px] font-medium text-muted-foreground sm:inline">
                  em breve
                </span>
              </Button>
            </form>
          </div>

          {import.meta.env.DEV && (
            <details className="mt-6 rounded-2xl border bg-card/60 p-4 text-sm">
              <summary className="cursor-pointer font-medium text-muted-foreground">
                Contas de demonstração (apenas em desenvolvimento)
              </summary>
              <div className="mt-3 space-y-1">
                {DEMO_USERS.map((u) => (
                  <button
                    key={u.email}
                    type="button"
                    onClick={() => {
                      setEmail(u.email);
                      setPassword(u.password);
                    }}
                    className="w-full rounded-lg p-2 text-left text-xs transition-colors hover:bg-accent"
                  >
                    <span className="font-medium">{u.email}</span>
                    <span className="ml-2 text-muted-foreground">({u.role})</span>
                  </button>
                ))}
              </div>
            </details>
          )}

          <p className="mt-8 text-center text-sm font-semibold text-primary">
            www.universidademetodista.ao
          </p>
        </div>
      </main>
    </div>
  );
};
