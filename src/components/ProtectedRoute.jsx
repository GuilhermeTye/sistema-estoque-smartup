import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const { user, loading, perfil } = useAuth();

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center bg-white">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-slate-500 shadow-sm">
          Carregando sistema...
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (perfil && Number(perfil.ativo) !== 1) {
    return (
      <div className="flex h-screen items-center justify-center bg-white px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black text-slate-900">
            Usuário inativo
          </h1>
          <p className="mt-2 text-slate-500">
            Seu acesso está desativado. Fale com o administrador do sistema.
          </p>
        </div>
      </div>
    );
  }

  return children;
}