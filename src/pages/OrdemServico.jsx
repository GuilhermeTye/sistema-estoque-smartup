import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";

export default function OrdemServico() {
  const [ordens, setOrdens] = useState([]);
  const [loading, setLoading] = useState(false);

  const [novaOS, setNovaOS] = useState({
    cliente_nome: "",
    cpf: "",
    produto: "",
    defeito: "",
    status: "Recebido",
    previsao_entrega: "",
    observacao_publica: "",
  });

  // =========================
  // BUSCAR OS
  // =========================
  const fetchOS = async () => {
    const { data, error } = await supabase
      .from("ordens_servico")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error) setOrdens(data);
  };

  useEffect(() => {
    fetchOS();
  }, []);

  // =========================
  // CRIAR OS
  // =========================
  const criarOS = async () => {
    if (!novaOS.cliente_nome || !novaOS.produto) {
      alert("Preencha cliente e produto!");
      return;
    }

    setLoading(true);

    const { error } = await supabase.from("ordens_servico").insert([
      {
        ...novaOS,
        cpf: novaOS.cpf.replace(/\D/g, ""),
      },
    ]);

    setLoading(false);

    if (error) {
      console.error(error);
      alert("Erro ao criar OS");
      return;
    }

    setNovaOS({
      cliente_nome: "",
      cpf: "",
      produto: "",
      defeito: "",
      status: "Recebido",
      previsao_entrega: "",
      observacao_publica: "",
    });

    fetchOS();
  };

  // =========================
  // ATUALIZAR STATUS
  // =========================
  const atualizarStatus = async (id, novoStatus) => {
    await supabase
      .from("ordens_servico")
      .update({ status: novoStatus })
      .eq("id", id);

    fetchOS();
  };

  // =========================
  // EXCLUIR
  // =========================
  const excluirOS = async (id) => {
    if (!confirm("Deseja excluir esta OS?")) return;

    await supabase.from("ordens_servico").delete().eq("id", id);
    fetchOS();
  };

  return (
    <div className="bg-white p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">

        <h1 className="text-3xl font-black text-slate-800">Ordem de Serviço</h1>

        {/* ========================= */}
        {/* FORMULÁRIO */}
        {/* ========================= */}
        <div className="mt-6 grid gap-3 md:grid-cols-2">

          <input
            className="input"
            placeholder="Nome do cliente"
            value={novaOS.cliente_nome}
            onChange={(e) =>
              setNovaOS({ ...novaOS, cliente_nome: e.target.value })
            }
          />

          <input
            className="input"
            placeholder="CPF"
            value={novaOS.cpf}
            onChange={(e) =>
              setNovaOS({ ...novaOS, cpf: e.target.value })
            }
          />

          <input
            className="input"
            placeholder="Produto"
            value={novaOS.produto}
            onChange={(e) =>
              setNovaOS({ ...novaOS, produto: e.target.value })
            }
          />

          <input
            className="input"
            placeholder="Defeito"
            value={novaOS.defeito}
            onChange={(e) =>
              setNovaOS({ ...novaOS, defeito: e.target.value })
            }
          />

          <select
            className="input"
            value={novaOS.status}
            onChange={(e) =>
              setNovaOS({ ...novaOS, status: e.target.value })
            }
          >
            <option>Recebido</option>
            <option>Em análise</option>
            <option>Aguardando peça</option>
            <option>Em manutenção</option>
            <option>Pronto</option>
            <option>Entregue</option>
          </select>

          <input
            type="date"
            className="input"
            value={novaOS.previsao_entrega}
            onChange={(e) =>
              setNovaOS({
                ...novaOS,
                previsao_entrega: e.target.value,
              })
            }
          />

          <input
            className="input md:col-span-2"
            placeholder="Observação para o cliente"
            value={novaOS.observacao_publica}
            onChange={(e) =>
              setNovaOS({
                ...novaOS,
                observacao_publica: e.target.value,
              })
            }
          />

          <button
            onClick={criarOS}
            className="mt-2 rounded-xl bg-[#27B9B3] p-3 font-bold text-white"
          >
            {loading ? "Salvando..." : "Cadastrar OS"}
          </button>
        </div>

        {/* ========================= */}
        {/* LISTA */}
        {/* ========================= */}
        <div className="mt-8 space-y-4">
          {ordens.map((os) => (
            <div
              key={os.id}
              className="rounded-2xl border p-4 flex flex-col gap-2"
            >
              <strong>{os.cliente_nome}</strong>
              <span>{os.produto}</span>
              <span className="text-sm text-slate-500">{os.defeito}</span>

              <div className="flex items-center gap-2 mt-2">
                <select
                  value={os.status}
                  onChange={(e) =>
                    atualizarStatus(os.id, e.target.value)
                  }
                  className="border rounded-lg p-2"
                >
                  <option>Recebido</option>
                  <option>Em análise</option>
                  <option>Aguardando peça</option>
                  <option>Em manutenção</option>
                  <option>Pronto</option>
                  <option>Entregue</option>
                </select>

                <button
                  onClick={() => excluirOS(os.id)}
                  className="text-red-500 font-bold"
                >
                  Excluir
                </button>
              </div>
            </div>
          ))}
        </div>

      </div>
    </div>
  );
}