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
      valor: novaOS.valor ? Number(String(novaOS.valor).replace(",", ".")) : 0,
      previsao_entrega: novaOS.previsao_entrega || null,
      observacao_publica: novaOS.observacao_publica?.trim() || null,
    };

    const { error } = await supabase.from("ordens_servico").insert([payload]);

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