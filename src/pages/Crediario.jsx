import { useCallback, useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

/*
|--------------------------------------------------------------------------
| CONFIGURAÇÕES
|--------------------------------------------------------------------------
|
| Campos esperados:
|
| clientes:
| id, empresa_id, nome, cpf, telefone, endereco, cidade, estado
|
| produtos:
| id, empresa_id, nome, codigo, preco, estoque
|
| crediarios:
| id, empresa_id, cliente_id, numero_crediario, valor_total,
| valor_entrada, valor_financiado, quantidade_parcelas,
| data_primeiro_vencimento, status, observacao, criado_por,
| criado_em, atualizado_em
|
| crediario_parcelas:
| id, empresa_id, crediario_id, cliente_id, numero_parcela,
| valor_parcela, valor_pago, valor_desconto, valor_juros,
| valor_multa, data_vencimento, data_pagamento,
| forma_pagamento, status, observacao
|
| crediario_pagamentos:
| id, empresa_id, crediario_id, parcela_id, cliente_id,
| valor, forma_pagamento, observacao, recebido_por,
| recebido_em, estornado
|
*/

const FORMAS_PAGAMENTO = [
  "Dinheiro",
  "PIX",
  "Cartão de débito",
  "Cartão de crédito",
  "Transferência",
  "Outro",
];

const STATUS_CREDIARIO = {
  ABERTO: "Aberto",
  PARCIALMENTE_PAGO: "Parcialmente pago",
  QUITADO: "Quitado",
  ATRASADO: "Atrasado",
  CANCELADO: "Cancelado",
  RENEGOCIADO: "Renegociado",
};

const STATUS_PARCELA = {
  PENDENTE: "Pendente",
  PARCIAL: "Pagamento parcial",
  PAGA: "Paga",
  ATRASADA: "Atrasada",
  CANCELADA: "Cancelada",
  RENEGOCIADA: "Renegociada",
};

function moeda(valor) {
  return Number(valor || 0).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function dataBrasil(data) {
  if (!data) return "-";

  const somenteData = String(data).slice(0, 10);
  const [ano, mes, dia] = somenteData.split("-");

  if (!ano || !mes || !dia) return "-";

  return `${dia}/${mes}/${ano}`;
}

function dataHoraBrasil(data) {
  if (!data) return "-";

  return new Date(data).toLocaleString("pt-BR");
}

function hojeISO() {
  const agora = new Date();
  const ano = agora.getFullYear();
  const mes = String(agora.getMonth() + 1).padStart(2, "0");
  const dia = String(agora.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function adicionarMeses(dataISO, quantidadeMeses) {
  if (!dataISO) return "";

  const [ano, mes, dia] = dataISO.split("-").map(Number);

  const data = new Date(ano, mes - 1, dia);
  const diaOriginal = data.getDate();

  data.setDate(1);
  data.setMonth(data.getMonth() + quantidadeMeses);

  const ultimoDiaMes = new Date(
    data.getFullYear(),
    data.getMonth() + 1,
    0,
  ).getDate();

  data.setDate(Math.min(diaOriginal, ultimoDiaMes));

  const anoResultado = data.getFullYear();
  const mesResultado = String(data.getMonth() + 1).padStart(2, "0");
  const diaResultado = String(data.getDate()).padStart(2, "0");

  return `${anoResultado}-${mesResultado}-${diaResultado}`;
}

function somenteNumeros(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function normalizarValor(valor) {
  if (valor === null || valor === undefined || valor === "") return 0;

  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }

  const texto = String(valor).trim();

  if (!texto) return 0;

  if (texto.includes(",")) {
    return Number(
      texto
        .replace(/\./g, "")
        .replace(",", ".")
        .replace(/[^\d.-]/g, ""),
    ) || 0;
  }

  return Number(texto.replace(/[^\d.-]/g, "")) || 0;
}

function obterEmpresaId() {
  const empresaSalva = localStorage.getItem("smartup_empresa");

  if (!empresaSalva) return null;

  try {
    const empresa = JSON.parse(empresaSalva);

    if (typeof empresa === "string") {
      return empresa;
    }

    return empresa?.id || empresa?.empresa_id || null;
  } catch {
    return empresaSalva;
  }
}

function calcularSaldoParcela(parcela) {
  const valorParcela = Number(parcela?.valor_parcela || 0);
  const juros = Number(parcela?.valor_juros || 0);
  const multa = Number(parcela?.valor_multa || 0);
  const desconto = Number(parcela?.valor_desconto || 0);
  const pago = Number(parcela?.valor_pago || 0);

  return Math.max(
    0,
    valorParcela + juros + multa - desconto - pago,
  );
}

function classeStatus(status) {
  const classes = {
    ABERTO: "bg-blue-100 text-blue-700",
    PARCIALMENTE_PAGO: "bg-amber-100 text-amber-700",
    QUITADO: "bg-emerald-100 text-emerald-700",
    ATRASADO: "bg-red-100 text-red-700",
    CANCELADO: "bg-slate-200 text-slate-600",
    RENEGOCIADO: "bg-purple-100 text-purple-700",

    PENDENTE: "bg-blue-100 text-blue-700",
    PARCIAL: "bg-amber-100 text-amber-700",
    PAGA: "bg-emerald-100 text-emerald-700",
    ATRASADA: "bg-red-100 text-red-700",
    CANCELADA: "bg-slate-200 text-slate-600",
  };

  return classes[status] || "bg-slate-100 text-slate-600";
}

function StatCard({ titulo, valor, descricao }) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-sm font-semibold text-slate-500">{titulo}</p>

      <p className="mt-2 text-2xl font-black text-slate-900">
        {valor}
      </p>

      <p className="mt-1 text-xs text-slate-400">{descricao}</p>
    </div>
  );
}

function Modal({ aberto, titulo, fechar, children, largura = "max-w-5xl" }) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4">
      <div
        className={`max-h-[94vh] w-full ${largura} overflow-hidden rounded-3xl bg-white shadow-2xl`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
          <h2 className="text-xl font-black text-slate-900">
            {titulo}
          </h2>

          <button
            type="button"
            onClick={fechar}
            className="rounded-xl bg-slate-100 px-4 py-2 text-sm font-bold text-slate-600 transition hover:bg-slate-200"
          >
            Fechar
          </button>
        </div>

        <div className="max-h-[calc(94vh-74px)] overflow-y-auto p-6">
          {children}
        </div>
      </div>
    </div>
  );
}

export default function Crediario() {
  const empresaId = useMemo(() => obterEmpresaId(), []);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [recebendo, setRecebendo] = useState(false);

  const [crediarios, setCrediarios] = useState([]);
  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);

  const [pesquisa, setPesquisa] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");

  const [modalNovaVenda, setModalNovaVenda] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [modalRecebimento, setModalRecebimento] = useState(false);

  const [crediarioSelecionado, setCrediarioSelecionado] = useState(null);
  const [parcelasSelecionadas, setParcelasSelecionadas] = useState([]);
  const [parcelaRecebimento, setParcelaRecebimento] = useState(null);

  const [pesquisaCliente, setPesquisaCliente] = useState("");
  const [pesquisaProduto, setPesquisaProduto] = useState("");

  const [clienteSelecionado, setClienteSelecionado] = useState(null);
  const [itens, setItens] = useState([]);

  const [parcelamento, setParcelamento] = useState({
    valorEntrada: "",
    quantidadeParcelas: 1,
    primeiroVencimento: hojeISO(),
    observacao: "",
  });

  const [recebimento, setRecebimento] = useState({
    valor: "",
    formaPagamento: "Dinheiro",
    desconto: "",
    juros: "",
    multa: "",
    observacao: "",
  });

  const totalVenda = useMemo(() => {
    return itens.reduce((total, item) => {
      return total + Number(item.preco || 0) * Number(item.quantidade || 0);
    }, 0);
  }, [itens]);

  const valorEntrada = useMemo(() => {
    return Math.max(0, normalizarValor(parcelamento.valorEntrada));
  }, [parcelamento.valorEntrada]);

  const valorFinanciado = useMemo(() => {
    return Math.max(0, totalVenda - valorEntrada);
  }, [totalVenda, valorEntrada]);

  const parcelasPrevias = useMemo(() => {
    const quantidade = Math.max(
      1,
      Number(parcelamento.quantidadeParcelas || 1),
    );

    const totalCentavos = Math.round(valorFinanciado * 100);
    const valorBaseCentavos = Math.floor(totalCentavos / quantidade);
    const diferencaCentavos =
      totalCentavos - valorBaseCentavos * quantidade;

    return Array.from({ length: quantidade }, (_, indice) => {
      const adicional = indice < diferencaCentavos ? 1 : 0;
      const valor = (valorBaseCentavos + adicional) / 100;

      return {
        numero_parcela: indice + 1,
        valor_parcela: valor,
        data_vencimento: adicionarMeses(
          parcelamento.primeiroVencimento,
          indice,
        ),
      };
    });
  }, [
    valorFinanciado,
    parcelamento.quantidadeParcelas,
    parcelamento.primeiroVencimento,
  ]);

  const clientesFiltrados = useMemo(() => {
    const termo = pesquisaCliente.trim().toLowerCase();

    if (!termo) return clientes.slice(0, 20);

    return clientes
      .filter((cliente) => {
        const nome = String(cliente.nome || "").toLowerCase();
        const cpf = somenteNumeros(cliente.cpf);
        const telefone = somenteNumeros(cliente.telefone);

        return (
          nome.includes(termo) ||
          cpf.includes(somenteNumeros(termo)) ||
          telefone.includes(somenteNumeros(termo))
        );
      })
      .slice(0, 30);
  }, [clientes, pesquisaCliente]);

  const produtosFiltrados = useMemo(() => {
    const termo = pesquisaProduto.trim().toLowerCase();

    return produtos
      .filter((produto) => Number(produto.estoque || 0) > 0)
      .filter((produto) => {
        if (!termo) return true;

        return (
          String(produto.nome || "")
            .toLowerCase()
            .includes(termo) ||
          String(produto.codigo || "")
            .toLowerCase()
            .includes(termo)
        );
      })
      .slice(0, 30);
  }, [produtos, pesquisaProduto]);

  const crediariosFiltrados = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();
    const numerosPesquisa = somenteNumeros(termo);

    return crediarios.filter((crediario) => {
      const cliente = crediario.cliente || {};
      const correspondeStatus =
        filtroStatus === "TODOS" ||
        crediario.status === filtroStatus;

      const correspondePesquisa =
        !termo ||
        String(cliente.nome || "")
          .toLowerCase()
          .includes(termo) ||
        somenteNumeros(cliente.cpf).includes(numerosPesquisa) ||
        String(crediario.numero_crediario || "").includes(termo);

      return correspondeStatus && correspondePesquisa;
    });
  }, [crediarios, pesquisa, filtroStatus]);

  const indicadores = useMemo(() => {
    let totalReceber = 0;
    let totalVencido = 0;
    let totalRecebido = 0;
    const clientesAtrasados = new Set();

    crediarios.forEach((crediario) => {
      const parcelas = crediario.parcelas || [];

      parcelas.forEach((parcela) => {
        const saldo = calcularSaldoParcela(parcela);

        if (!["PAGA", "CANCELADA"].includes(parcela.status)) {
          totalReceber += saldo;
        }

        if (parcela.status === "ATRASADA") {
          totalVencido += saldo;
          clientesAtrasados.add(crediario.cliente_id);
        }

        totalRecebido += Number(parcela.valor_pago || 0);
      });
    });

    return {
      totalReceber,
      totalVencido,
      totalRecebido,
      inadimplentes: clientesAtrasados.size,
    };
  }, [crediarios]);

  const carregarClientes = useCallback(async () => {
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("clientes")
      .select(
        "id, empresa_id, nome, cpf, telefone, endereco, cidade, estado",
      )
      .eq("empresa_id", empresaId)
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar clientes:", error);
      throw new Error("Não foi possível carregar os clientes.");
    }

    setClientes(data || []);
  }, [empresaId]);

  const carregarProdutos = useCallback(async () => {
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("produtos")
      .select("id, empresa_id, nome, codigo, preco, estoque")
      .eq("empresa_id", empresaId)
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar produtos:", error);
      throw new Error("Não foi possível carregar os produtos.");
    }

    setProdutos(data || []);
  }, [empresaId]);

  const carregarCrediarios = useCallback(async () => {
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("crediarios")
      .select(`
        *,
        cliente:clientes (
          id,
          nome,
          cpf,
          telefone,
          endereco,
          cidade,
          estado
        ),
        parcelas:crediario_parcelas (
          id,
          crediario_id,
          cliente_id,
          numero_parcela,
          valor_parcela,
          valor_pago,
          valor_desconto,
          valor_juros,
          valor_multa,
          data_vencimento,
          data_pagamento,
          forma_pagamento,
          status,
          observacao
        )
      `)
      .eq("empresa_id", empresaId)
      .order("criado_em", { ascending: false });

    if (error) {
      console.error("Erro ao carregar crediários:", error);
      throw new Error("Não foi possível carregar os crediários.");
    }

    const registros = (data || []).map((crediario) => ({
      ...crediario,
      parcelas: [...(crediario.parcelas || [])].sort(
        (a, b) => a.numero_parcela - b.numero_parcela,
      ),
    }));

    setCrediarios(registros);
  }, [empresaId]);

  const atualizarParcelasAtrasadas = useCallback(async () => {
    if (!empresaId) return;

    const hoje = hojeISO();

    const { error } = await supabase
      .from("crediario_parcelas")
      .update({
        status: "ATRASADA",
      })
      .eq("empresa_id", empresaId)
      .lt("data_vencimento", hoje)
      .in("status", ["PENDENTE", "PARCIAL"]);

    if (error) {
      console.warn("Não foi possível atualizar parcelas atrasadas:", error);
    }

    const { data: crediariosAbertos, error: erroCrediarios } =
      await supabase
        .from("crediarios")
        .select("id")
        .eq("empresa_id", empresaId)
        .in("status", ["ABERTO", "PARCIALMENTE_PAGO"]);

    if (erroCrediarios) {
      console.warn(
        "Não foi possível consultar crediários abertos:",
        erroCrediarios,
      );
      return;
    }

    const ids = (crediariosAbertos || []).map((item) => item.id);

    if (ids.length === 0) return;

    const { data: parcelasAtrasadas } = await supabase
      .from("crediario_parcelas")
      .select("crediario_id")
      .eq("empresa_id", empresaId)
      .in("crediario_id", ids)
      .eq("status", "ATRASADA");

    const idsAtrasados = [
      ...new Set(
        (parcelasAtrasadas || []).map((item) => item.crediario_id),
      ),
    ];

    if (idsAtrasados.length > 0) {
      await supabase
        .from("crediarios")
        .update({ status: "ATRASADO" })
        .eq("empresa_id", empresaId)
        .in("id", idsAtrasados);
    }
  }, [empresaId]);

  const carregarTudo = useCallback(async () => {
    if (!empresaId) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);

      await atualizarParcelasAtrasadas();

      await Promise.all([
        carregarClientes(),
        carregarProdutos(),
        carregarCrediarios(),
      ]);
    } catch (error) {
      console.error(error);
      alert(error.message || "Erro ao carregar o módulo de crediário.");
    } finally {
      setLoading(false);
    }
  }, [
    empresaId,
    atualizarParcelasAtrasadas,
    carregarClientes,
    carregarProdutos,
    carregarCrediarios,
  ]);

  useEffect(() => {
    carregarTudo();
  }, [carregarTudo]);

  function limparNovaVenda() {
    setClienteSelecionado(null);
    setItens([]);
    setPesquisaCliente("");
    setPesquisaProduto("");

    setParcelamento({
      valorEntrada: "",
      quantidadeParcelas: 1,
      primeiroVencimento: hojeISO(),
      observacao: "",
    });
  }

  function abrirNovaVenda() {
    limparNovaVenda();
    setModalNovaVenda(true);
  }

  function fecharNovaVenda() {
    if (salvando) return;
    setModalNovaVenda(false);
    limparNovaVenda();
  }

  function adicionarProduto(produto) {
    const itemExistente = itens.find(
      (item) => item.produto_id === produto.id,
    );

    if (itemExistente) {
      alterarQuantidade(
        produto.id,
        Number(itemExistente.quantidade) + 1,
      );

      return;
    }

    setItens((anteriores) => [
      ...anteriores,
      {
        produto_id: produto.id,
        nome: produto.nome,
        codigo: produto.codigo,
        preco: Number(produto.preco || 0),
        estoque: Number(produto.estoque || 0),
        quantidade: 1,
      },
    ]);
  }

  function alterarQuantidade(produtoId, novaQuantidade) {
    const quantidade = Math.max(1, Number(novaQuantidade || 1));

    setItens((anteriores) =>
      anteriores.map((item) => {
        if (item.produto_id !== produtoId) return item;

        if (quantidade > Number(item.estoque || 0)) {
          alert(
            `O estoque disponível de ${item.nome} é ${item.estoque}.`,
          );

          return item;
        }

        return {
          ...item,
          quantidade,
        };
      }),
    );
  }

  function alterarPreco(produtoId, novoPreco) {
    const preco = Math.max(0, normalizarValor(novoPreco));

    setItens((anteriores) =>
      anteriores.map((item) =>
        item.produto_id === produtoId
          ? {
              ...item,
              preco,
            }
          : item,
      ),
    );
  }

  function removerProduto(produtoId) {
    setItens((anteriores) =>
      anteriores.filter((item) => item.produto_id !== produtoId),
    );
  }

  async function validarEstoques() {
    for (const item of itens) {
      const { data, error } = await supabase
        .from("produtos")
        .select("id, nome, estoque")
        .eq("empresa_id", empresaId)
        .eq("id", item.produto_id)
        .single();

      if (error || !data) {
        throw new Error(
          `Não foi possível verificar o estoque de ${item.nome}.`,
        );
      }

      if (Number(data.estoque || 0) < Number(item.quantidade || 0)) {
        throw new Error(
          `Estoque insuficiente para ${data.nome}. Disponível: ${data.estoque}.`,
        );
      }
    }
  }

  async function baixarEstoques() {
    for (const item of itens) {
      const { data: produtoAtual, error: erroConsulta } = await supabase
        .from("produtos")
        .select("estoque")
        .eq("empresa_id", empresaId)
        .eq("id", item.produto_id)
        .single();

      if (erroConsulta) {
        throw new Error(
          `Erro ao consultar o estoque de ${item.nome}.`,
        );
      }

      const estoqueAtual = Number(produtoAtual.estoque || 0);
      const novoEstoque = estoqueAtual - Number(item.quantidade || 0);

      if (novoEstoque < 0) {
        throw new Error(`Estoque insuficiente para ${item.nome}.`);
      }

      const { error: erroAtualizacao } = await supabase
        .from("produtos")
        .update({ estoque: novoEstoque })
        .eq("empresa_id", empresaId)
        .eq("id", item.produto_id);

      if (erroAtualizacao) {
        throw new Error(
          `Não foi possível baixar o estoque de ${item.nome}.`,
        );
      }
    }
  }

  async function devolverEstoques() {
    for (const item of itens) {
      try {
        const { data } = await supabase
          .from("produtos")
          .select("estoque")
          .eq("empresa_id", empresaId)
          .eq("id", item.produto_id)
          .single();

        if (!data) continue;

        await supabase
          .from("produtos")
          .update({
            estoque:
              Number(data.estoque || 0) +
              Number(item.quantidade || 0),
          })
          .eq("empresa_id", empresaId)
          .eq("id", item.produto_id);
      } catch (error) {
        console.error("Erro ao devolver estoque:", error);
      }
    }
  }

  async function finalizarVendaCrediario() {
    if (!empresaId) {
      alert("Empresa não identificada. Faça login novamente.");
      return;
    }

    if (!clienteSelecionado?.id) {
      alert("Selecione um cliente.");
      return;
    }

    if (itens.length === 0) {
      alert("Adicione pelo menos um produto.");
      return;
    }

    if (totalVenda <= 0) {
      alert("O valor da venda precisa ser maior que zero.");
      return;
    }

    if (valorEntrada > totalVenda) {
      alert("O valor da entrada não pode ser maior que a venda.");
      return;
    }

    if (valorFinanciado <= 0) {
      alert(
        "O valor financiado precisa ser maior que zero. Para pagamento integral, utilize o módulo de vendas.",
      );
      return;
    }

    const quantidadeParcelas = Number(
      parcelamento.quantidadeParcelas || 0,
    );

    if (quantidadeParcelas < 1 || quantidadeParcelas > 120) {
      alert("Informe uma quantidade de parcelas entre 1 e 120.");
      return;
    }

    if (!parcelamento.primeiroVencimento) {
      alert("Informe a data do primeiro vencimento.");
      return;
    }

    let crediarioCriado = null;
    let estoqueBaixado = false;

    try {
      setSalvando(true);

      const {
        data: { user },
        error: erroUsuario,
      } = await supabase.auth.getUser();

      if (erroUsuario) {
        throw new Error("Não foi possível identificar o usuário.");
      }

      await validarEstoques();

      const payloadCrediario = {
        empresa_id: empresaId,
        cliente_id: clienteSelecionado.id,
        valor_total: Number(totalVenda.toFixed(2)),
        valor_entrada: Number(valorEntrada.toFixed(2)),
        valor_financiado: Number(valorFinanciado.toFixed(2)),
        quantidade_parcelas: quantidadeParcelas,
        data_primeiro_vencimento:
          parcelamento.primeiroVencimento,
        status: "ABERTO",
        observacao: JSON.stringify({
          observacao: parcelamento.observacao || "",
          itens: itens.map((item) => ({
            produto_id: item.produto_id,
            nome: item.nome,
            codigo: item.codigo,
            quantidade: Number(item.quantidade),
            preco_unitario: Number(item.preco),
            subtotal:
              Number(item.quantidade) * Number(item.preco),
          })),
        }),
        criado_por: user?.id || null,
      };

      const { data: novoCrediario, error: erroCrediario } =
        await supabase
          .from("crediarios")
          .insert(payloadCrediario)
          .select()
          .single();

      if (erroCrediario) {
        console.error(erroCrediario);
        throw new Error(
          `Erro ao criar o crediário: ${erroCrediario.message}`,
        );
      }

      crediarioCriado = novoCrediario;

      const payloadParcelas = parcelasPrevias.map((parcela) => ({
        empresa_id: empresaId,
        crediario_id: novoCrediario.id,
        cliente_id: clienteSelecionado.id,
        numero_parcela: parcela.numero_parcela,
        valor_parcela: Number(parcela.valor_parcela.toFixed(2)),
        valor_pago: 0,
        valor_desconto: 0,
        valor_juros: 0,
        valor_multa: 0,
        data_vencimento: parcela.data_vencimento,
        status: "PENDENTE",
      }));

      const { error: erroParcelas } = await supabase
        .from("crediario_parcelas")
        .insert(payloadParcelas);

      if (erroParcelas) {
        throw new Error(
          `Erro ao gerar as parcelas: ${erroParcelas.message}`,
        );
      }

      await baixarEstoques();
      estoqueBaixado = true;

      alert("Venda no crediário cadastrada com sucesso.");

      setModalNovaVenda(false);
      limparNovaVenda();

      await Promise.all([
        carregarCrediarios(),
        carregarProdutos(),
      ]);
    } catch (error) {
      console.error("Erro ao finalizar venda:", error);

      if (estoqueBaixado) {
        await devolverEstoques();
      }

      if (crediarioCriado?.id) {
        await supabase
          .from("crediarios")
          .delete()
          .eq("empresa_id", empresaId)
          .eq("id", crediarioCriado.id);
      }

      alert(error.message || "Não foi possível concluir a venda.");
    } finally {
      setSalvando(false);
    }
  }

  async function abrirDetalhes(crediario) {
    try {
      setCrediarioSelecionado(crediario);

      const { data, error } = await supabase
        .from("crediario_parcelas")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("crediario_id", crediario.id)
        .order("numero_parcela", { ascending: true });

      if (error) {
        throw new Error("Não foi possível carregar as parcelas.");
      }

      setParcelasSelecionadas(data || []);
      setModalDetalhes(true);
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  function abrirRecebimento(parcela) {
    const saldo = calcularSaldoParcela(parcela);

    setParcelaRecebimento(parcela);

    setRecebimento({
      valor: saldo.toFixed(2),
      formaPagamento: "Dinheiro",
      desconto: String(parcela.valor_desconto || ""),
      juros: String(parcela.valor_juros || ""),
      multa: String(parcela.valor_multa || ""),
      observacao: "",
    });

    setModalRecebimento(true);
  }

  async function atualizarStatusCrediario(crediarioId) {
    const { data: parcelas, error } = await supabase
      .from("crediario_parcelas")
      .select("status, valor_parcela, valor_pago")
      .eq("empresa_id", empresaId)
      .eq("crediario_id", crediarioId);

    if (error) {
      console.error("Erro ao consultar parcelas:", error);
      return;
    }

    const todasPagas =
      parcelas.length > 0 &&
      parcelas.every((parcela) => parcela.status === "PAGA");

    const algumaAtrasada = parcelas.some(
      (parcela) => parcela.status === "ATRASADA",
    );

    const algumPagamento = parcelas.some(
      (parcela) => Number(parcela.valor_pago || 0) > 0,
    );

    let novoStatus = "ABERTO";

    if (todasPagas) {
      novoStatus = "QUITADO";
    } else if (algumaAtrasada) {
      novoStatus = "ATRASADO";
    } else if (algumPagamento) {
      novoStatus = "PARCIALMENTE_PAGO";
    }

    await supabase
      .from("crediarios")
      .update({ status: novoStatus })
      .eq("empresa_id", empresaId)
      .eq("id", crediarioId);
  }

  async function confirmarRecebimento() {
    if (!parcelaRecebimento || !crediarioSelecionado) return;

    const valorPagamento = normalizarValor(recebimento.valor);
    const desconto = normalizarValor(recebimento.desconto);
    const juros = normalizarValor(recebimento.juros);
    const multa = normalizarValor(recebimento.multa);

    const valorParcela = Number(
      parcelaRecebimento.valor_parcela || 0,
    );

    const valorJaPago = Number(parcelaRecebimento.valor_pago || 0);

    const totalAtualizado =
      valorParcela + juros + multa - desconto;

    const saldoAtualizado = Math.max(
      0,
      totalAtualizado - valorJaPago,
    );

    if (valorPagamento <= 0) {
      alert("Informe um valor de pagamento maior que zero.");
      return;
    }

    if (valorPagamento > saldoAtualizado + 0.01) {
      alert(
        `O pagamento não pode ser maior que o saldo de ${moeda(
          saldoAtualizado,
        )}.`,
      );
      return;
    }

    try {
      setRecebendo(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      const novoValorPago = Number(
        (valorJaPago + valorPagamento).toFixed(2),
      );

      const quitada = novoValorPago >= totalAtualizado - 0.01;

      const novoStatus = quitada ? "PAGA" : "PARCIAL";

      const { error: erroPagamento } = await supabase
        .from("crediario_pagamentos")
        .insert({
          empresa_id: empresaId,
          crediario_id: crediarioSelecionado.id,
          parcela_id: parcelaRecebimento.id,
          cliente_id: crediarioSelecionado.cliente_id,
          valor: Number(valorPagamento.toFixed(2)),
          forma_pagamento: recebimento.formaPagamento,
          observacao: recebimento.observacao || null,
          recebido_por: user?.id || null,
          recebido_em: new Date().toISOString(),
          estornado: false,
        });

      if (erroPagamento) {
        throw new Error(
          `Erro ao registrar pagamento: ${erroPagamento.message}`,
        );
      }

      const { error: erroParcela } = await supabase
        .from("crediario_parcelas")
        .update({
          valor_pago: novoValorPago,
          valor_desconto: Number(desconto.toFixed(2)),
          valor_juros: Number(juros.toFixed(2)),
          valor_multa: Number(multa.toFixed(2)),
          data_pagamento: quitada
            ? new Date().toISOString()
            : null,
          forma_pagamento: recebimento.formaPagamento,
          status: novoStatus,
          observacao: recebimento.observacao || null,
        })
        .eq("empresa_id", empresaId)
        .eq("id", parcelaRecebimento.id);

      if (erroParcela) {
        throw new Error(
          `Erro ao atualizar parcela: ${erroParcela.message}`,
        );
      }

      await atualizarStatusCrediario(crediarioSelecionado.id);

      const { data: parcelasAtualizadas } = await supabase
        .from("crediario_parcelas")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("crediario_id", crediarioSelecionado.id)
        .order("numero_parcela", { ascending: true });

      setParcelasSelecionadas(parcelasAtualizadas || []);
      setModalRecebimento(false);
      setParcelaRecebimento(null);

      await carregarCrediarios();

      alert("Pagamento registrado com sucesso.");
    } catch (error) {
      console.error(error);
      alert(error.message || "Não foi possível registrar o pagamento.");
    } finally {
      setRecebendo(false);
    }
  }

  function obterItensCrediario(crediario) {
    if (!crediario?.observacao) return [];

    try {
      const dados = JSON.parse(crediario.observacao);
      return Array.isArray(dados?.itens) ? dados.itens : [];
    } catch {
      return [];
    }
  }

  function obterObservacaoCrediario(crediario) {
    if (!crediario?.observacao) return "";

    try {
      const dados = JSON.parse(crediario.observacao);
      return dados?.observacao || "";
    } catch {
      return crediario.observacao;
    }
  }

  function imprimirPromissoria(crediario, parcela) {
    const cliente = crediario.cliente || {};
    const numeroCrediario =
      crediario.numero_crediario ||
      String(crediario.id).slice(0, 8).toUpperCase();

    const valorTotalParcela =
      Number(parcela.valor_parcela || 0) +
      Number(parcela.valor_juros || 0) +
      Number(parcela.valor_multa || 0) -
      Number(parcela.valor_desconto || 0);

    const endereco = [
      cliente.endereco,
      cliente.cidade,
      cliente.estado,
    ]
      .filter(Boolean)
      .join(" - ");

    const janela = window.open("", "_blank", "width=900,height=700");

    if (!janela) {
      alert(
        "O navegador bloqueou a janela de impressão. Autorize os pop-ups.",
      );
      return;
    }

    janela.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />

          <title>Promissória ${numeroCrediario} - Parcela ${
            parcela.numero_parcela
          }</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 30px;
              font-family: Arial, Helvetica, sans-serif;
              color: #0f172a;
              background: #ffffff;
            }

            .promissoria {
              width: 100%;
              max-width: 850px;
              margin: 0 auto;
              border: 2px solid #0C7886;
              border-radius: 16px;
              overflow: hidden;
            }

            .cabecalho {
              display: flex;
              justify-content: space-between;
              align-items: center;
              padding: 22px 26px;
              background: #0C7886;
              color: white;
            }

            .cabecalho h1 {
              margin: 0;
              font-size: 26px;
            }

            .numero {
              font-size: 14px;
              text-align: right;
            }

            .conteudo {
              padding: 30px;
            }

            .valor {
              display: inline-block;
              margin-bottom: 25px;
              padding: 12px 20px;
              border: 2px solid #EE6D46;
              border-radius: 12px;
              font-size: 24px;
              font-weight: bold;
              color: #EE6D46;
            }

            p {
              font-size: 16px;
              line-height: 1.7;
            }

            .dados {
              margin-top: 25px;
              padding: 20px;
              border-radius: 12px;
              background: #f8fafc;
            }

            .dados div {
              margin-bottom: 9px;
              font-size: 15px;
            }

            .assinatura {
              margin-top: 80px;
              text-align: center;
            }

            .linha {
              width: 440px;
              max-width: 90%;
              margin: 0 auto 8px;
              border-top: 1px solid #0f172a;
            }

            .rodape {
              margin-top: 35px;
              text-align: center;
              font-size: 12px;
              color: #64748b;
            }

            @media print {
              body {
                padding: 0;
              }

              .promissoria {
                border-radius: 0;
              }
            }
          </style>
        </head>

        <body>
          <div class="promissoria">
            <div class="cabecalho">
              <h1>NOTA PROMISSÓRIA</h1>

              <div class="numero">
                <strong>Crediário nº ${numeroCrediario}</strong><br />
                Parcela ${parcela.numero_parcela} de ${
                  crediario.quantidade_parcelas
                }
              </div>
            </div>

            <div class="conteudo">
              <div class="valor">
                ${moeda(valorTotalParcela)}
              </div>

              <p>
                No vencimento desta nota promissória, em
                <strong>${dataBrasil(parcela.data_vencimento)}</strong>,
                pagarei por esta única via a quantia de
                <strong>${moeda(valorTotalParcela)}</strong>,
                referente à parcela nº
                <strong>${parcela.numero_parcela}</strong>
                do crediário nº
                <strong>${numeroCrediario}</strong>.
              </p>

              <div class="dados">
                <div>
                  <strong>Cliente:</strong>
                  ${cliente.nome || "-"}
                </div>

                <div>
                  <strong>CPF:</strong>
                  ${cliente.cpf || "-"}
                </div>

                <div>
                  <strong>Telefone:</strong>
                  ${cliente.telefone || "-"}
                </div>

                <div>
                  <strong>Endereço:</strong>
                  ${endereco || "-"}
                </div>

                <div>
                  <strong>Data da venda:</strong>
                  ${dataBrasil(crediario.criado_em)}
                </div>

                <div>
                  <strong>Vencimento:</strong>
                  ${dataBrasil(parcela.data_vencimento)}
                </div>
              </div>

              <div class="assinatura">
                <div class="linha"></div>

                <strong>${cliente.nome || "Assinatura do cliente"}</strong>

                <div>CPF: ${cliente.cpf || "-"}</div>
              </div>

              <div class="rodape">
                Documento gerado pelo sistema Smart UP.
              </div>
            </div>
          </div>

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    janela.document.close();
  }

  function imprimirTodasPromissorias() {
    if (!crediarioSelecionado || parcelasSelecionadas.length === 0) {
      alert("Não existem parcelas para impressão.");
      return;
    }

    const cliente = crediarioSelecionado.cliente || {};
    const numeroCrediario =
      crediarioSelecionado.numero_crediario ||
      String(crediarioSelecionado.id).slice(0, 8).toUpperCase();

    const janela = window.open("", "_blank", "width=1000,height=800");

    if (!janela) {
      alert("Autorize os pop-ups do navegador para imprimir.");
      return;
    }

    const promissoriasHTML = parcelasSelecionadas
      .map((parcela) => {
        const valor =
          Number(parcela.valor_parcela || 0) +
          Number(parcela.valor_juros || 0) +
          Number(parcela.valor_multa || 0) -
          Number(parcela.valor_desconto || 0);

        return `
          <section class="promissoria">
            <div class="topo">
              <div>
                <h2>NOTA PROMISSÓRIA</h2>
                <p>Crediário nº ${numeroCrediario}</p>
              </div>

              <div class="valor">${moeda(valor)}</div>
            </div>

            <p>
              Vencimento:
              <strong>${dataBrasil(parcela.data_vencimento)}</strong>
            </p>

            <p>
              Parcela:
              <strong>${parcela.numero_parcela} de ${
                crediarioSelecionado.quantidade_parcelas
              }</strong>
            </p>

            <p>
              Cliente:
              <strong>${cliente.nome || "-"}</strong>
            </p>

            <p>
              CPF:
              <strong>${cliente.cpf || "-"}</strong>
            </p>

            <p class="texto">
              Pagarei por esta única via a quantia indicada nesta nota
              promissória, referente à compra realizada no crediário.
            </p>

            <div class="assinatura">
              <div class="linha"></div>
              ${cliente.nome || "Assinatura do cliente"}
            </div>
          </section>
        `;
      })
      .join("");

    janela.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />

          <title>Promissórias ${numeroCrediario}</title>

          <style>
            * {
              box-sizing: border-box;
            }

            body {
              margin: 0;
              padding: 20px;
              font-family: Arial, sans-serif;
              color: #0f172a;
            }

            .promissoria {
              min-height: 360px;
              margin-bottom: 22px;
              padding: 26px;
              border: 2px solid #0C7886;
              border-radius: 14px;
              page-break-inside: avoid;
            }

            .topo {
              display: flex;
              align-items: center;
              justify-content: space-between;
              border-bottom: 1px solid #cbd5e1;
              padding-bottom: 16px;
            }

            h2 {
              margin: 0;
              color: #0C7886;
            }

            .topo p {
              margin: 5px 0 0;
            }

            .valor {
              font-size: 24px;
              font-weight: bold;
              color: #EE6D46;
            }

            .texto {
              margin-top: 30px;
              line-height: 1.7;
            }

            .assinatura {
              margin-top: 65px;
              text-align: center;
            }

            .linha {
              width: 400px;
              max-width: 90%;
              margin: 0 auto 8px;
              border-top: 1px solid #0f172a;
            }

            @media print {
              body {
                padding: 0;
              }

              .promissoria {
                border-radius: 0;
              }
            }
          </style>
        </head>

        <body>
          ${promissoriasHTML}

          <script>
            window.onload = function () {
              window.print();
            };
          </script>
        </body>
      </html>
    `);

    janela.document.close();
  }

  if (!empresaId) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-2xl font-black text-red-700">
            Empresa não identificada
          </h1>

          <p className="mt-3 text-red-600">
            Não foi possível encontrar a empresa ativa no
            localStorage pela chave smartup_empresa.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 px-4 py-6 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
        <header className="mb-7 flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-[#0C7886] to-[#27B9B3] p-6 text-white shadow-lg sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold text-white/80">
              Smart UP
            </p>

            <h1 className="mt-1 text-3xl font-black">Crediário</h1>

            <p className="mt-2 text-sm text-white/80">
              Vendas parceladas, promissórias e recebimentos.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirNovaVenda}
            className="rounded-2xl bg-[#EE6D46] px-6 py-3 font-black text-white shadow-md transition hover:scale-[1.02] hover:bg-orange-600"
          >
            + Nova venda no crediário
          </button>
        </header>

        <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard
            titulo="Total a receber"
            valor={moeda(indicadores.totalReceber)}
            descricao="Saldo das parcelas pendentes"
          />

          <StatCard
            titulo="Total vencido"
            valor={moeda(indicadores.totalVencido)}
            descricao="Parcelas que passaram do vencimento"
          />

          <StatCard
            titulo="Total recebido"
            valor={moeda(indicadores.totalRecebido)}
            descricao="Valor registrado em parcelas"
          />

          <StatCard
            titulo="Clientes inadimplentes"
            valor={indicadores.inadimplentes}
            descricao="Clientes com parcelas atrasadas"
          />
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_240px_auto]">
            <input
              type="text"
              value={pesquisa}
              onChange={(event) => setPesquisa(event.target.value)}
              placeholder="Pesquisar por cliente, CPF ou número..."
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none transition focus:border-[#27B9B3] focus:ring-4 focus:ring-[#27B9B3]/10"
            />

            <select
              value={filtroStatus}
              onChange={(event) =>
                setFiltroStatus(event.target.value)
              }
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#27B9B3]"
            >
              <option value="TODOS">Todos os status</option>
              <option value="ABERTO">Aberto</option>
              <option value="PARCIALMENTE_PAGO">
                Parcialmente pago
              </option>
              <option value="ATRASADO">Atrasado</option>
              <option value="QUITADO">Quitado</option>
              <option value="CANCELADO">Cancelado</option>
            </select>

            <button
              type="button"
              onClick={carregarTudo}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white transition hover:bg-slate-700"
            >
              Atualizar
            </button>
          </div>
        </section>

        <section className="mt-6 overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
          {loading ? (
            <div className="p-12 text-center text-slate-500">
              Carregando crediários...
            </div>
          ) : crediariosFiltrados.length === 0 ? (
            <div className="p-12 text-center">
              <p className="text-lg font-bold text-slate-600">
                Nenhum crediário encontrado
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Cadastre uma nova venda no crediário.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Número
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Cliente
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Venda
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Entrada
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Parcelas
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase tracking-wide text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-black uppercase tracking-wide text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {crediariosFiltrados.map((crediario) => (
                    <tr
                      key={crediario.id}
                      className="transition hover:bg-slate-50"
                    >
                      <td className="px-5 py-4 text-sm font-black text-slate-700">
                        #
                        {crediario.numero_crediario ||
                          String(crediario.id)
                            .slice(0, 8)
                            .toUpperCase()}
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-bold text-slate-800">
                          {crediario.cliente?.nome || "-"}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          CPF: {crediario.cliente?.cpf || "-"}
                        </p>
                      </td>

                      <td className="px-5 py-4">
                        <p className="text-sm font-black text-slate-800">
                          {moeda(crediario.valor_total)}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          {dataBrasil(crediario.criado_em)}
                        </p>
                      </td>

                      <td className="px-5 py-4 text-sm font-semibold text-slate-700">
                        {moeda(crediario.valor_entrada)}
                      </td>

                      <td className="px-5 py-4 text-sm text-slate-600">
                        {crediario.quantidade_parcelas}x
                      </td>

                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${classeStatus(
                            crediario.status,
                          )}`}
                        >
                          {STATUS_CREDIARIO[crediario.status] ||
                            crediario.status}
                        </span>
                      </td>

                      <td className="px-5 py-4 text-right">
                        <button
                          type="button"
                          onClick={() => abrirDetalhes(crediario)}
                          className="rounded-xl bg-[#0C7886] px-4 py-2 text-xs font-bold text-white transition hover:bg-[#095f6a]"
                        >
                          Ver parcelas
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>

      <Modal
        aberto={modalNovaVenda}
        titulo="Nova venda no crediário"
        fechar={fecharNovaVenda}
        largura="max-w-7xl"
      >
        <div className="grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 p-5">
              <h3 className="text-lg font-black text-slate-900">
                1. Selecione o cliente
              </h3>

              {!clienteSelecionado ? (
                <>
                  <input
                    type="text"
                    value={pesquisaCliente}
                    onChange={(event) =>
                      setPesquisaCliente(event.target.value)
                    }
                    placeholder="Pesquisar cliente por nome, CPF ou telefone..."
                    className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-[#27B9B3]"
                  />

                  <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl border border-slate-200">
                    {clientesFiltrados.map((cliente) => (
                      <button
                        key={cliente.id}
                        type="button"
                        onClick={() =>
                          setClienteSelecionado(cliente)
                        }
                        className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left transition last:border-b-0 hover:bg-slate-50"
                      >
                        <div>
                          <p className="font-bold text-slate-800">
                            {cliente.nome}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            CPF: {cliente.cpf || "-"} · Telefone:{" "}
                            {cliente.telefone || "-"}
                          </p>
                        </div>

                        <span className="text-sm font-bold text-[#0C7886]">
                          Selecionar
                        </span>
                      </button>
                    ))}

                    {clientesFiltrados.length === 0 && (
                      <p className="p-5 text-center text-sm text-slate-400">
                        Nenhum cliente encontrado.
                      </p>
                    )}
                  </div>
                </>
              ) : (
                <div className="mt-4 rounded-2xl bg-emerald-50 p-4">
                  <div className="flex items-center justify-between gap-4">
                    <div>
                      <p className="font-black text-emerald-800">
                        {clienteSelecionado.nome}
                      </p>

                      <p className="mt-1 text-sm text-emerald-700">
                        CPF: {clienteSelecionado.cpf || "-"}
                      </p>

                      <p className="mt-1 text-sm text-emerald-700">
                        Telefone:{" "}
                        {clienteSelecionado.telefone || "-"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setClienteSelecionado(null)}
                      className="rounded-xl bg-white px-4 py-2 text-sm font-bold text-red-600"
                    >
                      Trocar
                    </button>
                  </div>
                </div>
              )}
            </section>

            <section className="rounded-3xl border border-slate-200 p-5">
              <h3 className="text-lg font-black text-slate-900">
                2. Adicione os produtos
              </h3>

              <input
                type="text"
                value={pesquisaProduto}
                onChange={(event) =>
                  setPesquisaProduto(event.target.value)
                }
                placeholder="Pesquisar produto por nome ou código..."
                className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-[#27B9B3]"
              />

              <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl border border-slate-200">
                {produtosFiltrados.map((produto) => (
                  <div
                    key={produto.id}
                    className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 last:border-b-0"
                  >
                    <div>
                      <p className="font-bold text-slate-800">
                        {produto.nome}
                      </p>

                      <p className="mt-1 text-xs text-slate-400">
                        Código: {produto.codigo || "-"} · Estoque:{" "}
                        {produto.estoque}
                      </p>

                      <p className="mt-1 text-sm font-black text-[#0C7886]">
                        {moeda(produto.preco)}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => adicionarProduto(produto)}
                      className="rounded-xl bg-[#27B9B3] px-4 py-2 text-sm font-bold text-white"
                    >
                      Adicionar
                    </button>
                  </div>
                ))}
              </div>

              {itens.length > 0 && (
                <div className="mt-5 overflow-x-auto rounded-2xl border border-slate-200">
                  <table className="min-w-full">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-black text-slate-500">
                          Produto
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-black text-slate-500">
                          Quantidade
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-black text-slate-500">
                          Valor
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-black text-slate-500">
                          Subtotal
                        </th>

                        <th className="px-4 py-3"></th>
                      </tr>
                    </thead>

                    <tbody className="divide-y divide-slate-100">
                      {itens.map((item) => (
                        <tr key={item.produto_id}>
                          <td className="px-4 py-3">
                            <p className="text-sm font-bold text-slate-800">
                              {item.nome}
                            </p>

                            <p className="text-xs text-slate-400">
                              Estoque: {item.estoque}
                            </p>
                          </td>

                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              max={item.estoque}
                              value={item.quantidade}
                              onChange={(event) =>
                                alterarQuantidade(
                                  item.produto_id,
                                  event.target.value,
                                )
                              }
                              className="w-24 rounded-xl border border-slate-300 px-3 py-2"
                            />
                          </td>

                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={item.preco}
                              onChange={(event) =>
                                alterarPreco(
                                  item.produto_id,
                                  event.target.value,
                                )
                              }
                              className="w-32 rounded-xl border border-slate-300 px-3 py-2"
                            />
                          </td>

                          <td className="px-4 py-3 text-sm font-black text-slate-800">
                            {moeda(
                              Number(item.preco) *
                                Number(item.quantidade),
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                removerProduto(item.produto_id)
                              }
                              className="rounded-xl bg-red-50 px-3 py-2 text-xs font-bold text-red-600"
                            >
                              Remover
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </section>
          </div>

          <div className="space-y-6">
            <section className="rounded-3xl border border-slate-200 p-5">
              <h3 className="text-lg font-black text-slate-900">
                3. Parcelamento
              </h3>

              <div className="mt-4 grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-bold text-slate-600">
                    Valor da entrada
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={parcelamento.valorEntrada}
                    onChange={(event) =>
                      setParcelamento((anterior) => ({
                        ...anterior,
                        valorEntrada: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-[#27B9B3]"
                  />
                </label>

                <label className="block">
                  <span className="text-sm font-bold text-slate-600">
                    Quantidade de parcelas
                  </span>

                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={parcelamento.quantidadeParcelas}
                    onChange={(event) =>
                      setParcelamento((anterior) => ({
                        ...anterior,
                        quantidadeParcelas: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-[#27B9B3]"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-slate-600">
                    Primeiro vencimento
                  </span>

                  <input
                    type="date"
                    value={parcelamento.primeiroVencimento}
                    onChange={(event) =>
                      setParcelamento((anterior) => ({
                        ...anterior,
                        primeiroVencimento: event.target.value,
                      }))
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-[#27B9B3]"
                  />
                </label>

                <label className="block sm:col-span-2">
                  <span className="text-sm font-bold text-slate-600">
                    Observação
                  </span>

                  <textarea
                    rows="3"
                    value={parcelamento.observacao}
                    onChange={(event) =>
                      setParcelamento((anterior) => ({
                        ...anterior,
                        observacao: event.target.value,
                      }))
                    }
                    className="mt-2 w-full resize-none rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-[#27B9B3]"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl bg-slate-900 p-5 text-white">
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">
                    Total da venda
                  </span>

                  <strong>{moeda(totalVenda)}</strong>
                </div>

                <div className="flex justify-between text-sm">
                  <span className="text-slate-400">Entrada</span>

                  <strong>{moeda(valorEntrada)}</strong>
                </div>

                <div className="border-t border-slate-700 pt-3">
                  <div className="flex justify-between">
                    <span className="font-bold">
                      Valor financiado
                    </span>

                    <strong className="text-xl text-[#27B9B3]">
                      {moeda(valorFinanciado)}
                    </strong>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 p-5">
              <h3 className="font-black text-slate-900">
                Prévia das parcelas
              </h3>

              <div className="mt-4 max-h-72 overflow-y-auto">
                {parcelasPrevias.map((parcela) => (
                  <div
                    key={parcela.numero_parcela}
                    className="mb-2 flex items-center justify-between rounded-2xl bg-slate-50 p-3"
                  >
                    <div>
                      <p className="text-sm font-black text-slate-700">
                        Parcela {parcela.numero_parcela}
                      </p>

                      <p className="text-xs text-slate-400">
                        {dataBrasil(parcela.data_vencimento)}
                      </p>
                    </div>

                    <strong className="text-[#0C7886]">
                      {moeda(parcela.valor_parcela)}
                    </strong>
                  </div>
                ))}
              </div>
            </section>

            <button
              type="button"
              onClick={finalizarVendaCrediario}
              disabled={salvando}
              className="w-full rounded-2xl bg-[#EE6D46] px-6 py-4 font-black text-white shadow-md transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {salvando
                ? "Finalizando venda..."
                : "Finalizar venda no crediário"}
            </button>
          </div>
        </div>
      </Modal>

      <Modal
        aberto={modalDetalhes}
        titulo="Detalhes do crediário"
        fechar={() => {
          setModalDetalhes(false);
          setCrediarioSelecionado(null);
          setParcelasSelecionadas([]);
        }}
        largura="max-w-6xl"
      >
        {crediarioSelecionado && (
          <div>
            <div className="grid gap-4 md:grid-cols-4">
              <StatCard
                titulo="Cliente"
                valor={crediarioSelecionado.cliente?.nome || "-"}
                descricao={
                  crediarioSelecionado.cliente?.cpf
                    ? `CPF: ${crediarioSelecionado.cliente.cpf}`
                    : "CPF não informado"
                }
              />

              <StatCard
                titulo="Valor da venda"
                valor={moeda(crediarioSelecionado.valor_total)}
                descricao={`Entrada: ${moeda(
                  crediarioSelecionado.valor_entrada,
                )}`}
              />

              <StatCard
                titulo="Valor financiado"
                valor={moeda(
                  crediarioSelecionado.valor_financiado,
                )}
                descricao={`${crediarioSelecionado.quantidade_parcelas} parcelas`}
              />

              <StatCard
                titulo="Status"
                valor={
                  STATUS_CREDIARIO[
                    crediarioSelecionado.status
                  ] || crediarioSelecionado.status
                }
                descricao={`Criado em ${dataBrasil(
                  crediarioSelecionado.criado_em,
                )}`}
              />
            </div>

            {obterItensCrediario(crediarioSelecionado).length > 0 && (
              <section className="mt-6 rounded-3xl border border-slate-200 p-5">
                <h3 className="font-black text-slate-900">
                  Produtos da venda
                </h3>

                <div className="mt-4 overflow-x-auto">
                  <table className="min-w-full">
                    <thead className="bg-slate-100">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-black text-slate-500">
                          Produto
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-black text-slate-500">
                          Quantidade
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-black text-slate-500">
                          Unitário
                        </th>

                        <th className="px-4 py-3 text-left text-xs font-black text-slate-500">
                          Subtotal
                        </th>
                      </tr>
                    </thead>

                    <tbody>
                      {obterItensCrediario(
                        crediarioSelecionado,
                      ).map((item, indice) => (
                        <tr
                          key={`${item.produto_id}-${indice}`}
                          className="border-b border-slate-100"
                        >
                          <td className="px-4 py-3 text-sm font-bold text-slate-800">
                            {item.nome}
                          </td>

                          <td className="px-4 py-3 text-sm text-slate-600">
                            {item.quantidade}
                          </td>

                          <td className="px-4 py-3 text-sm text-slate-600">
                            {moeda(item.preco_unitario)}
                          </td>

                          <td className="px-4 py-3 text-sm font-black text-slate-800">
                            {moeda(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {obterObservacaoCrediario(
                  crediarioSelecionado,
                ) && (
                  <div className="mt-4 rounded-2xl bg-slate-50 p-4">
                    <p className="text-xs font-black uppercase text-slate-400">
                      Observação
                    </p>

                    <p className="mt-2 text-sm text-slate-600">
                      {obterObservacaoCrediario(
                        crediarioSelecionado,
                      )}
                    </p>
                  </div>
                )}
              </section>
            )}

            <section className="mt-6 rounded-3xl border border-slate-200 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <h3 className="text-lg font-black text-slate-900">
                  Parcelas
                </h3>

                <button
                  type="button"
                  onClick={imprimirTodasPromissorias}
                  className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
                >
                  Imprimir todas as promissórias
                </button>
              </div>

              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-black text-slate-500">
                        Parcela
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-black text-slate-500">
                        Vencimento
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-black text-slate-500">
                        Valor
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-black text-slate-500">
                        Pago
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-black text-slate-500">
                        Saldo
                      </th>

                      <th className="px-4 py-3 text-left text-xs font-black text-slate-500">
                        Status
                      </th>

                      <th className="px-4 py-3 text-right text-xs font-black text-slate-500">
                        Ações
                      </th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-100">
                    {parcelasSelecionadas.map((parcela) => (
                      <tr key={parcela.id}>
                        <td className="px-4 py-3 text-sm font-black text-slate-700">
                          {parcela.numero_parcela}/
                          {
                            crediarioSelecionado.quantidade_parcelas
                          }
                        </td>

                        <td className="px-4 py-3 text-sm text-slate-600">
                          {dataBrasil(parcela.data_vencimento)}
                        </td>

                        <td className="px-4 py-3 text-sm font-bold text-slate-700">
                          {moeda(parcela.valor_parcela)}
                        </td>

                        <td className="px-4 py-3 text-sm text-emerald-700">
                          {moeda(parcela.valor_pago)}
                        </td>

                        <td className="px-4 py-3 text-sm font-black text-slate-800">
                          {moeda(calcularSaldoParcela(parcela))}
                        </td>

                        <td className="px-4 py-3">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${classeStatus(
                              parcela.status,
                            )}`}
                          >
                            {STATUS_PARCELA[parcela.status] ||
                              parcela.status}
                          </span>
                        </td>

                        <td className="px-4 py-3">
                          <div className="flex justify-end gap-2">
                            {![
                              "PAGA",
                              "CANCELADA",
                              "RENEGOCIADA",
                            ].includes(parcela.status) && (
                              <button
                                type="button"
                                onClick={() =>
                                  abrirRecebimento(parcela)
                                }
                                className="rounded-xl bg-emerald-600 px-3 py-2 text-xs font-bold text-white"
                              >
                                Receber
                              </button>
                            )}

                            <button
                              type="button"
                              onClick={() =>
                                imprimirPromissoria(
                                  crediarioSelecionado,
                                  parcela,
                                )
                              }
                              className="rounded-xl bg-[#0C7886] px-3 py-2 text-xs font-bold text-white"
                            >
                              Promissória
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}

                    {parcelasSelecionadas.length === 0 && (
                      <tr>
                        <td
                          colSpan="7"
                          className="p-8 text-center text-sm text-slate-400"
                        >
                          Nenhuma parcela encontrada.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          </div>
        )}
      </Modal>

      <Modal
        aberto={modalRecebimento}
        titulo="Receber parcela"
        fechar={() => {
          if (recebendo) return;
          setModalRecebimento(false);
          setParcelaRecebimento(null);
        }}
        largura="max-w-xl"
      >
        {parcelaRecebimento && (
          <div>
            <div className="rounded-3xl bg-slate-900 p-5 text-white">
              <p className="text-sm text-slate-400">
                Parcela {parcelaRecebimento.numero_parcela}
              </p>

              <p className="mt-2 text-2xl font-black">
                Saldo: {moeda(calcularSaldoParcela(parcelaRecebimento))}
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Vencimento:{" "}
                {dataBrasil(parcelaRecebimento.data_vencimento)}
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block sm:col-span-2">
                <span className="text-sm font-bold text-slate-600">
                  Valor recebido
                </span>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={recebimento.valor}
                  onChange={(event) =>
                    setRecebimento((anterior) => ({
                      ...anterior,
                      valor: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-[#27B9B3]"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-sm font-bold text-slate-600">
                  Forma de pagamento
                </span>

                <select
                  value={recebimento.formaPagamento}
                  onChange={(event) =>
                    setRecebimento((anterior) => ({
                      ...anterior,
                      formaPagamento: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none"
                >
                  {FORMAS_PAGAMENTO.map((forma) => (
                    <option key={forma} value={forma}>
                      {forma}
                    </option>
                  ))}
                </select>
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-600">
                  Desconto
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={recebimento.desconto}
                  onChange={(event) =>
                    setRecebimento((anterior) => ({
                      ...anterior,
                      desconto: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-600">
                  Juros
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={recebimento.juros}
                  onChange={(event) =>
                    setRecebimento((anterior) => ({
                      ...anterior,
                      juros: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>

              <label className="block">
                <span className="text-sm font-bold text-slate-600">
                  Multa
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={recebimento.multa}
                  onChange={(event) =>
                    setRecebimento((anterior) => ({
                      ...anterior,
                      multa: event.target.value,
                    }))
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>

              <label className="block sm:col-span-2">
                <span className="text-sm font-bold text-slate-600">
                  Observação
                </span>

                <textarea
                  rows="3"
                  value={recebimento.observacao}
                  onChange={(event) =>
                    setRecebimento((anterior) => ({
                      ...anterior,
                      observacao: event.target.value,
                    }))
                  }
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={confirmarRecebimento}
              disabled={recebendo}
              className="mt-6 w-full rounded-2xl bg-emerald-600 px-5 py-4 font-black text-white transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {recebendo
                ? "Registrando pagamento..."
                : "Confirmar recebimento"}
            </button>
          </div>
        )}
      </Modal>
    </div>
  );
}