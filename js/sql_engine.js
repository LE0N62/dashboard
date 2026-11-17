// Motor de Consultas SQL en el Navegador para el Caso Práctico NovaTech
// Soporta: SELECT, funciones de agregación (SUM, AVG, COUNT, MIN, MAX), AS, WHERE (=, !=, >, <, >=, <=, LIKE, AND, OR), GROUP BY, ORDER BY, LIMIT

const SQL_PRESETS = [
  {
    titulo: "1. Rentabilidad por Categoría",
    descripcion: "Agrupa ingresos, utilidad y margen promedio por categoría de producto.",
    query: "SELECT categoria, COUNT(*) AS pedidos, SUM(ingresos) AS ingresos_totales, SUM(utilidad) AS utilidad_neta, AVG(margen_pct) AS margen_promedio FROM ventas GROUP BY categoria ORDER BY utilidad_neta DESC"
  },
  {
    titulo: "2. Desempeño por Canal Comercial",
    descripcion: "Compara volumen de ventas y margen real entre canales (Online, B2B, Sucursal, Marketplace).",
    query: "SELECT canal, COUNT(*) AS operaciones, SUM(cantidad) AS unidades, SUM(ingresos) AS ingresos, AVG(margen_pct) AS margen_pct FROM ventas GROUP BY canal ORDER BY ingresos DESC"
  },
  {
    titulo: "3. Análisis Logístico por Región",
    descripcion: "Evalúa tiempo promedio de entrega y satisfacción del cliente (CSAT) por región.",
    query: "SELECT region, COUNT(*) AS envios, AVG(dias_entrega) AS dias_promedio, AVG(satisfaccion) AS csat_promedio, SUM(ingresos) AS ingresos FROM ventas GROUP BY region ORDER BY csat_promedio DESC"
  },
  {
    titulo: "4. Ventas Corporativas B2B > $30,000",
    descripcion: "Filtra operaciones B2B de alto valor ordenadas por utilidad.",
    query: "SELECT id, fecha, region, producto, cliente, cantidad, ingresos, utilidad FROM ventas WHERE canal = 'Venta Corporativa B2B' AND ingresos > 30000 ORDER BY utilidad DESC"
  },
  {
    titulo: "5. Alertas: Entregas Tardías o Baja Satisfacción",
    descripcion: "Detecta pedidos con retraso logístico o calificación menor a 4.0.",
    query: "SELECT id, fecha, region, canal, producto, dias_entrega, entrega_a_tiempo, satisfaccion FROM ventas WHERE entrega_a_tiempo = 'No' OR satisfaccion < 4.0 ORDER BY satisfaccion ASC LIMIT 20"
  },
  {
    titulo: "6. Top 10 Ventas Más Altas del Año",
    descripcion: "Muestra las 10 transacciones con mayor ingreso registrado.",
    query: "SELECT id, fecha, trimestre, region, categoria, producto, canal, ingresos, utilidad, margen_pct FROM ventas ORDER BY ingresos DESC LIMIT 10"
  }
];

function ejecutarConsultaSQL(rawQuery, dataset) {
  const t0 = performance.now();
  const cleanQuery = rawQuery.trim().replace(/;+$/, "").replace(/\s+/g, " ");

  if (!cleanQuery.toUpperCase().startsWith("SELECT ")) {
    throw new Error("La consulta debe comenzar con la cláusula SELECT.");
  }

  // Extraer cláusulas principales mediante regex tolerante a mayúsculas/minúsculas
  const regex = /^SELECT\s+(.+?)\s+FROM\s+([a-zA-Z0-9_]+)(?:\s+WHERE\s+(.+?))?(?:\s+GROUP\s+BY\s+(.+?))?(?:\s+ORDER\s+BY\s+(.+?))?(?:\s+LIMIT\s+(\d+))?$/i;
  const match = cleanQuery.match(regex);

  if (!match) {
    throw new Error("Sintaxis SQL no reconocida. Verifica el orden: SELECT ... FROM ventas [WHERE ...] [GROUP BY ...] [ORDER BY ...] [LIMIT N]");
  }

  const [, selectPart, tableName, wherePart, groupByPart, orderByPart, limitPart] = match;

  if (tableName.toLowerCase() !== "ventas") {
    throw new Error(`Tabla '${tableName}' no encontrada. Usa la tabla 'ventas'.`);
  }

  // 1. Filtrado WHERE
  let rows = [...dataset];
  if (wherePart) {
    rows = rows.filter(row => evaluarWhere(row, wherePart));
  }

  // Parsear columnas del SELECT
  const selectFields = splitTopLevel(selectPart, ",").map(f => parseSelectField(f.trim()));
  const hasAggregates = selectFields.some(f => f.agg !== null);

  let resultRows = [];

  // 2. Agrupación GROUP BY o Agregación Global
  if (groupByPart || hasAggregates) {
    const groupCols = groupByPart
      ? splitTopLevel(groupByPart, ",").map(c => c.trim())
      : ["__ALL__"];

    const groups = new Map();
    for (const row of rows) {
      const key = groupCols.map(col => (col === "__ALL__" ? "ALL" : String(row[col]))).join("|||");
      if (!groups.has(key)) {
        groups.set(key, []);
      }
      groups.get(key).push(row);
    }

    for (const [, groupRows] of groups.entries()) {
      const outRow = {};
      for (const field of selectFields) {
        if (field.raw === "*") {
          Object.assign(outRow, groupRows[0]);
        } else if (!field.agg) {
          outRow[field.alias] = groupRows[0][field.col];
        } else {
          outRow[field.alias] = calcularAgregacion(field.agg, field.col, groupRows);
        }
      }
      resultRows.push(outRow);
    }
  } else {
    // Proyección simple sin agrupación
    resultRows = rows.map(row => {
      const outRow = {};
      for (const field of selectFields) {
        if (field.raw === "*") {
          Object.assign(outRow, row);
        } else {
          if (!(field.col in row)) {
            throw new Error(`Columna '${field.col}' no existe en la tabla 'ventas'.`);
          }
          outRow[field.alias] = row[field.col];
        }
      }
      return outRow;
    });
  }

  // 3. Ordenamiento ORDER BY
  if (orderByPart) {
    const orderSpecs = splitTopLevel(orderByPart, ",").map(item => {
      const parts = item.trim().split(/\s+/);
      return {
        col: parts[0],
        dir: (parts[1] && parts[1].toUpperCase() === "DESC") ? -1 : 1
      };
    });

    resultRows.sort((a, b) => {
      for (const spec of orderSpecs) {
        const valA = a[spec.col];
        const valB = b[spec.col];
        if (valA === valB) continue;
        if (valA === undefined || valA === null) return 1;
        if (valB === undefined || valB === null) return -1;
        if (typeof valA === "number" && typeof valB === "number") {
          return (valA - valB) * spec.dir;
        }
        return String(valA).localeCompare(String(valB), "es") * spec.dir;
      }
      return 0;
    });
  }

  // 4. Límite LIMIT
  if (limitPart) {
    const limitNum = parseInt(limitPart, 10);
    resultRows = resultRows.slice(0, limitNum);
  }

  const t1 = performance.now();
  return {
    rows: resultRows,
    columns: resultRows.length > 0 ? Object.keys(resultRows[0]) : selectFields.map(f => f.alias),
    rowCount: resultRows.length,
    executionMs: (t1 - t0).toFixed(2)
  };
}

function splitTopLevel(str, delimiter) {
  const parts = [];
  let current = "";
  let inQuotes = false;
  let quoteChar = "";
  let parenDepth = 0;

  for (let i = 0; i < str.length; i++) {
    const ch = str[i];
    if ((ch === "'" || ch === '"') && !inQuotes) {
      inQuotes = true;
      quoteChar = ch;
    } else if (ch === quoteChar && inQuotes) {
      inQuotes = false;
    } else if (!inQuotes) {
      if (ch === "(") parenDepth++;
      else if (ch === ")") parenDepth--;
    }

    if (!inQuotes && parenDepth === 0 && str.slice(i, i + delimiter.length).toUpperCase() === delimiter.toUpperCase()) {
      parts.push(current);
      current = "";
      i += delimiter.length - 1;
    } else {
      current += ch;
    }
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function parseSelectField(expr) {
  // Soporta: col, col AS alias, FUNC(col), FUNC(col) AS alias
  const asMatch = expr.match(/^(.+?)\s+AS\s+([a-zA-Z0-9_]+)$/i);
  const core = asMatch ? asMatch[1].trim() : expr.trim();
  const explicitAlias = asMatch ? asMatch[2].trim() : null;

  const funcMatch = core.match(/^(SUM|AVG|COUNT|MIN|MAX)\s*\(\s*(\*|[a-zA-Z0-9_]+)\s*\)$/i);
  if (funcMatch) {
    const agg = funcMatch[1].toUpperCase();
    const col = funcMatch[2];
    const defaultAlias = `${agg.toLowerCase()}_${col === "*" ? "total" : col}`;
    return {
      raw: expr,
      agg,
      col,
      alias: explicitAlias || defaultAlias
    };
  }

  return {
    raw: expr,
    agg: null,
    col: core,
    alias: explicitAlias || core
  };
}

function calcularAgregacion(agg, col, rows) {
  if (agg === "COUNT") {
    return rows.length;
  }
  const nums = rows.map(r => Number(r[col])).filter(n => !isNaN(n));
  if (nums.length === 0) return 0;

  if (agg === "SUM") {
    return Number(nums.reduce((a, b) => a + b, 0).toFixed(2));
  }
  if (agg === "AVG") {
    return Number((nums.reduce((a, b) => a + b, 0) / nums.length).toFixed(2));
  }
  if (agg === "MIN") {
    return Math.min(...nums);
  }
  if (agg === "MAX") {
    return Math.max(...nums);
  }
  return 0;
}

function evaluarWhere(row, whereClause) {
  // Divide por OR de nivel superior, luego por AND
  const orGroups = splitTopLevel(whereClause, " OR ");
  return orGroups.some(orPart => {
    const andConditions = splitTopLevel(orPart, " AND ");
    return andConditions.every(cond => evaluarCondicionSimple(row, cond.trim()));
  });
}

function evaluarCondicionSimple(row, cond) {
  const opMatch = cond.match(/^([a-zA-Z0-9_]+)\s*(=|!=|<>|>=|<=|>|<|LIKE)\s*(.+)$/i);
  if (!opMatch) {
    throw new Error(`Condición WHERE inválida: '${cond}'`);
  }
  const [, col, rawOp, rawVal] = opMatch;
  if (!(col in row)) {
    throw new Error(`Columna '${col}' no encontrada en WHERE.`);
  }

  const op = rawOp.toUpperCase();
  const cellVal = row[col];
  let targetVal = rawVal.trim();

  if ((targetVal.startsWith("'") && targetVal.endsWith("'")) || (targetVal.startsWith('"') && targetVal.endsWith('"'))) {
    targetVal = targetVal.slice(1, -1);
  } else if (!isNaN(Number(targetVal))) {
    targetVal = Number(targetVal);
  }

  switch (op) {
    case "=":
      return String(cellVal).toLowerCase() === String(targetVal).toLowerCase();
    case "!=":
    case "<>":
      return String(cellVal).toLowerCase() !== String(targetVal).toLowerCase();
    case ">":
      return Number(cellVal) > Number(targetVal);
    case "<":
      return Number(cellVal) < Number(targetVal);
    case ">=":
      return Number(cellVal) >= Number(targetVal);
    case "<=":
      return Number(cellVal) <= Number(targetVal);
    case "LIKE": {
      const pattern = "^" + String(targetVal).replace(/[.*+?^${}()|[\]\\]/g, "\\$&").replace(/%/g, ".*") + "$";
      return new RegExp(pattern, "i").test(String(cellVal));
    }
    default:
      return false;
  }
}
