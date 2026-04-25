import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabase";

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

  async function carregarProdutos() {
    try {
      setCarregando(true);

      const { data, error } = await supabase
        .from("produtos")
        .select("*")
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
        p.codigo?.toLowerCase().includes(termo);

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
      prev.map((item, i) => (i === index ? { ...item, [name]: value } : item))
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

        const payload = {
          nome: p.nome.trim(),
          codigo: p.codigo.trim(),
          custo: Number(p.custo),
          preco: Number(p.preco),
          estoque: Number(p.estoque),
        };

        const { error } = await supabase
          .from("produtos")
          .update(payload)
          .eq("id", produtoEditando.id);

        if (error) {
          console.error(error);
          alert("Erro ao atualizar produto");
          return;
        }

        alert("Produto atualizado com sucesso");
      } else {
        const payload = produtosValidos.map((p) => ({
          nome: p.nome.trim(),
          codigo: p.codigo.trim(),
          custo: Number(p.custo),
          preco: Number(p.preco),
          estoque: Number(p.estoque),
        }));

        const { error } = await supabase.from("produtos").insert(payload);

        if (error) {
          console.error(error);
          alert("Erro ao salvar produtos");
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
    if (!window.confirm("Deseja excluir este produto?")) return;

    try {
      const { error } = await supabase.from("produtos").delete().eq("id", id);

      if (error) {
        console.error(error);
        alert("Erro ao excluir produto");
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

  return (
    <div className="bg-white p-6">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-black text-slate-800">Produtos</h1>

        <button
          onClick={abrirNovoProduto}
          className="rounded-2xl bg-[#EE6D46] px-5 py-3 font-bold text-white hover:bg-[#d85d38]"
        >
          Novo produto
        </button>
      </div>

      <div className="mb-6 grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-3">
        <input
          placeholder="Pesquisar por nome ou código..."
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
                {produtoEditando ? "Atualizar produto" : "Cadastro de produtos"}
              </h2>
              <p className="text-sm text-slate-500">
                {produtoEditando
                  ? "Altere os dados do produto selecionado"
                  : "Cadastre vários produtos de uma vez"}
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
                  placeholder="Código"
                  value={form.codigo}
                  onChange={(e) => handleChange(index, e)}
                  className="rounded-xl border bg-white p-3 outline-none focus:border-[#2AB7B0]"
                />

                <input
                  name="custo"
                  type="number"
                  placeholder="Custo"
                  value={form.custo}
                  onChange={(e) => handleChange(index, e)}
                  className="rounded-xl border bg-white p-3 outline-none focus:border-[#2AB7B0]"
                />

                <input
                  name="preco"
                  type="number"
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

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b p-4">
          <h2 className="font-bold text-slate-700">Lista de produtos</h2>
        </div>

        {carregando ? (
          <p className="p-4">Carregando...</p>
        ) : produtosFiltrados.length === 0 ? (
          <p className="p-4 text-slate-500">Nenhum produto encontrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="p-3">Nome</th>
                  <th className="p-3">Código</th>
                  <th className="p-3">Custo</th>
                  <th className="p-3">Venda</th>
                  <th className="p-3">Estoque</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>

              <tbody>
                {produtosFiltrados.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3">{p.nome}</td>
                    <td className="p-3">{p.codigo || "-"}</td>
                    <td className="p-3">{moeda(p.custo)}</td>
                    <td className="p-3">{moeda(p.preco)}</td>
                    <td className="p-3">{p.estoque}</td>

                    <td className="p-3">
                      <div className="flex gap-2">
                        <button
                          onClick={() => atualizarProduto(p)}
                          className="rounded-lg bg-[#2AB7B0]/10 px-3 py-1 font-semibold text-[#0C7886] hover:bg-[#2AB7B0]/20"
                        >
                          Atualizar
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