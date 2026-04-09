import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "../lib/supabase";

export default function PedidosVenda() {
  const navigate = useNavigate();

  const [pedidos, setPedidos] = useState([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    carregarPedidos();
  }, []);

  async function carregarPedidos() {
    try {
      setCarregando(true);

      const { data, error } = await supabase
        .from("vendas")
        .select("*")
        .order("id", { ascending: false });

      if (error) {
        console.error(error);
        alert("Erro ao carregar pedidos");
        setPedidos([]);
        return;
      }

      setPedidos(data || []);
    } catch (err) {
      console.error(err);
      alert("Erro inesperado ao carregar pedidos");
      setPedidos([]);
    } finally {
      setCarregando(false);
    }
  }

  function moeda(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function formatarData(data) {
    if (!data) return "-";
    const d = new Date(data);
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("pt-BR");
  }

  function normalizarStatus(status) {
    const s = String(status || "").toLowerCase();
    if (s === "fechado" || s === "finalizado") return "fechado";
    return "aberto";
  }

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      const texto = busca.toLowerCase();

      const bateBusca =
        String(p.id || "").toLowerCase().includes(texto) ||
        String(p.cliente_nome || "").toLowerCase().includes(texto);

      const status = normalizarStatus(p.status);
      const bateStatus =
        filtroStatus === "todos" ? true : status === filtroStatus;

      return bateBusca && bateStatus;
    });
  }, [pedidos, busca, filtroStatus]);

  return (
    <div className="bg-white p-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <h1 className="text-2xl font-bold text-slate-700">Pedidos de venda</h1>

          <button
            type="button"
            onClick={() => navigate("/vendas")}
            className="rounded-2xl bg-[#2AB7B0] px-5 py-3 font-semibold text-white hover:bg-[#0B7285]"
          >
            + Novo pedido
          </button>
        </div>

        <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 md:flex-row md:items-center md:justify-between">
          <input
            type="text"
            placeholder="Buscar pedido ou cliente"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            className="w-full max-w-md rounded-xl border border-slate-200 bg-white px-4 py-2 outline-none"
          />

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setFiltroStatus("todos")}
              className={`rounded-xl px-4 py-2 ${
                filtroStatus === "todos"
                  ? "bg-[#2AB7B0] text-white"
                  : "border bg-white text-slate-600"
              }`}
            >
              Todos
            </button>

            <button
              type="button"
              onClick={() => setFiltroStatus("aberto")}
              className={`rounded-xl px-4 py-2 ${
                filtroStatus === "aberto"
                  ? "bg-[#EE6D46] text-white"
                  : "border bg-white text-slate-600"
              }`}
            >
              Aberto
            </button>

            <button
              type="button"
              onClick={() => setFiltroStatus("fechado")}
              className={`rounded-xl px-4 py-2 ${
                filtroStatus === "fechado"
                  ? "bg-[#0B7285] text-white"
                  : "border bg-white text-slate-600"
              }`}
            >
              Fechado
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-slate-50 text-left">
                <th className="p-4">Número</th>
                <th className="p-4">Data</th>
                <th className="p-4">Cliente</th>
                <th className="p-4">Total</th>
                <th className="p-4">Lucro</th>
                <th className="p-4">Status</th>
              </tr>
            </thead>

            <tbody>
              {carregando ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center">
                    Carregando pedidos...
                  </td>
                </tr>
              ) : pedidosFiltrados.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-6 text-center">
                    Nenhum pedido encontrado
                  </td>
                </tr>
              ) : (
                pedidosFiltrados.map((p) => {
                  const status = normalizarStatus(p.status);

                  return (
                    <tr key={p.id} className="border-b hover:bg-slate-50">
                      <td className="p-4 font-bold">{p.id}</td>
                      <td className="p-4">{formatarData(p.created_at)}</td>
                      <td className="p-4">{p.cliente_nome || "Consumidor"}</td>
                      <td className="p-4">{moeda(p.total)}</td>
                      <td className="p-4">{moeda(p.lucro)}</td>
                      <td className="p-4">
                        <span
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${
                            status === "fechado"
                              ? "bg-cyan-100 text-[#0B7285]"
                              : "bg-orange-100 text-[#EE6D46]"
                          }`}
                        >
                          {status === "fechado" ? "Fechado" : "Aberto"}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}