import { Loader2 } from 'lucide-react';

/** Ecrã de espera com a marca, usado enquanto a sessão é validada no arranque. */
export const BrandSplash = () => (
  <div className="flex min-h-screen flex-col items-center justify-center gap-6 bg-gradient-surface">
    <img
      src="/logo-metodista.png"
      alt="Universidade Metodista de Angola"
      className="w-44 animate-pulse"
    />
    <Loader2 className="h-6 w-6 animate-spin text-primary" />
    <span className="sr-only">A validar sessão...</span>
  </div>
);
