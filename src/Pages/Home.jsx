import { useNavigate } from "react-router-dom";
import logoSmartUp from "../assets/logo.png";

function ActionCard({ title, description, buttonText, onClick, colorClass }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-md">
      <h3 className="text-lg font-black text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{description}</p>

      <button
        onClick={onClick}
        className={`mt-5 rounded-2xl px-4 py-3 text-sm font-bold text-white transition ${colorClass}`}
      >
        {buttonText}
      </button>
    </div>
  );
}

export default function Home() {
  const navigate = useNavigate();

  return (
    <div className="min-h-[calc(100vh-80px)] bg-gradient-to-b from-white to-slate-50">
      <div className="mx-auto max-w-7xl px-4 py-10">
        <section className="grid items-center gap-8 lg:grid-cols-2">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-[#2AB7B0]/20 bg-[#2AB7B0]/10 px-4 py-2 text-sm font-semibold text-[#0B7285]">
              Sistema Smart Up
            </div>

            <h1 className="mt-5 text-4xl font-black leading-tight text-slate-900 md:text-6xl">
              Gestão moderna para
              <span className="text-[#2AB7B0]"> vendas, estoque </span>
              e clientes
            </h1>

            <p className="mt-5 max-w-xl text-base leading-7 text-slate-500">
              Um painel limpo, rápido e profissional para acompanhar sua loja,
              registrar vendas e crescer com mais organização.
            </p>

            <div className="mt-8 flex flex-wrap gap-3">
              <button
                onClick={() => navigate("/dashboard")}
                className="rounded-2xl bg-[#2AB7B0] px-6 py-3 font-bold text-white shadow-sm transition hover:bg-[#0B7285]"
              >
                Entrar no Dashboard
              </button>

              <button
                onClick={() => navigate("/vendas")}
                className="rounded-2xl border border-slate-200 bg-white px-6 py-3 font-bold text-slate-700 transition hover:bg-slate-100"
              >
                Nova venda
              </button>
            </div>
          </div>

          <div className="flex justify-center">
            <div className="w-full max-w-md rounded-[32px] border border-slate-200 bg-white p-8 shadow-xl">
              <div className="flex items-center gap-4">
                <img
                  src={logoSmartUp}
                  alt="Logo Smart Up"
                  className="h-16 w-16 object-contain"
                />
                <div>
                  <h2 className="text-2xl font-black text-slate-900">
                    Smart Up
                  </h2>
                  <p className="text-sm text-slate-500">
                    Cerro Azul • Painel SaaS
                  </p>
                </div>
              </div>

              <div className="mt-8 grid gap-4">
                <div className="rounded-2xl bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Faturamento</p>
                  <h3 className="mt-1 text-2xl font-black text-[#EE6D46]">
                    R$ 0,00
                  </h3>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Clientes</p>
                    <h3 className="mt-1 text-xl font-black text-[#0B7285]">
                      0
                    </h3>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4">
                    <p className="text-sm text-slate-500">Produtos</p>
                    <h3 className="mt-1 text-xl font-black text-[#2AB7B0]">
                      0
                    </h3>
                  </div>
                </div>

                <div className="rounded-2xl bg-[#2AB7B0] p-4 text-white">
                  <p className="text-sm text-white/80">Pronto para vender</p>
                  <h3 className="mt-1 text-xl font-black">
                    Sistema profissional ativo
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="mt-12 grid gap-4 md:grid-cols-3">
          <ActionCard
            title="Dashboard inteligente"
            description="Acompanhe faturamento, lucro, estoque baixo e indicadores principais em um visual premium."
            buttonText="Abrir dashboard"
            onClick={() => navigate("/dashboard")}
            colorClass="bg-[#2AB7B0] hover:bg-[#0B7285]"
          />

          <ActionCard
            title="Vendas rápidas"
            description="Selecione o cliente, adicione os produtos e finalize tudo em poucos cliques."
            buttonText="Ir para vendas"
            onClick={() => navigate("/vendas")}
            colorClass="bg-[#EE6D46] hover:bg-[#d85d38]"
          />

          <ActionCard
            title="Controle total"
            description="Gerencie produtos, clientes e relatórios com um fluxo limpo e fácil de usar."
            buttonText="Ver produtos"
            onClick={() => navigate("/produtos")}
            colorClass="bg-[#0B7285] hover:bg-[#085868]"
          />
        </section>
      </div>
    </div>
  );
}