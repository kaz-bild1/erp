// Основной файл логики ERP ТОО KazBildInvest

// Инициализация данных
let db = JSON.parse(localStorage.getItem("kaz_bild_invest_db")) || initialData;

// Глобальные переменные симулятора
let gpsInterval = null;
let isGpsSimulating = true;
let currentWhLevel = 'central';
let currentGanttView = 'days'; // days / hours

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
  
  // Инициализация Leaflet карты
  initMap();
  
  // Запуск GPS-симуляции
  startGpsSimulation();
  
  // Инициализация канваса для подписи на телефоне машиниста
  initSignaturePad();
  
  // Применение ролевой модели
  applyRolePermissions();
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
  
  // Обновление заголовка
  const titles = {
    dashboard: "Дашборд и Аналитика",
    crm: "CRM и Продажи",
    dispatch: "Диспетчеризация и Расписание",
    gps: "GPS-Мониторинг парка",
    fuel: "Учет ГСМ и «Умный ГСМ»",
    warehouse: "Склад и Цепочки Логистики",
    repairs: "Ремонты и ТО спецтехники",
    hr: "HR-Модуль и Допуски",
    directories: "Справочники контрагентов",
    settings: "Настройки ERP"
  };
  document.getElementById("pageTitleDisplay").innerText = titles[tabId] || "Панель управления";
  
  // Обновление специфических элементов табов
  if (tabId === 'gps') {
    setTimeout(() => { if (window.map) window.map.invalidateSize(); }, 200);
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
      // Только Склад, Логистика, Справочники
      if (!clickAttr.includes("warehouse") && !clickAttr.includes("directories")) {
        item.style.display = "none";
      }
    } else if (role === "Mechanic") {
      // Ремонты, ТО, Склад, Справочники
      if (!clickAttr.includes("repairs") && !clickAttr.includes("warehouse") && !clickAttr.includes("directories")) {
        item.style.display = "none";
      }
    } else if (role === "HR") {
      // Только HR, Документы, Настройки
      if (!clickAttr.includes("hr") && !clickAttr.includes("settings")) {
        item.style.display = "none";
      }
    } else if (role === "Dispatcher") {
      // Только CRM, Диспетчеризация, GPS, ГСМ
      if (!clickAttr.includes("crm") && !clickAttr.includes("dispatch") && !clickAttr.includes("gps") && !clickAttr.includes("fuel")) {
        item.style.display = "none";
      }
    } else if (role === "Purchaser") {
      // Только Склад, Логистика, Справочники
      if (!clickAttr.includes("warehouse") && !clickAttr.includes("directories")) {
        item.style.display = "none";
      }
    }
  });

  // Автоматический редирект на разрешенную вкладку, если текущая скрыта
  const activePane = document.querySelector(".tab-pane.active");
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

// ----------------------------------------------------
// МОДУЛЬ 1: CRM, ГАНТ И КОНФЛИКТЫ
// ----------------------------------------------------

// Рендеринг Канбана CRM
function renderCrmKanban() {
  const kanban = document.getElementById("kanbanBoard");
  if (!kanban) return;
  kanban.innerHTML = "";
  
  const stages = [
    { id: "Лид", name: "Запросы / Лиды" },
    { id: "КП", name: "Формирование КП" },
    { id: "Договор", name: "Согласование и Договор" },
    { id: "Назначение", name: "Назначение техники" },
    { id: "Выполнение работ", name: "Выполнение работ" },
    { id: "Закрытие заказа", name: "АВР и Закрытие" },
    { id: "Оплата", name: "Оплата / Счета" }
  ];
  
  stages.forEach(stage => {
    const col = document.createElement("div");
    col.className = "col-2 card";
    col.style.padding = "12px";
    col.style.minHeight = "400px";
    col.style.backgroundColor = "var(--bg-secondary)";
    
    col.innerHTML = `
      <div style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: var(--text-secondary); margin-bottom: 12px; display: flex; justify-content: space-between;">
        <span>${stage.name}</span>
        <span class="badge badge-neutral" style="padding: 2px 6px;">${db.deals.filter(d => d.stage === stage.id).length}</span>
      </div>
      <div class="kanban-cards-wrapper" style="display: flex; flex-direction: column; gap: 10px;" id="stage-${stage.id}"></div>
    `;
    
    kanban.appendChild(col);
    
    const wrapper = col.querySelector(".kanban-cards-wrapper");
    db.deals.filter(d => d.stage === stage.id).forEach(deal => {
      const card = document.createElement("div");
      card.className = "card";
      card.style.padding = "12px";
      card.style.marginBottom = "0";
      card.style.cursor = "pointer";
      
      const site = db.sites.find(s => s.id === deal.siteId);
      const siteName = site ? site.name : "Неизвестно";
      
      card.innerHTML = `
        <div style="font-weight: 600; font-size: 13px;">${deal.companyName}</div>
        <div style="font-size: 11px; color: var(--text-secondary); margin-top: 4px;">Объект: ${siteName}</div>
        <div style="font-size: 11px; color: var(--text-secondary);">Сроки: ${deal.startDate} - ${deal.endDate}</div>
        <div style="margin-top: 8px; display: flex; justify-content: space-between; align-items: center;">
          <span style="font-weight: 700; font-size: 12px;">${deal.price.toLocaleString()} ₸</span>
          <span class="badge ${deal.contractSigned ? 'badge-success' : 'badge-danger'}" style="font-size: 8px; padding: 2px 4px;">
            ${deal.contractSigned ? 'Договор подписан' : 'Без договора'}
          </span>
        </div>
      `;
      
      card.onclick = () => openDealDetails(deal.id);
      wrapper.appendChild(card);
    });
  });
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
      <div class="pnl-row"><span>Договор:</span><strong>${deal.contractNumber || 'Не присвоен'} (${deal.contractSigned ? 'Подписан' : 'Не подписан'})</strong></div>
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
  
  // Светлый слой по умолчанию
  window.lightTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
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
    
    // Цвет маркера
    let color = 'blue';
    if (v.ownerType === 'subrent') color = 'purple';
    if (v.status === 'На ремонте' || v.status === 'Неисправна') color = 'red';
    
    const customIcon = L.divIcon({
      className: 'custom-div-icon',
      html: `<div style="background-color:${color}; width:12px; height:12px; border-radius:50%; border:2px solid #FFF; box-shadow:0 0 4px rgba(0,0,0,0.4);"></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6]
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
  renderDriverDropdowns();
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
    msg.className = `chat-message ${log.sender === 'System' ? 'system' : 'user'}`;
    
    msg.innerHTML = `
      <div style="font-weight:700; font-size:10px; margin-bottom:4px; text-transform:uppercase;">${log.sender}</div>
      <div>${log.message}</div>
      <div class="chat-message-time">${log.time}</div>
    `;
    container.appendChild(msg);
  });
  
  container.scrollTop = container.scrollHeight;
}

function sendChatMessage() {
  const input = document.getElementById("chatInputField");
  const text = input.value.trim();
  if (!text) return;
  
  // Добавляем сообщение пользователя
  const time = new Date().toTimeString().split(' ')[0].substring(0, 5);
  db.chatLog.push({ sender: "Менеджер", time: time, message: text });
  input.value = "";
  renderChatHistory();
  
  // ИИ-парсинг сообщения
  // Шаблон: @bot Штраф ТБ. Водитель Сериков А. на объекте Карабатан-2 отстранен по алкоголю, штраф 200000
  if (text.includes("@bot") && text.toLowerCase().includes("штраф")) {
    setTimeout(() => {
      // Ищем имя водителя
      const driverMatch = text.match(/Водитель\s+([A-Яa-яa-z]+\s+[A-Яa-яa-z]\.)/i);
      const siteMatch = text.match(/объекте\s+([A-Яa-я0-9\-\sА-я]+)\s+отстранен/i);
      const fineMatch = text.match(/штраф\s+(\d+)/i);
      
      const driverName = driverMatch ? driverMatch[1] : "Сериков А.";
      const siteName = siteMatch ? siteMatch[1].trim() : "Карабатан";
      const fineAmount = fineMatch ? parseInt(fineMatch[1]) : 200000;
      
      // Находим водителя
      const driver = db.drivers.find(d => d.name.includes(driverName.substring(0, 7)));
      
      if (driver) {
        // Добавляем удержание
        driver.finesThisMonth += fineAmount;
        
        // Вносим запись в лог удержаний
        db.payrollDeductions.push({
          id: "pd_" + (db.payrollDeductions.length + 1),
          driverId: driver.id,
          type: "Штраф ТБ (Алкоголь)",
          amount: fineAmount,
          date: "2026-06-18",
          reference: `AI Messenger: ${text}`,
          approved: true
        });
        
        // Срываем смену в CRM для этого объекта
        const deal = db.deals.find(d => d.siteId.includes("karabatan") && d.stage === "Выполнение работ");
        if (deal) {
          deal.stage = "Закрытие заказа";
          deal.jobType = "СОРВАНА СМЕНА (Нарушение водителя)";
        }
        
        saveState();
        
        db.chatLog.push({
          sender: "System",
          time: time,
          message: `🤖 ИИ-Ассистент: Запрос верифицирован директоратом!\n- Водитель: ${driver.name}\n- Нарушение: Алкоголь на объекте ${siteName}\n- Сумма штрафа: ${fineAmount.toLocaleString()} KZT списана с баланса водителя.\n- Смена на объекте переведена в аварийный статус.`
        });
        
        renderChatHistory();
        renderEmployeesTable();
        renderCrmKanban();
        renderObjectsPnl();
      } else {
        db.chatLog.push({
          sender: "System",
          time: time,
          message: `🤖 ИИ-Ассистент: Ошибка! Водитель "${driverName}" не найден в базе данных ERP.`
        });
        renderChatHistory();
      }
    }, 1200);
  }
}


// ----------------------------------------------------
// МОДУЛЬ 10: ЭМУЛЯТОР СМАРТФОНА МАШИНИСТА
// ----------------------------------------------------

function togglePhoneSimulator() {
  const wrapper = document.getElementById("phoneSimulatorWrapper");
  const isHidden = wrapper.style.display === "none";
  wrapper.style.display = isHidden ? "flex" : "none";
  
  if (isHidden) {
    renderDriverPhoneScreen();
  }
}

// Рендеринг экрана водителя
function renderDriverPhoneScreen() {
  const select = document.getElementById("phoneDriverSelect");
  
  // Заполняем выпадающий список водителей (если пуст)
  if (select.children.length === 0) {
    db.drivers.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.innerText = `${d.name} (${d.position})`;
      select.appendChild(opt);
    });
  }
  
  updateDriverPhoneScreen();
}

function updateDriverPhoneScreen() {
  const dId = document.getElementById("phoneDriverSelect").value;
  const d = db.drivers.find(x => x.id === dId);
  if (!d) return;
  
  const shiftDetails = document.getElementById("phoneShiftDetails");
  
  // Находим спецтехнику водителя
  const v = db.vehicles.find(x => x.driverId === d.id);
  const site = v ? db.sites.find(s => s.id === v.currentSiteId) : null;
  
  shiftDetails.innerHTML = `
    <div style="margin-bottom:8px;">Водитель: <strong>${d.name}</strong></div>
    <div>Машина: <strong>${v ? v.name : 'Не привязана'}</strong></div>
    <div>Госномер: <strong>${v ? v.plate : '-'}</strong></div>
    <div>Объект: <strong>${site ? site.name : '-'}</strong></div>
    <div>Смен отработано: <strong>${d.shiftsWorked}</strong></div>
  `;
  
  // Отображаем кнопку Начать/Завершить смену
  const startBtn = document.getElementById("phoneShiftStartBtn");
  const endBtn = document.getElementById("phoneShiftEndBtn");
  
  if (v && v.status === "Работает") {
    startBtn.style.display = "none";
    endBtn.style.display = "block";
  } else {
    startBtn.style.display = "block";
    endBtn.style.display = "none";
  }
}

function phoneStartShift() {
  const dId = document.getElementById("phoneDriverSelect").value;
  const d = db.drivers.find(x => x.id === dId);
  const v = db.vehicles.find(x => x.driverId === dId);
  
  if (d.isBlocked) {
    alert("Допуск заблокирован! Проверьте корочки ТБ или медосмотр в HR-модуле.");
    return;
  }
  
  if (v) {
    v.status = "Работает";
    saveState();
    updateDriverPhoneScreen();
    renderGanttChart();
    showSystemNotification(`Водитель ${d.name} запустил смену на технике ${v.invNumber}`);
  }
}

function phoneEndShift() {
  const dId = document.getElementById("phoneDriverSelect").value;
  const d = db.drivers.find(x => x.id === dId);
  const v = db.vehicles.find(x => x.driverId === dId);
  
  if (v) {
    v.status = "Свободна";
    d.shiftsWorked++;
    saveState();
    updateDriverPhoneScreen();
    renderGanttChart();
    renderEmployeesTable();
    showSystemNotification(`Водитель ${d.name} успешно закрыл смену!`);
  }
}

function phoneRequestFuel() {
  const dId = document.getElementById("phoneDriverSelect").value;
  const v = db.vehicles.find(x => x.driverId === dId);
  const liters = parseInt(document.getElementById("phoneFuelLiters").value) || 0;
  
  if (liters <= 0) {
    alert("Введите количество литров!");
    return;
  }
  
  if (v) {
    // Вносим лог
    const log = {
      id: "fl_" + (db.fuelLogs.length + 1),
      date: new Date().toISOString().split('T')[0],
      time: new Date().toTimeString().split(' ')[0].substring(0, 5),
      vehicleId: v.id,
      driverId: dId,
      fuelType: "Дизель",
      liters: liters,
      cost: liters * 295,
      fuelCard: "CARD-USER",
      approved: true
    };
    db.fuelLogs.push(log);
    saveState();
    
    renderFuelTable();
    document.getElementById("phoneFuelLiters").value = "";
    alert("Чек АЗС отправлен в бухгалтерию!");
  }
}

function phoneReportBreakdown() {
  const dId = document.getElementById("phoneDriverSelect").value;
  const v = db.vehicles.find(x => x.driverId === dId);
  const desc = document.getElementById("phoneBreakdownDesc").value;
  
  if (!desc) {
    alert("Опишите неисправность!");
    return;
  }
  
  if (v) {
    const newRep = {
      id: "rep_" + (db.repairs.length + 1),
      vehicleId: v.id,
      siteId: v.currentSiteId,
      driverId: dId,
      description: desc,
      status: "Диагностика",
      createdAt: new Date().toISOString().split('T')[0],
      faultByDriver: false,
      damageCost: 0,
      partsRequested: [],
      laborCost: 10000
    };
    
    v.status = "На ремонте";
    db.repairs.push(newRep);
    saveState();
    
    renderRepairsTable();
    renderGanttChart();
    document.getElementById("phoneBreakdownDesc").value = "";
    alert("Заявка о поломке отправлена диспетчеру и механику!");
  }
}

// Сенсорный/мышиный канвас подписи АВР
function initSignaturePad() {
  const canvas = document.getElementById("phoneSignatureCanvas");
  if (!canvas) return;
  
  const ctx = canvas.getContext("2d");
  ctx.strokeStyle = "#000";
  ctx.lineWidth = 2;
  
  let drawing = false;
  
  canvas.addEventListener("mousedown", () => drawing = true);
  canvas.addEventListener("mouseup", () => {
    drawing = false;
    ctx.beginPath();
  });
  
  canvas.addEventListener("mousemove", (e) => {
    if (!drawing) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(x, y);
  });
}

function phoneSubmitSignature() {
  const dId = document.getElementById("phoneDriverSelect").value;
  const d = db.drivers.find(x => x.id === dId);
  
  // Находим активную сделку на объекте этого водителя
  const v = db.vehicles.find(x => x.driverId === dId);
  if (v) {
    const deal = db.deals.find(deal => deal.vehicleIds.includes(v.id) && deal.stage === "Выполнение работ");
    if (deal) {
      deal.stage = "Закрытие заказа";
      saveState();
      renderCrmKanban();
      alert("Акт выполненных работ успешно подписан с мобильного телефона заказчиком!");
      
      // Очистка подписи
      const canvas = document.getElementById("phoneSignatureCanvas");
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      return;
    }
  }
  alert("Нет активной смены с незакрытыми АВР для данного оператора!");
}


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
  
  db.drivers.forEach(d => {
    // В субаренде оклад и расчет ЗП не производятся (они идут подрядчикам)
    if (d.baseSalary === 0) {
      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td><strong>${d.name}</strong><br><span style="font-size:10px;color:var(--text-secondary);">${d.position}</span></td>
        <td colspan="7" style="text-align:center; color:var(--text-secondary); font-style:italic;">Субаренда (Выплата партнеру по акту)</td>
      `;
      tbody.appendChild(tr);
      return;
    }

    // Доход = оклад + бонусы за смены (по 10,000 ₸ за смену)
    const shiftBonus = d.shiftsWorked * 10000;
    const grossEarnings = d.baseSalary + shiftBonus;
    
    // Все удержания по логам
    const totalDeductions = d.fuelDeduction + d.finesThisMonth + d.activeDebt;
    
    // Лимит по Трудовому Кодексу РК (не более 50% от дохода за один раз)
    const maxDeductionAllowed = grossEarnings * 0.5;
    
    // Фактически удержано в этом месяце
    const actualDeduction = Math.min(totalDeductions, maxDeductionAllowed);
    
    // Остаток долга, переносимый на следующий месяц
    const rolloverDebt = totalDeductions - actualDeduction;
    
    // Выплата на руки
    const netPayout = grossEarnings - actualDeduction;
    
    // Записываем перенесенный долг обратно в базу данных водителя
    d.activeDebt = rolloverDebt;
    
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><strong>${d.name}</strong><br><span style="font-size:10px;color:var(--text-secondary);">${d.position}</span></td>
      <td><strong>${grossEarnings.toLocaleString()} ₸</strong><br><span style="font-size:9px;color:var(--text-secondary);">Оклад: ${d.baseSalary.toLocaleString()} | Бонус: ${shiftBonus.toLocaleString()}</span></td>
      <td style="color:${d.fuelDeduction > 0 ? 'var(--status-danger)' : 'inherit'};">${d.fuelDeduction.toLocaleString()} ₸</td>
      <td style="color:${d.finesThisMonth > 0 ? 'var(--status-danger)' : 'inherit'};">${d.finesThisMonth.toLocaleString()} ₸</td>
      <td><strong>${totalDeductions.toLocaleString()} ₸</strong></td>
      <td>${maxDeductionAllowed.toLocaleString()} ₸</td>
      <td style="font-weight:700; color:var(--status-success);">${netPayout.toLocaleString()} ₸</td>
      <td style="font-weight:600; color:${rolloverDebt > 0 ? 'var(--status-warning)' : 'inherit'};">${rolloverDebt.toLocaleString()} ₸</td>
    `;
    tbody.appendChild(tr);
  });
}


// ----------------------------------------------------
// ВСПОМОГАТЕЛЬНЫЕ РЕНДЕР-ФУНКЦИИ И СПРАВОЧНИКИ
// ----------------------------------------------------

function renderDirectories() {
  const suppliers = document.getElementById("dirSuppliersList");
  if (suppliers) {
    suppliers.innerHTML = db.directories.suppliers.map(s => `
      <li style="border-bottom: 1px dashed var(--border-color); padding-bottom: 8px;">
        <strong>${s.name}</strong><br>
        <span style="font-size:11px;color:var(--text-secondary);">${s.contact}</span><br>
        <span style="font-size:12px;">${s.details}</span>
      </li>
    `).join("");
  }
  
  const contractors = document.getElementById("dirContractorsList");
  if (contractors) {
    contractors.innerHTML = db.directories.contractors.map(c => `
      <li style="border-bottom: 1px dashed var(--border-color); padding-bottom: 8px;">
        <strong>${c.name}</strong><br>
        <span style="font-size:11px;color:var(--text-secondary);">${c.contact}</span><br>
        <span style="font-size:12px;">${c.details}</span>
      </li>
    `).join("");
  }
  
  const insurers = document.getElementById("dirInsurersList");
  if (insurers) {
    insurers.innerHTML = db.directories.insurers.map(i => `
      <li style="border-bottom: 1px dashed var(--border-color); padding-bottom: 8px;">
        <strong>${i.name}</strong><br>
        <span style="font-size:11px;color:var(--text-secondary);">${i.contact}</span><br>
        <span style="font-size:12px;">${i.details}</span>
      </li>
    `).join("");
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

function showSystemNotification(msg) {
  // Удобный toast/алерт для информирования пользователя без блокирования (UX!)
  const toast = document.createElement("div");
  toast.style.position = "fixed";
  toast.style.bottom = "24px";
  toast.style.right = "24px";
  toast.style.backgroundColor = "var(--brand-color)";
  toast.style.color = "#FFFFFF";
  toast.style.padding = "14px 20px";
  toast.style.borderRadius = "8px";
  toast.style.boxShadow = "var(--shadow)";
  toast.style.zIndex = "10000";
  toast.style.fontSize = "13px";
  toast.style.fontWeight = "500";
  toast.style.pointerEvents = "none";
  toast.style.transition = "opacity 0.3s ease";
  
  toast.innerText = msg;
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.opacity = "0";
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// Управление модальными окнами
function openModal(id) {
  document.getElementById(id).classList.add("active");
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
  
  // Обновляем плитку на карте Leaflet
  if (window.map) {
    if (next === 'dark') {
      window.lightTiles.remove();
      window.darkTiles = L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; CartoDB'
      }).addTo(window.map);
    } else {
      if (window.darkTiles) window.darkTiles.remove();
      window.lightTiles.addTo(window.map);
    }
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
  renderDirectories();
  renderMovesHistoryTable();
  renderFormSelectors();
  renderObjectsPnl();
  renderFleetRoiTable();
  calculateMonthlyPayroll();
  renderGpsVehicleList();
  renderLodgingTable();
  renderLodgingStats();
}

function renderDriverDropdowns() {
  const select = document.getElementById("phoneDriverSelect");
  if (select) {
    select.innerHTML = "";
    db.drivers.forEach(d => {
      const opt = document.createElement("option");
      opt.value = d.id;
      opt.innerText = `${d.name} (${d.position})`;
      select.appendChild(opt);
    });
  }
}
