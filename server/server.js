import express from 'express';
import pkg from 'pg';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

const { Pool } = pkg;
const app = express();

// Для правильной работы с путями в ES модулях
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(cors());
app.use(express.json());

// Добавляем статическую раздачу файлов (ваш HTML/CSS/JS)
app.use(express.static(path.join(__dirname, '../'))); // если HTML файлы на уровень выше папки server

// Подключение к базе данных
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});

// Обработчик для корневого пути
app.get('/', (req, res) => {
  res.send(`
    <!DOCTYPE html>
    <html>
    <head>
        <title>Resume Builder Server</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 40px; }
            .status { color: green; font-weight: bold; }
        </style>
    </head>
    <body>
        <h1>🚀 Сервер конструктора резюме работает!</h1>
        <p class="status">Статус: ✅ Активен</p>
        <p>API доступно по адресу: <code>http://localhost:${process.env.PORT}/api/</code></p>
        <p>Для тестирования используйте Postman или ваш фронтенд</p>
    </body>
    </html>
  `);
});

// Создание таблиц при запуске
async function createTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS resumes (
        resume_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );
    `);
    console.log('✅ Таблицы созданы успешно');
  } catch (error) {
    console.error('❌ Ошибка создания таблиц:', error);
  }
}

// Регистрация пользователя
app.post('/api/register', async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    console.log('📝 Попытка регистрации:', email);
    
    // Проверяем, существует ли пользователь
    const userExists = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (userExists.rows.length > 0) {
      return res.status(400).json({ error: 'Пользователь уже существует' });
    }
    
    // Хэшируем пароль
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);
    
    // Сохраняем пользователя в БД
    const result = await pool.query(
      'INSERT INTO users (email, password_hash, name) VALUES ($1, $2, $3) RETURNING user_id, email, name',
      [email, hashedPassword, name]
    );
    
    // Создаем JWT токен
    const token = jwt.sign(
      { user_id: result.rows[0].user_id, email: result.rows[0].email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('✅ Пользователь зарегистрирован:', email);
    
    res.json({
      message: 'Пользователь зарегистрирован',
      token,
      user: {
        id: result.rows[0].user_id,
        email: result.rows[0].email,
        name: result.rows[0].name
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка регистрации:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Вход пользователя
app.post('/api/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    
    console.log('🔐 Попытка входа:', email);
    
    // Ищем пользователя в БД
    const result = await pool.query(
      'SELECT * FROM users WHERE email = $1',
      [email]
    );
    
    if (result.rows.length === 0) {
      return res.status(400).json({ error: 'Неверный email или пароль' });
    }
    
    const user = result.rows[0];
    
    // Проверяем пароль
    const isPasswordValid = await bcrypt.compare(password, user.password_hash);
    
    if (!isPasswordValid) {
      return res.status(400).json({ error: 'Неверный email или пароль' });
    }
    
    // Создаем JWT токен
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    console.log('✅ Успешный вход:', email);
    
    res.json({
      message: 'Вход выполнен успешно',
      token,
      user: {
        id: user.user_id,
        email: user.email,
        name: user.name
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка входа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Middleware для проверки JWT токена
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Токен отсутствует' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Неверный токен' });
    }
    req.user = user;
    next();
  });
}

// Сохранение резюме (требует аутентификации)
app.post('/api/resumes', authenticateToken, async (req, res) => {
  try {
    const { title, data } = req.body;
    
    console.log('💾 Сохранение резюме для пользователя:', req.user.user_id);
    
    const result = await pool.query(
      'INSERT INTO resumes (user_id, title, data) VALUES ($1, $2, $3) RETURNING *',
      [req.user.user_id, title, data]
    );
    
    res.json({ message: 'Резюме сохранено', resume: result.rows[0] });
    
  } catch (error) {
    console.error('❌ Ошибка сохранения резюме:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Получение резюме пользователя
app.get('/api/resumes', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM resumes WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.user_id]
    );
    
    res.json({ resumes: result.rows });
    
  } catch (error) {
    console.error('❌ Ошибка получения резюме:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Тестовый endpoint для проверки работы
app.get('/api/status', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'Сервер работает нормально',
    timestamp: new Date().toISOString()
  });
});

// Запуск сервера
app.listen(process.env.PORT, async () => {
  console.log('🚀 Запуск сервера...');
  console.log('📊 Подключение к базе данных...');
  await createTables();
  console.log(`✅ Сервер запущен на порту ${process.env.PORT}`);
  console.log(`🌐 Откройте в браузере: http://localhost:${process.env.PORT}`);
});