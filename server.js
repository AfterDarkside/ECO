const express = require('express');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

// Configuración de la conexión a PostgreSQL (usa la URL que te da Render automáticamente)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.DATABASE_URL ? { rejectUnauthorized: false } : false
});

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Servir archivos estáticos (HTML, CSS) desde la carpeta "public"
app.use(express.static(path.join(__dirname, 'public')));

// Ruta de prueba para verificar una consulta SQL (Ej: Inventario Bajo)
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