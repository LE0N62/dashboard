# Caso Práctico: NovaTech Retail México S.A. de C.V.

## 1. Planteamiento del Caso
**NovaTech Retail México** es una empresa distribuidora de equipamiento tecnológico con presencia nacional dividida en 5 regiones (*Centro, Norte, Occidente, Bajío y Sur*), 5 líneas de producto (*Laptops y Cómputo, Smartphones, Audio y Wearables, Hogar Inteligente y Accesorios*) y 4 canales comerciales (*Tienda Online, Venta Corporativa B2B, Sucursal Física y Marketplace*).

Durante el ejercicio 2026 (144 operaciones registradas), la dirección comercial detectó que, pese al crecimiento en ventas brutas durante el cuarto trimestre, la rentabilidad neta varía drásticamente según el canal de venta y la satisfacción del cliente cae cuando ocurren retrasos logísticos en zonas alejadas.

## 2. Arquitectura del Dashboard
1. **Panel de Consultas Rápidas (Filtros Visuales):** Permite segmentar simultáneamente por región, categoría, canal, trimestre, monto mínimo y búsqueda textual.
2. **Gráficas Personalizadas:**
   - *Evolución Mensual (Ingresos vs. Utilidad Neta):* Configurable en modo combinado (barras + línea), líneas con área o barras comparativas.
   - *Ingresos y Utilidad por Categoría:* Barras horizontales comparativas.
   - *Participación por Canal Comercial:* Gráfica de dona con cálculo porcentual.
   - *Desempeño Multidimensional por Región:* Configurable entre radar multidimensional y barras agrupadas, midiendo puntualidad de entrega, CSAT y margen neto.
   - Incluye selector de 4 paletas cromáticas, control de cuadrícula, modo claro/oscuro y descarga directa en PNG.
3. **Interpretación Dinámica de Resultados:** Bloque analítico que recalcula en tiempo real los líderes comerciales, brechas de rentabilidad y cuellos de botella logísticos conforme se aplican filtros.
4. **Consola de Consultas SQL:** Motor SQL integrado en el navegador sobre la tabla `ventas` con soporte para `SELECT`, funciones de agregación (`SUM`, `AVG`, `COUNT`, `MIN`, `MAX`), `WHERE` (`=`, `!=`, `>`, `<`, `>=`, `<=`, `LIKE`, `AND`, `OR`), `GROUP BY`, `ORDER BY` y `LIMIT`, más exportación a CSV.

## 3. Interpretación Ejecutiva de Resultados
- **Volumen vs. Margen por Categoría:** *Laptops y Cómputo* y *Smartphones* generan el mayor volumen de facturación por su alto ticket unitario, pero *Accesorios* y *Audio y Wearables* alcanzan márgenes netos superiores al 34%–42%. Estrategia recomendada: implementar paquetes *bundle* (laptop + docking station/audífonos) para elevar el margen consolidado por orden.
- **Rentabilidad por Canal:** La *Venta Corporativa B2B* y la *Tienda Online* ofrecen los mejores márgenes netos al evitar comisiones de intermediación. El *Marketplace* aporta alcance, pero erosiona el margen neto hasta en 6 puntos porcentuales, por lo que debe reservarse para productos de alta rotación o liquidación de inventario.
- **Correlación Logística y CSAT:** Existe una relación directa entre el tiempo de tránsito y la calificación del cliente. Mientras en *Centro* y *Bajío* las entregas de 1 a 3 días mantienen un CSAT superior a 4.5/5.0, los envíos con retraso (especialmente en *Sur* y picos de Q4) caen por debajo de 3.5/5.0. Se recomienda habilitar inventario de seguridad en un centro de distribución regional para el Sur y automatizar alertas tempranas de despacho.
