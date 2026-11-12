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

// Función para crear las tablas automáticamente al iniciar
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
    console.log("Tablas verificadas o creadas exitosamente en PostgreSQL.");
  } catch (err) {
    console.error("Error al crear las tablas:", err);
  }
}

// Llamar a la función al iniciar
inicializarBaseDeDatos();

// Ruta de prueba para el Inventario Bajo
app.get('/api/inventario-bajo', async (req, res) => {
  try {
    const result = await pool.query('SELECT * FROM productos WHERE stock < (SELECT AVG(stock) FROM productos)');
    res.json(result.rows);
  } catch (err) {
    console.error(err);
    res.status(500).send('Error al consultar la base de datos');
  }
});

app.listen(port, () => {
  console.log(`Servidor corriendo en el puerto ${port}`);
});
