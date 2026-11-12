const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

async function inicializarBaseDeDatos() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sucursales (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL,
          ciudad VARCHAR(100) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS empleados (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL,
          departamento VARCHAR(50) NOT NULL,
          salario NUMERIC(10, 2) NOT NULL,
          sucursal_id INT REFERENCES sucursales(id)
      );

      CREATE TABLE IF NOT EXISTS productos (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL,
          categoria VARCHAR(50) NOT NULL,
          stock INT NOT NULL,
          precio NUMERIC(10, 2) NOT NULL
      );

      CREATE TABLE IF NOT EXISTS clientes (
          id SERIAL PRIMARY KEY,
          nombre VARCHAR(100) NOT NULL,
          correo VARCHAR(100) UNIQUE NOT NULL
      );

      CREATE TABLE IF NOT EXISTS ventas (
          id SERIAL PRIMARY KEY,
          cliente_id INT REFERENCES clientes(id),
          sucursal_id INT REFERENCES sucursales(id),
          metodo_pago VARCHAR(50) NOT NULL,
          fecha TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS detalle_ventas (
          id SERIAL PRIMARY KEY,
          venta_id INT REFERENCES ventas(id),
          producto_id INT REFERENCES productos(id),
          cantidad INT NOT NULL,
          subtotal NUMERIC(10, 2) NOT NULL
      );
    `);

    await pool.query(`
      INSERT INTO sucursales (id, nombre, ciudad) VALUES 
      (1, 'EcoMarket Central', 'Caracas'),
      (2, 'EcoMarket Norte', 'Valencia')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO empleados (id, nombre, departamento, salario, sucursal_id) VALUES 
      (1, 'Ana Pérez', 'Ventas', 450.00, 1),
      (2, 'Carlos Gómez', 'Almacén', 400.00, 1),
      (3, 'Sofía Rodríguez', 'Ventas', 480.00, 2)
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO productos (id, nombre, categoria, stock, precio) VALUES 
      (1, 'Shampoo Orgánico de Almendras', 'Cosmética', 4, 12.50),
      (2, 'Crema Facial Eco', 'Cosmética', 25, 20.00),
      (3, 'Arroz Integral Orgánico', 'Alimentos', 5, 3.00),
      (4, 'Aceite de Coco Vírgen', 'Alimentos', 30, 15.00)
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO clientes (id, nombre, correo) VALUES 
      (1, 'Juan Silva', 'juan@mail.com'),
      (2, 'María Torres', 'maria@mail.com')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO ventas (id, cliente_id, sucursal_id, metodo_pago) VALUES 
      (1, 1, 1, 'Tarjeta'),
      (2, 2, 2, 'Efectivo')
      ON CONFLICT (id) DO NOTHING;

      INSERT INTO detalle_ventas (id, venta_id, producto_id, cantidad, subtotal) VALUES 
      (1, 1, 1, 2, 25.00),
      (2, 2, 3, 3, 9.00)
      ON CONFLICT (id) DO NOTHING;
    `);

    console.log("Base de datos y datos de prueba listos.");
  } catch (err) {
    console.error("Error al inicializar la base de datos:", err);
  }
}

inicializarBaseDeDatos();

// --- LAS 10 CONSULTAS SQL DEL PROYECTO ---

// 1. Inventario Bajo
app.get('/api/q1', async (req, res) => {
  const r = await pool.query('SELECT * FROM productos WHERE stock < (SELECT AVG(stock) FROM productos)');
  res.json(r.rows);
});

// 2. Ventas por Método de Pago
app.get('/api/q2', async (req, res) => {
  const r = await pool.query('SELECT metodo_pago, COUNT(*) AS total_transacciones FROM ventas GROUP BY metodo_pago');
  res.json(r.rows);
});

// 3. Facturación por Cliente (INNER JOIN 1)
app.get('/api/q3', async (req, res) => {
  const r = await pool.query(`
    SELECT c.nombre, c.correo, SUM(dv.subtotal) AS total_gastado 
    FROM clientes c
    INNER JOIN ventas v ON c.id = v.cliente_id
    INNER JOIN detalle_ventas dv ON v.id = dv.venta_id
    GROUP BY c.id, c.nombre, c.correo
  `);
  res.json(r.rows);
});

// 4. Ventas por Sucursal (INNER JOIN 2)
app.get('/api/q4', async (req, res) => {
  const r = await pool.query(`
    SELECT s.nombre, s.ciudad, SUM(dv.cantidad) AS total_productos_vendidos 
    FROM sucursales s
    INNER JOIN ventas v ON s.id = v.sucursal_id
    INNER JOIN detalle_ventas dv ON v.id = dv.venta_id
    GROUP BY s.id, s.nombre, s.ciudad
  `);
  res.json(r.rows);
});

// 5. Empleados y sus Sucursales (INNER JOIN 3)
app.get('/api/q5', async (req, res) => {
  const r = await pool.query(`
    SELECT e.nombre, e.departamento, e.salario, s.nombre AS sucursal 
    FROM empleados e
    INNER JOIN sucursales s ON e.sucursal_id = s.id
  `);
  res.json(r.rows);
});

// 6. Detalle de Transacciones Recientes (INNER JOIN 4)
app.get('/api/q6', async (req, res) => {
  const r = await pool.query(`
    SELECT v.id AS venta_id, v.fecha, p.nombre AS producto, dv.cantidad 
    FROM ventas v
    INNER JOIN detalle_ventas dv ON v.id = dv.venta_id
    INNER JOIN productos p ON dv.producto_id = p.id
    ORDER BY v.fecha DESC
  `);
  res.json(r.rows);
});

// 7. Ranking de Empleados por Departamento (RANK)
app.get('/api/q7', async (req, res) => {
  const r = await pool.query(`
    SELECT nombre, departamento, salario,
           RANK() OVER (PARTITION BY departamento ORDER BY salario DESC) AS ranking_departamento
    FROM empleados
  `);
  res.json(r.rows);
});

// 8. Clientes con Compra Cruzada (Subconsultas Correlacionadas)
app.get('/api/q8', async (req, res) => {
  const r = await pool.query(`
    SELECT DISTINCT c.nombre, c.correo 
    FROM clientes c
    JOIN ventas v ON c.id = v.cliente_id
    JOIN detalle_ventas dv ON v.id = dv.venta_id
    JOIN productos p ON dv.producto_id = p.id
    WHERE p.categoria = 'Cosmética'
      AND NOT EXISTS (
          SELECT 1 FROM ventas v2 
          JOIN detalle_ventas dv2 ON v2.id = dv2.venta_id 
          JOIN productos p2 ON dv2.producto_id = p2.id
          WHERE v2.cliente_id = c.id AND p2.categoria = 'Alimentos'
      )
  `);
  res.json(r.rows);
});

// 9. Auditoría Mensual de Crecimiento (CTE)
app.get('/api/q9', async (req, res) => {
  const r = await pool.query(`
    WITH ventas_mes AS (
        SELECT DATE_TRUNC('month', fecha) AS mes, SUM(dv.subtotal) AS total_mes
        FROM ventas v
        JOIN detalle_ventas dv ON v.id = dv.venta_id
        GROUP BY DATE_TRUNC('month', fecha)
    )
    SELECT mes, total_mes,
           LAG(total_mes, 1) OVER (ORDER BY mes) AS mes_anterior
    FROM ventas_mes
  `);
  res.json(r.rows);
});

// 10. Súper Compradores (HAVING)
app.get('/api/q10', async (req, res) => {
  const r = await pool.query(`
    SELECT c.id, c.nombre, SUM(dv.subtotal) AS gasto_total
    FROM clientes c
    JOIN ventas v ON c.id = v.cliente_id
    JOIN detalle_ventas dv ON v.id = dv.venta_id
    GROUP BY c.id, c.nombre
    HAVING SUM(dv.subtotal) > 0
  `);
  res.json(r.rows);
});

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});
