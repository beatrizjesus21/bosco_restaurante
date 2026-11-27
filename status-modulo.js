// =====================================================
// PARTE 2 - MÓDULO DE STATUS DOS PEDIDOS (Kemilly)
// =====================================================

// Lista de pedidos que aparecem no painel.
// A Parte 1 (registro de pedidos) deve chamar status_adicionarPedido()
// sempre que um novo pedido for enviado para a cozinha/bar.
let status_pedidos = [];
let status_proximoId = 1;

// Ordem dos status e o texto do botão para avançar
const status_etapas = ["aguardando", "preparo", "pronto", "entregue"];
const status_textoBotao = {
  aguardando: "Iniciar preparo",
  preparo: "Marcar como pronto",
  pronto: "Marcar como entregue"
};

// -----------------------------------------------------
// Adiciona um pedido ao painel (usado pela Parte 1)
// Exemplo:
// status_adicionarPedido({
//   mesa: 5,
//   itens: ["2x Picanha", "1x Suco de laranja"],
//   destino: "cozinha",
//   observacao: "Picanha mal passada"
// });
// -----------------------------------------------------
function status_adicionarPedido(dados) {
  const pedido = {
    id: status_proximoId++,
    mesa: dados.mesa,
    itens: dados.itens || [],
    destino: dados.destino || "cozinha",
    observacao: dados.observacao || "",
    status: "aguardando",
    criadoEm: dados.criadoEm || Date.now()
  };

  status_pedidos.push(pedido);
  status_renderizar();
  return pedido;
}

// Avança o pedido para o próximo status (clique no botão)
function status_avancar(id) {
  const pedido = status_pedidos.find(p => p.id === id);
  if (!pedido) return;

  const posicao = status_etapas.indexOf(pedido.status);
  if (posicao < status_etapas.length - 1) {
    pedido.status = status_etapas[posicao + 1];
    if (pedido.status === "entregue") {
      pedido.entregueEm = Date.now();
    }
  }

  status_renderizar();
}

// Minutos que o pedido está esperando
function status_minutosEspera(pedido) {
  const fim = pedido.entregueEm || Date.now();
  return Math.floor((fim - pedido.criadoEm) / 60000);
}

// Verifica se o pedido passou do tempo limite (entregues não contam)
function status_estaAtrasado(pedido) {
  const limite = Number(document.getElementById("status-limite").value) || 15;
  return pedido.status !== "entregue" && status_minutosEspera(pedido) >= limite;
}

// Evita que textos digitados quebrem o HTML
function status_escapar(texto) {
  const div = document.createElement("div");
  div.textContent = texto;
  return div.innerHTML;
}

// Monta o HTML de um card de pedido
function status_criarCard(pedido) {
  const atrasado = status_estaAtrasado(pedido);
  const minutos = status_minutosEspera(pedido);

  const itensHtml = pedido.itens
    .map(item => `<li>${status_escapar(item)}</li>`)
    .join("");

  const obsHtml = pedido.observacao
    ? `<p class="status-obs">Obs: ${status_escapar(pedido.observacao)}</p>`
    : "";

  const botaoHtml = pedido.status !== "entregue"
    ? `<button class="status-botao" onclick="status_avancar(${pedido.id})">
         ${status_textoBotao[pedido.status]}
       </button>`
    : "";

  const tempoTexto = pedido.status === "entregue"
    ? `Entregue em ${minutos} min`
    : `${atrasado ? "⚠ ATRASADO - " : ""}Esperando há ${minutos} min`;

  return `
    <div class="status-card ${pedido.status} ${atrasado ? "atrasado" : ""}">
      <div class="status-card-topo">
        <span>Mesa ${status_escapar(String(pedido.mesa))} · #${pedido.id}</span>
        <span class="status-destino">${pedido.destino}</span>
      </div>
      <ul class="status-itens">${itensHtml}</ul>
      ${obsHtml}
      <div class="status-tempo">${tempoTexto}</div>
      ${botaoHtml}
    </div>
  `;
}

// Desenha todo o painel novamente
function status_renderizar() {
  const filtro = document.getElementById("status-filtro").value;

  const visiveis = status_pedidos.filter(
    p => filtro === "todos" || p.destino === filtro
  );

  // Preenche cada coluna
  status_etapas.forEach(etapa => {
    const lista = document.getElementById("status-lista-" + etapa);
    const doStatus = visiveis.filter(p => p.status === etapa);

    lista.innerHTML = doStatus.length
      ? doStatus.map(status_criarCard).join("")
      : `<p class="status-vazio">Nenhum pedido</p>`;

    document.getElementById("status-qtd-" + etapa).textContent = doStatus.length;
  });

  // Mostra o aviso de atrasados
  const atrasados = visiveis.filter(status_estaAtrasado);
  const alerta = document.getElementById("status-alerta");

  if (atrasados.length > 0) {
    const mesas = atrasados.map(p => "Mesa " + p.mesa).join(", ");
    alerta.textContent = `⚠ ${atrasados.length} pedido(s) atrasado(s): ${mesas}`;
    alerta.hidden = false;
  } else {
    alerta.hidden = true;
  }
}

// Pedidos de exemplo para testar o painel
// (podem ser apagados quando a Parte 1 estiver integrada)
function status_carregarExemplos() {
  const minutosAtras = m => Date.now() - m * 60000;

  status_adicionarPedido({ mesa: 3, itens: ["2x Risoto de cogumelos", "1x Salada Caesar"], destino: "cozinha", criadoEm: minutosAtras(20) });
  status_adicionarPedido({ mesa: 7, itens: ["2x Caipirinha", "1x Água com gás"], destino: "bar", criadoEm: minutosAtras(4) });
  status_adicionarPedido({ mesa: 1, itens: ["1x Filé ao molho madeira"], destino: "cozinha", observacao: "Sem cebola", criadoEm: minutosAtras(9) });
  status_adicionarPedido({ mesa: 5, itens: ["1x Petit gâteau"], destino: "cozinha", criadoEm: minutosAtras(2) });

  status_pedidos[2].status = "preparo";
  status_pedidos[3].status = "pronto";
  status_renderizar();
}

// Inicia o módulo quando a página carregar
document.addEventListener("DOMContentLoaded", () => {
  status_carregarExemplos();
  setInterval(status_renderizar, 30000); // atualiza os tempos a cada 30s
});
// FIM DA PARTE 2
