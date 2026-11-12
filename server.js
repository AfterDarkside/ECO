async function inicializarBaseDeDatos() {
  try {
    // 1. Crear las tablas si no existen
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

    // 2. Insertar datos de prueba garantizados
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

    console.log('¡Datos de prueba verificados con éxito!');

  } catch (err) {
    console.error("Error al inicializar la base de datos:", err);
  }
}
