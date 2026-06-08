import { useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { supabase } from "../lib/supabase";
import logoSmartUp from "../assets/logo.png";

export default function Login() {
  const { login, user, loading } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [entrando, setEntrando] = useState(false);
  const [erro, setErro] = useState("");

  if (!loading && user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e) {
    e.preventDefault();

    setErro("");

    if (!email.trim()) {
      setErro("Informe seu email.");
      return;
    }

    if (!senha.trim()) {
      setErro("Informe sua senha.");
      return;
    }

    try {
      setEntrando(true);

      const { error } = await login(email, senha);

      if (error) {
        setErro("Email ou senha inválidos.");
        return;
      }

      const {
        data: { user: authUser },
      } = await supabase.auth.getUser();

      if (!authUser) {
        setErro("Usuário não encontrado.");
        return;
      }

      const { data: usuario, error: usuarioError } = await supabase
        .from("usuarios")
        .select("empresa_id,nome")
        .eq("id", authUser.id)
        .single();

      if (usuarioError || !usuario) {
        setErro("Usuário sem empresa vinculada.");
        return;
      }

      localStorage.setItem(
        "smartup_empresa",
        usuario.empresa_id
      );

      localStorage.setItem(
        "smartup_usuario",
        JSON.stringify(usuario)
      );

      navigate("/", { replace: true });
    } catch (error) {
      console.error(error);
      setErro("Erro ao realizar login.");
    } finally {
      setEntrando(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[#0B7285] via-[#2AB7B0] to-[#EE6D46] p-6">
      <div className="absolute inset-0 opacity-10">
        <img
          src={logoSmartUp}
          alt=""
          className="w-full h-full object-contain"
        />
      </div>

      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md bg-white/95 backdrop-blur rounded-3xl shadow-2xl p-8"
      >
        <div className="flex flex-col items-center mb-8">
          <img
            src={logoSmartUp}
            alt="SmartUp"
            className="w-24 h-24 object-contain mb-4"
          />

          <h1 className="text-3xl font-black text-slate-800">
            SmartUp ERP
          </h1>

          <p className="text-slate-500 mt-1">
            Gestão Inteligente para Empresas
          </p>
        </div>

        {erro && (
          <div className="mb-4 rounded-xl bg-red-50 border border-red-200 p-3 text-sm text-red-600">
            {erro}
          </div>
        )}

        <div className="mb-4">
          <label className="block mb-2 font-semibold text-slate-700">
            Email
          </label>

          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="contato@empresa.com"
            className="w-full border border-slate-300 rounded-2xl px-4 py-3 focus:border-[#2AB7B0] focus:ring-2 focus:ring-[#2AB7B0]/20 outline-none"
          />
        </div>

        <div className="mb-6">
          <label className="block mb-2 font-semibold text-slate-700">
            Senha
          </label>

          <input
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            placeholder="********"
            className="w-full border border-slate-300 rounded-2xl px-4 py-3 focus:border-[#2AB7B0] focus:ring-2 focus:ring-[#2AB7B0]/20 outline-none"
          />
        </div>

        <button
          type="submit"
          disabled={entrando}
          className="w-full rounded-2xl bg-[#2AB7B0] py-3 font-bold text-white transition-all hover:bg-[#0B7285] hover:scale-[1.02] disabled:opacity-50"
        >
          {entrando ? "Entrando..." : "Entrar no Sistema"}
        </button>

        <div className="mt-6 text-center text-sm text-slate-500">
          © {new Date().getFullYear()} SmartUp ERP
        </div>
      </form>
    </div>
  );
}