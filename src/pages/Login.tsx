import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Login = () => {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (session) navigate("/dashboard/conteudo", { replace: true });
  }, [session, navigate]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);
    if (error) {
      setError("Email ou senha inválidos");
    } else {
      navigate("/dashboard/conteudo", { replace: true });
    }
  };

  return (
    <div className="min-h-full flex items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm bg-surface border border-border-soft rounded-lg p-8">
        <div className="text-center mb-8">
          <h1 className="text-[28px] font-bold text-primary leading-none">NutriDash</h1>
          <p className="text-sm text-muted-foreground mt-2">Painel Administrativo</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Email
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md bg-surface-2 border border-border-soft text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:border-primary transition-colors"
              placeholder="email@exemplo.com"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-muted-foreground mb-1.5">
              Senha
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-3 py-2.5 rounded-md bg-surface-2 border border-border-soft text-sm text-foreground focus:outline-none focus:border-primary transition-colors"
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-2.5 rounded-md bg-primary hover:bg-primary-hover text-primary-foreground text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
          >
            {loading ? "Entrando…" : "Entrar"}
          </button>

          {error && (
            <p className="text-sm text-destructive text-center">{error}</p>
          )}
        </form>
      </div>
    </div>
  );
};

export default Login;
