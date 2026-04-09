import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import logoSmartUp from "../assets/logo.png";

function StatCard({ title, value, helper, color }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm transition hover:shadow-md">
      <p className="text-sm font-medium text-slate-500">{title}</p>
      <h3 className={`mt-2 text-3xl font-black ${color}`}>{value}</h3>
      <p className="mt-2 text-xs text-slate-400">{helper}</p>
    </div>
  );
}

function QuickCard({ title, content, accent }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className={`mb-4 h-2 w-14 rounded-full ${accent}`} />
      <h3 className="text-lg font-black text-slate-900">{title}</h3>
      <p className="mt-2 text-sm leading-6 text-slate-500">{content}</p>
    </div>
  );
}

export default function Dashboard() {
  const [dados, setDados] = useState({
    totalProdutos: 0,
    totalClientes: 0,
    totalVendas: 0,
    faturamento: 0,
    lucro: 0,
    estoqueBaixo: 0,
  });

  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarDashboard();
  }, []);

  async function carregarDashboard() {
    try {
      setCarregando(true);

      const [
        { data: produtos, error: erroProdutos },
        { data: clientes, error: erroClientes },
        { data: vendas, error: erroVendas },
      ] = await Promise.all([
        supabase.from("produtos").select("*"),
        supabase.from("clientes").select("*"),
        supabase.from("vendas").select("*"),
      ]);

      if (erroProdutos || erroClientes || erroVendas) {
        console.error(erroProdutos || erroClientes || erroVendas);
        alert("Erro ao carregar dashboard");
        return;
      }

      const faturamento = (vendas || []).reduce(
        (acc, item) => acc + Number(item.total || 0),
        0
      );

      const lucro = (vendas || []).reduce(
        (acc, item) => acc + Number(item.lucro || 0),
        0
      );

      const estoqueBaixo = (produtos || []).filter(
        (item) => Number(item.estoque || 0) <= 3
      ).length;

      setDados({
        totalProdutos: (produtos || []).length,
        totalClientes: (clientes || []).length,
        totalVendas: (vendas || []).length,
        faturamento,
        lucro,
        estoqueBaixo,
      });
    } catch (error) {
      console.error(error);
      alert("Erro inesperado ao carregar dashboard");
    } finally {
      setCarregando(false);
    }
  }

  const moeda = (v) =>
    Number(v || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  if (carregando) {
    return <div className="p-6 text-slate-600">Carregando dashboard...</div>;
  }

  return (
    <div className="bg-white">
      <div className="mx-auto max-w-7xl px-4 py-8">
        <section className="overflow-hidden rounded-[32px] border border-slate-200 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 p-8 shadow-xl">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-4">
              <div className="rounded-3xl bg-white/10 p-3">
                <img
                  src={logoSmartUp}
                  alt="Logo Smart Up"
                  className="h-16 w-16 object-contain"
                />
              </div>

              <div>
                <p className="text-sm font-semibold text-[#2AB7B0]">
                  Smart Up SaaS
                </p>
                <h1 className="text-3xl font-black text-white md:text-4xl">
                  Dashboard da Loja
                </h1>
                <p className="mt-2 text-sm text-white/70">
                  Indicadores principais para acompanhar seu negócio
                </p>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white/5 px-5 py-4">
              <p className="text-xs uppercase tracking-wide text-white/50">
                Estoque baixo
              </p>
              <h2 className="mt-1 text-3xl font-black text-white">
                {dados.estoqueBaixo}
              </h2>
            </div>
          </div>
        </section>

        <section className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <StatCard
            title="Produtos cadastrados"
            value={dados.totalProdutos}
            helper="Itens disponíveis no catálogo"
            color="text-[#2AB7B0]"
          />

          <StatCard
            title="Clientes cadastrados"
            value={dados.totalClientes}
            helper="Base ativa de clientes"
            color="text-[#0B7285]"
          />

          <StatCard
            title="Total de vendas"
            value={dados.totalVendas}
            helper="Pedidos registrados no sistema"
            color="text-[#EE6D46]"
          />

          <StatCard
            title="Faturamento"
            value={moeda(dados.faturamento)}
            helper="Receita total da loja"
            color="text-[#E52D22]"
          />

          <StatCard
            title="Lucro estimado"
            value={moeda(dados.lucro)}
            helper="Lucro acumulado das vendas"
            color="text-[#2AB7B0]"
          />

          <StatCard
            title="Alerta de estoque"
            value={dados.estoqueBaixo}
            helper="Produtos com até 3 unidades"
            color="text-[#E52D22]"
          />
        </section>

        <section className="mt-6 grid gap-4 lg:grid-cols-3">
          <QuickCard
            title="Visual premium"
            content="Nosso sistema entrega um padrão mais moderno, limpo e pronto para apresentar profissionalismo ao seu dia."
            accent="bg-[#2AB7B0]"
          />

          <QuickCard
            title="Mais valor percebido"
            content="Um sistema que te entrega tudo que você precisa! A um clique de distancia."
            accent="bg-[#EE6D46]"
          />

          <QuickCard
            title="Base para crescer"
            content="O caminho para o Sucesso começa no controle fino financeiro"
            accent="bg-[#0B7285]"
          />
        </section>
      </div>
    </div>
  );
}