import { Navigate } from "react-router-dom";
import { useAuth } from "@/contexts/AuthContext";

export const ProtectedRoute = ({ children }: { children: JSX.Element }) => {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="flex h-full items-center justify-center text-muted-foreground">
        Carregando…
      </div>
    );
  }
  if (!session) return <Navigate to="/login" replace />;
  return children;
};
