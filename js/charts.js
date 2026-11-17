// Módulo de Gráficas Personalizadas (Chart.js + Respaldo Canvas Nativo Offline)

const PALETAS_COLOR = {
  indigo: {
    nombre: "Índigo Ejecutivo",
    primary: "#4f46e5",
    primaryBg: "rgba(79, 70, 229, 0.22)",
    secondary: "#0ea5e9",
    secondaryBg: "rgba(14, 165, 233, 0.22)",
    accent: "#10b981",
    accentBg: "rgba(16, 185, 129, 0.22)",
    series: ["#4f46e5", "#0ea5e9", "#10b981", "#f59e0b", "#8b5cf6"]
  },
  emerald: {
    nombre: "Esmeralda Analítico",
    primary: "#059669",
    primaryBg: "rgba(5, 150, 105, 0.22)",
    secondary: "#0d9488",
    secondaryBg: "rgba(13, 148, 136, 0.22)",
    accent: "#f59e0b",
    accentBg: "rgba(245, 158, 11, 0.22)",
    series: ["#059669", "#0d9488", "#3b82f6", "#f59e0b", "#6366f1"]
  },
  sunset: {
    nombre: "Ámbar & Terracota",
    primary: "#ea580c",
    primaryBg: "rgba(234, 88, 12, 0.22)",
    secondary: "#d97706",
    secondaryBg: "rgba(217, 119, 6, 0.22)",
    accent: "#2563eb",
    accentBg: "rgba(37, 99, 235, 0.22)",
    series: ["#ea580c", "#d97706", "#2563eb", "#059669", "#dc2626"]
  },
  slate: {
    nombre: "Corporativo Pizarra",
    primary: "#334155",
    primaryBg: "rgba(51, 65, 85, 0.22)",
    secondary: "#0284c7",
    secondaryBg: "rgba(2, 132, 199, 0.22)",
    accent: "#16a34a",
    accentBg: "rgba(22, 163, 74, 0.22)",
    series: ["#334155", "#0284c7", "#16a34a", "#ca8a04", "#64748b"]
  }
};

class DashboardCharts {
  constructor() {
    this.instances = {};
    this.config = {
      paleta: "indigo",
      tipoTendencia: "combo", // 'combo' | 'line' | 'bar'
      tipoRegional: "radar",  // 'radar' | 'bar'
      mostrarCuadricula: true,
      posicionLeyenda: "top"
    };
  }

  actualizarConfig(nuevaConfig) {
    this.config = { ...this.config, ...nuevaConfig };
  }

  getPalette() {
    return PALETAS_COLOR[this.config.paleta] || PALETAS_COLOR.indigo;
  }

  isDarkMode() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }

  getTextColor() {
    return this.isDarkMode() ? "#cbd5e1" : "#334155";
  }

  getGridColor() {
    if (!this.config.mostrarCuadricula) return "transparent";
    return this.isDarkMode() ? "rgba(148, 163, 184, 0.14)" : "rgba(148, 163, 184, 0.25)";
  }

  destroyAll() {
    Object.values(this.instances).forEach(chart => {
      if (chart && typeof chart.destroy === "function") chart.destroy();
    });
    this.instances = {};
  }

  renderAll(filteredData) {
    if (typeof Chart === "undefined") {
      this.renderOfflineFallback(filteredData);
      return;
    }

    this.destroyAll();
    this.renderTendenciaMensual(filteredData);
    this.renderCategorias(filteredData);
    this.renderCanales(filteredData);
    this.renderRegional(filteredData);
  }

  // 1. Gráfica Personalizada: Evolución Mensual de Ingresos vs Utilidad
  renderTendenciaMensual(data) {
    const ctx = document.getElementById("chartTendencia");
    if (!ctx) return;

    const mesesOrden = [
      "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
      "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
    ];

    const mapMes = new Map();
    mesesOrden.forEach(m => mapMes.set(m, { ingresos: 0, utilidad: 0 }));

    data.forEach(r => {
      if (mapMes.has(r.mes)) {
        const entry = mapMes.get(r.mes);
        entry.ingresos += r.ingresos;
        entry.utilidad += r.utilidad;
      }
    });

    const labels = mesesOrden.map(m => m.slice(0, 3));
    const ingresos = mesesOrden.map(m => Math.round(mapMes.get(m).ingresos));
    const utilidad = mesesOrden.map(m => Math.round(mapMes.get(m).utilidad));
    const pal = this.getPalette();

    const isLine = this.config.tipoTendencia === "line";
    const isCombo = this.config.tipoTendencia === "combo";

    const datasets = [
      {
        label: "Ingresos Totales (MXN)",
        data: ingresos,
        type: isLine ? "line" : "bar",
        backgroundColor: isLine ? pal.primaryBg : pal.primary,
        borderColor: pal.primary,
        borderWidth: 2,
        borderRadius: isLine ? 0 : 6,
        fill: isLine,
        tension: 0.35,
        order: 2
      },
      {
        label: "Utilidad Neta (MXN)",
        data: utilidad,
        type: (isCombo || isLine) ? "line" : "bar",
        backgroundColor: pal.accentBg,
        borderColor: pal.accent,
        borderWidth: 3,
        pointRadius: 4,
        pointHoverRadius: 6,
        borderRadius: (!isCombo && !isLine) ? 6 : 0,
        fill: isLine,
        tension: 0.35,
        order: 1
      }
    ];

    this.instances.tendencia = new Chart(ctx, {
      type: isLine ? "line" : "bar",
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        interaction: { mode: "index", intersect: false },
        plugins: {
          legend: {
            position: this.config.posicionLeyenda,
            labels: { color: this.getTextColor(), usePointStyle: true, font: { family: "Inter, sans-serif", size: 12 } }
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: $${Number(context.raw).toLocaleString("es-MX")} MXN`
            }
          }
        },
        scales: {
          x: {
            ticks: { color: this.getTextColor() },
            grid: { color: this.getGridColor() }
          },
          y: {
            beginAtZero: true,
            ticks: {
              color: this.getTextColor(),
              callback: (val) => "$" + (val / 1000).toFixed(0) + "k"
            },
            grid: { color: this.getGridColor() }
          }
        }
      }
    });
  }

  // 2. Gráfica Personalizada: Ingresos y Margen por Categoría (Barras Horizontales)
  renderCategorias(data) {
    const ctx = document.getElementById("chartCategorias");
    if (!ctx) return;

    const mapCat = new Map();
    data.forEach(r => {
      if (!mapCat.has(r.categoria)) {
        mapCat.set(r.categoria, { ingresos: 0, utilidad: 0, count: 0 });
      }
      const c = mapCat.get(r.categoria);
      c.ingresos += r.ingresos;
      c.utilidad += r.utilidad;
      c.count += 1;
    });

    const sorted = Array.from(mapCat.entries()).sort((a, b) => b[1].ingresos - a[1].ingresos);
    const labels = sorted.map(s => s[0]);
    const ingresos = sorted.map(s => Math.round(s[1].ingresos));
    const utilidades = sorted.map(s => Math.round(s[1].utilidad));
    const pal = this.getPalette();

    this.instances.categorias = new Chart(ctx, {
      type: "bar",
      data: {
        labels,
        datasets: [
          {
            label: "Ingresos (MXN)",
            data: ingresos,
            backgroundColor: pal.primary,
            borderRadius: 6
          },
          {
            label: "Utilidad Neta (MXN)",
            data: utilidades,
            backgroundColor: pal.accent,
            borderRadius: 6
          }
        ]
      },
      options: {
        indexAxis: "y",
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: this.config.posicionLeyenda,
            labels: { color: this.getTextColor(), usePointStyle: true }
          },
          tooltip: {
            callbacks: {
              label: (context) => `${context.dataset.label}: $${Number(context.raw).toLocaleString("es-MX")} MXN`
            }
          }
        },
        scales: {
          x: {
            beginAtZero: true,
            ticks: {
              color: this.getTextColor(),
              callback: (val) => "$" + (val / 1000).toFixed(0) + "k"
            },
            grid: { color: this.getGridColor() }
          },
          y: {
            ticks: { color: this.getTextColor() },
            grid: { display: false }
          }
        }
      }
    });
  }

  // 3. Gráfica Personalizada: Participación por Canal Comercial (Dona)
  renderCanales(data) {
    const ctx = document.getElementById("chartCanales");
    if (!ctx) return;

    const mapCanal = new Map();
    data.forEach(r => {
      mapCanal.set(r.canal, (mapCanal.get(r.canal) || 0) + r.ingresos);
    });

    const sorted = Array.from(mapCanal.entries()).sort((a, b) => b[1] - a[1]);
    const labels = sorted.map(s => s[0]);
    const values = sorted.map(s => Math.round(s[1]));
    const total = values.reduce((a, b) => a + b, 0) || 1;
    const pal = this.getPalette();

    this.instances.canales = new Chart(ctx, {
      type: "doughnut",
      data: {
        labels,
        datasets: [
          {
            data: values,
            backgroundColor: pal.series,
            borderWidth: 2,
            borderColor: this.isDarkMode() ? "#1e293b" : "#ffffff",
            hoverOffset: 8
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: "62%",
        plugins: {
          legend: {
            position: "bottom",
            labels: { color: this.getTextColor(), usePointStyle: true, padding: 14 }
          },
          tooltip: {
            callbacks: {
              label: (context) => {
                const val = Number(context.raw);
                const pct = ((val / total) * 100).toFixed(1);
                return `${context.label}: $${val.toLocaleString("es-MX")} MXN (${pct}%)`;
              }
            }
          }
        }
      }
    });
  }

  // 4. Gráfica Personalizada: Desempeño Multidimensional por Región (Radar / Barras)
  renderRegional(data) {
    const ctx = document.getElementById("chartRegional");
    if (!ctx) return;

    const regionesLista = ["Centro", "Norte", "Occidente", "Bajío", "Sur"];
    const stats = regionesLista.map(reg => {
      const subset = data.filter(r => r.region === reg);
      if (subset.length === 0) {
        return { reg, margen: 0, csatPct: 0, puntualidad: 0 };
      }
      const margen = subset.reduce((s, r) => s + r.margen_pct, 0) / subset.length;
      const csat = subset.reduce((s, r) => s + r.satisfaccion, 0) / subset.length;
      const puntuales = subset.filter(r => r.entrega_a_tiempo === "Sí").length;
      const puntualidad = (puntuales / subset.length) * 100;
      return {
        reg,
        margen: Number(margen.toFixed(1)),
        csatPct: Number(((csat / 5) * 100).toFixed(1)),
        puntualidad: Number(puntualidad.toFixed(1))
      };
    });

    const pal = this.getPalette();
    const isRadar = this.config.tipoRegional === "radar";

    this.instances.regional = new Chart(ctx, {
      type: isRadar ? "radar" : "bar",
      data: {
        labels: stats.map(s => s.reg),
        datasets: [
          {
            label: "Puntualidad de Entrega (%)",
            data: stats.map(s => s.puntualidad),
            backgroundColor: pal.primaryBg,
            borderColor: pal.primary,
            borderWidth: 2,
            pointBackgroundColor: pal.primary
          },
          {
            label: "Satisfacción CSAT (Escala 100%)",
            data: stats.map(s => s.csatPct),
            backgroundColor: pal.accentBg,
            borderColor: pal.accent,
            borderWidth: 2,
            pointBackgroundColor: pal.accent
          },
          {
            label: "Margen Neto Promedio (%)",
            data: stats.map(s => s.margen),
            backgroundColor: pal.secondaryBg,
            borderColor: pal.secondary,
            borderWidth: 2,
            pointBackgroundColor: pal.secondary
          }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: this.config.posicionLeyenda,
            labels: { color: this.getTextColor(), usePointStyle: true }
          }
        },
        scales: isRadar
          ? {
              r: {
                beginAtZero: true,
                max: 100,
                ticks: { color: this.getTextColor(), backdropColor: "transparent", stepSize: 25 },
                grid: { color: this.getGridColor() },
                pointLabels: { color: this.getTextColor(), font: { size: 12, weight: "600" } }
              }
            }
          : {
              x: { ticks: { color: this.getTextColor() }, grid: { color: this.getGridColor() } },
              y: { beginAtZero: true, max: 100, ticks: { color: this.getTextColor() }, grid: { color: this.getGridColor() } }
            }
      }
    });
  }

  exportChartPNG(canvasId, filename) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    const link = document.createElement("a");
    link.download = filename || `${canvasId}.png`;
    link.href = canvas.toDataURL("image/png", 1.0);
    link.click();
  }

  // Respaldo por si se abre sin conexión a Internet
  renderOfflineFallback(data) {
    ["chartTendencia", "chartCategorias", "chartCanales", "chartRegional"].forEach(id => {
      const canvas = document.getElementById(id);
      if (!canvas) return;
      const ctx = canvas.getContext("2d");
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = "#64748b";
      ctx.font = "14px sans-serif";
      ctx.fillText(`Modo sin conexión (${data.length} registros activos). Conecta a internet para ver Chart.js interactivo.`, 16, 40);
    });
  }
}
