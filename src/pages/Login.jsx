import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import logoSmartUp from "../assets/logo.png";

export default function Login() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    if (!email.trim()) {
      alert("Informe o email");
      return;
    }

    if (!senha.trim()) {
      alert("Informe a senha");
      return;
    }

    try {
      setEntrando(true);

      const { error } = await login(email, senha);

      if (error) {
        console.error(error);
        alert("Email ou senha inválidos");
        return;
      }

      navigate("/", { replace: true });
    } catch (error) {
      console.error(error);
      alert("Erro ao entrar");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50 px-4">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-3xl border border-slate-200 bg-white p-8 shadow-sm"
      >
        <div className="mb-6 flex items-center gap-3">
          <img
            src={logoSmartUp}
            alt="Logo Smart Up"
            className="h-14 w-14 object-contain"
          />
          <div>
            <h1 className="text-2xl font-black text-slate-900">Smart Up</h1>
            <p className="text-sm text-slate-500">Entrar no sistema</p>
          </div>
        </div>

        <div className="mb-4">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Email
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2AB7B0]"
            placeholder="seuemail@exemplo.com"
            autoComplete="email"
          />
        </div>

        <div className="mb-6">
          <label className="mb-2 block text-sm font-semibold text-slate-700">
            Senha
          </label>
          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2AB7B0]"
            placeholder="********"
            autoComplete="current-password"
          />
        </div>

        <button
          type="submit"
          disabled={entrando}
          className="w-full rounded-2xl bg-[#2AB7B0] py-3 font-bold text-white hover:bg-[#0B7285] disabled:cursor-not-allowed disabled:opacity-60"
        >
          {entrando ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}