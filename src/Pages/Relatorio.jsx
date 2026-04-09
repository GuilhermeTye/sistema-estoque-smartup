import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Relatorio() {
  const [vendas, setVendas] = useState([]);
  const [filtro, setFiltro] = useState({ inicio: "", fim: "" });
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarVendas();
  }, []);

  async function carregarVendas() {
    try {
      setCarregando(true);

      const { data, error } = await supabase
        .from("vendas")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        console.error(error);
        alert("Erro ao carregar relatório");
        return;
      }

      setVendas(data || []);
    } catch (error) {
      console.error(error);
      alert("Erro inesperado ao carregar relatório");
    } finally {
      setCarregando(false);
    }
  }

  const formatarMoeda = (v) =>
    Number(v || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const lista = useMemo(() => {
    return vendas.filter((v) => {
      const dataVenda = new Date(v.created_at || v.data);

      if (filtro.inicio) {
        const inicio = new Date(`${filtro.inicio}T00:00:00`);
        if (dataVenda < inicio) return false;
      }

      if (filtro.fim) {
        const fim = new Date(`${filtro.fim}T23:59:59`);
        if (dataVenda > fim) return false;
      }

      return true;
    });
  }, [vendas, filtro]);

  const total = lista.reduce((acc, v) => acc + Number(v.total || 0), 0);
  const lucro = lista.reduce((acc, v) => acc + Number(v.lucro || 0), 0);

  return (
    <div className="bg-white p-6">
      <h1 className="mb-4 text-3xl font-black text-slate-800">Relatório</h1>

      <div className="mb-4 flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:flex-row">
        <input
          type="date"
          value={filtro.inicio}
          onChange={(e) => setFiltro((prev) => ({ ...prev, inicio: e.target.value }))}
          className="rounded-xl border p-3"
        />

        <input
          type="date"
          value={filtro.fim}
          onChange={(e) => setFiltro((prev) => ({ ...prev, fim: e.target.value }))}
          className="rounded-xl border p-3"
        />
      </div>

      <div className="mb-4 grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Faturamento</p>
          <h2 className="mt-2 text-2xl font-black text-[#EE6D46]">
            {formatarMoeda(total)}
          </h2>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Lucro</p>
          <h2 className="mt-2 text-2xl font-black text-[#2AB7B0]">
            {formatarMoeda(lucro)}
          </h2>
        </div>

        <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <p className="text-sm text-slate-500">Quantidade de vendas</p>
          <h2 className="mt-2 text-2xl font-black text-[#0B7285]">
            {lista.length}
          </h2>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        {carregando ? (
          <p className="p-4">Carregando...</p>
        ) : lista.length === 0 ? (
          <p className="p-4 text-slate-500">Nenhuma venda encontrada.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50 text-left">
                  <th className="p-3">Data</th>
                  <th className="p-3">Cliente</th>
                  <th className="p-3">Total</th>
                  <th className="p-3">Lucro</th>
                  <th className="p-3">Status</th>
                </tr>
              </thead>

              <tbody>
                {lista.map((v) => (
                  <tr key={v.id} className="border-t">
                    <td className="p-3">
                      {new Date(v.created_at || v.data).toLocaleDateString("pt-BR")}
                    </td>
                    <td className="p-3">{v.cliente_nome || "-"}</td>
                    <td className="p-3">{formatarMoeda(v.total)}</td>
                    <td className="p-3 text-[#2AB7B0]">
                      {formatarMoeda(v.lucro)}
                    </td>
                    <td className="p-3">{v.status || "fechado"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}