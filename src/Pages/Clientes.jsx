import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function Clientes() {
  const [clientes, setClientes] = useState([]);
  const [carregando, setCarregando] = useState(false);
  const [salvando, setSalvando] = useState(false);

  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    cidade: "",
  });

  useEffect(() => {
    carregarClientes();
  }, []);

  async function carregarClientes() {
    try {
      setCarregando(true);

      const { data, error } = await supabase
        .from("clientes")
        .select("*")
        .order("nome", { ascending: true });

      if (error) {
        console.error(error);
        alert("Erro ao carregar clientes");
        return;
      }

      setClientes(data || []);
    } catch (error) {
      console.error(error);
      alert("Erro inesperado ao carregar clientes");
    } finally {
      setCarregando(false);
    }
  }

  function handleChange(e) {
    setForm((prev) => ({ ...prev, [e.target.name]: e.target.value }));
  }

  async function salvarCliente() {
    if (!form.nome.trim()) return alert("Nome obrigatório");
    if (!form.telefone.trim()) return alert("Telefone obrigatório");

    try {
      setSalvando(true);

      const payload = {
        nome: form.nome.trim(),
        telefone: form.telefone.trim(),
        email: form.email.trim(),
        cidade: form.cidade.trim(),
      };

      const { error } = await supabase.from("clientes").insert([payload]);

      if (error) {
        console.error(error);
        alert("Erro ao salvar cliente");
        return;
      }

      setForm({
        nome: "",
        telefone: "",
        email: "",
        cidade: "",
      });

      await carregarClientes();
      alert("Cliente salvo com sucesso");
    } catch (error) {
      console.error(error);
      alert("Erro inesperado ao salvar cliente");
    } finally {
      setSalvando(false);
    }
  }

  async function deletarCliente(id) {
    if (!window.confirm("Deseja excluir este cliente?")) return;

    try {
      const { error } = await supabase.from("clientes").delete().eq("id", id);

      if (error) {
        console.error(error);
        alert("Erro ao excluir cliente");
        return;
      }

      await carregarClientes();
    } catch (error) {
      console.error(error);
      alert("Erro inesperado ao excluir cliente");
    }
  }

  return (
    <div className="bg-white p-6">
      <h1 className="mb-4 text-3xl font-black text-slate-800">Clientes</h1>

      <div className="mb-6 grid gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
        <input
          name="nome"
          placeholder="Nome"
          value={form.nome}
          onChange={handleChange}
          className="rounded-xl border p-3 outline-none focus:border-[#2AB7B0]"
        />
        <input
          name="telefone"
          placeholder="Telefone"
          value={form.telefone}
          onChange={handleChange}
          className="rounded-xl border p-3 outline-none focus:border-[#2AB7B0]"
        />
        <input
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="rounded-xl border p-3 outline-none focus:border-[#2AB7B0]"
        />
        <input
          name="cidade"
          placeholder="Cidade"
          value={form.cidade}
          onChange={handleChange}
          className="rounded-xl border p-3 outline-none focus:border-[#2AB7B0]"
        />

        <button
          onClick={salvarCliente}
          disabled={salvando}
          className="md:col-span-2 xl:col-span-4 rounded-2xl bg-[#2AB7B0] py-3 font-bold text-white hover:bg-[#0B7285] disabled:opacity-60"
        >
          {salvando ? "Salvando..." : "Salvar cliente"}
        </button>
      </div>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b p-4">
          <h2 className="font-bold text-slate-700">Lista de clientes</h2>
        </div>

        {carregando ? (
          <p className="p-4">Carregando...</p>
        ) : clientes.length === 0 ? (
          <p className="p-4 text-slate-500">Nenhum cliente cadastrado.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left">
                <tr>
                  <th className="p-3">Nome</th>
                  <th className="p-3">Telefone</th>
                  <th className="p-3">Email</th>
                  <th className="p-3">Cidade</th>
                  <th className="p-3">Ações</th>
                </tr>
              </thead>
              <tbody>
                {clientes.map((c) => (
                  <tr key={c.id} className="border-t">
                    <td className="p-3">{c.nome}</td>
                    <td className="p-3">{c.telefone}</td>
                    <td className="p-3">{c.email || "-"}</td>
                    <td className="p-3">{c.cidade || "-"}</td>
                    <td className="p-3">
                      <button
                        onClick={() => deletarCliente(c.id)}
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