import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

const CLIENTE_PADRAO = {
  id: null,
  nome: "Consumidor",
};

export default function PedidosVenda() {
  const [modo, setModo] = useState("lista"); // lista | novo | editar
  const [pedidoEditandoId, setPedidoEditandoId] = useState(null);

  const [pedidos, setPedidos] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);

  const [buscaPedido, setBuscaPedido] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
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
        { data: vendasData, error: vendasError },
        { data: clientesData, error: clientesError },
        { data: produtosData, error: produtosError },
      ] = await Promise.all([
        supabase.from("vendas").select("*").order("id", { ascending: false }),
        supabase.from("clientes").select("*").order("nome", { ascending: true }),
        supabase.from("produtos").select("*").order("nome", { ascending: true }),
      ]);

      if (vendasError || clientesError || produtosError) {
        console.error(vendasError || clientesError || produtosError);
        alert("Erro ao carregar dados");
        return;
      }

      setPedidos(vendasData || []);
      setClientes(clientesData || []);
      setProdutos(produtosData || []);
    } catch (error) {
      console.error(error);
      alert("Erro inesperado ao carregar dados");
    } finally {
      setCarregandoLista(false);
    }
  }

  function abrirNovoPedido() {
    setModo("novo");
    setPedidoEditandoId(null);
    setClienteBusca("Consumidor");
    setClienteSelecionado(CLIENTE_PADRAO);
    setProdutoBusca("");
    setItens([]);
  }

  function cancelarPedido() {
    setModo("lista");
    setPedidoEditandoId(null);
    setClienteBusca("Consumidor");
    setClienteSelecionado(CLIENTE_PADRAO);
    setProdutoBusca("");
    setItens([]);
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
    if (Number.isNaN(d.getTime())) return "-";
    return d.toLocaleDateString("pt-BR");
  }

  function calcularPrecoLiquido(item) {
    const preco = Number(item.preco || 0);
    const desconto = Number(item.desconto || 0);
    return preco - preco * (desconto / 100);
  }

  function calcularTotalItem(item) {
    return calcularPrecoLiquido(item) * Number(item.quantidade || 0);
  }

  function imprimirCupom(vendaId, clienteNome, itensCupom, totalCupom) {
    const conteudo = `
      <html>
        <head>
          <title>Cupom do Pedido #${vendaId}</title>
          <style>
            body {
              font-family: Arial, sans-serif;
              padding: 20px;
              color: #000;
            }
            h1 {
              font-size: 20px;
              margin-bottom: 10px;
            }
            .info {
              margin-bottom: 15px;
              font-size: 14px;
            }
            table {
              width: 100%;
              border-collapse: collapse;
              margin-top: 15px;
            }
            th, td {
              border: 1px solid #ccc;
              padding: 8px;
              text-align: left;
              font-size: 12px;
            }
            .total {
              margin-top: 20px;
              font-size: 18px;
              font-weight: bold;
            }
            .rodape {
              margin-top: 20px;
              font-size: 12px;
              color: #444;
            }
          </style>
        </head>
        <body>
          <h1>Cupom do Pedido #${vendaId}</h1>
          <div class="info"><strong>Cliente:</strong> ${clienteNome || "Consumidor"}</div>

          <table>
            <thead>
              <tr>
                <th>Produto</th>
                <th>Qtd</th>
                <th>Preço Un.</th>
                <th>Total</th>
              </tr>
            </thead>
            <tbody>
              ${itensCupom
                .map(
                  (item) => `
                    <tr>
                      <td>${item.nome}</td>
                      <td>${item.quantidade}</td>
                      <td>${moeda(Number(item.preco || 0))}</td>
                      <td>${moeda(
                        Number(item.preco || 0) * Number(item.quantidade || 0)
                      )}</td>
                    </tr>
                  `
                )
                .join("")}
            </tbody>
          </table>

          <div class="total">Total do pedido: ${moeda(totalCupom)}</div>
          <div class="rodape">Impresso pelo sistema Smart Up</div>

          <script>
            window.onload = function() {
              window.print();
              window.close();
            };
          </script>
        </body>
      </html>
    `;

    const janela = window.open("", "_blank", "width=800,height=600");

    if (!janela) {
      alert("Não foi possível abrir a janela de impressão");
      return;
    }

    janela.document.open();
    janela.document.write(conteudo);
    janela.document.close();
  }

  async function imprimirCupomExistente(pedido) {
    try {
      const { data: itensVenda, error } = await supabase
        .from("itens_venda")
        .select("*")
        .eq("venda_id", pedido.id);

      if (error) {
        console.error(error);
        alert("Erro ao buscar itens do pedido");
        return;
      }

      const itensFormatados = (itensVenda || []).map((item) => ({
        nome: item.nome_produto,
        quantidade: Number(item.quantidade || 0),
        preco: Number(item.preco_unitario || 0),
      }));

      imprimirCupom(
        pedido.id,
        pedido.cliente_nome || "Consumidor",
        itensFormatados,
        Number(pedido.total || 0)
      );
    } catch (error) {
      console.error(error);
      alert("Erro ao imprimir pedido");
    }
  }

  const pedidosFiltrados = useMemo(() => {
    return pedidos.filter((p) => {
      const texto = buscaPedido.toLowerCase();

      const bateBusca =
        String(p.id || "").toLowerCase().includes(texto) ||
        String(p.cliente_nome || "").toLowerCase().includes(texto);

      const status = normalizarStatus(p.status);
      const bateStatus =
        filtroStatus === "todos" ? true : status === filtroStatus;

      return bateBusca && bateStatus;
    });
  }, [pedidos, buscaPedido, filtroStatus]);

  const clientesFiltrados = useMemo(() => {
    const termo = clienteBusca.trim().toLowerCase();
    const clienteAtual = String(clienteSelecionado?.nome || "")
      .trim()
      .toLowerCase();

    if (!termo || termo === "consumidor") return [];
    if (termo === clienteAtual) return [];

    return clientes
      .filter((c) => {
        return (
          String(c.nome || "").toLowerCase().includes(termo) ||
          String(c.telefone || "").toLowerCase().includes(termo) ||
          String(c.email || "").toLowerCase().includes(termo)
        );
      })
      .slice(0, 8);
  }, [clientes, clienteBusca, clienteSelecionado]);

  const produtosFiltrados = useMemo(() => {
    const termo = produtoBusca.trim().toLowerCase();

    if (!termo) return [];

    return produtos
      .filter((p) => {
        return (
          String(p.nome || "").toLowerCase().includes(termo) ||
          String(p.codigo || "").toLowerCase().includes(termo)
        );
      })
      .slice(0, 8);
  }, [produtos, produtoBusca]);

  const totalPedido = useMemo(() => {
    return itens.reduce((acc, item) => acc + calcularTotalItem(item), 0);
  }, [itens]);

  const lucroPedido = useMemo(() => {
    return itens.reduce((acc, item) => {
      const totalLiquido = calcularTotalItem(item);
      const custoTotal =
        Number(item.custo || 0) * Number(item.quantidade || 0);
      return acc + (totalLiquido - custoTotal);
    }, 0);
  }, [itens]);

  function selecionarCliente(cliente) {
    setClienteSelecionado(cliente);
    setClienteBusca(cliente.nome);
  }

  function usarConsumidor() {
    setClienteSelecionado(CLIENTE_PADRAO);
    setClienteBusca("Consumidor");
  }

  function adicionarProduto(produto) {
    const estoqueDisponivel = Number(produto.estoque || 0);
    const itemExistente = itens.find((i) => i.id === produto.id);

    if (!itemExistente && estoqueDisponivel <= 0) {
      alert("Produto sem estoque");
      return;
    }

    if (itemExistente) {
      if (itemExistente.quantidade >= estoqueDisponivel) {
        alert("Quantidade maior que o estoque disponível");
        return;
      }

      setItens((prev) =>
        prev.map((i) =>
          i.id === produto.id
            ? {
                ...i,
                quantidade: i.quantidade + 1,
                estoque: estoqueDisponivel,
              }
            : i
        )
      );
    } else {
      setItens((prev) => [
        ...prev,
        {
          id: produto.id,
          produto_id: produto.id,
          nome: produto.nome,
          codigo: produto.codigo || "",
          un: "UN",
          quantidade: 1,
          preco: Number(produto.preco || 0),
          custo: Number(produto.custo || 0),
          desconto: 0,
          estoque: estoqueDisponivel,
        },
      ]);
    }

    setProdutoBusca("");
  }

  function atualizarItem(id, campo, valor) {
    setItens((prev) =>
      prev.map((item) => {
        if (item.id !== id) return item;

        const atualizado = { ...item };

        if (campo === "quantidade") {
          const qtd = Number(valor || 0);

          if (qtd <= 0) {
            atualizado.quantidade = 1;
          } else if (qtd > Number(item.estoque || 0)) {
            alert("Quantidade maior que o estoque disponível");
          } else {
            atualizado.quantidade = qtd;
          }
        }

        if (campo === "preco") {
          atualizado.preco = Number(valor || 0);
        }

        if (campo === "desconto") {
          const desconto = Number(valor || 0);
          atualizado.desconto = desconto < 0 ? 0 : desconto;
        }

        return atualizado;
      })
    );
  }

  function removerItem(id) {
    setItens((prev) => prev.filter((item) => item.id !== id));
  }

  async function editarPedido(pedido) {
    try {
      const { data: itensVenda, error } = await supabase
        .from("itens_venda")
        .select("*")
        .eq("venda_id", pedido.id);

      if (error) {
        console.error(error);
        alert("Erro ao carregar itens do pedido");
        return;
      }

      const itensEditaveis = (itensVenda || []).map((item) => {
        const produtoOriginal = produtos.find((p) => p.id === item.produto_id);

        return {
          id: item.produto_id,
          produto_id: item.produto_id,
          nome: item.nome_produto,
          codigo: produtoOriginal?.codigo || "",
          un: "UN",
          quantidade: Number(item.quantidade || 0),
          preco: Number(item.preco_unitario || 0),
          custo: Number(item.custo_unitario || 0),
          desconto: 0,
          estoque:
            Number(produtoOriginal?.estoque || 0) + Number(item.quantidade || 0),
        };
      });

      setPedidoEditandoId(pedido.id);
      setModo("editar");
      setClienteSelecionado(
        pedido.cliente_id
          ? {
              id: pedido.cliente_id,
              nome: pedido.cliente_nome || "Consumidor",
            }
          : CLIENTE_PADRAO
      );
      setClienteBusca(pedido.cliente_nome || "Consumidor");
      setItens(itensEditaveis);
      setProdutoBusca("");
    } catch (error) {
      console.error(error);
      alert("Erro inesperado ao editar pedido");
    }
  }

  async function salvarPedido() {
    if (itens.length === 0) {
      alert("Adicione pelo menos um produto");
      return;
    }

    const clienteNomeParaCupom = clienteSelecionado?.nome || "Consumidor";
    const itensParaCupom = itens.map((item) => ({
      nome: item.nome,
      quantidade: Number(item.quantidade || 0),
      preco: Number(calcularPrecoLiquido(item)),
    }));
    const totalParaCupom = totalPedido;

    try {
      setSalvando(true);

      if (modo === "novo") {
        const payloadVenda = {
          cliente_id: clienteSelecionado?.id || null,
          cliente_nome: clienteSelecionado?.nome || "Consumidor",
          total: totalPedido,
          lucro: lucroPedido,
          status: "fechado",
        };

        const { data: vendaCriada, error: vendaError } = await supabase
          .from("vendas")
          .insert([payloadVenda])
          .select()
          .single();

        if (vendaError) {
          console.error(vendaError);
          alert("Erro ao salvar pedido");
          return;
        }

        const itensFormatados = itens.map((item) => {
          const precoLiquido = calcularPrecoLiquido(item);
          const subtotal = precoLiquido * Number(item.quantidade || 0);
          const lucroItem =
            subtotal - Number(item.custo || 0) * Number(item.quantidade || 0);

          return {
            venda_id: vendaCriada.id,
            produto_id: item.produto_id,
            nome_produto: item.nome,
            quantidade: Number(item.quantidade || 0),
            preco_unitario: precoLiquido,
            custo_unitario: Number(item.custo || 0),
            subtotal,
            lucro_item: lucroItem,
          };
        });

        const { error: itensError } = await supabase
          .from("itens_venda")
          .insert(itensFormatados);

        if (itensError) {
          console.error(itensError);
          alert("Erro ao salvar os itens");
          return;
        }

        for (const item of itens) {
          const produtoOriginal = produtos.find((p) => p.id === item.produto_id);
          const estoqueAtual = Number(produtoOriginal?.estoque || 0);
          const novoEstoque = estoqueAtual - Number(item.quantidade || 0);

          if (novoEstoque < 0) {
            alert(`Estoque insuficiente para ${item.nome}`);
            return;
          }

          const { error: estoqueError } = await supabase
            .from("produtos")
            .update({ estoque: novoEstoque })
            .eq("id", item.produto_id);

          if (estoqueError) {
            console.error(estoqueError);
            alert(`Erro ao atualizar estoque de ${item.nome}`);
            return;
          }
        }

        const desejaImprimir = window.confirm(
          "Pedido salvo com sucesso.\n\nDeseja imprimir o cupom do pedido?"
        );

        if (desejaImprimir) {
          imprimirCupom(
            vendaCriada.id,
            clienteNomeParaCupom,
            itensParaCupom,
            totalParaCupom
          );
        }
      }

      if (modo === "editar") {
        const { data: itensAntigos, error: itensAntigosError } = await supabase
          .from("itens_venda")
          .select("*")
          .eq("venda_id", pedidoEditandoId);

        if (itensAntigosError) {
          console.error(itensAntigosError);
          alert("Erro ao carregar itens antigos");
          return;
        }

        const qtdAntigaPorProduto = {};
        for (const item of itensAntigos || []) {
          const produtoId = Number(item.produto_id);
          qtdAntigaPorProduto[produtoId] =
            Number(qtdAntigaPorProduto[produtoId] || 0) +
            Number(item.quantidade || 0);
        }

        const qtdNovaPorProduto = {};
        for (const item of itens) {
          const produtoId = Number(item.produto_id);
          qtdNovaPorProduto[produtoId] =
            Number(qtdNovaPorProduto[produtoId] || 0) +
            Number(item.quantidade || 0);
        }

        const produtoIds = [
          ...new Set([
            ...Object.keys(qtdAntigaPorProduto),
            ...Object.keys(qtdNovaPorProduto),
          ]),
        ].map(Number);

        if (produtoIds.length > 0) {
          const { data: produtosBanco, error: produtosBancoError } = await supabase
            .from("produtos")
            .select("id, estoque, nome")
            .in("id", produtoIds);

          if (produtosBancoError) {
            console.error(produtosBancoError);
            alert("Erro ao buscar estoque atual dos produtos");
            return;
          }

          for (const produto of produtosBanco || []) {
            const antiga = Number(qtdAntigaPorProduto[produto.id] || 0);
            const nova = Number(qtdNovaPorProduto[produto.id] || 0);
            const estoqueAtual = Number(produto.estoque || 0);
            const estoqueFinal = estoqueAtual + antiga - nova;

            if (estoqueFinal < 0) {
              alert(`Estoque insuficiente para ${produto.nome}`);
              return;
            }
          }

          const payloadAtualizacao = {
            cliente_id: clienteSelecionado?.id || null,
            cliente_nome: clienteSelecionado?.nome || "Consumidor",
            total: totalPedido,
            lucro: lucroPedido,
            status: "fechado",
          };

          const { error: updateVendaError } = await supabase
            .from("vendas")
            .update(payloadAtualizacao)
            .eq("id", pedidoEditandoId);

          if (updateVendaError) {
            console.error(updateVendaError);
            alert("Erro ao atualizar pedido");
            return;
          }

          const { error: deleteItensError } = await supabase
            .from("itens_venda")
            .delete()
            .eq("venda_id", pedidoEditandoId);

          if (deleteItensError) {
            console.error(deleteItensError);
            alert("Erro ao substituir itens do pedido");
            return;
          }

          const novosItens = itens.map((item) => {
            const precoLiquido = calcularPrecoLiquido(item);
            const subtotal = precoLiquido * Number(item.quantidade || 0);
            const lucroItem =
              subtotal - Number(item.custo || 0) * Number(item.quantidade || 0);

            return {
              venda_id: pedidoEditandoId,
              produto_id: item.produto_id,
              nome_produto: item.nome,
              quantidade: Number(item.quantidade || 0),
              preco_unitario: precoLiquido,
              custo_unitario: Number(item.custo || 0),
              subtotal,
              lucro_item: lucroItem,
            };
          });

          if (novosItens.length > 0) {
            const { error: insertNovosItensError } = await supabase
              .from("itens_venda")
              .insert(novosItens);

            if (insertNovosItensError) {
              console.error(insertNovosItensError);
              alert("Erro ao salvar novos itens");
              return;
            }
          }

          for (const produto of produtosBanco || []) {
            const antiga = Number(qtdAntigaPorProduto[produto.id] || 0);
            const nova = Number(qtdNovaPorProduto[produto.id] || 0);
            const estoqueAtual = Number(produto.estoque || 0);
            const estoqueFinal = estoqueAtual + antiga - nova;

            const { error: estoqueError } = await supabase
              .from("produtos")
              .update({ estoque: estoqueFinal })
              .eq("id", produto.id);

            if (estoqueError) {
              console.error(estoqueError);
              alert(`Erro ao atualizar estoque de ${produto.nome}`);
              return;
            }
          }
        } else {
          const payloadAtualizacao = {
            cliente_id: clienteSelecionado?.id || null,
            cliente_nome: clienteSelecionado?.nome || "Consumidor",
            total: totalPedido,
            lucro: lucroPedido,
            status: "fechado",
          };

          const { error: updateVendaError } = await supabase
            .from("vendas")
            .update(payloadAtualizacao)
            .eq("id", pedidoEditandoId);

          if (updateVendaError) {
            console.error(updateVendaError);
            alert("Erro ao atualizar pedido");
            return;
          }

          const { error: deleteItensError } = await supabase
            .from("itens_venda")
            .delete()
            .eq("venda_id", pedidoEditandoId);

          if (deleteItensError) {
            console.error(deleteItensError);
            alert("Erro ao remover itens antigos");
            return;
          }
        }

        const desejaImprimir = window.confirm(
          "Pedido atualizado com sucesso.\n\nDeseja imprimir o cupom do pedido?"
        );

        if (desejaImprimir) {
          imprimirCupom(
            pedidoEditandoId,
            clienteNomeParaCupom,
            itensParaCupom,
            totalParaCupom
          );
        }
      }

      cancelarPedido();
      await carregarTudo();
    } catch (error) {
      console.error(error);
      alert("Erro inesperado ao salvar pedido");
    } finally {
      setSalvando(false);
    }
  }

  async function excluirPedidoConfirmado() {
    if (!pedidoExcluir) return;

    try {
      setExcluindo(true);

      const pedidoId = pedidoExcluir.id;

      const { data: itensVenda, error: itensError } = await supabase
        .from("itens_venda")
        .select("*")
        .eq("venda_id", pedidoId);

      if (itensError) {
        console.error(itensError);
        alert("Erro ao carregar itens do pedido");
        return;
      }

      const qtdPorProduto = {};
      for (const item of itensVenda || []) {
        const produtoId = Number(item.produto_id);

        if (!produtoId) continue;

        qtdPorProduto[produtoId] =
          Number(qtdPorProduto[produtoId] || 0) + Number(item.quantidade || 0);
      }

      const produtoIds = Object.keys(qtdPorProduto)
        .map(Number)
        .filter((id) => Number.isFinite(id) && id > 0);

      if (produtoIds.length > 0) {
        const { data: produtosBanco, error: produtosBancoError } = await supabase
          .from("produtos")
          .select("id, estoque, nome")
          .in("id", produtoIds);

        if (produtosBancoError) {
          console.error(produtosBancoError);
        } else {
          for (const produto of produtosBanco || []) {
            const qtd = Number(qtdPorProduto[produto.id] || 0);
            const estoqueAtual = Number(produto.estoque || 0);
            const estoqueFinal = estoqueAtual + qtd;

            const { error: estoqueError } = await supabase
              .from("produtos")
              .update({ estoque: estoqueFinal })
              .eq("id", produto.id);

            if (estoqueError) {
              console.error(estoqueError);
            }
          }
        }
      }

      const { error: deleteItensError } = await supabase
        .from("itens_venda")
        .delete()
        .eq("venda_id", pedidoId);

      if (deleteItensError) {
        console.error(deleteItensError);
        alert("Erro ao excluir itens do pedido");
        return;
      }

      const { error: deleteVendaError } = await supabase
        .from("vendas")
        .delete()
        .eq("id", pedidoId);

      if (deleteVendaError) {
        console.error(deleteVendaError);
        alert("Erro ao excluir pedido");
        return;
      }

      setPedidoExcluir(null);
      alert("Pedido excluído com sucesso");
      await carregarTudo();
    } catch (error) {
      console.error(error);
      alert("Erro inesperado ao excluir pedido");
    } finally {
      setExcluindo(false);
    }
  }

  return (
    <div className="bg-white p-6">
      {modo === "lista" ? (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                Pedidos de venda
              </h1>
              <p className="text-sm text-slate-500">
                Lista de pedidos cadastrados
              </p>
            </div>

            <button
              type="button"
              onClick={abrirNovoPedido}
              className="rounded-2xl bg-[#2AB7B0] px-5 py-3 font-semibold text-white hover:bg-[#0B7285]"
            >
              + Novo pedido
            </button>
          </div>

          <div className="flex flex-col gap-3 border-b border-slate-200 bg-slate-50 px-6 py-4 md:flex-row md:items-center md:justify-between">
            <input
              type="text"
              placeholder="Buscar pedido ou cliente"
              value={buscaPedido}
              onChange={(e) => setBuscaPedido(e.target.value)}
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
                  <th className="p-4">Ações</th>
                </tr>
              </thead>

              <tbody>
                {carregandoLista ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center">
                      Carregando pedidos...
                    </td>
                  </tr>
                ) : pedidosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="p-6 text-center">
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
                        <td className="p-4">
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              onClick={() => editarPedido(p)}
                              className="rounded-lg bg-blue-50 px-3 py-2 font-semibold text-blue-700 hover:bg-blue-100"
                            >
                              Editar
                            </button>

                            <button
                              type="button"
                              onClick={() => imprimirCupomExistente(p)}
                              className="flex items-center gap-2 rounded-lg bg-green-50 px-3 py-2 font-semibold text-green-700 hover:bg-green-100"
                              title="Imprimir cupom"
                            >
                              🖨️
                              <span>Imprimir</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setPedidoExcluir(p)}
                              className="rounded-lg bg-red-50 px-3 py-2 font-semibold text-red-700 hover:bg-red-100"
                            >
                              Excluir
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="rounded-3xl border border-slate-200 bg-white shadow-sm">
          <div className="flex flex-col gap-4 border-b border-slate-200 px-6 py-5 lg:flex-row lg:items-center lg:justify-between">
            <div>
              <h1 className="text-2xl font-bold text-slate-800">
                {modo === "editar"
                  ? "Editar pedido de venda"
                  : "Novo pedido de venda"}
              </h1>
              <p className="text-sm text-slate-500">
                Crie ou edite o pedido na mesma página, no estilo ERP
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={cancelarPedido}
                className="rounded-2xl border border-[#2AB7B0] px-6 py-3 font-semibold text-[#2AB7B0] hover:bg-[#f0fffd]"
              >
                Cancelar
              </button>

              <button
                type="button"
                onClick={salvarPedido}
                disabled={salvando}
                className="rounded-2xl bg-[#2AB7B0] px-6 py-3 font-semibold text-white hover:bg-[#0B7285] disabled:opacity-60"
              >
                {salvando
                  ? "Salvando..."
                  : modo === "editar"
                  ? "Atualizar pedido"
                  : "Salvar"}
              </button>
            </div>
          </div>

          <div className="p-6">
            <h2 className="mb-4 text-xl font-bold text-slate-800">
              Dados do cliente
            </h2>

            <div className="grid gap-4 lg:grid-cols-4">
              <div className="relative lg:col-span-2">
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Cliente
                </label>

                <div className="flex gap-2">
                  <input
                    type="text"
                    value={clienteBusca}
                    onChange={(e) => {
                      const valor = e.target.value;
                      setClienteBusca(valor);

                      if (valor.trim().toLowerCase() === "consumidor") {
                        setClienteSelecionado(CLIENTE_PADRAO);
                      } else if (
                        valor.trim().toLowerCase() !==
                        String(clienteSelecionado?.nome || "")
                          .trim()
                          .toLowerCase()
                      ) {
                        setClienteSelecionado(null);
                      }
                    }}
                    placeholder="Pesquisar cliente"
                    className="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2AB7B0]"
                  />

                  <button
                    type="button"
                    onClick={usarConsumidor}
                    className="rounded-xl border border-slate-300 px-4 font-semibold text-slate-700 hover:bg-slate-50"
                  >
                    Consumidor
                  </button>
                </div>

                {clientesFiltrados.length > 0 && (
                  <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-lg">
                    {clientesFiltrados.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() => selecionarCliente(cliente)}
                        className="block w-full border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
                      >
                        <div className="font-semibold text-slate-800">
                          {cliente.nome}
                        </div>
                        <div className="text-xs text-slate-500">
                          {cliente.telefone || "-"}{" "}
                          {cliente.email ? `• ${cliente.email}` : ""}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Cliente selecionado
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-slate-800">
                  {clienteSelecionado?.nome || "Consumidor"}
                </div>
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-slate-700">
                  Total do pedido
                </label>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 font-bold text-[#EE6D46]">
                  {moeda(totalPedido)}
                </div>
              </div>
            </div>

            <div className="mt-8">
              <h2 className="mb-4 text-xl font-bold text-slate-800">
                Itens do pedido
              </h2>

              <div className="relative mb-4">
                <input
                  type="text"
                  value={produtoBusca}
                  onChange={(e) => setProdutoBusca(e.target.value)}
                  placeholder="Pesquise por código ou descrição do produto"
                  className="w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-[#2AB7B0]"
                />

                {produtosFiltrados.length > 0 && (
                  <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white shadow-lg">
                    {produtosFiltrados.map((produto) => (
                      <button
                        key={produto.id}
                        type="button"
                        onClick={() => adicionarProduto(produto)}
                        className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
                      >
                        <div>
                          <div className="font-semibold text-slate-800">
                            {produto.nome}
                          </div>
                          <div className="text-xs text-slate-500">
                            Código: {produto.codigo || "-"} • Estoque:{" "}
                            {produto.estoque}
                          </div>
                        </div>

                        <div className="font-bold text-[#EE6D46]">
                          {moeda(produto.preco)}
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[1100px] text-sm">
                  <thead className="bg-slate-50 text-left">
                    <tr>
                      <th className="p-3">Descrição</th>
                      <th className="p-3">Código</th>
                      <th className="p-3">Un</th>
                      <th className="p-3">Quantidade</th>
                      <th className="p-3">Preço lista</th>
                      <th className="p-3">Desc (%)</th>
                      <th className="p-3">Preço un</th>
                      <th className="p-3">Preço total</th>
                      <th className="p-3">Ação</th>
                    </tr>
                  </thead>

                  <tbody>
                    {itens.length === 0 ? (
                      <tr>
                        <td colSpan={9} className="p-6 text-center text-slate-500">
                          Nenhum item adicionado
                        </td>
                      </tr>
                    ) : (
                      itens.map((item) => (
                        <tr key={item.id} className="border-t">
                          <td className="p-3 font-medium text-slate-800">
                            {item.nome}
                          </td>
                          <td className="p-3">{item.codigo || "-"}</td>
                          <td className="p-3">{item.un}</td>
                          <td className="p-3">
                            <input
                              type="number"
                              min="1"
                              value={item.quantidade}
                              onChange={(e) =>
                                atualizarItem(
                                  item.id,
                                  "quantidade",
                                  e.target.value
                                )
                              }
                              className="w-24 rounded-lg border border-slate-300 px-2 py-1"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              step="0.01"
                              value={item.preco}
                              onChange={(e) =>
                                atualizarItem(item.id, "preco", e.target.value)
                              }
                              className="w-28 rounded-lg border border-slate-300 px-2 py-1"
                            />
                          </td>
                          <td className="p-3">
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.01"
                              value={item.desconto}
                              onChange={(e) =>
                                atualizarItem(
                                  item.id,
                                  "desconto",
                                  e.target.value
                                )
                              }
                              className="w-24 rounded-lg border border-slate-300 px-2 py-1"
                            />
                          </td>
                          <td className="p-3 font-semibold text-[#0B7285]">
                            {moeda(calcularPrecoLiquido(item))}
                          </td>
                          <td className="p-3 font-bold text-[#EE6D46]">
                            {moeda(calcularTotalItem(item))}
                          </td>
                          <td className="p-3">
                            <button
                              type="button"
                              onClick={() => removerItem(item.id)}
                              className="rounded-lg bg-red-50 px-3 py-2 font-semibold text-[#E52D22] hover:bg-red-100"
                            >
                              Excluir
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Quantidade de itens</p>
                  <h3 className="mt-1 text-2xl font-black text-slate-800">
                    {itens.length}
                  </h3>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Total</p>
                  <h3 className="mt-1 text-2xl font-black text-[#EE6D46]">
                    {moeda(totalPedido)}
                  </h3>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-sm text-slate-500">Lucro estimado</p>
                  <h3 className="mt-1 text-2xl font-black text-[#2AB7B0]">
                    {moeda(lucroPedido)}
                  </h3>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {pedidoExcluir && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <h3 className="text-xl font-bold text-slate-800">
              Confirmar exclusão
            </h3>
            <p className="mt-2 text-slate-600">
              Deseja realmente excluir o pedido{" "}
              <strong>#{pedidoExcluir.id}</strong>?
            </p>

            <div className="mt-6 flex justify-end gap-3">
              <button
                type="button"
                onClick={() => setPedidoExcluir(null)}
                disabled={excluindo}
                className="rounded-2xl border border-slate-300 px-5 py-3 font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-60"
              >
                Não
              </button>

              <button
                type="button"
                onClick={excluirPedidoConfirmado}
                disabled={excluindo}
                className="rounded-2xl bg-red-600 px-5 py-3 font-semibold text-white hover:bg-red-700 disabled:opacity-60"
              >
                {excluindo ? "Excluindo..." : "Sim"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}