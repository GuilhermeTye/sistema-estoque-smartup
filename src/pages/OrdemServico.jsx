import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function OrdemServico() {
  const [abrirNovaOS, setAbrirNovaOS] = useState(false);
  const [loading, setLoading] = useState(false);
  const [pesquisa, setPesquisa] = useState("");
  const [ordens, setOrdens] = useState([]);

  const [novaOS, setNovaOS] = useState({
    cliente_nome: "",
    cpf: "",
    produto: "",
    defeito: "",
    status: "Recebido",
    valor: "",
  });

  useEffect(() => {
    buscarOS();
  }, []);

  async function buscarOS() {
    const { data, error } = await supabase
      .from("ordens_servico")
      .select("*")
      .order("id", { ascending: false });

    if (error) {
      console.error(error);
      return;
    }

    setOrdens(data || []);
  }

  async function cadastrarOS() {
    if (!novaOS.cliente_nome.trim()) {
      alert("Informe o nome do cliente");
      return;
    }

    if (!novaOS.produto.trim()) {
      alert("Informe o produto");
      return;
    }

    try {
      setLoading(true);

      const { error } = await supabase
        .from("ordens_servico")
        .insert([
          {
            cliente_nome: novaOS.cliente_nome,
            cpf: novaOS.cpf,
            produto: novaOS.produto,
            defeito: novaOS.defeito,
            status: "Recebido",
            valor: Number(novaOS.valor || 0),
          },
        ]);

      if (error) {
        console.error(error);
        alert(error.message);
        return;
      }

      setNovaOS({
        cliente_nome: "",
        cpf: "",
        produto: "",
        defeito: "",
        status: "Recebido",
        valor: "",
      });

      setAbrirNovaOS(false);

      await buscarOS();
    } catch (err) {
      console.error(err);
      alert("Erro ao cadastrar OS");
    } finally {
      setLoading(false);
    }
  }

  const listaFiltrada = ordens.filter((os) => {
    const texto =
      `${os.cliente_nome} ${os.produto} ${os.cpf}`
        .toLowerCase();

    return texto.includes(pesquisa.toLowerCase());
  });

  return (
    <div className="p-6">

      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-4xl font-black text-slate-800">
              Ordem de Serviço
            </h1>

            <p className="mt-2 text-slate-600">
              Gerencie as ordens de serviço da assistência técnica.
            </p>
          </div>

          <button
            onClick={() => setAbrirNovaOS(true)}
            className="rounded-2xl bg-[#2AB7B0] px-6 py-3 font-bold text-white hover:bg-[#0B7285]"
          >
            + Nova OS
          </button>
        </div>

        <div className="mt-6">
          <input
            type="text"
            placeholder="Pesquisar cliente, CPF ou produto..."
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
            className="w-full rounded-2xl border border-slate-200 px-4 py-3 outline-none"
          />
        </div>

        <div className="mt-6 space-y-4">

          {listaFiltrada.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-slate-300 p-8 text-center text-slate-500">
              Nenhuma OS encontrada.
            </div>
          ) : (
            listaFiltrada.map((os) => (
              <div
                key={os.id}
                className="rounded-2xl border border-slate-200 p-5 shadow-sm"
              >
                <div className="flex items-center justify-between">

                  <div>
                    <h3 className="text-lg font-bold text-slate-800">
                      {os.cliente_nome}
                    </h3>

                    <p className="text-slate-600">
                      {os.produto}
                    </p>

                    <p className="text-sm text-slate-500">
                      CPF: {os.cpf || "-"}
                    </p>

                    <p className="text-sm text-slate-500">
                      Defeito: {os.defeito || "-"}
                    </p>
                  </div>

                  <div className="text-right">

                    <span className="rounded-full bg-cyan-100 px-4 py-2 text-sm font-semibold text-cyan-700">
                      {os.status}
                    </span>

                    <p className="mt-3 font-bold text-slate-700">
                      R$ {Number(os.valor || 0).toFixed(2)}
                    </p>

                  </div>

                </div>
              </div>
            ))
          )}

        </div>
      </div>

      {abrirNovaOS && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">

          <div className="w-full max-w-3xl rounded-3xl bg-white p-6 shadow-2xl">

            <h2 className="text-2xl font-bold text-slate-800">
              Nova Ordem de Serviço
            </h2>

            <div className="mt-6 grid gap-4">

              <input
                placeholder="Nome do cliente"
                value={novaOS.cliente_nome}
                onChange={(e) =>
                  setNovaOS({
                    ...novaOS,
                    cliente_nome: e.target.value,
                  })
                }
                className="rounded-xl border px-4 py-3"
              />

              <input
                placeholder="CPF"
                value={novaOS.cpf}
                onChange={(e) =>
                  setNovaOS({
                    ...novaOS,
                    cpf: e.target.value,
                  })
                }
                className="rounded-xl border px-4 py-3"
              />

              <input
                placeholder="Produto"
                value={novaOS.produto}
                onChange={(e) =>
                  setNovaOS({
                    ...novaOS,
                    produto: e.target.value,
                  })
                }
                className="rounded-xl border px-4 py-3"
              />

              <input
                placeholder="Defeito"
                value={novaOS.defeito}
                onChange={(e) =>
                  setNovaOS({
                    ...novaOS,
                    defeito: e.target.value,
                  })
                }
                className="rounded-xl border px-4 py-3"
              />

              <input
                placeholder="Valor"
                type="number"
                value={novaOS.valor}
                onChange={(e) =>
                  setNovaOS({
                    ...novaOS,
                    valor: e.target.value,
                  })
                }
                className="rounded-xl border px-4 py-3"
              />

            </div>

            <div className="mt-8 flex justify-end gap-3">

              <button
                onClick={() => setAbrirNovaOS(false)}
                className="rounded-xl border px-5 py-3"
              >
                Cancelar
              </button>

              <button
                onClick={cadastrarOS}
                disabled={loading}
                className="rounded-xl bg-[#2AB7B0] px-5 py-3 font-semibold text-white"
              >
                {loading ? "Salvando..." : "Salvar"}
              </button>

            </div>

          </div>

        </div>
      )}
    </div>
  );
}