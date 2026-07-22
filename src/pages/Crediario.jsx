import { useCallback, useEffect, useMemo, useState } from "react";
import QRCode from "qrcode";

import { supabase } from "../lib/supabase";
import logoSmartUp from "../assets/logo.png";

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
  const partes = somenteData.split("-");

  if (partes.length !== 3) return "-";

  return `${partes[2]}/${partes[1]}/${partes[0]}`;
}

function hojeISO() {
  const data = new Date();

  const ano = data.getFullYear();
  const mes = String(data.getMonth() + 1).padStart(2, "0");
  const dia = String(data.getDate()).padStart(2, "0");

  return `${ano}-${mes}-${dia}`;
}

function adicionarMeses(dataISO, quantidade) {
  if (!dataISO) return "";

  const [ano, mes, dia] = dataISO.split("-").map(Number);

  const data = new Date(ano, mes - 1, 1);

  data.setMonth(data.getMonth() + Number(quantidade || 0));

  const ultimoDia = new Date(
    data.getFullYear(),
    data.getMonth() + 1,
    0,
  ).getDate();

  data.setDate(Math.min(dia, ultimoDia));

  return [
    data.getFullYear(),
    String(data.getMonth() + 1).padStart(2, "0"),
    String(data.getDate()).padStart(2, "0"),
  ].join("-");
}

function somenteNumeros(valor) {
  return String(valor || "").replace(/\D/g, "");
}

function normalizarValor(valor) {
  if (valor === null || valor === undefined || valor === "") {
    return 0;
  }

  if (typeof valor === "number") {
    return Number.isFinite(valor) ? valor : 0;
  }

  const texto = String(valor).trim();

  if (!texto) return 0;

  if (texto.includes(",")) {
    return (
      Number(
        texto
          .replace(/\./g, "")
          .replace(",", ".")
          .replace(/[^\d.-]/g, ""),
      ) || 0
    );
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

function obterEmpresaSalva() {
  const empresaSalva = localStorage.getItem("smartup_empresa");

  if (!empresaSalva) return {};

  try {
    const empresa = JSON.parse(empresaSalva);

    return typeof empresa === "object" && empresa !== null
      ? empresa
      : {};
  } catch {
    return {};
  }
}

function obterNomeCliente(cliente) {
  return (
    cliente?.nome ||
    cliente?.nome_completo ||
    cliente?.cliente_nome ||
    "Cliente sem nome"
  );
}

function obterEnderecoCliente(cliente) {
  return [
    cliente?.endereco,
    cliente?.numero,
    cliente?.complemento,
    cliente?.bairro,
    cliente?.cidade,
    cliente?.estado,
    cliente?.cep,
  ]
    .filter(Boolean)
    .join(" - ");
}

function calcularSaldoParcela(parcela) {
  const valorParcela = Number(parcela?.valor_parcela || 0);
  const valorPago = Number(parcela?.valor_pago || 0);
  const desconto = Number(parcela?.valor_desconto || 0);
  const juros = Number(parcela?.valor_juros || 0);
  const multa = Number(parcela?.valor_multa || 0);

  return Math.max(
    0,
    valorParcela + juros + multa - desconto - valorPago,
  );
}

function calcularValorTotalParcela(parcela) {
  return Math.max(
    0,
    Number(parcela?.valor_parcela || 0) +
      Number(parcela?.valor_juros || 0) +
      Number(parcela?.valor_multa || 0) -
      Number(parcela?.valor_desconto || 0),
  );
}

function escaparHTML(valor) {
  return String(valor ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function numeroPorExtenso(valor) {
  const unidades = [
    "",
    "um",
    "dois",
    "três",
    "quatro",
    "cinco",
    "seis",
    "sete",
    "oito",
    "nove",
  ];

  const especiais = [
    "dez",
    "onze",
    "doze",
    "treze",
    "quatorze",
    "quinze",
    "dezesseis",
    "dezessete",
    "dezoito",
    "dezenove",
  ];

  const dezenas = [
    "",
    "",
    "vinte",
    "trinta",
    "quarenta",
    "cinquenta",
    "sessenta",
    "setenta",
    "oitenta",
    "noventa",
  ];

  const centenas = [
    "",
    "cento",
    "duzentos",
    "trezentos",
    "quatrocentos",
    "quinhentos",
    "seiscentos",
    "setecentos",
    "oitocentos",
    "novecentos",
  ];

  function ate999(numero) {
    const n = Math.floor(numero);

    if (n === 0) return "";
    if (n === 100) return "cem";

    const partes = [];

    const centena = Math.floor(n / 100);
    const restoCentena = n % 100;

    if (centena > 0) {
      partes.push(centenas[centena]);
    }

    if (restoCentena > 0) {
      if (restoCentena < 10) {
        partes.push(unidades[restoCentena]);
      } else if (restoCentena < 20) {
        partes.push(especiais[restoCentena - 10]);
      } else {
        const dezena = Math.floor(restoCentena / 10);
        const unidade = restoCentena % 10;

        partes.push(dezenas[dezena]);

        if (unidade > 0) {
          partes.push(unidades[unidade]);
        }
      }
    }

    return partes.join(" e ");
  }

  function inteiroPorExtenso(numero) {
    const n = Math.floor(numero);

    if (n === 0) return "zero";

    const partes = [];

    const milhoes = Math.floor(n / 1_000_000);
    const milhares = Math.floor((n % 1_000_000) / 1_000);
    const centenasRestantes = n % 1_000;

    if (milhoes > 0) {
      partes.push(
        milhoes === 1
          ? "um milhão"
          : `${ate999(milhoes)} milhões`,
      );
    }

    if (milhares > 0) {
      partes.push(
        milhares === 1
          ? "mil"
          : `${ate999(milhares)} mil`,
      );
    }

    if (centenasRestantes > 0) {
      partes.push(ate999(centenasRestantes));
    }

    return partes.join(" e ");
  }

  const valorNormalizado = Math.max(0, Number(valor || 0));
  const reais = Math.floor(valorNormalizado);

  let centavos = Math.round((valorNormalizado - reais) * 100);

  let reaisCorrigidos = reais;

  if (centavos === 100) {
    reaisCorrigidos += 1;
    centavos = 0;
  }

  const partes = [];

  if (reaisCorrigidos > 0) {
    partes.push(
      `${inteiroPorExtenso(reaisCorrigidos)} ${
        reaisCorrigidos === 1 ? "real" : "reais"
      }`,
    );
  }

  if (centavos > 0) {
    partes.push(
      `${inteiroPorExtenso(centavos)} ${
        centavos === 1 ? "centavo" : "centavos"
      }`,
    );
  }

  if (partes.length === 0) {
    return "zero real";
  }

  return partes.join(" e ");
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
      <p className="text-sm font-semibold text-slate-500">
        {titulo}
      </p>

      <p className="mt-2 text-2xl font-black text-slate-900">
        {valor}
      </p>

      <p className="mt-1 text-xs text-slate-400">
        {descricao}
      </p>
    </div>
  );
}

function Modal({
  aberto,
  titulo,
  fechar,
  children,
  largura = "max-w-5xl",
}) {
  if (!aberto) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/60 p-4">
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

  const empresa = useMemo(() => obterEmpresaSalva(), []);

  const [loading, setLoading] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [recebendo, setRecebendo] = useState(false);

  const [clientes, setClientes] = useState([]);
  const [produtos, setProdutos] = useState([]);
  const [crediarios, setCrediarios] = useState([]);

  const [pesquisa, setPesquisa] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("TODOS");

  const [modalNovaVenda, setModalNovaVenda] = useState(false);
  const [modalDetalhes, setModalDetalhes] = useState(false);
  const [modalRecebimento, setModalRecebimento] =
    useState(false);

  const [clienteSelecionado, setClienteSelecionado] =
    useState(null);

  const [crediarioSelecionado, setCrediarioSelecionado] =
    useState(null);

  const [parcelaRecebimento, setParcelaRecebimento] =
    useState(null);

  const [parcelasSelecionadas, setParcelasSelecionadas] =
    useState([]);

  const [pesquisaCliente, setPesquisaCliente] = useState("");
  const [pesquisaProduto, setPesquisaProduto] = useState("");

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
      const preco = Number(item.preco || 0);
      const quantidade = Number(item.quantidade || 0);

      return total + preco * quantidade;
    }, 0);
  }, [itens]);

  const valorEntrada = useMemo(() => {
    return Math.max(
      0,
      normalizarValor(parcelamento.valorEntrada),
    );
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

    const valorBaseCentavos = Math.floor(
      totalCentavos / quantidade,
    );

    const diferencaCentavos =
      totalCentavos - valorBaseCentavos * quantidade;

    return Array.from(
      { length: quantidade },
      (_, indice) => {
        const adicional =
          indice < diferencaCentavos ? 1 : 0;

        return {
          numero_parcela: indice + 1,
          valor_parcela:
            (valorBaseCentavos + adicional) / 100,
          data_vencimento: adicionarMeses(
            parcelamento.primeiroVencimento,
            indice,
          ),
        };
      },
    );
  }, [
    valorFinanciado,
    parcelamento.quantidadeParcelas,
    parcelamento.primeiroVencimento,
  ]);

  const clientesFiltrados = useMemo(() => {
    const termo = pesquisaCliente.trim().toLowerCase();
    const numeros = somenteNumeros(termo);

    return clientes
      .filter((cliente) => {
        if (!termo) return true;

        const nome = obterNomeCliente(cliente).toLowerCase();
        const cpf = somenteNumeros(cliente?.cpf);
        const telefone = somenteNumeros(cliente?.telefone);

        return (
          nome.includes(termo) ||
          (numeros && cpf.includes(numeros)) ||
          (numeros && telefone.includes(numeros))
        );
      })
      .slice(0, 30);
  }, [clientes, pesquisaCliente]);

  const produtosFiltrados = useMemo(() => {
    const termo = pesquisaProduto.trim().toLowerCase();

    return produtos
      .filter((produto) => Number(produto?.estoque || 0) > 0)
      .filter((produto) => {
        if (!termo) return true;

        const nome = String(
          produto?.nome || "",
        ).toLowerCase();

        const codigo = String(
          produto?.codigo || "",
        ).toLowerCase();

        return nome.includes(termo) || codigo.includes(termo);
      })
      .slice(0, 30);
  }, [produtos, pesquisaProduto]);

  const crediariosFiltrados = useMemo(() => {
    const termo = pesquisa.trim().toLowerCase();
    const numeros = somenteNumeros(termo);

    return crediarios.filter((crediario) => {
      const cliente = crediario?.cliente || {};

      const statusCorresponde =
        filtroStatus === "TODOS" ||
        crediario.status === filtroStatus;

      const pesquisaCorresponde =
        !termo ||
        obterNomeCliente(cliente)
          .toLowerCase()
          .includes(termo) ||
        (numeros &&
          somenteNumeros(cliente?.cpf).includes(numeros)) ||
        String(crediario?.numero_crediario || "")
          .toLowerCase()
          .includes(termo);

      return statusCorresponde && pesquisaCorresponde;
    });
  }, [crediarios, pesquisa, filtroStatus]);

  const indicadores = useMemo(() => {
    let totalReceber = 0;
    let totalVencido = 0;
    let totalRecebido = 0;

    const clientesInadimplentes = new Set();

    crediarios.forEach((crediario) => {
      const parcelas = crediario?.parcelas || [];

      parcelas.forEach((parcela) => {
        const saldo = calcularSaldoParcela(parcela);

        if (!["PAGA", "CANCELADA"].includes(parcela.status)) {
          totalReceber += saldo;
        }

        if (parcela.status === "ATRASADA") {
          totalVencido += saldo;
          clientesInadimplentes.add(crediario.cliente_id);
        }

        totalRecebido += Number(parcela.valor_pago || 0);
      });
    });

    return {
      totalReceber,
      totalVencido,
      totalRecebido,
      inadimplentes: clientesInadimplentes.size,
    };
  }, [crediarios]);

  const carregarClientes = useCallback(async () => {
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("clientes")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar clientes:", error);

      throw new Error(
        `Não foi possível carregar os clientes: ${error.message}`,
      );
    }

    setClientes(data || []);
  }, [empresaId]);

  const carregarProdutos = useCallback(async () => {
    if (!empresaId) return;

    const { data, error } = await supabase
      .from("produtos")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("nome", { ascending: true });

    if (error) {
      console.error("Erro ao carregar produtos:", error);

      throw new Error(
        `Não foi possível carregar os produtos: ${error.message}`,
      );
    }

    setProdutos(data || []);
  }, [empresaId]);

  const carregarCrediarios = useCallback(async () => {
    if (!empresaId) return;

    const {
      data: dadosCrediarios,
      error: erroCrediarios,
    } = await supabase
      .from("crediarios")
      .select("*")
      .eq("empresa_id", empresaId)
      .order("criado_em", { ascending: false });

    if (erroCrediarios) {
      console.error(
        "Erro ao carregar crediários:",
        erroCrediarios,
      );

      throw new Error(
        `Não foi possível carregar os crediários: ${erroCrediarios.message}`,
      );
    }

    if (!dadosCrediarios?.length) {
      setCrediarios([]);
      return;
    }

    const clientesIds = [
      ...new Set(
        dadosCrediarios
          .map((crediario) => crediario.cliente_id)
          .filter(Boolean),
      ),
    ];

    const crediariosIds = dadosCrediarios.map(
      (crediario) => crediario.id,
    );

    let dadosClientes = [];
    let dadosParcelas = [];

    if (clientesIds.length > 0) {
      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .eq("empresa_id", empresaId)
        .in("id", clientesIds);

      if (error) {
        throw new Error(
          `Não foi possível carregar os clientes dos crediários: ${error.message}`,
        );
      }

      dadosClientes = data || [];
    }

    if (crediariosIds.length > 0) {
      const { data, error } = await supabase
        .from("crediario_parcelas")
        .select("*")
        .eq("empresa_id", empresaId)
        .in("crediario_id", crediariosIds)
        .order("numero_parcela", { ascending: true });

      if (error) {
        throw new Error(
          `Não foi possível carregar as parcelas: ${error.message}`,
        );
      }

      dadosParcelas = data || [];
    }

    const clientesPorId = {};

    dadosClientes.forEach((cliente) => {
      clientesPorId[cliente.id] = cliente;
    });

    const parcelasPorCrediario = {};

    dadosParcelas.forEach((parcela) => {
      if (!parcelasPorCrediario[parcela.crediario_id]) {
        parcelasPorCrediario[parcela.crediario_id] = [];
      }

      parcelasPorCrediario[parcela.crediario_id].push(
        parcela,
      );
    });

    const registrosMontados = dadosCrediarios.map(
      (crediario) => ({
        ...crediario,

        cliente: clientesPorId[crediario.cliente_id] || {
          id: crediario.cliente_id,
          nome: "Cliente não encontrado",
          cpf: "",
          telefone: "",
        },

        parcelas: (
          parcelasPorCrediario[crediario.id] || []
        ).sort(
          (a, b) =>
            Number(a.numero_parcela) -
            Number(b.numero_parcela),
        ),
      }),
    );

    setCrediarios(registrosMontados);
  }, [empresaId]);

  const atualizarParcelasAtrasadas =
    useCallback(async () => {
      if (!empresaId) return;

      const { error } = await supabase
        .from("crediario_parcelas")
        .update({
          status: "ATRASADA",
        })
        .eq("empresa_id", empresaId)
        .lt("data_vencimento", hojeISO())
        .in("status", ["PENDENTE", "PARCIAL"]);

      if (error) {
        console.warn(
          "Não foi possível atualizar parcelas atrasadas:",
          error,
        );
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

      alert(
        error?.message ||
          "Não foi possível carregar o módulo de crediário.",
      );
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
    const existente = itens.find(
      (item) => item.produto_id === produto.id,
    );

    if (existente) {
      alterarQuantidade(
        produto.id,
        Number(existente.quantidade) + 1,
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

  function alterarQuantidade(
    produtoId,
    quantidadeInformada,
  ) {
    const quantidade = Math.max(
      1,
      Number(quantidadeInformada || 1),
    );

    setItens((anteriores) =>
      anteriores.map((item) => {
        if (item.produto_id !== produtoId) {
          return item;
        }

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

  function alterarPreco(produtoId, valor) {
    const preco = Math.max(0, normalizarValor(valor));

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
      anteriores.filter(
        (item) => item.produto_id !== produtoId,
      ),
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

      if (
        Number(data.estoque || 0) <
        Number(item.quantidade || 0)
      ) {
        throw new Error(
          `Estoque insuficiente para ${data.nome}. Disponível: ${data.estoque}.`,
        );
      }
    }
  }

  async function baixarEstoques() {
    for (const item of itens) {
      const { data, error } = await supabase
        .from("produtos")
        .select("estoque")
        .eq("empresa_id", empresaId)
        .eq("id", item.produto_id)
        .single();

      if (error || !data) {
        throw new Error(
          `Não foi possível consultar o estoque de ${item.nome}.`,
        );
      }

      const novoEstoque =
        Number(data.estoque || 0) -
        Number(item.quantidade || 0);

      if (novoEstoque < 0) {
        throw new Error(
          `Estoque insuficiente para ${item.nome}.`,
        );
      }

      const { error: erroAtualizacao } = await supabase
        .from("produtos")
        .update({
          estoque: novoEstoque,
        })
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
        console.error(
          "Erro ao devolver estoque:",
          error,
        );
      }
    }
  }

  async function finalizarVendaCrediario() {
    if (!empresaId) {
      alert("Empresa não identificada.");
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
      alert(
        "O valor da entrada não pode ser maior que o total da venda.",
      );
      return;
    }

    if (valorFinanciado <= 0) {
      alert(
        "O valor financiado precisa ser maior que zero.",
      );
      return;
    }

    const quantidadeParcelas = Number(
      parcelamento.quantidadeParcelas || 0,
    );

    if (
      quantidadeParcelas < 1 ||
      quantidadeParcelas > 120
    ) {
      alert(
        "Informe uma quantidade de parcelas entre 1 e 120.",
      );
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
      } = await supabase.auth.getUser();

      await validarEstoques();

      const observacaoCompleta = JSON.stringify({
        observacao: parcelamento.observacao || "",

        itens: itens.map((item) => ({
          produto_id: item.produto_id,
          nome: item.nome,
          codigo: item.codigo,
          quantidade: Number(item.quantidade),
          preco_unitario: Number(item.preco),
          subtotal:
            Number(item.preco) *
            Number(item.quantidade),
        })),
      });

      const { data, error } = await supabase
        .from("crediarios")
        .insert({
          empresa_id: empresaId,
          cliente_id: clienteSelecionado.id,
          valor_total: Number(totalVenda.toFixed(2)),
          valor_entrada: Number(valorEntrada.toFixed(2)),
          valor_financiado: Number(
            valorFinanciado.toFixed(2),
          ),
          quantidade_parcelas: quantidadeParcelas,
          data_primeiro_vencimento:
            parcelamento.primeiroVencimento,
          status: "ABERTO",
          observacao: observacaoCompleta,
          criado_por: user?.id || null,
        })
        .select("*")
        .single();

      if (error) {
        throw new Error(
          `Erro ao criar crediário: ${error.message}`,
        );
      }

      crediarioCriado = data;

      const parcelasPayload = parcelasPrevias.map(
        (parcela) => ({
          empresa_id: empresaId,
          crediario_id: data.id,
          cliente_id: clienteSelecionado.id,
          numero_parcela: parcela.numero_parcela,
          valor_parcela: Number(
            parcela.valor_parcela.toFixed(2),
          ),
          valor_pago: 0,
          valor_desconto: 0,
          valor_juros: 0,
          valor_multa: 0,
          data_vencimento: parcela.data_vencimento,
          status: "PENDENTE",
        }),
      );

      const { error: erroParcelas } = await supabase
        .from("crediario_parcelas")
        .insert(parcelasPayload);

      if (erroParcelas) {
        throw new Error(
          `Erro ao gerar parcelas: ${erroParcelas.message}`,
        );
      }

      await baixarEstoques();
      estoqueBaixado = true;

      alert(
        "Venda no crediário cadastrada com sucesso.",
      );

      setModalNovaVenda(false);
      limparNovaVenda();

      await Promise.all([
        carregarProdutos(),
        carregarCrediarios(),
      ]);
    } catch (error) {
      console.error(
        "Erro ao finalizar crediário:",
        error,
      );

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

      alert(
        error?.message ||
          "Não foi possível cadastrar o crediário.",
      );
    } finally {
      setSalvando(false);
    }
  }

  async function abrirDetalhes(crediario) {
    try {
      const { data, error } = await supabase
        .from("crediario_parcelas")
        .select("*")
        .eq("empresa_id", empresaId)
        .eq("crediario_id", crediario.id)
        .order("numero_parcela", {
          ascending: true,
        });

      if (error) {
        throw new Error(
          `Não foi possível carregar as parcelas: ${error.message}`,
        );
      }

      setCrediarioSelecionado(crediario);
      setParcelasSelecionadas(data || []);
      setModalDetalhes(true);
    } catch (error) {
      console.error(error);
      alert(error.message);
    }
  }

  function abrirRecebimento(parcela) {
    setParcelaRecebimento(parcela);

    setRecebimento({
      valor: calcularSaldoParcela(parcela).toFixed(2),
      formaPagamento: "Dinheiro",
      desconto: String(parcela.valor_desconto || ""),
      juros: String(parcela.valor_juros || ""),
      multa: String(parcela.valor_multa || ""),
      observacao: "",
    });

    setModalRecebimento(true);
  }

  async function atualizarStatusCrediario(crediarioId) {
    const { data, error } = await supabase
      .from("crediario_parcelas")
      .select("status, valor_pago")
      .eq("empresa_id", empresaId)
      .eq("crediario_id", crediarioId);

    if (error || !data) return;

    const todasPagas =
      data.length > 0 &&
      data.every((parcela) => parcela.status === "PAGA");

    const existeAtrasada = data.some(
      (parcela) => parcela.status === "ATRASADA",
    );

    const existePagamento = data.some(
      (parcela) =>
        Number(parcela.valor_pago || 0) > 0,
    );

    let novoStatus = "ABERTO";

    if (todasPagas) {
      novoStatus = "QUITADO";
    } else if (existeAtrasada) {
      novoStatus = "ATRASADO";
    } else if (existePagamento) {
      novoStatus = "PARCIALMENTE_PAGO";
    }

    await supabase
      .from("crediarios")
      .update({
        status: novoStatus,
      })
      .eq("empresa_id", empresaId)
      .eq("id", crediarioId);
  }

  async function confirmarRecebimento() {
    if (
      !parcelaRecebimento ||
      !crediarioSelecionado
    ) {
      return;
    }

    const valorRecebido = normalizarValor(
      recebimento.valor,
    );

    const desconto = normalizarValor(
      recebimento.desconto,
    );

    const juros = normalizarValor(recebimento.juros);
    const multa = normalizarValor(recebimento.multa);

    const valorParcela = Number(
      parcelaRecebimento.valor_parcela || 0,
    );

    const valorJaPago = Number(
      parcelaRecebimento.valor_pago || 0,
    );

    const totalAtualizado =
      valorParcela + juros + multa - desconto;

    const saldoAtualizado = Math.max(
      0,
      totalAtualizado - valorJaPago,
    );

    if (valorRecebido <= 0) {
      alert(
        "Informe um valor de pagamento maior que zero.",
      );
      return;
    }

    if (valorRecebido > saldoAtualizado + 0.01) {
      alert(
        `O pagamento não pode ser maior que ${moeda(
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
        (valorJaPago + valorRecebido).toFixed(2),
      );

      const parcelaQuitada =
        novoValorPago >= totalAtualizado - 0.01;

      const { error: erroPagamento } = await supabase
        .from("crediario_pagamentos")
        .insert({
          empresa_id: empresaId,
          crediario_id: crediarioSelecionado.id,
          parcela_id: parcelaRecebimento.id,
          cliente_id: crediarioSelecionado.cliente_id,
          valor: Number(valorRecebido.toFixed(2)),
          forma_pagamento:
            recebimento.formaPagamento,
          observacao:
            recebimento.observacao || null,
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
          valor_desconto: Number(
            desconto.toFixed(2),
          ),
          valor_juros: Number(juros.toFixed(2)),
          valor_multa: Number(multa.toFixed(2)),
          data_pagamento: parcelaQuitada
            ? new Date().toISOString()
            : null,
          forma_pagamento:
            recebimento.formaPagamento,
          status: parcelaQuitada
            ? "PAGA"
            : "PARCIAL",
          observacao:
            recebimento.observacao || null,
        })
        .eq("empresa_id", empresaId)
        .eq("id", parcelaRecebimento.id);

      if (erroParcela) {
        throw new Error(
          `Erro ao atualizar parcela: ${erroParcela.message}`,
        );
      }

      await atualizarStatusCrediario(
        crediarioSelecionado.id,
      );

      const { data: parcelasAtualizadas } =
        await supabase
          .from("crediario_parcelas")
          .select("*")
          .eq("empresa_id", empresaId)
          .eq(
            "crediario_id",
            crediarioSelecionado.id,
          )
          .order("numero_parcela", {
            ascending: true,
          });

      setParcelasSelecionadas(
        parcelasAtualizadas || [],
      );

      setModalRecebimento(false);
      setParcelaRecebimento(null);

      await carregarCrediarios();

      alert("Pagamento registrado com sucesso.");
    } catch (error) {
      console.error(error);

      alert(
        error?.message ||
          "Não foi possível registrar o pagamento.",
      );
    } finally {
      setRecebendo(false);
    }
  }

  function obterItensCrediario(crediario) {
    if (!crediario?.observacao) return [];

    try {
      const dados = JSON.parse(crediario.observacao);

      return Array.isArray(dados?.itens)
        ? dados.itens
        : [];
    } catch {
      return [];
    }
  }

  async function criarQRCodeCrediario(
    crediario,
    parcela,
  ) {
    const codigo = [
      "SMARTUP",
      `CREDIARIO:${crediario.id}`,
      `PARCELA:${parcela.id}`,
      `NUMERO:${parcela.numero_parcela}`,
      `VENCIMENTO:${parcela.data_vencimento}`,
      `VALOR:${calcularValorTotalParcela(parcela).toFixed(
        2,
      )}`,
    ].join("|");

    return QRCode.toDataURL(codigo, {
      width: 220,
      margin: 1,
      errorCorrectionLevel: "M",
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
    });
  }

  function obterDadosEmpresa() {
    return {
      nome:
        empresa?.nome_fantasia ||
        empresa?.nome ||
        empresa?.razao_social ||
        "Smart UP",

      cnpj:
        empresa?.cnpj ||
        empresa?.cpf_cnpj ||
        "",

      telefone:
        empresa?.telefone ||
        empresa?.whatsapp ||
        "",

      endereco: [
        empresa?.endereco,
        empresa?.numero,
        empresa?.bairro,
        empresa?.cidade,
        empresa?.estado,
      ]
        .filter(Boolean)
        .join(" - "),
    };
  }

  function obterCodigoCrediario(crediario) {
    return (
      crediario.numero_crediario ||
      String(crediario.id).slice(0, 8).toUpperCase()
    );
  }

  function criarHTMLPromissoria({
    crediario,
    parcela,
    qrCode,
    modoIndividual = false,
  }) {
    const cliente = crediario?.cliente || {};
    const empresaImpressao = obterDadosEmpresa();

    const numeroCrediario =
      obterCodigoCrediario(crediario);

    const codigoConsulta = `${numeroCrediario}-${String(
      parcela.numero_parcela,
    ).padStart(2, "0")}`;

    const valor = calcularValorTotalParcela(parcela);

    const valorExtenso = numeroPorExtenso(valor);

    const enderecoCliente =
      obterEnderecoCliente(cliente);

    const cidadeAssinatura =
      cliente?.cidade ||
      empresa?.cidade ||
      "Cerro Azul";

    return `
      <section class="${
        modoIndividual
          ? "promissoria promissoria-individual"
          : "promissoria"
      }">
        <div class="linha-corte">
          <span>✂</span>
          <span>CORTE AQUI</span>
        </div>

        <div class="promissoria-corpo">
          <header class="cabecalho-promissoria">
            <div class="marca">
              <div class="logo-container">
                <img
                  src="${escaparHTML(logoSmartUp)}"
                  alt="Smart UP"
                />
              </div>

              <div class="empresa-dados">
                <h1>
                  ${escaparHTML(empresaImpressao.nome)}
                </h1>

                ${
                  empresaImpressao.cnpj
                    ? `
                      <p>
                        CNPJ: ${escaparHTML(
                          empresaImpressao.cnpj,
                        )}
                      </p>
                    `
                    : ""
                }

                ${
                  empresaImpressao.telefone
                    ? `
                      <p>
                        Telefone: ${escaparHTML(
                          empresaImpressao.telefone,
                        )}
                      </p>
                    `
                    : ""
                }
              </div>
            </div>

            <div class="titulo-promissoria">
              <strong>NOTA PROMISSÓRIA</strong>

              <span>
                Nº ${escaparHTML(codigoConsulta)}
              </span>
            </div>

            <div class="parcela-valor">
              <span>
                Parcela ${parcela.numero_parcela}/${
                  crediario.quantidade_parcelas
                }
              </span>

              <strong>${moeda(valor)}</strong>
            </div>
          </header>

          <div class="conteudo-promissoria">
            <div class="coluna-principal">
              <div class="vencimento-destaque">
                <span>VENCIMENTO</span>

                <strong>
                  ${dataBrasil(parcela.data_vencimento)}
                </strong>
              </div>

              <p class="texto-legal">
                No vencimento indicado, pagarei por esta
                única via a
                <strong>
                  ${escaparHTML(empresaImpressao.nome)}
                </strong>
                ou à sua ordem, a quantia de
                <strong>${moeda(valor)}</strong>
                (
                <strong class="extenso">
                  ${escaparHTML(valorExtenso)}
                </strong>
                ), referente à parcela
                <strong>
                  ${parcela.numero_parcela} de
                  ${crediario.quantidade_parcelas}
                </strong>
                da venda realizada no crediário nº
                <strong>
                  ${escaparHTML(numeroCrediario)}
                </strong>.
              </p>

              <div class="grade-dados">
                <div class="campo campo-grande">
                  <span>CLIENTE / EMITENTE</span>

                  <strong>
                    ${escaparHTML(
                      obterNomeCliente(cliente),
                    )}
                  </strong>
                </div>

                <div class="campo">
                  <span>CPF</span>

                  <strong>
                    ${escaparHTML(cliente?.cpf || "-")}
                  </strong>
                </div>

                <div class="campo">
                  <span>TELEFONE</span>

                  <strong>
                    ${escaparHTML(
                      cliente?.telefone || "-",
                    )}
                  </strong>
                </div>

                <div class="campo campo-grande">
                  <span>ENDEREÇO</span>

                  <strong>
                    ${escaparHTML(
                      enderecoCliente || "-",
                    )}
                  </strong>
                </div>

                <div class="campo">
                  <span>DATA DE EMISSÃO</span>

                  <strong>
                    ${dataBrasil(crediario.criado_em)}
                  </strong>
                </div>

                <div class="campo">
                  <span>CÓDIGO DE CONSULTA</span>

                  <strong>
                    ${escaparHTML(codigoConsulta)}
                  </strong>
                </div>
              </div>

              <div class="assinatura-area">
                <div class="local-data">
                  ${escaparHTML(cidadeAssinatura)},
                  ______ de __________________ de ______.
                </div>

                <div class="assinatura-linha"></div>

                <div class="assinatura-texto">
                  Assinatura do cliente/emissor
                </div>
              </div>
            </div>

            <aside class="coluna-qr">
              <img
                src="${qrCode}"
                alt="QR Code do crediário"
              />

              <strong>Consulta interna</strong>

              <span>
                ${escaparHTML(codigoConsulta)}
              </span>

              <small>
                QR Code para localização desta parcela no
                sistema Smart UP.
              </small>
            </aside>
          </div>
        </div>
      </section>
    `;
  }

  function criarCSSImpressao() {
    return `
      * {
        box-sizing: border-box;
      }

      @page {
        size: A4 portrait;
        margin: 0;
      }

      html,
      body {
        width: 210mm;
        min-height: 297mm;
        margin: 0;
        padding: 0;
        background: #ffffff;
        font-family: Arial, Helvetica, sans-serif;
        color: #0f172a;
        -webkit-print-color-adjust: exact;
        print-color-adjust: exact;
      }

      body {
        overflow: visible;
      }

      .promissoria {
        position: relative;
        width: 210mm;
        height: 99mm;
        min-height: 99mm;
        max-height: 99mm;
        margin: 0;
        padding: 3mm 5mm 2.5mm;
        overflow: hidden;
        background: #ffffff;
        page-break-inside: avoid;
        break-inside: avoid;
      }

      .promissoria:nth-of-type(3n) {
        page-break-after: always;
        break-after: page;
      }

      .promissoria:last-of-type {
        page-break-after: auto;
        break-after: auto;
      }

      .promissoria-individual {
        margin-top: 0;
        page-break-after: auto;
        break-after: auto;
      }

      .linha-corte {
        position: absolute;
        top: 0;
        left: 4mm;
        right: 4mm;
        display: flex;
        align-items: center;
        gap: 2mm;
        height: 3mm;
        border-top: 0.35mm dashed #94a3b8;
        color: #64748b;
        font-size: 5.5pt;
        letter-spacing: 0.5px;
      }

      .linha-corte span:first-child {
        margin-top: -1.8mm;
        padding-right: 1mm;
        background: #ffffff;
        font-size: 8pt;
      }

      .linha-corte span:last-child {
        margin-top: -1.4mm;
        padding: 0 1mm;
        background: #ffffff;
      }

      .promissoria-corpo {
        height: 91.5mm;
        overflow: hidden;
        border: 0.55mm solid #0C7886;
        border-radius: 2.5mm;
        background: #ffffff;
      }

      .cabecalho-promissoria {
        display: grid;
        grid-template-columns: 1.35fr 0.8fr 0.7fr;
        align-items: center;
        min-height: 18mm;
        padding: 2.2mm 3mm;
        background: linear-gradient(
          90deg,
          #0C7886,
          #27B9B3
        );
        color: #ffffff;
      }

      .marca {
        display: flex;
        align-items: center;
        gap: 2.5mm;
        min-width: 0;
      }

      .logo-container {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 13mm;
        height: 13mm;
        flex-shrink: 0;
        padding: 0.8mm;
        overflow: hidden;
        border-radius: 2.5mm;
        background: #ffffff;
      }

      .logo-container img {
        display: block;
        width: 100%;
        height: 100%;
        object-fit: contain;
      }

      .empresa-dados {
        min-width: 0;
      }

      .empresa-dados h1 {
        max-width: 70mm;
        margin: 0 0 0.6mm;
        overflow: hidden;
        color: #ffffff;
        font-size: 10.5pt;
        line-height: 1.05;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .empresa-dados p {
        margin: 0.25mm 0;
        font-size: 6.5pt;
        line-height: 1.15;
      }

      .titulo-promissoria {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        border-right: 0.3mm solid rgba(255, 255, 255, 0.35);
        border-left: 0.3mm solid rgba(255, 255, 255, 0.35);
        text-align: center;
      }

      .titulo-promissoria strong {
        font-size: 10.5pt;
        letter-spacing: 0.5px;
      }

      .titulo-promissoria span {
        margin-top: 1mm;
        font-size: 7pt;
      }

      .parcela-valor {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        justify-content: center;
      }

      .parcela-valor span {
        margin-bottom: 0.8mm;
        font-size: 7pt;
      }

      .parcela-valor strong {
        font-size: 13pt;
        line-height: 1;
      }

      .conteudo-promissoria {
        display: grid;
        grid-template-columns: minmax(0, 1fr) 29mm;
        gap: 3mm;
        height: calc(100% - 18mm);
        padding: 2.5mm 3mm;
      }

      .coluna-principal {
        min-width: 0;
      }

      .vencimento-destaque {
        display: inline-flex;
        align-items: center;
        gap: 2.5mm;
        height: 8mm;
        padding: 1mm 2.5mm;
        border: 0.35mm solid #EE6D46;
        border-radius: 1.5mm;
        color: #c2410c;
        background: #fff7ed;
      }

      .vencimento-destaque span {
        font-size: 6.5pt;
        font-weight: 700;
      }

      .vencimento-destaque strong {
        font-size: 10.5pt;
      }

      .texto-legal {
        margin: 1.5mm 0;
        font-size: 7.1pt;
        line-height: 1.32;
        text-align: justify;
      }

      .texto-legal .extenso {
        text-transform: uppercase;
      }

      .grade-dados {
        display: grid;
        grid-template-columns: 1.35fr 0.7fr 0.75fr;
        gap: 1.2mm;
      }

      .campo {
        min-width: 0;
        min-height: 8.3mm;
        padding: 1mm 1.5mm;
        overflow: hidden;
        border: 0.25mm solid #cbd5e1;
        border-radius: 1mm;
        background: #f8fafc;
      }

      .campo-grande {
        grid-column: span 1;
      }

      .campo span {
        display: block;
        margin-bottom: 0.5mm;
        color: #64748b;
        font-size: 5.5pt;
        font-weight: 700;
      }

      .campo strong {
        display: block;
        overflow: hidden;
        color: #0f172a;
        font-size: 6.8pt;
        line-height: 1.1;
        text-overflow: ellipsis;
        white-space: nowrap;
      }

      .assinatura-area {
        display: grid;
        grid-template-columns: 1fr 58mm;
        align-items: end;
        gap: 5mm;
        margin-top: 2.2mm;
      }

      .local-data {
        color: #334155;
        font-size: 6.5pt;
      }

      .assinatura-linha {
        height: 5mm;
        border-bottom: 0.3mm solid #0f172a;
      }

      .assinatura-texto {
        grid-column: 2;
        margin-top: -4.3mm;
        color: #475569;
        font-size: 5.8pt;
        text-align: center;
        transform: translateY(5.4mm);
      }

      .coluna-qr {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        min-width: 0;
        padding-left: 2mm;
        border-left: 0.3mm dashed #cbd5e1;
        text-align: center;
      }

      .coluna-qr img {
        display: block;
        width: 20mm;
        height: 20mm;
        object-fit: contain;
      }

      .coluna-qr strong {
        margin-top: 1mm;
        color: #0C7886;
        font-size: 6.5pt;
      }

      .coluna-qr span {
        margin-top: 0.5mm;
        font-size: 6pt;
        font-weight: 700;
      }

      .coluna-qr small {
        margin-top: 1mm;
        color: #64748b;
        font-size: 5.2pt;
        line-height: 1.15;
      }

      @media print {
        html,
        body {
          width: 210mm;
          height: auto;
        }

        .promissoria {
          width: 210mm;
          height: 99mm;
        }
      }
    `;
  }

  async function imprimirPromissoria(
    crediario,
    parcela,
  ) {
    if (!crediario || !parcela) return;

    try {
      const qrCode = await criarQRCodeCrediario(
        crediario,
        parcela,
      );

      const htmlPromissoria = criarHTMLPromissoria({
        crediario,
        parcela,
        qrCode,
        modoIndividual: true,
      });

      const janela = window.open(
        "",
        "_blank",
        "width=1100,height=850",
      );

      if (!janela) {
        alert(
          "Autorize os pop-ups do navegador para imprimir.",
        );
        return;
      }

      janela.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="UTF-8" />

            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            />

            <title>
              Promissória ${obterCodigoCrediario(
                crediario,
              )} - Parcela ${parcela.numero_parcela}
            </title>

            <style>
              ${criarCSSImpressao()}
            </style>
          </head>

          <body>
            ${htmlPromissoria}

            <script>
              window.addEventListener("load", function () {
                setTimeout(function () {
                  window.print();
                }, 400);
              });
            </script>
          </body>
        </html>
      `);

      janela.document.close();
    } catch (error) {
      console.error(
        "Erro ao imprimir promissória:",
        error,
      );

      alert(
        "Não foi possível gerar a promissória para impressão.",
      );
    }
  }

  async function imprimirTodasPromissorias(
    crediario,
    parcelas,
  ) {
    if (!crediario) {
      alert("Crediário não selecionado.");
      return;
    }

    if (!parcelas?.length) {
      alert(
        "Nenhuma parcela encontrada para impressão.",
      );
      return;
    }

    const janela = window.open(
      "",
      "_blank",
      "width=1100,height=850",
    );

    if (!janela) {
      alert(
        "Autorize os pop-ups do navegador para imprimir todas as promissórias.",
      );
      return;
    }

    janela.document.write(`
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />

          <title>Preparando promissórias...</title>

          <style>
            body {
              display: flex;
              min-height: 100vh;
              align-items: center;
              justify-content: center;
              margin: 0;
              font-family: Arial, sans-serif;
              color: #334155;
              background: #f8fafc;
            }

            .carregando {
              padding: 24px 32px;
              border: 1px solid #e2e8f0;
              border-radius: 18px;
              background: #ffffff;
              box-shadow: 0 10px 30px rgba(15, 23, 42, 0.1);
              text-align: center;
            }
          </style>
        </head>

        <body>
          <div class="carregando">
            Preparando as promissórias para impressão...
          </div>
        </body>
      </html>
    `);

    janela.document.close();

    try {
      const parcelasOrdenadas = [...parcelas].sort(
        (a, b) =>
          Number(a.numero_parcela) -
          Number(b.numero_parcela),
      );

      const promissoriasHTML = [];

      for (const parcela of parcelasOrdenadas) {
        const qrCode = await criarQRCodeCrediario(
          crediario,
          parcela,
        );

        promissoriasHTML.push(
          criarHTMLPromissoria({
            crediario,
            parcela,
            qrCode,
          }),
        );
      }

      janela.document.open();

      janela.document.write(`
        <!DOCTYPE html>
        <html lang="pt-BR">
          <head>
            <meta charset="UTF-8" />

            <meta
              name="viewport"
              content="width=device-width, initial-scale=1"
            />

            <title>
              Promissórias do crediário
              ${obterCodigoCrediario(crediario)}
            </title>

            <style>
              ${criarCSSImpressao()}
            </style>
          </head>

          <body>
            ${promissoriasHTML.join("")}

            <script>
              window.addEventListener("load", function () {
                setTimeout(function () {
                  window.print();
                }, 500);
              });
            </script>
          </body>
        </html>
      `);

      janela.document.close();
    } catch (error) {
      console.error(
        "Erro ao imprimir todas as promissórias:",
        error,
      );

      janela.close();

      alert(
        "Não foi possível gerar todas as promissórias.",
      );
    }
  }

  if (!empresaId) {
    return (
      <div className="min-h-screen bg-slate-50 p-6">
        <div className="mx-auto max-w-4xl rounded-3xl border border-red-200 bg-red-50 p-8 text-center">
          <h1 className="text-2xl font-black text-red-700">
            Empresa não identificada
          </h1>

          <p className="mt-3 text-red-600">
            Não foi possível localizar a empresa ativa.
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

            <h1 className="mt-1 text-3xl font-black">
              Crediário
            </h1>

            <p className="mt-2 text-sm text-white/80">
              Vendas parceladas, promissórias e
              recebimentos.
            </p>
          </div>

          <button
            type="button"
            onClick={abrirNovaVenda}
            className="rounded-2xl bg-[#EE6D46] px-6 py-3 font-black text-white shadow-md transition hover:bg-orange-600"
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
            descricao="Parcelas atrasadas"
          />

          <StatCard
            titulo="Total recebido"
            valor={moeda(indicadores.totalRecebido)}
            descricao="Valor recebido nas parcelas"
          />

          <StatCard
            titulo="Clientes inadimplentes"
            valor={indicadores.inadimplentes}
            descricao="Clientes com atraso"
          />
        </section>

        <section className="mt-6 rounded-3xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid gap-4 md:grid-cols-[1fr_240px_auto]">
            <input
              type="text"
              value={pesquisa}
              onChange={(event) =>
                setPesquisa(event.target.value)
              }
              placeholder="Pesquisar cliente, CPF ou número..."
              className="w-full rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-[#27B9B3]"
            />

            <select
              value={filtroStatus}
              onChange={(event) =>
                setFiltroStatus(event.target.value)
              }
              className="rounded-2xl border border-slate-300 px-4 py-3 text-sm outline-none"
            >
              <option value="TODOS">
                Todos os status
              </option>

              <option value="ABERTO">Aberto</option>

              <option value="PARCIALMENTE_PAGO">
                Parcialmente pago
              </option>

              <option value="ATRASADO">
                Atrasado
              </option>

              <option value="QUITADO">
                Quitado
              </option>

              <option value="CANCELADO">
                Cancelado
              </option>
            </select>

            <button
              type="button"
              onClick={carregarTudo}
              className="rounded-2xl bg-slate-900 px-5 py-3 text-sm font-bold text-white"
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
                Clique em nova venda para cadastrar.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-5 py-4 text-left text-xs font-black uppercase text-slate-500">
                      Número
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase text-slate-500">
                      Cliente
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase text-slate-500">
                      Total
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase text-slate-500">
                      Entrada
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase text-slate-500">
                      Parcelas
                    </th>

                    <th className="px-5 py-4 text-left text-xs font-black uppercase text-slate-500">
                      Status
                    </th>

                    <th className="px-5 py-4 text-right text-xs font-black uppercase text-slate-500">
                      Ações
                    </th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-slate-100">
                  {crediariosFiltrados.map(
                    (crediario) => (
                      <tr
                        key={crediario.id}
                        className="hover:bg-slate-50"
                      >
                        <td className="px-5 py-4 text-sm font-black text-slate-700">
                          #
                          {obterCodigoCrediario(
                            crediario,
                          )}
                        </td>

                        <td className="px-5 py-4">
                          <p className="text-sm font-bold text-slate-800">
                            {obterNomeCliente(
                              crediario.cliente,
                            )}
                          </p>

                          <p className="mt-1 text-xs text-slate-400">
                            CPF:{" "}
                            {crediario.cliente?.cpf ||
                              "-"}
                          </p>
                        </td>

                        <td className="px-5 py-4 text-sm font-black text-slate-800">
                          {moeda(
                            crediario.valor_total,
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-700">
                          {moeda(
                            crediario.valor_entrada,
                          )}
                        </td>

                        <td className="px-5 py-4 text-sm text-slate-600">
                          {
                            crediario.quantidade_parcelas
                          }
                          x
                        </td>

                        <td className="px-5 py-4">
                          <span
                            className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${classeStatus(
                              crediario.status,
                            )}`}
                          >
                            {STATUS_CREDIARIO[
                              crediario.status
                            ] || crediario.status}
                          </span>
                        </td>

                        <td className="px-5 py-4 text-right">
                          <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() =>
                              abrirDetalhes(crediario)
                            }
                            className="rounded-xl bg-[#0C7886] px-4 py-2 text-xs font-bold text-white"
                          >
                            Ver parcelas
                          </button>
                          <button
                                onClick={() => 
                                  excluirCrediario(item.id)
                                }
                                className="rounded-xl bg-red-600 px-4 py-2 text-xs font-bold text-white"
                                >
                                Excluir
                            </button>
                            </div>
                        </td>
                      </tr>
                    ),
                  )}
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
                1. Cliente
              </h3>

              {!clienteSelecionado ? (
                <>
                  <input
                    type="text"
                    value={pesquisaCliente}
                    onChange={(event) =>
                      setPesquisaCliente(
                        event.target.value,
                      )
                    }
                    placeholder="Pesquisar cliente por nome, CPF ou telefone..."
                    className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-[#27B9B3]"
                  />

                  <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl border border-slate-200">
                    {clientesFiltrados.map(
                      (cliente) => (
                        <button
                          key={cliente.id}
                          type="button"
                          onClick={() =>
                            setClienteSelecionado(
                              cliente,
                            )
                          }
                          className="flex w-full items-center justify-between border-b border-slate-100 px-4 py-3 text-left hover:bg-slate-50"
                        >
                          <div>
                            <p className="font-bold text-slate-800">
                              {obterNomeCliente(
                                cliente,
                              )}
                            </p>

                            <p className="mt-1 text-xs text-slate-400">
                              CPF:{" "}
                              {cliente.cpf || "-"} ·
                              Telefone:{" "}
                              {cliente.telefone ||
                                "-"}
                            </p>
                          </div>

                          <span className="text-sm font-bold text-[#0C7886]">
                            Selecionar
                          </span>
                        </button>
                      ),
                    )}

                    {clientesFiltrados.length ===
                      0 && (
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
                        {obterNomeCliente(
                          clienteSelecionado,
                        )}
                      </p>

                      <p className="mt-1 text-sm text-emerald-700">
                        CPF:{" "}
                        {clienteSelecionado.cpf ||
                          "-"}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() =>
                        setClienteSelecionado(null)
                      }
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
                2. Produtos
              </h3>

              <input
                type="text"
                value={pesquisaProduto}
                onChange={(event) =>
                  setPesquisaProduto(
                    event.target.value,
                  )
                }
                placeholder="Pesquisar produto por nome ou código..."
                className="mt-4 w-full rounded-2xl border border-slate-300 px-4 py-3 outline-none focus:border-[#27B9B3]"
              />

              <div className="mt-3 max-h-64 overflow-y-auto rounded-2xl border border-slate-200">
                {produtosFiltrados.map(
                  (produto) => (
                    <div
                      key={produto.id}
                      className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3"
                    >
                      <div>
                        <p className="font-bold text-slate-800">
                          {produto.nome}
                        </p>

                        <p className="mt-1 text-xs text-slate-400">
                          Código:{" "}
                          {produto.codigo || "-"} ·
                          Estoque:{" "}
                          {produto.estoque}
                        </p>

                        <p className="mt-1 text-sm font-black text-[#0C7886]">
                          {moeda(produto.preco)}
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={() =>
                          adicionarProduto(produto)
                        }
                        className="rounded-xl bg-[#27B9B3] px-4 py-2 text-sm font-bold text-white"
                      >
                        Adicionar
                      </button>
                    </div>
                  ),
                )}

                {produtosFiltrados.length ===
                  0 && (
                  <p className="p-5 text-center text-sm text-slate-400">
                    Nenhum produto disponível.
                  </p>
                )}
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

                    <tbody>
                      {itens.map((item) => (
                        <tr
                          key={item.produto_id}
                          className="border-b border-slate-100"
                        >
                          <td className="px-4 py-3 text-sm font-bold text-slate-800">
                            {item.nome}
                          </td>

                          <td className="px-4 py-3">
                            <input
                              type="number"
                              min="1"
                              max={item.estoque}
                              value={
                                item.quantidade
                              }
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
                                Number(
                                  item.quantidade,
                                ),
                            )}
                          </td>

                          <td className="px-4 py-3 text-right">
                            <button
                              type="button"
                              onClick={() =>
                                removerProduto(
                                  item.produto_id,
                                )
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
                <label>
                  <span className="text-sm font-bold text-slate-600">
                    Valor da entrada
                  </span>

                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={
                      parcelamento.valorEntrada
                    }
                    onChange={(event) =>
                      setParcelamento(
                        (anterior) => ({
                          ...anterior,
                          valorEntrada:
                            event.target.value,
                        }),
                      )
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"
                  />
                </label>

                <label>
                  <span className="text-sm font-bold text-slate-600">
                    Quantidade de parcelas
                  </span>

                  <input
                    type="number"
                    min="1"
                    max="120"
                    value={
                      parcelamento.quantidadeParcelas
                    }
                    onChange={(event) =>
                      setParcelamento(
                        (anterior) => ({
                          ...anterior,
                          quantidadeParcelas:
                            event.target.value,
                        }),
                      )
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"
                  />
                </label>

                <label className="sm:col-span-2">
                  <span className="text-sm font-bold text-slate-600">
                    Primeiro vencimento
                  </span>

                  <input
                    type="date"
                    value={
                      parcelamento.primeiroVencimento
                    }
                    onChange={(event) =>
                      setParcelamento(
                        (anterior) => ({
                          ...anterior,
                          primeiroVencimento:
                            event.target.value,
                        }),
                      )
                    }
                    className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"
                  />
                </label>

                <label className="sm:col-span-2">
                  <span className="text-sm font-bold text-slate-600">
                    Observação
                  </span>

                  <textarea
                    rows="3"
                    value={
                      parcelamento.observacao
                    }
                    onChange={(event) =>
                      setParcelamento(
                        (anterior) => ({
                          ...anterior,
                          observacao:
                            event.target.value,
                        }),
                      )
                    }
                    className="mt-2 w-full resize-none rounded-2xl border border-slate-300 px-4 py-3"
                  />
                </label>
              </div>
            </section>

            <section className="rounded-3xl bg-slate-900 p-5 text-white">
              <div className="flex justify-between text-sm">
                <span className="text-slate-400">
                  Total da venda
                </span>

                <strong>{moeda(totalVenda)}</strong>
              </div>

              <div className="mt-3 flex justify-between text-sm">
                <span className="text-slate-400">
                  Entrada
                </span>

                <strong>{moeda(valorEntrada)}</strong>
              </div>

              <div className="mt-3 border-t border-slate-700 pt-3">
                <div className="flex justify-between">
                  <span className="font-bold">
                    Valor financiado
                  </span>

                  <strong className="text-xl text-[#27B9B3]">
                    {moeda(valorFinanciado)}
                  </strong>
                </div>
              </div>
            </section>

            <section className="rounded-3xl border border-slate-200 p-5">
              <h3 className="font-black text-slate-900">
                Prévia das parcelas
              </h3>

              <div className="mt-4 max-h-72 overflow-y-auto">
                {parcelasPrevias.map(
                  (parcela) => (
                    <div
                      key={
                        parcela.numero_parcela
                      }
                      className="mb-2 flex items-center justify-between rounded-2xl bg-slate-50 p-3"
                    >
                      <div>
                        <p className="text-sm font-black text-slate-700">
                          Parcela{" "}
                          {
                            parcela.numero_parcela
                          }
                        </p>

                        <p className="text-xs text-slate-400">
                          {dataBrasil(
                            parcela.data_vencimento,
                          )}
                        </p>
                      </div>

                      <strong className="text-[#0C7886]">
                        {moeda(
                          parcela.valor_parcela,
                        )}
                      </strong>
                    </div>
                  ),
                )}
              </div>
            </section>

            <button
              type="button"
              onClick={
                finalizarVendaCrediario
              }
              disabled={salvando}
              className="w-full rounded-2xl bg-[#EE6D46] px-6 py-4 font-black text-white disabled:opacity-60"
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
                valor={obterNomeCliente(
                  crediarioSelecionado.cliente,
                )}
                descricao={`CPF: ${
                  crediarioSelecionado.cliente
                    ?.cpf || "-"
                }`}
              />

              <StatCard
                titulo="Valor da venda"
                valor={moeda(
                  crediarioSelecionado.valor_total,
                )}
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
                  ] ||
                  crediarioSelecionado.status
                }
                descricao={`Criado em ${dataBrasil(
                  crediarioSelecionado.criado_em,
                )}`}
              />
            </div>

            {obterItensCrediario(
              crediarioSelecionado,
            ).length > 0 && (
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
                          Valor
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
                          <td className="px-4 py-3 text-sm font-bold">
                            {item.nome}
                          </td>

                          <td className="px-4 py-3 text-sm">
                            {item.quantidade}
                          </td>

                          <td className="px-4 py-3 text-sm">
                            {moeda(
                              item.preco_unitario,
                            )}
                          </td>

                          <td className="px-4 py-3 text-sm font-black">
                            {moeda(item.subtotal)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            )}

            <section className="mt-6 rounded-3xl border border-slate-200 p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h3 className="text-lg font-black text-slate-900">
                    Parcelas
                  </h3>

                  <p className="mt-1 text-sm text-slate-500">
                    Impressão em formato A4 com três
                    promissórias por folha.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() =>
                    imprimirTodasPromissorias(
                      crediarioSelecionado,
                      parcelasSelecionadas,
                    )
                  }
                  disabled={
                    parcelasSelecionadas.length === 0
                  }
                  className="rounded-2xl bg-[#EE6D46] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50"
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
                    </tr>
                  </thead>

                  <tbody>
                    {parcelasSelecionadas.map(
                      (parcela) => (
                        <tr
                          key={parcela.id}
                          className="border-b border-slate-100"
                        >
                          <td className="px-4 py-3 text-sm font-black">
                            {
                              parcela.numero_parcela
                            }
                            /
                            {
                              crediarioSelecionado.quantidade_parcelas
                            }
                          </td>

                          <td className="px-4 py-3 text-sm">
                            {dataBrasil(
                              parcela.data_vencimento,
                            )}
                          </td>

                          <td className="px-4 py-3 text-sm font-bold">
                            {moeda(
                              parcela.valor_parcela,
                            )}
                          </td>

                          <td className="px-4 py-3 text-sm text-emerald-700">
                            {moeda(
                              parcela.valor_pago,
                            )}
                          </td>

                          <td className="px-4 py-3 text-sm font-black">
                            {moeda(
                              calcularSaldoParcela(
                                parcela,
                              ),
                            )}
                          </td>

                          <td className="px-4 py-3">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${classeStatus(
                                parcela.status,
                              )}`}
                            >
                              {STATUS_PARCELA[
                                parcela.status
                              ] || parcela.status}
                            </span>
                          </td>

                          <td className="px-4 py-3">
                            <div className="flex justify-end gap-2">
                              {![
                                "PAGA",
                                "CANCELADA",
                                "RENEGOCIADA",
                              ].includes(
                                parcela.status,
                              ) && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    abrirRecebimento(
                                      parcela,
                                    )
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
                      ),
                    )}

                    {parcelasSelecionadas.length ===
                      0 && (
                      <tr>
                        <td
                          colSpan="7"
                          className="px-4 py-8 text-center text-sm text-slate-400"
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
                Parcela{" "}
                {
                  parcelaRecebimento.numero_parcela
                }
              </p>

              <p className="mt-2 text-2xl font-black">
                Saldo:{" "}
                {moeda(
                  calcularSaldoParcela(
                    parcelaRecebimento,
                  ),
                )}
              </p>

              <p className="mt-2 text-sm text-slate-400">
                Vencimento:{" "}
                {dataBrasil(
                  parcelaRecebimento.data_vencimento,
                )}
              </p>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="sm:col-span-2">
                <span className="text-sm font-bold text-slate-600">
                  Valor recebido
                </span>

                <input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={recebimento.valor}
                  onChange={(event) =>
                    setRecebimento(
                      (anterior) => ({
                        ...anterior,
                        valor:
                          event.target.value,
                      }),
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>

              <label className="sm:col-span-2">
                <span className="text-sm font-bold text-slate-600">
                  Forma de pagamento
                </span>

                <select
                  value={
                    recebimento.formaPagamento
                  }
                  onChange={(event) =>
                    setRecebimento(
                      (anterior) => ({
                        ...anterior,
                        formaPagamento:
                          event.target.value,
                      }),
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"
                >
                  {FORMAS_PAGAMENTO.map(
                    (forma) => (
                      <option
                        key={forma}
                        value={forma}
                      >
                        {forma}
                      </option>
                    ),
                  )}
                </select>
              </label>

              <label>
                <span className="text-sm font-bold text-slate-600">
                  Desconto
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={recebimento.desconto}
                  onChange={(event) =>
                    setRecebimento(
                      (anterior) => ({
                        ...anterior,
                        desconto:
                          event.target.value,
                      }),
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>

              <label>
                <span className="text-sm font-bold text-slate-600">
                  Juros
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={recebimento.juros}
                  onChange={(event) =>
                    setRecebimento(
                      (anterior) => ({
                        ...anterior,
                        juros:
                          event.target.value,
                      }),
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>

              <label>
                <span className="text-sm font-bold text-slate-600">
                  Multa
                </span>

                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={recebimento.multa}
                  onChange={(event) =>
                    setRecebimento(
                      (anterior) => ({
                        ...anterior,
                        multa:
                          event.target.value,
                      }),
                    )
                  }
                  className="mt-2 w-full rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>

              <label className="sm:col-span-2">
                <span className="text-sm font-bold text-slate-600">
                  Observação
                </span>

                <textarea
                  rows="3"
                  value={
                    recebimento.observacao
                  }
                  onChange={(event) =>
                    setRecebimento(
                      (anterior) => ({
                        ...anterior,
                        observacao:
                          event.target.value,
                      }),
                    )
                  }
                  className="mt-2 w-full resize-none rounded-2xl border border-slate-300 px-4 py-3"
                />
              </label>
            </div>

            <button
              type="button"
              onClick={confirmarRecebimento}
              disabled={recebendo}
              className="mt-6 w-full rounded-2xl bg-emerald-600 px-5 py-4 font-black text-white disabled:opacity-60"
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