import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ModuleRoute({ modulo, children }) {
  const { perfil, perfilLoading, user } = useAuth();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  if (perfilLoading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="rounded-2xl border border-slate-200 bg-white px-6 py-4 text-slate-500 shadow-sm">
          Carregando módulo...
        </div>
      </div>
    );
  }

  if (!perfil) {
    return (
      <div className="p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black text-slate-900">
            Perfil não encontrado
          </h1>
          <p className="mt-2 text-slate-500">
            Seu login existe, mas ainda não foi configurado na tabela
            <strong> usuarios</strong>.
          </p>
        </div>
      </div>
    );
  }

  if (Number(perfil[modulo]) !== 1) {
    return (
      <div className="p-6">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <h1 className="text-2xl font-black text-slate-900">Acesso negado</h1>
          <p className="mt-2 text-slate-500">
            Você não tem permissão para acessar este módulo.
          </p>
        </div>
      </div>
    );
  }

  return children;
}