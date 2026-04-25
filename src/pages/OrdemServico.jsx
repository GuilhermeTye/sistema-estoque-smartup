const cadastrarOS = async () => {
  if (!novaOS.cliente_nome || !novaOS.produto) {
    alert("Preencha pelo menos o nome do cliente e o produto.");
    return;
  }

  setLoading(true);

  const payload = {
    cliente_nome: novaOS.cliente_nome,
    cpf: novaOS.cpf ? novaOS.cpf.replace(/\D/g, "") : null,
    produto: novaOS.produto,
    defeito: novaOS.defeito || null,
    status: novaOS.status || "Recebido",
    tecnico: novaOS.tecnico || null,
    valor: novaOS.valor ? Number(novaOS.valor) : 0,
    previsao_entrega: novaOS.previsao_entrega || null,
    observacao_publica: novaOS.observacao_publica || null,
  };

  const { error } = await supabase
    .from("ordens_servico")
    .insert([payload]);

  setLoading(false);

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
  buscarOS();
};