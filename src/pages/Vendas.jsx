import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Vendas() {
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [cliente, setCliente] = useState(null);
  const [itens, setItens] = useState([]);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    carregarDados();
  }, []);

  async function carregarDados() {
    try {
      setCarregando(true);

      const [{ data: c, error: erroClientes }, { data: p, error: erroProdutos }] =
        await Promise.all([
          supabase.from("clientes").select("*").order("nome", { ascending: true }),
          supabase.from("produtos").select("*").order("nome", { ascending: true }),
        ]);

      if (erroClientes || erroProdutos) {
        console.error(erroClientes || erroProdutos);
        alert("Erro ao carregar dados");
        return;
      }

      setClientes(c || []);
      setProdutos(p || []);
    } catch (error) {
      console.error(error);
      alert("Erro inesperado ao carregar dados");
    } finally {
      setCarregando(false);
    }
  }

  const moeda = (v) =>
    Number(v || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  function adicionarProduto(produto) {
    if (Number(produto.estoque) <= 0) {
      alert("Produto sem estoque");
      return;
    }

    const existe = itens.find((i) => i.id === produto.id);

    if (existe) {
      if (existe.quantidade >= produto.estoque) {
        alert("Quantidade maior que o estoque disponível");
        return;
      }

      setItens((prev) =>
        prev.map((i) =>
          i.id === produto.id ? { ...i, quantidade: i.quantidade + 1 } : i
        )
      );
    } else {
      setItens((prev) => [...prev, { ...produto, quantidade: 1 }]);
    }
  }

  function alterarQtd(id, qtdDigitada) {
    const qtd = Number(qtdDigitada);

    if (qtd <= 0 || Number.isNaN(qtd)) {
      removerItem(id);
      return;
    }

    setItens((prev) =>
      prev.map((i) => {
        if (i.id !== id) return i;

        if (qtd > i.estoque) {
          alert("Quantidade maior que o estoque disponível");
          return i;
        }

        return { ...i, quantidade: qtd };
      })
    );
  }

  function removerItem(id) {
    setItens((prev) => prev.filter((i) => i.id !== id));
  }

  const total = useMemo(
    () => itens.reduce((acc, i) => acc + Number(i.preco || 0) * i.quantidade, 0),
    [itens]
  );

  const lucro = useMemo(
    () =>
      itens.reduce(
        (acc, i) =>
          acc + (Number(i.preco || 0) - Number(i.custo || 0)) * i.quantidade,
        0
      ),
    [itens]
  );

  async function finalizarVenda() {
    if (!cliente) return alert("Selecione um cliente");
    if (itens.length === 0) return alert("Adicione pelo menos um produto");

    try {
      setSalvando(true);

      const { data: venda, error: vendaError } = await supabase
        .from("vendas")
        .insert([
          {
            cliente_id: cliente.id,
            cliente_nome: cliente.nome,
            total,
            lucro,
            status: "fechado",
          },
        ])
        .select()
        .single();

      if (vendaError) {
        console.error(vendaError);
        alert("Erro ao criar venda");
        return;
      }

      const itensFormatados = itens.map((i) => ({
        venda_id: venda.id,
        produto_id: i.id,
        nome_produto: i.nome,
        quantidade: i.quantidade,
        preco_unitario: Number(i.preco),
        custo_unitario: Number(i.custo),
        subtotal: Number(i.preco) * i.quantidade,
        lucro_item: (Number(i.preco) - Number(i.custo)) * i.quantidade,
      }));

      const { error: itensError } = await supabase
        .from("itens_venda")
        .insert(itensFormatados);

      if (itensError) {
        console.error(itensError);
        alert("Erro ao salvar itens da venda");
        return;
      }

      for (const item of itens) {
        const novoEstoque = Number(item.estoque) - Number(item.quantidade);

        const { error: estoqueError } = await supabase
          .from("produtos")
          .update({ estoque: novoEstoque })
          .eq("id", item.id);

        if (estoqueError) {
          console.error(estoqueError);
          alert(`Erro ao atualizar estoque do produto ${item.nome}`);
          return;
        }
      }

      alert("Venda finalizada com sucesso");
      setCliente(null);
      setItens([]);
      await carregarDados();
    } catch (error) {
      console.error(error);
      alert("Erro inesperado ao finalizar venda");
    } finally {
      setSalvando(false);
    }
  }

  if (carregando) {
    return <div className="p-6">Carregando vendas...</div>;
  }

  return (
    <div className="grid gap-6 bg-white p-6 xl:grid-cols-3">
      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-xl font-black text-slate-800">Clientes</h2>

        <div className="max-h-[500px] overflow-auto">
          {clientes.map((c) => (
            <button
              key={c.id}
              onClick={() => setCliente(c)}
              className={`mb-2 w-full rounded-xl p-3 text-left transition ${
                cliente?.id === c.id
                  ? "bg-[#2AB7B0] text-white"
                  : "bg-slate-50 hover:bg-slate-100"
              }`}
            >
              <div className="font-semibold">{c.nome}</div>
              <div className="text-sm opacity-80">{c.telefone}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-xl font-black text-slate-800">Produtos</h2>

        <div className="max-h-[500px] overflow-auto">
          {produtos.map((p) => (
            <button
              key={p.id}
              onClick={() => adicionarProduto(p)}
              className="mb-2 flex w-full items-center justify-between rounded-xl bg-slate-50 p-3 text-left hover:bg-slate-100"
            >
              <div>
                <div className="font-semibold text-slate-800">{p.nome}</div>
                <div className="text-sm text-slate-500">Estoque: {p.estoque}</div>
              </div>

              <div className="font-bold text-[#EE6D46]">{moeda(p.preco)}</div>
            </button>
          ))}
        </div>
      </div>

      <div className="rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-3 text-xl font-black text-slate-800">Resumo</h2>

        {cliente ? (
          <div className="mb-4 rounded-2xl bg-[#e9fbfa] p-3 text-[#0B7285]">
            Cliente selecionado: <strong>{cliente.nome}</strong>
          </div>
        ) : (
          <div className="mb-4 rounded-2xl bg-orange-50 p-3 text-[#EE6D46]">
            Nenhum cliente selecionado
          </div>
        )}

        <div className="space-y-3">
          {itens.length === 0 ? (
            <p className="text-slate-500">Nenhum item adicionado.</p>
          ) : (
            itens.map((i) => (
              <div key={i.id} className="rounded-2xl border p-3">
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-semibold">{i.nome}</p>
                  <button
                    onClick={() => removerItem(i.id)}
                    className="rounded-lg bg-red-50 px-3 py-1 text-sm font-semibold text-[#E52D22]"
                  >
                    Remover
                  </button>
                </div>

                <div className="flex items-center justify-between gap-3">
                  <input
                    type="number"
                    min="1"
                    value={i.quantidade}
                    onChange={(e) => alterarQtd(i.id, e.target.value)}
                    className="w-24 rounded-xl border p-2"
                  />

                  <div className="text-right">
                    <p className="text-sm text-slate-500">Subtotal</p>
                    <p className="font-bold text-slate-800">
                      {moeda(Number(i.preco) * i.quantidade)}
                    </p>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        <div className="mt-6 space-y-2 border-t pt-4">
          <p className="text-lg font-semibold text-slate-700">
            Total: <span className="text-[#EE6D46]">{moeda(total)}</span>
          </p>
          <p className="text-lg font-semibold text-slate-700">
            Lucro: <span className="text-[#2AB7B0]">{moeda(lucro)}</span>
          </p>
        </div>

        <button
          onClick={finalizarVenda}
          disabled={salvando}
          className="mt-4 w-full rounded-2xl bg-[#2AB7B0] py-3 font-bold text-white hover:bg-[#0B7285] disabled:opacity-60"
        >
          {salvando ? "Finalizando..." : "Finalizar venda"}
        </button>
      </div>
    </div>
  );
}