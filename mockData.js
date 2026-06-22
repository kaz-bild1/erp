// База данных в памяти для ТОО KazBildInvest
const initialData = {
  settings: {
    companyName: "ТОО KazBildInvest",
    activeRole: "Director" // По умолчанию: Директор
  },
  
  // 6 объектов
  sites: [
    {
      id: "karabatan",
      name: "Карабатан",
      customer: "NCOC (North Caspian Operating Company)",
      manager: "Аманжолов Б.",
      startDate: "2026-01-10",
      endDate: "2026-12-31",
      lat: 47.162,
      lng: 53.112,
      polygon: [
        [47.180, 53.080],
        [47.180, 53.150],
        [47.140, 53.150],
        [47.140, 53.080]
      ]
    },
    {
      id: "karabatan2",
      name: "Карабатан-2 (Ак Патер)",
      customer: "KPI Inc. (Казахстан Petrochemical Industries)",
      manager: "Каримов Р.",
      startDate: "2026-03-01",
      endDate: "2026-11-30",
      lat: 47.195,
      lng: 53.145,
      polygon: [
        [47.210, 53.120],
        [47.210, 53.170],
        [47.180, 53.170],
        [47.180, 53.120]
      ]
    },
    {
      id: "makat",
      name: "Макат",
      customer: "РД Казмунайгаз",
      manager: "Искаков Т.",
      startDate: "2025-08-15",
      endDate: "2026-10-15",
      lat: 47.642,
      lng: 53.864,
      polygon: [
        [47.660, 53.830],
        [47.660, 53.900],
        [47.620, 53.900],
        [47.620, 53.830]
      ]
    },
    {
      id: "inder",
      name: "Индер",
      customer: "ИндерБораты",
      manager: "Сабитов А.",
      startDate: "2026-02-20",
      endDate: "2026-09-20",
      lat: 48.552,
      lng: 51.785,
      polygon: [
        [48.570, 51.750],
        [48.570, 51.820],
        [48.530, 51.820],
        [48.530, 51.750]
      ]
    },
    {
      id: "zhangala",
      name: "Жангала",
      customer: "КазТрансОйл",
      manager: "Муратов Д.",
      startDate: "2026-04-01",
      endDate: "2026-12-15",
      lat: 48.012,
      lng: 50.254,
      polygon: [
        [48.030, 50.220],
        [48.030, 50.290],
        [47.990, 50.290],
        [47.990, 50.220]
      ]
    }
  ],

  // 24 единицы техники (собственная + субаренда)
  vehicles: [
    {
      id: "v101",
      name: "Автокран Zoomlion 25t",
      model: "ZTC250V",
      plate: "714 ADE 06",
      vin: "ZTC250V89012345",
      techPassport: "АВ 3841927",
      invNumber: "KBI-AC-01",
      year: 2022,
      type: "Автокран",
      ownerType: "own", // own = собственная
      driverId: "d101",
      status: "Работает", // Свободна, В пути, Работает, На ТО, На ремонте, Неисправна
      currentSiteId: "karabatan",
      mileage: 42100,
      engineHours: 3240,
      fuelRate: 12.5, // Норма расхода топлива (л/моточас)
      ptoDate: "2026-08-12", // ПТО
      ctoDate: "2026-08-12", // ЧТО
      insuranceDate: "2026-12-01",
      insuranceCost: 180000,
      insuranceProvider: "АО «СК Евразия»",
      taxDate: "2026-07-15",
      taxCost: 120000,
      tempMove: null
    },
    {
      id: "v102",
      name: "Автокран XCMG 50t",
      model: "QY50KS",
      plate: "452 KZA 06",
      vin: "XCMGQY50K7823412",
      techPassport: "КА 5920174",
      invNumber: "KBI-AC-02",
      year: 2021,
      type: "Автокран",
      ownerType: "own",
      driverId: "d102",
      status: "На ТО",
      currentSiteId: "makat",
      mileage: 58000,
      engineHours: 4992, // Близко к ТО-5000 (пороги: 250, 500, 1000, 2000, 5000)
      fuelRate: 22.0,
      ptoDate: "2026-09-01",
      ctoDate: "2026-09-01",
      insuranceDate: "2026-11-15",
      insuranceCost: 280000,
      insuranceProvider: "АО «СК Евразия»",
      taxDate: "2026-07-15",
      taxCost: 240000,
      tempMove: null
    },
    {
      id: "v103",
      name: "Гусеничный экскаватор CAT 320",
      model: "320 GC",
      plate: "8823 AT 06",
      vin: "CAT320GC09812734",
      techPassport: "МН 7103856",
      invNumber: "KBI-EX-01",
      year: 2023,
      type: "Экскаватор",
      ownerType: "own",
      driverId: "d103",
      status: "Работает",
      currentSiteId: "karabatan",
      mileage: 12000,
      engineHours: 1480,
      fuelRate: 15.0,
      ptoDate: "2027-01-10",
      ctoDate: "2027-01-10",
      insuranceDate: "2027-01-05",
      insuranceCost: 150000,
      insuranceProvider: "АО «СК Евразия»",
      taxDate: "2026-07-15",
      taxCost: 95000,
      tempMove: null
    },
    {
      id: "v104",
      name: "Гусеничный экскаватор Komatsu PC200",
      model: "PC200-8M0",
      plate: "5639 AS 06",
      vin: "KMT2008M01129384",
      techPassport: "ВТ 2648301",
      invNumber: "KBI-EX-02",
      year: 2020,
      type: "Экскаватор",
      ownerType: "own",
      driverId: "d104",
      status: "На ремонте",
      currentSiteId: "inder",
      mileage: 94000,
      engineHours: 8750,
      fuelRate: 16.5,
      ptoDate: "2026-06-30",
      ctoDate: "2026-06-30",
      insuranceDate: "2026-08-20",
      insuranceCost: 165000,
      insuranceProvider: "АО «СК Евразия»",
      taxDate: "2026-07-15",
      taxCost: 95000,
      tempMove: null
    },
    {
      id: "v105",
      name: "Колесный экскаватор Hyundai R180W",
      model: "R180W-9S",
      plate: "312 BBA 06",
      vin: "HNDR180W9S234912",
      techPassport: "СК 9475182",
      invNumber: "KBI-EX-03",
      year: 2022,
      type: "Экскаватор",
      ownerType: "own",
      driverId: "d105",
      status: "Свободна",
      currentSiteId: "inder",
      mileage: 32000,
      engineHours: 2150,
      fuelRate: 14.0,
      ptoDate: "2026-10-11",
      ctoDate: "2026-10-11",
      insuranceDate: "2026-10-10",
      insuranceCost: 140000,
      insuranceProvider: "АО «СК Евразия»",
      taxDate: "2026-07-15",
      taxCost: 90000,
      tempMove: null
    },
    {
      id: "v106",
      name: "Автовышка ISUZU 28m",
      model: "Elf 9.5",
      plate: "089 OLA 06",
      vin: "ISZELF9531823901",
      techPassport: "НР 4012639",
      invNumber: "KBI-AV-01",
      year: 2019,
      type: "Автовышка",
      ownerType: "own",
      driverId: "d106",
      status: "Работает",
      currentSiteId: "zhangala",
      mileage: 125000,
      engineHours: 6410,
      fuelRate: 9.8,
      ptoDate: "2026-07-22",
      ctoDate: "2026-07-22",
      insuranceDate: "2026-07-20",
      insuranceCost: 120000,
      taxDate: "2026-07-15",
      taxCost: 75000,
      tempMove: null
    },
    {
      id: "v107",
      name: "Самосвал Shacman 25t",
      model: "SX3258",
      plate: "228 KBB 06",
      vin: "SHCSX32589081239",
      techPassport: "ДЕ 8356710",
      invNumber: "KBI-SM-01",
      year: 2023,
      type: "Самосвал",
      ownerType: "own",
      driverId: "d107",
      status: "Работает",
      currentSiteId: "karabatan",
      mileage: 48000,
      engineHours: 2490, // Близко к ТО-2500
      fuelRate: 28.0,
      ptoDate: "2027-02-15",
      ctoDate: "2027-02-15",
      insuranceDate: "2027-02-10",
      insuranceCost: 195000,
      taxDate: "2026-07-15",
      taxCost: 180000,
      tempMove: null
    },
    {
      id: "v108",
      name: "Самосвал Shacman 25t",
      model: "SX3258",
      plate: "229 KBB 06",
      vin: "SHCSX32589081240",
      techPassport: "ЖК 1593047",
      invNumber: "KBI-SM-02",
      year: 2023,
      type: "Самосвал",
      ownerType: "own",
      driverId: "d108",
      status: "Работает",
      currentSiteId: "karabatan2",
      mileage: 41200,
      engineHours: 2100,
      fuelRate: 28.0,
      ptoDate: "2027-02-15",
      ctoDate: "2027-02-15",
      insuranceDate: "2027-02-10",
      insuranceCost: 195000,
      taxDate: "2026-07-15",
      taxCost: 180000,
      tempMove: null
    },
    {
      id: "v109",
      name: "Манипулятор KamAZ 10t",
      model: "65117 + Kanglim",
      plate: "945 ADA 06",
      vin: "KMZ6511728391290",
      techPassport: "БА 6287413",
      invNumber: "KBI-MN-01",
      year: 2021,
      type: "Манипулятор",
      ownerType: "own",
      driverId: "d109",
      status: "Работает",
      currentSiteId: "makat",
      mileage: 82000,
      engineHours: 4120,
      fuelRate: 18.0,
      ptoDate: "2026-07-05",
      ctoDate: "2026-07-05",
      insuranceDate: "2026-07-01",
      insuranceCost: 210000,
      taxDate: "2026-07-15",
      taxCost: 150000,
      tempMove: null
    },
    {
      id: "v110",
      name: "Бульдозер Shantui SD16",
      model: "SD16",
      plate: "7712 AT 06",
      vin: "SHTSD16091238491",
      techPassport: "ТМ 3749528",
      invNumber: "KBI-BD-01",
      year: 2020,
      type: "Бульдозер",
      ownerType: "own",
      driverId: "d110",
      status: "Работает",
      currentSiteId: "karabatan",
      mileage: 5000,
      engineHours: 5420,
      fuelRate: 19.5,
      ptoDate: "2026-11-20",
      ctoDate: "2026-11-20",
      insuranceDate: "2026-11-10",
      insuranceCost: 110000,
      taxDate: "2026-07-15",
      taxCost: 95000,
      tempMove: null
    },
    // Добавим субаренду
    {
      id: "v111",
      name: "[Субаренда] Автокран Grove 100t",
      model: "GMK4100L",
      plate: "109 MKA 02",
      vin: "GRVGMK4100238129",
      techPassport: "ОЛ 8024176",
      invNumber: "SUB-AC-01",
      year: 2018,
      type: "Автокран",
      ownerType: "subrent", // субарендная
      subrentRate: 350000, // Стоимость аренды в день (KZT)
      subrentProvider: "ТОО «Каспий Спец Техника»",
      driverId: "d111",
      status: "Работает",
      currentSiteId: "karabatan",
      mileage: 95000,
      engineHours: 7200,
      fuelRate: 35.0,
      ptoDate: "2026-09-15",
      ctoDate: "2026-09-15",
      insuranceDate: "2026-09-01",
      insuranceCost: 0,
      taxDate: "2026-07-15",
      taxCost: 0,
      tempMove: null
    },
    {
      id: "v112",
      name: "[Субаренда] Самосвал KamAZ 15t",
      model: "65115",
      plate: "522 TTA 06",
      vin: "KMZ6511589218391",
      techPassport: "ЕС 5170943",
      invNumber: "SUB-SM-01",
      year: 2017,
      type: "Самосвал",
      ownerType: "subrent",
      subrentRate: 85000,
      subrentProvider: "ТОО «Каспий Спец Техника»",
      driverId: "d112",
      status: "Работает",
      currentSiteId: "makat",
      mileage: 198000,
      engineHours: 11200,
      fuelRate: 24.0,
      ptoDate: "2026-08-20",
      ctoDate: "2026-08-20",
      insuranceDate: "2026-08-10",
      insuranceCost: 0,
      taxDate: "2026-07-15",
      taxCost: 0,
      tempMove: null
    },
    {
      id: "v113",
      name: "[Субаренда] Гусеничный экскаватор Hyundai 300",
      model: "R300LC",
      plate: "9814 AT 06",
      vin: "HNDR300LC89217342",
      techPassport: "ГШ 2438601",
      invNumber: "SUB-EX-01",
      year: 2019,
      type: "Экскаватор",
      ownerType: "subrent",
      subrentRate: 150000,
      subrentProvider: "ТОО «Каспий Спец Техника»",
      driverId: null,
      status: "Работает",
      currentSiteId: "karabatan",
      mileage: 120000,
      engineHours: 8500,
      fuelRate: 28.0,
      ptoDate: "2026-10-10",
      ctoDate: "2026-10-10",
      insuranceDate: "2026-10-01",
      insuranceCost: 0,
      taxDate: "2026-07-15",
      taxCost: 0,
      tempMove: null
    },
    {
      id: "v114",
      name: "[Субаренда] Фронтальный погрузчик SDLG 956",
      model: "LG956L",
      plate: "437 TTA 06",
      vin: "SDLGLG95689127391",
      techPassport: "РП 6901285",
      invNumber: "SUB-PL-01",
      year: 2020,
      type: "Погрузчик",
      ownerType: "subrent",
      subrentRate: 95000,
      subrentProvider: "ТОО «Каспий Спец Техника»",
      driverId: null,
      status: "Работает",
      currentSiteId: "karabatan2",
      mileage: 82000,
      engineHours: 5400,
      fuelRate: 18.0,
      ptoDate: "2026-09-20",
      ctoDate: "2026-09-20",
      insuranceDate: "2026-09-10",
      insuranceCost: 0,
      taxDate: "2026-07-15",
      taxCost: 0,
      tempMove: null
    }
  ],

  // 12 водителей / операторов
  drivers: [
    {
      id: "d101",
      name: "Сериков А. С.",
      iin: "880512300481",
      phone: "+7 701 456 12 12",
      position: "Машинист автокрана",
      licenseCategory: "B, C, C1",
      licenseExpiry: "2029-08-14",
      medExpiry: "2027-02-10",
      tbExpiry: "2026-12-15", // Справка ТБ
      otExpiry: "2026-12-15", // Охрана труда
      ptmExpiry: "2026-12-15", // ПТМ
      uniformSize: "50-52 (XL)",
      lodging: "Общежитие Карабатан (Ак Патер)",
      mealPlan: "Трехразовое на объекте",
      travelCosts: 25000, // Командировочные в месяц
      materialLiability: true, // Договор МО подписан
      contractType: "TD", // TD = Трудовой договор, GPH = ГПХ
      contractExpiry: "2027-05-12",
      baseSalary: 350000, // Базовый оклад
      activeDebt: 0, // Переносимый долг
      finesThisMonth: 0, // Штрафы ТБ
      fuelDeduction: 0, // Удержания за ГСМ
      shiftsWorked: 18,
      isBlocked: false
    },
    {
      id: "d102",
      name: "Калиев М. К.",
      iin: "921004300941",
      phone: "+7 775 889 45 45",
      position: "Машинист автокрана",
      licenseCategory: "B, C, D",
      licenseExpiry: "2028-11-20",
      medExpiry: "2026-07-10", // Внимание! Истекает скоро
      tbExpiry: "2026-07-15", // Скоро истекает
      otExpiry: "2026-07-15",
      ptmExpiry: "2026-07-15",
      uniformSize: "48-50 (L)",
      lodging: "Вагон-городок Макат",
      mealPlan: "Горячие обеды",
      travelCosts: 20000,
      materialLiability: true,
      contractType: "TD",
      contractExpiry: "2027-01-10",
      baseSalary: 380000,
      activeDebt: 0,
      finesThisMonth: 0,
      fuelDeduction: 0,
      shiftsWorked: 20,
      isBlocked: false
    },
    {
      id: "d103",
      name: "Жусупов Б. Н.",
      iin: "850214300582",
      phone: "+7 702 111 88 99",
      position: "Машинист экскаватора",
      licenseCategory: "B, C, Тракторист-машинист",
      licenseExpiry: "2031-04-05",
      medExpiry: "2026-06-25", // Истекает через 7 дней! (Красный алерт)
      tbExpiry: "2026-09-01",
      otExpiry: "2026-09-01",
      ptmExpiry: "2026-09-01",
      uniformSize: "52-54 (XXL)",
      lodging: "Общежитие Карабатан",
      mealPlan: "Трехразовое",
      travelCosts: 25000,
      materialLiability: true,
      contractType: "TD",
      contractExpiry: "2026-12-31",
      baseSalary: 360000,
      activeDebt: 0,
      finesThisMonth: 0,
      fuelDeduction: 0,
      shiftsWorked: 22,
      isBlocked: false
    },
    {
      id: "d104",
      name: "Нуржанов Т. А.",
      iin: "890403300223",
      phone: "+7 707 909 32 32",
      position: "Машинист экскаватора",
      licenseCategory: "C, Тракторист-машинист",
      licenseExpiry: "2026-06-15", // Просрочено! (Машинист должен быть автоматически заблокирован)
      medExpiry: "2026-10-15",
      tbExpiry: "2026-10-10",
      otExpiry: "2026-10-10",
      ptmExpiry: "2026-10-10",
      uniformSize: "50-52 (XL)",
      lodging: "Аренда жилья Индер",
      mealPlan: "Суточные выплаты",
      travelCosts: 45000,
      materialLiability: true,
      contractType: "TD",
      contractExpiry: "2026-08-31",
      baseSalary: 340000,
      activeDebt: 50000, // Имеется прошлый долг
      finesThisMonth: 0,
      fuelDeduction: 0,
      shiftsWorked: 15,
      isBlocked: true // Блокировка!
    },
    {
      id: "d105",
      name: "Ибрагимов С. Б.",
      iin: "910815300182",
      phone: "+7 705 321 00 11",
      position: "Машинист экскаватора",
      licenseCategory: "B, C, Тракторист-машинист",
      licenseExpiry: "2030-05-12",
      medExpiry: "2027-04-18",
      tbExpiry: "2026-11-20",
      otExpiry: "2026-11-20",
      ptmExpiry: "2026-11-20",
      uniformSize: "48-50 (L)",
      lodging: "Аренда жилья Индер",
      mealPlan: "Суточные выплаты",
      travelCosts: 45000,
      materialLiability: true,
      contractType: "GPH", // Договор ГПХ
      contractExpiry: "2026-09-20",
      baseSalary: 300000,
      activeDebt: 0,
      finesThisMonth: 0,
      fuelDeduction: 0,
      shiftsWorked: 10,
      isBlocked: false
    },
    {
      id: "d106",
      name: "Смагулов К. Р.",
      iin: "831209300641",
      phone: "+7 777 555 44 22",
      position: "Машинист автовышки",
      licenseCategory: "B, C, E",
      licenseExpiry: "2028-03-24",
      medExpiry: "2026-12-05",
      tbExpiry: "2026-11-01",
      otExpiry: "2026-11-01",
      ptmExpiry: "2026-11-01",
      uniformSize: "50-52 (XL)",
      lodging: "Общежитие Жангала",
      mealPlan: "Питание за счет компании",
      travelCosts: 35000,
      materialLiability: true,
      contractType: "TD",
      contractExpiry: "2027-02-15",
      baseSalary: 320000,
      activeDebt: 0,
      finesThisMonth: 0,
      fuelDeduction: 0,
      shiftsWorked: 14,
      isBlocked: false
    },
    {
      id: "d107",
      name: "Даутов А. Т.",
      iin: "950118300222",
      phone: "+7 747 123 45 67",
      position: "Водитель самосвала",
      licenseCategory: "C, E",
      licenseExpiry: "2033-01-20",
      medExpiry: "2027-01-15",
      tbExpiry: "2026-07-28", // Внимание! Истекает через 40 дней
      otExpiry: "2026-07-28",
      ptmExpiry: "2026-07-28",
      uniformSize: "46-48 (M)",
      lodging: "Общежитие Карабатан (Ак Патер)",
      mealPlan: "Трехразовое",
      travelCosts: 25000,
      materialLiability: true,
      contractType: "TD",
      contractExpiry: "2027-02-01",
      baseSalary: 300000,
      activeDebt: 0,
      finesThisMonth: 0,
      fuelDeduction: 0,
      shiftsWorked: 21,
      isBlocked: false
    },
    {
      id: "d108",
      name: "Маратов Ж. Д.",
      iin: "930620300998",
      phone: "+7 701 988 77 66",
      position: "Водитель самосвала",
      licenseCategory: "C, E",
      licenseExpiry: "2031-10-15",
      medExpiry: "2027-05-10",
      tbExpiry: "2026-10-12",
      otExpiry: "2026-10-12",
      ptmExpiry: "2026-10-12",
      uniformSize: "52-54 (XXL)",
      lodging: "Общежитие Карабатан (Ак Патер)",
      mealPlan: "Трехразовое",
      travelCosts: 25000,
      materialLiability: true,
      contractType: "TD",
      contractExpiry: "2027-02-01",
      baseSalary: 300000,
      activeDebt: 0,
      finesThisMonth: 0,
      fuelDeduction: 0,
      shiftsWorked: 19,
      isBlocked: false
    },
    {
      id: "d109",
      name: "Сапаров Е. Б.",
      iin: "870712300543",
      phone: "+7 775 333 22 11",
      position: "Водитель манипулятора",
      licenseCategory: "B, C, C1E",
      licenseExpiry: "2029-04-18",
      medExpiry: "2026-07-02", // Меньше 15 дней! (Оранжевый алерт)
      tbExpiry: "2026-07-10", // Меньше 30 дней!
      otExpiry: "2026-07-10",
      ptmExpiry: "2026-07-10",
      uniformSize: "48-50 (L)",
      lodging: "Вагон-городок Макат",
      mealPlan: "Горячие обеды",
      travelCosts: 20000,
      materialLiability: true,
      contractType: "TD",
      contractExpiry: "2026-12-31",
      baseSalary: 320000,
      activeDebt: 0,
      finesThisMonth: 0,
      fuelDeduction: 0,
      shiftsWorked: 23,
      isBlocked: false
    },
    {
      id: "d110",
      name: "Есенгалиев Н. М.",
      iin: "900318300223",
      phone: "+7 708 444 88 22",
      position: "Машинист бульдозера",
      licenseCategory: "C, Тракторист-машинист",
      licenseExpiry: "2032-09-09",
      medExpiry: "2027-03-01",
      tbExpiry: "2027-02-15",
      otExpiry: "2027-02-15",
      ptmExpiry: "2027-02-15",
      uniformSize: "52-54 (XXL)",
      lodging: "Общежитие Карабатан",
      mealPlan: "Трехразовое",
      travelCosts: 25000,
      materialLiability: true,
      contractType: "TD",
      contractExpiry: "2027-04-01",
      baseSalary: 360000,
      activeDebt: 0,
      finesThisMonth: 0,
      fuelDeduction: 0,
      shiftsWorked: 22,
      isBlocked: false
    },
    // Водители на субаренду (партнеры)
    {
      id: "d111",
      name: "Кусаинов С. К.",
      iin: "860412300182",
      phone: "+7 701 888 22 33",
      position: "Водитель крана (партнер)",
      licenseCategory: "B, C, D",
      licenseExpiry: "2030-01-10",
      medExpiry: "2027-01-10",
      tbExpiry: "2026-12-01",
      otExpiry: "2026-12-01",
      ptmExpiry: "2026-12-01",
      uniformSize: "48-50 (L)",
      lodging: "Жилье арендодателя",
      mealPlan: "Субаренда (включено)",
      travelCosts: 0,
      materialLiability: false,
      contractType: "GPH",
      contractExpiry: "2026-09-15",
      baseSalary: 0, // Оплачивается по акту субаренды партнеру
      activeDebt: 0,
      finesThisMonth: 0,
      fuelDeduction: 0,
      shiftsWorked: 15,
      isBlocked: false
    },
    {
      id: "d112",
      name: "Ахметов Д. Т.",
      iin: "940212300948",
      phone: "+7 707 333 44 55",
      position: "Водитель самосвала (партнер)",
      licenseCategory: "C, E",
      licenseExpiry: "2032-12-12",
      medExpiry: "2027-02-10",
      tbExpiry: "2026-08-20",
      otExpiry: "2026-08-20",
      ptmExpiry: "2026-08-20",
      uniformSize: "50-52 (XL)",
      lodging: "Жилье арендодателя",
      mealPlan: "Субаренда (включено)",
      travelCosts: 0,
      materialLiability: false,
      contractType: "GPH",
      contractExpiry: "2026-08-20",
      baseSalary: 0,
      activeDebt: 0,
      finesThisMonth: 0,
      fuelDeduction: 0,
      shiftsWorked: 18,
      isBlocked: false
    }
  ],

  // 3-уровневые склады
  warehouses: {
    // 1. Центральный склад (г. Атырау)
    central: [
      { id: "tmc_f1", sku: "FIL-OIL-201", name: "Фильтр масляный CAT 320", category: "Фильтры", supplier: "ТОО Борусан Машинери", price: 18500, balance: 14, minStock: 5 },
      { id: "tmc_f2", sku: "FIL-AIR-305", name: "Фильтр воздушный Shacman", category: "Фильтры", supplier: "ИП ШансиЗапчасть", price: 24000, balance: 8, minStock: 4 },
      { id: "tmc_o1", sku: "OIL-ENG-1540", name: "Масло моторное Mobil Delvac 15W-40 (20л)", category: "Масла", supplier: "ТОО Helios OIL", price: 42000, balance: 25, minStock: 8 },
      { id: "tmc_t1", sku: "TYR-SH-1200", name: "Шина карьерная 12.00R20 Shacman", category: "Шины", supplier: "ТОО Шинный Центр Атырау", price: 165000, balance: 4, minStock: 6 }, // Дефицит!
      { id: "tmc_h1", sku: "HOS-HYD-002", name: "Рукав высокого давления (РВД) 1.5м", category: "Расходники", supplier: "ТОО ГидроРемСервис", price: 7500, balance: 18, minStock: 10 }
    ],
    // 2. Склады по объектам
    sites: {
      karabatan: [
        { id: "tmc_f1", sku: "FIL-OIL-201", name: "Фильтр масляный CAT 320", category: "Фильтры", price: 18500, balance: 3 },
        { id: "tmc_o1", sku: "OIL-ENG-1540", name: "Масло моторное Mobil Delvac 15W-40 (20л)", category: "Масла", price: 42000, balance: 5 },
        { id: "tmc_h1", sku: "HOS-HYD-002", name: "Рукав высокого давления (РВД) 1.5м", category: "Расходники", price: 7500, balance: 2 }
      ],
      makat: [
        { id: "tmc_f2", sku: "FIL-AIR-305", name: "Фильтр воздушный Shacman", category: "Фильтры", price: 24000, balance: 2 },
        { id: "tmc_o1", sku: "OIL-ENG-1540", name: "Масло моторное Mobil Delvac 15W-40 (20л)", category: "Масла", price: 42000, balance: 3 }
      ],
      inder: [
        { id: "tmc_f1", sku: "FIL-OIL-201", name: "Фильтр масляный CAT 320", category: "Фильтры", price: 18500, balance: 1 },
        { id: "tmc_h1", sku: "HOS-HYD-002", name: "Рукав высокого давления (РВД) 1.5м", category: "Расходники", price: 7500, balance: 1 }
      ],
      zhangala: []
    },
    // 3. Бортовой запас (внутри техники)
    board: {
      v101: [{ sku: "HOS-HYD-002", name: "РВД 1.5м", balance: 1 }],
      v103: [{ sku: "FIL-OIL-201", name: "Фильтр масляный CAT 320", balance: 1 }],
      v107: [{ sku: "FIL-AIR-305", name: "Фильтр воздушный Shacman", balance: 1 }]
    }
  },

  // CRM сделки и заказы
  deals: [
    {
      id: "deal_1",
      companyName: "ТОО «АтырауНефть»",
      contactPerson: "Бахтияров Нургали",
      siteId: "karabatan",
      address: "Промучасток Карабатан, сектор 4",
      jobType: "Разгрузка металлоконструкций и планировка грунта",
      startDate: "2026-06-10",
      endDate: "2026-06-25",
      vehicleCount: 2,
      vehicleIds: ["v101", "v103"],
      price: 2400000,
      stage: "Выполнение работ", // Лид, КП, Договор, Назначение, Выполнение, Закрытие, Оплата, Оплачено
      contractNumber: "Д-06/2026-11",
      contractSigned: true,
      invoiceStatus: "Выставлен счет", // Не выставлен, Выставлен счет, Оплачено, Просрочка
      invoiceDueDate: "2026-06-20",
      paymentStageDays: 20
    },
    {
      id: "deal_2",
      companyName: "ТОО «NCOC»",
      contactPerson: "Утегенов Самат",
      siteId: "makat",
      address: "Компрессорная станция Макат-3",
      jobType: "Перемещение грунта и монтаж блоков",
      startDate: "2026-06-15",
      endDate: "2026-06-30",
      vehicleCount: 2,
      vehicleIds: ["v102", "v109"],
      price: 3600000,
      stage: "Выполнение работ",
      contractNumber: "Д-06/2026-14",
      contractSigned: true,
      invoiceStatus: "Не выставлен счет",
      invoiceDueDate: "2026-07-05",
      paymentStageDays: 0
    },
    {
      id: "deal_3",
      companyName: "ТОО «АтырауНефть»",
      contactPerson: "Асылбеков Канат",
      siteId: "karabatan2",
      address: "Строительная площадка завода KPI",
      jobType: "Выгрузка технологического оборудования",
      startDate: "2026-06-20",
      endDate: "2026-07-10",
      vehicleCount: 1,
      vehicleIds: ["v108"],
      price: 1800000,
      stage: "Договор", // На стадии договора. Должен быть заблокирован переход без подписания!
      contractNumber: "Д-06/2026-25",
      contractSigned: false,
      invoiceStatus: "Не выставлен счет",
      invoiceDueDate: "",
      paymentStageDays: 0
    },
    {
      id: "deal_4",
      companyName: "ТОО «NCOC»",
      contactPerson: "Рахимжанов Е.",
      siteId: "karabatan",
      address: "Завод Болашак, Карабатан",
      jobType: "Аренда погрузчиков и планировка площадки",
      startDate: "2026-06-18",
      endDate: "2026-07-05",
      vehicleCount: 1,
      vehicleIds: ["v106"],
      price: 1500000,
      stage: "Выполнение работ",
      contractNumber: "Д-06/2026-30",
      contractSigned: true,
      invoiceStatus: "Выставлен счет",
      invoiceDueDate: "2026-06-25",
      paymentStageDays: 10
    },
    {
      id: "deal_5",
      companyName: "ТОО «NCOC»",
      contactPerson: "Ахметов А.",
      siteId: "zhangala",
      address: "НПС Жангала",
      jobType: "Аренда автовышки и обслуживание освещения",
      startDate: "2026-06-15",
      endDate: "2026-06-22",
      vehicleCount: 1,
      vehicleIds: ["v110"],
      price: 900000,
      stage: "Выполнение работ",
      contractNumber: "Д-06/2026-31",
      contractSigned: true,
      invoiceStatus: "Не выставлен счет",
      invoiceDueDate: "2026-06-30",
      paymentStageDays: 0
    }
  ],

  // Логи ГСМ (заправки)
  fuelLogs: [
    { id: "fl_1", date: "2026-06-18", time: "08:15", vehicleId: "v101", driverId: "d101", fuelType: "Дизель", liters: 120, cost: 35400, fuelCard: "CARD-99120", approved: true },
    { id: "fl_2", date: "2026-06-18", time: "08:30", vehicleId: "v103", driverId: "d103", fuelType: "Дизель", liters: 200, cost: 59000, fuelCard: "CARD-99122", approved: true },
    { id: "fl_3", date: "2026-06-18", time: "09:00", vehicleId: "v107", driverId: "d107", fuelType: "Дизель", liters: 250, cost: 73750, fuelCard: "CARD-99125", approved: true }
  ],

  // Ремонтные заявки и дефектные акты
  repairs: [
    {
      id: "rep_1",
      vehicleId: "v104",
      siteId: "inder",
      driverId: "d104",
      description: "Повреждение гидравлического шланга ковша, падение давления масла.",
      status: "Ремонт", // Новая, Диагностика, Запчасти, Ремонт, Испытания, Готово
      createdAt: "2026-06-17",
      faultByDriver: true, // По вине водителя
      damageCost: 95000, // Стоимость ущерба
      explanatoryAttached: true, // Объяснительная прикреплена
      partsRequested: [
        { sku: "HOS-HYD-002", name: "РВД 1.5м", qty: 2, status: "Списано" }
      ],
      laborCost: 45000,
      contractorName: "ТОО «АтырауСпецТехРемонт»"
    },
    {
      id: "rep_2",
      vehicleId: "v102",
      siteId: "makat",
      driverId: "d102",
      description: "Течь гидравлического масла из гидроцилиндра подъема.",
      status: "Запчасти",
      createdAt: "2026-06-19",
      faultByDriver: false,
      damageCost: 0,
      explanatoryAttached: false,
      partsRequested: [
        { sku: "OIL-HYD-10W", name: "Гидравлическое масло Shell 20л", qty: 3, status: "Запрошено" }
      ],
      laborCost: 0,
      contractorName: "ТОО «АтырауСпецТехРемонт»"
    },
    {
      id: "rep_3",
      vehicleId: "v101",
      siteId: "karabatan",
      driverId: "d101",
      description: "Замена уплотнений гидрораспределителя автокрана Zoomlion.",
      status: "Диагностика",
      createdAt: "2026-06-20",
      faultByDriver: false,
      damageCost: 0,
      explanatoryAttached: false,
      partsRequested: [],
      laborCost: 35000,
      contractorName: "ТОО «АтырауСпецТехРемонт»"
    }
  ],

  // Логистическая воронка запчастей (доставка на объекты)
  logistics: [
    { id: "log_1", repairId: "rep_1", partSku: "HOS-HYD-002", partName: "РВД 1.5м (2 шт)", fromWh: "central", toSiteId: "inder", transport: "Газель №312 KBI", stage: "Выезд", driver: "Кожаев Р.", status: "В пути на Индер" }
  ],

  // История перемещений техники между объектами
  vehicleMoves: [
    { id: "m_1", vehicleId: "v103", oldSite: "База Атырау", newSite: "Карабатан", date: "2026-06-08", reason: "Начало проекта АтырауСтройПуть", author: "Диспетчер Ахметов" },
    { id: "m_2", vehicleId: "v104", oldSite: "База Атырау", newSite: "Индер", date: "2026-06-14", reason: "Разработка карьера", author: "Диспетчер Ахметов" }
  ],

  // Удержания и штрафы за текущий месяц (накапливаемые логи)
  payrollDeductions: [
    { id: "pd_1", driverId: "d104", type: "Поломка спецтехники (виновность)", amount: 95000, date: "2026-06-17", reference: "Дефект-акт rep_1", approved: true }
  ],

  // Реестр контрагентов (Компании)
  companies: [
    { id: "comp_1", name: "ТОО «Каспий Спец Техника»", bin: "120440012934", type: "Арендодатель", city: "Атырау", vehicleTypes: "Автокраны, Самосвалы", activeContracts: 4, debt: 1200000, safetyIndex: 98, status: "Активен" },
    { id: "comp_2", name: "ТОО «Борусан Машинери»", bin: "010840003291", type: "Поставщик", city: "Атырау", vehicleTypes: "Запчасти CAT, Расходники", activeContracts: 2, debt: 0, safetyIndex: 100, status: "Активен" },
    { id: "comp_3", name: "ТОО «Helios OIL»", bin: "990940001234", type: "Поставщик", city: "Атырау", vehicleTypes: "ГСМ (Дизель, Масла)", activeContracts: 1, debt: -450000, safetyIndex: 95, status: "Активен" },
    { id: "comp_4", name: "ТОО «АтырауСпецТехРемонт»", bin: "150340029381", type: "Подрядчик по ремонту", city: "Атырау", vehicleTypes: "Ремонт гидравлики и ДВС", activeContracts: 3, debt: 850000, safetyIndex: 88, status: "На проверке ТБ" },
    { id: "comp_5", name: "АО «СК Евразия»", bin: "950740000123", type: "Страховая", city: "Алматы", vehicleTypes: "ОСГПО, КАСКО спецтехники", activeContracts: 5, debt: 0, safetyIndex: 99, status: "Активен" },
    { id: "comp_6", name: "ТОО «АтырауНефть»", bin: "180240019283", type: "Заказчик", city: "Атырау", vehicleTypes: "Аренда кранов и экскаваторов", activeContracts: 2, debt: 2400000, safetyIndex: 90, status: "Заблокирован за долги" },
    { id: "comp_7", name: "ТОО «NCOC»", bin: "090140029102", type: "Заказчик", city: "Атырау", vehicleTypes: "Аренда самосвалов и погрузчиков", activeContracts: 3, debt: 0, safetyIndex: 97, status: "Активен" }
  ],

  // Реестр задач и поручений
  tasks: [
    { id: "task_1", title: "Пройти ТО-2 на Самосвале 01", description: "Проверить ходовую часть, заменить фильтры и масло в двигателе.", vehicleId: "v107", siteId: "karabatan", dueDate: "2026-06-18", initiator: "Аманжолов Б.", assignee: "d107", controller: "Механик", status: "in_progress", signedDocument: false, signedDate: null, documentType: "Акт приемки ТО" },
    { id: "task_2", title: "Инструктаж по ТБ (Летний регламент)", description: "Провести повторный инструктаж по технике безопасности при работе при экстремальных температурах (+40C).", vehicleId: null, siteId: "karabatan2", dueDate: "2026-06-19", initiator: "Каримов Р.", assignee: "d108", controller: "Служба ТБ", status: "safety_review", signedDocument: false, signedDate: null, documentType: "Сертификат инструктажа" },
    { id: "task_3", title: "Проверить гидравлику на CAT 320", description: "Жалобы на медленный подъем стрелы. Диагностика гидроцилиндров.", vehicleId: "v103", siteId: "karabatan", dueDate: "2026-06-22", initiator: "Аманжолов Б.", assignee: "d103", controller: "Механик", status: "todo", signedDocument: false, signedDate: null, documentType: "Наряд-допуск на ремонт" },
    { id: "task_4", title: "Сдать отчет по ГСМ", description: "Подписать путевые листы и чеки за первую половину июня.", vehicleId: null, siteId: "makat", dueDate: "2026-06-15", initiator: "Искаков Т.", assignee: "d102", controller: "Служба ТБ", status: "completed", signedDocument: true, signedDate: "2026-06-15", documentType: "Акт выполненных работ", signatureData: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==" }
  ],

  // Списки подрядчиков и поставщиков
  directories: {
    suppliers: [
      { name: "ТОО Борусан Машинери", contact: "+7 7122 30 30 30", details: "Официальный дилер CAT, оригинальные запчасти" },
      { name: "ТОО Helios OIL", contact: "+7 7122 55 12 90", details: "Поставка ГСМ оптом, заправочные карты" },
      { name: "ИП ШансиЗапчасть", contact: "+7 701 556 78 90", details: "Запчасти Shacman, Howo, запчасти из Китая" },
      { name: "ТОО Шинный Центр Атырау", contact: "+7 7122 45 90 90", details: "Грузовые и карьерные шины" }
    ],
    contractors: [
      { name: "ТОО АтырауСпецТехРемонт", contact: "+7 702 334 12 12", details: "Капитальный ремонт гидравлики, двигателей спецтехники" },
      { name: "ИП ГидравликаСервис", contact: "+7 775 889 00 22", details: "Ремонт гидромоторов и РВД в полевых условиях" }
    ],
    insurers: [
      { name: "АО СК Евразия", contact: "+7 7122 20 40 50", details: "Страхование спецтехники, ОСГПО ВТС" },
      { name: "АО СК Халык", contact: "+7 7122 90 10 10", details: "Страхование грузов, добровольное страхование техники" }
    ]
  },

  // ИИ Чат-лог (эмулятор мессенджера)
  chatLog: [
    { sender: "ИИ-Агент", time: "07:00", message: "🤖 ИИ-Логист KazBildInvest приветствует участников!\nВ этой группе WhatsApp фиксируются отчеты водителей по сменам, заправкам и неисправностям. ИИ-Агент автоматически парсит сообщения и переносит данные в ERP." },
    { sender: "Сериков А. С. (Водитель)", time: "08:15", message: "Запустил смену на автокране Zoomlion 25t, госномер 714 ADE. Выехал на Карабатан-2." },
    { sender: "ИИ-Агент", time: "08:16", message: "🤖 ИИ-Логист: Смена зафиксирована!\n- Водитель: Сериков А. С.\n- Машина: KBI-AC-01 (Автокран Zoomlion 25t)\n- Объект: Карабатан-2 (Ак Патер)\nДанные внесены в ERP. Техника в статусе 'Работает'." }
  ],

  // Канал связи с водителями (сообщения)
  driverMessages: [
    { id: "msg_1", driverId: "d107", sender: "Диспетчер", time: "09:00", message: "У тебя простой больше 3 часов на Карабатане. В чем причина?", reply: "Ждем автокран для выгрузки металлоконструкций." },
    { id: "msg_2", driverId: "d101", sender: "Диспетчер", time: "10:15", message: "Выезжай на Карабатан-2 для усиления смены.", reply: "Принял, выезжаю." }
  ],

  // Заказы снабжения (запчасти)
  supplyOrders: [
    { id: "so_1", partSku: "HOS-HYD-002", partName: "РВД 1.5м (2 шт)", qty: 1, price: 30000, total: 30000, supplier: "ТОО Борусан Машинери", status: "Оформлен", date: "2026-06-19" },
    { id: "so_2", partSku: "OIL-ENG-5W40", partName: "Моторное масло 20л", qty: 5, price: 45000, total: 225000, supplier: "ТОО Helios OIL", status: "Доставлен", date: "2026-06-18" },
    { id: "so_3", partSku: "FIL-OIL-201", partName: "Фильтр масляный CAT (x5)", qty: 5, price: 18500, total: 92500, supplier: "ТОО Борусан Машинери", status: "В пути", date: "2026-06-20" },
    { id: "so_4", partSku: "OIL-ENG-1540", partName: "Масло Mobil Delvac 20л", qty: 2, price: 42000, total: 84000, supplier: "ТОО Helios OIL", status: "Оформлен", date: "2026-06-20" }
  ],

  // База потенциальных поставщиков
  potentialSuppliers: [
    { id: "ps_1", name: "ТОО «ЗапчастьИмпортКазахстан»", contact: "+7 701 445 88 12", city: "Атырау", category: "Запчасти КНР", rating: 4.8 },
    { id: "ps_2", name: "ИП «СпецСнаб-Сервис»", contact: "+7 702 334 55 11", city: "Актау", category: "Гидравлика и РВД", rating: 4.2 },
    { id: "ps_3", name: "ТОО «Каспий Нефть ГСМ»", contact: "+7 775 889 00 33", city: "Атырау", category: "Оптовое ДТ", rating: 4.5 }
  ],

  // Черный список HR
  blacklist: [
    { id: "bl_1", name: "Касымов А. К.", iin: "840219300181", position: "Машинист автокрана", category: "сторонний", blockReason: "Систематическое употребление алкоголя в смене", blockDate: "2026-05-10", notes: "Был нанят по субаренде от ТОО «Каспий Спец Техника». Уволен со скандалом на объекте Карабатан." },
    { id: "bl_2", name: "Рахимов Б. С.", iin: "910512300422", position: "Водитель самосвала", category: "собственный", blockReason: "Кража ГСМ (слив дизеля 150 литров)", blockDate: "2026-06-02", notes: "Камера зафиксировала слив из бака ночью. Удержано 50% ФОТ, уволен по отрицательным мотивам." }
  ],

  // Табели учета рабочего времени (Табелирование)
  timesheets: [
    {
      id: "ts_1",
      month: "2026-06",
      vehicleId: "v101",
      driverHistory: [
        { day: 1, driverId: "d101" }, { day: 2, driverId: "d101" }, { day: 3, driverId: "d101" }, { day: 4, driverId: "d101" }, { day: 5, driverId: "d101" },
        { day: 6, driverId: "d101" }, { day: 7, driverId: "d101" }, { day: 8, driverId: "d101" }, { day: 9, driverId: "d101" }, { day: 10, driverId: "d101" },
        { day: 11, driverId: "d101" }, { day: 12, driverId: "d101" }, { day: 13, driverId: "d101" }, { day: 14, driverId: "d101" }, { day: 15, driverId: "d101" },
        // Водитель заменен на d102 с 16 по 20 июня
        { day: 16, driverId: "d102" }, { day: 17, driverId: "d102" }, { day: 18, driverId: "d102" }, { day: 19, driverId: "d102" }, { day: 20, driverId: "d102" },
        { day: 21, driverId: "d101" }, { day: 22, driverId: "d101" }, { day: 23, driverId: "d101" }, { day: 24, driverId: "d101" }, { day: 25, driverId: "d101" },
        { day: 26, driverId: "d101" }, { day: 27, driverId: "d101" }, { day: 28, driverId: "d101" }, { day: 29, driverId: "d101" }, { day: 30, driverId: "d101" }
      ],
      dailyStatus: {
        1:"W", 2:"W", 3:"W", 4:"W", 5:"W", 6:"O", 7:"O", 8:"W", 9:"W", 10:"W", 11:"W", 12:"W", 13:"O", 14:"O", 15:"W",
        16:"W", 17:"W", 18:"W", 19:"W", 20:"W", 21:"O", 22:"O", 23:"W", 24:"W", 25:"W", 26:"W", 27:"W", 28:"O", 29:"O", 30:"W"
      },
      mechanicApproved: true,
      hrApproved: false,
      directorApproved: false
    },
    {
      id: "ts_2",
      month: "2026-06",
      vehicleId: "v103",
      driverHistory: [
        { day: 1, driverId: "d103" }, { day: 2, driverId: "d103" }, { day: 3, driverId: "d103" }, { day: 4, driverId: "d103" }, { day: 5, driverId: "d103" },
        { day: 6, driverId: "d103" }, { day: 7, driverId: "d103" }, { day: 8, driverId: "d103" }, { day: 9, driverId: "d103" }, { day: 10, driverId: "d103" },
        { day: 11, driverId: "d103" }, { day: 12, driverId: "d103" }, { day: 13, driverId: "d103" }, { day: 14, driverId: "d103" }, { day: 15, driverId: "d103" },
        { day: 16, driverId: "d103" }, { day: 17, driverId: "d103" }, { day: 18, driverId: "d103" }, { day: 19, driverId: "d103" }, { day: 20, driverId: "d103" },
        { day: 21, driverId: "d103" }, { day: 22, driverId: "d103" }, { day: 23, driverId: "d103" }, { day: 24, driverId: "d103" }, { day: 25, driverId: "d103" },
        { day: 26, driverId: "d103" }, { day: 27, driverId: "d103" }, { day: 28, driverId: "d103" }, { day: 29, driverId: "d103" }, { day: 30, driverId: "d103" }
      ],
      dailyStatus: {
        1:"W", 2:"W", 3:"W", 4:"W", 5:"W", 6:"O", 7:"O", 8:"W", 9:"W", 10:"W", 11:"W", 12:"W", 13:"O", 14:"O", 15:"W",
        16:"W", 17:"W", 18:"W", 19:"W", 20:"W", 21:"O", 22:"O", 23:"W", 24:"W", 25:"W", 26:"W", 27:"W", 28:"O", 29:"O", 30:"W"
      },
      mechanicApproved: true,
      hrApproved: true,
      directorApproved: true
    }
  ],

  // Авансы поставщиков
  supplierAdvances: [
    { id: "sa_1", supplierName: "ТОО «Helios OIL»", date: "2026-06-15", amount: 1500000, purpose: "Предоплата за ДТ по топливным картам" },
    { id: "sa_2", supplierName: "ТОО «Борусан Машинери»", date: "2026-06-18", amount: 800000, purpose: "Аванс за гидравлические цилиндры CAT" }
  ],

  // Курсы валют
  currencyRates: {
    USD: 448.50,
    EUR: 480.20,
    RUB: 5.12
  },

  // Баланс банковских счетов
  bankBalances: [
    { id: "bb_1", bankName: "АО «Halyk Bank»", currency: "KZT", balance: 14500000 },
    { id: "bb_2", bankName: "АО «ForteBank»", currency: "USD", balance: 25000 }
  ],

  // Заявки на корочки ТБ
  safetyCertRequests: [
    { id: "scr_1", employeeName: "Жусупов Б. Н.", vehicleName: "Гусеничный экскаватор CAT 320", requestDate: "2026-06-20", status: "В обработке" },
    { id: "scr_2", employeeName: "Сериков А. С.", vehicleName: "Автокран Zoomlion 25t", requestDate: "2026-06-21", status: "Оформлено" }
  ],

  // Журнал списания/прихода материалов
  materialsWriteOffs: [
    { id: "mwo_1", date: "2026-06-18", type: "Приход", itemName: "Фильтр воздушный Shacman", qty: 10, source: "Поставщик ИП ШансиЗапчасть", price: 24000 },
    { id: "mwo_2", date: "2026-06-19", type: "Списание", itemName: "Фильтр масляный CAT 320", qty: 2, source: "Списание под ТО-2 (v103)", price: 18500 }
  ],

  // Реестр договоров (менеджер)
  contracts: [
    {
      id: "cnt_1",
      number: "Д-06/2026-11",
      companyName: "ТОО «АтырауНефть»",
      dateCreated: "2026-06-10",
      dateEnd: "2026-12-31",
      vehicleType: "Автокран, Экскаватор",
      plateNumber: "714 ADE 06, 8823 AT 06",
      ownerContact: "+7 701 456 1212 (Жолдасов Б.)",
      accountantContact: "+7 7122 35 44 12 (Гульсим)",
      isSubrent: false,
      status: "Активен"
    },
    {
      id: "cnt_2",
      number: "Д-05/2026-02",
      companyName: "ТОО «Каспий Спец Техника»",
      dateCreated: "2026-05-01",
      dateEnd: "2026-09-01",
      vehicleType: "Автокран (Grove 100t)",
      plateNumber: "109 MKA 02",
      ownerContact: "+7 701 888 2233 (Смаков А.)",
      accountantContact: "+7 7122 90 90 10 (Асель)",
      isSubrent: true,
      status: "Активен"
    }
  ]
};

// Запись в LocalStorage при первом запуске
if (!localStorage.getItem("kaz_bild_invest_db")) {
  localStorage.setItem("kaz_bild_invest_db", JSON.stringify(initialData));
}
