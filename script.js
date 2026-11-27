
const TOTAL_TABLES = 12;

const STATUS = {
    free: "Livre",
    occupied: "Ocupada",
    reserved: "Reservada"
};

const CAPACITIES = [2, 4, 4, 2, 6, 4, 2, 4, 6, 2, 4, 6];

// Necessidades de acessibilidade que o cliente pode informar na reserva.
// "requires" é o recurso físico que a mesa precisa ter para atender à necessidade.
const ACCESS_NEEDS = {
    wheelchair: { label: "Cadeirante", requires: "wheelchair" },
    reduced_mobility: { label: "Mobilidade reduzida", requires: "accessibleRoute" },
    guide_dog: { label: "Cão-guia", requires: "guideDogSpace" },
    visual: { label: "Deficiência visual", requires: "wellLit" },
    hearing: { label: "Deficiência auditiva", requires: "quiet" }
};

// Recursos físicos de cada mesa.
// Ajuste estes valores conforme o layout real do salão.
const TABLE_ACCESSIBILITY = {
    1:  { accessibleRoute: true,  wheelchair: true,  guideDogSpace: false, wellLit: true,  quiet: false },
    2:  { accessibleRoute: true,  wheelchair: true,  guideDogSpace: true,  wellLit: true,  quiet: false },
    3:  { accessibleRoute: true,  wheelchair: false, guideDogSpace: false, wellLit: false, quiet: false },
    4:  { accessibleRoute: false, wheelchair: false, guideDogSpace: true,  wellLit: false, quiet: true },
    5:  { accessibleRoute: true,  wheelchair: true,  guideDogSpace: true,  wellLit: false, quiet: true },
    6:  { accessibleRoute: false, wheelchair: false, guideDogSpace: false, wellLit: true,  quiet: true },
    7:  { accessibleRoute: true,  wheelchair: false, guideDogSpace: false, wellLit: false, quiet: false },
    8:  { accessibleRoute: true,  wheelchair: true,  guideDogSpace: true,  wellLit: true,  quiet: false },
    9:  { accessibleRoute: true,  wheelchair: true,  guideDogSpace: false, wellLit: false, quiet: true },
    10: { accessibleRoute: true,  wheelchair: false, guideDogSpace: false, wellLit: false, quiet: true },
    11: { accessibleRoute: false, wheelchair: false, guideDogSpace: false, wellLit: true,  quiet: false },
    12: { accessibleRoute: true,  wheelchair: true,  guideDogSpace: true,  wellLit: true,  quiet: true }
};

const ACCESS_FEATURES = {
    accessibleRoute: "Acesso facilitado",
    wheelchair: "Espaço para cadeira de rodas",
    guideDogSpace: "Espaço para cão-guia",
    wellLit: "Bem iluminada",
    quiet: "Área silenciosa"
};

function getLocalDate() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");

    return `${year}-${month}-${day}`;
}

function loadData(key, fallback) {
    try {
        const saved = localStorage.getItem(key);
        return saved ? JSON.parse(saved) : fallback;
    } catch {
        return fallback;
    }
}

let tables = loadData("bosco_tables", null);
let reservations = loadData("bosco_reservations", []);
let selectedTableId = null;

if (!Array.isArray(tables) || tables.length !== TOTAL_TABLES) {
    tables = Array.from({ length: TOTAL_TABLES }, (_, index) => ({
        id: index + 1,
        status: "free",
        capacity: CAPACITIES[index],
        reservationId: null
    }));
}

function saveData() {
    localStorage.setItem("bosco_tables", JSON.stringify(tables));
    localStorage.setItem("bosco_reservations", JSON.stringify(reservations));
}

// ACCESSIBILITY MATCHING

function getTableAccess(tableId) {
    return TABLE_ACCESSIBILITY[tableId] || {};
}

function getAccessFeatureLabels(tableId) {
    const access = getTableAccess(tableId);

    return Object.keys(ACCESS_FEATURES)
        .filter(key => access[key] === true)
        .map(key => ACCESS_FEATURES[key]);
}

function getNeedLabels(needs) {
    return needs.map(need => ACCESS_NEEDS[need]?.label || need).join(", ");
}

// Cruza as necessidades do cliente com os recursos da mesa.
// Sem necessidades, qualquer mesa atende.
function tableMeetsNeeds(table, needs) {
    const access = getTableAccess(table.id);

    return needs.every(need => {
        const requirement = ACCESS_NEEDS[need];
        return requirement ? access[requirement.requires] === true : true;
    });
}

// Mesas livres, com capacidade suficiente e compatíveis com as necessidades.
// Ordena da menor para a maior mesa, para não ocupar mesas grandes sem necessidade.
function findSuggestedTables(people, needs) {
    return tables
        .filter(table =>
            table.status === "free" &&
            table.capacity >= people &&
            tableMeetsNeeds(table, needs)
        )
        .sort((a, b) => a.capacity - b.capacity || a.id - b.id);
}

function getSelectedNeeds() {
    return [...document.querySelectorAll('input[name="accessNeeds"]:checked')]
        .map(input => input.value);
}

function getTableTitle(id) {
    return `Mesa ${String(id).padStart(2, "0")}`;
}

// DATA

function updateDate() {
    const date = new Date();

    document.getElementById("currentDate").textContent =
        date.toLocaleDateString("pt-BR", {
            weekday: "long",
            day: "2-digit",
            month: "long",
            year: "numeric"
        });

    document.getElementById("reservationDate").value = getLocalDate();
    document.getElementById("reservationDate").min = getLocalDate();
}

// TABLE MAP

function renderTables() {
    const grid = document.getElementById("tablesGrid");
    grid.innerHTML = "";

    tables.forEach(table => {
        const card = document.createElement("button");
        const access = getTableAccess(table.id);
        const featureLabels = getAccessFeatureLabels(table.id);

        card.type = "button";
        card.className = `table-card ${table.status}`;

        card.setAttribute(
            "aria-label",
            `Mesa ${table.id}, ${STATUS[table.status]}, ${table.capacity} lugares` +
            (featureLabels.length ? `. ${featureLabels.join(", ")}` : "")
        );

        card.innerHTML = `
            <span class="table-number">${String(table.id).padStart(2, "0")}</span>
            <span class="table-status">${STATUS[table.status]}</span>
            <span class="table-capacity">${table.capacity} lugares</span>
            ${access.wheelchair ? '<span class="table-access" aria-hidden="true" title="Acessível para cadeirante">♿</span>' : ""}
        `;

        card.addEventListener("click", () => openTableModal(table.id));

        grid.appendChild(card);
    });

    updateSummary();
    updateReservationOptions();
}

// SUMMARY

function updateSummary() {
    const free = tables.filter(table => table.status === "free").length;
    const occupied = tables.filter(table => table.status === "occupied").length;
    const reserved = tables.filter(table => table.status === "reserved").length;

    document.getElementById("freeCount").textContent = free;
    document.getElementById("occupiedCount").textContent = occupied;
    document.getElementById("reservedCount").textContent = reserved;
    document.getElementById("totalCount").textContent = tables.length;
}

// MODALS

function openModal(id) {
    document.getElementById(id).classList.add("active");
}

function closeModal(id) {
    document.getElementById(id).classList.remove("active");
}

document.querySelectorAll("[data-close]").forEach(button => {
    button.addEventListener("click", () => {
        closeModal(button.dataset.close);
    });
});

document.querySelectorAll(".modal-overlay").forEach(overlay => {
    overlay.addEventListener("click", event => {
        if (event.target === overlay) {
            closeModal(overlay.id);
        }
    });
});

document.addEventListener("keydown", event => {
    if (event.key === "Escape") {
        document.querySelectorAll(".modal-overlay").forEach(modal => {
            modal.classList.remove("active");
        });
    }
});

// RESERVATIONS

document.getElementById("openReservation").addEventListener("click", openReservationModal);

document.getElementById("openReservationBottom").addEventListener("click", openReservationModal);

function openReservationModal() {
    document.getElementById("reservationForm").reset();

    document.getElementById("reservationDate").value = getLocalDate();
    document.getElementById("reservationTime").value = "19:00";

    updateReservationOptions();
    renderSuggestions();
    openModal("reservationModal");
}

// Mesas livres no seletor. Desabilita as que não atendem às necessidades marcadas.
function updateReservationOptions() {
    const select = document.getElementById("reservationTable");
    const previousValue = select.value;
    const needs = getSelectedNeeds();

    select.innerHTML = '<option value="">Selecione uma mesa</option>';

    tables
        .filter(table => table.status === "free")
        .forEach(table => {
            const option = document.createElement("option");
            const meetsNeeds = tableMeetsNeeds(table, needs);

            option.value = table.id;
            option.textContent =
                `Mesa ${table.id} — ${table.capacity} lugares` +
                (meetsNeeds ? "" : " (não atende às necessidades)");
            option.disabled = !meetsNeeds;

            select.appendChild(option);
        });

    if ([...select.options].some(option => option.value === previousValue && !option.disabled)) {
        select.value = previousValue;
    }
}

// Painel com as mesas sugeridas para as necessidades informadas.
function renderSuggestions() {
    const box = document.getElementById("tableSuggestions");
    const select = document.getElementById("reservationTable");
    const needs = getSelectedNeeds();

    box.innerHTML = "";

    if (needs.length === 0) {
        box.hidden = true;
        return;
    }

    const people = Number(document.getElementById("peopleCount").value) || 1;
    const suggested = findSuggestedTables(people, needs);

    box.hidden = false;

    const title = document.createElement("p");
    title.className = "suggestion-title";

    title.textContent = suggested.length
        ? `Mesas sugeridas para: ${getNeedLabels(needs).toLowerCase()}.`
        : "Nenhuma mesa livre atende a todas essas necessidades agora. Tente outro horário ou ajuste as necessidades.";

    box.appendChild(title);

    if (suggested.length === 0) return;

    const list = document.createElement("div");
    list.className = "suggestion-list";

    suggested.forEach(table => {
        const button = document.createElement("button");

        button.type = "button";
        button.className = "suggestion-btn";
        button.textContent = `${getTableTitle(table.id)} — ${table.capacity} lugares`;
        button.setAttribute("aria-pressed", String(String(table.id) === select.value));

        button.addEventListener("click", () => {
            select.value = String(table.id);
            renderSuggestions();
        });

        list.appendChild(button);
    });

    box.appendChild(list);
}

document.querySelectorAll('input[name="accessNeeds"]').forEach(input => {
    input.addEventListener("change", () => {
        updateReservationOptions();
        renderSuggestions();
    });
});

document.getElementById("peopleCount").addEventListener("input", renderSuggestions);

document.getElementById("reservationTable").addEventListener("change", renderSuggestions);

document.getElementById("reservationForm").addEventListener("submit", event => {
    event.preventDefault();

    const name = document.getElementById("customerName").value.trim();
    const date = document.getElementById("reservationDate").value;
    const time = document.getElementById("reservationTime").value;
    const people = Number(document.getElementById("peopleCount").value);
    const tableId = Number(document.getElementById("reservationTable").value);
    const notes = document.getElementById("reservationNotes").value.trim();
    const needs = getSelectedNeeds();

    const table = tables.find(item => item.id === tableId);

    if (!table || table.status !== "free") {
        showToast("Essa mesa não está mais disponível.");
        updateReservationOptions();
        renderSuggestions();
        return;
    }

    if (!name || !date || !time || !people || !tableId) {
        showToast("Preencha todos os campos obrigatórios.");
        return;
    }

    if (date < getLocalDate()) {
        showToast("Selecione uma data válida.");
        return;
    }

    if (people > table.capacity) {
        showToast(`Essa mesa comporta até ${table.capacity} pessoas.`);
        return;
    }

    if (!tableMeetsNeeds(table, needs)) {
        showToast("A mesa escolhida não atende às necessidades de acessibilidade do cliente.");
        return;
    }

    const reservation = {
        id: Date.now(),
        name,
        date,
        time,
        people,
        tableId,
        notes,
        accessNeeds: needs
    };

    reservations.push(reservation);

    table.status = "reserved";
    table.reservationId = reservation.id;

    saveData();
    renderTables();
    renderReservations();

    closeModal("reservationModal");
    showToast("Reserva cadastrada com sucesso!");
});

// RESERVATION LIST

function renderReservations() {
    const list = document.getElementById("reservationsList");
    const today = getLocalDate();

    const todayReservations = reservations
        .filter(item => item.date === today)
        .sort((a, b) => a.time.localeCompare(b.time));

    document.getElementById("reservationCount").textContent =
        todayReservations.length;

    list.innerHTML = "";

    if (todayReservations.length === 0) {
        list.innerHTML = `
            <div class="empty-state">
                <span>♧</span>
                <p>Nenhuma reserva cadastrada para hoje.</p>
            </div>
        `;
        return;
    }

    todayReservations.forEach(reservation => {
        const item = document.createElement("div");
        item.className = "reservation-item";

        const details = document.createElement("div");

        const name = document.createElement("h4");
        name.textContent = reservation.name;

        const tableInfo = document.createElement("p");
        tableInfo.textContent = `Mesa ${reservation.tableId}`;

        const peopleInfo = document.createElement("p");
        peopleInfo.textContent = `${reservation.people} pessoa(s)`;

        details.append(name, tableInfo, peopleInfo);

        if (reservation.accessNeeds?.length) {
            const needsInfo = document.createElement("p");
            needsInfo.className = "reservation-needs";
            needsInfo.textContent = `Acessibilidade: ${getNeedLabels(reservation.accessNeeds)}`;

            details.append(needsInfo);
        }

        const actions = document.createElement("div");

        const time = document.createElement("span");
        time.className = "reservation-time";
        time.textContent = reservation.time;

        const deleteButton = document.createElement("button");
        deleteButton.className = "delete-reservation";
        deleteButton.type = "button";
        deleteButton.textContent = "×";
        deleteButton.setAttribute("aria-label", "Excluir reserva");

        deleteButton.addEventListener("click", () => {
            deleteReservation(reservation.id);
        });

        actions.append(time, deleteButton);
        item.append(details, actions);

        list.appendChild(item);
    });
}

// DELETE RESERVATION

function deleteReservation(id) {
    const reservation = reservations.find(item => item.id === id);

    if (!reservation) return;

    const table = tables.find(item => item.id === reservation.tableId);

    if (table && table.reservationId === id) {
        table.status = "free";
        table.reservationId = null;
    }

    reservations = reservations.filter(item => item.id !== id);

    saveData();
    renderTables();
    renderReservations();

    showToast("Reserva excluída.");
}

// TABLE DETAILS

function openTableModal(id) {
    const table = tables.find(item => item.id === id);

    if (!table) return;

    selectedTableId = id;

    document.getElementById("tableModalTitle").textContent = getTableTitle(id);

    document.getElementById("tableStatus").value = table.status;

    const badge = document.getElementById("currentTableStatus");

    badge.textContent = STATUS[table.status];
    badge.className = `status-badge ${table.status}`;

    const info = document.getElementById("tableReservationInfo");

    const reservation = reservations.find(
        item => item.id === table.reservationId
    );

    info.textContent = "";

    const mainLine = document.createElement("p");

    if (reservation) {
        mainLine.textContent =
            `Cliente: ${reservation.name} | Horário: ${reservation.time} | Pessoas: ${reservation.people}`;
    } else {
        mainLine.textContent =
            `Capacidade: ${table.capacity} lugares. Nenhuma reserva vinculada.`;
    }

    info.append(mainLine);

    if (reservation?.accessNeeds?.length) {
        const needsLine = document.createElement("p");
        needsLine.textContent = `Necessidades de acessibilidade: ${getNeedLabels(reservation.accessNeeds)}.`;
        info.append(needsLine);
    }

    const featureLabels = getAccessFeatureLabels(id);
    const featureLine = document.createElement("p");

    featureLine.textContent = featureLabels.length
        ? `Recursos da mesa: ${featureLabels.join(", ")}.`
        : "Esta mesa não possui recursos de acessibilidade cadastrados.";

    info.append(featureLine);

    openModal("tableModal");
}

// UPDATE TABLE STATUS

document.getElementById("saveTableStatus").addEventListener("click", () => {
    const table = tables.find(item => item.id === selectedTableId);

    if (!table) return;

    const newStatus = document.getElementById("tableStatus").value;

    if (!Object.hasOwn(STATUS, newStatus)) return;

    if (newStatus !== table.status) {
        if (newStatus !== "reserved" && table.reservationId !== null) {
            reservations = reservations.filter(
                item => item.id !== table.reservationId
            );

            table.reservationId = null;
        }

        if (newStatus === "reserved" && table.reservationId === null) {
            showToast("Para reservar, cadastre uma reserva com nome do cliente.");
            return;
        }

        table.status = newStatus;
    }

    saveData();
    renderTables();
    renderReservations();

    closeModal("tableModal");
    showToast("Mesa atualizada com sucesso!");
});

// NOTIFICATIONS

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

// LIGHT AND DARK THEMES

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

// HIGH CONTRAST

const contrastToggle = document.getElementById("highContrastToggle");

function applyHighContrast(enabled) {
    document.body.classList.toggle("high-contrast", enabled);

    contrastToggle.setAttribute("aria-pressed", String(enabled));

    try {
        localStorage.setItem("bosco_high_contrast", enabled ? "1" : "0");
    } catch {
        // Armazenamento indisponível: a preferência vale apenas nesta página.
    }
}

contrastToggle.addEventListener("click", () => {
    applyHighContrast(!document.body.classList.contains("high-contrast"));
});

// INITIALIZATION

function loadHighContrastPreference() {
    try {
        return localStorage.getItem("bosco_high_contrast") === "1";
    } catch {
        return false;
    }
}

updateDate();
applyTheme(localStorage.getItem("bosco_theme") || "light");
applyHighContrast(loadHighContrastPreference());
renderTables();
renderReservations();
renderSuggestions();
