import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Produtos() {
  const [produtos, setProdutos] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    codigo: "",
    custo: "",
    preco: "",
    estoque: "",
  });

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

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function salvarProduto() {
    if (!form.nome.trim()) return alert("Nome obrigatório");
    if (form.custo === "" || Number(form.custo) < 0) return alert("Custo inválido");
    if (form.preco === "" || Number(form.preco) < 0) return alert("Preço inválido");
    if (form.estoque === "" || Number(form.estoque) < 0) return alert("Estoque inválido");

    try {
      setSalvando(true);

      const payload = {
        nome: form.nome.trim(),
        codigo: form.codigo.trim(),
        custo: Number(form.custo),
        preco: Number(form.preco),
        estoque: Number(form.estoque),
      };

      const { error } = await supabase.from("produtos").insert([payload]);

      if (error) {
        console.error(error);
        alert("Erro ao salvar produto");
        return;
      }

      setForm({
        nome: "",
        codigo: "",
        custo: "",
        preco: "",
        estoque: "",
      });

      await carregarProdutos();
      alert("Produto salvo com sucesso");
    } catch (error) {
      console.error(error);
      alert("Erro inesperado ao salvar produto");
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
      <h1 className="mb-4 text-3xl font-black text-slate-800">Produtos</h1>

      <div className="mb-6 grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-5">
        <input
          name="nome"
          placeholder="Nome"
          value={form.nome}
          onChange={handleChange}
          className="rounded-xl border p-3 outline-none focus:border-[#2AB7B0]"
        />
        <input
          name="codigo"
          placeholder="Código"
          value={form.codigo}
          onChange={handleChange}
          className="rounded-xl border p-3 outline-none focus:border-[#2AB7B0]"
        />
        <input
          name="custo"
          type="number"
          placeholder="Custo"
          value={form.custo}
          onChange={handleChange}
          className="rounded-xl border p-3 outline-none focus:border-[#2AB7B0]"
        />
        <input
          name="preco"
          type="number"
          placeholder="Preço"
          value={form.preco}
          onChange={handleChange}
          className="rounded-xl border p-3 outline-none focus:border-[#2AB7B0]"
        />
        <input
          name="estoque"
          type="number"
          placeholder="Estoque"
          value={form.estoque}
          onChange={handleChange}
          className="rounded-xl border p-3 outline-none focus:border-[#2AB7B0]"
        />

        <button
          onClick={salvarProduto}
          disabled={salvando}
          className="md:col-span-2 xl:col-span-5 rounded-2xl bg-[#EE6D46] py-3 font-bold text-white hover:bg-[#d85d38] disabled:opacity-60"
        >
          {salvando ? "Salvando..." : "Salvar produto"}
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b p-4">
          <h2 className="font-bold text-slate-700">Lista de produtos</h2>
        </div>

        {carregando ? (
          <p className="p-4">Carregando...</p>
        ) : produtos.length === 0 ? (
          <p className="p-4 text-slate-500">Nenhum produto cadastrado.</p>
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
                {produtos.map((p) => (
                  <tr key={p.id} className="border-t">
                    <td className="p-3">{p.nome}</td>
                    <td className="p-3">{p.codigo || "-"}</td>
                    <td className="p-3">{moeda(p.custo)}</td>
                    <td className="p-3">{moeda(p.preco)}</td>
                    <td className="p-3">{p.estoque}</td>
                    <td className="p-3">
                      <button
                        onClick={() => deletarProduto(p.id)}
                        className="rounded-lg bg-red-50 px-3 py-1 font-semibold text-[#E52D22] hover:bg-red-100"
                      >
                        Excluir
                      </button>
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