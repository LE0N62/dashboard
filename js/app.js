// Controlador Principal del Dashboard Analítico — Caso Práctico NovaTech Retail México

document.addEventListener("DOMContentLoaded", () => {
  const chartsManager = new DashboardCharts();
  let filteredData = [...VENTAS_DATA];
  let currentPage = 1;
  const rowsPerPage = 12;
  let lastSqlResult = null;

  // Elementos de Filtro Visual
  const filterRegion = document.getElementById("filterRegion");
  const filterCategoria = document.getElementById("filterCategoria");
  const filterCanal = document.getElementById("filterCanal");
  const filterTrimestre = document.getElementById("filterTrimestre");
  const filterMinMonto = document.getElementById("filterMinMonto");
  const filterSearch = document.getElementById("filterSearch");
  const btnResetFilters = document.getElementById("btnResetFilters");

  // Elementos de Personalización de Gráficas
  const cfgPaleta = document.getElementById("cfgPaleta");
  const cfgTipoTendencia = document.getElementById("cfgTipoTendencia");
  const cfgTipoRegional = document.getElementById("cfgTipoRegional");
  const cfgCuadricula = document.getElementById("cfgCuadricula");
  const btnThemeToggle = document.getElementById("btnThemeToggle");

  // Inicializar opciones de selectores
  function initFilterOptions() {
    const regiones = [...new Set(VENTAS_DATA.map(r => r.region))].sort();
    const categorias = [...new Set(VENTAS_DATA.map(r => r.categoria))].sort();
    const canales = [...new Set(VENTAS_DATA.map(r => r.canal))].sort();

    regiones.forEach(reg => filterRegion.add(new Option(reg, reg)));
    categorias.forEach(cat => filterCategoria.add(new Option(cat, cat)));
    canales.forEach(can => filterCanal.add(new Option(can, can)));
  }

  // Aplicar filtros visuales
  function aplicarFiltros() {
    const regVal = filterRegion.value;
    const catVal = filterCategoria.value;
    const canVal = filterCanal.value;
    const triVal = filterTrimestre.value;
    const minVal = parseFloat(filterMinMonto.value) || 0;
    const searchVal = filterSearch.value.trim().toLowerCase();

    filteredData = VENTAS_DATA.filter(row => {
      if (regVal !== "ALL" && row.region !== regVal) return false;
      if (catVal !== "ALL" && row.categoria !== catVal) return false;
      if (canVal !== "ALL" && row.canal !== canVal) return false;
      if (triVal !== "ALL" && row.trimestre !== triVal) return false;
      if (row.ingresos < minVal) return false;
      if (searchVal) {
        const haystack = `${row.id} ${row.producto} ${row.cliente} ${row.region} ${row.categoria}`.toLowerCase();
        if (!haystack.includes(searchVal)) return false;
      }
      return true;
    });

    currentPage = 1;
    actualizarKPIs();
    chartsManager.renderAll(filteredData);
    actualizarInterpretacionDinamica();
    renderTablaDatos();
  }

  // Calcular y actualizar KPIs
  function actualizarKPIs() {
    const totalIngresos = filteredData.reduce((acc, r) => acc + r.ingresos, 0);
    const totalUtilidad = filteredData.reduce((acc, r) => acc + r.utilidad, 0);
    const totalPedidos = filteredData.length;
    const totalUnidades = filteredData.reduce((acc, r) => acc + r.cantidad, 0);
    const margenProm = totalIngresos > 0 ? (totalUtilidad / totalIngresos) * 100 : 0;
    const ticketProm = totalPedidos > 0 ? totalIngresos / totalPedidos : 0;
    const csatProm = totalPedidos > 0
      ? filteredData.reduce((acc, r) => acc + r.satisfaccion, 0) / totalPedidos
      : 0;
    const puntuales = filteredData.filter(r => r.entrega_a_tiempo === "Sí").length;
    const puntualidadPct = totalPedidos > 0 ? (puntuales / totalPedidos) * 100 : 0;

    document.getElementById("kpiIngresos").textContent = formatCurrency(totalIngresos);
    document.getElementById("kpiIngresosSub").textContent = `${totalPedidos} operaciones (${totalUnidades} uds.)`;

    document.getElementById("kpiUtilidad").textContent = formatCurrency(totalUtilidad);
    document.getElementById("kpiUtilidadSub").textContent = `Margen neto real: ${margenProm.toFixed(1)}%`;

    document.getElementById("kpiTicket").textContent = formatCurrency(ticketProm);
    document.getElementById("kpiTicketSub").textContent = `Promedio por orden filtrada`;

    document.getElementById("kpiCsat").textContent = `${csatProm.toFixed(2)} / 5.0`;
    document.getElementById("kpiCsatSub").textContent = `Puntualidad logística: ${puntualidadPct.toFixed(1)}%`;

    document.getElementById("badgeRegistrosActivos").textContent = `${totalPedidos} de ${VENTAS_DATA.length} registros activos`;
  }

  // Generar Interpretación Automática de Resultados en tiempo real
  function actualizarInterpretacionDinamica() {
    const container = document.getElementById("interpretacionDinamicaContainer");
    if (!container) return;

    if (filteredData.length === 0) {
      container.innerHTML = `
        <div class="insight-card warning">
          <h4>⚠️ Sin datos para interpretar</h4>
          <p>Los filtros actuales no arrojan registros. Ajusta los criterios de búsqueda o haz clic en <strong>Restablecer Filtros</strong>.</p>
        </div>
      `;
      return;
    }

    // 1. Categoría líder en ingresos vs categoría líder en margen
    const catStats = {};
    filteredData.forEach(r => {
      if (!catStats[r.categoria]) catStats[r.categoria] = { ingresos: 0, utilidad: 0, count: 0 };
      catStats[r.categoria].ingresos += r.ingresos;
      catStats[r.categoria].utilidad += r.utilidad;
      catStats[r.categoria].count += 1;
    });
    const catList = Object.entries(catStats).map(([nombre, st]) => ({
      nombre,
      ingresos: st.ingresos,
      utilidad: st.utilidad,
      margen: st.ingresos > 0 ? (st.utilidad / st.ingresos) * 100 : 0
    }));
    const topCatIngresos = [...catList].sort((a, b) => b.ingresos - a.ingresos)[0];
    const topCatMargen = [...catList].sort((a, b) => b.margen - a.margen)[0];

    // 2. Canal más rentable
    const canalStats = {};
    filteredData.forEach(r => {
      if (!canalStats[r.canal]) canalStats[r.canal] = { ingresos: 0, utilidad: 0 };
      canalStats[r.canal].ingresos += r.ingresos;
      canalStats[r.canal].utilidad += r.utilidad;
    });
    const canalList = Object.entries(canalStats).map(([nombre, st]) => ({
      nombre,
      ingresos: st.ingresos,
      margen: st.ingresos > 0 ? (st.utilidad / st.ingresos) * 100 : 0
    }));
    const topCanal = [...canalList].sort((a, b) => b.ingresos - a.ingresos)[0];
    const lowMarginCanal = [...canalList].sort((a, b) => a.margen - b.margen)[0];

    // 3. Región con mejor y menor desempeño logístico
    const regStats = {};
    filteredData.forEach(r => {
      if (!regStats[r.region]) regStats[r.region] = { csatSum: 0, diasSum: 0, count: 0, ingresos: 0 };
      regStats[r.region].csatSum += r.satisfaccion;
      regStats[r.region].diasSum += r.dias_entrega;
      regStats[r.region].ingresos += r.ingresos;
      regStats[r.region].count += 1;
    });
    const regList = Object.entries(regStats).map(([nombre, st]) => ({
      nombre,
      csat: st.csatSum / st.count,
      dias: st.diasSum / st.count,
      ingresos: st.ingresos
    }));
    const bestRegion = [...regList].sort((a, b) => b.ingresos - a.ingresos)[0];
    const riskRegion = [...regList].sort((a, b) => a.csat - b.csat)[0];

    container.innerHTML = `
      <div class="insight-card primary">
        <div class="insight-badge">1. Liderazgo Comercial</div>
        <h4>Motor de Ingresos y Rentabilidad</h4>
        <p>
          La categoría <strong>${topCatIngresos.nombre}</strong> lidera la facturación con
          <strong>${formatCurrency(topCatIngresos.ingresos)}</strong>, mientras que
          <strong>${topCatMargen.nombre}</strong> aporta el mayor margen neto promedio
          (<strong>${topCatMargen.margen.toFixed(1)}%</strong>). Se recomienda implementar estrategias de
          venta cruzada (<em>cross-selling</em>) combinando ambos segmentos.
        </p>
      </div>

      <div class="insight-card success">
        <div class="insight-badge">2. Eficiencia por Canal</div>
        <h4>Comparativa de Canales de Venta</h4>
        <p>
          El canal <strong>${topCanal.nombre}</strong> concentra el mayor volumen de ingresos
          (<strong>${formatCurrency(topCanal.ingresos)}</strong>, margen del <strong>${topCanal.margen.toFixed(1)}%</strong>).
          ${lowMarginCanal && lowMarginCanal.nombre !== topCanal.nombre
            ? `En contraste, <strong>${lowMarginCanal.nombre}</strong> presenta el margen más ajustado (<strong>${lowMarginCanal.margen.toFixed(1)}%</strong>) debido a comisiones y costos operativos.`
            : `Mantener incentivos digitales fortalecerá la conversión recurrente.`}
        </p>
      </div>

      <div class="insight-card warning">
        <div class="insight-badge">3. Diagnóstico Logístico y CSAT</div>
        <h4>Desempeño Regional y Cuellos de Botella</h4>
        <p>
          La región <strong>${bestRegion.nombre}</strong> encabeza las ventas con
          <strong>${formatCurrency(bestRegion.ingresos)}</strong>. Por otro lado, la región
          <strong>${riskRegion.nombre}</strong> registra un tiempo promedio de entrega de
          <strong>${riskRegion.dias.toFixed(1)} días</strong> y una satisfacción CSAT de
          <strong>${riskRegion.csat.toFixed(2)}/5.0</strong>, lo que evidencia la necesidad de optimizar
          centros de distribución locales.
        </p>
      </div>
    `;
  }

  // Renderizar tabla paginada de datos filtrados
  function renderTablaDatos() {
    const tbody = document.getElementById("tablaDatosBody");
    const pageInfo = document.getElementById("pageInfo");
    const totalPages = Math.max(1, Math.ceil(filteredData.length / rowsPerPage));
    if (currentPage > totalPages) currentPage = totalPages;

    const start = (currentPage - 1) * rowsPerPage;
    const slice = filteredData.slice(start, start + rowsPerPage);

    tbody.innerHTML = slice.map(r => `
      <tr>
        <td><strong>${r.id}</strong></td>
        <td>${r.fecha}</td>
        <td><span class="tag">${r.region}</span></td>
        <td>${r.categoria}</td>
        <td>${r.producto}</td>
        <td>${r.canal}</td>
        <td class="num">${r.cantidad}</td>
        <td class="num">${formatCurrency(r.ingresos)}</td>
        <td class="num ${r.utilidad >= 0 ? "text-pos" : "text-neg"}">${formatCurrency(r.utilidad)}</td>
        <td class="num">${r.margen_pct.toFixed(1)}%</td>
        <td class="center">
          <span class="status-pill ${r.entrega_a_tiempo === "Sí" ? "ok" : "late"}">
            ${r.entrega_a_tiempo === "Sí" ? "A tiempo" : "Retraso"} (${r.dias_entrega}d)
          </span>
        </td>
        <td class="num">⭐ ${r.satisfaccion.toFixed(1)}</td>
      </tr>
    `).join("");

    pageInfo.textContent = `Página ${currentPage} de ${totalPages} (${filteredData.length} registros)`;
    document.getElementById("btnPrevPage").disabled = currentPage <= 1;
    document.getElementById("btnNextPage").disabled = currentPage >= totalPages;
  }

  // Consola SQL Interactiva
  function initSqlConsole() {
    const presetsContainer = document.getElementById("sqlPresetsContainer");
    const sqlInput = document.getElementById("sqlQueryInput");
    const btnRunSql = document.getElementById("btnRunSql");
    const btnExportSqlCsv = document.getElementById("btnExportSqlCsv");

    SQL_PRESETS.forEach((preset, idx) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "preset-btn";
      btn.innerHTML = `<strong>${preset.titulo}</strong><span>${preset.descripcion}</span>`;
      btn.addEventListener("click", () => {
        sqlInput.value = preset.query;
        runSqlQuery();
      });
      presetsContainer.appendChild(btn);

      if (idx === 0) {
        sqlInput.value = preset.query;
      }
    });

    btnRunSql.addEventListener("click", runSqlQuery);
    sqlInput.addEventListener("keydown", (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        runSqlQuery();
      }
    });

    btnExportSqlCsv.addEventListener("click", () => {
      if (!lastSqlResult || lastSqlResult.rows.length === 0) return;
      descargarCSV(lastSqlResult.rows, "consulta_sql_novatech.csv");
    });

    // Ejecutar consulta inicial por defecto
    runSqlQuery();
  }

  function runSqlQuery() {
    const query = document.getElementById("sqlQueryInput").value;
    const statusEl = document.getElementById("sqlStatus");
    const headEl = document.getElementById("sqlResultHead");
    const bodyEl = document.getElementById("sqlResultBody");
    const btnExport = document.getElementById("btnExportSqlCsv");

    try {
      const res = ejecutarConsultaSQL(query, VENTAS_DATA);
      lastSqlResult = res;
      statusEl.className = "sql-status success";
      statusEl.textContent = `✅ Consulta ejecutada en ${res.executionMs} ms — ${res.rowCount} fila(s) devuelta(s).`;
      btnExport.disabled = res.rowCount === 0;

      headEl.innerHTML = `<tr>${res.columns.map(col => `<th>${col}</th>`).join("")}</tr>`;
      if (res.rowCount === 0) {
        bodyEl.innerHTML = `<tr><td colspan="${res.columns.length}" class="center">La consulta no devolvió resultados.</td></tr>`;
      } else {
        bodyEl.innerHTML = res.rows.map(row => `
          <tr>
            ${res.columns.map(col => {
              const val = row[col];
              const isMoney = typeof val === "number" && /ingreso|utilidad|costo|precio/i.test(col);
              const formatted = isMoney
                ? formatCurrency(val)
                : (typeof val === "number" && !Number.isInteger(val) ? val.toFixed(2) : val);
              return `<td class="${typeof val === "number" ? "num" : ""}">${formatted}</td>`;
            }).join("")}
          </tr>
        `).join("");
      }
    } catch (err) {
      lastSqlResult = null;
      btnExport.disabled = true;
      statusEl.className = "sql-status error";
      statusEl.textContent = `❌ Error SQL: ${err.message}`;
      headEl.innerHTML = "";
      bodyEl.innerHTML = "";
    }
  }

  // Utilidades
  function formatCurrency(val) {
    return "$" + Number(val).toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function descargarCSV(rows, filename) {
    if (!rows || rows.length === 0) return;
    const cols = Object.keys(rows[0]);
    const csvLines = [
      cols.join(","),
      ...rows.map(r => cols.map(c => `"${String(r[c] ?? "").replace(/"/g, '""')}"`).join(","))
    ];
    const blob = new Blob(["\uFEFF" + csvLines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  // Listeners de Filtros
  [filterRegion, filterCategoria, filterCanal, filterTrimestre].forEach(el => {
    el.addEventListener("change", aplicarFiltros);
  });
  [filterMinMonto, filterSearch].forEach(el => {
    el.addEventListener("input", aplicarFiltros);
  });

  btnResetFilters.addEventListener("click", () => {
    filterRegion.value = "ALL";
    filterCategoria.value = "ALL";
    filterCanal.value = "ALL";
    filterTrimestre.value = "ALL";
    filterMinMonto.value = "";
    filterSearch.value = "";
    aplicarFiltros();
  });

  // Listeners de Personalización de Gráficas
  cfgPaleta.addEventListener("change", () => {
    chartsManager.actualizarConfig({ paleta: cfgPaleta.value });
    chartsManager.renderAll(filteredData);
  });
  cfgTipoTendencia.addEventListener("change", () => {
    chartsManager.actualizarConfig({ tipoTendencia: cfgTipoTendencia.value });
    chartsManager.renderAll(filteredData);
  });
  cfgTipoRegional.addEventListener("change", () => {
    chartsManager.actualizarConfig({ tipoRegional: cfgTipoRegional.value });
    chartsManager.renderAll(filteredData);
  });
  cfgCuadricula.addEventListener("change", () => {
    chartsManager.actualizarConfig({ mostrarCuadricula: cfgCuadricula.checked });
    chartsManager.renderAll(filteredData);
  });

  // Botones de Exportar Gráfica PNG
  document.querySelectorAll("[data-export-chart]").forEach(btn => {
    btn.addEventListener("click", () => {
      const targetId = btn.getAttribute("data-export-chart");
      chartsManager.exportChartPNG(targetId, `${targetId}_novatech.png`);
    });
  });

  // Paginación Tabla Principal
  document.getElementById("btnPrevPage").addEventListener("click", () => {
    if (currentPage > 1) {
      currentPage--;
      renderTablaDatos();
    }
  });
  document.getElementById("btnNextPage").addEventListener("click", () => {
    const totalPages = Math.ceil(filteredData.length / rowsPerPage);
    if (currentPage < totalPages) {
      currentPage++;
      renderTablaDatos();
    }
  });
  document.getElementById("btnExportFilteredCsv").addEventListener("click", () => {
    descargarCSV(filteredData, "datos_filtrados_novatech.csv");
  });

  // Modo Claro / Oscuro
  btnThemeToggle.addEventListener("click", () => {
    const isDark = document.documentElement.getAttribute("data-theme") === "dark";
    document.documentElement.setAttribute("data-theme", isDark ? "light" : "dark");
    btnThemeToggle.textContent = isDark ? "🌙 Modo Oscuro" : "☀️ Modo Claro";
    chartsManager.renderAll(filteredData);
  });

  // Arranque Inicial
  initFilterOptions();
  aplicarFiltros();
  initSqlConsole();
});
