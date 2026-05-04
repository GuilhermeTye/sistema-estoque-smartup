//correção
import { useState } from "react";
import { supabase } from "../lib/supabase";

export default function OrdemServico() {
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
    // sua lógica futura
  };

  const cadastrarOS = async () => {
    if (!novaOS.cliente_nome?.trim() || !novaOS.produto?.trim()) {
      alert("Preencha pelo menos o nome do cliente e o produto.");
      return;
    }

    try {
      setLoading(true);

      const payload = {
        cliente_nome: novaOS.cliente_nome.trim(),
        cpf: novaOS.cpf ? novaOS.cpf.replace(/\D/g, "") : null,
        produto: novaOS.produto.trim(),
        defeito: novaOS.defeito?.trim() || null,
        status: novaOS.status || "Recebido",
        tecnico: novaOS.tecnico?.trim() || null,
        valor: novaOS.valor
          ? Number(String(novaOS.valor).replace(",", "."))
          : 0,
        previsao_entrega: novaOS.previsao_entrega || null,
        observacao_publica: novaOS.observacao_publica?.trim() || null,
      };

      const { error } = await supabase
        .from("ordens_servico")
        .insert([payload]);

      if (error) {
        console.error("Erro Supabase:", error);
        alert(`Erro ao cadastrar OS: ${error.message}`);
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
      await buscarOS();
    } catch (error) {
      console.error("Erro inesperado:", error);
      alert("Erro inesperado ao cadastrar OS.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-black text-slate-800">
            Ordem de Serviço
          </h1>

          <button
            onClick={() => setAbrirNovaOS(true)}
            className="rounded-2xl bg-[#2AB7B0] px-5 py-3 font-semibold text-white hover:bg-[#0B7285]"
          >
            + Nova OS
          </button>
        </div>

        <p className="mt-3 text-slate-600">
          Gerencie as ordens de serviço da sua assistência técnica.
        </p>

        {/* MODAL NOVA OS */}
        {abrirNovaOS && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
            <div className="w-full max-w-2xl rounded-3xl bg-white p-6 shadow-2xl">
              <h2 className="text-xl font-bold text-slate-800">
                Nova Ordem de Serviço
              </h2>

              <div className="mt-4 grid gap-3">
                <input
                  placeholder="Nome do cliente"
                  value={novaOS.cliente_nome}
                  onChange={(e) =>
                    setNovaOS({ ...novaOS, cliente_nome: e.target.value })
                  }
                  className="rounded-xl border px-3 py-2"
                />

                <input
                  placeholder="CPF"
                  value={novaOS.cpf}
                  onChange={(e) =>
                    setNovaOS({ ...novaOS, cpf: e.target.value })
                  }
                  className="rounded-xl border px-3 py-2"
                />

                <input
                  placeholder="Produto"
                  value={novaOS.produto}
                  onChange={(e) =>
                    setNovaOS({ ...novaOS, produto: e.target.value })
                  }
                  className="rounded-xl border px-3 py-2"
                />

                <input
                  placeholder="Defeito"
                  value={novaOS.defeito}
                  onChange={(e) =>
                    setNovaOS({ ...novaOS, defeito: e.target.value })
                  }
                  className="rounded-xl border px-3 py-2"
                />

                <input
                  placeholder="Valor"
                  value={novaOS.valor}
                  onChange={(e) =>
                    setNovaOS({ ...novaOS, valor: e.target.value })
                  }
                  className="rounded-xl border px-3 py-2"
                />
              </div>

              <div className="mt-6 flex justify-end gap-3">
                <button
                  onClick={() => setAbrirNovaOS(false)}
                  className="rounded-xl border px-4 py-2"
                >
                  Cancelar
                </button>

                <button
                  onClick={cadastrarOS}
                  disabled={loading}
                  className="rounded-xl bg-[#2AB7B0] px-4 py-2 text-white"
                >
                  {loading ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}