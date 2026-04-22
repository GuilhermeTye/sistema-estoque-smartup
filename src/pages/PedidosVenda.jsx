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
  const [clienteSelecionado, setClienteSelecionado] = useState(CLIENTE_PADRAO);
  const [clienteBusca, setClienteBusca] = useState("Consumidor");

  const [itens, setItens] = useState([]);
  const [salvando, setSalvando] = useState(false);

  const [pedidoExcluir, setPedidoExcluir] = useState(null);

  useEffect(() => {
    carregarTudo();
  }, []);

  async function carregarTudo() {
    const { data: vendas } = await supabase.from("vendas").select("*");
    const { data: clientes } = await supabase.from("clientes").select("*");
    const { data: produtos } = await supabase.from("produtos").select("*");

    setPedidos(vendas || []);
    setClientes(clientes || []);
    setProdutos(produtos || []);
  }

  function moeda(v) {
    return Number(v || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });
  }

  function calcularPrecoLiquido(item) {
    return item.preco - item.preco * (item.desconto / 100);
  }

  function calcularTotalItem(item) {
    return calcularPrecoLiquido(item) * item.quantidade;
  }

  const totalPedido = useMemo(() => {
    return itens.reduce((acc, i) => acc + calcularTotalItem(i), 0);
  }, [itens]);

  // ==============================
  // 🖨️ IMPRESSÃO
  // ==============================

  function imprimirCupom(vendaId, clienteNome, itensCupom, totalCupom) {
    const conteudo = `
      <html>
        <body style="font-family: Arial; padding:20px">
          <h2>Pedido #${vendaId}</h2>
          <p>Cliente: ${clienteNome}</p>
          <hr/>
          ${itensCupom
            .map(
              (i) => `
            <div>
              ${i.nome} - ${i.quantidade} x ${moeda(i.preco)}
            </div>`
            )
            .join("")}
          <hr/>
          <h3>Total: ${moeda(totalCupom)}</h3>

          <script>
            window.onload = () => {
              window.print();
              window.close();
            }
          </script>
        </body>
      </html>
    `;

    const win = window.open("", "_blank");
    win.document.write(conteudo);
    win.document.close();
  }

  async function imprimirCupomExistente(pedido) {
    const { data: itensVenda } = await supabase
      .from("itens_venda")
      .select("*")
      .eq("venda_id", pedido.id);

    const itensFormatados = (itensVenda || []).map((i) => ({
      nome: i.nome_produto,
      quantidade: i.quantidade,
      preco: i.preco_unitario,
    }));

    imprimirCupom(
      pedido.id,
      pedido.cliente_nome || "Consumidor",
      itensFormatados,
      pedido.total
    );
  }

  // ==============================
  // 💾 SALVAR
  // ==============================

  async function salvarPedido() {
    if (itens.length === 0) {
      alert("Adicione itens");
      return;
    }

    setSalvando(true);

    const { data: venda } = await supabase
      .from("vendas")
      .insert([
        {
          cliente_nome: clienteSelecionado.nome,
          total: totalPedido,
        },
      ])
      .select()
      .single();

    const itensFormatados = itens.map((i) => ({
      venda_id: venda.id,
      produto_id: i.id,
      nome_produto: i.nome,
      quantidade: i.quantidade,
      preco_unitario: i.preco,
    }));

    await supabase.from("itens_venda").insert(itensFormatados);

    const deseja = window.confirm("Deseja imprimir o cupom?");

    if (deseja) {
      imprimirCupom(
        venda.id,
        clienteSelecionado.nome,
        itens,
        totalPedido
      );
    }

    setItens([]);
    setModo("lista");
    carregarTudo();
    setSalvando(false);
  }

  // ==============================
  // 🗑️ DELETE
  // ==============================

  async function excluirPedidoConfirmado() {
    const pedidoId = pedidoExcluir.id;

    const { data: itensVenda } = await supabase
      .from("itens_venda")
      .select("*")
      .eq("venda_id", pedidoId);

    const qtdPorProduto = {};

    for (const i of itensVenda || []) {
      qtdPorProduto[i.produto_id] =
        (qtdPorProduto[i.produto_id] || 0) + i.quantidade;
    }

    const ids = Object.keys(qtdPorProduto);

    if (ids.length > 0) {
      const { data: produtosBanco } = await supabase
        .from("produtos")
        .select("id, estoque")
        .in("id", ids);

      for (const p of produtosBanco || []) {
        await supabase
          .from("produtos")
          .update({
            estoque: p.estoque + qtdPorProduto[p.id],
          })
          .eq("id", p.id);
      }
    }

    await supabase.from("itens_venda").delete().eq("venda_id", pedidoId);
    await supabase.from("vendas").delete().eq("id", pedidoId);

    setPedidoExcluir(null);
    carregarTudo();
  }

  // ==============================
  // UI
  // ==============================

  return (
    <div className="p-6">
      {modo === "lista" && (
        <>
          <button onClick={() => setModo("novo")}>
            + Novo Pedido
          </button>

          <table className="w-full mt-4">
            <thead>
              <tr>
                <th>ID</th>
                <th>Cliente</th>
                <th>Total</th>
                <th>Ações</th>
              </tr>
            </thead>

            <tbody>
              {pedidos.map((p) => (
                <tr key={p.id}>
                  <td>{p.id}</td>
                  <td>{p.cliente_nome}</td>
                  <td>{moeda(p.total)}</td>
                  <td className="flex gap-2">

                    <button onClick={() => alert("Editar ainda")}>
                      Editar
                    </button>

                    {/* 🖨️ BOTÃO NOVO */}
                    <button onClick={() => imprimirCupomExistente(p)}>
                      🖨️
                    </button>

                    <button onClick={() => setPedidoExcluir(p)}>
                      Excluir
                    </button>

                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </>
      )}

      {modo === "novo" && (
        <>
          <h2>Novo Pedido</h2>

          <button onClick={salvarPedido}>
            {salvando ? "Salvando..." : "Salvar"}
          </button>
        </>
      )}

      {pedidoExcluir && (
        <div>
          <p>Excluir pedido?</p>
          <button onClick={excluirPedidoConfirmado}>Sim</button>
          <button onClick={() => setPedidoExcluir(null)}>Não</button>
        </div>
      )}
    </div>
  );
}