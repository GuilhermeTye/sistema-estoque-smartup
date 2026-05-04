import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const CLIENTE_PADRAO = {
  id: null,
  nome: "Consumidor",
};

export default function PedidosVenda() {
  const [modo, setModo] = useState("lista");
  const [pedidoEditandoId, setPedidoEditandoId] = useState(null);

  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);

  const [buscaPedido, setBuscaPedido] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [carregandoLista, setCarregandoLista] = useState(true);

  const [clienteBusca, setClienteBusca] = useState("Consumidor");
  const [clienteSelecionado, setClienteSelecionado] = useState(CLIENTE_PADRAO);

  const [produtoBusca, setProdutoBusca] = useState("");
  const [itens, setItens] = useState([]);
  const [salvando, setSalvando] = useState(false);

  const [pedidoExcluir, setPedidoExcluir] = useState(null);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    carregarTudo();
  }, []);

  async function carregarTudo() {
    try {
      setCarregandoLista(true);

      const [
        { data: vendasData },
        { data: clientesData },
        { data: produtosData },
      ] = await Promise.all([
        supabase.from("vendas").select("*").order("id", { ascending: false }),
        supabase.from("clientes").select("*"),
        supabase.from("produtos").select("*"),
      ]);

      setPedidos(vendasData || []);
      setClientes(clientesData || []);
      setProdutos(produtosData || []);
    } catch (error) {
      console.error(error);
      alert("Erro ao carregar dados");
    } finally {
      setCarregandoLista(false);
    }
  }

  function moeda(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function normalizarStatus(status) {
    const s = String(status || "").toLowerCase();
    if (s === "fechado" || s === "finalizado") return "fechado";
    return "aberto";
  }

  function formatarData(data) {
    if (!data) return "-";
    const d = new Date(data);
    return d.toLocaleDateString("pt-BR");
  }

  // 🔥 FILTRO COMPLETO (BUSCA + STATUS + DATA)
  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      const texto = buscaPedido.toLowerCase();

      const bateBusca =
        String(p.id).toLowerCase().includes(texto) ||
        String(p.cliente_nome).toLowerCase().includes(texto);

      const status = normalizarStatus(p.status);
      const bateStatus =
        filtroStatus === "todos" ? true : status === filtroStatus;

      let bateData = true;

      if (dataInicio || dataFim) {
        const dataPedido = new Date(p.created_at);
        dataPedido.setHours(0, 0, 0, 0);

        if (dataInicio) {
          const inicio = new Date(dataInicio);
          bateData = bateData && dataPedido >= inicio;
        }

        if (dataFim) {
          const fim = new Date(dataFim);
          bateData = bateData && dataPedido <= fim;
        }
      }

      return bateBusca && bateStatus && bateData;
    });
  }, [pedidos, buscaPedido, filtroStatus, dataInicio, dataFim]);

  return (
    <div className="bg-white p-6">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">

        {/* HEADER */}
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
          <div>
            <h1 className="text-2xl font-bold text-slate-800">
              Pedidos de venda
            </h1>
            <p className="text-sm text-slate-500">
              Lista de pedidos cadastrados
            </p>
          </div>

          <button className="rounded-2xl bg-[#2AB7B0] px-5 py-3 font-semibold text-white">
            + Novo pedido
          </button>
        </div>

        {/* 🔥 FILTROS CORRIGIDOS */}
        <div className="flex flex-col gap-3 border-b border-slate-200 bg-white px-6 py-4">

          <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">

            <div className="flex flex-col gap-3 md:flex-row md:items-center">

              <input
                type="text"
                placeholder="Buscar pedido ou cliente"
                value={buscaPedido}
                onChange={(e) => setBuscaPedido(e.target.value)}
                className="w-full md:w-[560px] rounded-xl border border-slate-200 bg-white px-4 py-3 outline-none"
              />

              <input
                type="date"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
              />

              <input
                type="date"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                className="rounded-xl border border-slate-200 bg-white px-4 py-3"
              />

              <button
                onClick={() => {
                  setBuscaPedido("");
                  setDataInicio("");
                  setDataFim("");
                  setFiltroStatus("todos");
                }}
                className="rounded-xl border border-slate-200 px-4 py-3"
              >
                Limpar
              </button>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setFiltroStatus("todos")}
                className={`rounded-xl px-4 py-3 ${
                  filtroStatus === "todos"
                    ? "bg-[#2AB7B0] text-white"
                    : "border border-slate-200"
                }`}
              >
                Todos
              </button>

              <button
                onClick={() => setFiltroStatus("aberto")}
                className={`rounded-xl px-4 py-3 ${
                  filtroStatus === "aberto"
                    ? "bg-[#EE6D46] text-white"
                    : "border border-slate-200"
                }`}
              >
                Aberto
              </button>

              <button
                onClick={() => setFiltroStatus("fechado")}
                className={`rounded-xl px-4 py-3 ${
                  filtroStatus === "fechado"
                    ? "bg-[#0B7285] text-white"
                    : "border border-slate-200"
                }`}
              >
                Fechado
              </button>
            </div>
          </div>
        </div>

        {/* TABELA */}
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
              {pedidosFiltrados.map((p) => {
                const status = normalizarStatus(p.status);

                return (
                  <tr key={p.id} className="border-b">
                    <td className="p-4">{p.id}</td>
                    <td className="p-4">{formatarData(p.created_at)}</td>
                    <td className="p-4">{p.cliente_nome}</td>
                    <td className="p-4">{moeda(p.total)}</td>
                    <td className="p-4">{moeda(p.lucro)}</td>
                    <td className="p-4">{status}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

      </div>
    </div>
  );
}