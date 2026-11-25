const MENU_ITEMS = [
    {
        id: 1,
        name: "Bruschetta Bosco",
        category: "entradas",
        destination: "Cozinha",
        price: 32.00,
        description: "Pão artesanal tostado, tomates confitados, manjericão fresco e azeite trufado."
    },
    {
        id: 2,
        name: "Carpaccio de Carne",
        category: "entradas",
        destination: "Cozinha",
        price: 44.00,
        description: "Lâminas finas de filé, molho de alcaparras, rúcula selvagem e lascas de parmesão."
    },
    {
        id: 3,
        name: "Risoto de Cogumelos",
        category: "principais",
        destination: "Cozinha",
        price: 68.00,
        description: "Arroz arbóreo cremoso com mix de cogumelos frescos, vinho branco e parmesão."
    },
    {
        id: 4,
        name: "Filé ao Molho Madeira",
        category: "principais",
        destination: "Cozinha",
        price: 84.00,
        description: "Medalhão de filé mignon grelhado acompanhado de purê rústico de batatas."
    },
    {
        id: 5,
        name: "Salmão Grelhado",
        category: "principais",
        destination: "Cozinha",
        price: 79.00,
        description: "Posta de salmão ao molho de ervas finas com legumes salteados na manteiga."
    },
    {
        id: 6,
        name: "Petit Gâteau de Chocolate",
        category: "sobremesas",
        destination: "Cozinha",
        price: 34.00,
        description: "Bolo quente de chocolate meio amargo com sorvete artesanal de baunilha."
    },
    {
        id: 7,
        name: "Tiramisù Clássico",
        category: "sobremesas",
        destination: "Cozinha",
        price: 31.00,
        description: "Camadas de biscoito champagne embebido em café espresso e creme mascarpone."
    },
    {
        id: 8,
        name: "Limonada Suíça com Hortelã",
        category: "bebidas",
        destination: "Bar",
        price: 16.00,
        description: "Limão tahiti batido na hora com folhas de hortelã fresca e gelo."
    },
    {
        id: 9,
        name: "Negroni Bosco",
        category: "bebidas",
        destination: "Bar",
        price: 38.00,
        description: "Gin artesanal, vermute tinto, Campari e casca de laranja bahia."
    },
    {
        id: 10,
        name: "Suco Natural de Laranja",
        category: "bebidas",
        destination: "Bar",
        price: 14.00,
        description: "Suco 100% natural espremido na hora (350ml)."
    },
    {
        id: 11,
        name: "Vinho Tinto Malbec (Taça)",
        category: "bebidas",
        destination: "Bar",
        price: 36.00,
        description: "Taça de vinho tinto seco encorpado, servido na temperatura ideal."
    },
    {
        id: 12,
        name: "Água com Gás e Limão",
        category: "bebidas",
        destination: "Bar",
        price: 9.00,
        description: "Garrafa 310ml servida com rodelas de limão siciliano."
    }
];

const TABLE_STATUS_LABEL = {
    free: "Livre",
    occupied: "Ocupada",
    reserved: "Reservada"
};

function loadData(key, fallback) {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
    } catch {
        return fallback;
    }
}

// Compartilha o mesmo storage de mesas da Parte 4
let tables = loadData("bosco_tables", null);
if (!Array.isArray(tables) || tables.length === 0) {
    const capacities = [2, 4, 4, 2, 6, 4, 2, 4, 6, 2, 4, 6];
    tables = capacities.map((cap, index) => ({
        id: index + 1,
        status: "free",
        capacity: cap,
        reservationId: null
    }));
    localStorage.setItem("bosco_tables", JSON.stringify(tables));
}

// Pedidos enviados (pronto para ser lido também pela Parte 2 - Status KDS)
let sentOrders = loadData("bosco_orders", []);
let currentCart = [];
let activeCategory = "all";
let searchQuery = "";

function saveOrders() {
    localStorage.setItem("bosco_orders", JSON.stringify(sentOrders));
}

function saveTables() {
    localStorage.setItem("bosco_tables", JSON.stringify(tables));
}

function formatBRL(value) {
    return value.toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function getCurrentTime() {
    const now = new Date();
    return now.toLocaleTimeString("pt-BR", {
        hour: "2-digit",
        minute: "2-digit"
    });
}

// DATA NO HEADER

function updateDate() {
    const date = new Date();
    document.getElementById("currentDate").textContent =
        date.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        });
}

// SELETOR DE MESAS

function populateTableOptions() {
    const select = document.getElementById("orderTableSelect");
    const previous = select.value;

    select.innerHTML = '<option value="">Selecione a mesa</option>';

    tables.forEach(table => {
        const option = document.createElement("option");
        option.value = table.id;
        option.textContent = `Mesa ${String(table.id).padStart(2, "0")} — ${TABLE_STATUS_LABEL[table.status] || "Livre"}`;
        select.appendChild(option);
    });

    if ([...select.options].some(opt => opt.value === previous)) {
        select.value = previous;
    }
}

// RENDERIZAÇÃO DO CARDÁPIO

function renderMenu() {
    const grid = document.getElementById("menuGrid");
    grid.innerHTML = "";

    const filtered = MENU_ITEMS.filter(item => {
        const matchesCat = activeCategory === "all" || item.category === activeCategory;
        const matchesText =
            item.name.toLowerCase().includes(searchQuery) ||
            item.description.toLowerCase().includes(searchQuery);
        return matchesCat && matchesText;
    });

    if (filtered.length === 0) {
        grid.innerHTML = `
            <div class="empty-state" style="grid-column: 1 / -1;">
                <span>♧</span>
                <p>Nenhum item encontrado para essa busca.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(item => {
        const card = document.createElement("article");
        card.className = "ped-dish-card";

        const destClass = item.destination === "Cozinha" ? "cozinha" : "bar";

        card.innerHTML = `
            <div>
                <div class="ped-dish-top">
                    <h4 class="ped-dish-title">${item.name}</h4>
                    <span class="ped-dest-tag ${destClass}">${item.destination}</span>
                </div>
                <p class="ped-dish-desc">${item.description}</p>
            </div>
            <div class="ped-dish-bottom">
                <span class="ped-dish-price">${formatBRL(item.price)}</span>
                <button type="button" class="ped-add-btn" data-add-id="${item.id}">
                    + Adicionar
                </button>
            </div>
        `;

        card.querySelector("[data-add-id]").addEventListener("click", () => {
            addItemToCart(item.id);
        });

        grid.appendChild(card);
    });
}

// FILTROS DO CARDÁPIO

document.getElementById("categoryTabs").addEventListener("click", event => {
    const btn = event.target.closest(".ped-tab");
    if (!btn) return;

    document.querySelectorAll(".ped-tab").forEach(tab => tab.classList.remove("active"));
    btn.classList.add("active");

    activeCategory = btn.dataset.category;
    renderMenu();
});

document.getElementById("menuSearch").addEventListener("input", event => {
    searchQuery = event.target.value.trim().toLowerCase();
    renderMenu();
});

// GERENCIAMENTO DA COMANDA ATUAL

function addItemToCart(itemId) {
    const menuItem = MENU_ITEMS.find(i => i.id === itemId);
    if (!menuItem) return;

    const existing = currentCart.find(c => c.id === itemId);

    if (existing) {
        existing.qty += 1;
    } else {
        currentCart.push({
            id: menuItem.id,
            name: menuItem.name,
            destination: menuItem.destination,
            price: menuItem.price,
            qty: 1,
            note: ""
        });
    }

    renderOrderCart();
    showToast(`${menuItem.name} adicionado ao pedido.`);
}

function updateItemQty(itemId, delta) {
    const index = currentCart.findIndex(c => c.id === itemId);
    if (index === -1) return;

    currentCart[index].qty += delta;

    if (currentCart[index].qty <= 0) {
        currentCart.splice(index, 1);
    }

    renderOrderCart();
}

function updateItemNote(itemId, text) {
    const item = currentCart.find(c => c.id === itemId);
    if (item) {
        item.note = text;
    }
}

function renderOrderCart() {
    const list = document.getElementById("currentOrderList");
    const badge = document.getElementById("orderItemsBadge");
    const totalEl = document.getElementById("orderTotalValue");
    const routingEl = document.getElementById("routingPreview");

    const totalItems = currentCart.reduce((acc, item) => acc + item.qty, 0);
    badge.textContent = totalItems;

    if (currentCart.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span>♧</span>
                <p>Nenhum item adicionado ao pedido.</p>
            </div>
        `;
        totalEl.textContent = formatBRL(0);
        routingEl.textContent = "Nenhum destino definido";
        return;
    }

    list.innerHTML = "";
    let totalValue = 0;
    let kitchenCount = 0;
    let barCount = 0;

    currentCart.forEach(item => {
        totalValue += item.price * item.qty;
        if (item.destination === "Cozinha") kitchenCount += item.qty;
        if (item.destination === "Bar") barCount += item.qty;

        const row = document.createElement("div");
        row.className = "ped-cart-item";

        row.innerHTML = `
            <div class="ped-cart-header">
                <div>
                    <h4>${item.name}</h4>
                    <p class="ped-cart-meta">${item.destination} • ${formatBRL(item.price * item.qty)}</p>
                </div>
                <div class="ped-qty-controls">
                    <button type="button" class="ped-qty-btn" data-dec="${item.id}" aria-label="Diminuir quantidade">−</button>
                    <span class="ped-qty-val">${item.qty}</span>
                    <button type="button" class="ped-qty-btn" data-inc="${item.id}" aria-label="Aumentar quantidade">+</button>
                </div>
            </div>
            <input
                type="text"
                class="ped-item-note"
                placeholder="Obs. do item (ex.: sem cebola, ao ponto, sem gelo)"
                value="${item.note.replace(/"/g, "&quot;")}"
            >
        `;

        row.querySelector("[data-dec]").addEventListener("click", () => updateItemQty(item.id, -1));
        row.querySelector("[data-inc]").addEventListener("click", () => updateItemQty(item.id, 1));
        row.querySelector(".ped-item-note").addEventListener("input", e => {
            updateItemNote(item.id, e.target.value);
        });

        list.appendChild(row);
    });

    totalEl.textContent = formatBRL(totalValue);

    const routes = [];
    if (kitchenCount > 0) routes.push(`Cozinha (${kitchenCount} item/ns)`);
    if (barCount > 0) routes.push(`Bar (${barCount} item/ns)`);
    routingEl.textContent = `Envio direto: ${routes.join(" • ")}`;
}

document.getElementById("clearOrderBtn").addEventListener("click", () => {
    if (currentCart.length === 0) return;
    currentCart = [];
    document.getElementById("orderGeneralNotes").value = "";
    renderOrderCart();
    showToast("Comanda limpa.");
});

// ENVIO DO PEDIDO PARA COZINHA / BAR

document.getElementById("orderForm").addEventListener("submit", event => {
    event.preventDefault();

    const tableId = Number(document.getElementById("orderTableSelect").value);
    const waiter = document.getElementById("waiterName").value.trim();
    const generalNotes = document.getElementById("orderGeneralNotes").value.trim();

    if (!tableId) {
        showToast("Selecione a mesa antes de enviar o pedido.");
        return;
    }

    if (!waiter) {
        showToast("Informe o nome do atendente.");
        return;
    }

    if (currentCart.length === 0) {
        showToast("Adicione pelo menos um item ao pedido.");
        return;
    }

    // Separa automaticamente os itens por destino (Cozinha e Bar)
    const destinations = ["Cozinha", "Bar"];
    const sentDestinations = [];

    destinations.forEach(dest => {
        const itemsForDest = currentCart.filter(item => item.destination === dest);
        if (itemsForDest.length === 0) return;

        const subtotal = itemsForDest.reduce((acc, i) => acc + i.price * i.qty, 0);

        const orderTicket = {
            id: Date.now() + Math.floor(Math.random() * 1000),
            tableId,
            waiter,
            destination: dest,
            status: "aguardando", // Status inicial para a Parte 2
            createdAt: getCurrentTime(),
            timestamp: Date.now(),
            items: itemsForDest.map(i => ({ ...i })),
            notes: generalNotes,
            total: subtotal
        };

        sentOrders.unshift(orderTicket);
        sentDestinations.push(dest);
    });

    // Atualiza o status da mesa para "occupied" se estava "free"
    const table = tables.find(t => t.id === tableId);
    if (table && table.status === "free") {
        table.status = "occupied";
        saveTables();
        populateTableOptions();
    }

    saveOrders();
    updateSummary();

    // Limpa o carrinho mantendo o nome do garçom para agilizar o próximo atendimento
    currentCart = [];
    document.getElementById("orderGeneralNotes").value = "";
    renderOrderCart();

    showToast(`Pedido da Mesa ${String(tableId).padStart(2, "0")} enviado para: ${sentDestinations.join(" e ")}!`);
});

// RESUMO DOS CARDS SUPERIORES

function updateSummary() {
    const total = sentOrders.length;
    const kitchen = sentOrders.filter(o => o.destination === "Cozinha").length;
    const bar = sentOrders.filter(o => o.destination === "Bar").length;
    const uniqueTables = new Set(sentOrders.map(o => o.tableId)).size;

    document.getElementById("totalOrdersCount").textContent = total;
    document.getElementById("kitchenOrdersCount").textContent = kitchen;
    document.getElementById("barOrdersCount").textContent = bar;
    document.getElementById("activeTablesCount").textContent = uniqueTables;
}

// MODAL DE PEDIDOS ENVIADOS

function openModal(id) {
    document.getElementById(id).classList.add("active");
}

function closeModal(id) {
    document.getElementById(id).classList.remove("active");
}

function openSentOrdersModal() {
    renderSentOrdersList();
    openModal("sentOrdersModal");
}

document.getElementById("openSentOrdersBtn").addEventListener("click", openSentOrdersModal);
document.getElementById("viewSentOrdersBottom").addEventListener("click", openSentOrdersModal);

document.getElementById("sentOrdersFilter").addEventListener("change", renderSentOrdersList);

function renderSentOrdersList() {
    const list = document.getElementById("sentOrdersList");
    const filter = document.getElementById("sentOrdersFilter").value;

    const filtered = sentOrders.filter(order => filter === "all" || order.destination === filter);

    list.innerHTML = "";

    if (filtered.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span>♧</span>
                <p>Nenhum pedido enviado encontrado para este filtro.</p>
            </div>
        `;
        return;
    }

    filtered.forEach(order => {
        const card = document.createElement("div");
        card.className = "ped-sent-card";

        const destClass = order.destination === "Cozinha" ? "cozinha" : "bar";

        const itemsHtml = order.items
            .map(i => `<li><strong>${i.qty}x</strong> ${i.name} ${i.note ? `<span>(${i.note})</span>` : ""}</li>`)
            .join("");

        card.innerHTML = `
            <div class="ped-sent-top">
                <div>
                    <strong>Mesa ${String(order.tableId).padStart(2, "0")}</strong>
                    <span class="reservation-time" style="margin-left: 8px;">${order.createdAt}</span>
                </div>
                <div>
                    <span class="ped-dest-tag ${destClass}">${order.destination}</span>
                    <button type="button" class="delete-reservation" data-del-order="${order.id}" aria-label="Cancelar pedido">×</button>
                </div>
            </div>
            <ul class="ped-sent-items">${itemsHtml}</ul>
            ${order.notes ? `<p style="font-size:11px; color:var(--muted); margin-bottom:6px;">Obs. geral: ${order.notes}</p>` : ""}
            <div class="ped-sent-footer">
                <span>Atendente: ${order.waiter}</span>
                <strong>${formatBRL(order.total)}</strong>
            </div>
        `;

        card.querySelector("[data-del-order]").addEventListener("click", () => {
            sentOrders = sentOrders.filter(o => o.id !== order.id);
            saveOrders();
            updateSummary();
            renderSentOrdersList();
            showToast("Pedido removido da fila.");
        });

        list.appendChild(card);
    });
}

document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => closeModal(button.dataset.close));
});

document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", event => {
        if (event.target === overlay) closeModal(overlay.id);
    });
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        document.querySelectorAll(".modal-overlay").forEach(modal => modal.classList.remove("active"));
    }
});

// NOTIFICAÇÕES (TOAST)

let toastTimeout;

function showToast(message) {
    const toast = document.getElementById("toast");
    toast.textContent = message;
    toast.classList.add("show");

    clearTimeout(toastTimeout);
    toastTimeout = setTimeout(() => {
        toast.classList.remove("show");
    }, 2800);
}

// TEMA CLARO / ESCURO

const themeToggle = document.getElementById("themeToggle");
const themeIcon = document.getElementById("themeIcon");

function applyTheme(theme) {
    const isDark = theme === "dark";
    document.body.classList.toggle("dark-theme", isDark);
    themeIcon.textContent = isDark ? "☀" : "☾";
    localStorage.setItem("bosco_theme", theme);
}

themeToggle.addEventListener("click", () => {
    const isDark = document.body.classList.contains("dark-theme");
    applyTheme(isDark ? "light" : "dark");
});

// INICIALIZAÇÃO

updateDate();
applyTheme(localStorage.getItem("bosco_theme") || "light");
populateTableOptions();
renderMenu();
renderOrderCart();
updateSummary();