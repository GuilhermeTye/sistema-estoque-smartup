import { Link, useLocation } from "react-router-dom";
import logoSmartUp from "../assets/logo.png";

const links = [
  { to: "/dashboard", label: "Dashboard" },
  { to: "/pedidos-venda", label: "Pedidos" },
  { to: "/produtos", label: "Produtos" },
  { to: "/clientes", label: "Clientes" },
  { to: "/relatorio", label: "Relatório" },
  { to: "/ordem-servico", label: "OS" },
];

export default function Navbar() {
  const location = useLocation();

  return (
    <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4">
        
        {/* LOGO + NOME (CLICÁVEL) */}
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

        {/* MENU DESKTOP */}
        <nav className="hidden flex-wrap gap-2 md:flex">
          {links.map((item) => {
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
      </div>

      {/* MENU MOBILE */}
      <div className="flex gap-2 overflow-x-auto px-4 pb-3 md:hidden">
        {links.map((item) => {
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
      </div>
    </header>
  );
}