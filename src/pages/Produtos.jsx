import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";
import { getEmpresaId } from "../utils/empresa";

const produtoVazio = {
  nome: "",
  codigo: "",
  custo: "",
  preco: "",
  estoque: "",
};

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const [abaCadastro, setAbaCadastro] = useState(false);
  const [forms, setForms] = useState([{ ...produtoVazio }]);

  const [pesquisa, setPesquisa] = useState("");
  const [filtroEstoque, setFiltroEstoque] = useState("todos");
  const [produtoEditando, setProdutoEditando] = useState(null);

  useEffect(() => {
    carregarProdutos();
  }, []);

  function gerarCodigoBarras() {
    const timestamp = Date.now().toString();

    const aleatorio = Math.floor(
      100000 + Math.random() * 900000
    ).toString();

    return `${timestamp}${aleatorio}`.slice(0, 13);
  }

  async function gerarCodigoUnico(empresaId) {
    let codigoGerado = "";
    let codigoExiste = true;

    while (codigoExiste) {
      codigoGerado = gerarCodigoBarras();

      const { data, error } = await supabase
        .from("produtos")
        .select("id")
        .eq("empresa_id", empresaId)
        .eq("codigo", codigoGerado)
        .limit(1);

      if (error) {
        console.error("Erro ao verificar código:", error);
        throw error;
      }

      codigoExiste = data && data.length > 0;
    }

    return codigoGerado;
  }

  async function carregarProdutos() {
    const empresaId = getEmpresaId();

    if (!empresaId) {
      alert("Empresa não identificada");
      return;
    }

    try {
      setCarregando(true);

      const { data, error } = await supabase
        .from("produtos")
        .select("*")
        .eq("empresa_id", empresaId)
        .order("nome", { ascending: true });

      if (error) {
        console.error(error);
        alert("Erro ao carregar produtos");
        return;
      }

      setProdutos(data || []);
    } catch (error) {
      console.error(error);
      alert("Erro inesperado ao carregar produtos");
    } finally {
      setCarregando(false);
    }
  }

  const produtosFiltrados = useMemo(() => {
    const termo = pesquisa.toLowerCase().trim();

    return produtos.filter((p) => {
      const combinaPesquisa =
        p.nome?.toLowerCase().includes(termo) ||
        String(p.codigo || "").toLowerCase().includes(termo);

      const estoque = Number(p.estoque || 0);

      const combinaFiltro =
        filtroEstoque === "todos" ||
        (filtroEstoque === "comEstoque" && estoque > 0) ||
        (filtroEstoque === "semEstoque" && estoque <= 0);

      return combinaPesquisa && combinaFiltro;
    });
  }, [produtos, pesquisa, filtroEstoque]);

  function handleChange(index, e) {
    const { name, value } = e.target;

    setForms((prev) =>
      prev.map((item, i) =>
        i === index
          ? {
              ...item,
              [name]: value,
            }
          : item
      )
    );
  }

  function adicionarLinha() {
    setForms((prev) => [...prev, { ...produtoVazio }]);
  }

  function removerLinha(index) {
    if (forms.length === 1) {
      setForms([{ ...produtoVazio }]);
      return;
    }

    setForms((prev) => prev.filter((_, i) => i !== index));
  }

  function abrirNovoProduto() {
    setProdutoEditando(null);
    setForms([{ ...produtoVazio }]);
    setAbaCadastro(true);
  }

  function atualizarProduto(produto) {
    setProdutoEditando(produto);

    setForms([
      {
        nome: produto.nome || "",
        codigo: produto.codigo || "",
        custo: produto.custo ?? "",
        preco: produto.preco ?? "",
        estoque: produto.estoque ?? "",
      },
    ]);

    setAbaCadastro(true);
  }

  async function salvarProdutos() {
    const empresaId = getEmpresaId();

    if (!empresaId) {
      alert("Empresa não encontrada");
      return;
    }

    const produtosValidos = forms.filter((p) => p.nome.trim());

    if (produtosValidos.length === 0) {
      alert("Cadastre pelo menos um produto");
      return;
    }

    for (const p of produtosValidos) {
      if (p.custo === "" || Number(p.custo) < 0) {
        alert(`Custo inválido no produto: ${p.nome}`);
        return;
      }

      if (p.preco === "" || Number(p.preco) < 0) {
        alert(`Preço inválido no produto: ${p.nome}`);
        return;
      }

      if (p.estoque === "" || Number(p.estoque) < 0) {
        alert(`Estoque inválido no produto: ${p.nome}`);
        return;
      }
    }

    try {
      setSalvando(true);

      if (produtoEditando) {
        const p = produtosValidos[0];

        let codigoProduto = p.codigo.trim();

        if (!codigoProduto) {
          codigoProduto = await gerarCodigoUnico(empresaId);
        }

        const { data: codigoDuplicado, error: erroCodigo } = await supabase
          .from("produtos")
          .select("id")
          .eq("empresa_id", empresaId)
          .eq("codigo", codigoProduto)
          .neq("id", produtoEditando.id)
          .limit(1);

        if (erroCodigo) {
          console.error(erroCodigo);
          alert("Erro ao verificar código do produto");
          return;
        }

        if (codigoDuplicado && codigoDuplicado.length > 0) {
          alert(
            `O código ${codigoProduto} já está sendo usado por outro produto`
          );
          return;
        }

        const payload = {
          nome: p.nome.trim(),
          codigo: codigoProduto,
          custo: Number(p.custo),
          preco: Number(p.preco),
          estoque: Number(p.estoque),
          empresa_id: empresaId,
        };

        const { error } = await supabase
          .from("produtos")
          .update(payload)
          .eq("id", produtoEditando.id)
          .eq("empresa_id", empresaId);

        if (error) {
          console.error(error);
          alert(error.message || "Erro ao atualizar produto");
          return;
        }

        alert("Produto atualizado com sucesso");
      } else {
        const payload = [];

        for (const p of produtosValidos) {
          let codigoProduto = p.codigo.trim();

          if (!codigoProduto) {
            codigoProduto = await gerarCodigoUnico(empresaId);
          } else {
            const { data: codigoDuplicado, error: erroCodigo } = await supabase
              .from("produtos")
              .select("id")
              .eq("empresa_id", empresaId)
              .eq("codigo", codigoProduto)
              .limit(1);

            if (erroCodigo) {
              console.error(erroCodigo);
              alert("Erro ao verificar código do produto");
              return;
            }

            if (codigoDuplicado && codigoDuplicado.length > 0) {
              alert(
                `O código ${codigoProduto} já está sendo usado por outro produto`
              );
              return;
            }
          }

          const codigoDuplicadoPayload = payload.some(
            (produto) => produto.codigo === codigoProduto
          );

          if (codigoDuplicadoPayload) {
            alert(`O código ${codigoProduto} está repetido no cadastro atual`);
            return;
          }

          payload.push({
            nome: p.nome.trim(),
            codigo: codigoProduto,
            custo: Number(p.custo),
            preco: Number(p.preco),
            estoque: Number(p.estoque),
            empresa_id: empresaId,
          });
        }

        console.log("PAYLOAD INSERT:", payload);

        const { error } = await supabase.from("produtos").insert(payload);

        if (error) {
          console.error(error);
          alert(error.message || "Erro ao salvar produtos");
          return;
        }

        alert("Produto(s) salvo(s) com sucesso");
      }

      setForms([{ ...produtoVazio }]);
      setProdutoEditando(null);
      setAbaCadastro(false);

      await carregarProdutos();
    } catch (error) {
      console.error(error);
      alert("Erro inesperado ao salvar produtos");
    } finally {
      setSalvando(false);
    }
  }

  async function deletarProduto(id) {
    const empresaId = getEmpresaId();

    if (!empresaId) {
      alert("Empresa não encontrada");
      return;
    }

    if (!window.confirm("Deseja excluir este produto?")) {
      return;
    }

    try {
      const { error } = await supabase
        .from("produtos")
        .delete()
        .eq("id", id)
        .eq("empresa_id", empresaId);

      if (error) {
        console.error(error);
        alert(error.message || "Erro ao excluir produto");
        return;
      }

      await carregarProdutos();
    } catch (error) {
      console.error(error);
      alert("Erro inesperado ao excluir produto");
    }
  }

  const moeda = (v) =>
    Number(v || 0).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  function escaparHtml(valor) {
    return String(valor ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function imprimirEtiqueta(produto) {
    const codigo = String(produto.codigo || "").trim();

    if (!codigo) {
      alert("Este produto ainda não possui código de barras.");
      return;
    }

    const nomeProduto = escaparHtml(produto.nome);
    const codigoProduto = escaparHtml(codigo);
    const precoProduto = escaparHtml(moeda(produto.preco));

    const conteudo = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />

          <title>Etiqueta - ${nomeProduto}</title>

          <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.6/dist/JsBarcode.all.min.js"></script>

          <style>
            @page {
              size: 60mm 35mm;
              margin: 0;
            }

            * {
              box-sizing: border-box;
            }

            html,
            body {
              width: 60mm;
              height: 35mm;
              margin: 0;
              padding: 0;
              font-family: Arial, sans-serif;
              color: #000;
              background: #fff;
            }

            body {
              display: flex;
              align-items: center;
              justify-content: center;
            }

            .etiqueta {
              width: 60mm;
              height: 35mm;
              padding: 2mm 3mm;
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              overflow: hidden;
            }

            .nome {
              width: 100%;
              font-size: 10px;
              line-height: 12px;
              font-weight: bold;
              text-align: center;
              white-space: nowrap;
              overflow: hidden;
              text-overflow: ellipsis;
            }

            .preco {
              margin-top: 1mm;
              font-size: 16px;
              line-height: 18px;
              font-weight: bold;
              text-align: center;
            }

            .codigo-barras {
              width: 100%;
              margin-top: 1mm;
              display: flex;
              align-items: center;
              justify-content: center;
            }

            #barcode {
              max-width: 100%;
            }

            @media print {
              html,
              body {
                width: 60mm;
                height: 35mm;
              }

              .etiqueta {
                border: none;
              }
            }
          </style>
        </head>

        <body>
          <div class="etiqueta">
            <div class="nome">${nomeProduto}</div>

            <div class="preco">${precoProduto}</div>

            <div class="codigo-barras">
              <svg id="barcode"></svg>
            </div>
          </div>

          <script>
            function gerarEtiqueta() {
              try {
                JsBarcode("#barcode", "${codigoProduto}", {
                  format: "CODE128",
                  displayValue: true,
                  font: "Arial",
                  fontSize: 10,
                  textMargin: 1,
                  height: 32,
                  width: 1.5,
                  margin: 0
                });

                setTimeout(function() {
                  window.print();
                }, 300);
              } catch (error) {
                alert("Erro ao gerar código de barras.");
                console.error(error);
              }
            }

            if (document.readyState === "complete") {
              gerarEtiqueta();
            } else {
              window.addEventListener("load", gerarEtiqueta);
            }
          </script>
        </body>
      </html>
    `;

    const janela = window.open(
      "",
      "_blank",
      "width=500,height=400"
    );

    if (!janela) {
      alert("Não foi possível abrir a janela de impressão.");
      return;
    }

    janela.document.open();
    janela.document.write(conteudo);
    janela.document.close();
  }

  return (
    <div className="bg-white p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-slate-800">
            Produtos
          </h1>

          <p className="mt-1 text-sm text-slate-500">
            Gerencie seus produtos e códigos de barras
          </p>
        </div>

        <button
          onClick={abrirNovoProduto}
          className="rounded-2xl bg-[#EE6D46] px-5 py-3 font-bold text-white hover:bg-[#d85d38]"
        >
          Novo produto
        </button>
      </div>

      <div className="mb-6 grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <input
          placeholder="Pesquisar por nome ou código de barras..."
          value={pesquisa}
          onChange={(e) => setPesquisa(e.target.value)}
          className="rounded-xl border p-3 outline-none focus:border-[#2AB7B0] md:col-span-2"
        />

        <select
          value={filtroEstoque}
          onChange={(e) => setFiltroEstoque(e.target.value)}
          className="rounded-xl border p-3 outline-none focus:border-[#2AB7B0]"
        >
          <option value="todos">Todos os produtos</option>
          <option value="comEstoque">Com estoque</option>
          <option value="semEstoque">Sem estoque</option>
        </select>
      </div>

      {abaCadastro && (
        <div className="mb-6 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm">
          <div className="mb-4 flex items-center justify-between gap-3 border-b pb-4">
            <div>
              <h2 className="font-bold text-slate-700">
                {produtoEditando
                  ? "Atualizar produto"
                  : "Cadastro de produtos"}
              </h2>

              <p className="text-sm text-slate-500">
                {produtoEditando
                  ? "Altere os dados do produto selecionado"
                  : "Deixe o código vazio para gerar automaticamente"}
              </p>
            </div>

            <button
              onClick={() => {
                setAbaCadastro(false);
                setProdutoEditando(null);
                setForms([{ ...produtoVazio }]);
              }}
              className="rounded-xl border border-slate-200 px-4 py-2 font-semibold text-slate-600 hover:bg-slate-50"
            >
              Fechar
            </button>
          </div>

          <div className="space-y-3">
            {forms.map((form, index) => (
              <div
                key={index}
                className="grid gap-3 rounded-2xl border border-slate-100 bg-slate-50 p-3 md:grid-cols-2 xl:grid-cols-6"
              >
                <input
                  name="nome"
                  placeholder="Nome"
                  value={form.nome}
                  onChange={(e) => handleChange(index, e)}
                  className="rounded-xl border bg-white p-3 outline-none focus:border-[#2AB7B0] xl:col-span-2"
                />

                <input
                  name="codigo"
                  placeholder="Código de barras (automático)"
                  value={form.codigo}
                  onChange={(e) => handleChange(index, e)}
                  className="rounded-xl border bg-white p-3 outline-none focus:border-[#2AB7B0]"
                />

                <input
                  name="custo"
                  type="number"
                  step="0.01"
                  placeholder="Custo"
                  value={form.custo}
                  onChange={(e) => handleChange(index, e)}
                  className="rounded-xl border bg-white p-3 outline-none focus:border-[#2AB7B0]"
                />

                <input
                  name="preco"
                  type="number"
                  step="0.01"
                  placeholder="Preço"
                  value={form.preco}
                  onChange={(e) => handleChange(index, e)}
                  className="rounded-xl border bg-white p-3 outline-none focus:border-[#2AB7B0]"
                />

                <div className="flex gap-2">
                  <input
                    name="estoque"
                    type="number"
                    placeholder="Estoque"
                    value={form.estoque}
                    onChange={(e) => handleChange(index, e)}
                    className="w-full rounded-xl border bg-white p-3 outline-none focus:border-[#2AB7B0]"
                  />

                  {!produtoEditando && (
                    <button
                      onClick={() => removerLinha(index)}
                      className="rounded-xl bg-red-50 px-3 font-bold text-[#E52D22] hover:bg-red-100"
                      title="Remover linha"
                    >
                      ×
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 flex flex-col gap-3 md:flex-row">
            {!produtoEditando && (
              <button
                onClick={adicionarLinha}
                className="rounded-2xl border border-[#2AB7B0] px-5 py-3 font-bold text-[#0C7886] hover:bg-[#2AB7B0]/10"
              >
                + Adicionar mais produto
              </button>
            )}

            <button
              onClick={salvarProdutos}
              disabled={salvando}
              className="rounded-2xl bg-[#EE6D46] px-5 py-3 font-bold text-white hover:bg-[#d85d38] disabled:opacity-60 md:ml-auto"
            >
              {salvando
                ? "Salvando..."
                : produtoEditando
                ? "Atualizar produto"
                : "Salvar produtos"}
            </button>
          </div>
        </div>
      )}

      <div className="mb-6 grid gap-4 md:grid-cols-4">
        <div className="rounded-3xl bg-white p-5 shadow">
          <p className="text-sm text-slate-500">
            Produtos
          </p>

          <h2 className="text-3xl font-black">
            {produtos.length}
          </h2>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow">
          <p className="text-sm text-slate-500">
            Valor em Estoque
          </p>

          <h2 className="text-3xl font-black text-[#0C7886]">
            {moeda(
              produtos.reduce(
                (t, p) =>
                  t +
                  Number(p.custo || 0) *
                    Number(p.estoque || 0),
                0
              )
            )}
          </h2>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow">
          <p className="text-sm text-slate-500">
            Produtos sem estoque
          </p>

          <h2 className="text-3xl font-black text-red-500">
            {
              produtos.filter(
                (p) => Number(p.estoque || 0) <= 0
              ).length
            }
          </h2>
        </div>

        <div className="rounded-3xl bg-white p-5 shadow">
          <p className="text-sm text-slate-500">
            Lucro Potencial
          </p>

          <h2 className="text-3xl font-black text-green-600">
            {moeda(
              produtos.reduce(
                (t, p) =>
                  t +
                  (Number(p.preco || 0) -
                    Number(p.custo || 0)) *
                    Number(p.estoque || 0),
                0
              )
            )}
          </h2>
        </div>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b p-4">
          <h2 className="font-bold text-slate-700">
            Lista de produtos
          </h2>
        </div>

        {carregando ? (
          <p className="p-4">
            Carregando...
          </p>
        ) : produtosFiltrados.length === 0 ? (
          <p className="p-4 text-slate-500">
            Nenhum produto encontrado.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="p-3">Nome</th>
                  <th className="p-3">Código de barras</th>
                  <th className="p-3">Custo</th>
                  <th className="p-3">Venda</th>
                  <th className="p-3">Lucro</th>
                  <th className="p-3">Estoque</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>

              <tbody>
                {produtosFiltrados.map((p) => (
                  <tr
                    key={p.id}
                    className="border-t"
                  >
                    <td className="p-3">
                      {p.nome}
                    </td>

                    <td className="p-3 font-mono font-semibold text-[#0C7886]">
                      {p.codigo || "-"}
                    </td>

                    <td className="p-3">
                      {moeda(p.custo)}
                    </td>

                    <td className="p-3">
                      {moeda(p.preco)}
                    </td>

                    <td className="p-3 font-bold text-green-600">
                      {moeda(
                        Number(p.preco || 0) -
                          Number(p.custo || 0)
                      )}
                    </td>

                    <td className="p-3">
                      {p.estoque}
                    </td>

                    <td className="p-3">
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => atualizarProduto(p)}
                          className="rounded-lg bg-[#2AB7B0]/10 px-3 py-1 font-semibold text-[#0C7886] hover:bg-[#2AB7B0]/20"
                        >
                          Atualizar
                        </button>

                        <button
                          onClick={() => imprimirEtiqueta(p)}
                          className="rounded-lg bg-green-50 px-3 py-1 font-semibold text-green-700 hover:bg-green-100"
                        >
                          🏷️ Etiqueta
                        </button>

                        <button
                          onClick={() => deletarProduto(p.id)}
                          className="rounded-lg bg-red-50 px-3 py-1 font-semibold text-[#E52D22] hover:bg-red-100"
                        >
                          Excluir
                        </button>
                      </div>
                    </td>
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