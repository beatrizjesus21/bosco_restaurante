
const TOTAL_TABLES = 12;

const STATUS = {
    free: "Livre",
    occupied: "Ocupada",
    reserved: "Reservada"
};

const CAPACITIES = [2, 4, 4, 2, 6, 4, 2, 4, 6, 2, 4, 6];

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

        card.type = "button";
        card.className = `table-card ${table.status}`;

        card.setAttribute(
            "aria-label",
            `Mesa ${table.id}, ${STATUS[table.status]}`
        );

        card.innerHTML = `
            <span class="table-number">${String(table.id).padStart(2, "0")}</span>
            <span class="table-status">${STATUS[table.status]}</span>
            <span class="table-capacity">${table.capacity} lugares</span>
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
    openModal("reservationModal");
}

function updateReservationOptions() {
    const select = document.getElementById("reservationTable");
    const previousValue = select.value;

    select.innerHTML = '<option value="">Selecione uma mesa</option>';

    tables
        .filter(table => table.status === "free")
        .forEach(table => {
            const option = document.createElement("option");

            option.value = table.id;
            option.textContent = `Mesa ${table.id} — ${table.capacity} lugares`;

            select.appendChild(option);
        });

    if ([...select.options].some(option => option.value === previousValue)) {
        select.value = previousValue;
    }
}

document.getElementById("reservationForm").addEventListener("submit", event => {
    event.preventDefault();

    const name = document.getElementById("customerName").value.trim();
    const date = document.getElementById("reservationDate").value;
    const time = document.getElementById("reservationTime").value;
    const people = Number(document.getElementById("peopleCount").value);
    const tableId = Number(document.getElementById("reservationTable").value);
    const notes = document.getElementById("reservationNotes").value.trim();

    const table = tables.find(item => item.id === tableId);

    if (!table || table.status !== "free") {
        showToast("Essa mesa não está mais disponível.");
        updateReservationOptions();
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

    const reservation = {
        id: Date.now(),
        name,
        date,
        time,
        people,
        tableId,
        notes
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

    document.getElementById("tableModalTitle").textContent =
        `Mesa ${String(id).padStart(2, "0")}`;

    document.getElementById("tableStatus").value = table.status;

    const badge = document.getElementById("currentTableStatus");

    badge.textContent = STATUS[table.status];
    badge.className = `status-badge ${table.status}`;

    const info = document.getElementById("tableReservationInfo");

    const reservation = reservations.find(
        item => item.id === table.reservationId
    );

    if (reservation) {
        info.textContent =
            `Cliente: ${reservation.name} | Horário: ${reservation.time} | Pessoas: ${reservation.people}`;
    } else {
        info.textContent =
            `Capacidade: ${table.capacity} lugares. Nenhuma reserva vinculada.`;
    }

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

// INITIALIZATION

updateDate();
applyTheme(localStorage.getItem("bosco_theme") || "light");
renderTables();
renderReservations();
