export default function OrdemServico() {
  return (
    <div className="bg-white p-6">
      <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-3xl font-black text-slate-800">Ordem de Serviço</h1>

        <p className="mt-3 text-slate-600">
          Esta área está pronta para receber o módulo de assistência técnica.
        </p>

        <div className="mt-6 rounded-2xl bg-slate-50 p-4">
          <p className="font-semibold text-[#0B7285]">Sugestões para a próxima etapa:</p>

          <ul className="mt-2 space-y-2 text-slate-600">
            <li>• Cadastro de aparelho</li>
            <li>• Defeito relatado</li>
            <li>• Técnico responsável</li>
            <li>• Status do serviço</li>
            <li>• Valor da manutenção</li>
            <li>• Data de entrada e entrega</li>
          </ul>
        </div>
      </div>
    </div>
  );
}