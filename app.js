// Основной файл логики ERP ТОО KazBildInvest

// Инициализация данных
let db = JSON.parse(localStorage.getItem("kaz_bild_invest_db")) || initialData;

// Обновляем БД до новой версии с субарендой и страховыми договорами при необходимости
if (!db || !db.vehicles || !db.vehicles.find(v => v.id === "v113")) {
  localStorage.setItem("kaz_bild_invest_db", JSON.stringify(initialData));
  db = JSON.parse(JSON.stringify(initialData)); // Deep copy to avoid reference issues
}

// Гарантируем наличие новых таблиц в БД, если сессия загружена из кэша
if (!db.companies) db.companies = initialData.companies || [];
if (!db.tasks) db.tasks = initialData.tasks || [];
if (!db.driverMessages) db.driverMessages = initialData.driverMessages || [];
if (!db.supplyOrders) db.supplyOrders = initialData.supplyOrders || [];
if (!db.potentialSuppliers) db.potentialSuppliers = initialData.potentialSuppliers || [];
if (!db.blacklist) db.blacklist = initialData.blacklist || [];
if (!db.timesheets) db.timesheets = initialData.timesheets || [];
if (!db.supplierAdvances) db.supplierAdvances = initialData.supplierAdvances || [];
if (!db.currencyRates) db.currencyRates = initialData.currencyRates || { USD: 448.50, EUR: 480.20, RUB: 5.12 };
if (!db.bankBalances) db.bankBalances = initialData.bankBalances || [];
if (!db.safetyCertRequests) db.safetyCertRequests = initialData.safetyCertRequests || [];
if (!db.materialsWriteOffs) db.materialsWriteOffs = initialData.materialsWriteOffs || [];
if (!db.contracts) db.contracts = initialData.contracts || [];
if (!db.gpsAlerts) {
  db.gpsAlerts = [
    { id: "alert_1", vehicleId: "v101", type: "geofence", message: "Автокран Zoomlion (714 ADE 06) покинул геозону объекта Карабатан без путевого листа!", time: "12:10", status: "active" },
    { id: "alert_2", vehicleId: "v107", type: "idling", message: "Простой! Самосвал Shacman (228 KBB 06) заведен более 3 часов на месте без движения.", time: "11:45", status: "active" }
  ];
}

// Глобальные переменные симулятора
let gpsInterval = null;
let isGpsSimulating = true;
let currentWhLevel = 'central';
let currentGanttView = 'days'; // days / hours
let activeCompanyFilter = 'all'; // Фильтр компаний по типу

// Инициализация при загрузке страницы
window.onload = function() {
  initApp();
};

function saveState() {
  localStorage.setItem("kaz_bild_invest_db", JSON.stringify(db));
}

function initApp() {
  document.getElementById("companyNameInput").value = db.settings.companyName;
  document.getElementById("roleSelector").value = db.settings.activeRole;
  
  // Привязка события изменения названия компании
  document.getElementById("companyNameInput").onchange = function() {
    db.settings.companyName = this.value;
    saveState();
  };

  // Отрисовка всех вкладок
  renderAll();
  
  // Инициализация Leafлет карты
  initMap();
  
  // Запуск GPS-симуляции
  startGpsSimulation();
  
  // Применение ролевой модели
  applyRolePermissions();

  // Проверка просроченных задач и отправка уведомлений в бот
  setTimeout(checkOverdueTasks, 1000);
}

// Переключение Вкладок
function switchTab(tabId) {
  document.querySelectorAll(".menu-item").forEach(btn => btn.classList.remove("active"));
  document.querySelectorAll(".tab-pane").forEach(pane => pane.classList.remove("active"));
  
  // Найти кнопку
  const clickedBtn = Array.from(document.querySelectorAll(".menu-item")).find(btn => 
    btn.getAttribute("onclick") && btn.getAttribute("onclick").includes(tabId)
  );
  if (clickedBtn) clickedBtn.classList.add("active");
  
  const targetPane = document.getElementById("tab-" + tabId);
  if (targetPane) targetPane.classList.add("active");
  
  // Авто-закрытие боковой панели на мобильных устройствах
  const sidebar = document.querySelector(".sidebar");
  if (sidebar && sidebar.classList.contains("open")) {
    sidebar.classList.remove("open");
  }
  
  // Обновление заголовка
  const titles = {
    dashboard: "Дашборд и Аналитика",
    crm: "CRM и Продажи",
    dispatch: "Диспетчеризация и Расписание",
    tasks: "Задачи и поручения спецтехнике",
    gps: "GPS-Мониторинг парка",
    dispatcher_hub: "Рабочее место Диспетчера (Логистика и Безопасность)",
    fuel: "Учет ГСМ и «Умный ГСМ»",
    warehouse: "Склад и Цепочки Логистики",
    purchasing_hub: "Снабжение и Закупки (Панель Снабженца)",
    repairs: "Ремонты и ТО спецтехники",
    hr: "HR-Модуль и Допуски",
    timesheet: "Табель учета времени спецтехники и водителей",
    staff: "Единый реестр персонала ТОО KazBildInvest",
    companies: "Реестр контрагентов",
    all_vehicles: "Реестр Автопарка и Учет Затрат",
    contracts_registry: "Реестр договоров и Конструктор шаблонов",
    finance_treasury: "Финансы, Казначейство и Взаиморасчеты",
    settings: "Администрирование и сброс системы"
  };
  document.getElementById("pageTitleDisplay").innerText = titles[tabId] || "Панель управления";
  
  // Обновление специфических элементов табов
  if (tabId === 'dashboard') {
    renderObjectsPnl();
    renderFleetRoiTable();
    updateKpiDashboard();
    renderFinancialChart(window.activeChartPeriod || "year");
  } else if (tabId === 'gps') {
    setTimeout(() => { if (window.map) window.map.invalidateSize(); }, 200);
  } else if (tabId === 'dispatcher_hub') {
    initDispatcherMap();
    setTimeout(() => { if (window.dispatcherMap) window.dispatcherMap.invalidateSize(); }, 200);
    renderDispatcherHub();
  } else if (tabId === 'purchasing_hub') {
    renderPurchasingHub();
  } else if (tabId === 'timesheet') {
    renderTimesheetGrid();
  } else if (tabId === 'staff') {
    renderStaffGrid();
  } else if (tabId === 'all_vehicles') {
    renderAllVehicles();
  } else if (tabId === 'contracts_registry') {
    renderContractsRegistry();
  } else if (tabId === 'finance_treasury') {
    renderFinanceTreasury();
  } else if (tabId === 'settings') {
    renderSettingsDashboard();
  }
}

// Применение ролевой модели доступа
function changeActiveRole() {
  const role = document.getElementById("roleSelector").value;
  db.settings.activeRole = role;
  saveState();
  applyRolePermissions();
  renderAll();
}

function applyRolePermissions() {
  const role = db.settings.activeRole;
  
  // Скрытие вкладок меню по ролям
  const allMenuItems = document.querySelectorAll(".sidebar .menu-item");
  allMenuItems.forEach(item => {
    const clickAttr = item.getAttribute("onclick") || "";
    item.style.display = "flex"; // сброс
    
    if (role === "Warehouse") {
      // Только Склад, Логистика, Компании, Снабжение
      if (!clickAttr.includes("warehouse") && !clickAttr.includes("companies") && !clickAttr.includes("purchasing_hub")) {
        item.style.display = "none";
      }
    } else if (role === "Mechanic") {
      // Ремонты, ТО, Склад, Компании, Задачи, Табель, Автопарк
      if (!clickAttr.includes("repairs") && !clickAttr.includes("warehouse") && !clickAttr.includes("companies") && !clickAttr.includes("tasks") && !clickAttr.includes("timesheet") && !clickAttr.includes("all_vehicles")) {
        item.style.display = "none";
      }
    } else if (role === "HR") {
      // Только HR, Документы, Настройки, Табель, Сотрудники, Автопарк
      if (!clickAttr.includes("hr") && !clickAttr.includes("settings") && !clickAttr.includes("timesheet") && !clickAttr.includes("staff") && !clickAttr.includes("all_vehicles")) {
        item.style.display = "none";
      }
    } else if (role === "Dispatcher") {
      // Только CRM, Диспетчеризация, GPS, ГСМ, Задачи, Пульт Диспетчера, Табель, Автопарк
      if (!clickAttr.includes("crm") && !clickAttr.includes("dispatch") && !clickAttr.includes("gps") && !clickAttr.includes("fuel") && !clickAttr.includes("tasks") && !clickAttr.includes("dispatcher_hub") && !clickAttr.includes("timesheet") && !clickAttr.includes("all_vehicles")) {
        item.style.display = "none";
      }
    } else if (role === "Purchaser") {
      // Только Склад, Логистика, Компании, Снабжение
      if (!clickAttr.includes("warehouse") && !clickAttr.includes("companies") && !clickAttr.includes("purchasing_hub")) {
        item.style.display = "none";
      }
    } else if (role === "Accountant") {
      // Только Дашборд, CRM, HR, Компании, Настройки, Табель, Сотрудники, Финансы, Договоры, Автопарк
      if (!clickAttr.includes("dashboard") && !clickAttr.includes("crm") && !clickAttr.includes("hr") && !clickAttr.includes("companies") && !clickAttr.includes("settings") && !clickAttr.includes("timesheet") && !clickAttr.includes("staff") && !clickAttr.includes("finance_treasury") && !clickAttr.includes("contracts_registry") && !clickAttr.includes("all_vehicles")) {
        item.style.display = "none";
      }
    } else if (role === "Manager") {
      // Только CRM, Диспетчеризация, Задачи, HR, Компании, Настройки, Табель, Сотрудники, Договоры, Автопарк
      if (!clickAttr.includes("crm") && !clickAttr.includes("dispatch") && !clickAttr.includes("tasks") && !clickAttr.includes("hr") && !clickAttr.includes("companies") && !clickAttr.includes("settings") && !clickAttr.includes("timesheet") && !clickAttr.includes("staff") && !clickAttr.includes("contracts_registry") && !clickAttr.includes("all_vehicles")) {
        item.style.display = "none";
      }
    } else if (role === "DeputyDirector") {
      // Все права доступны (как у Директора)
      // Ничего не скрываем
    }
  });

  // Автоматический редирект на разрешенную вкладку, если текущая скрыта
  const activePane = document.querySelector(".tab-pane.active");
  if (activePane) {
    const activeTabId = activePane.id.replace("tab-", "");
    const activeMenuBtn = Array.from(allMenuItems).find(btn => btn.style.display !== "none" && btn.getAttribute("onclick").includes(activeTabId));
    
    if (!activeMenuBtn) {
      // Найти первую доступную кнопку
      const firstAvailable = Array.from(allMenuItems).find(btn => btn.style.display !== "none");
      if (firstAvailable) {
        const targetId = firstAvailable.getAttribute("onclick").match(/'([^']+)'/)[1];
        switchTab(targetId);
      }
    }
  }
}

// ----------------------------------------------------
// МОДУЛЬ 1: CRM, ГАНТ И КОНФЛИКТЫ
// ----------------------------------------------------

// Рендеринг Канбана CRM
function renderCrmKanban() {
  const kanban = document.getElementById("kanbanBoard");
  if (!kanban) return;
  kanban.innerHTML = "";
  
  const stages = [
    { id: "Лид", name: "Запросы / Лиды", color: "#64748B", badgeBg: "#E2E8F0" },
    { id: "КП", name: "Формирование КП", color: "#D97706", badgeBg: "#FEF3C7" },
    { id: "Договор", name: "Согласование и Договор", color: "#8B5CF6", badgeBg: "#F5F3FF" },
    { id: "Назначение", name: "Назначение техники", color: "#4F46E5", badgeBg: "#E0E7FF" },
    { id: "Выполнение работ", name: "Выполнение работ", color: "#2563EB", badgeBg: "#DBEAFE" },
    { id: "Закрытие заказа", name: "АВР и Закрытие", color: "#0D9488", badgeBg: "#CCFBF1" },
    { id: "Оплата", name: "Оплата / Счета", color: "#16A34A", badgeBg: "#DCFCE7" }
  ];
  
  stages.forEach(stage => {
    const col = document.createElement("div");
    col.className = "crm-column";
    col.style.borderTop = `4px solid ${stage.color}`;
    
    col.innerHTML = `
      <div class="crm-column-header" style="color: ${stage.color};">
        <span>${stage.name}</span>
        <span class="crm-column-badge" style="color: ${stage.color};">${db.deals.filter(d => d.stage === stage.id).length}</span>
      </div>
      <div class="kanban-cards-wrapper" style="display: flex; flex-direction: column; gap: 10px;" id="stage-${stage.id}"></div>
    `;
    
    // Add drag and drop listeners to columns
    col.addEventListener("dragover", allowDealDrop);
    col.addEventListener("dragleave", handleDealDragLeave);
    col.addEventListener("drop", (e) => handleDealDrop(e, stage.id));
    
    kanban.appendChild(col);
    
    const wrapper = col.querySelector(".kanban-cards-wrapper");
    db.deals.filter(d => d.stage === stage.id).forEach(deal => {
      const card = document.createElement("div");
      card.className = "crm-card";
      card.id = `deal-card-${deal.id}`;
      card.style.backgroundColor = stage.color;
      card.style.borderColor = stage.color;
      card.style.color = "#ffffff";
      
      // Make card draggable
      card.draggable = true;
      card.addEventListener("dragstart", (e) => handleDealDragStart(e, deal.id));
      card.addEventListener("dragend", handleDealDragEnd);
      
      const site = db.sites.find(s => s.id === deal.siteId);
      const siteName = site ? site.name : "Неизвестно";
      
      card.innerHTML = `
        <div class="crm-card-company" style="color: #ffffff !important;">${deal.companyName}</div>
        <div class="crm-card-meta" style="color: rgba(255, 255, 255, 0.85) !important;">
          <div style="color: rgba(255, 255, 255, 0.85) !important;">Объект: ${siteName}</div>
          <div style="color: rgba(255, 255, 255, 0.85) !important;">Сроки: ${deal.startDate} - ${deal.endDate}</div>
        </div>
        <div class="crm-card-footer">
          <span class="crm-card-price" style="color: #ffffff !important;">${deal.price.toLocaleString()} ₸</span>
          <span class="badge ${deal.contractSigned ? 'badge-success' : 'badge-danger'}" style="font-size: 8px; padding: 2px 4px; background-color: rgba(255, 255, 255, 0.25) !important; color: #ffffff !important; border: 1px solid rgba(255, 255, 255, 0.4) !important;">
            ${deal.contractSigned ? 'Договор подписан' : 'Без договора'}
          </span>
        </div>
      `;
      
      card.onclick = () => openDealDetails(deal.id);
      wrapper.appendChild(card);
    });
  });
}

// Drag and drop handlers for CRM deals
function handleDealDragStart(e, dealId) {
  e.dataTransfer.setData("text/plain", dealId);
  e.dataTransfer.effectAllowed = "move";
  setTimeout(() => {
    const el = document.getElementById(`deal-card-${dealId}`);
    if (el) el.classList.add("dragging");
  }, 0);
}

function handleDealDragEnd(e) {
  e.target.classList.remove("dragging");
  document.querySelectorAll("#kanbanBoard > div").forEach(col => col.classList.remove("drag-over"));
}

function allowDealDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.add("drag-over");
}

function handleDealDragLeave(e) {
  e.currentTarget.classList.remove("drag-over");
}

function handleDealDrop(e, newStage) {
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over");
  
  const dealId = e.dataTransfer.getData("text/plain");
  const deal = db.deals.find(d => d.id === dealId);
  if (!deal) return;

  const oldStage = deal.stage;
  if (oldStage === newStage) return;

  // Validation: Without contract, transition to "Назначение" or later is blocked
  const restrictedStages = ["Назначение", "Выполнение работ", "Закрытие заказа", "Оплата"];
  if (restrictedStages.includes(newStage) && !deal.contractSigned) {
    showSystemNotification(`Ошибка: Перевод сделки "${deal.companyName}" на этап "${newStage}" заблокирован. Сначала необходимо подписать договор.`);
    return;
  }

  // Track history for Undo
  window.crmHistory = window.crmHistory || [];
  window.crmHistory.push({ dealId: deal.id, oldStage: oldStage });

  deal.stage = newStage;
  saveState();
  renderCrmKanban();
  updateKpiDashboard();
  renderObjectsPnl();
  
  showSystemNotification(`Сделка "${deal.companyName}" успешно перемещена в стадию "${newStage}"`);
}


// Карточка деталей сделки
function openDealDetails(dealId) {
  const deal = db.deals.find(d => d.id === dealId);
  if (!deal) return;
  
  const site = db.sites.find(s => s.id === deal.siteId);
  const siteName = site ? site.name : "Неизвестно";
  
  let actionHtml = "";
  if (deal.stage === "Лид") {
    actionHtml = `<button class="btn-primary" onclick="changeDealStage('${deal.id}', 'КП')">Подготовить КП</button>`;
  } else if (deal.stage === "КП") {
    actionHtml = `
      <button class="btn-secondary" onclick="generateKpPrint('${deal.id}')">Сгенерировать КП (PDF)</button>
      <button class="btn-primary" onclick="changeDealStage('${deal.id}', 'Договор')">КП отправлено → Договор</button>
    `;
  } else if (deal.stage === "Договор") {
    actionHtml = `
      <button class="btn-secondary" onclick="signContractInOneClick('${deal.id}')">Подписать договор (в 1 клик)</button>
      <button class="btn-primary" ${!deal.contractSigned ? 'disabled title="Сначала подпишите договор"' : ''} onclick="changeDealStage('${deal.id}', 'Назначение')">Договор заключен → Назначить технику</button>
    `;
  } else if (deal.stage === "Назначение") {
    actionHtml = `
      <button class="btn-primary" onclick="openAssignVehiclesForm('${deal.id}')">Распределить технику в Ганте</button>
    `;
  } else if (deal.stage === "Выполнение работ") {
    actionHtml = `<button class="btn-primary" onclick="changeDealStage('${deal.id}', 'Закрытие заказа')">Завершить работы → АВР</button>`;
  } else if (deal.stage === "Закрытие заказа") {
    actionHtml = `<button class="btn-primary" onclick="signAvrAndInvoice('${deal.id}')">Подписать АВР и Выписать счет</button>`;
  } else if (deal.stage === "Оплата") {
    actionHtml = `<button class="btn-success btn-primary" onclick="markDealAsPaid('${deal.id}')">Зарегистрировать оплату</button>`;
  }
  
  const vehicleListHtml = deal.vehicleIds.map(vId => {
    const v = db.vehicles.find(x => x.id === vId);
    return v ? `<li>${v.name} (${v.plate})</li>` : "";
  }).join("");

  const modalBody = document.getElementById("dealDetailsBody");
  modalBody.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div class="pnl-row"><span>Заказчик:</span><strong>${deal.companyName}</strong></div>
      <div class="pnl-row"><span>Контактное лицо:</span><strong>${deal.contactPerson}</strong></div>
      <div class="pnl-row"><span>Объект:</span><strong>${siteName} (Адрес: ${deal.address})</strong></div>
      <div class="pnl-row"><span>Вид работ:</span><strong>${deal.jobType}</strong></div>
      <div class="pnl-row"><span>Сроки проекта:</span><strong>${deal.startDate} по ${deal.endDate}</strong></div>
      <div class="pnl-row"><span>Стоимость заказа:</span><strong>${deal.price.toLocaleString()} KZT</strong></div>
      <div class="pnl-row"><span>Стадия заказа:</span><span class="badge badge-warning">${deal.stage}</span></div>
      <div class="pnl-row"><span>Договор:</span><strong>
        ${deal.contractSigned 
          ? `<a href="#" onclick="openContractDocument('${deal.id}'); return false;" style="color:var(--brand-color); font-weight:700; text-decoration:underline;" title="Открыть договор в просмотре">${deal.contractNumber}</a>` 
          : `<span style="color:var(--status-danger);">Не подписан</span>`
        }
      </strong></div>
      <div class="pnl-row"><span>Выставленный счет:</span><span class="badge badge-neutral">${deal.invoiceStatus}</span></div>
      <div>
        <h5 style="margin-bottom: 6px; font-weight: 600;">Назначенная техника (${deal.vehicleIds.length} ед.):</h5>
        <ul style="padding-left: 20px; font-size: 13px;">
          ${vehicleListHtml || "<li>Техника еще не назначена</li>"}
        </ul>
      </div>
    </div>
  `;
  
  document.getElementById("dealDetailsTitle").innerText = `Детали сделки: ${deal.companyName}`;
  
  // Кнопки управления
  const actionBtn = document.getElementById("dealActionBtn");
  actionBtn.outerHTML = actionBtn.outerHTML; // очистка обработчиков
  const newActionBtn = document.getElementById("dealActionBtn");
  newActionBtn.innerHTML = actionHtml;
  
  openModal("dealDetailsModal");
}

function changeDealStage(dealId, newStage) {
  const deal = db.deals.find(d => d.id === dealId);
  if (!deal) return;
  
  deal.stage = newStage;
  saveState();
  renderCrmKanban();
  closeModal("dealDetailsModal");
  openDealDetails(dealId);
}

// Генерация КП в печатной форме
function generateKpPrint(dealId) {
  const deal = db.deals.find(d => d.id === dealId);
  if (!deal) return;
  
  const site = db.sites.find(s => s.id === deal.siteId);
  const siteName = site ? site.name : "Неизвестно";
  
  // Расчет стоимости мобилизации
  const dist = siteIdToDistance(deal.siteId);
  const mobilizationCost = dist * 2500; // 2500 KZT за км тралом
  const totalKp = deal.price + mobilizationCost;
  
  const printView = document.getElementById("kpPrintView");
  printView.innerHTML = `
    <div class="kp-header">
      <div>
        <h2 style="font-weight: 700;">ТОО KazBildInvest</h2>
        <p style="font-size: 11px; color: #666;">Казахстан, г. Атырау, пр. Абулхаир Хана 45<br>Тел: +7 (7122) 99-00-11 | БИН: 120540003941</p>
      </div>
      <div style="text-align: right;">
        <h4 style="font-weight: 600; text-transform: uppercase;">Коммерческое предложение</h4>
        <p style="font-size: 12px;">№ КП-${deal.id.split('_')[1]}/2026<br>Дата: 18 июня 2026 г.</p>
      </div>
    </div>
    
    <div style="margin-bottom: 24px;">
      <p><strong>Кому:</strong> Руководству ${deal.companyName}</p>
      <p><strong>В ответ на запрос:</strong> Аренда спецтехники на объект ${siteName}</p>
    </div>
    
    <p style="margin-bottom: 16px;">ТОО «KazBildInvest» выражает Вам свое почтение и предлагает услуги аренды спецтехники со следующими условиями:</p>
    
    <table style="width: 100%; border-collapse: collapse; margin-bottom: 24px; font-size: 13px;">
      <thead>
        <tr style="background-color: #f5f5f5;">
          <th style="border: 1px solid #ddd; padding: 8px; text-align: left;">Описание услуг</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Сроки</th>
          <th style="border: 1px solid #ddd; padding: 8px; text-align: right;">Стоимость (₸)</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">Аренда парка спецтехники для вида работ: ${deal.jobType}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${deal.startDate} - ${deal.endDate}</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${deal.price.toLocaleString()}</td>
        </tr>
        <tr>
          <td style="border: 1px solid #ddd; padding: 8px;">Мобилизация/демобилизация парка техники тралами на объект ${siteName} (Расстояние: ${dist} км)</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">Разово</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${mobilizationCost.toLocaleString()}</td>
        </tr>
        <tr style="font-weight: 700; background-color: #eee;">
          <td colspan="2" style="border: 1px solid #ddd; padding: 8px; text-align: right;">Итого к оплате (без НДС):</td>
          <td style="border: 1px solid #ddd; padding: 8px; text-align: right;">${totalKp.toLocaleString()} ₸</td>
        </tr>
      </tbody>
    </table>
    
    <p>Срок действия предложения: 30 календарных дней.</p>
    
    <div class="kp-stamp-wrapper">
      <p>Генеральный директор ТОО "KazBildInvest": _________________ / Исаев Ж. А. /</p>
      <!-- Факсимиле подписи и печати (симулировано линиями/штампом) -->
      <div style="position: absolute; left: 300px; top: -10px; width: 100px; height: 50px; border: 2px solid rgba(0,0,255,0.4); border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 8px; color: rgba(0,0,255,0.5); transform: rotate(-10deg);">
        ПОДПИСАНО
      </div>
      <div style="position: absolute; left: 320px; top: -20px; width: 100px; height: 100px; border: 3px double rgba(0,0,255,0.4); border-radius: 50%; display: flex; flex-direction: column; align-items: center; justify-content: center; font-size: 7px; color: rgba(0,0,255,0.5); transform: rotate(5deg); font-weight: bold; text-align: center;">
        * KAZBILDINVEST *<br>АТЫРАУ Қ.<br>ТОО
      </div>
    </div>
  `;
  
  openModal("kpPrintModal");
}

function printKp() {
  window.print();
}

function siteIdToDistance(siteId) {
  const distances = { karabatan: 45, karabatan2: 50, makat: 130, inder: 190, zhangala: 280 };
  return distances[siteId] || 100;
}

// Подписание договора в один клик
function signContractInOneClick(dealId) {
  const deal = db.deals.find(d => d.id === dealId);
  if (!deal) return;
  
  deal.contractSigned = true;
  deal.contractNumber = `Д-06/2026-${dealId.split('_')[1]}`;
  saveState();
  renderCrmKanban();
  closeModal("dealDetailsModal");
  openDealDetails(dealId);
  showSystemNotification(`Договор ${deal.contractNumber} успешно подписан и скреплен печатью!`);
}

// Назначение спецтехники в сделку
function openAssignVehiclesForm(dealId) {
  const deal = db.deals.find(d => d.id === dealId);
  if (!deal) return;
  
  // Открыть таб Диспетчеризации для ручного назначения на Ганте
  closeModal("dealDetailsModal");
  switchTab("dispatch");
  showSystemNotification(`Используйте Календарь загрузки (диаграмму Ганта) для назначения машин на сделку ${deal.companyName}.`);
}

// Закрытие заказа с АВР
function signAvrAndInvoice(dealId) {
  const deal = db.deals.find(d => d.id === dealId);
  if (!deal) return;
  
  deal.stage = "Оплата";
  deal.invoiceStatus = "Выставлен счет";
  deal.invoiceDueDate = getFutureDate(14); // Оплата в течение 14 дней
  saveState();
  
  renderCrmKanban();
  renderDebtorsTable();
  closeModal("dealDetailsModal");
  openDealDetails(dealId);
  showSystemNotification(`АВР подписан. Выписана ЭСФ №${dealId.split('_')[1]}-Э и отправлена в 1С:Бухгалтерию.`);
}

// Регистрация оплаты счетов
function markDealAsPaid(dealId) {
  const deal = db.deals.find(d => d.id === dealId);
  if (!deal) return;
  
  deal.stage = "Оплата";
  deal.invoiceStatus = "Оплачено";
  saveState();
  
  renderCrmKanban();
  renderDebtorsTable();
  closeModal("dealDetailsModal");
  showSystemNotification(`Платеж от ${deal.companyName} успешно проведен! Дебиторская задолженность закрыта.`);
}

// Рендеринг Таблицы Дебиторов
function renderDebtorsTable() {
  const table = document.getElementById("debtorsTable");
  if (!table) return;
  
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";
  
  db.deals.filter(d => d.invoiceStatus !== "Не выставлен счет").forEach(deal => {
    const isPaid = deal.invoiceStatus === "Оплачено";
    let statusClass = "badge-neutral";
    let overdueDays = 0;
    
    if (!isPaid && deal.invoiceDueDate) {
      const due = new Date(deal.invoiceDueDate);
      const today = new Date("2026-06-18");
      if (today > due) {
        overdueDays = Math.floor((today - due) / (1000 * 60 * 60 * 24));
        statusClass = "badge-danger";
        deal.invoiceStatus = "Просрочка";
      } else {
        statusClass = "badge-warning";
      }
    } else if (isPaid) {
      statusClass = "badge-success";
    }
    
    // Эскалационный статус
    let escalationText = "Своевременный платеж";
    if (overdueDays > 0) {
      if (overdueDays >= 30) escalationText = "🚨 Юрист (Претензия)";
      else if (overdueDays >= 14) escalationText = "⚠️ Эскалация Директору";
      else if (overdueDays >= 7) escalationText = "📱 Звонок менеджеру";
      else escalationText = "✉️ Отправлено авто-напоминание";
    }
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${deal.companyName}</strong></td>
      <td>${deal.contractNumber || "Без договора"}</td>
      <td><strong>${deal.price.toLocaleString()} ₸</strong></td>
      <td>${deal.invoiceDueDate || "-"}</td>
      <td style="color: ${overdueDays > 0 ? 'var(--status-danger)' : 'inherit'};">${overdueDays > 0 ? overdueDays + ' дней' : 'Нет'}</td>
      <td><span class="badge ${statusClass}">${isPaid ? 'Оплачено' : (overdueDays > 0 ? 'Просрочка' : 'Ждет оплаты')}</span></td>
      <td><span style="font-size:11px; font-weight:600;">${escalationText}</span></td>
    `;
    tbody.appendChild(tr);
  });
}


// ----------------------------------------------------
// МОДУЛЬ 3: ДИСпетчеризация (ДИАГРАММА ГАНТА)
// ----------------------------------------------------

function setGanttView(view) {
  currentGanttView = view;
  document.getElementById("ganttViewDaysBtn").classList.toggle("active", view === 'days');
  document.getElementById("ganttViewHoursBtn").classList.toggle("active", view === 'hours');
  renderGanttChart();
}

// Построение Диаграммы Ганта
function renderGanttChart() {
  const wrapper = document.getElementById("ganttChartWrapper");
  if (!wrapper) return;
  
  wrapper.innerHTML = "";
  
  const header = document.createElement("div");
  header.className = "gantt-header";
  
  const labelCol = document.createElement("div");
  labelCol.className = "gantt-label-col";
  labelCol.innerHTML = `<strong>Спецтехника (24 ед.)</strong>`;
  header.appendChild(labelCol);
  
  const timelineCol = document.createElement("div");
  timelineCol.className = "gantt-timeline-col";
  
  const today = new Date("2026-06-18");
  
  // Генерация ячеек шапки (Days / Hours)
  let cellCount = currentGanttView === 'days' ? 14 : 24;
  for (let i = 0; i < cellCount; i++) {
    const cell = document.createElement("div");
    cell.className = "gantt-header-cell";
    
    if (currentGanttView === 'days') {
      const nextDate = new Date(today);
      nextDate.setDate(today.getDate() + i);
      const day = nextDate.getDate();
      const month = nextDate.getMonth() + 1;
      cell.innerText = `${day}/${month}`;
    } else {
      cell.innerText = `${i}:00`;
    }
    timelineCol.appendChild(cell);
  }
  header.appendChild(timelineCol);
  wrapper.appendChild(header);
  
  // Строки для каждой техники
  db.vehicles.forEach(vehicle => {
    const row = document.createElement("div");
    row.className = "gantt-row";
    
    const label = document.createElement("div");
    label.className = "gantt-label-col";
    
    const driver = db.drivers.find(d => d.id === vehicle.driverId);
    const driverName = driver ? driver.name : "Нет водителя";
    const statusClass = vehicle.status === 'Работает' ? 'badge-success' : (vehicle.status === 'На ТО' || vehicle.status === 'На ремонте' ? 'badge-danger' : 'badge-neutral');
    
    label.innerHTML = `
      <div style="font-weight:600; display:flex; justify-content:space-between; align-items:center;">
        <span>${vehicle.invNumber}</span>
        <span class="badge ${statusClass}" style="font-size:7px; padding:1px 3px;">${vehicle.status}</span>
      </div>
      <span class="gantt-label-sub">${vehicle.name}</span>
      <span class="gantt-label-sub" style="color:var(--text-secondary); font-size:9px;">Водитель: ${driverName}</span>
    `;
    row.appendChild(label);
    
    const timeline = document.createElement("div");
    timeline.className = "gantt-timeline-col";
    timeline.style.height = "52px";
    
    // Подложка ячеек сетки
    for (let i = 0; i < cellCount; i++) {
      const cell = document.createElement("div");
      cell.className = "gantt-cell";
      // Клик по пустой ячейке для быстрого бронирования
      cell.onclick = () => quickBookVehicle(vehicle.id, i);
      timeline.appendChild(cell);
    }
    
    // Рендеринг активных отрезков занятости
    db.deals.forEach(deal => {
      if (deal.vehicleIds.includes(vehicle.id)) {
        const dealStart = new Date(deal.startDate);
        const dealEnd = new Date(deal.endDate);
        
        // Разница дней от сегодня (18 июня 2026)
        const diffStart = Math.floor((dealStart - today) / (1000 * 60 * 60 * 24));
        const diffEnd = Math.floor((dealEnd - today) / (1000 * 60 * 60 * 24));
        
        if (diffStart < cellCount && diffEnd >= 0) {
          const startCell = Math.max(0, diffStart);
          const endCell = Math.min(cellCount - 1, diffEnd);
          const widthCells = (endCell - startCell) + 1;
          
          const bar = document.createElement("div");
          bar.className = "gantt-bar";
          if (vehicle.ownerType === 'subrent') bar.classList.add("subrent");
          
          bar.style.left = `${startCell * 80 + 4}px`;
          bar.style.width = `${widthCells * 80 - 8}px`;
          bar.innerText = deal.companyName;
          
          bar.onclick = (e) => {
            e.stopPropagation();
            openDealDetails(deal.id);
          };
          
          timeline.appendChild(bar);
        }
      }
    });

    // Отрезки ТО (Тех обслуживание)
    if (vehicle.status === "На ТО" && currentGanttView === 'days') {
      const bar = document.createElement("div");
      bar.className = "gantt-bar maintenance";
      bar.style.left = `0px`;
      bar.style.width = `160px`; // Блокировка на 2 дня
      bar.innerText = "Плановое ТО";
      timeline.appendChild(bar);
    }
    
    row.appendChild(timeline);
    wrapper.appendChild(row);
  });
}

// Быстрое бронирование / Конфликты
function quickBookVehicle(vehicleId, cellIndex) {
  const vehicle = db.vehicles.find(v => v.id === vehicleId);
  if (!vehicle) return;
  
  // Проверка блокировок
  if (vehicle.status === "На ремонте" || vehicle.status === "Неисправна") {
    alert(`Ошибка! Техника находится на ремонте и не может быть назначена на работы.`);
    return;
  }
  
  // Проверка просрочки документов водителя
  const driver = db.drivers.find(d => d.id === vehicle.driverId);
  if (driver && driver.isBlocked) {
    alert(`Блокировка! У машиниста ${driver.name} просрочен медосмотр или корочки ТБ! Допуск заблокирован.`);
    return;
  }
  
  // Проверка ТО
  if (vehicle.engineHours >= 5000 && vehicle.id === 'v102') {
    alert(`Внимание! Кран №102 заблокирован в календаре для прохождения ТО-5000.`);
    return;
  }

  // Создать тестовый заказ на выбранный день
  const today = new Date("2026-06-18");
  const bookDate = new Date(today);
  bookDate.setDate(today.getDate() + cellIndex);
  const dateStr = bookDate.toISOString().split('T')[0];

  // Контроль Двойного Бронирования
  const conflictDeal = db.deals.find(deal => {
    if (deal.vehicleIds.includes(vehicleId)) {
      const ds = new Date(deal.startDate);
      const de = new Date(deal.endDate);
      return (bookDate >= ds && bookDate <= de);
    }
    return false;
  });

  if (conflictDeal) {
    alert(`Конфликт! Техника ${vehicle.name} занята на объекте ${conflictDeal.address} до ${conflictDeal.endDate}`);
    return;
  }

  // Контроль машиниста
  const driverConflict = db.deals.find(deal => {
    return deal.vehicleIds.some(vId => {
      const v = db.vehicles.find(x => x.id === vId);
      if (v && v.driverId === vehicle.driverId) {
        const ds = new Date(deal.startDate);
        const de = new Date(deal.endDate);
        return (bookDate >= ds && bookDate <= de);
      }
      return false;
    });
  });

  if (driverConflict) {
    alert(`Конфликт! Машинист ${driver.name} уже назначен на другую машину на объекте ${driverConflict.address} в этот день.`);
    return;
  }

  // Если конфликтов нет, создаем быстрый лид
  const newDeal = {
    id: "deal_" + (db.deals.length + 1),
    companyName: "Новый Заказ (Быстрый)",
    contactPerson: "Диспетчер",
    siteId: vehicle.currentSiteId,
    address: vehicle.currentSiteId.toUpperCase(),
    jobType: "Аренда техники",
    startDate: dateStr,
    endDate: dateStr,
    vehicleCount: 1,
    vehicleIds: [vehicleId],
    price: 150000,
    stage: "Лид",
    contractNumber: "",
    contractSigned: false,
    invoiceStatus: "Не выставлен счет"
  };

  db.deals.push(newDeal);
  saveState();
  renderCrmKanban();
  renderGanttChart();
  showSystemNotification(`Создана бронь для ${vehicle.name} на ${dateStr}`);
}


// ----------------------------------------------------
// МОДУЛЬ 4: GPS И КАРТЫ
// ----------------------------------------------------

function initMap() {
  if (window.map) return;
  
  // Координаты центра Атырауского региона
  const centralKaz = [47.116, 52.848];
  
  window.map = L.map('map-container').setView(centralKaz, 8);
  
  // Динамический выбор слоя по теме
  const theme = document.documentElement.getAttribute("data-theme") || "light";
  const mapUrl = theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    
  window.lightTiles = L.tileLayer(mapUrl, {
    attribution: '&copy; CartoDB'
  }).addTo(window.map);
  
  // Рисуем геозоны объектов
  window.geofenceLayers = {};
  db.sites.forEach(site => {
    const polygon = L.polygon(site.polygon, {
      color: site.id === 'karabatan2' ? '#FF5722' : '#2196F3',
      fillColor: site.id === 'karabatan2' ? '#FF5722' : '#2196F3',
      fillOpacity: 0.15,
      weight: 2
    }).addTo(window.map);
    
    polygon.bindTooltip(`Геозона: ${site.name}`, { permanent: false, direction: "center" });
    window.geofenceLayers[site.id] = polygon;
  });

  // Маркеры техники
  window.vehicleMarkers = {};
  db.vehicles.forEach(v => {
    const site = db.sites.find(s => s.id === v.currentSiteId);
    const lat = site ? site.lat + (Math.random() - 0.5) * 0.05 : 47.116;
    const lng = site ? site.lng + (Math.random() - 0.5) * 0.05 : 52.848;
    
    let pulseClass = 'marker-pulse-own';
    if (v.ownerType === 'subrent') pulseClass = 'marker-pulse-subrent';
    if (v.status === 'На ремонте' || v.status === 'Неисправна') pulseClass = 'marker-pulse-repair';
    
    const customIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="position:relative;">
          <div class="${pulseClass}"></div>
          <div class="vehicle-label-tag">${v.plate}</div>
        </div>
      `,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(window.map);
    const driver = db.drivers.find(d => d.id === v.driverId);
    
    marker.bindPopup(`
      <div style="font-family:'Inter',sans-serif; font-size:11px;">
        <strong>${v.name}</strong><br>
        Госномер: ${v.plate}<br>
        Инв. №: ${v.invNumber}<br>
        Машинист: ${driver ? driver.name : 'Нет'}<br>
        Статус: <strong>${v.status}</strong><br>
        Топливо: 85% | Скорость: <span id="popup-speed-${v.id}">12</span> км/ч
      </div>
    `);
    
    window.vehicleMarkers[v.id] = { marker, lat, lng, targetSiteId: v.currentSiteId };
  });
}

// Запуск симуляции GPS передвижений
function startGpsSimulation() {
  if (gpsInterval) clearInterval(gpsInterval);
  
  gpsInterval = setInterval(() => {
    if (!isGpsSimulating) return;
    
    db.vehicles.forEach(v => {
      const markerInfo = window.vehicleMarkers[v.id];
      if (!markerInfo) return;
      
      // Логика перемещения спецтехники
      if (v.status === 'Работает' || v.status === 'В пути') {
        // Небольшое смещение координат для имитации движения в геозоне
        markerInfo.lat += (Math.random() - 0.5) * 0.002;
        markerInfo.lng += (Math.random() - 0.5) * 0.002;
        markerInfo.marker.setLatLng([markerInfo.lat, markerInfo.lng]);
        
        // Рандомная скорость
        const speed = Math.floor(5 + Math.random() * 20);
        const speedSpan = document.getElementById(`popup-speed-${v.id}`);
        if (speedSpan) speedSpan.innerText = speed;
      }
    });
  }, 3000);
}

// Симуляция СЛУЧАЙНОГО выезда за геозону (Нарушение)
function simulateGeofenceExit() {
  const v = db.vehicles[0]; // Возьмем первую машину (Кран Zoomlion)
  const markerInfo = window.vehicleMarkers[v.id];
  if (!markerInfo) return;
  
  // Передвигаем маркер далеко за пределы Карабатана
  markerInfo.lat = 47.500;
  markerInfo.lng = 53.500;
  markerInfo.marker.setLatLng([markerInfo.lat, markerInfo.lng]);
  window.map.setView([47.500, 53.500], 10);
  
  logGpsAlert(`Внимание! Автокран Zoomlion (${v.plate}) покинул геозону объекта Карабатан без путевого листа!`, 'danger');
}

// Симуляция простоя с включенным мотором
function simulateIdling() {
  const v = db.vehicles[2]; // CAT 320
  logGpsAlert(`Простой! Экскаватор CAT 320 (${v.plate}) заведен более 3 часов на месте. Механику участка отправлено пуш-уведомление.`, 'warning');
}

function logGpsAlert(message, type) {
  const alertsLog = document.getElementById("gpsAlertsLog");
  if (!alertsLog) return;
  
  const time = new Date().toTimeString().split(' ')[0].substring(0, 5);
  const alertItem = document.createElement("div");
  alertItem.className = `alert-log-item ${type === 'danger' ? 'danger' : ''}`;
  alertItem.innerHTML = `
    <span>${message}</span>
    <strong style="font-size:10px; margin-left:12px;">${time}</strong>
  `;
  alertsLog.prepend(alertItem);
  showSystemNotification(message);
}

function toggleGpsMovementSimulation() {
  isGpsSimulating = !isGpsSimulating;
  showSystemNotification(isGpsSimulating ? "GPS симуляция движения включена" : "GPS симуляция приостановлена");
}

function renderGpsVehicleList() {
  const container = document.getElementById("gpsVehicleList");
  if (!container) return;
  
  container.innerHTML = "";
  
  const searchVal = (document.getElementById("gpsVehicleSearch")?.value || "").trim().toLowerCase();
  
  db.vehicles.forEach(v => {
    if (searchVal) {
      const nameMatch = v.name && v.name.toLowerCase().includes(searchVal);
      const plateMatch = v.plate && v.plate.toLowerCase().includes(searchVal);
      const invMatch = v.invNumber && v.invNumber.toLowerCase().includes(searchVal);
      if (!nameMatch && !plateMatch && !invMatch) {
        return;
      }
    }
    
    let color = '#2E7D32'; 
    if (v.ownerType === 'subrent') color = '#9C27B0'; 
    if (v.status === 'На ремонте' || v.status === 'Неисправна') color = '#C62828'; 
    
    const item = document.createElement("div");
    item.className = "vehicle-list-item";
    item.style.cssText = `
      padding: 10px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background-color: var(--bg-card);
      cursor: pointer;
      display: flex;
      flex-direction: column;
      gap: 4px;
      transition: all 0.2s ease;
    `;
    
    item.addEventListener('mouseenter', () => {
      item.style.backgroundColor = 'var(--bg-secondary)';
      item.style.borderColor = 'var(--brand-color)';
    });
    item.addEventListener('mouseleave', () => {
      item.style.backgroundColor = 'var(--bg-card)';
      item.style.borderColor = 'var(--border-color)';
    });
    
    item.addEventListener('click', () => {
      const markerInfo = window.vehicleMarkers[v.id];
      if (markerInfo && window.map) {
        window.map.setView([markerInfo.lat, markerInfo.lng], 12);
        markerInfo.marker.openPopup();
      }
    });
    
    const driver = db.drivers.find(d => d.id === v.driverId);
    
    item.innerHTML = `
      <div style="display: flex; align-items: center; justify-content: space-between;">
        <span style="font-weight: 600; font-size: 13px; color: var(--text-primary); text-overflow: ellipsis; white-space: nowrap; overflow: hidden; max-width: 80%;">${v.name}</span>
        <div style="background-color: ${color}; width: 8px; height: 8px; border-radius: 50%;" title="${v.ownerType === 'subrent' ? 'Субаренда' : 'Собственная'}"></div>
      </div>
      <div style="display: flex; justify-content: space-between; font-size: 11px; color: var(--text-secondary);">
        <span>${v.plate}</span>
        <span>Инв. № ${v.invNumber}</span>
      </div>
      <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; margin-top: 2px;">
        <span style="color: var(--text-secondary); text-overflow: ellipsis; white-space: nowrap; overflow: hidden; max-width: 60%;">${driver ? driver.name.split(' ')[0] : 'Нет водителя'}</span>
        <span class="badge ${v.status === 'На ремонте' || v.status === 'Неисправна' ? 'badge-danger' : (v.status === 'Работает' || v.status === 'В пути' ? 'badge-success' : 'badge-neutral')}" style="font-size: 9px; padding: 2px 4px; text-transform: none;">
          ${v.status}
        </span>
      </div>
    `;
    
    container.appendChild(item);
  });
}

function filterGpsVehicleList() {
  renderGpsVehicleList();
}


// ----------------------------------------------------
// МОДУЛЬ 5: УЧЕТ ГСМ И АВТОМАТИЗАЦИЯ КОНТРОЛЯ СЛИВОВ
// ----------------------------------------------------

function renderFuelTable() {
  const table = document.getElementById("fuelVerificationTable");
  if (!table) return;
  
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";
  
  // Симуляция данных сверки смены
  // Сформируем список смен
  const shiftLogs = [
    { vehicleId: "v101", driverId: "d101", vStart: 120, vEnd: 195, vFill: 120, N: 12.5, tHours: 3.5, delta: 0.5, status: "Норма" },
    { vehicleId: "v103", driverId: "d103", vStart: 300, vEnd: 170, vFill: 0, N: 15.0, tHours: 8.0, delta: 10.0, status: "Подозрение на слив" },
    { vehicleId: "v107", driverId: "d107", vStart: 450, vEnd: 460, vFill: 250, N: 28.0, tHours: 8.5, delta: 2.0, status: "Норма" }
  ];
  
  shiftLogs.forEach(log => {
    const v = db.vehicles.find(x => x.id === log.vehicleId);
    const d = db.drivers.find(x => x.id === log.driverId);
    if (!v || !d) return;
    
    // Формула дельты
    const calculatedUsed = log.N * log.tHours;
    const formulaEnd = log.vStart + log.vFill - calculatedUsed;
    const deltaLiters = Math.abs(formulaEnd - log.vEnd);
    const deltaPercent = ((deltaLiters / log.vStart) * 100).toFixed(1);
    
    const isTheft = log.status === "Подозрение на слив";
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${v.invNumber}</strong><br><span style="font-size:11px;color:var(--text-secondary);">${v.name}</span></td>
      <td>${d.name}</td>
      <td>${log.vStart}л / ${log.vEnd}л</td>
      <td>+${log.vFill}л (Чеки АЗС)</td>
      <td>${log.tHours} ч</td>
      <td>${log.N} л/ч</td>
      <td><strong style="color: ${isTheft ? 'var(--status-danger)' : 'var(--status-success)'};">${deltaLiters.toFixed(1)} л (${deltaPercent}%)</strong></td>
      <td><span class="badge ${isTheft ? 'badge-danger' : 'badge-success'}">${log.status}</span></td>
      <td>
        ${isTheft ? `<button class="btn-primary" style="font-size:11px; padding:4px 8px; background-color:var(--status-danger);" onclick="processFuelTheftDeduction('${d.id}', ${deltaLiters})">Списать ЗП</button>` : `<span class="badge badge-neutral" style="font-size:10px;">Проверено</span>`}
      </td>
    `;
    tbody.appendChild(tr);
  });
}

// Проведение списания
function processFuelTheftDeduction(driverId, liters) {
  const driver = db.drivers.find(d => d.id === driverId);
  if (!driver) return;
  
  const pricePerLiter = 295;
  const totalFine = Math.round(liters * pricePerLiter);
  
  driver.fuelDeduction += totalFine;
  saveState();
  
  renderFuelTable();
  renderEmployeesTable();
  showSystemNotification(`Зафиксировано удержание ГСМ с водителя ${driver.name} на сумму ${totalFine.toLocaleString()} ₸ (Слив ${liters.toFixed(1)} л)`);
}

function simulateNormalFuelClose() {
  showSystemNotification("Смена закрыта успешно. Расхождения ГСМ в пределах нормы (ΔV = +0.8%).");
}

function simulateFuelTheftClose() {
  // Вызываем списание ГСМ на водителя Жусупова
  processFuelTheftDeduction('d103', 18.5);
}


// ----------------------------------------------------
// МОДУЛЬ 6: СКЛАД, РЕМОНТЫ И ТО
// ----------------------------------------------------

function switchWarehouseLevel(level) {
  currentWhLevel = level;
  document.getElementById("wh-level-central").classList.toggle("active", level === 'central');
  document.getElementById("wh-level-sites").classList.toggle("active", level === 'sites');
  document.getElementById("wh-level-board").classList.toggle("active", level === 'board');
  
  renderWarehouseInventory();
}

function renderWarehouseInventory() {
  const table = document.getElementById("inventoryTable");
  if (!table) return;
  
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";
  
  const titleDisplay = document.getElementById("warehouseTitle");
  
  if (currentWhLevel === 'central') {
    titleDisplay.innerText = "Остатки ТМЦ: Центральный склад (г. Атырау)";
    db.warehouses.central.forEach(item => {
      const isLow = item.balance <= item.minStock;
      
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${item.sku}</strong></td>
        <td>${item.name}</td>
        <td>${item.category}</td>
        <td>Центральный склад</td>
        <td style="font-weight:700; color: ${isLow ? 'var(--status-danger)' : 'inherit'};">${item.balance} шт</td>
        <td>${item.minStock} шт</td>
        <td>${item.supplier || "Не указан"}</td>
        <td><span class="badge ${isLow ? 'badge-danger' : 'badge-success'}">${isLow ? 'Дефицит (Закуп)' : 'Норма'}</span></td>
      `;
      tbody.appendChild(tr);
    });
  } else if (currentWhLevel === 'sites') {
    titleDisplay.innerText = "Остатки ТМЦ: Локальные склады на объектах";
    Object.keys(db.warehouses.sites).forEach(siteId => {
      const site = db.sites.find(s => s.id === siteId);
      const siteName = site ? site.name : siteId.toUpperCase();
      const items = db.warehouses.sites[siteId];
      
      if (items.length === 0) {
        const tr = document.createElement("tr");
        tr.innerHTML = `<td colspan="8" style="text-align:center; color:var(--text-secondary);">Склад объекта ${siteName} пуст</td>`;
        tbody.appendChild(tr);
      }
      
      items.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${item.sku}</strong></td>
          <td>${item.name}</td>
          <td>${item.category}</td>
          <td>Склад: ${siteName}</td>
          <td style="font-weight:700;">${item.balance} шт</td>
          <td>-</td>
          <td>Локальный запас</td>
          <td><span class="badge badge-success">Норма</span></td>
        `;
        tbody.appendChild(tr);
      });
    });
  } else if (currentWhLevel === 'board') {
    titleDisplay.innerText = "Остатки ТМЦ: Бортовой запас ремкомплектов спецтехники";
    Object.keys(db.warehouses.board).forEach(vId => {
      const v = db.vehicles.find(x => x.id === vId);
      const vehicleName = v ? `${v.invNumber} (${v.plate})` : vId;
      const items = db.warehouses.board[vId];
      
      items.forEach(item => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
          <td><strong>${item.sku}</strong></td>
          <td>${item.name}</td>
          <td>Расходники</td>
          <td>Борт: ${vehicleName}</td>
          <td style="font-weight:700;">${item.balance} шт</td>
          <td>-</td>
          <td>В кабине машиниста</td>
          <td><span class="badge badge-neutral">В наличии</span></td>
        `;
        tbody.appendChild(tr);
      });
    });
  }
}

// Приход запчастей (Закуп)
function submitReceivePart() {
  const select = document.getElementById("receivePartSelect");
  const qty = parseInt(document.getElementById("receiveQty").value);
  
  const item = db.warehouses.central.find(i => i.sku === select.value);
  if (item) {
    item.balance += qty;
    saveState();
    renderWarehouseInventory();
    closeModal("receivePartModal");
    showSystemNotification(`Поступило на склад: ${item.name} в количестве ${qty} шт.`);
  }
}

// Перемещение запчастей
function submitTransferPart() {
  const select = document.getElementById("transferPartSelect");
  const fromWh = document.getElementById("transferFromSelect").value;
  const toWh = document.getElementById("transferToSelect").value;
  const qty = parseInt(document.getElementById("transferQty").value);
  
  // Уменьшаем баланс источника
  let success = false;
  if (fromWh === 'central') {
    const item = db.warehouses.central.find(i => i.sku === select.value);
    if (item && item.balance >= qty) {
      item.balance -= qty;
      success = true;
    }
  } else {
    const siteItems = db.warehouses.sites[fromWh];
    const item = siteItems ? siteItems.find(i => i.sku === select.value) : null;
    if (item && item.balance >= qty) {
      item.balance -= qty;
      success = true;
    }
  }
  
  if (!success) {
    alert("Недостаточно деталей на складе-источнике!");
    return;
  }
  
  // Увеличиваем баланс получателя
  if (toWh === 'board') {
    const vId = document.getElementById("transferBoardVehicleSelect").value;
    if (!db.warehouses.board[vId]) db.warehouses.board[vId] = [];
    const boardItems = db.warehouses.board[vId];
    const item = boardItems.find(i => i.sku === select.value);
    if (item) item.balance += qty;
    else {
      const refItem = db.warehouses.central.find(x => x.sku === select.value);
      boardItems.push({ sku: select.value, name: refItem.name, balance: qty });
    }
  } else {
    if (!db.warehouses.sites[toWh]) db.warehouses.sites[toWh] = [];
    const siteItems = db.warehouses.sites[toWh];
    const item = siteItems.find(i => i.sku === select.value);
    if (item) item.balance += qty;
    else {
      const refItem = db.warehouses.central.find(x => x.sku === select.value);
      siteItems.push({ id: refItem.id, sku: select.value, name: refItem.name, category: refItem.category, price: refItem.price, balance: qty });
    }
  }
  
  saveState();
  renderWarehouseInventory();
  closeModal("transferPartModal");
  showSystemNotification("Перемещение ТМЦ успешно выполнено!");
}

// Заявка на закуп ТМЦ (Снабжение)
function submitRequisition() {
  const select = document.getElementById("reqPartSelect");
  const qty = parseInt(document.getElementById("reqQty").value);
  const lead = parseInt(document.getElementById("reqLeadTime").value);
  
  // Имитация заявки снабжения
  showSystemNotification(`Создана заявка снабжения на ${select.value} (${qty} шт). Ожидаемый срок поставки: ${lead} дней.`);
  closeModal("requisitionModal");
}

// Рендеринг Логистической Воронки
function renderLogisticsPipeline() {
  const container = document.getElementById("logisticsPipeline");
  if (!container) return;
  container.innerHTML = "";
  
  const stages = ["Заявка", "Выезд", "В пути", "Погрузка", "Разгрузка", "На объекте"];
  
  stages.forEach(stage => {
    const col = document.createElement("div");
    col.className = "col-2 card";
    col.style.padding = "10px";
    col.style.minHeight = "120px";
    col.style.backgroundColor = "var(--bg-secondary)";
    
    const itemsHtml = db.logistics.filter(l => l.stage === stage).map(item => `
      <div class="card" style="padding:10px; margin-bottom:0; font-size:11px;">
        <strong>${item.partName}</strong><br>
        Маршрут: ${item.transport}<br>
        Статус: ${item.status}
      </div>
    `).join("");
    
    col.innerHTML = `
      <div style="font-size:9px; font-weight:700; text-transform:uppercase; color:var(--text-secondary); margin-bottom:8px;">${stage}</div>
      <div style="display:flex; flex-direction:column; gap:8px;">${itemsHtml || '<span style="font-size:10px;color:#999;">Пусто</span>'}</div>
    `;
    container.appendChild(col);
  });
}


// ----------------------------------------------------
// МОДУЛЬ 7: РЕМОНТЫ И ПЛАНОВОЕ ТО
// ----------------------------------------------------

function renderRepairsTable() {
  const table = document.getElementById("repairsTable");
  if (!table) return;
  
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";
  
  db.repairs.forEach(rep => {
    const v = db.vehicles.find(x => x.id === rep.vehicleId);
    const site = db.sites.find(s => s.id === rep.siteId);
    const siteName = site ? site.name : "База";
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${v ? v.invNumber : '???'}</strong><br><span style="font-size:11px;color:var(--text-secondary);">${v ? v.name : ''}</span></td>
      <td>${siteName}</td>
      <td>${rep.description}</td>
      <td>
        <span class="badge ${rep.faultByDriver ? 'badge-danger' : 'badge-neutral'}">
          ${rep.faultByDriver ? 'Да (МО)' : 'Нет'}
        </span>
      </td>
      <td><strong>${rep.damageCost ? rep.damageCost.toLocaleString() + ' ₸' : '0 ₸'}</strong></td>
      <td>${rep.partsRequested.map(p => p.name + ' (' + p.qty + 'шт)').join(', ') || 'Нет'}</td>
      <td><span class="badge badge-warning">${rep.status}</span></td>
      <td>
        <button class="btn-primary" style="font-size:11px; padding:4px 8px;" onclick="openRepairManage('${rep.id}')">Редактировать</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openRepairManage(repId) {
  const rep = db.repairs.find(r => r.id === repId);
  if (!rep) return;
  
  const body = document.getElementById("repairManageBody");
  body.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:16px;">
      <p><strong>Описание проблемы:</strong> ${rep.description}</p>
      <div class="form-group">
        <label class="form-label">Статус ремонта</label>
        <select id="manageRepairStatus" class="form-control">
          <option value="Диагностика" ${rep.status==='Диагностика'?'selected':''}>Диагностика</option>
          <option value="Запчасти" ${rep.status==='Запчасти'?'selected':''}>Заказ запчастей</option>
          <option value="Ремонт" ${rep.status==='Ремонт'?'selected':''}>В процессе ремонта</option>
          <option value="Испытания" ${rep.status==='Испытания'?'selected':''}>Испытания</option>
          <option value="Готово" ${rep.status==='Готово'?'selected':''}>Вернуть в строй</option>
        </select>
      </div>
      
      <div class="form-group">
        <label class="form-label">Потребуются запчасти со склада</label>
        <select id="manageRepairPart" class="form-control">
          <option value="FIL-OIL-201">Фильтр масляный CAT 320</option>
          <option value="HOS-HYD-002">Рукав высокого давления (РВД) 1.5м</option>
        </select>
      </div>
    </div>
  `;
  
  document.getElementById("repairUpdateBtn").onclick = function() {
    const status = document.getElementById("manageRepairStatus").value;
    const sku = document.getElementById("manageRepairPart").value;
    
    rep.status = status;
    
    if (status === 'Готово') {
      // Вернуть технику в строй
      const v = db.vehicles.find(x => x.id === rep.vehicleId);
      if (v) v.status = 'Свободна';
      
      // Списать со склада
      const whItem = db.warehouses.central.find(i => i.sku === sku);
      if (whItem && whItem.balance > 0) {
        whItem.balance--;
      }
    }
    
    saveState();
    renderRepairsTable();
    renderWarehouseInventory();
    renderGanttChart();
    closeModal("repairManageModal");
    showSystemNotification("Ремонт обновлен!");
  };
  
  openModal("repairManageModal");
}

function submitCreateRepair() {
  const vId = document.getElementById("repairVehicleSelect").value;
  const desc = document.getElementById("repairDescription").value;
  const isFault = document.getElementById("repairFaultByDriver").checked;
  const cost = parseInt(document.getElementById("repairDamageCost").value) || 0;
  
  const v = db.vehicles.find(x => x.id === vId);
  
  const newRepair = {
    id: "rep_" + (db.repairs.length + 1),
    vehicleId: vId,
    siteId: v ? v.currentSiteId : "karabatan",
    driverId: v ? v.driverId : "",
    description: desc,
    status: "Диагностика",
    createdAt: new Date().toISOString().split('T')[0],
    faultByDriver: isFault,
    damageCost: cost,
    explanatoryAttached: isFault,
    partsRequested: [],
    laborCost: 20000
  };
  
  if (v) v.status = "На ремонте";
  
  // Если вина водителя
  if (isFault && cost > 0 && v) {
    db.payrollDeductions.push({
      id: "pd_" + (db.payrollDeductions.length + 1),
      driverId: v.driverId,
      type: "Порча имущества спецтехники",
      amount: cost,
      date: newRepair.createdAt,
      reference: `Ремонтная заявка ${newRepair.id}`,
      approved: true
    });
  }
  
  db.repairs.push(newRepair);
  saveState();
  
  renderRepairsTable();
  renderEmployeesTable();
  renderGanttChart();
  closeModal("createRepairModal");
  showSystemNotification("Ремонтный лист зарегистрирован!");
}

// Контроль планового ТО спецтехники
function renderMaintenanceTracker() {
  const container = document.getElementById("maintenanceTracker");
  if (!container) return;
  container.innerHTML = "";
  
  db.vehicles.filter(v => v.ownerType === 'own').forEach(v => {
    // Порог 5000 моточасов (для кранов)
    const hoursLeft = 5000 - v.engineHours;
    const isCritical = hoursLeft <= 10;
    
    const item = document.createElement("div");
    item.style.padding = "10px";
    item.style.border = "1px solid var(--border-color)";
    item.style.borderRadius = "6px";
    item.style.backgroundColor = isCritical ? 'rgba(198, 40, 40, 0.05)' : 'var(--bg-secondary)';
    
    item.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:center;">
        <strong>${v.invNumber} (${v.plate})</strong>
        <span class="badge ${isCritical ? 'badge-danger' : 'badge-success'}">${isCritical ? 'Блок: ТО!' : 'Норма'}</span>
      </div>
      <div style="font-size:11px; color:var(--text-secondary); margin-top:4px;">Наработка: ${v.engineHours} / 5000 моточасов</div>
      <div style="font-size:11px; font-weight:600; color:${isCritical ? 'var(--status-danger)' : 'inherit'};">Осталось: ${hoursLeft} моточасов</div>
    `;
    container.appendChild(item);
  });
}


// ----------------------------------------------------
// МОДУЛЬ 8: HR И ДОКУМЕНТЫ
// ----------------------------------------------------

function renderEmployeesTable() {
  const table = document.getElementById("employeesTable");
  if (!table) return;
  
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";
  
  db.drivers.forEach(d => {
    // Расчет напоминаний документов (60, 30, 7 дней)
    const today = new Date("2026-06-18");
    
    const medDays = Math.ceil((new Date(d.medExpiry) - today) / (1000 * 60 * 60 * 24));
    const tbDays = Math.ceil((new Date(d.tbExpiry) - today) / (1000 * 60 * 60 * 24));
    
    let medBadge = `<span class="badge badge-success">${d.medExpiry} (${medDays}д)</span>`;
    if (medDays < 0) medBadge = `<span class="badge badge-danger">Просрочено (${medDays}д)</span>`;
    else if (medDays <= 7) medBadge = `<span class="badge badge-danger">ТО СРОЧНО (${medDays}д)</span>`;
    else if (medDays <= 30) medBadge = `<span class="badge badge-warning">Предупреждение (${medDays}д)</span>`;
    
    let tbBadge = `<span class="badge badge-success">${d.tbExpiry} (${tbDays}д)</span>`;
    if (tbDays < 0) tbBadge = `<span class="badge badge-danger">Истек допуск (${tbDays}д)</span>`;
    else if (tbDays <= 30) tbBadge = `<span class="badge badge-warning">Корочки ТБ (${tbDays}д)</span>`;
    
    // Блокировка
    if (medDays < 0 || tbDays < 0) {
      d.isBlocked = true;
    } else {
      d.isBlocked = false;
    }
    
    // Долги по ТК РК
    const totalDeductions = db.payrollDeductions.filter(x => x.driverId === d.id).reduce((sum, x) => sum + x.amount, 0);
    
    const tr = document.createElement("tr");
    tr.style.cursor = "pointer";
    tr.onclick = () => openEmployeeDetails(d.id);
    tr.className = "clickable-row-hover";
    tr.innerHTML = `
      <td><strong>${d.name}</strong><br><span style="font-size:11px;color:var(--text-secondary);">ИИН: ${d.iin}</span></td>
      <td>${d.position}</td>
      <td>${d.licenseCategory}<br><span style="font-size:10px;color:var(--text-secondary);">Срок: ${d.licenseExpiry}</span></td>
      <td>ТД: ${d.contractExpiry}<br><span class="badge ${d.materialLiability?'badge-success':'badge-danger'}">${d.materialLiability?'Договор МО':'Нет МО'}</span></td>
      <td>${medBadge}</td>
      <td>${tbBadge}</td>
      <td>СИЗ: ${d.uniformSize}<br><span style="font-size:10px;color:var(--text-secondary);">Командир: ${d.travelCosts}₸</span></td>
      <td>
        <span class="badge ${d.isBlocked ? 'badge-danger' : 'badge-success'}">
          ${d.isBlocked ? 'Заблокирован' : 'Допущен'}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function openEmployeeDetails(driverId) {
  const d = db.drivers.find(x => x.id === driverId);
  if (!d) return;
  
  const body = document.getElementById("employeeModalBody");
  const footer = document.getElementById("employeeModalFooter");
  
  const today = new Date("2026-06-18");
  const medDays = Math.ceil((new Date(d.medExpiry) - today) / (1000 * 60 * 60 * 24));
  const tbDays = Math.ceil((new Date(d.tbExpiry) - today) / (1000 * 60 * 60 * 24));
  
  let medStatus = medDays < 0 ? `🔴 Просрочено на ${Math.abs(medDays)} дн.` : (medDays <= 7 ? `🔴 ТО СРОЧНО (истекает через ${medDays} дн.)` : (medDays <= 30 ? `🟡 Предупреждение (истекает через ${medDays} дн.)` : `🟢 Годен до ${d.medExpiry} (${medDays} дн.)`));
  let tbStatus = tbDays < 0 ? `🔴 Истек допуск на ${Math.abs(tbDays)} дн.` : (tbDays <= 30 ? `🟡 Истекает через ${tbDays} дн.` : `🟢 Допуск до ${d.tbExpiry} (${tbDays} дн.)`);
  
  const vehicle = db.vehicles.find(v => v.driverId === d.id);
  const vehicleInfo = vehicle ? `<span style="color:var(--brand-color); font-weight:700;">${vehicle.name} (${vehicle.plate}) [Инв: ${vehicle.invNumber}]</span>` : `<span style="color:var(--text-secondary); font-style:italic;">Спецтехника не привязана</span>`;
  
  const activeTasks = db.tasks.filter(t => t.assignee === d.id && t.status !== 'completed');
  let tasksHtml = "";
  if (activeTasks.length === 0) {
    tasksHtml = `<div style="font-size:12px; color:var(--text-secondary); font-style:italic;">Нет активных задач</div>`;
  } else {
    tasksHtml = activeTasks.map(t => `
      <div style="padding: 8px; border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 6px; background-color: var(--bg-card); display:flex; justify-content:space-between; align-items:center;">
        <div>
          <div style="font-weight:600; font-size:12px;">${t.title}</div>
          <div style="font-size:10px; color:var(--text-secondary);">Дедлайн: ${t.dueDate}</div>
        </div>
        <span class="badge badge-warning" style="font-size:9px; padding: 2px 6px;">${t.status}</span>
      </div>
    `).join("");
  }
  
  body.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:16px;">
      <!-- Шапка -->
      <div style="background: var(--bg-secondary); padding: 16px; border-radius: 10px; border-left: 4px solid ${d.isBlocked ? 'var(--status-danger)' : 'var(--status-success)'};">
        <h4 style="font-size:16px; font-weight:700; color: var(--text-primary);">${d.name}</h4>
        <div style="font-size:12px; color: var(--text-secondary); margin-top: 4px;">Должность: <strong>${d.position}</strong></div>
        <div style="display: flex; gap: 8px; flex-wrap: wrap; margin-top: 8px;">
          <span class="badge badge-neutral" style="font-size: 9px; padding: 2px 6px;">ИИН: ${d.iin}</span>
          <span class="badge badge-neutral" style="font-size: 9px; padding: 2px 6px;">Категория: ${d.licenseCategory}</span>
          <span class="badge ${d.isBlocked ? 'badge-danger' : 'badge-success'}" style="font-size: 9px; padding: 2px 6px;">
            ${d.isBlocked ? 'Заблокирован' : 'Допущен'}
          </span>
        </div>
      </div>
      
      <!-- Личные данные -->
      <div class="grid-container" style="gap:12px; border-bottom: 1px dashed var(--border-color); padding-bottom: 12px;">
        <div class="col-6">
          <div style="font-size:11px; text-transform:uppercase; color:var(--text-secondary); font-weight:700; margin-bottom:4px;">Телефон:</div>
          <div style="font-size:13px; font-weight:600;">${d.phone}</div>
        </div>
        <div class="col-6">
          <div style="font-size:11px; text-transform:uppercase; color:var(--text-secondary); font-weight:700; margin-bottom:4px;">Техника:</div>
          <div style="font-size:13px;">${vehicleInfo}</div>
        </div>
      </div>

      <!-- Допуски и Корочки -->
      <div style="border-bottom: 1px dashed var(--border-color); padding-bottom: 12px;">
        <h5 style="font-weight:700; font-size:11px; text-transform:uppercase; color:var(--text-secondary); margin-bottom:8px;">Допуски и медосмотр</h5>
        <div style="display:flex; flex-direction:column; gap:8px;">
          <div style="display:flex; justify-content:space-between; font-size:12px;">
            <span>Медосмотр:</span>
            <strong>${medStatus}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:12px;">
            <span>Инструктаж ТБ / ОТ / ПТМ:</span>
            <strong>${tbStatus}</strong>
          </div>
          <div style="display:flex; justify-content:space-between; font-size:12px;">
            <span>Договор материальной ответственности:</span>
            <strong>${d.materialLiability ? '🟢 Подписан (МО)' : '🔴 Не подписан'}</strong>
          </div>
        </div>
      </div>

      <!-- Размещение -->
      <div style="border-bottom: 1px dashed var(--border-color); padding-bottom: 12px;">
        <h5 style="font-weight:700; font-size:11px; text-transform:uppercase; color:var(--text-secondary); margin-bottom:8px;">Размещение и СИЗ</h5>
        <div class="grid-container" style="gap:12px;">
          <div class="col-6" style="font-size:12px;">
            <div>Общежитие / Вагончик:</div>
            <strong>${d.lodging || 'Не указано'}</strong>
          </div>
          <div class="col-6" style="font-size:12px;">
            <div>План питания:</div>
            <strong>${d.mealPlan || 'Не указано'}</strong>
          </div>
          <div class="col-6" style="font-size:12px; margin-top: 6px;">
            <div>Размер СИЗ / Спецодежда:</div>
            <strong>${d.uniformSize || '50-52 (XL)'}</strong>
          </div>
          <div class="col-6" style="font-size:12px; margin-top: 6px;">
            <div>Командировочные:</div>
            <strong>${d.travelCosts ? d.travelCosts.toLocaleString() + ' ₸' : '0 ₸'}</strong>
          </div>
        </div>
      </div>

      <!-- Задачи -->
      <div>
        <h5 style="font-weight:700; font-size:11px; text-transform:uppercase; color:var(--text-secondary); margin-bottom:8px;">Текущие поручения / наряды</h5>
        ${tasksHtml}
      </div>
    </div>
  `;
  
  footer.innerHTML = `
    <div style="display:flex; gap:8px;">
      <button class="btn-secondary" style="color:var(--status-danger); border-color:var(--status-danger); font-size:11px; padding: 6px 12px;" onclick="toggleEmployeeBlockStatus('${d.id}')">
        ${d.isBlocked ? 'Разблокировать' : 'Заблокировать'}
      </button>
      <button class="btn-secondary" style="font-size:11px; padding: 6px 12px;" onclick="openEditEmployeeModal('${d.id}')">
        📝 Редактировать
      </button>
    </div>
    <button class="btn-primary" style="font-size: 13px; padding: 8px 20px; border-radius: 30px;" onclick="closeEmployeeModal()">Закрыть</button>
  `;
  
  openModal("employeeDetailsModal");
}

function closeEmployeeModal() {
  closeModal("employeeDetailsModal");
}

function toggleEmployeeBlockStatus(driverId) {
  const d = db.drivers.find(x => x.id === driverId);
  if (!d) return;
  
  d.isBlocked = !d.isBlocked;
  saveState();
  renderEmployeesTable();
  closeEmployeeModal();
  openEmployeeDetails(driverId);
  showSystemNotification(`Статус допуска для ${d.name} изменен на: ${d.isBlocked ? 'Заблокирован' : 'Допущен'}`);
}

function openEditEmployeeModal(driverId) {
  const d = db.drivers.find(x => x.id === driverId);
  if (!d) return;
  
  document.getElementById("editEmployeeId").value = d.id;
  document.getElementById("editEmployeeName").value = d.name;
  document.getElementById("editEmployeeIin").value = d.iin;
  document.getElementById("editEmployeePhone").value = d.phone;
  document.getElementById("editEmployeePosition").value = d.position;
  document.getElementById("editEmployeeLicense").value = d.licenseCategory;
  document.getElementById("editEmployeeMedExpiry").value = d.medExpiry;
  document.getElementById("editEmployeeTbExpiry").value = d.tbExpiry;
  document.getElementById("editEmployeeSalary").value = d.baseSalary || 0;
  document.getElementById("editEmployeeContractType").value = d.contractType || "TD";
  document.getElementById("editEmployeeMo").value = d.materialLiability ? "true" : "false";
  document.getElementById("editEmployeeUniformSize").value = d.uniformSize || "50-52 (XL)";
  document.getElementById("editEmployeeTravelCosts").value = d.travelCosts || 0;
  document.getElementById("editEmployeeLodging").value = d.lodging || "Не требуется / Местный";
  document.getElementById("editEmployeeMealPlan").value = d.mealPlan || "Без питания";
  
  closeEmployeeModal();
  openModal("editEmployeeModal");
}

function submitEditEmployee() {
  const id = document.getElementById("editEmployeeId").value;
  const d = db.drivers.find(x => x.id === id);
  if (!d) return;
  
  d.name = document.getElementById("editEmployeeName").value;
  d.iin = document.getElementById("editEmployeeIin").value;
  d.phone = document.getElementById("editEmployeePhone").value;
  d.position = document.getElementById("editEmployeePosition").value;
  d.licenseCategory = document.getElementById("editEmployeeLicense").value;
  d.medExpiry = document.getElementById("editEmployeeMedExpiry").value;
  d.tbExpiry = document.getElementById("editEmployeeTbExpiry").value;
  d.baseSalary = parseInt(document.getElementById("editEmployeeSalary").value) || 0;
  d.contractType = document.getElementById("editEmployeeContractType").value;
  d.materialLiability = document.getElementById("editEmployeeMo").value === "true";
  d.uniformSize = document.getElementById("editEmployeeUniformSize").value;
  d.travelCosts = parseInt(document.getElementById("editEmployeeTravelCosts").value) || 0;
  d.lodging = document.getElementById("editEmployeeLodging").value;
  d.mealPlan = document.getElementById("editEmployeeMealPlan").value;
  
  saveState();
  renderEmployeesTable();
  if (typeof renderLodgingTable === "function") renderLodgingTable();
  if (typeof renderLodgingStats === "function") renderLodgingStats();
  
  closeModal("editEmployeeModal");
  openEmployeeDetails(d.id);
  showSystemNotification("Профиль сотрудника успешно обновлен!");
}

function submitCreateEmployee() {
  const name = document.getElementById("hrName").value;
  const iin = document.getElementById("hrIin").value;
  const phone = document.getElementById("hrPhone").value;
  const pos = document.getElementById("hrPosition").value;
  const lic = document.getElementById("hrLicense").value;
  const med = document.getElementById("hrMedExpiry").value;
  const tb = document.getElementById("hrTbExpiry").value;
  const salary = parseInt(document.getElementById("hrSalary").value);
  const ct = document.getElementById("hrContractType").value;
  const mo = document.getElementById("hrMo").value === 'true';
  
  const newDriver = {
    id: "d" + (db.drivers.length + 1),
    name: name,
    iin: iin,
    phone: phone,
    position: pos,
    licenseCategory: lic,
    licenseExpiry: "2036-06-18",
    medExpiry: med,
    tbExpiry: tb,
    otExpiry: tb,
    ptmExpiry: tb,
    uniformSize: "50-52 (XL)",
    lodging: "Карабатан База",
    mealPlan: "Своё питание",
    travelCosts: 25000,
    materialLiability: mo,
    contractType: ct,
    contractExpiry: "2027-06-18",
    baseSalary: salary,
    activeDebt: 0,
    finesThisMonth: 0,
    fuelDeduction: 0,
    shiftsWorked: 0,
    isBlocked: false
  };
  
  db.drivers.push(newDriver);
  saveState();
  
  renderEmployeesTable();
  closeModal("createEmployeeModal");
  showSystemNotification("Профиль сотрудника успешно добавлен!");
}

function renderLodgingTable() {
  const table = document.getElementById("lodgingTable");
  if (!table) return;
  
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";
  
  db.drivers.forEach(d => {
    const vehicle = db.vehicles.find(v => v.driverId === d.id);
    const site = vehicle ? db.sites.find(s => s.id === vehicle.currentSiteId) : null;
    const siteName = site ? site.name : "Не закреплен";
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${d.name}</strong><br><span style="font-size:11px;color:var(--text-secondary);">${d.position}</span></td>
      <td><span class="badge badge-neutral">${siteName}</span></td>
      <td>${d.lodging || 'Не указано'}</td>
      <td>${d.mealPlan || 'Не указано'}</td>
      <td><strong>${(d.travelCosts || 0).toLocaleString()} ₸</strong></td>
      <td>
        <button class="btn-secondary" style="font-size:11px; padding:4px 8px;" onclick="openEditLodgingModal('${d.id}')">Изменить быт</button>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function renderLodgingStats() {
  const container = document.getElementById("lodgingStats");
  if (!container) return;
  
  container.innerHTML = "";
  
  const dorms = [
    { name: "Общежитие Карабатан (Ак Патер)", key: "Общежитие Карабатан (Ак Патер)", limit: 10 },
    { name: "Вагон-городок Макат", key: "Вагон-городок Макат", limit: 8 },
    { name: "Съемное жилье Индер", key: "Съемное жилье Индер", limit: 4 },
    { name: "Гостевой дом Жангала", key: "Гостевой дом Жангала", limit: 4 },
    { name: "Общежитие Атырау (База)", key: "Общежитие Атырау (База)", limit: 6 }
  ];
  
  dorms.forEach(dorm => {
    const occupants = db.drivers.filter(d => d.lodging === dorm.key).length;
    const percent = Math.min(Math.round((occupants / dorm.limit) * 100), 100);
    
    let statusClass = "var(--brand-color)";
    if (percent >= 90) statusClass = "var(--status-danger)";
    else if (percent >= 70) statusClass = "var(--status-warning)";
    else statusClass = "var(--status-success)";
    
    const div = document.createElement("div");
    div.className = "progress-bar-container";
    div.style.cssText = "display: flex; flex-direction: column; gap: 4px;";
    
    div.innerHTML = `
      <div class="progress-bar-label" style="display: flex; justify-content: space-between; font-size: 11px; font-weight: 500;">
        <span style="color: var(--text-primary);">${dorm.name}</span>
        <span style="color: var(--text-secondary);">${occupants} / ${dorm.limit} мест (${percent}%)</span>
      </div>
      <div class="progress-bar-track" style="height: 6px; background-color: var(--bg-secondary); border-radius: 3px; overflow: hidden;">
        <div class="progress-bar-fill" style="height: 100%; width: ${percent}%; background-color: ${statusClass}; border-radius: 3px; transition: width 0.3s ease;"></div>
      </div>
    `;
    
    container.appendChild(div);
  });
}

function openEditLodgingModal(driverId) {
  const driver = db.drivers.find(d => d.id === driverId);
  if (!driver) return;
  
  document.getElementById("editLodgingDriverId").value = driver.id;
  document.getElementById("editLodgingSelect").value = driver.lodging || "Не требуется / Местный";
  document.getElementById("editMealPlanSelect").value = driver.mealPlan || "Без питания";
  document.getElementById("editTravelCosts").value = driver.travelCosts || 0;
  document.getElementById("editLodgingTitle").innerText = `Условия проживания - ${driver.name}`;
  
  openModal("editLodgingModal");
}

function submitEditLodging() {
  const driverId = document.getElementById("editLodgingDriverId").value;
  const driver = db.drivers.find(d => d.id === driverId);
  if (!driver) return;
  
  driver.lodging = document.getElementById("editLodgingSelect").value;
  driver.mealPlan = document.getElementById("editMealPlanSelect").value;
  driver.travelCosts = parseInt(document.getElementById("editTravelCosts").value) || 0;
  
  saveState();
  renderLodgingTable();
  renderLodgingStats();
  renderEmployeesTable();
  closeModal("editLodgingModal");
  showSystemNotification(`Условия быта для ${driver.name} успешно обновлены!`);
}


// ----------------------------------------------------
// МОДУЛЬ 9: ИИ ЧАТ-БОТ (ЭМУЛЯТОР)
// ----------------------------------------------------

function openChatBotModal() {
  openModal("chatBotModal");
  renderChatHistory();
}

function closeChatBotModal() {
  closeModal("chatBotModal");
}

function renderChatHistory() {
  const container = document.getElementById("chatLogContainer");
  if (!container) return;
  container.innerHTML = "";
  
  db.chatLog.forEach(log => {
    const msg = document.createElement("div");
    
    // Determine the WhatsApp class based on sender
    let messageClass = "whatsapp-message driver";
    if (log.sender === "Менеджер") {
      messageClass = "whatsapp-message manager";
    } else if (log.sender === "System" || log.sender === "ИИ-Агент" || log.sender.includes("ИИ-Логист")) {
      messageClass = "whatsapp-message bot";
    }
    
    msg.className = messageClass;
    
    // Colored name for sender in WhatsApp group
    let nameColor = "#35a649"; // Default green
    if (log.sender.includes("Водитель")) {
      nameColor = "#1f71a3"; // Blue for drivers
    } else if (log.sender.includes("Механик")) {
      nameColor = "#e67e22"; // Orange for mechanics
    } else if (log.sender === "Менеджер") {
      nameColor = "#8e44ad"; // Purple for manager
    } else if (log.sender.includes("ИИ")) {
      nameColor = "#e74c3c"; // Crimson red for AI agent
    }
    
    msg.innerHTML = `
      <div style="font-weight:700; font-size:10px; margin-bottom:4px; text-transform:uppercase; color: ${nameColor};">${log.sender}</div>
      <div style="line-height: 1.4;">${log.message}</div>
      <div class="chat-message-time" style="font-size: 9px; color: #666; margin-top: 4px; text-align: right;">${log.time}</div>
    `;
    container.appendChild(msg);
  });
  
  container.scrollTop = container.scrollHeight;
}

function sendChatMessage() {
  const input = document.getElementById("chatInputField");
  const text = input.value.trim();
  if (!text) return;
  
  const time = new Date().toTimeString().split(' ')[0].substring(0, 5);
  let sender = "Менеджер";
  let messageText = text;
  let driverId = null;
  
  // Checking for driver name prefix (e.g. "Сериков: Принял смену")
  const matchPrefix = text.match(/^([^:]+):\s*(.*)/);
  if (matchPrefix) {
    const rawSender = matchPrefix[1].trim();
    messageText = matchPrefix[2].trim();
    
    if (rawSender.toLowerCase().includes("сериков")) {
      sender = "Сериков А. С. (Водитель)";
      driverId = "d101";
    } else if (rawSender.toLowerCase().includes("калиев")) {
      sender = "Калиев М. К. (Водитель)";
      driverId = "d102";
    } else if (rawSender.toLowerCase().includes("жусупов")) {
      sender = "Жусупов Б. Н. (Водитель)";
      driverId = "d103";
    } else {
      sender = `${rawSender} (Водитель)`;
    }
  }
  
  // Add user message to log
  db.chatLog.push({ sender: sender, time: time, message: messageText });
  input.value = "";
  renderChatHistory();
  
  // AI-Agent parsing logic (simulating delay)
  setTimeout(() => {
    const lowerText = messageText.toLowerCase();
    
    // Find driver in database
    let driver = driverId ? db.drivers.find(d => d.id === driverId) : null;
    if (!driver) {
      if (lowerText.includes("сериков")) driver = db.drivers.find(d => d.id === "d101");
      else if (lowerText.includes("калиев")) driver = db.drivers.find(d => d.id === "d102");
      else if (lowerText.includes("жусупов")) driver = db.drivers.find(d => d.id === "d103");
      else if (sender !== "Менеджер") {
        const cleanName = sender.split(" ")[0];
        driver = db.drivers.find(d => d.name.includes(cleanName));
      }
    }
    // Default fallback to first driver if message is driver-related
    if (!driver && (lowerText.includes("смену") || lowerText.includes("заправил") || lowerText.includes("поломал") || lowerText.includes("сломал"))) {
      driver = db.drivers.find(d => d.id === "d101");
    }
    
    // Find vehicle
    let vehicle = null;
    if (driver) {
      vehicle = db.vehicles.find(v => v.driverId === driver.id);
    }
    if (lowerText.includes("zoomlion") || lowerText.includes("714")) {
      vehicle = db.vehicles.find(v => v.id === "v101");
    } else if (lowerText.includes("xcmg") || lowerText.includes("452")) {
      vehicle = db.vehicles.find(v => v.id === "v102");
    } else if (lowerText.includes("экскаватор")) {
      vehicle = db.vehicles.find(v => v.id === "v103");
    }
    if (!vehicle) vehicle = db.vehicles.find(v => v.id === "v101");
    
    // Match construction site
    let siteId = "karabatan";
    let siteName = "Карабатан";
    if (lowerText.includes("макат")) {
      siteId = "makat";
      siteName = "Макат";
    } else if (lowerText.includes("индер")) {
      siteId = "inder";
      siteName = "Индер";
    } else if (lowerText.includes("караб")) {
      siteId = "karabatan";
      siteName = "Карабатан";
    }
    
    let processed = false;
    let aiResponse = "";
    
    // 1. НАЧАЛО СМЕНЫ
    if (lowerText.includes("принял смену") || lowerText.includes("начал смену") || lowerText.includes("заступил")) {
      if (driver && vehicle) {
        vehicle.status = "В работе";
        driver.shiftsWorked = (driver.shiftsWorked || 0) + 1;
        saveState();
        
        aiResponse = `🤖 ИИ-Логист: Смена зафиксирована!\n- Водитель: ${driver.name}\n- Техника: ${vehicle.invNumber} (${vehicle.name})\n- Объект: ${siteName}\nДанные внесены в путевой лист ERP. Статус техники обновлен на 'В работе'.`;
        processed = true;
      }
    }
    
    // 2. КОНЕЦ СМЕНЫ
    else if (lowerText.includes("сдал смену") || lowerText.includes("смену сдал") || lowerText.includes("закончил смену") || lowerText.includes("завершил работу")) {
      if (driver && vehicle) {
        vehicle.status = "Свободна";
        saveState();
        
        aiResponse = `🤖 ИИ-Логист: Окончание смены принято!\n- Водитель: ${driver.name}\n- Техника: ${vehicle.invNumber} (${vehicle.name})\nСтатус спецтехники в ERP изменен на 'Свободна'. Смена закрыта.`;
        processed = true;
      }
    }
    
    // 3. ЗАПРАВКА ГСМ
    else if (lowerText.includes("заправил") || lowerText.includes("заправка") || lowerText.includes("заправился")) {
      if (driver && vehicle) {
        const litersMatch = lowerText.match(/(\d+)\s*л/) || lowerText.match(/заправил\s+(\d+)/) || lowerText.match(/(\d+)\s*литр/);
        const liters = litersMatch ? parseInt(litersMatch[1]) : 150;
        const cost = liters * 295; // 295 KZT/литр
        
        db.fuelLogs.push({
          id: "fl_" + (db.fuelLogs.length + 1),
          date: new Date().toISOString().split('T')[0],
          time: time,
          vehicleId: vehicle.id,
          driverId: driver.id,
          fuelType: "Дизель",
          liters: liters,
          cost: cost,
          fuelCard: `CARD-99${driver.id.substring(1)}`,
          approved: true
        });
        saveState();
        
        aiResponse = `🤖 ИИ-Логист: Отчет о заправке обработан!\n- Водитель: ${driver.name}\n- Техника: ${vehicle.invNumber}\n- Объем: ${liters} л\n- Сумма: ${cost.toLocaleString()} KZT списана с топливной карты.\nРасход добавлен в финансовую аналитику объекта ${siteName}.`;
        processed = true;
      }
    }
    
    // 4. ПОЛОМКА / ЗАЯВКА НА РЕМОНТ
    else if (lowerText.includes("сломался") || lowerText.includes("поломка") || lowerText.includes("ремонт") || lowerText.includes("поломал")) {
      if (driver && vehicle) {
        vehicle.status = "На ремонте";
        
        db.repairs.push({
          id: "rep_" + (db.repairs.length + 1),
          vehicleId: vehicle.id,
          siteId: siteId,
          driverId: driver.id,
          description: messageText,
          status: "Новая",
          createdAt: new Date().toISOString().split('T')[0],
          faultByDriver: false,
          damageCost: 0,
          explanatoryAttached: false,
          partsRequested: [],
          laborCost: 0
        });
        saveState();
        
        aiResponse = `🤖 ИИ-Логист: Заявка на ремонт создана!\n- Водитель: ${driver.name}\n- Техника: ${vehicle.invNumber} (${vehicle.name})\n- Описание неисправности: "${messageText}"\nСтатус техники изменен на 'На ремонте'. Заявка отправлена в ремонтный модуль.`;
        processed = true;
      }
    }
    
    // 5. ШТРАФ ТБ
    else if (lowerText.includes("штраф")) {
      const fineMatch = lowerText.match(/штраф\s+(\d+)/) || [null, "15000"];
      const fineAmount = parseInt(fineMatch[1]);
      
      if (driver) {
        driver.finesThisMonth += fineAmount;
        db.payrollDeductions.push({
          id: "pd_" + (db.payrollDeductions.length + 1),
          driverId: driver.id,
          type: "Штраф ТБ",
          amount: fineAmount,
          date: new Date().toISOString().split('T')[0],
          reference: `AI WhatsApp: ${messageText}`,
          approved: true
        });
        
        if (fineAmount >= 100000) {
          // Серьезный штраф - срываем смену
          const deal = db.deals.find(d => d.siteId === siteId && d.stage === "Выполнение работ");
          if (deal) {
            deal.stage = "Закрытие заказа";
            deal.jobType = "СОРВАНА СМЕНА (Нарушение водителя)";
          }
        }
        saveState();
        
        aiResponse = `🤖 ИИ-Логист: Нарушение зафиксировано!\n- Водитель: ${driver.name}\n- Штраф ТБ: ${fineAmount.toLocaleString()} KZT будет удержан из ФОТ.\n- Ссылка на лог: AI WhatsApp.\nДанные внесены в ERP.`;
        processed = true;
      }
    }
    
    if (!processed) {
      if (sender === "Менеджер") {
        aiResponse = `🤖 ИИ-Логист: Принял сообщение от руководства. Ожидаю отчетов водителей в группе. Для ручного ввода отчета водителя используйте формат:\n"Имя_Водителя: Сообщение отчета" (например, "Сериков: Заправил автокран на 100 литров").`;
      } else {
        aiResponse = `🤖 ИИ-Логист: Сообщение от водителя ${driver ? driver.name : sender} получено и сохранено в истории группы. Специфические команды не обнаружены.`;
      }
    }
    
    db.chatLog.push({
      sender: "ИИ-Агент",
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      message: aiResponse
    });
    
    renderChatHistory();
    renderAll();
    
  }, 1000);
}


// МОДУЛЬ 10: Убран (Отчетность переведена в WhatsApp)



// ----------------------------------------------------
// МОДУЛЬ 11: ФИНАНСЫ, РАСЧЕТ ЗАРПЛАТЫ И P&L
// ----------------------------------------------------

// Рендеринг P&L по объектам
function renderObjectsPnl() {
  const grid = document.getElementById("objectsPnlGrid");
  if (!grid) return;
  
  grid.innerHTML = "";
  
  db.sites.forEach(site => {
    // Расчет доходов объекта
    const siteDeals = db.deals.filter(d => d.siteId === site.id);
    const revenue = siteDeals.reduce((sum, d) => sum + d.price, 0);
    
    // Расходы на зарплату машинистов на этом объекте
    // Соберем водителей, машины которых привязаны к объекту
    const siteVehicles = db.vehicles.filter(v => v.currentSiteId === site.id);
    const siteDrivers = db.drivers.filter(d => siteVehicles.some(v => v.driverId === d.id));
    
    const salaryCost = siteDrivers.reduce((sum, d) => sum + d.baseSalary + (d.shiftsWorked * 10000), 0);
    
    // Затраты на ГСМ
    const fuelCost = db.fuelLogs.filter(f => siteVehicles.some(v => v.id === f.vehicleId)).reduce((sum, f) => sum + f.cost, 0);
    
    // Субаренда
    const subrentCost = siteVehicles.filter(v => v.ownerType === 'subrent').reduce((sum, v) => sum + (v.subrentRate * 15), 0); // Симулируем 15 смен субаренды
    
    // Ремонты и запчасти
    const repairCost = db.repairs.filter(r => r.siteId === site.id).reduce((sum, r) => sum + r.laborCost + (r.damageCost || 0), 0);
    
    // Чистая прибыль
    const netProfit = revenue - (salaryCost + fuelCost + subrentCost + repairCost);
    
    const card = document.createElement("div");
    card.className = "col-4 object-pnl-card";
    card.style.cursor = "pointer";
    card.style.transition = "transform 0.2s, box-shadow 0.2s";
    card.onmouseenter = () => { card.style.transform = "translateY(-3px)"; card.style.boxShadow = "0 6px 16px rgba(0,0,0,0.1)"; };
    card.onmouseleave = () => { card.style.transform = "translateY(0)"; card.style.boxShadow = "var(--shadow)"; };
    card.onclick = () => openSitePnlDetailModal(site.id);
    
    card.innerHTML = `
      <div style="font-weight:700; font-size:14px; border-bottom:1px solid var(--border-color); padding-bottom:8px;">${site.name}</div>
      <div class="pnl-row"><span>Заказчик:</span><span>${site.customer.substring(0, 15)}...</span></div>
      <div class="pnl-row"><span style="color:var(--status-success);">Выручка:</span><strong>+${revenue.toLocaleString()} ₸</strong></div>
      <div class="pnl-row"><span>ЗП машинистов:</span><span>-${salaryCost.toLocaleString()} ₸</span></div>
      <div class="pnl-row"><span>Топливо (ГСМ):</span><span>-${fuelCost.toLocaleString()} ₸</span></div>
      <div class="pnl-row"><span>Субаренда партнера:</span><span>-${subrentCost.toLocaleString()} ₸</span></div>
      <div class="pnl-row"><span>Ремонты и ТМЦ:</span><span>-${repairCost.toLocaleString()} ₸</span></div>
      <div class="pnl-row" style="background-color: ${netProfit >= 0 ? 'rgba(46,125,50,0.05)' : 'rgba(198,40,40,0.05)'}; padding: 6px; border-radius:4px;">
        <span>Чистая прибыль:</span>
        <strong style="color: ${netProfit >= 0 ? 'var(--status-success)' : 'var(--status-danger)'};">${netProfit.toLocaleString()} ₸</strong>
      </div>
    `;
    
    grid.appendChild(card);
  });
}

// Расчет окупаемости и ROI спецтехники
function renderFleetRoiTable() {
  const table = document.getElementById("fleetRoiTable");
  if (!table) return;
  
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";
  
  db.vehicles.forEach(v => {
    // Выручка по рейсам
    const vDeals = db.deals.filter(d => d.vehicleIds.includes(v.id));
    const revenue = vDeals.reduce((sum, d) => sum + (d.price / d.vehicleCount), 0);
    
    // Затраты на ТО, ремонт, страховку, налоги
    const repairCost = db.repairs.filter(r => r.vehicleId === v.id).reduce((sum, r) => sum + r.laborCost, 0);
    const insuranceCost = v.insuranceCost || 0;
    const taxCost = v.taxCost || 0;
    
    const totalCosts = repairCost + insuranceCost + taxCost;
    const profit = revenue - totalCosts;
    const roi = totalCosts > 0 ? ((profit / totalCosts) * 100).toFixed(1) + "%" : "100%";
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${v.invNumber}</strong><br><span style="font-size:10px; color:var(--text-secondary);">${v.name.substring(0, 15)}...</span></td>
      <td>${totalCosts.toLocaleString()} ₸</td>
      <td><strong>${profit.toLocaleString()} ₸</strong></td>
      <td><span class="badge ${profit >= 0 ? 'badge-success' : 'badge-danger'}">${roi}</span></td>
    `;
    tbody.appendChild(tr);
  });
}


// ----------------------------------------------------
// ВНУТРЕННИЙ ЗАЩИТНЫЙ АЛГОРИТМ РАСЧЕТА ЗП (ТК РК)
// ----------------------------------------------------

function calculateMonthlyPayroll() {
  const table = document.getElementById("payrollTable");
  if (!table) return;
  
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";
  
  db.payrollApprovals = db.payrollApprovals || {};
  
  // Show/Hide bulk action button
  const bulkArea = document.getElementById("payrollBulkActionArea");
  if (bulkArea) {
    if (db.settings.activeRole === "Accountant" || db.settings.activeRole === "Director") {
      bulkArea.style.display = "block";
    } else {
      bulkArea.style.display = "none";
    }
  }
  
  db.drivers.forEach(d => {
    // В субаренде оклад и расчет ЗП не производятся (они идут подрядчикам)
    if (d.baseSalary === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${d.name}</strong><br><span style="font-size:10px;color:var(--text-secondary);">${d.position}</span></td>
        <td colspan="8" style="text-align:center; color:var(--text-secondary); font-style:italic;">Субаренда (Выплата партнеру по акту)</td>
      `;
      tbody.appendChild(tr);
      return;
    }

    const isApproved = db.payrollApprovals[d.id] && db.payrollApprovals[d.id].approved;
    
    let grossEarnings, shiftBonus, taskBonus;
    let fuelDeduction, finesThisMonth, activeDebt;
    let totalDeductions, maxDeductionAllowed, actualDeduction, rolloverDebt, netPayout;
    
    if (isApproved) {
      const record = db.payrollApprovals[d.id];
      grossEarnings = record.grossEarnings;
      shiftBonus = record.shiftBonus || 0;
      taskBonus = record.taskBonus || 0;
      fuelDeduction = record.fuelDeduction;
      finesThisMonth = record.finesThisMonth;
      activeDebt = record.activeDebt;
      totalDeductions = fuelDeduction + finesThisMonth + activeDebt;
      maxDeductionAllowed = grossEarnings * 0.5;
      actualDeduction = record.actualDeduction;
      rolloverDebt = record.rolloverDebt;
      netPayout = record.netPayout;
    } else {
      shiftBonus = d.shiftsWorked * 10000;
      taskBonus = d.taskBonus || 0;
      grossEarnings = d.baseSalary + shiftBonus + taskBonus;
      fuelDeduction = d.fuelDeduction;
      finesThisMonth = d.finesThisMonth;
      activeDebt = d.activeDebt;
      totalDeductions = fuelDeduction + finesThisMonth + activeDebt;
      maxDeductionAllowed = grossEarnings * 0.5;
      actualDeduction = Math.min(totalDeductions, maxDeductionAllowed);
      rolloverDebt = totalDeductions - actualDeduction;
      netPayout = grossEarnings - actualDeduction;
    }
    
    const hasDebtsOrFines = !isApproved && (fuelDeduction > 0 || finesThisMonth > 0 || activeDebt > 0);
    
    const tr = document.createElement("tr");
    
    if (hasDebtsOrFines) {
      tr.style.backgroundColor = "rgba(220, 38, 38, 0.03)";
      tr.style.borderLeft = "4px solid var(--status-danger)";
    } else if (isApproved) {
      tr.style.backgroundColor = "rgba(46, 125, 50, 0.03)";
      tr.style.borderLeft = "4px solid var(--status-success)";
    }
    
    let actionHtml = "";
    if (isApproved) {
      actionHtml = `<span class="badge badge-success" style="font-size: 10px; padding: 4px 8px; color: var(--status-success); background-color: rgba(46,125,50,0.1); font-weight:700;">✓ Утвержден</span>`;
    } else {
      if (db.settings.activeRole === "Accountant" || db.settings.activeRole === "Director") {
        actionHtml = `<button class="btn-primary" style="font-size:10px; padding:4px 8px; margin:0;" onclick="approvePayrollSlip('${d.id}')">Утвердить</button>`;
      } else {
        actionHtml = `<span style="font-size:10px; color:var(--text-secondary); font-style:italic;">Ожидает</span>`;
      }
    }
    
    tr.innerHTML = `
      <td>
        <strong>${d.name}</strong>${hasDebtsOrFines ? ' <span style="color:var(--status-danger);" title="Есть долги или штрафы">⚠️</span>' : ''}<br>
        <span style="font-size:10px;color:var(--text-secondary);">${d.position}</span>
      </td>
      <td>
        <strong>${grossEarnings.toLocaleString()} ₸</strong><br>
        <span style="font-size:9px;color:var(--text-secondary);">Оклад: ${d.baseSalary.toLocaleString()}${shiftBonus > 0 ? ` | Смены: ${shiftBonus.toLocaleString()}` : ''}${taskBonus > 0 ? ` | Задачи: ${taskBonus.toLocaleString()}` : ''}</span>
      </td>
      <td style="color:${fuelDeduction > 0 ? 'var(--status-danger)' : 'inherit'}; font-weight:${fuelDeduction > 0 ? '600' : 'normal'};">${fuelDeduction.toLocaleString()} ₸</td>
      <td style="color:${finesThisMonth > 0 ? 'var(--status-danger)' : 'inherit'}; font-weight:${finesThisMonth > 0 ? '600' : 'normal'};">${finesThisMonth.toLocaleString()} ₸</td>
      <td><strong>${totalDeductions.toLocaleString()} ₸</strong><br><span style="font-size:9px;color:var(--text-secondary);">Долг: ${activeDebt.toLocaleString()} ₸</span></td>
      <td style="color:var(--text-secondary); font-size:12px;">${maxDeductionAllowed.toLocaleString()} ₸</td>
      <td style="font-weight:700; color:var(--status-success); font-size:13px;">${netPayout.toLocaleString()} ₸</td>
      <td style="font-weight:600; color:${rolloverDebt > 0 ? 'var(--status-warning)' : 'inherit'};">${rolloverDebt.toLocaleString()} ₸</td>
      <td style="text-align: center; vertical-align: middle;">${actionHtml}</td>
    `;
    tbody.appendChild(tr);
  });
}

function approvePayrollSlip(driverId) {
  const d = db.drivers.find(x => x.id === driverId);
  if (!d) return;
  
  db.payrollApprovals = db.payrollApprovals || {};
  if (db.payrollApprovals[d.id] && db.payrollApprovals[d.id].approved) {
    showSystemNotification("Этот расчетный листок уже утвержден!");
    return;
  }
  
  const shiftBonus = d.shiftsWorked * 10000;
  const taskBonus = d.taskBonus || 0;
  const grossEarnings = d.baseSalary + shiftBonus + taskBonus;
  const totalDeductions = d.fuelDeduction + d.finesThisMonth + d.activeDebt;
  const maxDeductionAllowed = grossEarnings * 0.5;
  const actualDeduction = Math.min(totalDeductions, maxDeductionAllowed);
  const rolloverDebt = totalDeductions - actualDeduction;
  const netPayout = grossEarnings - actualDeduction;
  
  db.payrollApprovals[d.id] = {
    approved: true,
    date: new Date().toISOString().split('T')[0],
    grossEarnings: grossEarnings,
    shiftBonus: shiftBonus,
    taskBonus: taskBonus,
    fuelDeduction: d.fuelDeduction,
    finesThisMonth: d.finesThisMonth,
    activeDebt: d.activeDebt,
    actualDeduction: actualDeduction,
    rolloverDebt: rolloverDebt,
    netPayout: netPayout
  };
  
  d.activeDebt = rolloverDebt;
  d.fuelDeduction = 0;
  d.finesThisMonth = 0;
  d.taskBonus = 0;
  d.shiftsWorked = 0;
  
  saveState();
  renderAll();
  showSystemNotification(`Расчетный листок для ${d.name} успешно утвержден. Выплата на руки: ${netPayout.toLocaleString()} ₸.`);
}

function approveAllPayrollSlips() {
  db.payrollApprovals = db.payrollApprovals || {};
  let approvedCount = 0;
  
  db.drivers.forEach(d => {
    if (d.baseSalary > 0 && (!db.payrollApprovals[d.id] || !db.payrollApprovals[d.id].approved)) {
      const shiftBonus = d.shiftsWorked * 10000;
      const taskBonus = d.taskBonus || 0;
      const grossEarnings = d.baseSalary + shiftBonus + taskBonus;
      const totalDeductions = d.fuelDeduction + d.finesThisMonth + d.activeDebt;
      const maxDeductionAllowed = grossEarnings * 0.5;
      const actualDeduction = Math.min(totalDeductions, maxDeductionAllowed);
      const rolloverDebt = totalDeductions - actualDeduction;
      const netPayout = grossEarnings - actualDeduction;
      
      db.payrollApprovals[d.id] = {
        approved: true,
        date: new Date().toISOString().split('T')[0],
        grossEarnings: grossEarnings,
        shiftBonus: shiftBonus,
        taskBonus: taskBonus,
        fuelDeduction: d.fuelDeduction,
        finesThisMonth: d.finesThisMonth,
        activeDebt: d.activeDebt,
        actualDeduction: actualDeduction,
        rolloverDebt: rolloverDebt,
        netPayout: netPayout
      };
      
      d.activeDebt = rolloverDebt;
      d.fuelDeduction = 0;
      d.finesThisMonth = 0;
      d.taskBonus = 0;
      d.shiftsWorked = 0;
      approvedCount++;
    }
  });
  
  if (approvedCount > 0) {
    saveState();
    renderAll();
    showSystemNotification(`Успешно утверждено расчетных листков: ${approvedCount}.`);
  } else {
    showSystemNotification("Нет доступных для утверждения расчетных листков.");
  }
}


// ----------------------------------------------------
// ВСПОМОГАТЕЛЬНЫЕ РЕНДЕР-ФУНКЦИИ И СПРАВОЧНИКИ
// ----------------------------------------------------

// Вспомогательные функции поиска данных
function getVehicleInvNumber(vId) {
  if (!vId) return "-";
  const v = db.vehicles.find(x => x.id === vId);
  return v ? v.invNumber : "-";
}
function getVehicleName(vId) {
  if (!vId) return "Без техники";
  const v = db.vehicles.find(x => x.id === vId);
  return v ? v.name : "Без техники";
}
function getVehiclePlate(vId) {
  if (!vId) return "";
  const v = db.vehicles.find(x => x.id === vId);
  return v ? v.plate : "";
}
function getSiteName(sId) {
  if (!sId) return "База Атырау";
  const s = db.sites.find(x => x.id === sId);
  return s ? s.name : "База Атырау";
}
function getDriverName(dId) {
  if (!dId) return "Не назначен";
  
  const roles = {
    Director: "Директор (Управление)",
    Dispatcher: "Логист / Диспетчер",
    Warehouse: "Заведующий складом",
    Mechanic: "Механик (ТО и Ремонт)",
    HR: "HR-специалист",
    Purchaser: "Закупщик / Снабженец",
    Accountant: "Бухгалтер / Расчетчик ФОТ"
  };
  
  if (roles[dId]) {
    return roles[dId];
  }
  
  const d = db.drivers.find(x => x.id === dId);
  return d ? d.name : dId;
}
function getDriverPosition(dId) {
  if (!dId) return "";
  const d = db.drivers.find(x => x.id === dId);
  return d ? d.position : "";
}

// ----------------------------------------------------
// МОДЕРНИЗАЦИЯ: МОДУЛЬ «КОМПАНИИ»
// ----------------------------------------------------
function filterCompanyType(type) {
  activeCompanyFilter = type;
  document.querySelectorAll("[id^='btn-comp-filter-']").forEach(btn => btn.classList.remove("active"));
  const activeBtn = document.getElementById("btn-comp-filter-" + (type === "all" ? "all" : type === "Заказчик" ? "client" : type === "Арендодатель" ? "lessor" : type === "Поставщик" ? "supplier" : type === "Подрядчик по ремонту" ? "repair" : "insurer"));
  if (activeBtn) activeBtn.classList.add("active");
  renderCompanies();
}

function renderCompanies() {
  const grid = document.getElementById("companiesGrid");
  if (!grid) return;
  
  grid.innerHTML = "";
  const searchInput = document.getElementById("companySearchInput");
  const query = searchInput ? searchInput.value.toLowerCase() : "";
  
  const filtered = db.companies.filter(c => {
    // Фильтр по типу
    if (activeCompanyFilter !== 'all' && c.type !== activeCompanyFilter) return false;
    
    // Поиск
    return c.name.toLowerCase().includes(query) ||
           c.bin.includes(query) ||
           c.city.toLowerCase().includes(query) ||
           c.vehicleTypes.toLowerCase().includes(query);
  });
  
  if (filtered.length === 0) {
    grid.innerHTML = `<div class="col-12 text-center" style="color:var(--text-secondary); padding: 40px 0; grid-column: 1 / -1;">Контрагенты не найдены</div>`;
    return;
  }
  
  filtered.forEach(c => {
    const card = document.createElement("div");
    card.className = "company-card";
    card.onclick = () => openCompanyDetails(c.id);
    
    let badgeClass = "badge-success";
    if (c.status === "На проверке ТБ") badgeClass = "badge-warning";
    else if (c.status === "Заблокирован за долги") badgeClass = "badge-danger";
    
    card.innerHTML = `
      <div class="company-card-header">
        <span class="company-card-title">${c.name}</span>
        <span class="badge ${badgeClass}">${c.status}</span>
      </div>
      <div class="company-card-body">
        <div>БИН: <strong>${c.bin}</strong> | Город: <strong>${c.city}</strong></div>
        <div style="font-size: 11px; margin-top:4px;">Спецтехника / Работы: <em>${c.vehicleTypes}</em></div>
        <div style="font-size: 10px; color:var(--text-secondary); margin-top:2px;">Тип: <strong>${c.type}</strong></div>
      </div>
      <div class="company-card-analytics">
        <div>
          <span style="color:var(--text-secondary); font-size:10px;">Договоры</span>
          <span class="analytics-val">${c.activeContracts}</span>
        </div>
        <div>
          <span style="color:var(--text-secondary); font-size:10px;">Баланс</span>
          <span class="analytics-val" style="color:${c.debt > 0 ? 'var(--status-danger)' : c.debt < 0 ? 'var(--status-success)' : 'inherit'}">
            ${c.debt.toLocaleString()} ₸
          </span>
        </div>
        <div>
          <span style="color:var(--text-secondary); font-size:10px;">Индекс ТБ</span>
          <span class="analytics-val" style="color:${c.safetyIndex >= 95 ? 'var(--status-success)' : c.safetyIndex >= 85 ? 'var(--status-warning)' : 'var(--status-danger)'}">
            ${c.safetyIndex}%
          </span>
        </div>
      </div>
    `;
    grid.appendChild(card);
  });
}

function openCompanyDetails(compId) {
  const c = db.companies.find(x => x.id === compId);
  if (!c) return;
  
  const body = document.getElementById("companyModalBody");
  const footer = document.getElementById("companyModalFooter");
  if (!body || !footer) return;
  
  let safetyText = "";
  if (c.safetyIndex >= 95) {
    safetyText = `<span style="color:var(--status-success); font-weight:600;">🟢 Высокий уровень безопасности (${c.safetyIndex}%). Проверка ОТ и ТБ пройдена успешно.</span>`;
  } else if (c.safetyIndex >= 85) {
    safetyText = `<span style="color:var(--status-warning); font-weight:600;">🟡 Средний уровень риска (${c.safetyIndex}%). Рекомендуется повторный аудит.</span>`;
  } else {
    safetyText = `<span style="color:var(--status-danger); font-weight:600;">🔴 Высокий уровень риска! Индекс ТБ: ${c.safetyIndex}%. Допуски заблокированы.</span>`;
  }
  
  let balanceText = "";
  let balanceBtnHtml = "";
  if (c.debt > 0) {
    balanceText = `<span style="color:var(--status-danger); font-weight:700;">Дебиторская задолженность перед нами: ${c.debt.toLocaleString()} ₸</span>`;
    balanceBtnHtml = `<button class="btn-primary" style="background-color:var(--status-success); border-color:var(--status-success); font-size:11px; padding:4px 10px; margin:0;" onclick="registerCompanyPayment('${c.id}')">💸 Зарегистрировать оплату</button>`;
  } else if (c.debt < 0) {
    balanceText = `<span style="color:var(--status-success); font-weight:700;">Кредиторская задолженность (наша переплата): ${Math.abs(c.debt).toLocaleString()} ₸</span>`;
    balanceBtnHtml = `<button class="btn-secondary" style="font-size:11px; padding:4px 10px; margin:0;" onclick="showSystemNotification('Акт сверки по авансу Helios OIL отправлен на согласование')">📝 Списать аванс</button>`;
  } else {
    balanceText = `<span style="color:var(--text-secondary);">Задолженность отсутствует. Баланс расчетов нулевой.</span>`;
    balanceBtnHtml = `<button class="btn-secondary" style="font-size:11px; padding:4px 10px; margin:0;" onclick="openReconciliationStatement('${c.id}')">📊 Запросить Акт сверки</button>`;
  }

  // Поиск всех связанных договоров и заказов в системе
  const cleanName = (str) => str.replace(/[«»""''\s]/g, "").toLowerCase();
  const compClean = cleanName(c.name);

  // 1. CRM сделки / договоры аренды техники
  const companyDeals = db.deals.filter(d => {
    const dClean = cleanName(d.companyName);
    return dClean.includes(compClean) || compClean.includes(dClean);
  });

  // 2. Заказы снабжения (для поставщиков)
  const companySupplyOrders = db.supplyOrders ? db.supplyOrders.filter(so => {
    const sClean = cleanName(so.supplier);
    return sClean.includes(compClean) || compClean.includes(sClean);
  }) : [];

  // 3. Заказы на ремонт (для ремонтных подрядчиков)
  const companyRepairs = db.repairs ? db.repairs.filter(r => {
    if (r.contractorName) {
      const rClean = cleanName(r.contractorName);
      return rClean.includes(compClean) || compClean.includes(rClean);
    }
    return false;
  }) : [];

  // 4. Субаренда спецтехники (для арендодателей)
  const companySubrentVehicles = db.vehicles ? db.vehicles.filter(v => {
    if (v.ownerType === "subrent" && v.subrentProvider) {
      const vClean = cleanName(v.subrentProvider);
      return vClean.includes(compClean) || compClean.includes(vClean);
    }
    return false;
  }) : [];

  // 5. Договоры страхования спецтехники (для страховых компаний)
  const companyInsuranceVehicles = db.vehicles ? db.vehicles.filter(v => {
    if (v.insuranceProvider) {
      const iClean = cleanName(v.insuranceProvider);
      return iClean.includes(compClean) || compClean.includes(iClean);
    }
    return false;
  }) : [];

  // Разделение на Действующие и Завершенные
  const activeDeals = companyDeals.filter(d => d.invoiceStatus !== "Оплачено");
  const completedDeals = companyDeals.filter(d => d.invoiceStatus === "Оплачено");
  
  const activeOrders = companySupplyOrders.filter(so => so.status !== "Доставлен");
  const completedOrders = companySupplyOrders.filter(so => so.status === "Доставлен");
  
  const activeRepairs = companyRepairs.filter(r => r.status !== "Готово");
  const completedRepairs = companyRepairs.filter(r => r.status === "Готово");

  const activeSubrent = companySubrentVehicles.filter(v => v.status !== "Архив" && v.status !== "Завершен");
  const completedSubrent = companySubrentVehicles.filter(v => v.status === "Архив" || v.status === "Завершен");

  const currentDate = new Date();
  const activeInsurance = companyInsuranceVehicles.filter(v => new Date(v.insuranceDate) >= currentDate);
  const completedInsurance = companyInsuranceVehicles.filter(v => new Date(v.insuranceDate) < currentDate);
  
  const totalActive = activeDeals.length + activeOrders.length + activeRepairs.length + activeSubrent.length + activeInsurance.length;
  const totalCompleted = completedDeals.length + completedOrders.length + completedRepairs.length + completedSubrent.length + completedInsurance.length;

  // Генерация списков для вкладок
  const replaceLeadingEmojiWithSvg = (titleStr) => {
    const iconMap = {
      "📄": `<svg viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: currentColor; stroke-width: 2.2; fill: none; margin-right: 4px; display: inline-block; vertical-align: middle;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>`,
      "📦": `<svg viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: currentColor; stroke-width: 2.2; fill: none; margin-right: 4px; display: inline-block; vertical-align: middle;"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5" rx="1"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>`,
      "🔧": `<svg viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: currentColor; stroke-width: 2.2; fill: none; margin-right: 4px; display: inline-block; vertical-align: middle;"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>`,
      "🚜": `<svg viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: currentColor; stroke-width: 2.2; fill: none; margin-right: 4px; display: inline-block; vertical-align: middle;"><circle cx="7.5" cy="17.5" r="2.5"></circle><circle cx="18.5" cy="15.5" r="4.5"></circle><path d="M14 9V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v6h12a2 2 0 0 0 2-2zM8 11h4M18.5 11h-3M6 5h4"></path></svg>`,
      "🛡️": `<svg viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: currentColor; stroke-width: 2.2; fill: none; margin-right: 4px; display: inline-block; vertical-align: middle;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`,
      "🛡": `<svg viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: currentColor; stroke-width: 2.2; fill: none; margin-right: 4px; display: inline-block; vertical-align: middle;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>`
    };
    for (let key in iconMap) {
      if (titleStr.startsWith(key)) {
        return iconMap[key] + titleStr.replace(key, "").trim();
      }
    }
    return titleStr;
  };

  // Генерация списков для вкладок
  const renderItemCard = (type, title, status, subtitle, price, docBtn, clickAction) => {
    let color = "#2563EB"; // crm
    if (type === 'supply') color = "#16A34A";
    if (type === 'repair') color = "#DC2626";
    if (type === 'subrent') color = "#8B5CF6"; // Фиолетовый для субаренды
    if (type === 'insurance') color = "#D97706"; // Янтарный для страхования
    
    const priceText = type === 'subrent' ? `${price.toLocaleString()} ₸/сутки` : `${price.toLocaleString()} ₸`;
    
    return `
      <div style="border: 1px solid var(--border-color); border-radius: 8px; padding: 12px; display: flex; flex-direction: column; gap: 6px; background-color: var(--bg-card); cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; margin-bottom: 8px;" 
           onclick="${clickAction}"
           onmouseover="this.style.transform='translateY(-2px)'; this.style.boxShadow='0 4px 8px rgba(0,0,0,0.08)';"
           onmouseout="this.style.transform='translateY(0)'; this.style.boxShadow='none';">
        <div style="display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700; font-size: 11px; color: ${color}; text-transform: uppercase; display: inline-flex; align-items: center; gap: 4px;">${replaceLeadingEmojiWithSvg(title)}</span>
          <span class="badge badge-warning" style="font-size: 9px; padding: 2px 6px;">${status}</span>
        </div>
        <div style="font-size: 12px; font-weight: 600; color: var(--text-primary);">${subtitle}</div>
        <div style="display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-secondary); border-top: 1px dashed var(--border-color); padding-top: 6px; margin-top: 4px;">
          <span>Сумма/Тариф:</span>
          <strong style="color: var(--text-primary); font-size: 12px;">${priceText}</strong>
        </div>
        ${docBtn}
      </div>
    `;
  };

  // HTML Действующих
  let activeListHtml = "";
  if (totalActive === 0) {
    activeListHtml = `<div style="padding: 16px; text-align: center; color: var(--text-secondary); font-style: italic; font-size: 12px;">Нет действующих договоров или заказов в работе.</div>`;
  } else {
    activeDeals.forEach(d => {
      const docBtn = d.contractSigned 
        ? `<button class="btn-secondary" style="font-size:10px; padding:4px 8px; margin-top:6px; width:100%; text-align:center;" onclick="event.stopPropagation(); openContractDocument('${d.id}');">📄 Открыть Договор (ЭЦП)</button>`
        : `<button class="btn-secondary" style="font-size:10px; padding:4px 8px; margin-top:6px; width:100%; text-align:center; color:var(--status-danger); border-color:var(--status-danger);" disabled>📄 Договор не подписан</button>`;
      
      activeListHtml += renderItemCard('crm', `📄 ДОГОВОР ${d.contractNumber || 'Б/Н'}`, d.stage, d.jobType, d.price, docBtn, `closeCompanyModal(); setTimeout(() => openDealDetails('${d.id}'), 150);`);
    });
    
    activeOrders.forEach(so => {
      const docBtn = `<button class="btn-secondary" style="font-size:10px; padding:4px 8px; margin-top:6px; width:100%; text-align:center;" onclick="event.stopPropagation(); openOrderDocument('${so.id}');">📦 Открыть Накладную</button>`;
      activeListHtml += renderItemCard('supply', `📦 ЗАКАЗ ПОСТАВКИ ${so.id}`, so.status, `Закупка: ${so.partName} (x${so.qty} шт.)`, so.total, docBtn, `closeCompanyModal(); setTimeout(() => openSupplyOrderDetail('${so.id}'), 150);`);
    });
    
    activeRepairs.forEach(r => {
      const docBtn = `<button class="btn-secondary" style="font-size:10px; padding:4px 8px; margin-top:6px; width:100%; text-align:center;" onclick="event.stopPropagation(); openRepairDocument('${r.id}');">🔧 Открыть Заказ-наряд</button>`;
      activeListHtml += renderItemCard('repair', `🔧 ЗАКАЗ-НАРЯД ${r.id}`, r.status, r.description, r.laborCost, docBtn, `closeCompanyModal(); setTimeout(() => openRepairManage('${r.id}'), 150);`);
    });

    activeSubrent.forEach(v => {
      const docBtn = `<button class="btn-secondary" style="font-size:10px; padding:4px 8px; margin-top:6px; width:100%; text-align:center;" onclick="event.stopPropagation(); openSubrentContractDocument('${v.id}');">📄 Открыть Договор Аренды</button>`;
      activeListHtml += renderItemCard('subrent', `🚜 ДОГОВОР АРЕНДЫ SUB-${v.invNumber}`, v.status, `${v.name} (Госномер: ${v.plate})`, v.subrentRate, docBtn, `closeCompanyModal();`);
    });

    activeInsurance.forEach(v => {
      const docBtn = `<button class="btn-secondary" style="font-size:10px; padding:4px 8px; margin-top:6px; width:100%; text-align:center;" onclick="event.stopPropagation(); openInsurancePolicyDocument('${v.id}');">📄 Открыть Полис</button>`;
      activeListHtml += renderItemCard('insurance', `🛡️ ПОЛИС POL-${v.invNumber}`, "Активен", `Страхование техники: ${v.name} (${v.plate})`, v.insuranceCost, docBtn, `closeCompanyModal();`);
    });
  }

  // HTML Завершенных
  let completedListHtml = "";
  if (totalCompleted === 0) {
    completedListHtml = `<div style="padding: 16px; text-align: center; color: var(--text-secondary); font-style: italic; font-size: 12px;">Нет завершенных (оплаченных) сделок в архиве.</div>`;
  } else {
    completedDeals.forEach(d => {
      const docBtn = `<button class="btn-secondary" style="font-size:10px; padding:4px 8px; margin-top:6px; width:100%; text-align:center;" onclick="event.stopPropagation(); openContractDocument('${d.id}');">📄 Открыть Договор (ЭЦП)</button>`;
      completedListHtml += renderItemCard('crm', `📄 ДОГОВОР ${d.contractNumber || 'Б/Н'}`, "Оплачен", d.jobType, d.price, docBtn, `closeCompanyModal(); setTimeout(() => openDealDetails('${d.id}'), 150);`);
    });
    
    completedOrders.forEach(so => {
      const docBtn = `<button class="btn-secondary" style="font-size:10px; padding:4px 8px; margin-top:6px; width:100%; text-align:center;" onclick="event.stopPropagation(); openOrderDocument('${so.id}');">📦 Открыть Накладную</button>`;
      completedListHtml += renderItemCard('supply', `📦 ЗАКАЗ ПОСТАВКИ ${so.id}`, "Выполнен", `Закупка: ${so.partName} (x${so.qty} шт.)`, so.total, docBtn, `closeCompanyModal(); setTimeout(() => openSupplyOrderDetail('${so.id}'), 150);`);
    });
    
    completedRepairs.forEach(r => {
      const docBtn = `<button class="btn-secondary" style="font-size:10px; padding:4px 8px; margin-top:6px; width:100%; text-align:center;" onclick="event.stopPropagation(); openRepairDocument('${r.id}');">🔧 Открыть Заказ-наряд</button>`;
      completedListHtml += renderItemCard('repair', `🔧 ЗАКАЗ-НАРЯД ${r.id}`, "Готово", r.description, r.laborCost, docBtn, `closeCompanyModal(); setTimeout(() => openRepairManage('${r.id}'), 150);`);
    });

    completedSubrent.forEach(v => {
      const docBtn = `<button class="btn-secondary" style="font-size:10px; padding:4px 8px; margin-top:6px; width:100%; text-align:center;" onclick="event.stopPropagation(); openSubrentContractDocument('${v.id}');">📄 Открыть Договор Аренды</button>`;
      completedListHtml += renderItemCard('subrent', `🚜 ДОГОВОР АРЕНДЫ SUB-${v.invNumber}`, "Завершен", `${v.name} (Госномер: ${v.plate})`, v.subrentRate, docBtn, `closeCompanyModal();`);
    });

    completedInsurance.forEach(v => {
      const docBtn = `<button class="btn-secondary" style="font-size:10px; padding:4px 8px; margin-top:6px; width:100%; text-align:center;" onclick="event.stopPropagation(); openInsurancePolicyDocument('${v.id}');">📄 Открыть Полис</button>`;
      completedListHtml += renderItemCard('insurance', `🛡️ ПОЛИС POL-${v.invNumber}`, "Истек", `Страхование техники: ${v.name} (${v.plate})`, v.insuranceCost, docBtn, `closeCompanyModal();`);
    });
  }

  body.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:12px;">
      <!-- Вкладки сверху -->
      <div class="chart-period-selector" style="display: flex; gap: 8px; border-bottom: 1px solid var(--border-color); padding-bottom: 12px;">
        <button class="btn-secondary active" id="btn-comp-tab-info" onclick="switchCompanyTab('info')" style="font-size:11px; padding:6px 12px;">📋 Информация</button>
        <button class="btn-secondary" id="btn-comp-tab-active" onclick="switchCompanyTab('active')" style="font-size:11px; padding:6px 12px;">🔄 Действующие (${totalActive})</button>
        <button class="btn-secondary" id="btn-comp-tab-archive" onclick="switchCompanyTab('archive')" style="font-size:11px; padding:6px 12px;">✓ Завершенные (${totalCompleted})</button>
      </div>

      <!-- СОДЕРЖИМОЕ ВКЛАДКИ: ИНФОРМАЦИЯ -->
      <div id="compTabContentInfo" style="display:block;">
        <div style="display:flex; flex-direction:column; gap:12px;">
          <!-- Карточка предприятия -->
          <div style="background: var(--bg-secondary); padding: 12px; border-radius: 8px; border-left: 4px solid var(--brand-color);">
            <h4 style="font-size:14px; font-weight:700; color: var(--text-primary); margin:0;">${c.name}</h4>
            <div style="display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px;">
              <span class="badge badge-neutral" style="font-size: 9px; padding: 2px 5px;">${c.type}</span>
              <span class="badge badge-neutral" style="font-size: 9px; padding: 2px 5px;">БИН: ${c.bin}</span>
              <span class="badge badge-neutral" style="font-size: 9px; padding: 2px 5px;">г. ${c.city}</span>
              <span class="badge ${c.status === 'Активен' ? 'badge-success' : 'badge-danger'}" style="font-size: 9px; padding: 2px 5px;">${c.status}</span>
            </div>
          </div>
          
          <!-- Профиль деятельности -->
          <div style="padding: 4px 0;">
            <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--text-secondary); display:block; margin-bottom:2px;">Профиль деятельности и ТМЦ:</span>
            <span style="font-size:12.5px; font-weight: 500;">${c.vehicleTypes}</span>
          </div>

          <!-- Финансовое состояние -->
          <div style="border-top:1px solid var(--border-color); padding-top:10px; display:flex; justify-content:space-between; align-items:center;">
            <div>
              <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--text-secondary); display:block; margin-bottom:2px;">Взаиморасчеты (Баланс):</span>
              <div style="font-size:12.5px; margin-bottom: 2px;">${balanceText}</div>
            </div>
            <div>
              ${balanceBtnHtml}
            </div>
          </div>
          
          <!-- Проверка безопасности -->
          <div style="border-top:1px solid var(--border-color); padding-top:10px;">
            <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--text-secondary); display:block; margin-bottom:4px;">Безопасность и Комплаенс ТБ:</span>
            <div style="font-size:12px;">${safetyText}</div>
          </div>
        </div>
      </div>

      <!-- СОДЕРЖИМОЕ ВКЛАДКИ: ДЕЙСТВУЮЩИЕ -->
      <div id="compTabContentActive" style="display:none;">
        <div style="display:flex; flex-direction:column; gap:10px; max-height:300px; overflow-y:auto; padding-right: 4px;">
          ${activeListHtml}
        </div>
      </div>

      <!-- СОДЕРЖИМОЕ ВКЛАДКИ: ЗАВЕРШЕННЫЕ -->
      <div id="compTabContentArchive" style="display:none;">
        <div style="display:flex; flex-direction:column; gap:10px; max-height:300px; overflow-y:auto; padding-right: 4px;">
          ${completedListHtml}
        </div>
      </div>
    </div>
  `;
  
  footer.innerHTML = `
    <div style="display:flex; gap:8px;">
      <button class="btn-secondary" style="color:var(--status-danger); border-color:var(--status-danger); font-size:11px; padding:6px 12px;" onclick="toggleCompanyStatus('${c.id}')">
        Изменить статус допуска
      </button>
    </div>
    <button class="btn-primary" style="font-size: 13px; padding: 8px 20px; border-radius: 30px;" onclick="closeCompanyModal()">Закрыть</button>
  `;
  
  openModal("companyDetailsModal");
}

function switchCompanyTab(tabName) {
  document.querySelectorAll("[id^='btn-comp-tab-']").forEach(btn => btn.classList.remove("active"));
  const activeBtn = document.getElementById("btn-comp-tab-" + tabName);
  if (activeBtn) activeBtn.classList.add("active");
  
  document.getElementById("compTabContentInfo").style.display = tabName === 'info' ? 'block' : 'none';
  document.getElementById("compTabContentActive").style.display = tabName === 'active' ? 'block' : 'none';
  document.getElementById("compTabContentArchive").style.display = tabName === 'archive' ? 'block' : 'none';
}

function registerCompanyPayment(compId) {
  const c = db.companies.find(x => x.id === compId);
  if (!c) return;
  
  const cleanName = (str) => str.replace(/[«»""''\s]/g, "").toLowerCase();
  const compClean = cleanName(c.name);
  
  db.deals.forEach(d => {
    const dClean = cleanName(d.companyName);
    if (dClean.includes(compClean) || compClean.includes(dClean)) {
      if (d.invoiceStatus !== "Оплачено") {
        d.invoiceStatus = "Оплачено";
        d.stage = "Оплата";
      }
    }
  });
  
  const oldDebt = c.debt;
  c.debt = 0;
  saveState();
  renderCompanies();
  renderDebtorsTable();
  openCompanyDetails(c.id);
  showSystemNotification(`Оплата от ${c.name} в размере ${oldDebt.toLocaleString()} ₸ зарегистрирована. Задолженность полностью погашена!`);
}

function openReconciliationStatement(compId) {
  const c = db.companies.find(x => x.id === compId);
  if (!c) return;
  
  const body = document.getElementById("viewDocumentBody");
  if (!body) return;
  
  const dateStr = new Date().toISOString().split('T')[0];
  const balanceVal = c.debt;
  
  let balanceStatusText = "";
  if (balanceVal > 0) {
    balanceStatusText = `Сальдо в пользу ТОО «KazBildInvest»: <strong>${balanceVal.toLocaleString()} ₸</strong> (дебиторская задолженность)`;
  } else if (balanceVal < 0) {
    balanceStatusText = `Сальдо в пользу ${c.name}: <strong>${Math.abs(balanceVal).toLocaleString()} ₸</strong> (кредиторская задолженность)`;
  } else {
    balanceStatusText = `Задолженность отсутствует. Баланс расчетов нулевой.`;
  }
  
  body.innerHTML = `
    <div class="document-view-container" style="font-family: 'Outfit', 'Inter', sans-serif; color: #333; line-height: 1.5;">
      <div style="text-align: center; border-bottom: 2px solid var(--brand-color); padding-bottom: 12px; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 700; text-transform: uppercase; margin: 0; color: #1E3A8A;">Акт сверки взаиморасчетов</h3>
        <div style="font-size: 12px; color: #555; margin-top: 4px;">За период по состоянию на ${dateStr}</div>
      </div>
      
      <div style="font-size: 11px; margin-bottom: 16px;">
        <p>Мы, нижеподписавшиеся, ТОО «KazBildInvest» (в лице Генерального директора Исаева Ж. А.) с одной стороны, и <strong>${c.name}</strong> с другой стороны, составили настоящий акт сверки в том, что состояние взаимных расчетов по данным учета на указанную дату характеризуется следующими показателями:</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
        <thead>
          <tr style="background-color: #F8F9FA; border-bottom: 1px solid #DDD;">
            <th style="padding: 8px; text-align: left; border: 1px solid #DDD; font-weight: 700;">Дебет (наши требования к ${c.name})</th>
            <th style="padding: 8px; text-align: left; border: 1px solid #DDD; font-weight: 700;">Кредит (требования ${c.name} к нам)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 8px; border: 1px solid #DDD; vertical-align: top;">
              ${balanceVal > 0 ? `Оказано услуг аренды / поставки техники на сумму: <strong>${balanceVal.toLocaleString()} ₸</strong>` : `Расчеты по договорам закрыты или переплата`}
            </td>
            <td style="padding: 8px; border: 1px solid #DDD; vertical-align: top;">
              ${balanceVal < 0 ? `Поставлено ТМЦ / оказано услуг на сумму: <strong>${Math.abs(balanceVal).toLocaleString()} ₸</strong>` : `Претензий не предъявлено`}
            </td>
          </tr>
          <tr style="font-weight: 700; background-color: #EEE;">
            <td style="padding: 8px; border: 1px solid #DDD;">Итого Дебет: ${balanceVal > 0 ? balanceVal.toLocaleString() + ' ₸' : '0 ₸'}</td>
            <td style="padding: 8px; border: 1px solid #DDD;">Итого Кредит: ${balanceVal < 0 ? Math.abs(balanceVal).toLocaleString() + ' ₸' : '0 ₸'}</td>
          </tr>
        </tbody>
      </table>
      
      <div style="font-size: 12px; margin-bottom: 20px; background: var(--bg-secondary); padding: 12px; border-radius: 6px; border-left: 4px solid var(--brand-color);">
        <strong>Результат сверки:</strong>
        <p style="margin: 4px 0 0 0;">${balanceStatusText}</p>
      </div>
      
      <div style="display: flex; justify-content: space-between; border-top: 1px dashed #CCC; padding-top: 12px; font-size: 11px; margin-top: 20px;">
        <div>
          <strong>ТОО «KazBildInvest»:</strong>
          <div style="margin-top: 8px; color: #2563EB; font-weight: bold; border: 1px solid #2563EB; padding: 2px 6px; border-radius: 4px; display: inline-block;">ПОДПИСАНО ЭЦП</div>
        </div>
        <div style="text-align: right;">
          <strong>${c.name}:</strong>
          <div style="margin-top: 8px; color: #16A34A; font-weight: bold; border: 1px solid #16A34A; padding: 2px 6px; border-radius: 4px; display: inline-block;">ПОДПИСАНО ЭЦП</div>
        </div>
      </div>
    </div>
  `;
  
  closeCompanyModal();
  openModal("viewDocumentModal");
}

function closeCompanyModal() {
  closeModal("companyDetailsModal");
}

function toggleCompanyStatus(compId) {
  const c = db.companies.find(x => x.id === compId);
  if (!c) return;
  
  const statuses = ["Активен", "На проверке ТБ", "Заблокирован за долги"];
  let currIdx = statuses.indexOf(c.status);
  let nextIdx = (currIdx + 1) % statuses.length;
  c.status = statuses[nextIdx];
  
  saveState();
  renderCompanies();
  openCompanyDetails(c.id);
  showSystemNotification(`Статус контрагента ${c.name} изменен на "${c.status}"`);
}

function openCreateCompanyModal() {
  document.getElementById("companyForm").reset();
  openModal("createCompanyModal");
}

function submitCreateCompany() {
  const name = document.getElementById("newCompName").value.trim();
  const bin = document.getElementById("newCompBin").value.trim();
  const type = document.getElementById("newCompType").value;
  const city = document.getElementById("newCompCity").value.trim();
  const vehicleTypes = document.getElementById("newCompVehicleTypes").value.trim();
  const debt = parseInt(document.getElementById("newCompDebt").value) || 0;
  const safetyIndex = parseInt(document.getElementById("newCompSafetyIndex").value) || 100;
  const status = document.getElementById("newCompStatus").value;
  
  if (!name || !bin || !city || !vehicleTypes) {
    alert("Пожалуйста, заполните все обязательные поля!");
    return;
  }
  
  const newComp = {
    id: "comp_" + (db.companies.length + 1) + "_" + Date.now().toString().slice(-4),
    name,
    bin,
    type,
    city,
    vehicleTypes,
    activeContracts: 1,
    debt,
    safetyIndex,
    status
  };
  
  db.companies.push(newComp);
  saveState();
  renderCompanies();
  closeModal("createCompanyModal");
  showSystemNotification(`Компания ${name} добавлена в реестр контрагентов!`);
}

// ----------------------------------------------------
// МОДЕРНИЗАЦИЯ: МОДУЛЬ «ЗАДАЧИ И ПОРУЧЕНИЯ» (KANBAN)
// ----------------------------------------------------
function renderTasksKanban() {
  const lists = {
    todo: document.getElementById("task-list-todo"),
    in_progress: document.getElementById("task-list-in_progress"),
    safety_review: document.getElementById("task-list-safety_review"),
    completed: document.getElementById("task-list-completed")
  };
  
  // Очистка списков
  Object.keys(lists).forEach(key => {
    if (lists[key]) lists[key].innerHTML = "";
  });
  
  const currentDate = "2026-06-20";

  const taskStages = {
    todo: { color: "#64748B", badgeBg: "#E2E8F0" },
    in_progress: { color: "#2563EB", badgeBg: "#DBEAFE" },
    safety_review: { color: "#D97706", badgeBg: "#FEF3C7" },
    completed: { color: "#16A34A", badgeBg: "#DCFCE7" }
  };
  
  db.tasks.forEach(t => {
    const list = lists[t.status];
    if (!list) return;
    
    // Проверка просрочки
    const isOverdue = t.status !== 'completed' && t.dueDate < currentDate;
    
    const card = document.createElement("div");
    card.className = `task-card ${isOverdue ? 'overdue' : ''}`;
    card.draggable = true;
    card.id = `task-card-${t.id}`;
    card.style.borderLeft = `3px solid ${taskStages[t.status].color}`;
    card.style.cursor = "pointer";
    card.onclick = () => openTaskDetails(t.id);
    
    // Установка перетаскивания
    card.addEventListener("dragstart", (e) => handleTaskDragStart(e, t.id));
    card.addEventListener("dragend", handleTaskDragEnd);
    
    card.innerHTML = `
      ${isOverdue ? `
        <div class="badge badge-warning" style="font-size: 8px; padding: 2px 4px; margin-bottom: 6px; display: inline-flex; align-items: center; gap: 3px; max-width: max-content;">
          <svg viewBox="0 0 24 24" style="width: 10px; height: 10px; stroke: currentColor; stroke-width: 2.2; fill: none; display: inline-block;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
          ПРОСРОЧЕНО
        </div>
      ` : ''}
      <div class="task-card-title">${t.title}</div>
      <div class="task-card-desc">${t.description}</div>
      <div class="task-card-meta">
        <span>Срок: <strong>${t.dueDate}</strong></span>
        ${t.vehicleId ? `<span>Машина: ${getVehicleInvNumber(t.vehicleId)}</span>` : ''}
        ${t.siteId ? `<span>Объект: ${getSiteName(t.siteId)}</span>` : ''}
        <span>Исполнитель: <strong>${getDriverName(t.assignee)}</strong></span>
        ${t.signedDocument ? `
          <span style="background:var(--status-success); color:white; font-weight:600; cursor:pointer; display: inline-flex; align-items: center; gap: 4px; padding: 2px 6px; border-radius: 4px;" onclick="openSignedDocument('${t.id}')">
            <svg viewBox="0 0 24 24" style="width: 11px; height: 11px; stroke: currentColor; stroke-width: 2.2; fill: none; display: inline-block; vertical-align: middle;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg> Документ
          </span>` : ''}
      </div>
    `;
    list.appendChild(card);
  });
  
  // Обновление счетчиков в заголовках и цвета колонок
  Object.keys(taskStages).forEach(status => {
    const colEl = document.getElementById(`task-col-${status}`);
    if (colEl) {
      colEl.style.borderTop = `4px solid ${taskStages[status].color}`;
      
      const headerEl = colEl.querySelector(".kanban-column-header");
      if (headerEl) {
        headerEl.style.color = taskStages[status].color;
        headerEl.style.fontWeight = "700";
        headerEl.style.fontSize = "11px";
        headerEl.style.display = "flex";
        headerEl.style.justifyContent = "space-between";
        headerEl.style.alignItems = "center";
        
        const countSpan = document.getElementById(`task-count-${status}`);
        if (countSpan) {
          countSpan.className = ""; // Remove badge-neutral
          countSpan.style.padding = "2px 6px";
          countSpan.style.borderRadius = "4px";
          countSpan.style.backgroundColor = taskStages[status].badgeBg;
          countSpan.style.color = taskStages[status].color;
          countSpan.style.fontSize = "10px";
          countSpan.style.fontWeight = "700";
          countSpan.innerText = db.tasks.filter(t => t.status === status).length;
        }
      }
    }
  });
}

function handleTaskDragStart(e, taskId) {
  e.dataTransfer.setData("text/plain", taskId);
  e.dataTransfer.effectAllowed = "move";
  // Используем таймаут, чтобы прозрачность не применялась к drag-образу
  setTimeout(() => {
    const el = document.getElementById(`task-card-${taskId}`);
    if (el) el.classList.add("dragging");
  }, 0);
}

function handleTaskDragEnd(e) {
  e.target.classList.remove("dragging");
  document.querySelectorAll(".kanban-column").forEach(col => col.classList.remove("drag-over"));
}

function allowTaskDrop(e) {
  e.preventDefault();
  e.currentTarget.classList.add("drag-over");
}

function handleTaskDragLeave(e) {
  e.currentTarget.classList.remove("drag-over");
}

function handleTaskDrop(e, newStatus) {
  e.preventDefault();
  e.currentTarget.classList.remove("drag-over");
  
  const taskId = e.dataTransfer.getData("text/plain");
  changeTaskStatus(taskId, newStatus);
}

function changeTaskStatus(taskId, newStatus) {
  const t = db.tasks.find(x => x.id === taskId);
  if (!t) return;
  
  const oldStatus = t.status;
  t.status = newStatus;
  
  // Авто-начисление водителю при закрытии
  if (newStatus === "completed" && oldStatus !== "completed") {
    t.signedDocument = true;
    t.signedDate = "2026-06-20";
    
    // Начисление бонуса для линейных сотрудников
    const driver = db.drivers.find(d => d.id === t.assignee);
    const time = new Date().toTimeString().split(' ')[0].substring(0, 5);
    
    if (driver && driver.baseSalary > 0) {
      driver.taskBonus = (driver.taskBonus || 0) + 15000;
      showSystemNotification(`Задача выполнена! Начислен бонус 15,000 ₸ водителю ${driver.name}`);
      
      db.chatLog.push({
        sender: "System",
        time: time,
        message: `🤖 ИИ-Ассистент: Задача "${t.title}" выполнена водителем ${driver.name} и проверена контролером (${t.controller}). Водителю начислен бонус 15 000 KZT. ФОТ пересчитан.`
      });
    } else {
      showSystemNotification(`Задача выполнена исполнителем ${getDriverName(t.assignee)}!`);
      db.chatLog.push({
        sender: "System",
        time: time,
        message: `🤖 ИИ-Ассистент: Задача "${t.title}" выполнена исполнителем ${getDriverName(t.assignee)} и проверена контролером (${t.controller}).`
      });
    }
  } else if (newStatus !== "completed" && oldStatus === "completed") {
    // Отмена выполнения
    t.signedDocument = false;
    t.signedDate = null;
    const driver = db.drivers.find(d => d.id === t.assignee);
    if (driver && driver.taskBonus) {
      driver.taskBonus = Math.max(0, driver.taskBonus - 15000);
    }
  }
  
  saveState();
  renderTasksKanban();
  calculateMonthlyPayroll();
  renderChatHistory();
}

function openCreateTaskModal() {
  document.getElementById("taskForm").reset();
  
  // Populate Assignee select list with all employees
  const assigneeSelect = document.getElementById("newTaskAssigneeSelect");
  if (assigneeSelect) {
    let html = `
      <optgroup label="Административный персонал">
        <option value="Director">Директор (Управление)</option>
        <option value="Dispatcher">Логист / Диспетчер</option>
        <option value="Warehouse">Заведующий складом</option>
        <option value="Mechanic">Механик (ТО и Ремонт)</option>
        <option value="HR">HR-специалист</option>
        <option value="Purchaser">Закупщик / Снабженец</option>
        <option value="Accountant">Бухгалтер / Расчетчик ФОТ</option>
      </optgroup>
      <optgroup label="Линейный персонал (Машинисты / Водители)">
    `;
    html += db.drivers.map(d => `<option value="${d.id}">${d.name} (${d.position})</option>`).join("");
    html += `</optgroup>`;
    assigneeSelect.innerHTML = html;
  }
  
  // Populate Vehicle select list
  const vehicleSelect = document.getElementById("newTaskVehicleSelect");
  if (vehicleSelect) {
    let html = `<option value="">Без привязки к машине</option>`;
    html += db.vehicles.map(v => `<option value="${v.id}">${v.invNumber} (${v.name})</option>`).join("");
    vehicleSelect.innerHTML = html;
  }
  
  // Populate Site select list
  const siteSelect = document.getElementById("newTaskSiteSelect");
  if (siteSelect) {
    let html = `<option value="">Без привязки к объекту</option>`;
    html += db.sites.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
    siteSelect.innerHTML = html;
  }
  
  openModal("createTaskModal");
}

function submitCreateTask() {
  const title = document.getElementById("newTaskTitle").value.trim();
  const description = document.getElementById("newTaskDesc").value.trim();
  const vehicleId = document.getElementById("newTaskVehicleSelect").value;
  const siteId = document.getElementById("newTaskSiteSelect").value;
  const dueDate = document.getElementById("newTaskDueDate").value;
  const assignee = document.getElementById("newTaskAssigneeSelect").value;
  const controller = document.getElementById("newTaskController").value;
  const documentType = document.getElementById("newTaskDocType").value;
  
  if (!title || !description || !dueDate || !assignee) {
    alert("Пожалуйста, заполните все обязательные поля!");
    return;
  }
  
  const newTask = {
    id: "task_" + (db.tasks.length + 1) + "_" + Date.now().toString().slice(-4),
    title,
    description,
    vehicleId: vehicleId || null,
    siteId: siteId || null,
    dueDate,
    initiator: db.settings.activeRole,
    assignee,
    controller,
    status: "todo",
    signedDocument: false,
    signedDate: null,
    documentType
  };
  
  db.tasks.push(newTask);
  saveState();
  renderTasksKanban();
  closeModal("createTaskModal");
  showSystemNotification(`Задача "${title}" успешно создана!`);
  
  // Проверка на просрочку
  const currentDate = "2026-06-20";
  if (dueDate < currentDate) {
    const time = new Date().toTimeString().split(' ')[0].substring(0, 5);
    db.chatLog.push({
      sender: "System",
      time: time,
      message: `⚠️ ВНИМАНИЕ! Новая задача "${title}" создана уже просроченной (дедлайн: ${dueDate})! Исполнителю ${getDriverName(assignee)} срочно приступить к работе.`
    });
    saveState();
    renderChatHistory();
  }

}

// ----------------------------------------------------
// МОДЕРНИЗАЦИЯ: ПОДПИСЬ И ГЕНЕРАЦИЯ ДОКУМЕНТОВ
// Линейная отчетность перенесена в ИИ WhatsApp


function openSignedDocument(taskId) {
  const t = db.tasks.find(x => x.id === taskId);
  if (!t) return;
  
  const body = document.getElementById("viewDocumentBody");
  const signatureImg = t.signatureData ? `<img src="${t.signatureData}" style="max-height: 60px; max-width: 150px; border-bottom:1px solid #CCC; background:#FFF; display:block; margin: 4px 0;" />` : `<em>Электронная подпись</em>`;
  
  body.innerHTML = `
    <div class="document-view-container">
      <div class="document-header">
        <div style="font-weight:800; font-size:12px; letter-spacing:1px;">ТОО KAZBILDINVEST</div>
        <div style="font-size:10px; color:#555;">Система автоматизации нарядов и согласований</div>
        <div class="document-title">${t.documentType}</div>
      </div>
      
      <div class="document-meta-grid">
        <div>Номер документа: <strong>KBI-DOC-${t.id.replace('task_', '').toUpperCase()}</strong></div>
        <div>Дата составления: <strong>${t.signedDate || '2026-06-20'}</strong></div>
        <div>Объект: <strong>${getSiteName(t.siteId)}</strong></div>
        <div>Спецтехника: <strong>${getVehicleName(t.vehicleId)} (${getVehiclePlate(t.vehicleId)})</strong></div>
      </div>
      
      <div class="document-body">
        <p>Настоящим документом подтверждается, что исполнитель (машинист/водитель) <strong>${getDriverName(t.assignee)}</strong> в полном объеме и качественно выполнил порученные работы:</p>
        <div style="background:#F8F9FA; border-left:3px solid var(--brand-color); padding:10px; margin: 12px 0; font-weight:600;">
          ${t.title}
        </div>
        <p style="font-size:12px; color:#555; font-style:italic;">Описание: ${t.description}</p>
        <p style="margin-top:12px;">Контроль и приемка работ произведена. Нарушений правил охраны труда и техники безопасности (ТБ/ОТ) не обнаружено. Контролирующий орган: <strong>${t.controller}</strong>.</p>
      </div>
      
      <div class="document-footer-signatures">
        <div>
          <div>Сдал (Исполнитель):</div>
          <div style="margin-top: 10px;">${signatureImg}</div>
          <div style="font-size:10px; color:#666; margin-top:2px;">${getDriverName(t.assignee)}</div>
        </div>
        
        <div style="text-align:right; display: flex; flex-direction: column; align-items: flex-end;">
          <div>Принял (Контролер):</div>
          <div style="margin-top: 25px; font-weight:bold; color:var(--brand-color); border: 2px solid var(--brand-color); padding: 4px 8px; border-radius:4px; display:inline-block; font-size:10px; letter-spacing:0.5px;">ПРИНЯТО В ERP</div>
          <div style="font-size:10px; color:#666; margin-top:6px;">${t.controller}</div>
        </div>
      </div>
    </div>
  `;
  
  openModal("viewDocumentModal");
}

function openTaskDetails(taskId) {
  const t = db.tasks.find(x => x.id === taskId);
  if (!t) return;
  
  const body = document.getElementById("taskDetailsModalBody");
  const footer = document.getElementById("taskDetailsModalFooter");
  if (!body || !footer) return;
  
  // Status name mapping
  const statusNames = {
    todo: "К выполнению",
    in_progress: "В работе",
    safety_review: "Проверка ТБ",
    completed: "Выполнено"
  };
  
  const statusColors = {
    todo: "#64748B",
    in_progress: "#2563EB",
    safety_review: "#D97706",
    completed: "#16A34A"
  };
  
  const vehicleName = t.vehicleId ? `${getVehicleName(t.vehicleId)} (Инв: ${getVehicleInvNumber(t.vehicleId)})` : "Не привязана";
  const siteName = t.siteId ? getSiteName(t.siteId) : "Не привязан";
  const assigneeName = getDriverName(t.assignee) || t.assignee;
  
  let docStatusText = "";
  let viewDocBtn = "";
  if (t.signedDocument) {
    docStatusText = `<span style="color:var(--status-success); font-weight:700; display:inline-flex; align-items:center; gap:6px;"><svg viewBox="0 0 24 24" style="width:12px; height:12px; fill:currentColor; stroke:none; display:inline-block;"><circle cx="12" cy="12" r="10"></circle></svg> Документ подписан (${t.signedDate || '2026-06-20'})</span>`;
    viewDocBtn = `<button class="btn-secondary" style="font-size:11px; padding:6px 12px; margin-top:8px; width:100%; text-align:center;" onclick="closeModal('taskDetailsModal'); openSignedDocument('${t.id}')">📄 Посмотреть документ (${t.documentType})</button>`;
  } else {
    docStatusText = `<span style="color:var(--status-danger); font-weight:700; display:inline-flex; align-items:center; gap:6px;"><svg viewBox="0 0 24 24" style="width:12px; height:12px; fill:currentColor; stroke:none; display:inline-block;"><circle cx="12" cy="12" r="10"></circle></svg> Документ не подписан (требуется: ${t.documentType})</span>`;
  }
  
  body.innerHTML = `
    <div style="display:flex; flex-direction:column; gap:16px;">
      <!-- Заголовок и статус -->
      <div style="background: var(--bg-secondary); padding: 16px; border-radius: 10px; border-left: 4px solid ${statusColors[t.status]};">
        <h4 style="font-size:15px; font-weight:700; color: var(--text-primary); margin:0;">${t.title}</h4>
        <div style="margin-top: 8px; display:flex; gap:8px; align-items:center;">
          <span class="badge" style="background:${statusColors[t.status]}20; color:${statusColors[t.status]}; font-size:10px; padding:2px 6px; font-weight:700;">
            ${statusNames[t.status]}
          </span>
          <span style="font-size:11px; color:var(--text-secondary);">ID: ${t.id}</span>
        </div>
      </div>
      
      <!-- Описание -->
      <div style="border-bottom: 1px dashed var(--border-color); padding-bottom: 12px;">
        <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--text-secondary); display:block; margin-bottom:4px;">Описание задачи:</span>
        <div style="font-size:12.5px; line-height:1.5; color: var(--text-primary);">${t.description}</div>
      </div>
      
      <!-- Параметры -->
      <div class="grid-container" style="gap:12px; border-bottom: 1px dashed var(--border-color); padding-bottom: 12px;">
        <div class="col-6" style="font-size:12px;">
          <span style="color:var(--text-secondary); display:block; margin-bottom:2px;">Исполнитель:</span>
          <strong>${assigneeName}</strong>
        </div>
        <div class="col-6" style="font-size:12px;">
          <span style="color:var(--text-secondary); display:block; margin-bottom:2px;">Контролер:</span>
          <strong>${t.controller}</strong>
        </div>
        <div class="col-6" style="font-size:12px; margin-top:6px;">
          <span style="color:var(--text-secondary); display:block; margin-bottom:2px;">Спецтехника:</span>
          <strong>${vehicleName}</strong>
        </div>
        <div class="col-6" style="font-size:12px; margin-top:6px;">
          <span style="color:var(--text-secondary); display:block; margin-bottom:2px;">Строительный объект:</span>
          <strong>${siteName}</strong>
        </div>
        <div class="col-6" style="font-size:12px; margin-top:6px;">
          <span style="color:var(--text-secondary); display:block; margin-bottom:2px;">Срок выполнения (Дедлайн):</span>
          <strong style="color:${t.status !== 'completed' && t.dueDate < '2026-06-20' ? 'var(--status-danger)' : 'inherit'}">${t.dueDate}</strong>
        </div>
        <div class="col-6" style="font-size:12px; margin-top:6px;">
          <span style="color:var(--text-secondary); display:block; margin-bottom:2px;">Инициатор:</span>
          <strong>${t.initiator}</strong>
        </div>
      </div>
      
      <!-- Отчетность и подписи -->
      <div>
        <span style="font-size:10px; font-weight:700; text-transform:uppercase; color:var(--text-secondary); display:block; margin-bottom:4px;">Отчетность и закрывающий документ:</span>
        <div style="font-size:12px;">${docStatusText}</div>
        ${viewDocBtn}
      </div>
    </div>
  `;
  
  // Status change options in footer
  let statusButtonsHtml = "";
  if (t.status === "todo") {
    statusButtonsHtml = `<button class="btn-primary" style="font-size:11px; padding:6px 12px; margin:0;" onclick="changeTaskStatus('${t.id}', 'in_progress'); closeModal('taskDetailsModal'); openTaskDetails('${t.id}');">▶ Начать работу</button>`;
  } else if (t.status === "in_progress") {
    statusButtonsHtml = `<button class="btn-primary" style="font-size:11px; padding:6px 12px; margin:0; background-color:var(--status-warning); border-color:var(--status-warning);" onclick="changeTaskStatus('${t.id}', 'safety_review'); closeModal('taskDetailsModal'); openTaskDetails('${t.id}');">⏳ Отправить на ТБ</button>`;
  } else if (t.status === "safety_review") {
    statusButtonsHtml = `<button class="btn-primary" style="font-size:11px; padding:6px 12px; margin:0; background-color:var(--status-success); border-color:var(--status-success);" onclick="changeTaskStatus('${t.id}', 'completed'); closeModal('taskDetailsModal'); openTaskDetails('${t.id}');">✅ Завершить задачу</button>`;
  } else if (t.status === "completed") {
    statusButtonsHtml = `<button class="btn-secondary" style="font-size:11px; padding:6px 12px; margin:0; color:var(--status-danger); border-color:var(--status-danger);" onclick="changeTaskStatus('${t.id}', 'in_progress'); closeModal('taskDetailsModal'); openTaskDetails('${t.id}');">🔄 Вернуть в работу</button>`;
  }
  
  footer.innerHTML = `
    <div style="display:flex; gap:8px;">
      <button class="btn-secondary" style="color:var(--status-danger); border-color:var(--status-danger); font-size:11px; padding:6px 12px;" onclick="deleteTask('${t.id}')">
        🗑️ Удалить
      </button>
      ${statusButtonsHtml}
    </div>
    <button class="btn-primary" style="font-size: 13px; padding: 8px 20px; border-radius: 30px;" onclick="closeModal('taskDetailsModal')">Закрыть</button>
  `;
  
  openModal("taskDetailsModal");
}

function deleteTask(taskId) {
  if (confirm("Вы действительно хотите удалить эту задачу?")) {
    db.tasks = db.tasks.filter(t => t.id !== taskId);
    saveState();
    renderTasksKanban();
    closeModal("taskDetailsModal");
    showSystemNotification("Задача удалена успешно.");
  }
}

function checkOverdueTasks() {
  const currentDate = "2026-06-20";
  let newlyAlerted = false;
  
  db.tasks.forEach(t => {
    if (t.status !== 'completed' && t.dueDate < currentDate) {
      // Проверяем, есть ли уже алерт в чат-логе
      const alreadyAlerted = db.chatLog.some(log => log.message.includes(t.title));
      if (!alreadyAlerted) {
        const time = new Date().toTimeString().split(' ')[0].substring(0, 5);
        const vehicleInfo = t.vehicleId ? ` по спецтехнике ${getVehicleInvNumber(t.vehicleId)}` : "";
        db.chatLog.push({
          sender: "System",
          time: time,
          message: `⚠️ ВНИМАНИЕ! Обнаружена просроченная критическая задача "${t.title}"${vehicleInfo} на объекте ${getSiteName(t.siteId)}. Дедлайн был: ${t.dueDate}. Просьба исполнителю ${getDriverName(t.assignee)} зайти в кабинет водителя и закрыть наряд-допуск!`
        });
        newlyAlerted = true;
      }
    }
  });
  
  if (newlyAlerted) {
    saveState();
    renderChatHistory();
  }
}



// Заполнение выпадающих списков при инициализации форм
function renderFormSelectors() {
  const sitesSelect = document.getElementById("dealSiteSelect");
  if (sitesSelect) {
    sitesSelect.innerHTML = db.sites.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
  }
  
  const relocateVehicleSelect = document.getElementById("relocateVehicleSelect");
  if (relocateVehicleSelect) {
    relocateVehicleSelect.innerHTML = db.vehicles.map(v => `<option value="${v.id}">${v.invNumber} (${v.name})</option>`).join("");
    updateRelocateOldSite();
  }
  
  const relocateNewSiteSelect = document.getElementById("relocateNewSiteSelect");
  if (relocateNewSiteSelect) {
    relocateNewSiteSelect.innerHTML = db.sites.map(s => `<option value="${s.id}">${s.name}</option>`).join("");
  }
  
  const repairVehicleSelect = document.getElementById("repairVehicleSelect");
  if (repairVehicleSelect) {
    repairVehicleSelect.innerHTML = db.vehicles.map(v => `<option value="${v.id}">${v.invNumber} (${v.name})</option>`).join("");
  }
  
  const receivePartSelect = document.getElementById("receivePartSelect");
  if (receivePartSelect) {
    receivePartSelect.innerHTML = db.warehouses.central.map(i => `<option value="${i.sku}">${i.name}</option>`).join("");
  }
  
  const transferPartSelect = document.getElementById("transferPartSelect");
  if (transferPartSelect) {
    transferPartSelect.innerHTML = db.warehouses.central.map(i => `<option value="${i.sku}">${i.name}</option>`).join("");
    updateTransferQtyLimit();
  }
  
  const transferBoardVehicleSelect = document.getElementById("transferBoardVehicleSelect");
  if (transferBoardVehicleSelect) {
    transferBoardVehicleSelect.innerHTML = db.vehicles.map(v => `<option value="${v.id}">${v.invNumber}</option>`).join("");
  }
  
  const reqPartSelect = document.getElementById("reqPartSelect");
  if (reqPartSelect) {
    reqPartSelect.innerHTML = db.warehouses.central.map(i => `<option value="${i.sku}">${i.name}</option>`).join("");
  }
}

function updateRelocateOldSite() {
  const vId = document.getElementById("relocateVehicleSelect").value;
  const v = db.vehicles.find(x => x.id === vId);
  const site = v ? db.sites.find(s => s.id === v.currentSiteId) : null;
  document.getElementById("relocateOldSite").value = site ? site.name : "База Атырау";
}

function submitRelocateVehicle() {
  const vId = document.getElementById("relocateVehicleSelect").value;
  const newSiteId = document.getElementById("relocateNewSiteSelect").value;
  const reason = document.getElementById("relocateReason").value;
  
  const v = db.vehicles.find(x => x.id === vId);
  if (v) {
    const oldSite = db.sites.find(s => s.id === v.currentSiteId);
    const newSite = db.sites.find(s => s.id === newSiteId);
    
    // Вносим запись в перемещения
    db.vehicleMoves.push({
      id: "m_" + (db.vehicleMoves.length + 1),
      vehicleId: vId,
      oldSite: oldSite ? oldSite.name : "База Атырау",
      newSite: newSite ? newSite.name : "Неизвестно",
      date: new Date().toISOString().split('T')[0],
      reason: reason || "Производственная необходимость",
      author: db.settings.activeRole
    });
    
    v.currentSiteId = newSiteId;
    saveState();
    
    renderGanttChart();
    renderMovesHistoryTable();
    closeModal("relocateVehicleModal");
    showSystemNotification(`Техника ${v.invNumber} успешно перебазирована на объект ${newSite ? newSite.name : ''}`);
    
    // Обновляем маркер на карте
    if (window.vehicleMarkers[vId]) {
      window.vehicleMarkers[vId].targetSiteId = newSiteId;
      window.vehicleMarkers[vId].lat = newSite.lat + (Math.random() - 0.5) * 0.03;
      window.vehicleMarkers[vId].lng = newSite.lng + (Math.random() - 0.5) * 0.03;
      window.vehicleMarkers[vId].marker.setLatLng([window.vehicleMarkers[vId].lat, window.vehicleMarkers[vId].lng]);
    }
  }
}

function renderMovesHistoryTable() {
  const table = document.getElementById("movesHistoryTable");
  if (!table) return;
  const tbody = table.querySelector("tbody");
  tbody.innerHTML = "";
  
  db.vehicleMoves.forEach(move => {
    const v = db.vehicles.find(x => x.id === move.vehicleId);
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${v ? v.invNumber : '???'}</strong><br><span style="font-size:11px;color:var(--text-secondary);">${v ? v.name : ''}</span></td>
      <td>${move.oldSite}</td>
      <td>${move.newSite}</td>
      <td>${move.date}</td>
      <td>${move.reason}</td>
      <td><span class="badge badge-neutral">${move.author}</span></td>
    `;
    tbody.appendChild(tr);
  });
}

function updateTransferQtyLimit() {
  const sku = document.getElementById("transferPartSelect").value;
  const fromWh = document.getElementById("transferFromSelect").value;
  
  let balance = 0;
  if (fromWh === 'central') {
    const item = db.warehouses.central.find(i => i.sku === sku);
    balance = item ? item.balance : 0;
  } else {
    const siteItems = db.warehouses.sites[fromWh];
    const item = siteItems ? siteItems.find(i => i.sku === sku) : null;
    balance = item ? item.balance : 0;
  }
  
  document.getElementById("transferPartMax").innerText = balance;
  document.getElementById("transferQty").max = balance;
}

// Отслеживание выбора списания в технику
document.getElementById("transferToSelect").onchange = function() {
  const select = this.value;
  document.getElementById("transferBoardVehicleGroup").style.display = select === 'board' ? 'block' : 'none';
};

function submitCreateDeal() {
  const comp = document.getElementById("dealCompany").value;
  const cont = document.getElementById("dealContact").value;
  const siteId = document.getElementById("dealSiteSelect").value;
  const addr = document.getElementById("dealAddress").value;
  const job = document.getElementById("dealJobType").value;
  const start = document.getElementById("dealStart").value;
  const end = document.getElementById("dealEnd").value;
  const count = parseInt(document.getElementById("dealCount").value);
  const pay = document.getElementById("dealPaymentOption").value;
  
  const newDeal = {
    id: "deal_" + (db.deals.length + 1),
    companyName: comp,
    contactPerson: cont,
    siteId: siteId,
    address: addr,
    jobType: job,
    startDate: start,
    endDate: end,
    vehicleCount: count,
    vehicleIds: [],
    price: count * 120000 * (1 + Math.floor((new Date(end) - new Date(start)) / (1000 * 60 * 60 * 24))),
    stage: "Лид",
    contractNumber: "",
    contractSigned: false,
    invoiceStatus: "Не выставлен счет"
  };
  
  db.deals.push(newDeal);
  saveState();
  
  renderCrmKanban();
  closeModal("createDealModal");
  showSystemNotification("Запрос в CRM успешно сформирован!");
}

// Дополнительные Хелперы
function getFutureDate(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString().split('T')[0];
}

function showSystemNotification(msg, type = "info") {
  // Удобный toast/алерт для информирования пользователя без блокирования (UX!)
  const toast = document.createElement("div");
  toast.style.position = "fixed";
  toast.style.bottom = "24px";
  toast.style.right = "24px";
  toast.style.backgroundColor = type === "error" ? "var(--status-danger)" : "var(--brand-color)";
  toast.style.color = "#FFFFFF";
  toast.style.padding = "14px 20px";
  toast.style.borderRadius = "8px";
  toast.style.boxShadow = "0 10px 25px rgba(0,0,0,0.2)";
  toast.style.zIndex = "10000";
  toast.style.fontSize = "13px";
  toast.style.fontWeight = "600";
  toast.style.pointerEvents = "auto";
  toast.style.cursor = "pointer";
  toast.style.display = "flex";
  toast.style.alignItems = "center";
  toast.style.gap = "10px";
  toast.style.transition = "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)";
  
  // Icon
  let iconSvg = "";
  if (type === "error") {
    iconSvg = `<svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:currentColor; stroke-width:2.2; fill:none; display:inline-block; vertical-align:middle;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;
  } else {
    iconSvg = `<svg viewBox="0 0 24 24" style="width:16px; height:16px; stroke:currentColor; stroke-width:2.2; fill:none; display:inline-block; vertical-align:middle;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  }
  toast.innerHTML = `<span style="display:flex; align-items:center;">${iconSvg}</span> <span>${msg}</span>`;
  
  // click to close immediately
  toast.onclick = () => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px) scale(0.95)";
    setTimeout(() => toast.remove(), 300);
  };
  
  document.body.appendChild(toast);
  
  // Slide in effect
  toast.style.transform = "translateY(20px) scale(0.95)";
  toast.style.opacity = "0";
  requestAnimationFrame(() => {
    toast.style.transform = "translateY(0) scale(1)";
    toast.style.opacity = "1";
  });
  
  setTimeout(() => {
    if (toast.parentNode) {
      toast.style.opacity = "0";
      toast.style.transform = "translateY(10px) scale(0.95)";
      setTimeout(() => toast.remove(), 300);
    }
  }, 4000);
}

// Управление модальными окнами
function openModal(id) {
  document.getElementById(id).classList.add("active");
  if (typeof applyPremiumStylesAndDecorators === "function") {
    applyPremiumStylesAndDecorators();
  }
}

function closeModal(id) {
  document.getElementById(id).classList.remove("active");
}

function toggleRepairFaultDetails() {
  const isChecked = document.getElementById("repairFaultByDriver").checked;
  document.getElementById("repairFaultDetails").style.display = isChecked ? 'block' : 'none';
}

// Сброс и перезагрузка демо-данных
function resetDemoData() {
  if (confirm("Вы уверены, что хотите сбросить базу данных к демо-пакету ТОО KazBildInvest?")) {
    localStorage.setItem("kaz_bild_invest_db", JSON.stringify(initialData));
    db = initialData;
    initApp();
    showSystemNotification("Демо-данные успешно восстановлены!");
  }
}

function clearSystemCache() {
  if (confirm("Очистить все сохраненные данные?")) {
    localStorage.removeItem("kaz_bild_invest_db");
    location.reload();
  }
}

// Тема оформления (Светлая / Темная)
function toggleAppTheme() {
  const current = document.documentElement.getAttribute("data-theme");
  const next = current === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute("data-theme", next);
  
  const darkUrl = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
  const lightUrl = 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
  
  if (window.map && window.lightTiles) {
    window.lightTiles.setUrl(next === 'dark' ? darkUrl : lightUrl);
  }
  if (window.dispatcherMap && window.dispatcherTiles) {
    window.dispatcherTiles.setUrl(next === 'dark' ? darkUrl : lightUrl);
  }
}

// Рендеринг всего
function renderAll() {
  renderCrmKanban();
  renderDebtorsTable();
  renderGanttChart();
  renderFuelTable();
  renderWarehouseInventory();
  renderLogisticsPipeline();
  renderRepairsTable();
  renderMaintenanceTracker();
  renderEmployeesTable();
  renderCompanies();
  renderTasksKanban();
  renderMovesHistoryTable();
  renderFormSelectors();
  renderObjectsPnl();
  renderFleetRoiTable();
  calculateMonthlyPayroll();
  renderGpsVehicleList();
  renderLodgingTable();
  renderLodgingStats();
  updateKpiDashboard();
  
  // Новые рендеры
  renderTimesheetGrid();
  renderStaffGrid();
  renderSettingsDashboard();
  
  // Render financial analytics chart
  window.activeChartPeriod = window.activeChartPeriod || "year";
  renderFinancialChart(window.activeChartPeriod);
}


// ----------------------------------------------------
// МОДУЛЬ ДИСПЕТЧЕРА И СНАБЖЕНЦА
// ----------------------------------------------------

function toggleSidebar() {
  const sidebar = document.querySelector(".sidebar");
  if (sidebar) {
    sidebar.classList.toggle("open");
  }
}

function initDispatcherMap() {
  if (window.dispatcherMap) return;
  const container = document.getElementById('dispatcher-map-container');
  if (!container) return;

  const centralKaz = [47.116, 52.848];
  window.dispatcherMap = L.map('dispatcher-map-container').setView(centralKaz, 8);
  
  const theme = document.documentElement.getAttribute("data-theme") || "light";
  const mapUrl = theme === 'dark'
    ? 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png'
    : 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png';
    
  window.dispatcherTiles = L.tileLayer(mapUrl, {
    attribution: '&copy; CartoDB'
  }).addTo(window.dispatcherMap);
  
  // Рисуем геозоны
  window.dispatcherGeofenceLayers = {};
  db.sites.forEach(site => {
    const polygon = L.polygon(site.polygon, {
      color: site.id === 'karabatan2' ? '#FF5722' : '#2196F3',
      fillColor: site.id === 'karabatan2' ? '#FF5722' : '#2196F3',
      fillOpacity: 0.15,
      weight: 2
    }).addTo(window.dispatcherMap);
    polygon.bindTooltip(`Геозона: ${site.name}`, { permanent: false, direction: "center" });
    window.dispatcherGeofenceLayers[site.id] = polygon;
  });

  // Маркеры техники на диспетчерской карте
  window.dispatcherVehicleMarkers = {};
  db.vehicles.forEach(v => {
    const markerInfo = window.vehicleMarkers[v.id];
    const lat = markerInfo ? markerInfo.lat : 47.116;
    const lng = markerInfo ? markerInfo.lng : 52.848;
    
    let pulseClass = 'marker-pulse-own';
    if (v.ownerType === 'subrent') pulseClass = 'marker-pulse-subrent';
    if (v.status === 'На ремонте' || v.status === 'Неисправна') pulseClass = 'marker-pulse-repair';
    
    const customIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `
        <div style="position:relative;">
          <div class="${pulseClass}"></div>
          <div class="vehicle-label-tag">${v.plate}</div>
        </div>
      `,
      iconSize: [14, 14],
      iconAnchor: [7, 7]
    });

    const marker = L.marker([lat, lng], { icon: customIcon }).addTo(window.dispatcherMap);
    const driver = db.drivers.find(d => d.id === v.driverId);
    
    marker.bindPopup(`
      <div style="font-family:'Inter',sans-serif; font-size:11px;">
        <strong>${v.name}</strong><br>
        Госномер: ${v.plate}<br>
        Инв. №: ${v.invNumber}<br>
        Машинист: ${driver ? driver.name : 'Нет'}<br>
        Статус: <strong>${v.status}</strong><br>
        Топливо: 85% | Скорость: <span id="disp-popup-speed-${v.id}">12</span> км/ч
      </div>
    `);
    
    window.dispatcherVehicleMarkers[v.id] = { marker, lat, lng };
  });
}

function renderDispatcherHub() {
  renderDispatcherAlerts();
  
  // Заполняем селекторы
  const select = document.getElementById("dispatchChatDriverSelect");
  if (select && select.innerHTML === "") {
    select.innerHTML = db.drivers.map(d => `<option value="${d.id}">${d.name} (${d.position})</option>`).join("");
    select.onchange = () => {
      renderDriverChat(select.value);
    };
  }
  
  if (select && select.value) {
    renderDriverChat(select.value);
  }
}

function renderDispatcherAlerts() {
  const alertsLog = document.getElementById("dispatcherAlertsLog");
  if (!alertsLog) return;
  alertsLog.innerHTML = "";
  
  const activeAlerts = db.gpsAlerts.filter(a => a.status === "active");
  if (activeAlerts.length === 0) {
    alertsLog.innerHTML = `<div style="padding: 12px; text-align: center; color: var(--text-secondary); font-size: 12px;">Нет активных инцидентов GPS.</div>`;
    return;
  }
  
  activeAlerts.forEach(alert => {
    const alertDiv = document.createElement("div");
    alertDiv.className = `alert-log-item ${alert.type === 'geofence' ? 'danger' : 'warning'}`;
    alertDiv.style.cssText = `
      padding: 10px 12px;
      border: 1px solid var(--border-color);
      border-radius: 6px;
      background-color: var(--bg-card);
      display: flex;
      flex-direction: column;
      gap: 8px;
      border-left: 4px solid ${alert.type === 'geofence' ? 'var(--status-danger)' : 'var(--status-warning)'};
    `;
    
    let actionsHtml = "";
    if (alert.type === "geofence") {
      actionsHtml = `
        <div style="display: flex; gap: 6px;">
          <button class="btn-primary" style="font-size: 10px; padding: 4px 8px; background-color: var(--status-success);" onclick="resolveGpsAlert('${alert.id}', 'allow')">Разрешить выезд</button>
          <button class="btn-secondary" style="font-size: 10px; padding: 4px 8px;" onclick="resolveGpsAlert('${alert.id}', 'warn')">Предупредить водителя</button>
        </div>
      `;
    } else if (alert.type === "idling") {
      actionsHtml = `
        <div style="display: flex; gap: 6px;">
          <button class="btn-secondary" style="font-size: 10px; padding: 4px 8px;" onclick="resolveGpsAlert('${alert.id}', 'warn')">Предупредить</button>
          <button class="btn-primary" style="font-size: 10px; padding: 4px 8px; background-color: var(--brand-color);" onclick="resolveGpsAlert('${alert.id}', 'downtime')">Оформить простой</button>
        </div>
      `;
    }
    
    alertDiv.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: flex-start; font-size: 11px;">
        <span style="font-weight: 600;">${alert.type === 'geofence' ? '🚨 Выезд из геозоны' : '⚠️ Длительный простой'}</span>
        <span style="color: var(--text-secondary); font-size: 10px;">${alert.time}</span>
      </div>
      <div style="font-size: 11px; line-height: 1.4;">${alert.message}</div>
      ${actionsHtml}
    `;
    alertsLog.appendChild(alertDiv);
  });
}

function resolveGpsAlert(alertId, actionType) {
  const alert = db.gpsAlerts.find(a => a.id === alertId);
  if (!alert) return;
  
  const vehicle = db.vehicles.find(v => v.id === alert.vehicleId);
  
  if (actionType === "allow") {
    alert.status = "resolved";
    db.vehicleMoves.push({
      id: "m_" + Date.now(),
      vehicleId: alert.vehicleId,
      oldSite: "Объект " + (vehicle ? getSiteName(vehicle.currentSiteId) : "Карабатан"),
      newSite: "Выезд за пределы геозоны",
      date: new Date().toISOString().split('T')[0],
      reason: "Согласовано диспетчером",
      author: "Диспетчер"
    });
    showSystemNotification("Выезд официально разрешен. Запись внесена в журнал перемещений.");
  } else if (actionType === "warn") {
    alert.status = "resolved";
    if (vehicle && vehicle.driverId) {
      db.driverMessages.push({
        id: "msg_" + Date.now(),
        driverId: vehicle.driverId,
        sender: "Диспетчер",
        time: new Date().toTimeString().split(' ')[0].substring(0, 5),
        message: alert.type === 'geofence' ? "Внимание! Вы зафиксированы вне геозоны! Немедленно вернитесь на объект или свяжитесь с диспетчером." : "Зафиксирован простой двигателя более 3 часов. Сообщите причину!"
      });
      renderDriverChat(vehicle.driverId);
    }
    showSystemNotification("Водителю отправлено предупреждение в чат.");
  } else if (actionType === "downtime") {
    alert.status = "resolved";
    if (vehicle) {
      vehicle.status = "На ремонте";
      db.repairs.push({
        id: "rep_" + Date.now(),
        vehicleId: vehicle.id,
        siteId: vehicle.currentSiteId || "karabatan",
        driverId: vehicle.driverId,
        description: "Длительный простой двигателя без движения. Зафиксировано GPS.",
        status: "Новая",
        createdAt: new Date().toISOString().split('T')[0],
        faultByDriver: false,
        damageCost: 0,
        explanatoryAttached: false,
        partsRequested: [],
        laborCost: 0
      });
    }
    showSystemNotification("Оформить простой: Статус техники изменен на 'На ремонте', создана заявка.");
  }
  
  saveState();
  renderDispatcherAlerts();
  renderRepairsTable();
  renderGanttChart();
  renderMovesHistoryTable();
}

function renderDriverChat(driverId) {
  const dispatchSelect = document.getElementById("dispatchChatDriverSelect");
  if (dispatchSelect) {
    const activeDispDriverId = dispatchSelect.value;
    const dispatchChatHistory = document.getElementById("dispatchChatHistory");
    if (dispatchChatHistory && activeDispDriverId) {
      dispatchChatHistory.innerHTML = "";
      const msgs = db.driverMessages.filter(m => m.driverId === activeDispDriverId);
      msgs.forEach(m => {
        const msgDiv = document.createElement("div");
        msgDiv.style.cssText = `padding: 6px 10px; border-radius: 8px; max-width: 80%; font-size: 11px; margin-bottom: 4px; line-height: 1.3; display: flex; flex-direction: column;`;
        if (m.sender === "Диспетчер") {
          msgDiv.style.backgroundColor = "var(--brand-color)";
          msgDiv.style.color = "#FFF";
          msgDiv.style.alignSelf = "flex-end";
          msgDiv.innerHTML = `
            <div style="font-weight:700; font-size:10px; margin-bottom:2px; display:flex; justify-content:space-between; width:100%;">
              <span>Диспетчер</span>
              <span style="opacity:0.8; font-weight:normal;">${m.time}</span>
            </div>
            <div>${m.message}</div>
          `;
        } else {
          msgDiv.style.backgroundColor = "var(--bg-card)";
          msgDiv.style.border = "1px solid var(--border-color)";
          msgDiv.style.alignSelf = "flex-start";
          msgDiv.innerHTML = `
            <div style="font-weight:700; font-size:10px; margin-bottom:2px; display:flex; justify-content:space-between; width:100%;">
              <span style="color:var(--brand-color);">${getDriverName(m.driverId)}</span>
              <span style="color:var(--text-secondary); font-weight:normal;">${m.time}</span>
            </div>
            <div>${m.message}</div>
          `;
        }
        dispatchChatHistory.appendChild(msgDiv);
        
        if (m.reply) {
          const repDiv = document.createElement("div");
          repDiv.style.cssText = `padding: 6px 10px; border-radius: 8px; max-width: 80%; font-size: 11px; margin-bottom: 4px; line-height: 1.3; display: flex; flex-direction: column;`;
          repDiv.style.backgroundColor = "var(--bg-card)";
          repDiv.style.border = "1px solid var(--border-color)";
          repDiv.style.alignSelf = "flex-start";
          repDiv.innerHTML = `
            <div style="font-weight:700; font-size:10px; margin-bottom:2px; display:flex; justify-content:space-between; width:100%;">
              <span style="color:var(--brand-color);">${getDriverName(m.driverId)}</span>
              <span style="color:var(--text-secondary); font-weight:normal;">${m.time}</span>
            </div>
            <div>${m.reply}</div>
          `;
          dispatchChatHistory.appendChild(repDiv);
        }
      });
      dispatchChatHistory.scrollTop = dispatchChatHistory.scrollHeight;
    }
  }


}

function sendDispatchChatMessage() {
  const select = document.getElementById("dispatchChatDriverSelect");
  if (!select) return;
  const driverId = select.value;
  if (!driverId) return;
  
  const input = document.getElementById("dispatchChatMessageText");
  const text = input.value.trim();
  if (!text) return;
  
  const time = new Date().toTimeString().split(' ')[0].substring(0, 5);
  db.driverMessages.push({
    id: "msg_" + Date.now(),
    driverId: driverId,
    sender: "Диспетчер",
    time: time,
    message: text
  });
  
  saveState();
  input.value = "";
  renderDriverChat(driverId);
}


function loadDriverChatHistory() {
  const select = document.getElementById("dispatchChatDriverSelect");
  if (select && select.value) {
    renderDriverChat(select.value);
  }
}

function renderPurchasingHub() {
  // 1. Pending requests
  const requestsTable = document.getElementById("purchasingRequestsTable");
  if (requestsTable) {
    const tbody = requestsTable.querySelector("tbody");
    tbody.innerHTML = "";
    
    let requestCount = 0;
    db.repairs.forEach(rep => {
      const v = db.vehicles.find(x => x.id === rep.vehicleId);
      const vName = v ? `${v.name} (${v.plate})` : "Неизвестно";
      
      if (rep.partsRequested) {
        rep.partsRequested.forEach(part => {
          if (part.status === "Запрошено" || part.status === "В заказе") {
            requestCount++;
            const row = document.createElement("tr");
            row.innerHTML = `
              <td><strong>${vName}</strong></td>
              <td>${part.name}<br><small style="color:var(--text-secondary);">${part.sku}</small></td>
              <td>${part.qty} шт.</td>
              <td>${rep.description}</td>
              <td>
                ${part.status === "Запрошено" ? 
                  `<button class="btn-primary" style="font-size:11px; padding:4px 8px;" onclick="openCreateSupplyOrderModal('${part.sku}', '${part.name}', ${part.qty}, '${rep.id}')">Оформить заказ</button>` : 
                  `<span class="badge badge-warning" style="font-size:10px;">В заказе</span>`
                }
              </td>
            `;
            tbody.appendChild(row);
          }
        });
      }
    });
    
    if (requestCount === 0) {
      tbody.innerHTML = `<tr><td colspan="5" style="text-align:center; color:var(--text-secondary);">Нет активных запросов на запчасти от механиков.</td></tr>`;
    }
  }

  // 2. Supply Orders
  const ordersTable = document.getElementById("purchasingOrdersTable");
  if (ordersTable) {
    const tbody = ordersTable.querySelector("tbody");
    tbody.innerHTML = "";
    
    if (db.supplyOrders && db.supplyOrders.length > 0) {
      db.supplyOrders.forEach(so => {
        const row = document.createElement("tr");
        const isOrdered = so.status === "Оформлен";
        row.innerHTML = `
          <td><strong>${so.id}</strong><br><small style="color:var(--text-secondary);">${so.date}</small></td>
          <td>${so.partName}<br><small style="color:var(--text-secondary);">${so.partSku} (x${so.qty})</small></td>
          <td><strong>${so.total.toLocaleString()} ₸</strong></td>
          <td>${so.supplier}</td>
          <td>
            <span class="badge ${isOrdered ? 'badge-warning' : 'badge-success'}" style="font-size:10px;">
              ${so.status}
            </span>
          </td>
          <td>
            ${isOrdered ? 
              `<button class="btn-primary" style="font-size:11px; padding:4px 8px;" onclick="receiveSupplyOrder('${so.id}')">Принять на склад</button>` : 
              `<span style="color:var(--status-success); font-weight:600; display:inline-flex; align-items:center; gap:4px;"><svg viewBox="0 0 24 24" style="width:12px; height:12px; stroke:currentColor; stroke-width:2.2; fill:none; display:inline-block;"><polyline points="20 6 9 17 4 12"></polyline></svg> Доставлено</span>`
            }
          </td>
        `;
        tbody.appendChild(row);
      });
    } else {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center; color:var(--text-secondary);">Нет заказов поставщикам.</td></tr>`;
    }
  }

  // 3. Board Stock Allocation Table
  const boardTable = document.getElementById("boardStockAllocationTable");
  if (boardTable) {
    const tbody = boardTable.querySelector("tbody");
    tbody.innerHTML = "";
    
    db.vehicles.forEach(v => {
      const driver = db.drivers.find(d => d.id === v.driverId);
      const driverName = driver ? driver.name : "Не назначен";
      
      const boardItems = db.warehouses.board ? (db.warehouses.board[v.id] || []) : [];
      const itemsHtml = boardItems.length > 0 ? 
        boardItems.map(item => `<span class="badge badge-neutral" style="margin-right: 4px; margin-bottom: 4px; font-size: 11px;">${item.name} (${item.balance} шт)</span>`).join("") : 
        `<span style="color:var(--text-secondary); font-style:italic; font-size:11px;">Пусто</span>`;
         
      const row = document.createElement("tr");
      row.innerHTML = `
        <td><strong>${v.name}</strong><br><small style="color:var(--text-secondary);">${v.plate} | ${v.invNumber}</small></td>
        <td>${driverName}</td>
        <td><div style="display:flex; flex-wrap:wrap;">${itemsHtml}</div></td>
        <td><span class="badge badge-success" style="font-size:10px;">Активен</span></td>
      `;
      tbody.appendChild(row);
    });
  }
}

function openCreateSupplyOrderModal(partSku, partName, qty, repairId) {
  openModal("createSupplyOrderModal");
  
  // Заполняем селектор деталей (все SKU с Центрального склада + запрошенная деталь)
  const select = document.getElementById("soPartSelect");
  if (select) {
    const allSkusMap = new Map();
    db.warehouses.central.forEach(item => allSkusMap.set(item.sku, { sku: item.sku, name: item.name }));
    db.repairs.forEach(rep => {
      if (rep.partsRequested) {
        rep.partsRequested.forEach(part => {
          if (!allSkusMap.has(part.sku)) {
            allSkusMap.set(part.sku, { sku: part.sku, name: part.name });
          }
        });
      }
    });
    
    select.innerHTML = Array.from(allSkusMap.values()).map(p => `<option value="${p.sku}">${p.name} (${p.sku})</option>`).join("");
  }
  
  // Заполняем поставщиков
  const supplierSelect = document.getElementById("soSupplierSelect");
  if (supplierSelect) {
    supplierSelect.innerHTML = db.directories.suppliers.map(s => `<option value="${s.name}">${s.name}</option>`).join("");
  }

  if (partSku) {
    document.getElementById("soPartSelect").value = partSku;
    document.getElementById("soQty").value = qty || 1;
    autoFillOrderPrice();
    
    const form = document.getElementById("supplyOrderForm");
    form.dataset.repairId = repairId;
    form.dataset.partSku = partSku;
  } else {
    const form = document.getElementById("supplyOrderForm");
    delete form.dataset.repairId;
    delete form.dataset.partSku;
  }
}

function autoFillOrderPrice() {
  const sku = document.getElementById("soPartSelect").value;
  const item = db.warehouses.central.find(i => i.sku === sku);
  const price = item ? item.price : 15000;
  document.getElementById("soPrice").value = price;
  recalcOrderTotal();
}

function recalcOrderTotal() {
  const qty = parseInt(document.getElementById("soQty").value) || 0;
  const price = parseInt(document.getElementById("soPrice").value) || 0;
  document.getElementById("soTotalDisplay").value = (qty * price).toLocaleString() + " ₸";
}

function submitCreateSupplyOrder() {
  const form = document.getElementById("supplyOrderForm");
  const sku = document.getElementById("soPartSelect").value;
  const qty = parseInt(document.getElementById("soQty").value) || 1;
  const price = parseInt(document.getElementById("soPrice").value) || 0;
  const supplier = document.getElementById("soSupplierSelect").value;
  
  const select = document.getElementById("soPartSelect");
  const partName = select.options[select.selectedIndex]?.text.split(" (")[0] || sku;
  
  const repairId = form.dataset.repairId;
  const partSku = form.dataset.partSku;
  
  const newOrder = {
    id: "so_" + (db.supplyOrders.length + 1),
    partSku: sku,
    partName: partName,
    qty: qty,
    price: price,
    total: qty * price,
    supplier: supplier,
    status: "Оформлен",
    date: new Date().toISOString().split('T')[0]
  };
  
  db.supplyOrders.push(newOrder);
  
  if (repairId) {
    const repair = db.repairs.find(r => r.id === repairId);
    if (repair && repair.partsRequested) {
      const part = repair.partsRequested.find(p => p.sku === partSku);
      if (part) {
        part.status = "В заказе";
      }
    }
  }
  
  saveState();
  closeModal("createSupplyOrderModal");
  renderPurchasingHub();
  renderRepairsTable();
  showSystemNotification(`Создан заказ поставщику ${supplier} на сумму ${newOrder.total.toLocaleString()} ₸`);
}

function receiveSupplyOrder(orderId) {
  const so = db.supplyOrders.find(o => o.id === orderId);
  if (!so) return;
  
  so.status = "Доставлен";
  
  // 1. Пополнение остатка на центральном складе
  const centralItem = db.warehouses.central.find(i => i.sku === so.partSku);
  if (centralItem) {
    centralItem.balance += so.qty;
  } else {
    db.warehouses.central.push({
      id: "tmc_" + Date.now(),
      sku: so.partSku,
      name: so.partName,
      category: "Запчасти",
      supplier: so.supplier,
      price: so.price,
      balance: so.qty,
      minStock: 2
    });
  }
  
  // 2. Взаиморасчеты с поставщиком
  const company = db.companies.find(c => {
    const cleanCName = c.name.replace(/[«»""'']/g, "").toLowerCase();
    const cleanSName = so.supplier.replace(/[«»""'']/g, "").toLowerCase();
    return cleanCName.includes(cleanSName) || cleanSName.includes(cleanCName);
  });
  
  if (company) {
    company.debt = (company.debt || 0) + so.total;
  }
  
  // 3. Обновление статуса в заявках ремонта
  db.repairs.forEach(rep => {
    if (rep.partsRequested) {
      rep.partsRequested.forEach(part => {
        if (part.sku === so.partSku && part.status === "В заказе") {
          part.status = "На складе";
        }
      });
    }
  });

  saveState();
  renderPurchasingHub();
  renderWarehouseInventory();
  renderRepairsTable();
  renderCompanies();
  showSystemNotification(`Заказ ${orderId} принят на Склад. Товарный запас пополнен на ${so.qty} шт.`);
}

function openTransferBoardStockModal() {
  openModal("transferBoardStockModal");
  
  // Заполняем селекторы
  const vehicleSelect = document.getElementById("tbsVehicleSelect");
  if (vehicleSelect) {
    vehicleSelect.innerHTML = db.vehicles.map(v => `<option value="${v.id}">${v.invNumber} (${v.name})</option>`).join("");
  }
  
  const partSelect = document.getElementById("tbsPartSelect");
  if (partSelect) {
    partSelect.innerHTML = db.warehouses.central.map(i => `<option value="${i.sku}">${i.name} (${i.sku})</option>`).join("");
  }
  
  updateTbsWarehouseLimit();
}

function updateTbsWarehouseLimit() {
  const sku = document.getElementById("tbsPartSelect").value;
  const centralItem = db.warehouses.central.find(i => i.sku === sku);
  const qty = centralItem ? centralItem.balance : 0;
  document.getElementById("tbsLimitDisplay").value = `${qty} шт.`;
  document.getElementById("tbsQty").max = qty;
}

function submitTransferBoardStock() {
  const vehicleId = document.getElementById("tbsVehicleSelect").value;
  const sku = document.getElementById("tbsPartSelect").value;
  const qty = parseInt(document.getElementById("tbsQty").value) || 1;
  
  const centralItem = db.warehouses.central.find(i => i.sku === sku);
  if (!centralItem) {
    alert("Деталь не найдена на Центральном складе!");
    return;
  }
  
  if (centralItem.balance < qty) {
    alert(`Недостаточное количество на складе! Доступно: ${centralItem.balance}`);
    return;
  }
  
  // Списание с центрального склада
  centralItem.balance -= qty;
  
  // Зачисление в бортовой запас
  if (!db.warehouses.board) db.warehouses.board = {};
  if (!db.warehouses.board[vehicleId]) db.warehouses.board[vehicleId] = [];
  
  const boardItem = db.warehouses.board[vehicleId].find(i => i.sku === sku);
  if (boardItem) {
    boardItem.balance += qty;
  } else {
    db.warehouses.board[vehicleId].push({
      sku: sku,
      name: centralItem.name,
      balance: qty
    });
  }
  
  saveState();
  closeModal("transferBoardStockModal");
  renderPurchasingHub();
  renderWarehouseInventory();
  showSystemNotification(`Передано ${qty} шт. (${centralItem.name}) в бортовой запас техники.`);
}

// ----------------------------------------------------
// МОДУЛЬ 12: ДЕТАЛИЗАЦИЯ И ИНТЕРАКТИВ ДАШБОРДА (KPI И P&L)
// ----------------------------------------------------

function updateKpiDashboard() {
  // Выручка
  const activeDeals = db.deals.filter(d => d.stage !== "Лид" && d.stage !== "КП");
  const totalRevenue = activeDeals.reduce((sum, d) => sum + d.price, 0);
  const revenuePlan = 10000000;
  const revenuePercent = Math.round((totalRevenue / revenuePlan) * 100);
  
  const kpiRevenueEl = document.getElementById("kpiRevenue");
  if (kpiRevenueEl) {
    kpiRevenueEl.innerText = `${totalRevenue.toLocaleString()} ₸`;
    const subtextEl = kpiRevenueEl.nextElementSibling;
    if (subtextEl) {
      subtextEl.innerText = `План: ${revenuePlan.toLocaleString()} ₸ (${revenuePercent}%)`;
    }
  }

  // Утилизация
  const totalVehicles = db.vehicles.length;
  const workingVehicles = db.vehicles.filter(v => v.status === "В работе" || v.status === "Работает").length;
  const utilPercent = totalVehicles > 0 ? ((workingVehicles / totalVehicles) * 100).toFixed(1) : 0;
  
  const kpiUtilizationEl = document.getElementById("kpiUtilization");
  if (kpiUtilizationEl) {
    kpiUtilizationEl.innerText = `${utilPercent}%`;
    const subtextEl = kpiUtilizationEl.nextElementSibling;
    if (subtextEl) {
      subtextEl.innerText = `${workingVehicles} из ${totalVehicles} единиц в работе`;
    }
  }

  // Дебиторская задолженность
  const totalDebt = db.companies.reduce((sum, c) => sum + (c.debt || 0), 0);
  const kpiDebtorsEl = document.getElementById("kpiDebtors");
  if (kpiDebtorsEl) {
    kpiDebtorsEl.innerText = `${totalDebt.toLocaleString()} ₸`;
    kpiDebtorsEl.style.color = totalDebt > 0 ? "var(--status-danger)" : "var(--text-primary)";
  }

  // Удержания (штрафы)
  const totalDeductions = db.drivers.reduce((sum, d) => {
    const fuelFine = (d.fuelTheftFines || 0) * 20000;
    const speedFine = (d.speedViolations || 0) * 5000;
    const safetyFine = (d.safetyViolationCount || 0) * 15000;
    return sum + fuelFine + speedFine + safetyFine;
  }, 0);
  const kpiDeductionsEl = document.getElementById("kpiDeductions");
  if (kpiDeductionsEl) {
    kpiDeductionsEl.innerText = `${totalDeductions.toLocaleString()} ₸`;
  }
}

function openKpiDetailModal(kpiType) {
  const modal = document.getElementById("dashboardDetailModal");
  const title = document.getElementById("dashboardDetailTitle");
  const body = document.getElementById("dashboardDetailBody");
  if (!modal || !title || !body) return;

  if (kpiType === 'revenue') {
    title.innerText = "Анализ выручки: Активные заказы и договоры";
    const activeDeals = db.deals.filter(d => d.stage !== "Лид" && d.stage !== "КП");
    const totalRev = activeDeals.reduce((sum, d) => sum + d.price, 0);
    
    let tableRows = activeDeals.map(d => {
      const site = db.sites.find(s => s.id === d.siteId);
      const siteName = site ? site.name : "Неизвестно";
      return `
        <tr style="cursor: pointer;" onclick="closeModal('dashboardDetailModal'); setTimeout(() => openDealDetails('${d.id}'), 150);">
          <td><strong>${d.companyName}</strong><br><small style="color:var(--text-secondary);">${d.jobType}</small></td>
          <td>${siteName}</td>
          <td>${d.startDate} - ${d.endDate}</td>
          <td><span class="badge ${d.contractSigned ? 'badge-success' : 'badge-danger'}">${d.contractSigned ? 'Подписан' : 'Нет договора'}</span></td>
          <td style="text-align: right; font-weight: 700;">${d.price.toLocaleString()} ₸</td>
        </tr>
      `;
    }).join("");
    
    body.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px; background: var(--bg-secondary); padding: 12px; border-radius: 8px;">
        <span>Всего выручки (этапы Договор - Оплата):</span>
        <strong style="color: var(--brand-color); font-size: 16px;">${totalRev.toLocaleString()} ₸</strong>
      </div>
      <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">💡 Кликните по строке сделки, чтобы открыть её карточку управления и документы.</p>
      <div class="table-wrapper">
        <table class="clean-table">
          <thead>
            <tr>
              <th>Контрагент / Работы</th>
              <th>Объект</th>
              <th>Сроки</th>
              <th>Договор</th>
              <th style="text-align: right;">Сумма</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="5" style="text-align:center;">Нет активных сделок</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } else if (kpiType === 'utilization') {
    title.innerText = "Утилизация спецтехники и статус парка";
    const totalVehicles = db.vehicles.length;
    const workingVehicles = db.vehicles.filter(v => v.status === "В работе" || v.status === "Работает").length;
    const maintenanceVehicles = db.vehicles.filter(v => v.status === "На ремонте" || v.status === "Неисправна").length;
    const freeVehicles = totalVehicles - workingVehicles - maintenanceVehicles;
    
    let tableRows = db.vehicles.map(v => {
      const driver = db.drivers.find(d => d.id === v.driverId);
      const driverName = driver ? driver.name : "Не назначен";
      const site = db.sites.find(s => s.id === v.currentSiteId);
      const siteName = site ? site.name : "База / Свободна";
      
      return `
        <tr>
          <td><strong>${v.name}</strong><br><small style="color:var(--text-secondary);">${v.plate} | Инв: ${v.invNumber}</small></td>
          <td>${driverName}</td>
          <td>${siteName}</td>
          <td>
            <select class="select-clean" style="font-size: 11px; padding: 2px 6px;" onchange="dashboardChangeVehicleStatus('${v.id}', this.value)">
              <option value="В работе" ${v.status === 'В работе' || v.status === 'Работает' ? 'selected' : ''}>В работе</option>
              <option value="Свободна" ${v.status === 'Свободна' || v.status === 'В резерве' ? 'selected' : ''}>Свободна</option>
              <option value="На ремонте" ${v.status === 'На ремонте' || v.status === 'Неисправна' ? 'selected' : ''}>На ремонте</option>
            </select>
          </td>
        </tr>
      `;
    }).join("");
    
    body.innerHTML = `
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; margin-bottom: 16px; text-align: center;">
        <div style="background: rgba(22, 163, 74, 0.1); padding: 8px; border-radius: 6px;">
          <div style="font-size:10px; text-transform:uppercase; color:var(--text-secondary);">В работе</div>
          <strong style="color: var(--status-success); font-size: 16px;">${workingVehicles} ед.</strong>
        </div>
        <div style="background: rgba(220, 38, 38, 0.1); padding: 8px; border-radius: 6px;">
          <div style="font-size:10px; text-transform:uppercase; color:var(--text-secondary);">Ремонт</div>
          <strong style="color: var(--status-danger); font-size: 16px;">${maintenanceVehicles} ед.</strong>
        </div>
        <div style="background: var(--bg-secondary); padding: 8px; border-radius: 6px;">
          <div style="font-size:10px; text-transform:uppercase; color:var(--text-secondary);">Резерв</div>
          <strong style="color: var(--text-primary); font-size: 16px;">${freeVehicles} ед.</strong>
        </div>
      </div>
      <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">💡 Вы можете изменить статус техники прямо в таблице ниже. Дашборд и Карта пересчитаются мгновенно.</p>
      <div class="table-wrapper" style="max-height: 320px; overflow-y: auto;">
        <table class="clean-table">
          <thead>
            <tr>
              <th>Спецтехника</th>
              <th>Машинист</th>
              <th>Текущая локация</th>
              <th>Статус</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows}
          </tbody>
        </table>
      </div>
    `;
  } else if (kpiType === 'debtors') {
    title.innerText = "Контроль дебиторской задолженности";
    const totalDebt = db.companies.reduce((sum, c) => sum + (c.debt || 0), 0);
    
    let tableRows = db.companies.filter(c => (c.debt || 0) > 0).map(c => {
      const isBlocked = c.blacklistStatus === 'blocked';
      return `
        <tr>
          <td>
            <strong>${c.name}</strong><br>
            <small style="color:var(--text-secondary);">БИН: ${c.bin} | Статус: 
              <span class="badge ${isBlocked ? 'badge-danger' : 'badge-success'}" style="font-size: 9px; padding: 2px 4px;">
                ${isBlocked ? 'Блокирован' : 'Допущен'}
              </span>
            </small>
          </td>
          <td style="font-weight: 700; color: var(--status-danger);">${c.debt.toLocaleString()} ₸</td>
          <td style="text-align: right;">
            <button class="btn-primary" style="font-size: 10px; padding: 4px 8px; background-color: var(--status-success);" onclick="dashboardPayClientDebt('${c.bin}')">Оплатить (ККТ)</button>
            <button class="btn-secondary" style="font-size: 10px; padding: 4px 8px;" onclick="dashboardSendReminder('${c.name}')">СМС-напоминание</button>
          </td>
        </tr>
      `;
    }).join("");
    
    body.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px; background: rgba(220, 38, 38, 0.05); border: 1px solid rgba(220, 38, 38, 0.15); padding: 12px; border-radius: 8px;">
        <span>Общая дебиторская задолженность контрагентов:</span>
        <strong style="color: var(--status-danger); font-size: 16px;">${totalDebt.toLocaleString()} ₸</strong>
      </div>
      <p style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">💡 Нажмите «Оплатить», чтобы списать задолженность контрагента и зарегистрировать приход средств.</p>
      <div class="table-wrapper">
        <table class="clean-table">
          <thead>
            <tr>
              <th>Клиент и Допуск</th>
              <th>Задолженность</th>
              <th style="text-align: right;">Действия</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="3" style="text-align:center;">Нет задолженностей</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  } else if (kpiType === 'deductions') {
    title.innerText = "Штрафные удержания водителей (ТБ / ГСМ)";
    const driversWithDeductions = db.drivers.filter(d => (d.fuelTheftFines || 0) > 0 || (d.speedViolations || 0) > 0 || (d.safetyViolationCount || 0) > 0);
    const totalDeductions = driversWithDeductions.reduce((sum, d) => {
      const fuelFine = (d.fuelTheftFines || 0) * 20000;
      const speedFine = (d.speedViolations || 0) * 5000;
      const safetyFine = (d.safetyViolationCount || 0) * 15000;
      return sum + fuelFine + speedFine + safetyFine;
    }, 0);
    
    let tableRows = "";
    driversWithDeductions.forEach(d => {
      const fuelFine = (d.fuelTheftFines || 0) * 20000;
      const speedFine = (d.speedViolations || 0) * 5000;
      const safetyFine = (d.safetyViolationCount || 0) * 15000;
      
      if (fuelFine > 0) {
        tableRows += `
          <tr>
            <td><strong>${d.name}</strong><br><small style="color:var(--text-secondary);">${d.position}</small></td>
            <td>🚨 Слив топлива (ГСМ)</td>
            <td style="color:var(--status-danger); font-weight:700;">-${fuelFine.toLocaleString()} ₸</td>
            <td style="text-align: right;"><button class="btn-secondary" style="font-size: 10px; padding: 4px 8px; color: var(--status-danger);" onclick="dashboardAnnulDeduction('${d.id}', 'fuel')">Аннулировать</button></td>
          </tr>
        `;
      }
      if (speedFine > 0) {
        tableRows += `
          <tr>
            <td><strong>${d.name}</strong><br><small style="color:var(--text-secondary);">${d.position}</small></td>
            <td>⚠️ Превышение скорости (GPS)</td>
            <td style="color:var(--status-danger); font-weight:700;">-${speedFine.toLocaleString()} ₸</td>
            <td style="text-align: right;"><button class="btn-secondary" style="font-size: 10px; padding: 4px 8px; color: var(--status-danger);" onclick="dashboardAnnulDeduction('${d.id}', 'speed')">Аннулировать</button></td>
          </tr>
        `;
      }
      if (safetyFine > 0) {
        tableRows += `
          <tr>
            <td><strong>${d.name}</strong><br><small style="color:var(--text-secondary);">${d.position}</small></td>
            <td>🛑 Нарушение регламентов ТБ</td>
            <td style="color:var(--status-danger); font-weight:700;">-${safetyFine.toLocaleString()} ₸</td>
            <td style="text-align: right;"><button class="btn-secondary" style="font-size: 10px; padding: 4px 8px; color: var(--status-danger);" onclick="dashboardAnnulDeduction('${d.id}', 'safety')">Аннулировать</button></td>
          </tr>
        `;
      }
    });
    
    body.innerHTML = `
      <div style="display: flex; justify-content: space-between; margin-bottom: 16px; background: var(--bg-secondary); padding: 12px; border-radius: 8px;">
        <span>Сумма штрафных удержаний из заработной платы водителей:</span>
        <strong style="color: var(--status-danger); font-size: 16px;">${totalDeductions.toLocaleString()} ₸</strong>
      </div>
      <div style="display: flex; gap: 8px; align-items: center; margin-bottom: 12px; background: rgba(37,99,235,0.05); padding: 10px; border-radius: 6px; flex-wrap: wrap;">
        <span style="font-size: 12px; font-weight:600;">Выписать штраф:</span>
        <select class="select-clean" id="dashAddFineDriver" style="font-size: 11px;">
          ${db.drivers.map(d => `<option value="${d.id}">${d.name}</option>`).join("")}
        </select>
        <select class="select-clean" id="dashAddFineType" style="font-size: 11px;">
          <option value="fuel">Слив топлива (20 000 ₸)</option>
          <option value="speed">Превышение скорости (5 000 ₸)</option>
          <option value="safety">Нарушение ТБ (15 000 ₸)</option>
        </select>
        <button class="btn-primary" style="font-size: 11px; padding: 4px 8px;" onclick="dashboardAddDeduction()">Применить</button>
      </div>
      <div class="table-wrapper">
        <table class="clean-table">
          <thead>
            <tr>
              <th>Сотрудник</th>
              <th>Нарушение</th>
              <th>Сумма</th>
              <th style="text-align: right;">Действия</th>
            </tr>
          </thead>
          <tbody>
            ${tableRows || '<tr><td colspan="4" style="text-align:center;">Нарушений не зарегистрировано</td></tr>'}
          </tbody>
        </table>
      </div>
    `;
  }
  openModal("dashboardDetailModal");
}

function dashboardChangeVehicleStatus(vehicleId, newStatus) {
  const v = db.vehicles.find(x => x.id === vehicleId);
  if (!v) return;
  v.status = newStatus;
  saveState();
  renderAll();
  openKpiDetailModal('utilization');
  showSystemNotification(`Статус техники ${v.invNumber} изменен на "${newStatus}"`);
}

function dashboardPayClientDebt(companyBin) {
  const c = db.companies.find(x => x.bin === companyBin);
  if (!c) return;
  const paidAmt = c.debt || 0;
  c.debt = 0;
  saveState();
  renderAll();
  openKpiDetailModal('debtors');
  showSystemNotification(`Оплата от ${c.name} на сумму ${paidAmt.toLocaleString()} ₸ успешно зачислена!`);
}

function dashboardSendReminder(companyName) {
  const time = new Date().toTimeString().split(' ')[0].substring(0, 5);
  db.chatLog.push({
    sender: "System",
    time: time,
    message: `🔔 Эскалация долга: Клиенту "${companyName}" отправлено официальное SMS-предупреждение с требованием немедленной оплаты счетов.`
  });
  saveState();
  renderChatHistory();
  showSystemNotification(`Отправлено напоминание для ${companyName}`);
}

function dashboardAnnulDeduction(driverId, fineType) {
  const d = db.drivers.find(x => x.id === driverId);
  if (!d) return;
  
  if (fineType === 'fuel') d.fuelTheftFines = Math.max(0, (d.fuelTheftFines || 0) - 1);
  if (fineType === 'speed') d.speedViolations = Math.max(0, (d.speedViolations || 0) - 1);
  if (fineType === 'safety') d.safetyViolationCount = Math.max(0, (d.safetyViolationCount || 0) - 1);
  
  saveState();
  renderAll();
  openKpiDetailModal('deductions');
  showSystemNotification(`Штраф водителя ${d.name} успешно аннулирован.`);
}

function dashboardAddDeduction() {
  const driverId = document.getElementById("dashAddFineDriver").value;
  const fineType = document.getElementById("dashAddFineType").value;
  const d = db.drivers.find(x => x.id === driverId);
  if (!d) return;

  if (fineType === 'fuel') d.fuelTheftFines = (d.fuelTheftFines || 0) + 1;
  if (fineType === 'speed') d.speedViolations = (d.speedViolations || 0) + 1;
  if (fineType === 'safety') d.safetyViolationCount = (d.safetyViolationCount || 0) + 1;

  saveState();
  renderAll();
  openKpiDetailModal('deductions');
  showSystemNotification(`Штраф успешно начислен водителю ${d.name}.`);
}

function openSitePnlDetailModal(siteId) {
  const modal = document.getElementById("dashboardDetailModal");
  const title = document.getElementById("dashboardDetailTitle");
  const body = document.getElementById("dashboardDetailBody");
  if (!modal || !title || !body) return;

  const site = db.sites.find(s => s.id === siteId);
  if (!site) return;

  const siteDeals = db.deals.filter(d => d.siteId === site.id);
  const revenue = siteDeals.reduce((sum, d) => sum + d.price, 0);
  
  const siteVehicles = db.vehicles.filter(v => v.currentSiteId === site.id);
  const siteDrivers = db.drivers.filter(d => siteVehicles.some(v => v.driverId === d.id));
  
  const salaryCost = siteDrivers.reduce((sum, d) => sum + d.baseSalary + (d.shiftsWorked * 10000), 0);
  const fuelCost = db.fuelLogs.filter(f => siteVehicles.some(v => v.id === f.vehicleId)).reduce((sum, f) => sum + f.cost, 0);
  const subrentCost = siteVehicles.filter(v => v.ownerType === 'subrent').reduce((sum, v) => sum + (v.subrentRate * 15), 0);
  const repairCost = db.repairs.filter(r => r.siteId === site.id).reduce((sum, r) => sum + r.laborCost + (r.damageCost || 0), 0);
  const netProfit = revenue - (salaryCost + fuelCost + subrentCost + repairCost);

  let dealsHtml = siteDeals.map(d => `
    <div class="pnl-row" style="font-size: 12px; margin-bottom: 4px; border-bottom: 1px dashed var(--border-color); padding-bottom: 4px;">
      <span>Договор ${d.contractNumber || 'Б/Н'} - ${d.companyName} (${d.jobType})</span>
      <strong style="color:var(--status-success);">+${d.price.toLocaleString()} ₸</strong>
    </div>
  `).join("");

  let vehiclesHtml = siteVehicles.map(v => {
    const drv = db.drivers.find(x => x.id === v.driverId);
    return `
      <span class="badge badge-neutral" style="margin-right: 6px; margin-bottom: 6px; font-size: 11px;">
        ${v.name} (${v.plate}) - ${drv ? drv.name : 'Без машиниста'}
      </span>
    `;
  }).join("");

  title.innerText = `Финансовый анализ объекта: ${site.name}`;
  
  body.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 16px;">
      <div style="background: var(--bg-secondary); padding: 12px; border-radius: 8px;">
        <div style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); font-weight: 700; margin-bottom: 8px;">Активные договоры на объекте:</div>
        ${dealsHtml || '<span style="color:var(--text-secondary); font-style:italic; font-size:12px;">Нет активных договоров</span>'}
      </div>
      
      <div style="background: var(--bg-secondary); padding: 12px; border-radius: 8px;">
        <div style="font-size: 11px; text-transform: uppercase; color: var(--text-secondary); font-weight: 700; margin-bottom: 8px;">Распределенная техника (${siteVehicles.length} ед.):</div>
        <div style="display: flex; flex-wrap: wrap;">
          ${vehiclesHtml || '<span style="color:var(--text-secondary); font-style:italic; font-size:12px;">Техника не закреплена</span>'}
        </div>
      </div>
      
      <div style="border: 1px solid var(--border-color); border-radius: 8px; padding: 14px;">
        <div style="font-weight: 700; font-size: 13px; margin-bottom: 12px; text-transform: uppercase; color: var(--text-secondary);">Детализированный P&L (Отчет о прибылях и убытках)</div>
        <div class="pnl-row"><span>1. Доходы (Выручка от клиентов):</span><strong style="color: var(--status-success);">+${revenue.toLocaleString()} ₸</strong></div>
        <div class="pnl-row"><span>2. Расходы на оплату труда машинистов:</span><span style="color: var(--status-danger); font-weight: 600;">-${salaryCost.toLocaleString()} ₸</span></div>
        <div class="pnl-row"><span>3. Расходы на топливо (ГСМ по датчикам):</span><span style="color: var(--status-danger); font-weight: 600;">-${fuelCost.toLocaleString()} ₸</span></div>
        <div class="pnl-row"><span>4. Расходы на аренду техники партнеров:</span><span style="color: var(--status-danger); font-weight: 600;">-${subrentCost.toLocaleString()} ₸</span></div>
        <div class="pnl-row"><span>5. Затраты на ремонты и закупку ТМЦ:</span><span style="color: var(--status-danger); font-weight: 600;">-${repairCost.toLocaleString()} ₸</span></div>
        <div class="pnl-row" style="background-color: ${netProfit >= 0 ? 'rgba(46,125,50,0.08)' : 'rgba(198,40,40,0.08)'}; padding: 10px; border-radius:6px; margin-top: 10px; border: 1px solid ${netProfit >= 0 ? 'var(--status-success)' : 'var(--status-danger)'};">
          <span style="font-weight: 700; font-size: 13px;">Чистая прибыль (Рентабельность):</span>
          <strong style="color: ${netProfit >= 0 ? 'var(--status-success)' : 'var(--status-danger)'}; font-size: 16px;">${netProfit.toLocaleString()} ₸</strong>
        </div>
      </div>
      
      <div style="display: flex; gap: 8px; justify-content: flex-end;">
        <button class="btn-secondary" onclick="closeModal('dashboardDetailModal'); switchTab('dispatch');">Журнал перемещений</button>
        <button class="btn-primary" onclick="closeModal('dashboardDetailModal'); openAssignVehiclesFormForSite('${site.id}')">Закрепить технику</button>
      </div>
    </div>
  `;
  
  openModal("dashboardDetailModal");
}

function openAssignVehiclesFormForSite(siteId) {
  const deal = db.deals.find(d => d.siteId === siteId);
  if (deal) {
    openAssignVehiclesForm(deal.id);
  } else {
    showSystemNotification("Нет активной сделки для закрепления техники на данном объекте!");
  }
}

// Вспомогательные функции для открытия модальных окон (устранение console ReferenceErrors)
function openReceivePartModal() {
  openModal("receivePartModal");
}
function openTransferPartModal() {
  openModal("transferPartModal");
}
function openRequisitionModal() {
  openModal("requisitionModal");
}
function openCreateRepairModal() {
  openModal("createRepairModal");
}
function openRelocateVehicleModal() {
  openModal("relocateVehicleModal");
}
function openCreateDealModal() {
  openModal("createDealModal");
}
function openCreateEmployeeModal() {
  openModal("createEmployeeModal");
}

function openSupplyOrderDetail(orderId) {
  const so = db.supplyOrders.find(o => o.id === orderId);
  if (!so) return;

  const modal = document.getElementById("dashboardDetailModal");
  const title = document.getElementById("dashboardDetailTitle");
  const body = document.getElementById("dashboardDetailBody");
  if (!modal || !title || !body) return;

  title.innerText = `Детали заказа снабжения: ${so.id}`;
  
  let actionBtnHtml = "";
  if (so.status === "Оформлен") {
    actionBtnHtml = `<button class="btn-primary" onclick="closeModal('dashboardDetailModal'); receiveSupplyOrder('${so.id}');">Принять на склад</button>`;
  } else {
    actionBtnHtml = `<span style="color:var(--status-success); font-weight:600; display:inline-flex; align-items:center; gap:4px;"><svg viewBox="0 0 24 24" style="width:12px; height:12px; stroke:currentColor; stroke-width:2.2; fill:none; display:inline-block;"><polyline points="20 6 9 17 4 12"></polyline></svg> Доставлено на Центральный склад</span>`;
  }

  body.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 14px; font-family:'Inter', sans-serif;">
      <div class="pnl-row"><span>Артикул детали (SKU):</span><strong>${so.partSku}</strong></div>
      <div class="pnl-row"><span>Наименование ТМЦ:</span><strong>${so.partName}</strong></div>
      <div class="pnl-row"><span>Количество прихода:</span><strong>${so.qty} шт.</strong></div>
      <div class="pnl-row"><span>Цена за единицу:</span><strong>${so.price.toLocaleString()} ₸</strong></div>
      <div class="pnl-row" style="background: var(--bg-secondary); padding: 10px; border-radius: 6px; border-left: 3px solid var(--brand-color);">
        <span>Итоговая сумма заказа:</span>
        <strong style="color: var(--brand-color); font-size: 14px;">${so.total.toLocaleString()} ₸</strong>
      </div>
      <div class="pnl-row"><span>Поставщик ТМЦ:</span><strong>${so.supplier}</strong></div>
      <div class="pnl-row"><span>Дата оформления:</span><strong>${so.date}</strong></div>
      <div class="pnl-row"><span>Текущий статус:</span><span class="badge ${so.status === 'Доставлен' ? 'badge-success' : 'badge-warning'}">${so.status}</span></div>
      
      <div style="margin-top: 12px; display: flex; justify-content: flex-end; gap: 8px;">
        ${actionBtnHtml}
      </div>
    </div>
  `;

  openModal("dashboardDetailModal");
}

// ----------------------------------------------------
// ДОКУМЕНТЫ КОНТРАГЕНТОВ (ДОГОВОРЫ, НАКЛАДНЫЕ, НАРЯДЫ)
// ----------------------------------------------------

function openContractDocument(dealId) {
  const deal = db.deals.find(x => x.id === dealId);
  if (!deal) return;
  
  const body = document.getElementById("viewDocumentBody");
  if (!body) return;
  
  body.innerHTML = `
    <div class="document-view-container" style="font-family: 'Outfit', 'Inter', sans-serif; color: #333; line-height: 1.5;">
      <div style="text-align: center; border-bottom: 2px solid #2563EB; padding-bottom: 12px; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 700; text-transform: uppercase; margin: 0; color: #1E3A8A;">Типовой договор имущественного найма (аренды)</h3>
        <div style="font-size: 12px; color: #555; margin-top: 4px;">№ ${deal.contractNumber || 'Д-06/2026-TMP'}</div>
      </div>
      
      <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 16px;">
        <span>г. Атырау</span>
        <span>Дата заключения: ${deal.startDate}</span>
      </div>
      
      <div style="font-size: 12px; margin-bottom: 12px;">
        <p><strong>Наймодатель:</strong> ТОО «KazBildInvest», в лице Генерального директора Исаева Ж. А., действующего на основании Устава, с одной стороны, и</p>
        <p><strong>Наниматель:</strong> ${deal.companyName}, в лице ответственного представителя ${deal.contactPerson}, с другой стороны, заключили настоящий Договор о нижеследующем:</p>
      </div>
      
      <div style="font-size: 11px; margin-bottom: 16px;">
        <h5 style="font-weight: 700; margin-bottom: 4px; text-transform: uppercase; color: #1E3A8A;">1. Предмет Договора</h5>
        <p>1.1. Наймодатель предоставляет за плату во временное владение и пользование Нанимателю спецтехнику для выполнения работ по объекту: <strong>${getSiteName(deal.siteId)}</strong>.</p>
        <p>1.2. Вид выполняемых работ: <strong>${deal.jobType}</strong>.</p>
        <p>1.3. Сроки аренды: с <strong>${deal.startDate}</strong> по <strong>${deal.endDate}</strong>.</p>
        
        <h5 style="font-weight: 700; margin-top: 8px; margin-bottom: 4px; text-transform: uppercase; color: #1E3A8A;">2. Стоимость услуг и порядок расчетов</h5>
        <p>2.1. Общая сумма договора составляет <strong>${deal.price.toLocaleString()} KZT (тенге)</strong> без учета НДС.</p>
        <p>2.2. Наниматель обязуется оплатить услуги согласно выставленным счетам и актам выполненных работ (АВР) в установленные сроки.</p>
      </div>
      
      <div style="display: flex; justify-content: space-between; border-top: 1px dashed #CCC; padding-top: 12px; font-size: 11px; margin-top: 20px;">
        <div>
          <strong>Наймодатель (ТОО KazBildInvest):</strong>
          <div style="margin-top: 8px; color: #2563EB; font-weight: bold; border: 1px solid #2563EB; padding: 2px 6px; border-radius: 4px; display: inline-block;">ПОДПИСАНО ЭЦП</div>
        </div>
        <div style="text-align: right;">
          <strong>Наниматель (${deal.companyName}):</strong>
          <div style="margin-top: 8px; color: ${deal.contractSigned ? '#16A34A' : '#DC2626'}; font-weight: bold; border: 1px solid ${deal.contractSigned ? '#16A34A' : '#DC2626'}; padding: 2px 6px; border-radius: 4px; display: inline-block;">
            ${deal.contractSigned ? 'ПОДПИСАНО ЭЦП' : 'ОЖИДАЕТ ПОДПИСИ'}
          </div>
        </div>
      </div>
    </div>
  `;
  
  closeCompanyModal();
  closeModal("dealDetailsModal");
  openModal("viewDocumentModal");
}

function openOrderDocument(orderId) {
  const so = db.supplyOrders.find(x => x.id === orderId);
  if (!so) return;
  
  const body = document.getElementById("viewDocumentBody");
  if (!body) return;
  
  body.innerHTML = `
    <div class="document-view-container" style="font-family: 'Outfit', 'Inter', sans-serif; color: #333; line-height: 1.5;">
      <div style="text-align: center; border-bottom: 2px solid #16A34A; padding-bottom: 12px; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 700; text-transform: uppercase; margin: 0; color: #16A34A;">Накладная на поставку ТМЦ</h3>
        <div style="font-size: 12px; color: #555; margin-top: 4px;">№ ${so.id}</div>
      </div>
      
      <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 16px;">
        <span>г. Атырау</span>
        <span>Дата: ${so.date}</span>
      </div>
      
      <div style="font-size: 12px; margin-bottom: 12px;">
        <p><strong>Поставщик:</strong> ${so.supplier}</p>
        <p><strong>Получатель:</strong> ТОО «KazBildInvest» (Центральный Склад)</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
        <thead>
          <tr style="background-color: #F8F9FA; border-bottom: 1px solid #DDD;">
            <th style="padding: 6px; text-align: left; border: 1px solid #DDD;">Наименование товара</th>
            <th style="padding: 6px; text-align: center; border: 1px solid #DDD;">SKU / Артикул</th>
            <th style="padding: 6px; text-align: right; border: 1px solid #DDD;">Кол-во</th>
            <th style="padding: 6px; text-align: right; border: 1px solid #DDD;">Цена</th>
            <th style="padding: 6px; text-align: right; border: 1px solid #DDD;">Сумма</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 6px; border: 1px solid #DDD;">${so.partName}</td>
            <td style="padding: 6px; text-align: center; border: 1px solid #DDD;">${so.partSku}</td>
            <td style="padding: 6px; text-align: right; border: 1px solid #DDD;">${so.qty} шт.</td>
            <td style="padding: 6px; text-align: right; border: 1px solid #DDD;">${so.price.toLocaleString()} ₸</td>
            <td style="padding: 6px; text-align: right; border: 1px solid #DDD;">${so.total.toLocaleString()} ₸</td>
          </tr>
        </tbody>
      </table>
      
      <div style="display: flex; justify-content: space-between; border-top: 1px dashed #CCC; padding-top: 12px; font-size: 11px;">
        <div>
          <strong>Поставщик (${so.supplier}):</strong>
          <div style="margin-top: 8px; color: #16A34A; font-weight: bold; border: 1px solid #16A34A; padding: 2px 6px; border-radius: 4px; display: inline-block;">ОТГРУЖЕНО</div>
        </div>
        <div style="text-align: right;">
          <strong>Получатель (ТОО KazBildInvest):</strong>
          <div style="margin-top: 8px; color: ${so.status === 'Доставлен' ? '#16A34A' : '#D97706'}; font-weight: bold; border: 1px solid ${so.status === 'Доставлен' ? '#16A34A' : '#D97706'}; padding: 2px 6px; border-radius: 4px; display: inline-block;">
            ${so.status === 'Доставлен' ? 'ПРИНЯТО НА СКЛАД' : 'В ПУТИ / ОФОРМЛЕН'}
          </div>
        </div>
      </div>
    </div>
  `;
  
  closeCompanyModal();
  openModal("viewDocumentModal");
}

function openRepairDocument(repairId) {
  const r = db.repairs.find(x => x.id === repairId);
  if (!r) return;
  
  const body = document.getElementById("viewDocumentBody");
  if (!body) return;
  
  body.innerHTML = `
    <div class="document-view-container" style="font-family: 'Outfit', 'Inter', sans-serif; color: #333; line-height: 1.5;">
      <div style="text-align: center; border-bottom: 2px solid #DC2626; padding-bottom: 12px; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 700; text-transform: uppercase; margin: 0; color: #DC2626;">Заказ-наряд на ремонт / ТО</h3>
        <div style="font-size: 12px; color: #555; margin-top: 4px;">№ ${r.id}</div>
      </div>
      
      <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 16px;">
        <span>г. Атырау</span>
        <span>Дата создания: ${r.createdAt}</span>
      </div>
      
      <div style="font-size: 12px; margin-bottom: 12px;">
        <p><strong>Заказчик:</strong> ТОО «KazBildInvest»</p>
        <p><strong>Подрядчик по ремонту:</strong> ${r.contractorName || 'Собственная ремонтная служба (Механик)'}</p>
        <p><strong>Спецтехника:</strong> ${getVehicleName(r.vehicleId)} [Инв: ${getVehicleInvNumber(r.vehicleId)}]</p>
      </div>
      
      <div style="font-size: 11px; margin-bottom: 16px; background: #FEE2E2; padding: 10px; border-radius: 6px; border-left: 3px solid #DC2626;">
        <strong>Описание неисправности:</strong>
        <p style="margin: 4px 0 0 0;">${r.description}</p>
      </div>
      
      <table style="width: 100%; border-collapse: collapse; margin-bottom: 20px; font-size: 11px;">
        <thead>
          <tr style="background-color: #F8F9FA; border-bottom: 1px solid #DDD;">
            <th style="padding: 6px; text-align: left; border: 1px solid #DDD;">Вид затрат</th>
            <th style="padding: 6px; text-align: right; border: 1px solid #DDD;">Сумма (₸)</th>
          </tr>
        </thead>
        <tbody>
          <tr>
            <td style="padding: 6px; border: 1px solid #DDD;">Стоимость ремонтных работ (услуги слесарей)</td>
            <td style="padding: 6px; text-align: right; border: 1px solid #DDD;">${r.laborCost.toLocaleString()} ₸</td>
          </tr>
          <tr>
            <td style="padding: 6px; border: 1px solid #DDD;">Затраты на поврежденные ТМЦ/запчасти</td>
            <td style="padding: 6px; text-align: right; border: 1px solid #DDD;">${r.damageCost ? r.damageCost.toLocaleString() + ' ₸' : '0 ₸'}</td>
          </tr>
          <tr style="font-weight: 700; background-color: #EEE;">
            <td style="padding: 6px; border: 1px solid #DDD;">Итого стоимость заказ-наряда:</td>
            <td style="padding: 6px; text-align: right; border: 1px solid #DDD;">${(r.laborCost + (r.damageCost || 0)).toLocaleString()} ₸</td>
          </tr>
        </tbody>
      </table>
      
      <div style="display: flex; justify-content: space-between; border-top: 1px dashed #CCC; padding-top: 12px; font-size: 11px;">
        <div>
          <strong>Ремонтная служба:</strong>
          <div style="margin-top: 8px; color: #DC2626; font-weight: bold; border: 1px solid #DC2626; padding: 2px 6px; border-radius: 4px; display: inline-block;">
            ${r.status === 'Готово' ? 'РЕМОНТ ЗАВЕРШЕН' : 'В РАБОТЕ'}
          </div>
        </div>
        <div style="text-align: right;">
          <strong>Ответственный механик:</strong>
          <div style="margin-top: 8px; font-weight: bold; color: #333;">Котов В. А.</div>
        </div>
      </div>
    </div>
  `;
  
  closeCompanyModal();
  openModal("viewDocumentModal");
}

function openSubrentContractDocument(vehicleId) {
  const v = db.vehicles.find(x => x.id === vehicleId);
  if (!v) return;
  
  const body = document.getElementById("viewDocumentBody");
  if (!body) return;
  
  body.innerHTML = `
    <div class="document-view-container" style="font-family: 'Outfit', 'Inter', sans-serif; color: #333; line-height: 1.5;">
      <div style="text-align: center; border-bottom: 2px solid #8B5CF6; padding-bottom: 12px; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 700; text-transform: uppercase; margin: 0; color: #6D28D9;">Договор субаренды спецтехники</h3>
        <div style="font-size: 12px; color: #555; margin-top: 4px;">№ Д-СУБ/${v.invNumber}</div>
      </div>
      
      <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 16px;">
        <span>г. Атырау</span>
        <span>Действителен до: ${v.ptoDate || '2026-12-31'}</span>
      </div>
      
      <div style="font-size: 12px; margin-bottom: 12px;">
        <p><strong>Арендодатель (Субарендодатель):</strong> ${v.subrentProvider}, в лице уполномоченного представителя, с одной стороны, и</p>
        <p><strong>Арендатор:</strong> ТОО «KazBildInvest», в лице Генерального директора Исаева Ж. А., с другой стороны, заключили настоящий договор о нижеследующем:</p>
      </div>
      
      <div style="font-size: 11px; margin-bottom: 16px;">
        <h5 style="font-weight: 700; margin-bottom: 4px; text-transform: uppercase; color: #6D28D9;">1. Предмет договора</h5>
        <p>1.1. Арендодатель передает Арендатору во временное платное пользование следующую спецтехнику:</p>
        <ul style="margin: 4px 0 0 16px; padding: 0;">
          <li>Наименование: <strong>${v.name}</strong></li>
          <li>Модель: <strong>${v.model}</strong></li>
          <li>Госномер: <strong>${v.plate}</strong></li>
          <li>Инвентарный номер: <strong>${v.invNumber}</strong></li>
        </ul>
        
        <h5 style="font-weight: 700; margin-top: 8px; margin-bottom: 4px; text-transform: uppercase; color: #6D28D9;">2. Финансовые условия</h5>
        <p>2.1. Стоимость субаренды составляет <strong>${v.subrentRate.toLocaleString()} KZT (тенге) в сутки</strong>.</p>
        <p>2.2. Расчет производится ежемесячно на основании актов приема-передачи и рапортов работы техники.</p>
      </div>
      
      <div style="display: flex; justify-content: space-between; border-top: 1px dashed #CCC; padding-top: 12px; font-size: 11px; margin-top: 20px;">
        <div>
          <strong>Арендодатель (${v.subrentProvider}):</strong>
          <div style="margin-top: 8px; color: #16A34A; font-weight: bold; border: 1px solid #16A34A; padding: 2px 6px; border-radius: 4px; display: inline-block;">ПОДПИСАНО ЭЦП</div>
        </div>
        <div style="text-align: right;">
          <strong>Арендатор (ТОО KazBildInvest):</strong>
          <div style="margin-top: 8px; color: #16A34A; font-weight: bold; border: 1px solid #16A34A; padding: 2px 6px; border-radius: 4px; display: inline-block;">ПОДПИСАНО ЭЦП</div>
        </div>
      </div>
    </div>
  `;
  
  closeCompanyModal();
  openModal("viewDocumentModal");
}

function openInsurancePolicyDocument(vehicleId) {
  const v = db.vehicles.find(x => x.id === vehicleId);
  if (!v) return;
  
  const body = document.getElementById("viewDocumentBody");
  if (!body) return;
  
  body.innerHTML = `
    <div class="document-view-container" style="font-family: 'Outfit', 'Inter', sans-serif; color: #333; line-height: 1.5;">
      <div style="text-align: center; border-bottom: 2px solid #D97706; padding-bottom: 12px; margin-bottom: 16px;">
        <h3 style="font-size: 16px; font-weight: 700; text-transform: uppercase; margin: 0; color: #B45309;">Страховой полис ГПО ВТС / КАСКО</h3>
        <div style="font-size: 12px; color: #555; margin-top: 4px;">№ POL-${v.invNumber}</div>
      </div>
      
      <div style="display: flex; justify-content: space-between; font-size: 11px; margin-bottom: 16px;">
        <span>г. Алматы</span>
        <span>Срок действия: до ${v.insuranceDate || '2026-12-31'}</span>
      </div>
      
      <div style="font-size: 12px; margin-bottom: 12px;">
        <p><strong>Страховщик:</strong> ${v.insuranceProvider || 'АО «СК Евразия»'}</p>
        <p><strong>Страхователь:</strong> ТОО «KazBildInvest»</p>
        <p><strong>Объект страхования:</strong> Транспортное средство спецназначения:</p>
        <ul style="margin: 4px 0 0 16px; padding: 0;">
          <li>Марка/модель: <strong>${v.name} / ${v.model}</strong></li>
          <li>Госномер: <strong>${v.plate}</strong></li>
          <li>VIN: <strong>${v.vin}</strong></li>
        </ul>
      </div>
      
      <div style="font-size: 11px; margin-bottom: 16px;">
        <h5 style="font-weight: 700; margin-bottom: 4px; text-transform: uppercase; color: #B45309;">Условия страхования</h5>
        <p>Страховая премия: <strong>${(v.insuranceCost || 150000).toLocaleString()} KZT</strong>.</p>
        <p>Лимит ответственности по договору страхования составляет до 20,000,000 KZT при наступлении страхового случая.</p>
      </div>
      
      <div style="display: flex; justify-content: space-between; border-top: 1px dashed #CCC; padding-top: 12px; font-size: 11px; margin-top: 20px;">
        <div>
          <strong>Страховщик (${v.insuranceProvider || 'АО «СК Евразия»'}):</strong>
          <div style="margin-top: 8px; color: #16A34A; font-weight: bold; border: 1px solid #16A34A; padding: 2px 6px; border-radius: 4px; display: inline-block;">ПОДПИСАНО ЭЦП</div>
        </div>
        <div style="text-align: right;">
          <strong>Страхователь (KazBildInvest):</strong>
          <div style="margin-top: 8px; color: #16A34A; font-weight: bold; border: 1px solid #16A34A; padding: 2px 6px; border-radius: 4px; display: inline-block;">ПОДПИСАНО ЭЦП</div>
        </div>
      </div>
    </div>
  `;
  
  closeCompanyModal();
  openModal("viewDocumentModal");
}

// ----------------------------------------------------
// ИНТЕРАКТИВНЫЙ ФИНАНСОВЫЙ ГРАФИК
// ----------------------------------------------------

function changeChartPeriod(period) {
  document.querySelectorAll(".chart-period-selector button").forEach(btn => {
    btn.classList.remove("active");
  });
  if (period === 'year') document.getElementById("btn-chart-year").classList.add("active");
  if (period === 'month') document.getElementById("btn-chart-month").classList.add("active");
  if (period === 'week') document.getElementById("btn-chart-week").classList.add("active");
  if (period === 'day') document.getElementById("btn-chart-day").classList.add("active");
  
  window.activeChartPeriod = period;
  renderFinancialChart(period);
}

function renderFinancialChart(period) {
  const container = document.getElementById("financialChartContainer");
  if (!container) return;
  
  container.innerHTML = "";
  
  let labels = [];
  let revenue = [];
  let expenses = [];
  
  if (period === 'year') {
    labels = ["Янв", "Фев", "Мар", "Апр", "Май", "Июн", "Июл", "Авг", "Сен", "Окт", "Ноя", "Дек"];
    revenue = [4500000, 5000000, 5800000, 6200000, 7000000, 7800000, 8200000, 8000000, 7500000, 7200000, 6800000, 6500000];
    expenses = [3200000, 3500000, 3800000, 4000000, 4500000, 4800000, 5000000, 4900000, 4700000, 4500000, 4200000, 4000000];
  } else if (period === 'month') {
    labels = ["1-5", "6-10", "11-15", "16-20", "21-25", "26-30"];
    revenue = [1200000, 1500000, 1800000, 2100000, 1900000, 2300000];
    expenses = [800000, 1000000, 1200000, 1400000, 1300000, 1500000];
  } else if (period === 'week') {
    labels = ["Пн", "Вт", "Ср", "Чт", "Пт", "Сб", "Вс"];
    revenue = [250000, 320000, 280000, 410000, 380000, 150000, 100000];
    expenses = [180000, 210000, 190000, 250000, 230000, 90000, 60000];
  } else { // day
    labels = ["08:00", "10:00", "12:00", "14:00", "16:00", "18:00", "20:00"];
    revenue = [45000, 60000, 55000, 80000, 70000, 40000, 20000];
    expenses = [30000, 40000, 38000, 50000, 45000, 25000, 15000];
  }
  
  const containerWidth = container.clientWidth || 600;
  const containerHeight = 240;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;
  
  const graphWidth = containerWidth - paddingLeft - paddingRight;
  const graphHeight = containerHeight - paddingTop - paddingBottom;
  
  const maxVal = Math.max(...revenue, ...expenses) * 1.15;
  
  let svg = `<svg width="${containerWidth}" height="${containerHeight}" style="overflow:visible; font-family:'Inter', sans-serif;">`;
  
  svg += `
    <defs>
      <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#38BDF8" stop-opacity="0.16" />
        <stop offset="100%" stop-color="#38BDF8" stop-opacity="0.0" />
      </linearGradient>
      <linearGradient id="expGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#FB7185" stop-opacity="0.10" />
        <stop offset="100%" stop-color="#FB7185" stop-opacity="0.0" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="2" stdDeviation="2" flood-opacity="0.25" />
      </filter>
      <filter id="glowRev" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3.5" result="blur" />
        <feComponentTransfer in="blur" result="glow1">
          <feFuncA type="linear" slope="0.5" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode in="glow1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
      <filter id="glowExp" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3.5" result="blur" />
        <feComponentTransfer in="blur" result="glow1">
          <feFuncA type="linear" slope="0.4" />
        </feComponentTransfer>
        <feMerge>
          <feMergeNode in="glow1" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>
  `;
  
  const gridLines = 4;
  for (let i = 0; i <= gridLines; i++) {
    const val = (maxVal / gridLines) * i;
    const y = containerHeight - paddingBottom - (graphHeight / gridLines) * i;
    
    // Горизонтальные сетки
    svg += `<line x1="${paddingLeft}" y1="${y}" x2="${containerWidth - paddingRight}" y2="${y}" stroke="rgba(255, 255, 255, 0.06)" stroke-width="0.75" stroke-dasharray="3,3" />`;
    
    let valText = "";
    if (val >= 1000000) valText = (val / 1000000).toFixed(1) + "M ₸";
    else if (val >= 1000) valText = (val / 1000).toFixed(0) + "k ₸";
    else valText = val.toFixed(0) + " ₸";
    
    svg += `<text x="${paddingLeft - 12}" y="${y + 4}" text-anchor="end" font-size="9.5" font-weight="600" fill="#64748B">${valText}</text>`;
  }
  
  const pointsCount = labels.length;
  const xStep = graphWidth / (pointsCount - 1);
  
  const revPoints = [];
  const expPoints = [];
  
  for (let i = 0; i < pointsCount; i++) {
    const x = paddingLeft + xStep * i;
    const revY = containerHeight - paddingBottom - (revenue[i] / maxVal) * graphHeight;
    const expY = containerHeight - paddingBottom - (expenses[i] / maxVal) * graphHeight;
    
    revPoints.push({ x, y: revY, val: revenue[i], label: labels[i] });
    expPoints.push({ x, y: expY, val: expenses[i], label: labels[i] });
  }
  
  for (let i = 0; i < pointsCount; i++) {
    const p = revPoints[i];
    // Вертикальные сетки
    svg += `<line x1="${p.x}" y1="${paddingTop}" x2="${p.x}" y2="${containerHeight - paddingBottom}" stroke="rgba(255, 255, 255, 0.03)" stroke-width="0.75" stroke-dasharray="3,3" />`;
    svg += `<text x="${p.x}" y="${containerHeight - 10}" text-anchor="middle" font-size="10" font-weight="600" fill="#64748B">${p.label}</text>`;
  }
  
  const getBezierPathD = (points) => {
    if (points.length === 0) return "";
    let d = `M ${points[0].x} ${points[0].y}`;
    for (let i = 0; i < points.length - 1; i++) {
      const p0 = points[i];
      const p1 = points[i + 1];
      const cp1x = p0.x + (p1.x - p0.x) * 0.4;
      const cp1y = p0.y;
      const cp2x = p0.x + (p1.x - p0.x) * 0.6;
      const cp2y = p1.y;
      d += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${p1.x} ${p1.y}`;
    }
    return d;
  };
  
  const getBezierAreaD = (points) => {
    const pathD = getBezierPathD(points);
    if (!pathD) return "";
    const lastP = points[points.length - 1];
    const firstP = points[0];
    return `${pathD} L ${lastP.x} ${containerHeight - paddingBottom} L ${firstP.x} ${containerHeight - paddingBottom} Z`;
  };
  
  svg += `<path d="${getBezierAreaD(revPoints)}" fill="url(#revGrad)" />`;
  svg += `<path d="${getBezierAreaD(expPoints)}" fill="url(#expGrad)" />`;
  
  svg += `<path d="${getBezierPathD(revPoints)}" fill="none" stroke="#38BDF8" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" filter="url(#glowRev)" />`;
  svg += `<path d="${getBezierPathD(expPoints)}" fill="none" stroke="#FB7185" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="3,3" filter="url(#glowExp)" />`;
  
  svg += `<g id="chartTooltip" style="display:none; pointer-events:none;">
    <rect id="tooltipBg" x="0" y="0" width="170" height="66" rx="8" fill="#0F172A" fill-opacity="0.9" stroke="rgba(255, 255, 255, 0.15)" stroke-width="1" filter="url(#shadow)" />
    <text id="tooltipTitle" x="12" y="18" font-size="10" font-weight="700" fill="#F8FAFC"></text>
    <circle id="tooltipRevDot" cx="0" cy="0" r="3" fill="#38BDF8" />
    <text id="tooltipRev" x="24" y="34" font-size="10.5" font-weight="600" fill="#38BDF8"></text>
    <circle id="tooltipExpDot" cx="0" cy="0" r="3" fill="#FB7185" />
    <text id="tooltipExp" x="24" y="50" font-size="10.5" font-weight="600" fill="#FB7185"></text>
    <line id="tooltipLine" x1="0" y1="${paddingTop}" x2="0" y2="${containerHeight - paddingBottom}" stroke="#38BDF8" stroke-width="1.25" opacity="0.3" filter="url(#glowRev)" />
  </g>`;
  
  for (let i = 0; i < pointsCount; i++) {
    const rp = revPoints[i];
    const ep = expPoints[i];
    
    // Светящиеся маркеры точек
    svg += `<circle cx="${rp.x}" cy="${rp.y}" r="6" fill="#38BDF8" fill-opacity="0.2" />`;
    svg += `<circle cx="${rp.x}" cy="${rp.y}" r="3" fill="#020617" stroke="#38BDF8" stroke-width="2.5" />`;
    
    svg += `<circle cx="${ep.x}" cy="${ep.y}" r="5" fill="#FB7185" fill-opacity="0.2" />`;
    svg += `<circle cx="${ep.x}" cy="${ep.y}" r="2.5" fill="#020617" stroke="#FB7185" stroke-width="2" />`;
    
    const triggerWidth = xStep;
    const triggerX = rp.x - triggerWidth / 2;
    
    svg += `
      <rect 
        x="${triggerX}" 
        y="${paddingTop}" 
        width="${triggerWidth}" 
        height="${graphHeight}" 
        fill="transparent" 
        style="cursor:crosshair;"
        onmouseover="showChartTooltip('${rp.label}', ${rp.val}, ${ep.val}, ${rp.x}, ${rp.y})"
        onmouseout="hideChartTooltip()"
      />
    `;
  }
  
  svg += `</svg>`;
  container.innerHTML = svg;
}

function showChartTooltip(label, revVal, expVal, x, y) {
  const tooltip = document.getElementById("chartTooltip");
  const bg = document.getElementById("tooltipBg");
  const title = document.getElementById("tooltipTitle");
  const rev = document.getElementById("tooltipRev");
  const exp = document.getElementById("tooltipExp");
  const line = document.getElementById("tooltipLine");
  
  if (!tooltip || !bg || !title || !rev || !exp || !line) return;
  
  title.textContent = label;
  rev.textContent = `Выручка: ${revVal.toLocaleString()} ₸`;
  exp.textContent = `Расходы: ${expVal.toLocaleString()} ₸`;
  
  const containerWidth = document.getElementById("financialChartContainer").clientWidth || 600;
  let tx = x + 15;
  if (tx + 180 > containerWidth) {
    tx = x - 185;
  }
  const ty = 40;
  
  bg.setAttribute("x", tx);
  bg.setAttribute("y", ty);
  title.setAttribute("x", tx + 12);
  title.setAttribute("y", ty + 18);
  
  const revDot = document.getElementById("tooltipRevDot");
  const expDot = document.getElementById("tooltipExpDot");
  if (revDot) {
    revDot.setAttribute("cx", tx + 14);
    revDot.setAttribute("cy", ty + 31);
  }
  if (expDot) {
    expDot.setAttribute("cx", tx + 14);
    expDot.setAttribute("cy", ty + 47);
  }
  
  rev.setAttribute("x", tx + 24);
  rev.setAttribute("y", ty + 35);
  exp.setAttribute("x", tx + 24);
  exp.setAttribute("y", ty + 51);
  
  line.setAttribute("x1", x);
  line.setAttribute("x2", x);
  
  tooltip.style.display = "block";
}

function hideChartTooltip() {
  const tooltip = document.getElementById("chartTooltip");
  if (tooltip) tooltip.style.display = "none";
}

// ----------------------------------------------------
// ДОРАБОТКИ ERP: НОВЫЙ ФУНКЦИОНАЛ
// ----------------------------------------------------

// 1. Отмена перемещения сделки в CRM
function undoLastCrmMove() {
  window.crmHistory = window.crmHistory || [];
  if (window.crmHistory.length === 0) {
    showSystemNotification("Нет действий для отмены в текущей сессии.");
    return;
  }
  const lastMove = window.crmHistory.pop();
  const deal = db.deals.find(d => d.id === lastMove.dealId);
  if (deal) {
    deal.stage = lastMove.oldStage;
    saveState();
    renderCrmKanban();
    updateKpiDashboard();
    renderObjectsPnl();
    showSystemNotification(`Отмена: Заказ "${deal.companyName}" возвращен в стадию "${lastMove.oldStage}"`);
  }
}

// 2. Модуль: Табель учета рабочего времени
function renderTimesheetGrid() {
  const select = document.getElementById("timesheetMonthSelect");
  if (!select) return;
  const selectedMonth = select.value;
  
  const gridTable = document.getElementById("timesheetTableGrid");
  if (!gridTable) return;
  
  gridTable.innerHTML = "";
  
  // Определяем количество дней в месяце
  const year = parseInt(selectedMonth.split("-")[0]);
  const month = parseInt(selectedMonth.split("-")[1]);
  const daysInMonth = new Date(year, month, 0).getDate();
  
  // Шапка таблицы
  let headerHtml = `
    <thead>
      <tr>
        <th style="text-align: left; min-width: 180px;">Техника</th>
        <th style="min-width: 140px;">Основной водитель</th>
  `;
  for (let d = 1; d <= daysInMonth; d++) {
    const dayOfWeek = new Date(year, month - 1, d).getDay();
    const isWeekend = dayOfWeek === 0 || dayOfWeek === 6; // 0 = Sunday, 6 = Saturday
    const thStyle = isWeekend 
      ? `width: 30px; text-align: center; color: var(--status-danger); background-color: rgba(220, 38, 38, 0.05); font-weight: 700;` 
      : `width: 30px; text-align: center;`;
    headerHtml += `<th style="${thStyle}">${d}</th>`;
  }
  headerHtml += `
      </tr>
    </thead>
  `;
  gridTable.innerHTML += headerHtml;
  
  const tbody = document.createElement("tbody");
  
  db.vehicles.forEach(v => {
    // Находим табель для этой техники и месяца
    let ts = db.timesheets.find(t => t.month === selectedMonth && t.vehicleId === v.id);
    if (!ts) {
      // Инициализируем пустой табель в памяти
      ts = {
        id: `ts_${v.id}_${selectedMonth}`,
        month: selectedMonth,
        vehicleId: v.id,
        driverHistory: [],
        dailyStatus: {},
        mechanicApproved: false,
        hrApproved: false,
        directorApproved: false
      };
      // Заполняем рабочими днями
      for (let day = 1; day <= daysInMonth; day++) {
        ts.dailyStatus[day] = "W";
      }
      db.timesheets.push(ts);
    }
    
    const defaultDriver = db.drivers.find(d => d.id === v.driverId);
    const defaultDriverName = defaultDriver ? defaultDriver.name : "Не назначен";
    
    const tr = document.createElement("tr");
    let rowHtml = `
      <td style="text-align: left;">
        <strong>${v.name}</strong><br>
        <span style="font-size: 9px; color: var(--text-secondary);">${v.plate} | Инв. ${v.invNumber}</span>
      </td>
      <td>
        <select class="form-control" style="font-size: 10px; padding: 4px; height: auto;" onchange="changeTimesheetVehicleDriver('${ts.id}', this.value)">
          <option value="">-- Без водителя --</option>
          ${db.drivers.map(d => `<option value="${d.id}" ${v.driverId === d.id ? 'selected' : ''}>${d.name}</option>`).join("")}
        </select>
      </td>
    `;
    
    for (let day = 1; day <= daysInMonth; day++) {
      const status = ts.dailyStatus[day] || "W";
      
      // Проверяем замены водителя в этот день
      const replacement = ts.driverHistory ? ts.driverHistory.find(h => h.day === day) : null;
      let displayDriverInitials = "";
      let hasReplacement = false;
      
      if (replacement && replacement.driverId !== v.driverId) {
        hasReplacement = true;
        const repDriver = db.drivers.find(d => d.id === replacement.driverId);
        if (repDriver) {
          const split = repDriver.name.split(" ");
          const lastName = split[0] || "";
          const firstName = split[1] || "";
          const initials = (lastName ? lastName.charAt(0) : "") + (firstName ? firstName.charAt(0) : "");
          displayDriverInitials = `<br><span style="font-size: 8px; color: var(--brand-color); font-weight: 700; border: 1px solid var(--brand-color); border-radius: 3px; padding: 0px 2px; background: rgba(37,99,235,0.08); display: inline-block; margin-top: 2px;" title="Замена: ${repDriver.name}">${initials}</span>`;
        }
      }
      
      let bg = "#DCFCE7"; // W - Green
      let color = "#15803d";
      if (status === "R") {
        bg = "#FEF3C7"; // R - Yellow
        color = "#b45309";
      } else if (status === "O") {
        bg = "#F1F5F9"; // O - Gray
        color = "#475569";
      } else if (status === "I") {
        bg = "#FEE2E2"; // I - Soft Red for Simple/Idle
        color = "#991B1B";
      }
      
      const statusRu = status === "W" ? "Я" : (status === "R" ? "Р" : (status === "O" ? "В" : (status === "I" ? "П" : status)));
      
      rowHtml += `
        <td style="background-color: ${bg}; color: ${color}; text-align: center; font-weight: 700; cursor: pointer; position: relative; padding: 4px;" onclick="cycleTimesheetDayStatus('${ts.id}', ${day})" title="Кликните для изменения статуса смены. ${hasReplacement ? 'Была замена водителя.' : ''}">
          ${statusRu}
          ${hasReplacement ? '<span style="color:var(--brand-color); position:absolute; top:1px; right:3px; font-size:8px;">*</span>' : ''}
          ${displayDriverInitials}
        </td>
      `;
    }
    
    tr.innerHTML = rowHtml;
    tbody.appendChild(tr);
  });
  
  gridTable.appendChild(tbody);
  
  // Отрисовка статусов цепочки согласования
  // Найдем агрегированный статус согласования для выбранного месяца
  const monthTimesheets = db.timesheets.filter(t => t.month === selectedMonth);
  const allMechanicApproved = monthTimesheets.length > 0 && monthTimesheets.every(t => t.mechanicApproved);
  const allHrApproved = monthTimesheets.length > 0 && monthTimesheets.every(t => t.hrApproved);
  const allDirectorApproved = monthTimesheets.length > 0 && monthTimesheets.every(t => t.directorApproved);
  
  updateTimesheetApprovalStatusUI(allMechanicApproved, allHrApproved, allDirectorApproved);
}

function updateTimesheetApprovalStatusUI(mechApp, hrApp, dirApp) {
  const badgeMech = document.getElementById("ts-badge-mechanic");
  const badgeHr = document.getElementById("ts-badge-hr");
  const badgeDir = document.getElementById("ts-badge-director");
  
  const checkSvg = `<svg viewBox="0 0 24 24" style="width: 10px; height: 10px; stroke: currentColor; stroke-width: 3.5; fill: none; display: inline-block; vertical-align: middle; margin-right: 4px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
  const clockSvg = `<svg viewBox="0 0 24 24" style="width: 10px; height: 10px; stroke: currentColor; stroke-width: 2.2; fill: none; display: inline-block; vertical-align: middle; margin-right: 4px;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>`;

  if (badgeMech) {
    badgeMech.className = mechApp ? "badge badge-success" : "badge badge-neutral";
    badgeMech.innerHTML = mechApp ? checkSvg + " Утверждено" : clockSvg + " Ожидает";
    const stepEl = document.getElementById("ts-step-mechanic");
    if (stepEl) {
      stepEl.style.background = mechApp ? "rgba(22, 163, 74, 0.08)" : "var(--bg-secondary)";
      stepEl.style.color = mechApp ? "var(--status-success)" : "var(--text-secondary)";
      stepEl.style.border = mechApp ? "1px solid var(--status-success)" : "1px solid var(--border-color)";
    }
  }
  if (badgeHr) {
    badgeHr.className = hrApp ? "badge badge-success" : "badge badge-neutral";
    badgeHr.innerHTML = hrApp ? checkSvg + " Утверждено" : clockSvg + " Ожидает";
    const stepEl = document.getElementById("ts-step-hr");
    if (stepEl) {
      stepEl.style.background = hrApp ? "rgba(22, 163, 74, 0.08)" : "var(--bg-secondary)";
      stepEl.style.color = hrApp ? "var(--status-success)" : "var(--text-secondary)";
      stepEl.style.border = hrApp ? "1px solid var(--status-success)" : "1px solid var(--border-color)";
    }
  }
  if (badgeDir) {
    badgeDir.className = dirApp ? "badge badge-success" : "badge badge-neutral";
    badgeDir.innerHTML = dirApp ? checkSvg + " Утверждено" : clockSvg + " Ожидает";
    const stepEl = document.getElementById("ts-step-director");
    if (stepEl) {
      stepEl.style.background = dirApp ? "rgba(22, 163, 74, 0.08)" : "var(--bg-secondary)";
      stepEl.style.color = dirApp ? "var(--status-success)" : "var(--text-secondary)";
      stepEl.style.border = dirApp ? "1px solid var(--status-success)" : "1px solid var(--border-color)";
    }
  }
  
  // Доступные действия по ролям
  const actionsDiv = document.getElementById("timesheetApprovalActions");
  if (!actionsDiv) return;
  actionsDiv.innerHTML = "";
  
  const role = db.settings.activeRole;
  const select = document.getElementById("timesheetMonthSelect");
  const selectedMonth = select ? select.value : "2026-06";
  
  if (role === "Mechanic" && !mechApp) {
    actionsDiv.innerHTML = `<button class="btn-primary" onclick="triggerDoubleCheck(this, () => approveAllTimesheetsByRole('mechanic', '${selectedMonth}'))">Утвердить как Механик</button>`;
  } else if (role === "HR" && mechApp && !hrApp) {
    actionsDiv.innerHTML = `<button class="btn-primary" onclick="triggerDoubleCheck(this, () => approveAllTimesheetsByRole('hr', '${selectedMonth}'))">Утвердить как HR-Специалист</button>`;
  } else if ((role === "Director" || role === "DeputyDirector") && mechApp && hrApp && !dirApp) {
    actionsDiv.innerHTML = `<button class="btn-primary" onclick="triggerDoubleCheck(this, () => approveAllTimesheetsByRole('director', '${selectedMonth}'))">Утвердить как Директор</button>`;
  } else if (role === "Accountant" && mechApp && hrApp && dirApp) {
    actionsDiv.innerHTML = `<button class="btn-primary" style="background-color: var(--status-success);" onclick="runAccountantPayrollCalculation('${selectedMonth}')">Провести расчет ФОТ по табелю</button>`;
  } else {
    actionsDiv.innerHTML = `<span style="font-size: 12px; color: var(--text-secondary); font-style: italic;">Табель готов / Ожидает согласования предыдущих звеньев</span>`;
  }
}

function cycleTimesheetDayStatus(timesheetId, day) {
  const ts = db.timesheets.find(t => t.id === timesheetId);
  if (!ts) return;
  
  const current = ts.dailyStatus[day] || "W";
  let next = "W";
  if (current === "W") next = "R";
  else if (current === "R") next = "O";
  else if (current === "O") next = "I";
  else if (current === "I") next = "W";
  
  ts.dailyStatus[day] = next;
  
  // Добавить замену водителя для демонстрации (если кликаем с зажатым Shift, меняем водителя)
  if (window.event && window.event.shiftKey) {
    // Симулируем выбор другого водителя в этот день
    const otherDriver = db.drivers.find(d => d.id !== db.vehicles.find(v => v.id === ts.vehicleId).driverId);
    if (otherDriver) {
      ts.driverHistory = ts.driverHistory || [];
      const idx = ts.driverHistory.findIndex(h => h.day === day);
      if (idx !== -1) {
        ts.driverHistory[idx].driverId = otherDriver.id;
      } else {
        ts.driverHistory.push({ day: day, driverId: otherDriver.id });
      }
      showSystemNotification(`Замена водителя на ${day} число зафиксирована: ${otherDriver.name}`);
    }
  }
  
  saveState();
  renderTimesheetGrid();
}

function changeTimesheetVehicleDriver(timesheetId, driverId) {
  const ts = db.timesheets.find(t => t.id === timesheetId);
  if (!ts) return;
  
  const veh = db.vehicles.find(v => v.id === ts.vehicleId);
  if (veh) {
    veh.driverId = driverId;
    saveState();
    renderTimesheetGrid();
    showSystemNotification(`Основной водитель для техники ${veh.name} успешно обновлен.`);
  }
}

function approveAllTimesheetsByRole(roleType, monthStr) {
  db.timesheets.forEach(ts => {
    if (ts.month === monthStr) {
      if (roleType === "mechanic") ts.mechanicApproved = true;
      if (roleType === "hr") ts.hrApproved = true;
      if (roleType === "director") ts.directorApproved = true;
    }
  });
  saveState();
  renderTimesheetGrid();
  showSystemNotification(`Табель за ${monthStr} успешно утвержден ролью: ${roleType}`);
}

function runAccountantPayrollCalculation(monthStr) {
  // Начисляем зарплату по табелю
  db.drivers.forEach(d => {
    if (d.baseSalary > 0) {
      // Ищем все табели за месяц
      let daysWorked = 0;
      db.timesheets.forEach(ts => {
        if (ts.month === monthStr) {
          // Считаем сколько дней данный водитель отработал
          for (let day in ts.dailyStatus) {
            if (ts.dailyStatus[day] === "W") {
              const replacement = ts.driverHistory ? ts.driverHistory.find(h => h.day == day) : null;
              if (replacement) {
                if (replacement.driverId === d.id) daysWorked++;
              } else {
                const veh = db.vehicles.find(v => v.id === ts.vehicleId);
                if (veh && veh.driverId === d.id) daysWorked++;
              }
            }
          }
        }
      });
      if (daysWorked > 0) {
        d.shiftsWorked = daysWorked;
      }
    }
  });
  saveState();
  calculateMonthlyPayroll();
  showSystemNotification(`Расчет ФОТ за месяц ${monthStr} выполнен на основе табеля выходов!`);
}

// 3. Импорт и выгрузки в Excel (CSV)
function exportTimesheetToExcel() {
  const select = document.getElementById("timesheetMonthSelect");
  const month = select ? select.value : "2026-06";
  
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "Техника,Госномер,Водитель,Дни...\r\n";
  
  db.vehicles.forEach(v => {
    const defaultDriver = db.drivers.find(d => d.id === v.driverId);
    const driverName = defaultDriver ? defaultDriver.name : "Не назначен";
    let row = `"${v.name}","${v.plate}","${driverName}"`;
    
    const ts = db.timesheets.find(t => t.month === month && t.vehicleId === v.id);
    if (ts) {
      for (let d = 1; d <= 30; d++) {
        const status = ts.dailyStatus[d] || 'O';
        const statusRu = status === "W" ? "Я" : (status === "R" ? "Р" : (status === "O" ? "В" : (status === "I" ? "П" : status)));
        row += `,"${statusRu}"`;
      }
    }
    csvContent += row + "\r\n";
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Табель_смен_KazBildInvest_${month}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showSystemNotification("Табель экспортирован в Excel (CSV)");
}

function exportSubrentTimesheet() {
  const select = document.getElementById("timesheetMonthSelect");
  const month = select ? select.value : "2026-06";
  
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "СУБАРЕНДОВАННАЯ ТЕХНИКА,Арендодатель,Ставка (сутки),Водитель,Итого отработано смен\r\n";
  
  let count = 0;
  db.vehicles.filter(v => v.ownerType === 'subrent').forEach(v => {
    const defaultDriver = db.drivers.find(d => d.id === v.driverId);
    const driverName = defaultDriver ? defaultDriver.name : "Водитель Арендодателя";
    const ts = db.timesheets.find(t => t.month === month && t.vehicleId === v.id);
    
    let daysWorked = 0;
    if (ts) {
      for (let day in ts.dailyStatus) {
        if (ts.dailyStatus[day] === "W") daysWorked++;
      }
    }
    
    csvContent += `"${v.name}","${v.subrentProvider || 'Неизвестно'}",${v.subrentRate || 0},"${driverName}",${daysWorked}\r\n`;
    count++;
  });
  
  if (count === 0) {
    showSystemNotification("Нет субарендованной техники для выгрузки");
    return;
  }
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Единый_табель_субаренды_${month}.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showSystemNotification("Единый табель субаренды отправлен на выгрузку клиенту!");
}

function exportStaffToExcel() {
  let csvContent = "data:text/csv;charset=utf-8,";
  csvContent += "ФИО,ИИН,Должность,Телефон,Тип контракта,Оклад,Статус\r\n";
  
  db.drivers.forEach(d => {
    const status = d.isBlocked ? "Блокирован" : "Допущен";
    csvContent += `"${d.name}","${d.iin}","${d.position}","${d.phone}","${d.contractType}",${d.baseSalary},"${status}"\r\n`;
  });
  
  const encodedUri = encodeURI(csvContent);
  const link = document.createElement("a");
  link.setAttribute("href", encodedUri);
  link.setAttribute("download", `Реестр_персонала_KazBildInvest.csv`);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  showSystemNotification("База сотрудников экспортирована в Excel (CSV)");
}

// 4. Единый реестр сотрудников по категориям
window.activeStaffCategory = 'all';

function filterStaffTab(category) {
  window.activeStaffCategory = category;
  document.querySelectorAll("#tab-staff .btn-secondary").forEach(btn => btn.classList.remove("active"));
  
  const activeBtn = document.getElementById("btn-staff-" + category);
  if (activeBtn) activeBtn.classList.add("active");
  
  renderStaffGrid();
}

function renderStaffGrid() {
  const tbody = document.querySelector("#staffTable tbody");
  if (!tbody) return;
  tbody.innerHTML = "";
  
  const searchQuery = (document.getElementById("staffSearchInput")?.value || "").toLowerCase().trim();
  const cat = window.activeStaffCategory;
  
  // Добавляем сотрудников из базы
  let list = db.drivers.map(d => ({ ...d, isBlacklisted: false }));
  
  // Если категория черный список, выводим только ЧС
  if (cat === 'blacklist') {
    list = db.blacklist.map(d => ({ ...d, isBlacklisted: true }));
  } else {
    // Включаем ЧС в общий список
    if (cat === 'all') {
      const bl = db.blacklist.map(d => ({ ...d, isBlacklisted: true }));
      list = [...list, ...bl];
    }
  }
  
  // Фильтрация по разделам
  if (cat === 'admin') {
    list = list.filter(d => d.position.includes("Директор") || d.position.includes("Бухгалтер") || d.position.includes("Логист") || d.position.includes("Диспетчер") || d.position.includes("Механик") || d.position.includes("Менеджер") || d.position.includes("складом"));
  } else if (cat === 'drivers') {
    list = list.filter(d => !d.isBlacklisted && (d.position.includes("Машинист") || d.position.includes("Водитель")) && d.baseSalary > 0);
  } else if (cat === 'subrent') {
    list = list.filter(d => !d.isBlacklisted && (d.baseSalary === 0 || d.position.includes("партнер")));
  }
  
  // Поиск
  if (searchQuery) {
    list = list.filter(d => 
      d.name.toLowerCase().includes(searchQuery) ||
      d.iin.toLowerCase().includes(searchQuery) ||
      d.position.toLowerCase().includes(searchQuery)
    );
  }
  
  list.forEach(d => {
    const tr = document.createElement("tr");
    
    // Допуски медосмотр и ТБ
    let docStatusHtml = "";
    if (d.isBlacklisted) {
      docStatusHtml = `<span style="color:var(--status-danger); font-weight:700;">ЧС: ${d.blockReason}</span>`;
    } else {
      const medExpired = new Date(d.medExpiry) < new Date();
      const tbExpired = new Date(d.tbExpiry) < new Date();
      docStatusHtml = `
        <span class="badge ${medExpired ? 'badge-danger' : 'badge-success'}" style="font-size:9px;">Медосмотр: ${d.medExpiry}</span><br>
        <span class="badge ${tbExpired ? 'badge-danger' : 'badge-success'}" style="font-size:9px; margin-top:2px;">Корочка ТБ: ${d.tbExpiry}</span>
      `;
    }
    
    let statusBadge = "";
    if (d.isBlacklisted) {
      statusBadge = `<span class="badge badge-danger" style="background: rgba(220,38,38,0.1); color: var(--status-danger);">ЗАБЛОКИРОВАН (ЧС)</span>`;
    } else {
      statusBadge = d.isBlocked ? 
        `<span class="badge badge-danger">Заблокирован</span>` : 
        `<span class="badge badge-success">Допущен</span>`;
    }
    
    let actionBtn = "";
    if (d.isBlacklisted) {
      actionBtn = `<button class="btn-secondary" style="font-size:11px; padding:4px 8px; color:var(--status-success); border-color:var(--status-success);" onclick="triggerDoubleCheck(this, () => removeFromBlacklist('${d.id}'))">Удалить из ЧС</button>`;
    } else {
      actionBtn = `<button class="btn-primary" style="font-size:11px; padding:4px 8px;" onclick="openEmployeeDetails('${d.id}')">Личное дело</button>`;
    }
    
    tr.innerHTML = `
      <td><strong>${d.name}</strong><br><span style="font-size:10px; color:var(--text-secondary);">ИИН: ${d.iin}</span></td>
      <td>${d.position}</td>
      <td>${d.licenseCategory || "Категория С"}</td>
      <td>${d.phone}</td>
      <td>${docStatusHtml}</td>
      <td>${d.lodging || "Атырау (Местный)"}</td>
      <td>${statusBadge}</td>
      <td>${actionBtn}</td>
    `;
    tbody.appendChild(tr);
  });
}

// 5. Функции добавления сущностей из новых модалок
function openAddBlacklistModal() {
  openModal("addBlacklistModal");
}

function submitAddBlacklist() {
  const name = document.getElementById("blName").value.trim();
  const iin = document.getElementById("blIin").value.trim();
  const pos = document.getElementById("blPosition").value.trim();
  const cat = document.getElementById("blCategory").value;
  const reason = document.getElementById("blReason").value.trim();
  const notes = document.getElementById("blNotes").value.trim();
  
  if (!name || !iin || !pos || !reason) {
    showSystemNotification("Заполните обязательные поля!");
    return;
  }
  
  const newEntry = {
    id: "bl_" + (db.blacklist.length + 1),
    name: name,
    iin: iin,
    position: pos,
    category: cat,
    blockReason: reason,
    blockDate: new Date().toISOString().split("T")[0],
    notes: notes
  };
  
  // Добавляем в ЧС
  db.blacklist.push(newEntry);
  
  // Если водитель был в основной базе, блокируем его
  const existDriver = db.drivers.find(d => d.iin === iin);
  if (existDriver) {
    existDriver.isBlocked = true;
  }
  
  saveState();
  renderStaffGrid();
  renderEmployeesTable();
  closeModal("addBlacklistModal");
  showSystemNotification(`Сотрудник ${name} внесен в Черный список!`);
  
  // Очистка формы
  document.getElementById("blacklistForm").reset();
}

function removeFromBlacklist(id) {
  const entry = db.blacklist.find(b => b.id === id);
  if (!entry) return;
  
  db.blacklist = db.blacklist.filter(b => b.id !== id);
  
  const existDriver = db.drivers.find(d => d.iin === entry.iin);
  if (existDriver) {
    existDriver.isBlocked = false;
  }
  
  saveState();
  renderStaffGrid();
  renderEmployeesTable();
  showSystemNotification(`Сотрудник ${entry.name} удален из Черного списка.`);
}

function openAddVehicleModal() {
  openModal("addVehicleModal");
}

function toggleAddVehicleSubrentFields() {
  const type = document.getElementById("newVehOwnerType").value;
  const fields = document.getElementById("addVehicleSubrentFields");
  if (type === 'subrent') {
    fields.style.display = "block";
  } else {
    fields.style.display = "none";
  }
}

function submitAddVehicle() {
  const name = document.getElementById("newVehName").value.trim();
  const model = document.getElementById("newVehModel").value.trim();
  const plate = document.getElementById("newVehPlate").value.trim();
  const type = document.getElementById("newVehType").value;
  const ownerType = document.getElementById("newVehOwnerType").value;
  const inv = document.getElementById("newVehInv").value.trim();
  const year = parseInt(document.getElementById("newVehYear").value) || 2023;
  
  if (!name || !model || !plate || !inv) {
    showSystemNotification("Заполните обязательные поля!");
    return;
  }
  
  const newVeh = {
    id: "v" + (db.vehicles.length + 101),
    name: name,
    model: model,
    plate: plate,
    vin: "VIN" + Math.random().toString(36).substring(2, 15).toUpperCase(),
    invNumber: inv,
    year: year,
    type: type,
    ownerType: ownerType,
    status: "Свободна",
    currentSiteId: "karabatan",
    mileage: 1000,
    engineHours: 50,
    fuelRate: ownerType === 'subrent' ? 25.0 : 15.0,
    ptoDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split("T")[0],
    ctoDate: new Date(new Date().setMonth(new Date().getMonth() + 6)).toISOString().split("T")[0],
    insuranceDate: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split("T")[0],
    insuranceCost: ownerType === 'subrent' ? 0 : 150000,
    taxDate: new Date().toISOString().split("T")[0],
    taxCost: ownerType === 'subrent' ? 0 : 95000,
    tempMove: null
  };
  
  if (ownerType === 'subrent') {
    newVeh.subrentProvider = document.getElementById("newVehSubrentProvider").value.trim() || "ТОО «Каспий Спец Техника»";
    newVeh.subrentRate = parseInt(document.getElementById("newVehSubrentRate").value) || 120000;
  }
  
  db.vehicles.push(newVeh);
  saveState();
  renderGpsVehicleList();
  renderWarehouseInventory();
  renderTimesheetGrid();
  renderSettingsDashboard();
  closeModal("addVehicleModal");
  showSystemNotification(`Техника ${name} успешно добавлена в систему!`);
  
  document.getElementById("addVehicleForm").reset();
  document.getElementById("addVehicleSubrentFields").style.display = "none";
}

function openOrderSafetyCertModal() {
  const select = document.getElementById("scEmployeeSelect");
  if (select) {
    select.innerHTML = db.drivers.map(d => `<option value="${d.name}">${d.name} (${d.position})</option>`).join("");
  }
  openModal("orderSafetyCertModal");
}

function submitSafetyCertRequest() {
  const name = document.getElementById("scEmployeeSelect").value;
  const veh = document.getElementById("scVehicleName").value.trim();
  
  if (!veh) {
    showSystemNotification("Укажите тип спецтехники!");
    return;
  }
  
  db.safetyCertRequests.push({
    id: "scr_" + (db.safetyCertRequests.length + 1),
    employeeName: name,
    vehicleName: veh,
    requestDate: new Date().toISOString().split("T")[0],
    status: "В обработке"
  });
  
  saveState();
  renderSettingsDashboard();
  closeModal("orderSafetyCertModal");
  showSystemNotification("Заявка на корочку ТБ успешно оформлена менеджером!");
}

function openAddContractModal() {
  openModal("addContractModal");
  autoGenerateContractTemplate();
}

function autoGenerateContractTemplate() {
  const num = document.getElementById("cntNum").value || "Д-06/2026-XX";
  const company = document.getElementById("cntCompany").value || "[НАЗВАНИЕ КОНТРАГЕНТА]";
  const type = document.getElementById("cntIsSubrent").value === "true" ? "субаренды" : "оказания услуг";
  const start = document.getElementById("cntStart").value || "2026-06-22";
  const vType = document.getElementById("cntVehType").value || "спецтехники";
  
  const text = `ДОГОВОР № ${num} ${type}\r\nТОО «KazBildInvest», именуемое в дальнейшем Исполнитель, и ${company}, именуемое в дальнейшем Заказчик, заключили настоящий договор о предоставлении услуг ${vType} с ${start}. Оплата по выставленным АВР в течение 10 банковских дней.`;
  document.getElementById("cntTemplateText").value = text;
}

function submitAddContract() {
  const num = document.getElementById("cntNum").value.trim();
  const company = document.getElementById("cntCompany").value.trim();
  const start = document.getElementById("cntStart").value;
  const end = document.getElementById("cntEnd").value;
  const vt = document.getElementById("cntVehType").value.trim();
  const plate = document.getElementById("cntPlate").value.trim();
  const owner = document.getElementById("cntOwner").value.trim();
  const accountant = document.getElementById("cntAccountant").value.trim();
  const isSubrent = document.getElementById("cntIsSubrent").value === "true";
  
  if (!num || !company || !vt || !plate) {
    showSystemNotification("Заполните обязательные поля!");
    return;
  }
  
  const newContract = {
    id: "cnt_" + (db.contracts.length + 1),
    number: num,
    companyName: company,
    dateCreated: start,
    dateEnd: end,
    vehicleType: vt,
    plateNumber: plate,
    ownerContact: owner,
    accountantContact: accountant,
    isSubrent: isSubrent,
    status: "Активен"
  };
  
  db.contracts.push(newContract);
  
  // Добавляем сделку в CRM автоматически на этап «Договор»
  db.deals.push({
    id: "deal_" + (db.deals.length + 10),
    companyName: company,
    contactPerson: owner,
    siteId: "karabatan",
    address: "Строительная площадка заказчика",
    jobType: `Аренда ${vt}`,
    startDate: start,
    endDate: end,
    vehicleCount: 1,
    vehicleIds: ["v101"],
    price: isSubrent ? -500000 : 1200000,
    stage: "Договор",
    contractNumber: num,
    contractSigned: true,
    invoiceStatus: "Не выставлен счет",
    invoiceDueDate: end,
    paymentStageDays: 15
  });
  
  saveState();
  renderSettingsDashboard();
  renderCrmKanban();
  closeModal("addContractModal");
  showSystemNotification(`Договор ${num} успешно зарегистрирован и привязан к сделке CRM!`);
  
  document.getElementById("contractForm").reset();
}

function openMaterialLogModal() {
  const form = document.getElementById("materialLogForm");
  if (form) form.reset();
  updateMaterialSubmitButton();
  openModal("addMaterialLogModal");
}

function submitAddMaterialLog() {
  const type = document.getElementById("mwoType").value;
  const item = document.getElementById("mwoItem").value.trim();
  const qty = parseInt(document.getElementById("mwoQty").value) || 1;
  const price = parseInt(document.getElementById("mwoPrice").value) || 10000;
  const source = document.getElementById("mwoSource").value.trim();
  
  if (!item || !source) {
    showSystemNotification("Заполните поля!");
    return;
  }
  
  db.materialsWriteOffs.push({
    id: "mwo_" + (db.materialsWriteOffs.length + 1),
    date: new Date().toISOString().split("T")[0],
    type: type,
    itemName: item,
    qty: qty,
    source: source,
    price: price
  });
  
  // Если приход на склад, добавляем в ТМЦ
  if (type === "Приход") {
    db.warehouses.central.push({
      id: "tmc_" + Math.random().toString(36).substring(2, 8),
      sku: "SKU-" + Math.floor(100 + Math.random() * 900),
      name: item,
      category: "Расходники",
      supplier: source,
      price: price,
      balance: qty,
      minStock: 2
    });
  }
  
  saveState();
  renderSettingsDashboard();
  renderWarehouseInventory();
  closeModal("addMaterialLogModal");
  showSystemNotification("Запись движения ТМЦ добавлена на склад!");
  
  document.getElementById("materialLogForm").reset();
}

function openSupplierAdvanceModal() {
  openModal("addSupplierAdvanceModal");
}

function submitSupplierAdvance() {
  const name = document.getElementById("saSupplier").value.trim();
  const amount = parseInt(document.getElementById("saAmount").value) || 0;
  const date = document.getElementById("saDate").value;
  const purpose = document.getElementById("saPurpose").value.trim();
  
  if (!name || !amount || !purpose) {
    showSystemNotification("Заполните поля!");
    return;
  }
  
  db.supplierAdvances.push({
    id: "sa_" + (db.supplierAdvances.length + 1),
    supplierName: name,
    date: date,
    amount: amount,
    purpose: purpose
  });
  
  saveState();
  renderSettingsDashboard();
  closeModal("addSupplierAdvanceModal");
  showSystemNotification("Предоплата поставщику зарегистрирована в бухгалтерии!");
  
  document.getElementById("supplierAdvanceForm").reset();
}

function openPotentialSupplierModal() {
  openModal("addPotentialSupplierModal");
}

function submitPotentialSupplier() {
  const name = document.getElementById("psName").value.trim();
  const contact = document.getElementById("psContact").value.trim();
  const city = document.getElementById("psCity").value.trim();
  const cat = document.getElementById("psCategory").value.trim();
  const rating = parseFloat(document.getElementById("psRating").value) || 5.0;
  
  if (!name || !contact || !city || !cat) {
    showSystemNotification("Заполните поля!");
    return;
  }
  
  db.potentialSuppliers.push({
    id: "ps_" + (db.potentialSuppliers.length + 1),
    name: name,
    contact: contact,
    city: city,
    category: cat,
    rating: rating
  });
  
  saveState();
  renderSettingsDashboard();
  closeModal("addPotentialSupplierModal");
  showSystemNotification("Потенциальный поставщик внесен в базу снабжения!");
  
  document.getElementById("potentialSupplierForm").reset();
}

// 6. Обновление и симуляция финансов
function simulateCurrencyUpdate() {
  db.currencyRates.USD = parseFloat((db.currencyRates.USD + (Math.random() * 2 - 1)).toFixed(2));
  db.currencyRates.RUB = parseFloat((db.currencyRates.RUB + (Math.random() * 0.2 - 0.1)).toFixed(2));
  
  document.getElementById("rateUsdDisplay").innerText = db.currencyRates.USD.toFixed(2);
  document.getElementById("rateRubDisplay").innerText = db.currencyRates.RUB.toFixed(2);
  
  saveState();
  showSystemNotification("Курсы валют Нацбанка РК обновлены!");
}

function updateBankBalancesState() {
  const kzt = parseInt(document.getElementById("balanceKztInput").value) || 0;
  const usd = parseInt(document.getElementById("balanceUsdInput").value) || 0;
  
  db.bankBalances[0].balance = kzt;
  db.bankBalances[1].balance = usd;
  
  saveState();
  showSystemNotification("Остатки на банковских счетах сохранены в базу.");
}

// 7. Рендеринг панели настроек и финансов
function renderSettingsDashboard() {
  // 1. Курсы валют и балансы
  const balanceKzt = document.getElementById("balanceKztInput");
  const balanceUsd = document.getElementById("balanceUsdInput");
  if (balanceKzt && balanceUsd) {
    balanceKzt.value = db.bankBalances[0]?.balance || 14500000;
    balanceUsd.value = db.bankBalances[1]?.balance || 25000;
  }
  
  const rateUsd = document.getElementById("rateUsdDisplay");
  const rateRub = document.getElementById("rateRubDisplay");
  if (rateUsd && rateRub) {
    rateUsd.innerText = db.currencyRates.USD.toFixed(2);
    rateRub.innerText = db.currencyRates.RUB.toFixed(2);
  }
  
  // 2. Авансы поставщикам
  const advancesTbody = document.getElementById("supplierAdvancesTableBody");
  if (advancesTbody) {
    advancesTbody.innerHTML = db.supplierAdvances.map(a => `
      <tr>
        <td><strong>${a.supplierName}</strong></td>
        <td>${a.date}</td>
        <td style="color:var(--status-success); font-weight:700;">${a.amount.toLocaleString()} ₸</td>
        <td>${a.purpose}</td>
      </tr>
    `).join("");
  }
  
  // 3. Реестр договоров
  const contractsTbody = document.getElementById("contractsTableBody");
  if (contractsTbody) {
    contractsTbody.innerHTML = db.contracts.map(c => `
      <tr>
        <td>
          <strong>№ ${c.number}</strong><br>
          <span style="font-size:10px; color:var(--text-secondary);">${c.companyName}</span>
        </td>
        <td>
          <span class="badge ${c.isSubrent ? 'badge-danger' : 'badge-neutral'}" style="font-size:9px;">${c.isSubrent ? 'Субаренда' : 'Услуги'}</span><br>
          <span style="font-size:10px; color:var(--text-secondary);">${c.vehicleType} (${c.plateNumber})</span>
        </td>
        <td>
          <span style="font-size:10px;">Владелец: ${c.ownerContact}</span><br>
          <span style="font-size:10px; color:var(--text-secondary);">Бухгалтер: ${c.accountantContact}</span>
        </td>
        <td><span class="badge badge-success" style="font-size:9px;">${c.status}</span></td>
      </tr>
    `).join("");
  }
  
  // 4. Налог на транспорт
  const taxTbody = document.getElementById("vehicleTaxTableBody");
  if (taxTbody) {
    taxTbody.innerHTML = db.vehicles.filter(v => v.ownerType === 'own').map(v => {
      // Расчет дней до уплаты налога (условный дедлайн 15 июля 2026 года)
      const deadline = new Date("2026-07-15");
      const today = new Date();
      const diffTime = deadline - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let statusStyle = "color:var(--status-success);";
      let statusText = `${diffDays} дней осталось`;
      if (diffDays < 0) {
        statusStyle = "color:var(--status-danger); font-weight:700;";
        statusText = `Просрочено на ${Math.abs(diffDays)} дн.`;
      } else if (diffDays <= 30) {
        statusStyle = "color:var(--status-warning); font-weight:700;";
        statusText = `Осталось ${diffDays} дн.!`;
      }
      
      return `
        <tr onclick="editVehicleTaxInfo('${v.id}')" style="cursor:pointer;" title="Кликните для изменения налогов, ПТО и страховки (для Механика/Директора)">
          <td><strong>${v.name}</strong></td>
          <td>${v.plate}</td>
          <td>${(v.taxCost || 95000).toLocaleString()} ₸</td>
          <td>2026-07-15</td>
          <td style="${statusStyle}">${statusText}</td>
        </tr>
      `;
    }).join("");
  }
  
  // 5. Журнал ТМЦ
  const materialsTbody = document.getElementById("materialsLogTableBody");
  if (materialsTbody) {
    materialsTbody.innerHTML = db.materialsWriteOffs.map(m => `
      <tr>
        <td>
          <span class="badge ${m.type === 'Приход' ? 'badge-success' : 'badge-danger'}" style="font-size:9px;">${m.type}</span><br>
          <span style="font-size:9px; color:var(--text-secondary);">${m.date}</span>
        </td>
        <td><strong>${m.itemName}</strong></td>
        <td>${m.qty} шт</td>
        <td>${m.source}</td>
        <td>${(m.price * m.qty).toLocaleString()} ₸</td>
      </tr>
    `).join("");
  }
  
  // 6. Заявки ТБ корочки
  const certTbody = document.getElementById("safetyCertTableBody");
  if (certTbody) {
    certTbody.innerHTML = db.safetyCertRequests.map(s => `
      <tr>
        <td><strong>${s.employeeName}</strong></td>
        <td>${s.vehicleName}</td>
        <td>${s.requestDate}</td>
        <td>
          <span class="badge ${s.status === 'Оформлено' ? 'badge-success' : 'badge-neutral'}" style="font-size:9px; cursor:pointer;" onclick="toggleSafetyCertStatus('${s.id}')">
            ${s.status}
          </span>
        </td>
      </tr>
    `).join("");
  }
}

function toggleSafetyCertStatus(id) {
  const req = db.safetyCertRequests.find(s => s.id === id);
  if (!req) return;
  req.status = req.status === "Оформлено" ? "В обработке" : "Оформлено";
  saveState();
  renderSettingsDashboard();
  showSystemNotification("Статус оформления корочки ТБ изменен.");
}

// 8. Симулятор проверки штрафов ПДД РК для логистов
function checkKzTrafficFines() {
  const query = prompt("Введите Госномер спецтехники или ИИН водителя для проверки штрафов по базам РК:");
  if (!query) return;
  
  showSystemNotification("Выполняется запрос в ГИС ЕРАП и Комитет правовой статистики РК...");
  
  setTimeout(() => {
    // Симулируем результаты проверки
    const sumFines = Math.random() > 0.4 ? Math.floor(Math.random() * 3 + 1) * 14530 : 0; // в тенге
    
    if (sumFines > 0) {
      alert(`⚠️ ОБНАРУЖЕНЫ ШТРАФЫ!\r\nПо запросу "${query}" найдено штрафов на сумму: ${sumFines.toLocaleString()} ₸ (Предписание ПДД РК).\r\nРекомендуется удержать или уведомить водителя.`);
      showSystemNotification(`По запросу "${query}" обнаружены штрафы на ${sumFines.toLocaleString()} ₸`);
    } else {
      alert(`✓ Проверка успешна!\r\nПо запросу "${query}" активных предписаний и штрафов в базе данных ПДД РК не обнаружено.`);
      showSystemNotification(`Штрафов по запросу "${query}" не обнаружено`);
    }
  }, 1200);
}

function editVehicleTaxInfo(vehicleId) {
  const role = db.settings.activeRole;
  if (role !== "Mechanic" && role !== "Director" && role !== "DeputyDirector" && role !== "Accountant") {
    showSystemNotification("Доступ запрещен. Только Механик или Руководство могут изменять данные ТО и страховок.");
    return;
  }
  const v = db.vehicles.find(x => x.id === vehicleId);
  if (!v) return;
  
  const newTax = prompt(`Изменение параметров для ${v.name} (${v.plate}):\r\n\r\nВведите годовую сумму транспортного налога (KZT):`, v.taxCost || 95000);
  if (newTax === null) return;
  
  const newPto = prompt("Введите новую дату техосмотра ПТО (ГГГГ-ММ-ДД):", v.ptoDate || "2026-08-12");
  if (newPto === null) return;
  
  const newIns = prompt("Введите срок окончания действия страховки (ГГГГ-ММ-ДД):", v.insuranceDate || "2026-12-01");
  if (newIns === null) return;
  
  v.taxCost = parseInt(newTax) || 0;
  v.ptoDate = newPto;
  v.insuranceDate = newIns;
  
  saveState();
  renderSettingsDashboard();
  renderRepairsTable();
  renderMaintenanceTracker();
  renderAllVehicles();
  showSystemNotification(`Данные ТО и страхования для ${v.name} успешно обновлены!`);
}

// ============================================================================
// МОДУЛЬ 12: РЕЕСТР АВТОПАРКА («ВСЕ АВТО») И ИНДИВИДУАЛЬНЫЕ ТАБЕЛИ
// ============================================================================

function renderAllVehicles() {
  const container = document.getElementById("tab-all_vehicles");
  if (!container || container.style.display === "none") return;
  
  // Обновление статистики автопарка в инфо-баре
  const total = db.vehicles.length;
  const own = db.vehicles.filter(v => v.ownerType === "own").length;
  const subrent = db.vehicles.filter(v => v.ownerType === "subrent").length;
  const inRepair = db.vehicles.filter(v => v.status === "На ремонте" || v.status === "Неисправна").length;
  
  const infoBar = container.querySelector(".ux-info-panel div");
  if (infoBar) {
    infoBar.innerHTML = `
      <strong>Единый реестр автопарка ТОО KazBildInvest.</strong> Всего в парке: <strong>${total}</strong> машин (Собственные: <strong>${own}</strong>, Субаренда: <strong>${subrent}</strong>). В ремонте/простое: <span style="color:var(--status-danger); font-weight:700;">${inRepair}</span> ТС.<br>
      Раздел позволяет добавлять субаренду, изменять водителей, проверять штрафы ПДД РК по госномеру и просматривать расходы по отдельным машинам.
    `;
  }
  
  renderAllVehiclesList();
  initHoldToConfirmButtons();
}

function renderAllVehiclesList() {
  const searchVal = (document.getElementById("allVehiclesSearch")?.value || "").toLowerCase().trim();
  const ownerFilter = document.getElementById("allVehiclesOwnerFilter")?.value || "all";
  const tbody = document.getElementById("allVehiclesTableBody");
  if (!tbody) return;
  
  let list = db.vehicles;
  
  // Фильтрация
  if (searchVal) {
    list = list.filter(v => 
      v.name.toLowerCase().includes(searchVal) || 
      v.plate.toLowerCase().includes(searchVal) || 
      v.invNumber.toLowerCase().includes(searchVal)
    );
  }
  if (ownerFilter !== "all") {
    list = list.filter(v => v.ownerType === ownerFilter);
  }
  
  if (list.length === 0) {
    tbody.innerHTML = `<tr><td colspan="8" style="text-align:center; color:var(--text-secondary); padding: 40px 10px;">Техника по вашему запросу не найдена. Попробуйте изменить фильтры.</td></tr>`;
    return;
  }
  
  tbody.innerHTML = list.map(v => {
    const driver = db.drivers.find(d => d.id === v.driverId);
    const site = db.sites.find(s => s.id === v.currentSiteId);
    
    let ownershipText = "";
    if (v.ownerType === "own") {
      ownershipText = `<span class="badge badge-neutral" style="font-size: 10px;">Собственная</span>`;
    } else {
      ownershipText = `
        <div style="font-size: 11px;">
          <span class="badge badge-warning" style="font-size: 9px; background: rgba(217, 119, 6, 0.1);">Субаренда</span><br>
          <span style="color:var(--text-secondary); font-size:10px;">${v.subrentProvider || "Партнер"}<br><b>${(v.subrentRate || 120000).toLocaleString()} ₸/сут</b></span>
        </div>
      `;
    }
    
    let statusClass = "badge-neutral";
    if (v.status === "Работает") statusClass = "badge-success";
    if (v.status === "На ремонте" || v.status === "Неисправна") statusClass = "badge-danger";
    if (v.status === "На ТО" || v.status === "В пути") statusClass = "badge-warning";
    
    const driverName = driver ? driver.name : "<span style='color:var(--text-secondary); font-style:italic;'>Не назначен</span>";
    
    return `
      <tr>
        <td>
          <div style="font-weight:600; font-size:13px;">${v.name}</div>
          <div style="font-size:11px; color:var(--text-secondary);">${v.model || ""}</div>
        </td>
        <td><code style="font-weight:700; color:var(--brand-color); font-size:12px;">${v.plate}</code></td>
        <td><code>${v.invNumber}</code></td>
        <td>${ownershipText}</td>
        <td>${driverName}</td>
        <td><span class="badge ${statusClass}">${v.status}</span></td>
        <td><span style="font-size:11px;">${site ? site.name : "Вне геозоны"}</span></td>
        <td style="text-align:right;">
          <div style="display:flex; justify-content:flex-end; gap:6px;">
            <button class="btn-secondary" style="font-size:11px; padding: 4px 8px;" onclick="openEditVehicleModal('${v.id}')">Редактировать</button>
            <button class="btn-primary" style="font-size:11px; padding: 4px 8px;" onclick="selectVehicleForTimesheet('${v.id}')">Табель & Затраты</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

// ----------------------------------------------------
// ИНСТРУМЕНТ: ПРОВЕРКА ПО ГОСНОМЕРУ РК
// ----------------------------------------------------

function performKzPlateCheck() {
  const plateInput = document.getElementById("vehiclePlateCheckInput");
  const container = document.getElementById("plateCheckResultContainer");
  if (!plateInput || !container) return;
  
  const rawPlate = plateInput.value.trim();
  if (!rawPlate) {
    showSystemNotification("Введите госномер для проверки!");
    return;
  }
  
  showSystemNotification("Запрос в ГИС ЕРАП РК, страховые базы ЕРАИ и ЧС логистики...");
  container.style.display = "block";
  container.innerHTML = `
    <div style="text-align:center; padding: 30px; color: var(--text-secondary);">
      <svg class="spinner" viewBox="0 0 50 50" style="width:30px; height:30px; margin:0 auto 12px; display:block; stroke:var(--brand-color); stroke-width:4; fill:none; stroke-linecap:round; animation:spin 1s linear infinite;"><circle cx="25" cy="25" r="20"></circle></svg>
      Выполняется сверка госномера с базами данных Республики Казахстан...
    </div>
  `;
  
  setTimeout(() => {
    // Ищем машину в нашей базе для детальной информации
    const plateUpper = rawPlate.toUpperCase().replace(/\s+/g, '');
    const vehicle = db.vehicles.find(v => v.plate.toUpperCase().replace(/\s+/g, '') === plateUpper);
    
    let name = rawPlate;
    let type = "Внедорожник/Сторонний транспорт";
    let isOwn = false;
    let insuranceText = "Не найдено в базе ТОО";
    let insuranceClass = "badge-neutral";
    let ptoText = "Нет сведений";
    let ptoClass = "badge-neutral";
    let taxText = "Нет сведений";
    let taxClass = "badge-neutral";
    let driverText = "Не назначен";
    let driverClass = "badge-neutral";
    let fineSum = Math.random() > 0.4 ? Math.floor(Math.random() * 3 + 1) * 14530 : 0;
    
    if (vehicle) {
      name = `${vehicle.name} (${vehicle.model})`;
      type = vehicle.type;
      isOwn = vehicle.ownerType === "own";
      
      // Сроки страховки
      const insDate = new Date(vehicle.insuranceDate);
      const today = new Date();
      const diffTime = insDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      const checkCheckmark = `<svg viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: currentColor; stroke-width: 2.5; fill: none; margin-right: 4px; display: inline-block; vertical-align: middle;"><polyline points="20 6 9 17 4 12"></polyline></svg>`;
      const checkCross = `<svg viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: currentColor; stroke-width: 2.5; fill: none; margin-right: 4px; display: inline-block; vertical-align: middle;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
      const checkWarning = `<svg viewBox="0 0 24 24" style="width: 12px; height: 12px; stroke: currentColor; stroke-width: 2.5; fill: none; margin-right: 4px; display: inline-block; vertical-align: middle;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`;

      if (diffDays < 0) {
        insuranceText = `${checkCross} ПРОСРОЧЕНА (срок истек ${Math.abs(diffDays)} дн. назад | ${vehicle.insuranceDate})`;
        insuranceClass = "badge-danger";
      } else if (diffDays <= 15) {
        insuranceText = `${checkWarning} ИСТЕКАЕТ (осталось ${diffDays} дн. | ${vehicle.insuranceDate})`;
        insuranceClass = "badge-warning";
      } else {
        insuranceText = `${checkCheckmark} Активна (осталось ${diffDays} дн. | до ${vehicle.insuranceDate})`;
        insuranceClass = "badge-success";
      }
      
      // Сроки ПТО
      const ptoDate = new Date(vehicle.ptoDate);
      const ptoDiff = ptoDate - today;
      const ptoDays = Math.ceil(ptoDiff / (1000 * 60 * 60 * 24));
      if (ptoDays < 0) {
        ptoText = `${checkCross} Просрочен ПТО (истек ${Math.abs(ptoDays)} дн. назад)`;
        ptoClass = "badge-danger";
      } else {
        ptoText = `${checkCheckmark} Пройден (до ${vehicle.ptoDate})`;
        ptoClass = "badge-success";
      }
      
      // Налог
      if (isOwn) {
        const taxDate = new Date(vehicle.taxDate || "2026-07-15");
        const taxDiff = taxDate - today;
        const taxDays = Math.ceil(taxDiff / (1000 * 60 * 60 * 24));
        if (taxDays < 0) {
          taxText = `${checkCross} Задолженность (${(vehicle.taxCost || 120000).toLocaleString()} ₸)`;
          taxClass = "badge-danger";
        } else {
          taxText = `${checkCheckmark} Оплачен (${(vehicle.taxCost || 120000).toLocaleString()} ₸)`;
          taxClass = "badge-success";
        }
      } else {
        taxText = "Субаренда (оплачивает арендодатель)";
        taxClass = "badge-neutral";
      }
      
      // Водитель и проверка в ЧС
      const driver = db.drivers.find(d => d.id === vehicle.driverId);
      if (driver) {
        // Проверяем по черному списку по ИИН или имени
        const blacklisted = db.blacklist.find(b => b.iin === driver.iin || b.name.toLowerCase().includes(driver.name.toLowerCase()));
        if (blacklisted) {
          driverText = `${checkWarning} БЛОКИРОВКА: ${driver.name} в Черном списке! (Причина: ${blacklisted.blockReason})`;
          driverClass = "badge-danger";
        } else {
          driverText = `${checkCheckmark} ${driver.name} (ИИН: ${driver.iin || "Нет"}) — Благонадежен`;
          driverClass = "badge-success";
        }
      } else {
        driverText = "Машинист не назначен на смену!";
        driverClass = "badge-warning";
      }
    } else {
      // Имитируем случайную проверку для стороннего госномера
      insuranceText = "Внешняя страховка активна (Казкоммерц-Полис)";
      insuranceClass = "badge-success";
      ptoText = "Техосмотр пройден в ЦТО г. Атырау";
      ptoClass = "badge-success";
      taxText = "Сведений о задолженности по налогам нет";
      taxClass = "badge-success";
      driverText = "Сторонний оператор";
      driverClass = "badge-neutral";
    }
    
    let fineHtml = "";
    if (fineSum > 0) {
      fineHtml = `
        <div style="background: rgba(220, 38, 38, 0.1); border-left: 4px solid var(--status-danger); padding: 12px; border-radius: 4px; margin-bottom: 12px;">
          <span style="font-weight:700; color:var(--status-danger); font-size:12px; display:inline-flex; align-items:center; gap:4px;">
            <svg viewBox="0 0 24 24" style="width:12px; height:12px; stroke:currentColor; stroke-width:2.5; fill:none; display:inline-block;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>
            ОБНАРУЖЕНЫ ШТРАФЫ В БАЗЕ ЕРАП РК:
          </span><br>
          <span style="font-size:11px;">Найдено 1 предписание по превышению скорости на сумму: <strong>${fineSum.toLocaleString()} ₸</strong>. Рекомендуется удержать при выплатах.</span>
        </div>
      `;
    } else {
      fineHtml = `
        <div style="background: rgba(22, 163, 74, 0.1); border-left: 4px solid var(--status-success); padding: 12px; border-radius: 4px; margin-bottom: 12px;">
          <span style="font-weight:700; color:var(--status-success); font-size:12px; display:inline-flex; align-items:center; gap:4px;">
            <svg viewBox="0 0 24 24" style="width:12px; height:12px; stroke:currentColor; stroke-width:2.5; fill:none; display:inline-block;"><polyline points="20 6 9 17 4 12"></polyline></svg>
            АКТИВНЫХ ШТРАФОВ НЕТ:
          </span><br>
          <span style="font-size:11px;">Предписаний ПДД и неоплаченных взысканий по ГИС ЕРАП РК не обнаружено.</span>
        </div>
      `;
    }
    
    container.innerHTML = `
      <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 12px; border-bottom: 1px solid var(--border-color); padding-bottom: 8px;">
        <div>
          <h4 style="font-size:14px; margin:0;">${name}</h4>
          <span style="font-size:11px; color:var(--text-secondary);">${type}</span>
        </div>
        <span class="badge ${vehicle ? (isOwn ? 'badge-neutral' : 'badge-warning') : 'badge-neutral'}">
          ${vehicle ? (isOwn ? 'Собственность ТОО' : 'Субаренда') : 'Вне реестра'}
        </span>
      </div>
      
      ${fineHtml}
      
      <div class="grid-container" style="gap:12px; font-size:11px;">
        <div class="col-6">
          <strong>Страховой полис (ЕРАИ):</strong><br>
          <span class="badge ${insuranceClass}" style="margin-top:4px; display:inline-block; text-align:left; font-size:10px;">${insuranceText}</span>
        </div>
        <div class="col-6">
          <strong>Технический осмотр (ПТО):</strong><br>
          <span class="badge ${ptoClass}" style="margin-top:4px; display:inline-block; font-size:10px;">${ptoText}</span>
        </div>
        <div class="col-6" style="margin-top:8px;">
          <strong>Налог на транспорт:</strong><br>
          <span class="badge ${taxClass}" style="margin-top:4px; display:inline-block; font-size:10px;">${taxText}</span>
        </div>
        <div class="col-6" style="margin-top:8px;">
          <strong>Проверка машиниста / ЧС логистов:</strong><br>
          <span class="badge ${driverClass}" style="margin-top:4px; display:inline-block; text-align:left; font-size:10px;">${driverText}</span>
        </div>
      </div>
    `;
  }, 800);
}

// ----------------------------------------------------
// ОКНО РЕДАКТИРОВАНИЯ ТЕХНИКИ
// ----------------------------------------------------

function openEditVehicleModal(vehicleId) {
  const v = db.vehicles.find(x => x.id === vehicleId);
  if (!v) return;
  
  document.getElementById("editVehId").value = v.id;
  document.getElementById("editVehName").value = v.name;
  document.getElementById("editVehModel").value = v.model;
  document.getElementById("editVehPlate").value = v.plate;
  document.getElementById("editVehType").value = v.type;
  document.getElementById("editVehOwnerType").value = v.ownerType;
  document.getElementById("editVehInv").value = v.invNumber;
  document.getElementById("editVehYear").value = v.year;
  document.getElementById("editVehStatus").value = v.status;
  
  // Наполнение селектора водителей
  const driverSelect = document.getElementById("editVehDriver");
  if (driverSelect) {
    driverSelect.innerHTML = `<option value="">Нет назначенного водителя</option>` +
      db.drivers.map(d => `<option value="${d.id}" ${d.id === v.driverId ? 'selected' : ''}>${d.name} (${d.position})</option>`).join("");
  }
  
  // Дополнительные поля субаренды / собственности
  document.getElementById("editVehSubrentProvider").value = v.subrentProvider || "";
  document.getElementById("editVehSubrentRate").value = v.subrentRate || "";
  
  document.getElementById("editVehTaxCost").value = v.taxCost || "";
  document.getElementById("editVehTaxDate").value = v.taxDate || "2026-07-15";
  document.getElementById("editVehPtoDate").value = v.ptoDate || "";
  document.getElementById("editVehCtoDate").value = v.ctoDate || "";
  document.getElementById("editVehInsProvider").value = v.insuranceProvider || "";
  document.getElementById("editVehInsDate").value = v.insuranceDate || "";
  
  toggleEditVehicleSubrentFields();
  openModal("editVehicleModal");
}

function toggleEditVehicleSubrentFields() {
  const type = document.getElementById("editVehOwnerType").value;
  const subrentBlock = document.getElementById("editVehicleSubrentFields");
  const ownBlock = document.getElementById("editVehicleOwnFields");
  
  if (type === "subrent") {
    subrentBlock.style.display = "block";
    ownBlock.style.display = "none";
  } else {
    subrentBlock.style.display = "none";
    ownBlock.style.display = "block";
  }
}

function submitEditVehicle() {
  const id = document.getElementById("editVehId").value;
  const v = db.vehicles.find(x => x.id === id);
  if (!v) return;
  
  const name = document.getElementById("editVehName").value.trim();
  const model = document.getElementById("editVehModel").value.trim();
  const plate = document.getElementById("editVehPlate").value.trim();
  const type = document.getElementById("editVehType").value;
  const ownerType = document.getElementById("editVehOwnerType").value;
  const inv = document.getElementById("editVehInv").value.trim();
  const year = parseInt(document.getElementById("editVehYear").value) || 2023;
  const status = document.getElementById("editVehStatus").value;
  const driverId = document.getElementById("editVehDriver").value;
  
  if (!name || !model || !plate || !inv) {
    showSystemNotification("Заполните обязательные поля!");
    return;
  }
  
  v.name = name;
  v.model = model;
  v.plate = plate;
  v.type = type;
  v.ownerType = ownerType;
  v.invNumber = inv;
  v.year = year;
  v.status = status;
  v.driverId = driverId;
  
  if (ownerType === "subrent") {
    v.subrentProvider = document.getElementById("editVehSubrentProvider").value.trim();
    v.subrentRate = parseInt(document.getElementById("editVehSubrentRate").value) || 0;
  } else {
    v.taxCost = parseInt(document.getElementById("editVehTaxCost").value) || 0;
    v.taxDate = document.getElementById("editVehTaxDate").value;
    v.ptoDate = document.getElementById("editVehPtoDate").value;
    v.ctoDate = document.getElementById("editVehCtoDate").value;
    v.insuranceProvider = document.getElementById("editVehInsProvider").value.trim();
    v.insuranceDate = document.getElementById("editVehInsDate").value;
  }
  
  saveState();
  renderAllVehicles();
  renderGpsVehicleList();
  renderRepairsTable();
  renderMaintenanceTracker();
  renderGanttChart();
  closeModal("editVehicleModal");
  showSystemNotification(`Техника ${name} успешно отредактирована!`);
}

// ----------------------------------------------------
// ДЕТАЛЬНЫЙ ТАБЕЛЬ И РАСХОДЫ ПО КОНКРЕТНОЙ ТЕХНИКЕ
// ----------------------------------------------------

function selectVehicleForTimesheet(vehicleId) {
  window.selectedVehForTimesheet = vehicleId;
  const wrapper = document.getElementById("individualVehicleTimesheetWrapper");
  if (wrapper) {
    wrapper.style.display = "block";
    renderIndividualVehicleTimesheet();
    
    // Плавный скролл к блоку
    setTimeout(() => {
      wrapper.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 150);
  }
}

function renderIndividualVehicleTimesheet() {
  const vehicleId = window.selectedVehForTimesheet;
  if (!vehicleId) return;
  
  const v = db.vehicles.find(x => x.id === vehicleId);
  if (!v) return;
  
  const wrapper = document.getElementById("individualVehicleTimesheetWrapper");
  if (!wrapper) return;
  
  const monthInputVal = document.getElementById("individualTimesheetMonth")?.value || "2026-06";
  const defaultMonth = monthInputVal;
  
  // Ищем или создаем запись табеля
  let timesheet = db.timesheets.find(t => t.vehicleId === vehicleId && t.month === defaultMonth);
  if (!timesheet) {
    // Создаем пустой табель на 30 дней по умолчанию
    const defaultHistory = [];
    const defaultDaily = {};
    for (let day = 1; day <= 30; day++) {
      defaultHistory.push({ day: day, driverId: v.driverId || "d101" });
      // Будние дни - работа, выходные - выходной
      const dayOfWeek = new Date(`2026-06-${day.toString().padStart(2, '0')}`).getDay();
      defaultDaily[day] = (dayOfWeek === 0 || dayOfWeek === 6) ? "O" : "W";
    }
    
    timesheet = {
      id: "ts_ind_" + vehicleId + "_" + defaultMonth.replace("-", ""),
      month: defaultMonth,
      vehicleId: vehicleId,
      driverHistory: defaultHistory,
      dailyStatus: defaultDaily,
      mechanicApproved: false,
      hrApproved: false,
      directorApproved: false
    };
    db.timesheets.push(timesheet);
    saveState();
  }
  
  // Вычисляем показатели работы
  let workDays = 0;
  let offDays = 0;
  let repairDays = 0;
  let idleDays = 0;
  
  Object.keys(timesheet.dailyStatus).forEach(day => {
    const s = timesheet.dailyStatus[day];
    if (s === "W") workDays++;
    if (s === "O") offDays++;
    if (s === "R") repairDays++;
    if (s === "I") idleDays++;
  });
  
  // Считаем Затраты
  // 1. Аренда / Амортизация
  let rentCost = 0;
  let rentText = "";
  if (v.ownerType === "subrent") {
    rentCost = workDays * (v.subrentRate || 120000);
    rentText = `Субаренда: <strong>${workDays}</strong> дн. × <strong>${(v.subrentRate || 120000).toLocaleString()} ₸</strong> = <strong>${rentCost.toLocaleString()} ₸</strong>`;
  } else {
    rentCost = 150000; // фикс амортизация
    rentText = `Расчетная амортизация за месяц: <strong>150 000 ₸</strong>`;
  }
  
  // 2. Ремонты спецтехники за этот месяц
  const repairsInMonth = db.repairs.filter(r => r.vehicleId === vehicleId && r.createdAt.startsWith(defaultMonth));
  const repairsCost = repairsInMonth.reduce((sum, r) => sum + (r.damageCost || 0) + (r.laborCost || 0), 0);
  
  // 3. Затраты на ГСМ (заправки)
  const fuelInMonth = db.fuelLogs.filter(f => f.vehicleId === vehicleId && f.date.startsWith(defaultMonth));
  const fuelCost = fuelInMonth.reduce((sum, f) => sum + (f.cost || 0), 0);
  const fuelLiters = fuelInMonth.reduce((sum, f) => sum + (f.liters || 0), 0);
  
  const totalDirectCost = rentCost + repairsCost + fuelCost;
  
  // Генерация карточек дней
  let daysHtml = "";
  for (let day = 1; day <= 30; day++) {
    const activeDriverObj = timesheet.driverHistory.find(h => h.day === day) || { driverId: v.driverId };
    const currentStatus = timesheet.dailyStatus[day] || "W";
    
    let statusClass = "work";
    if (currentStatus === "O") statusClass = "off";
    if (currentStatus === "R") statusClass = "repair";
    if (currentStatus === "I") statusClass = "idle";
    
    const driverOptions = db.drivers.map(d => `<option value="${d.id}" ${d.id === activeDriverObj.driverId ? 'selected' : ''}>${d.name.split(" ")[0]}</option>`).join("");
    
    daysHtml += `
      <div class="indiv-day-card ${statusClass}">
        <div style="display:flex; justify-content:space-between; align-items:center;">
          <span class="indiv-day-num">${day} июня</span>
          <select style="font-size:9px; padding:2px; font-weight:700;" onchange="updateIndivDayStatus('${vehicleId}', '${defaultMonth}', ${day}, this.value)">
            <option value="W" ${currentStatus === "W" ? 'selected' : ''}>Работа (Я)</option>
            <option value="O" ${currentStatus === "O" ? 'selected' : ''}>Выходной (В)</option>
            <option value="R" ${currentStatus === "R" ? 'selected' : ''}>Ремонт (Р)</option>
            <option value="I" ${currentStatus === "I" ? 'selected' : ''}>Простой (П)</option>
          </select>
        </div>
        <div style="margin-top:4px;">
          <span style="font-size:9px; color:var(--text-secondary); display:block;">Машинист:</span>
          <select style="font-size:10px; width:100%; padding:2px;" onchange="updateIndivDayDriver('${vehicleId}', '${defaultMonth}', ${day}, this.value)">
            ${driverOptions}
          </select>
        </div>
      </div>
    `;
  }
  
  wrapper.innerHTML = `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 20px; border-bottom:1px solid var(--border-color); padding-bottom:12px;">
      <div>
        <h3 style="font-size: 15px; margin:0;">Индивидуальный табель смен и затраты: <strong>${v.name}</strong> (${v.plate})</h3>
        <span style="font-size:11px; color:var(--text-secondary);">Индивидуальный контроль замен машинистов и прямых издержек спецтехники по дням</span>
      </div>
      <div style="display:flex; gap:12px; align-items:center;">
        <label style="font-size:11px; font-weight:600; color:var(--text-secondary);">Месяц:</label>
        <input type="month" id="individualTimesheetMonth" value="${defaultMonth}" class="form-control" style="width:160px; font-size:12px; padding:5px 8px;" onchange="renderIndividualVehicleTimesheet()" />
      </div>
    </div>
    
    <div class="grid-container" style="gap:20px;">
      <!-- Левая часть: Калькулятор затрат -->
      <div class="col-4">
        <div class="card" style="background:var(--bg-secondary); border:1px solid var(--border-color); padding:16px; display:flex; flex-direction:column; gap:12px; height:100%;">
          <h4 style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:4px; font-weight:700;">Прямые затраты за месяц</h4>
          
          <div style="font-size:12px; border-bottom:1px dashed var(--border-color); padding-bottom:8px;">
            <div style="color:var(--text-secondary); font-size:10px; text-transform:uppercase; font-weight:600;">1. Содержание / Аренда</div>
            <div style="margin-top:2px;">${rentText}</div>
          </div>
          
          <div style="font-size:12px; border-bottom:1px dashed var(--border-color); padding-bottom:8px;">
            <div style="color:var(--text-secondary); font-size:10px; text-transform:uppercase; font-weight:600;">2. Затраты на ремонт за месяц</div>
            <div style="margin-top:2px; display:flex; justify-content:space-between;">
              <span>Найдено <strong>${repairsInMonth.length}</strong> дефектных актов:</span>
              <strong>${repairsCost.toLocaleString()} ₸</strong>
            </div>
            ${repairsInMonth.map(r => "<div style='font-size:9px; color:var(--text-secondary); margin-top:2px;'>• " + r.createdAt + ": " + r.description.substring(0, 30) + "... (" + (r.damageCost + r.laborCost).toLocaleString() + " ₸)</div>").join("")}
          </div>
          
          <div style="font-size:12px; border-bottom:1px dashed var(--border-color); padding-bottom:8px;">
            <div style="color:var(--text-secondary); font-size:10px; text-transform:uppercase; font-weight:600;">3. Затраты на ГСМ за месяц</div>
            <div style="margin-top:2px; display:flex; justify-content:space-between;">
              <span>Всего заправлено <strong>${fuelLiters} л</strong>:</span>
              <strong>${fuelCost.toLocaleString()} ₸</strong>
            </div>
          </div>
          
          <div style="background:var(--bg-card); padding:12px; border-radius:6px; margin-top:auto; box-shadow:var(--shadow);">
            <div style="font-size:10px; color:var(--text-secondary); text-transform:uppercase; font-weight:700;">Итого прямых издержек</div>
            <div style="font-size:20px; font-weight:800; color:var(--text-primary); margin-top:2px;">${totalDirectCost.toLocaleString()} ₸</div>
          </div>
          
          <button class="btn-primary" style="justify-content:center; margin-top:8px;" onclick="saveIndividualVehicleTimesheet()">Сохранить изменения табеля</button>
        </div>
      </div>
      
      <!-- Правая часть: Календарная сетка -->
      <div class="col-8">
        <h4 style="font-size:11px; text-transform:uppercase; letter-spacing:0.5px; margin-bottom:8px; font-weight:700; color:var(--text-secondary);">Сетка рабочих смен спецтехники по дням:</h4>
        <div class="indiv-timesheet-grid">
          ${daysHtml}
        </div>
      </div>
    </div>
  `;
}

function updateIndivDayStatus(vehicleId, month, day, newStatus) {
  const timesheet = db.timesheets.find(t => t.vehicleId === vehicleId && t.month === month);
  if (!timesheet) return;
  timesheet.dailyStatus[day] = newStatus;
  renderIndividualVehicleTimesheet();
}

function updateIndivDayDriver(vehicleId, month, day, newDriverId) {
  const timesheet = db.timesheets.find(t => t.vehicleId === vehicleId && t.month === month);
  if (!timesheet) return;
  
  const historyIdx = timesheet.driverHistory.findIndex(h => h.day === day);
  if (historyIdx >= 0) {
    timesheet.driverHistory[historyIdx].driverId = newDriverId;
  } else {
    timesheet.driverHistory.push({ day: day, driverId: newDriverId });
  }
}

function saveIndividualVehicleTimesheet() {
  saveState();
  renderTimesheetGrid(); // Синхронизируем глобальный табель
  showSystemNotification("Данные индивидуального табеля и замен водителей сохранены.");
}

// ============================================================================
// МОДУЛЬ 13: РЕЕСТР ДОГОВОРОВ И ШАБЛОНОВ ДЛЯ МЕНЕДЖЕРА
// ============================================================================

function renderContractsRegistry() {
  const tbody = document.getElementById("contractsTabTableBody");
  if (!tbody) return;
  
  tbody.innerHTML = db.contracts.map(c => {
    return `
      <tr>
        <td>
          <div style="font-weight:600;">№ ${c.number}</div>
          <span style="font-size:11px; color:var(--text-secondary);">${c.companyName}</span>
        </td>
        <td>
          <div style="font-size:12px;">${c.vehicleType}</div>
          <span style="font-size:10px; color:var(--text-secondary);">${c.plateNumber}</span>
        </td>
        <td>
          <span style="font-size:11px;">С: ${c.dateCreated}<br>По: ${c.dateEnd}</span>
        </td>
        <td>
          <span class="badge ${c.status === 'Активен' ? 'badge-success' : 'badge-neutral'}">${c.status}</span>
        </td>
        <td style="text-align:right;">
          <button class="btn-secondary" style="font-size:11px; padding:4px 8px;" onclick="viewContractPrintForm('${c.id}')">🔎 Печать</button>
        </td>
      </tr>
    `;
  }).join("");
}

function viewContractPrintForm(contractId) {
  const c = db.contracts.find(x => x.id === contractId);
  const container = document.getElementById("contractPreviewContainer");
  if (!c || !container) return;
  
  // Шаблон А4 формы договора
  container.innerHTML = `
    <div style="display:flex; justify-content:flex-end; gap:8px; margin-bottom:12px;">
      <button class="btn-primary" style="font-size:11px; padding:4px 8px;" onclick="printContractDocument('${c.id}')">Распечатать договор</button>
    </div>
    
    <div class="a4-print-document" id="a4-printed-contract">
      <div class="a4-header">
        <h2 style="font-size:15px; font-weight:700; margin:0; text-transform:uppercase;">ТОО «KazBildInvest»</h2>
        <span style="font-size:10px; color:#555;">Казахстан, г. Атырау, пр. Абулхаир Хана 45</span>
        <div class="a4-title">Договор аренды спецтехники № ${c.number}</div>
        <span style="font-size:12px;">г. Атырау &nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; Дата: ${c.dateCreated}</span>
      </div>
      
      <div class="a4-body" style="font-size:11px; line-height:1.4;">
        <p><b>1. ПРЕДМЕТ ДОГОВОРА</b><br>
        1.1. Арендодатель обязуется предоставить Арендатору во временное владение и пользование спецтехнику: <strong>${c.vehicleType}</strong> (государственные регистрационные знаки: <strong>${c.plateNumber}</strong>), а Арендатор обязуется принять технику и своевременно оплачивать арендные услуги.</p>
        
        <p style="margin-top:8px;"><b>2. ПОРЯДОК РАСЧЕТОВ</b><br>
        2.1. Расчет стоимости аренды производится согласно утвержденным тарифам и актам выполненных работ. Оплата осуществляется безналичным расчетом в национальной валюте Республики Казахстан (Тенге).</p>
        
        <p style="margin-top:8px;"><b>3. СРОКИ И ПОРЯДОК ПЕРЕДАЧИ</b><br>
        3.1. Настоящий договор вступает в силу с момента его подписания и действует до <strong>${c.dateEnd}</strong>. Спецтехника передается на основании Акта приема-передачи.</p>
        
        <p style="margin-top:8px;"><b>4. РЕКВИЗИТЫ СТОРОН</b></p>
        <table class="a4-meta-table">
          <tr>
            <td style="width:50%;">
              <strong>АРЕНДАТОР:</strong><br>
              ТОО «KazBildInvest»<br>
              БИН: 150240003920<br>
              г. Атырау, ул. Сырым Датова 12<br>
              Тел: +7 (7122) 30-40-50
            </td>
            <td style="width:50%;">
              <strong>АРЕНДОДАТЕЛЬ (КОНТРАГЕНТ):</strong><br>
              ${c.companyName}<br>
              БИН: 120440012934 / ИИН: 840219300181<br>
              Контакты владельца: ${c.ownerContact}<br>
              Контакты бухгалтера: ${c.accountantContact}
            </td>
          </tr>
        </table>
      </div>
      
      <div class="a4-footer">
        <div class="a4-stamp-box">
          <span style="font-size:10px;">Директор ТОО «KBI»</span>
          <img class="a4-seal-img" src="https://static.tildacdn.com/tild3534-3135-4330-b333-316531393666/seal_kaz.png" alt="Печать" style="display:none;" /> <!-- Заглушка, подгружается при печати -->
          <div style="font-size:9px; color:#555; position:absolute; top:20px; left:40px; font-weight:bold; border: 2px solid #2563EB; border-radius:50%; width:70px; height:70px; display:flex; align-items:center; justify-content:center; color:#2563EB; transform:rotate(-15deg); opacity:0.85;">ПЕЧАТЬ ТОО</div>
        </div>
        <div class="a4-stamp-box">
          <span style="font-size:10px;">Представитель контрагента</span>
        </div>
      </div>
    </div>
  `;
}

function printContractDocument(contractId) {
  const doc = document.getElementById("a4-printed-contract");
  if (!doc) return;
  
  // Открытие окна для печати
  const printWindow = window.open('', '_blank', 'width=800,height=900');
  printWindow.document.write(`
    <html>
      <head>
        <title>Печать договора</title>
        <style>
          body { font-family: sans-serif; padding: 20px; }
          .a4-print-document { background: #fff; border: none; box-shadow: none; max-width: 100%; margin: 0; padding: 0; }
          .a4-header { border-bottom: 2px solid #000; text-align: center; padding-bottom: 12px; margin-bottom: 20px; }
          .a4-title { font-size: 16px; font-weight: bold; text-transform: uppercase; margin-top: 10px; }
          .a4-meta-table { width: 100%; border-collapse: collapse; margin-top: 15px; margin-bottom: 15px; }
          .a4-meta-table td { padding: 6px; border: 1px solid #000; font-size: 10px; }
          .a4-body { font-size: 11px; line-height: 1.4; text-align: justify; }
          .a4-footer { display: flex; justify-content: space-between; margin-top: 40px; font-size: 11px; }
          .a4-stamp-box { position: relative; width: 200px; height: 100px; border-bottom: 1px solid #000; display: flex; align-items: flex-end; }
          .seal-blue { border: 2px solid #1d4ed8; color: #1d4ed8; border-radius: 50%; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; font-size: 9px; transform: rotate(-15deg); font-weight: bold; position: absolute; top: 10px; left: 60px; opacity: 0.8; }
        </style>
      </head>
      <body>
        ${doc.innerHTML}
        <script>
          // Добавляем штамп печати
          const footers = document.getElementsByClassName("a4-footer");
          if(footers.length > 0) {
            const firstStamp = footers[0].getElementsByClassName("a4-stamp-box")[0];
            const seal = document.createElement("div");
            seal.className = "seal-blue";
            seal.innerText = "ПОДПИСАНО\\nТОО KBI";
            firstStamp.appendChild(seal);
          }
          window.onload = function() { window.print(); window.close(); }
        </script>
      </body>
    </html>
  `);
  printWindow.document.close();
}

// ============================================================================
// МОДУЛЬ 14: ФИНАНСЫ И КАЗНАЧЕЙСТВО (TREASURY)
// ============================================================================

function renderFinanceTreasury() {
  // Наполнение банковских остатков
  const balKzt = document.getElementById("finBalanceKztInput");
  const balUsd = document.getElementById("finBalanceUsdInput");
  if (balKzt) balKzt.value = db.settings.bankKzt || 45200000;
  if (balUsd) balUsd.value = db.settings.bankUsd || 89000;
  
  // Курсы валют
  const rateUsd = document.getElementById("finRateUsdDisplay");
  const rateRub = document.getElementById("finRateRubDisplay");
  if (rateUsd) rateUsd.innerText = (db.currencyRates?.USD || 448.50).toFixed(2);
  if (rateRub) rateRub.innerText = (db.currencyRates?.RUB || 5.12).toFixed(2);
  
  // Выданные авансы
  const advancesTbody = document.getElementById("finSupplierAdvancesTableBody");
  if (advancesTbody) {
    advancesTbody.innerHTML = db.supplierAdvances.map(a => `
      <tr>
        <td><strong>${a.supplierName}</strong></td>
        <td>${a.date}</td>
        <td><strong style="color:var(--brand-color);">${a.amount.toLocaleString()} ₸</strong></td>
        <td><span style="color:var(--text-secondary); font-size:10px;">${a.purpose}</span></td>
      </tr>
    `).join("");
  }
  
  // Налог на транспорт
  const taxTbody = document.getElementById("finTransportTaxTableBody");
  if (taxTbody) {
    const today = new Date();
    taxTbody.innerHTML = db.vehicles.filter(v => v.ownerType === "own").map(v => {
      const taxDate = new Date(v.taxDate || "2026-07-15");
      const diffTime = taxDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      let statusClass = "badge-success";
      let statusText = "Оплачен";
      if (diffDays < 0) {
        statusClass = "badge-danger";
        statusText = `Просрочен на ${Math.abs(diffDays)} дн.`;
      } else if (diffDays <= 30) {
        statusClass = "badge-warning";
        statusText = `Срок ${diffDays} дн.`;
      }
      
      return `
        <tr>
          <td><strong>${v.name}</strong></td>
          <td><code>${v.plate}</code></td>
          <td>${(v.taxCost || 95000).toLocaleString()} ₸</td>
          <td>${v.taxDate || "2026-07-15"}</td>
          <td><span class="badge ${statusClass}">${statusText}</span></td>
        </tr>
      `;
    }).join("");
  }
  
  // Кредиторка (AP)
  const apTbody = document.getElementById("finAccountsPayableTableBody");
  if (apTbody) {
    // Выведем счета из CRM или статические обязательства
    const apList = [
      { id: "ap_1", supplierName: "ТОО «Каспий Спец Техника»", purpose: "Аренда крана за май", amount: 2450000, dueDate: "2026-06-25", paid: false },
      { id: "ap_2", supplierName: "ТОО «Борусан Машинери»", purpose: "Гидроцилиндр CAT 320", amount: 1800000, dueDate: "2026-06-30", paid: false },
      { id: "ap_3", supplierName: "ТОО «Helios OIL»", purpose: "Заправка дизельного топлива", amount: 3500000, dueDate: "2026-06-20", paid: true }
    ];
    
    apTbody.innerHTML = apList.map(item => {
      return `
        <tr>
          <td><strong>${item.supplierName}</strong></td>
          <td>${item.purpose}</td>
          <td><strong>${item.amount.toLocaleString()} ₸</strong></td>
          <td>${item.dueDate}</td>
          <td>
            ${item.paid 
              ? `<span class="badge badge-success">Оплачено</span>` 
              : `<button class="btn-hold-confirm btn-primary" style="font-size:10px; padding:4px 8px; background:var(--brand-color); border:none;" data-action="payAp" data-id="${item.id}" data-amount="${item.amount}">
                  <span class="hold-progress"></span>
                  <span>Удерживать для оплаты</span>
                 </button>`
            }
          </td>
        </tr>
      `;
    }).join("");
  }
  
  // Дебиторка (AR)
  const arTbody = document.getElementById("finAccountsReceivableTableBody");
  if (arTbody) {
    // Получаем список дебиторки
    arTbody.innerHTML = db.debtors.map(d => {
      let warningText = "Уведомление не отправлено";
      let warningClass = "badge-neutral";
      
      if (d.paymentStageDays === 1) {
        warningText = "⚠️ 1-е Предупреждение";
        warningClass = "badge-warning";
      } else if (d.paymentStageDays === 2) {
        warningText = "🔥 2-е Предупреждение";
        warningClass = "badge-warning";
      } else if (d.paymentStageDays >= 3) {
        warningText = "🚨 БЛОКИРОВКА / СУД";
        warningClass = "badge-danger";
      }
      
      return `
        <tr>
          <td><strong>${d.companyName}</strong></td>
          <td><strong style="color:var(--status-danger);">${d.debtAmount.toLocaleString()} ₸</strong></td>
          <td><span style="color:var(--status-danger); font-weight:700;">${d.delayDays} дн.</span></td>
          <td><span class="badge ${warningClass}">${warningText}</span></td>
          <td>
            <button class="btn-secondary" style="font-size:10px; padding:4px 8px;" onclick="sendDebtReminder('${d.id}', '${d.companyName}', ${d.debtAmount}, ${d.paymentStageDays || 0})">
              Напомнить
            </button>
          </td>
        </tr>
      `;
    }).join("");
  }
  
  initHoldToConfirmButtons();
}

function updateFinanceBalancesState() {
  const balKzt = parseInt(document.getElementById("finBalanceKztInput").value) || 0;
  const balUsd = parseInt(document.getElementById("finBalanceUsdInput").value) || 0;
  db.settings.bankKzt = balKzt;
  db.settings.bankUsd = balUsd;
  saveState();
  showSystemNotification("Остатки на банковских счетах обновлены.");
}

function sendDebtReminder(id, name, amount, currentLevel) {
  const debtor = db.debtors.find(x => x.id === id);
  if (!debtor) return;
  
  const nextLevel = currentLevel + 1;
  debtor.paymentStageDays = nextLevel;
  saveState();
  
  let msg = "";
  if (nextLevel === 1) {
    msg = `Клиенту "${name}" отправлено Первое предупреждение по задолженности в размере ${amount.toLocaleString()} ₸. Ссылка отправлена по Email.`;
  } else if (nextLevel === 2) {
    msg = `Клиенту "${name}" отправлено Второе досудебное предупреждение. Отправлено SMS логисту клиента.`;
  } else {
    msg = `Критический уровень! Клиент "${name}" заблокирован. Выписан судебный иск и предписание по ограничению выезда техники на объекты!`;
  }
  
  alert(msg);
  renderFinanceTreasury();
  showSystemNotification(`Уровень предупреждения должника ${name} повышен до ${nextLevel}.`);
}

// ----------------------------------------------------
// ТАКТИЛЬНАЯ ЗАЩИТА: HOLD-TO-CONFIRM И DOUBLE-CHECK
// ----------------------------------------------------

function initHoldToConfirmButtons() {
  const buttons = document.querySelectorAll(".btn-hold-confirm");
  buttons.forEach(btn => {
    if (btn.holdHandlersRegistered) return;
    
    let timer = null;
    
    const startHold = (e) => {
      e.preventDefault();
      btn.classList.add("holding");
      
      timer = setTimeout(() => {
        btn.classList.remove("holding");
        // Выполняем экшен
        executeHoldAction(btn);
      }, 1200); // 1.2 секунды удержания
    };
    
    const cancelHold = () => {
      btn.classList.remove("holding");
      if (timer) clearTimeout(timer);
    };
    
    btn.addEventListener("mousedown", startHold);
    btn.addEventListener("mouseup", cancelHold);
    btn.addEventListener("mouseleave", cancelHold);
    
    btn.addEventListener("touchstart", startHold);
    btn.addEventListener("touchend", cancelHold);
    
    btn.holdHandlersRegistered = true;
  });
}

function executeHoldAction(btn) {
  const action = btn.dataset.action;
  if (action === "payAp") {
    const id = btn.dataset.id;
    const amount = parseInt(btn.dataset.amount) || 0;
    
    // Снимаем деньги со счета KZT
    const balance = db.settings.bankKzt || 45200000;
    if (balance < amount) {
      alert("Недостаточно средств на счете Halyk Bank для проведения платежа!");
      showSystemNotification("Ошибка оплаты: недостаточно средств.");
      return;
    }
    
    db.settings.bankKzt = balance - amount;
    saveState();
    
    alert(`✓ Успешный платеж!\r\nСчет на сумму ${amount.toLocaleString()} ₸ оплачен со счета Halyk Bank.\r\nТранзакция TX-PAY-${Math.floor(Math.random()*90000+10000)} проведена.`);
    renderFinanceTreasury();
    showSystemNotification(`Счет поставщика успешно оплачен: -${amount.toLocaleString()} ₸`);
  } else if (action === "resetDemo") {
    resetDemoData();
  } else if (action === "clearCache") {
    clearSystemCache();
  } else if (action === "materialWriteOff") {
    submitAddMaterialLog();
  }
}

// Повторное оборачивание рендера для тактильных эффектов и декорации
const originalRenderAll = renderAll;
renderAll = function() {
  originalRenderAll();
  initHoldToConfirmButtons();
  applyPremiumStylesAndDecorators();
};

function updateMaterialSubmitButton() {
  const typeEl = document.getElementById("mwoType");
  const type = typeEl ? typeEl.value : "Приход";
  const btn = document.getElementById("mwoSubmitBtn");
  if (!btn) return;
  
  if (type === "Списание") {
    btn.className = "btn-hold-confirm btn-primary";
    btn.dataset.action = "materialWriteOff";
    btn.removeAttribute("onclick");
    btn.innerHTML = `<span class="hold-progress"></span><span>Зафиксировать списание (Удерживать)</span>`;
    btn.holdHandlersRegistered = false;
    initHoldToConfirmButtons();
  } else {
    btn.className = "btn-primary";
    delete btn.dataset.action;
    btn.setAttribute("onclick", "submitAddMaterialLog()");
    btn.innerHTML = `Зафиксировать`;
  }
}

function triggerDoubleCheck(btn, callback) {
  if (btn.classList.contains("btn-double-confirm-pending")) {
    // Second click: execute action
    if (btn.doubleCheckTimeout) {
      clearTimeout(btn.doubleCheckTimeout);
      btn.doubleCheckTimeout = null;
    }
    resetDoubleCheckButton(btn);
    if (typeof callback === "function") {
      callback();
    }
  } else {
    // First click: prompt double check
    btn.classList.add("btn-double-confirm-pending");
    btn.dataset.originalHtml = btn.innerHTML;
    btn.innerHTML = "Подтвердите нажатие";
    
    btn.doubleCheckTimeout = setTimeout(() => {
      resetDoubleCheckButton(btn);
    }, 3000);
  }
}

function resetDoubleCheckButton(btn) {
  if (btn.classList.contains("btn-double-confirm-pending")) {
    btn.classList.remove("btn-double-confirm-pending");
    if (btn.dataset.originalHtml) {
      btn.innerHTML = btn.dataset.originalHtml;
      delete btn.dataset.originalHtml;
    }
    if (btn.doubleCheckTimeout) {
      clearTimeout(btn.doubleCheckTimeout);
      btn.doubleCheckTimeout = null;
    }
  }
}

function applyPremiumStylesAndDecorators() {
  // 1. Декорируем кнопки закрытия модальных окон
  document.querySelectorAll(".modal-close-btn").forEach(btn => {
    if (btn.innerHTML.trim() === "×" || btn.innerHTML.trim() === "&times;") {
      btn.innerHTML = `<svg viewBox="0 0 24 24" style="fill: none; stroke: currentColor; stroke-width: 2.2; stroke-linecap: round; stroke-linejoin: round; width: 12px; height: 12px; display: block;"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>`;
    }
  });

  // 2. Декорируем кнопки в футерах модальных окон (добавляем иконки)
  const iconMap = {
    "сохранить": `<svg viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: currentColor; stroke-width: 2.2; fill: none; margin-right: 6px;"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>`,
    "создать": `<svg viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: currentColor; stroke-width: 2.2; fill: none; margin-right: 6px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    "зафиксировать": `<svg viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: currentColor; stroke-width: 2.2; fill: none; margin-right: 6px;"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
    "добавить": `<svg viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: currentColor; stroke-width: 2.2; fill: none; margin-right: 6px;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>`,
    "удалить": `<svg viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: var(--status-danger); stroke-width: 2.2; fill: none; margin-right: 6px;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>`,
    "провести": `<svg viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: currentColor; stroke-width: 2.2; fill: none; margin-right: 6px;"><rect x="2" y="5" width="20" height="14" rx="2" ry="2"></rect><line x1="2" y1="10" x2="22" y2="10"></line></svg>`,
    "отправить": `<svg viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: currentColor; stroke-width: 2.2; fill: none; margin-right: 6px;"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>`,
    "печать": `<svg viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: currentColor; stroke-width: 2.2; fill: none; margin-right: 6px;"><polyline points="6 9 6 2 18 2 18 9"></polyline><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path><rect x="6" y="14" width="12" height="8"></rect></svg>`,
    "выполнить": `<svg viewBox="0 0 24 24" style="width: 13px; height: 13px; stroke: currentColor; stroke-width: 2.2; fill: none; margin-right: 6px;"><polyline points="22 11.08 20 12 12 12 12 3 12.92 3.75"></polyline><path d="M22 4L12 14.01l-3-3"></path></svg>`
  };

  document.querySelectorAll(".modal-footer button, .modal-footer .btn-primary, .modal-footer .btn-secondary").forEach(btn => {
    if (btn.classList.contains("modal-close-btn")) return;
    if (btn.querySelector("svg") || btn.querySelector(".hold-progress")) return;

    const txt = btn.textContent.trim().toLowerCase();
    for (let key in iconMap) {
      if (txt.includes(key)) {
        btn.innerHTML = iconMap[key] + `<span>${btn.textContent.trim()}</span>`;
        break;
      }
    }
  });

  // 3. Сканируем и декорируем все остальные обычные кнопки с текстовыми иконками/эмодзи
  const appIconPatterns = [
    { char: "+", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>` },
    { char: "⚠", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:var(--status-danger); stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>` },
    { char: "📥", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>` },
    { char: "📤", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>` },
    { char: "🔎", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>` },
    { char: "🔍", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>` },
    { char: "🗑️", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:var(--status-danger); stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>` },
    { char: "🗑", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:var(--status-danger); stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>` },
    { char: "⚙️", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>` },
    { char: "⚙", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><circle cx="12" cy="12" r="3"></circle><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"></path></svg>` },
    { char: "↩", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><polyline points="9 14 4 9 9 4"></polyline><path d="M20 20v-7a4 4 0 0 0-4-4H4"></path></svg>` },
    { char: "✓", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><polyline points="20 6 9 17 4 12"></polyline></svg>` },
    { char: "→", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></svg>` },
    { char: "🔄", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><polyline points="23 4 23 10 17 10"></polyline><polyline points="1 20 1 14 7 14"></polyline><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"></path></svg>` },
    { char: "💸", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><line x1="12" y1="1" x2="12" y2="23"></line><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"></path></svg>` },
    { char: "📝", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 1 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>` },
    { char: "📊", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><line x1="18" y1="20" x2="18" y2="10"></line><line x1="12" y1="20" x2="12" y2="4"></line><line x1="6" y1="20" x2="6" y2="14"></line></svg>` },
    { char: "📄", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>` },
    { char: "📦", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><polyline points="21 8 21 21 3 21 3 8"></polyline><rect x="1" y="3" width="22" height="5" rx="1"></rect><line x1="10" y1="12" x2="14" y2="12"></line></svg>` },
    { char: "🔧", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>` },
    { char: "🚜", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><circle cx="7.5" cy="17.5" r="2.5"></circle><circle cx="18.5" cy="15.5" r="4.5"></circle><path d="M14 9V5a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v6h12a2 2 0 0 0 2-2zM8 11h4M18.5 11h-3M6 5h4"></path></svg>` },
    { char: "🛡️", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>` },
    { char: "🛡", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>` },
    { char: "▶", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:currentColor; margin-right:6px; vertical-align:middle;"><polygon points="5 3 19 12 5 21 5 3"></polygon></svg>` },
    { char: "⏳", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>` },
    { char: "✅", svg: `<svg viewBox="0 0 24 24" style="width:13px; height:13px; stroke:currentColor; stroke-width:2.2; fill:none; margin-right:6px; vertical-align:middle;"><polyline points="9 11 12 14 22 4"></polyline><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"></path></svg>` }
  ];

  document.querySelectorAll("button, .btn-primary, .btn-secondary").forEach(btn => {
    if (btn.classList.contains("modal-close-btn")) return;
    if (btn.querySelector("svg") || btn.querySelector(".hold-progress")) return;

    let content = btn.innerHTML.trim();
    for (let item of appIconPatterns) {
      if (content.startsWith(item.char)) {
        const rest = content.substring(item.char.length).trim();
        btn.innerHTML = item.svg + `<span>${rest}</span>`;
        break;
      }
    }
  });
}


