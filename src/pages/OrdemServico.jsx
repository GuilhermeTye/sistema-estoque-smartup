import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function OrdemServico() {
  const [ordens, setOrdens] = useState([]);
  const [pesquisa, setPesquisa] = useState("");
  const [abrirNovaOS, setAbrirNovaOS] = useState(false);
  const [loading, setLoading] = useState(false);

  const [novaOS, setNovaOS] = useState({
    cliente_nome: "",
    cpf: "",
    produto: "",
    defeito: "",
    status: "Recebido",
    tecnico: "",
    valor: "",
    previsao_entrega: "",
    observacao_publica: "",
  });

  const buscarOS = async () => {
    const { data, error } = await supabase
      .from("ordens_servico")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setOrdens(data || []);
  };

  useEffect(() => {
    buscarOS();
  }, []);

  const cadastrarOS = async () => {
    if (!novaOS.cliente_nome || !novaOS.produto) {
      alert("Preencha pelo menos o nome do cliente e o produto.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("ordens_servico").insert([
      {
        ...novaOS,
        cpf: novaOS.cpf.replace(/\D/g, ""),
        valor: novaOS.valor ? Number(novaOS.valor) : 0,
      },
    ]);

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Erro ao cadastrar OS.");
      return;
    }

    setNovaOS({
      cliente_nome: "",
      cpf: "",
      produto: "",
      defeito: "",
      status: "Recebido",
      tecnico: "",
      valor: "",
      previsao_entrega: "",
      observacao_publica: "",
    });

    setAbrirNovaOS(false);
    buscarOS();
  };

  const atualizarStatus = async (id, status) => {
    await supabase.from("ordens_servico").update({ status }).eq("id", id);
    buscarOS();
  };

  const excluirOS = async (id) => {
    if (!confirm("Deseja excluir esta OS?")) return;

    await supabase.from("ordens_servico").delete().eq("id", id);
    buscarOS();
  };

  const ordensFiltradas = ordens.filter((os) => {
    const texto = `${os.cliente_nome} ${os.cpf} ${os.produto} ${os.status}`
      .toLowerCase();

    return texto.includes(pesquisa.toLowerCase());
  });

  return (
    <div className="bg-white p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-black text-slate-800">
              Ordem de Serviço
            </h1>
            <p className="mt-2 text-slate-600">
              Gerencie as OS da assistência técnica.
            </p>
          </div>

          <button
            onClick={() => setAbrirNovaOS(true)}
            className="rounded-2xl bg-[#27B9B3] px-5 py-3 font-bold text-white shadow-sm hover:bg-[#0B7285]"
          >
            + Nova OS
          </button>
        </div>

        {abrirNovaOS && (
          <div className="mt-6 rounded-3xl border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-800">
                Nova Ordem de Serviço
              </h2>

              <button
                onClick={() => setAbrirNovaOS(false)}
                className="rounded-xl bg-white px-4 py-2 font-bold text-slate-600 border"
              >
                Fechar
              </button>
            </div>

            <div className="mt-5 grid gap-3 md:grid-cols-2">
              <input
                className="rounded-xl border p-3"
                placeholder="Nome do cliente"
                value={novaOS.cliente_nome}
                onChange={(e) =>
                  setNovaOS({ ...novaOS, cliente_nome: e.target.value })
                }
              />

              <input
                className="rounded-xl border p-3"
                placeholder="CPF"
                value={novaOS.cpf}
                onChange={(e) =>
                  setNovaOS({ ...novaOS, cpf: e.target.value })
                }
              />

              <input
                className="rounded-xl border p-3"
                placeholder="Produto / Aparelho"
                value={novaOS.produto}
                onChange={(e) =>
                  setNovaOS({ ...novaOS, produto: e.target.value })
                }
              />

              <input
                className="rounded-xl border p-3"
                placeholder="Defeito relatado"
                value={novaOS.defeito}
                onChange={(e) =>
                  setNovaOS({ ...novaOS, defeito: e.target.value })
                }
              />

              <input
                className="rounded-xl border p-3"
                placeholder="Técnico responsável"
                value={novaOS.tecnico}
                onChange={(e) =>
                  setNovaOS({ ...novaOS, tecnico: e.target.value })
                }
              />

              <input
                className="rounded-xl border p-3"
                placeholder="Valor da manutenção"
                type="number"
                value={novaOS.valor}
                onChange={(e) =>
                  setNovaOS({ ...novaOS, valor: e.target.value })
                }
              />

              <select
                className="rounded-xl border p-3"
                value={novaOS.status}
                onChange={(e) =>
                  setNovaOS({ ...novaOS, status: e.target.value })
                }
              >
                <option>Recebido</option>
                <option>Em análise</option>
                <option>Aguardando peça</option>
                <option>Em manutenção</option>
                <option>Pronto para retirada</option>
                <option>Entregue</option>
                <option>Cancelado</option>
              </select>

              <input
                className="rounded-xl border p-3"
                type="date"
                value={novaOS.previsao_entrega}
                onChange={(e) =>
                  setNovaOS({
                    ...novaOS,
                    previsao_entrega: e.target.value,
                  })
                }
              />

              <textarea
                className="rounded-xl border p-3 md:col-span-2"
                placeholder="Observação pública para o cliente"
                value={novaOS.observacao_publica}
                onChange={(e) =>
                  setNovaOS({
                    ...novaOS,
                    observacao_publica: e.target.value,
                  })
                }
              />

              <button
                onClick={cadastrarOS}
                className="rounded-2xl bg-[#0B7285] p-3 font-bold text-white md:col-span-2"
              >
                {loading ? "Salvando..." : "Salvar OS"}
              </button>
            </div>
          </div>
        )}

        <div className="mt-6">
          <input
            className="w-full rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
            placeholder="Pesquisar por cliente, CPF, produto ou status..."
            value={pesquisa}
            onChange={(e) => setPesquisa(e.target.value)}
          />
        </div>

        <div className="mt-6 space-y-4">
          {ordensFiltradas.length === 0 ? (
            <div className="rounded-2xl bg-slate-50 p-5 text-slate-500">
              Nenhuma OS encontrada.
            </div>
          ) : (
            ordensFiltradas.map((os) => (
              <div
                key={os.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <h3 className="text-lg font-black text-slate-800">
                      {os.cliente_nome}
                    </h3>

                    <p className="text-slate-600">
                      {os.produto} — {os.defeito || "Sem defeito informado"}
                    </p>

                    <p className="mt-1 text-sm text-slate-500">
                      CPF:{" "}
                      {os.cpf
                        ? `***.***.***-${String(os.cpf).slice(-2)}`
                        : "Não informado"}
                    </p>
                  </div>

                  <div className="flex flex-col gap-2 md:flex-row md:items-center">
                    <select
                      value={os.status}
                      onChange={(e) =>
                        atualizarStatus(os.id, e.target.value)
                      }
                      className="rounded-xl border p-2 font-semibold text-[#0B7285]"
                    >
                      <option>Recebido</option>
                      <option>Em análise</option>
                      <option>Aguardando peça</option>
                      <option>Em manutenção</option>
                      <option>Pronto para retirada</option>
                      <option>Entregue</option>
                      <option>Cancelado</option>
                    </select>

                    <button
                      onClick={() => excluirOS(os.id)}
                      className="rounded-xl bg-red-50 px-4 py-2 font-bold text-red-600"
                    >
                      Excluir
                    </button>
                  </div>
                </div>

                <div className="mt-4 grid gap-2 text-sm text-slate-600 md:grid-cols-3">
                  <p>
                    <strong>Técnico:</strong> {os.tecnico || "Não informado"}
                  </p>

                  <p>
                    <strong>Valor:</strong>{" "}
                    {Number(os.valor || 0).toLocaleString("pt-BR", {
                      style: "currency",
                      currency: "BRL",
                    })}
                  </p>

                  <p>
                    <strong>Previsão:</strong>{" "}
                    {os.previsao_entrega
                      ? new Date(os.previsao_entrega).toLocaleDateString(
                          "pt-BR"
                        )
                      : "Não informada"}
                  </p>
                </div>

                {os.observacao_publica && (
                  <div className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">
                    <strong>Observação:</strong> {os.observacao_publica}
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}