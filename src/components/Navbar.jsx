import { Link, useLocation } from "react-router-dom";
import logoSmartUp from "../assets/logo.png";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const location = useLocation();
  const { perfil, logout } = useAuth();

  const links = [
    { to: "/dashboard", label: "Dashboard", modulo: "modulo_dashboard" },
    { to: "/pedidos-venda", label: "Pedidos", modulo: "modulo_pedidos" },
    { to: "/produtos", label: "Produtos", modulo: "modulo_produtos" },
    { to: "/clientes", label: "Clientes", modulo: "modulo_clientes" },
    { to: "/relatorio", label: "Relatório", modulo: "modulo_relatorio" },
    { to: "/ordem-servico", label: "OS", modulo: "modulo_os" },
  ];

  const linksPermitidos = links.filter(
    (item) => perfil && Number(perfil[item.modulo]) === 1
  );

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
        <Link to="/" className="flex items-center gap-3 group">
          <img
            src={logoSmartUp}
            alt="Logo Smart Up"
            className="h-12 w-12 object-contain transition group-hover:scale-105"
          />

          <div className="leading-tight">
            <h1 className="text-lg font-black text-slate-900 group-hover:text-[#2AB7B0] transition">
              Smart Up
            </h1>
            <p className="text-xs font-medium text-slate-500">
              Cerro Azul • Gestão Inteligente
            </p>
          </div>
        </Link>

        <div className="hidden items-center gap-2 md:flex">
          <nav className="flex flex-wrap gap-2">
            {linksPermitidos.map((item) => {
              const ativo = location.pathname === item.to;

              return (
                <Link
                  key={item.to}
                  to={item.to}
                  className={`rounded-2xl px-4 py-2 text-sm font-semibold transition-all duration-200 ${
                    ativo
                      ? "bg-[#2AB7B0] text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <button
            onClick={logout}
            className="rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600 hover:bg-red-100"
          >
            Sair
          </button>
        </div>
      </div>

      <div className="flex gap-2 overflow-x-auto px-4 pb-3 md:hidden">
        {linksPermitidos.map((item) => {
          const ativo = location.pathname === item.to;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={`whitespace-nowrap rounded-2xl px-4 py-2 text-sm font-semibold transition ${
                ativo
                  ? "bg-[#2AB7B0] text-white"
                  : "bg-slate-100 text-slate-700"
              }`}
            >
              {item.label}
            </Link>
          );
        })}

        <button
          onClick={logout}
          className="whitespace-nowrap rounded-2xl bg-red-50 px-4 py-2 text-sm font-semibold text-red-600"
        >
          Sair
        </button>
      </div>
    </header>
  );
}