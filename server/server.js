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

// Добавляем статическую раздачу файлов
app.use(express.static(path.join(__dirname, '../')));

// Подключение к базе данных
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
});


async function checkConnectionToTables() {
  try {
    console.log('🔍 Проверка подключения к базе данных...');
    
    // Проверяем подключение к БД
    const dbCheck = await pool.query('SELECT version()');
    console.log('✅ Подключение к PostgreSQL успешно');
    console.log(`📊 Версия PostgreSQL: ${dbCheck.rows[0].version}`);
    
    // Список таблиц для проверки
    const tablesToCheck = ['users', 'resumes', 'templates', 'sections', 'public_links'];
    
    console.log('\n🔍 Проверка существования таблиц...');
    
    for (const tableName of tablesToCheck) {
      try {
        const tableExists = await pool.query(`
          SELECT EXISTS (
            SELECT FROM information_schema.tables 
            WHERE table_schema = 'public' 
            AND table_name = $1
          )
        `, [tableName]);
        
        if (tableExists.rows[0].exists) {
          // Получаем количество записей в таблице
          const countResult = await pool.query(`SELECT COUNT(*) FROM ${tableName}`);
          console.log(`✅ Таблица "${tableName}" существует (записей: ${countResult.rows[0].count})`);
          
          // Получаем информацию о структуре таблицы
          const structureResult = await pool.query(`
            SELECT column_name, data_type, is_nullable
            FROM information_schema.columns
            WHERE table_name = $1
            ORDER BY ordinal_position
          `, [tableName]);
          
          console.log(`   Структура таблицы "${tableName}":`);
          structureResult.rows.forEach(col => {
            console.log(`   - ${col.column_name}: ${col.data_type} ${col.is_nullable === 'YES' ? '(NULL)' : '(NOT NULL)'}`);
          });
        } else {
          console.log(`❌ Таблица "${tableName}" не существует`);
        }
      } catch (error) {
        console.error(`❌ Ошибка при проверке таблицы "${tableName}":`, error.message);
      }
    }
    
    // Проверяем наличие индексов
    console.log('\n🔍 Проверка индексов...');
    const indexesResult = await pool.query(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public'
      ORDER BY tablename, indexname
    `);
    
    if (indexesResult.rows.length > 0) {
      console.log(`✅ Найдено индексов: ${indexesResult.rows.length}`);
      indexesResult.rows.forEach(index => {
        console.log(`   📌 ${index.tablename}.${index.indexname}`);
      });
    } else {
      console.log('⚠️ Индексы не найдены');
    }
    
    console.log('\n✅ Проверка подключения завершена успешно!\n');
    
  } catch (error) {
    console.error('❌ Ошибка проверки подключения к БД:', error);
    throw error;
  }
}

// Таблица для хранения активных сессий
async function createTables() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        user_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        name VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );

      CREATE TABLE IF NOT EXISTS resumes (
        resume_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID REFERENCES users(user_id) ON DELETE CASCADE,
        title VARCHAR(255) NOT NULL,
        data JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        updated_at TIMESTAMP DEFAULT now()
      );

      -- Таблица для хранения активных сессий
      CREATE TABLE IF NOT EXISTS user_sessions (
        session_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
        token_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT now(),
        expires_at TIMESTAMP NOT NULL
      );

      -- Индексы для сессий
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_expires_at ON user_sessions(expires_at);
    `);
    
    console.log('✅ Таблицы созданы успешно');
  } catch (error) {
    console.error('❌ Ошибка создания таблиц:', error);
    throw error;
  }
}

// Функция для создания сессии
async function createUserSession(userId, token) {
  try {
    // Хэшируем токен для безопасного хранения
    const tokenHash = await bcrypt.hash(token, 10);
    
    // Устанавливаем срок действия сессии (24 часа)
    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);
    
    // Сохраняем сессию в БД
    await pool.query(
      'INSERT INTO user_sessions (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
      [userId, tokenHash, expiresAt]
    );
    
    return expiresAt;
  } catch (error) {
    console.error('❌ Ошибка создания сессии:', error);
    throw error;
  }
}

// Функция для проверки активной сессии
async function checkActiveSession(userId) {
  try {
    const now = new Date();
    
    const result = await pool.query(
      'SELECT session_id, created_at, expires_at FROM user_sessions WHERE user_id = $1 AND expires_at > $2 ORDER BY created_at DESC LIMIT 1',
      [userId, now]
    );
    
    return result.rows.length > 0 ? result.rows[0] : null;
  } catch (error) {
    console.error('❌ Ошибка проверки сессии:', error);
    return null;
  }
}

// Функция для удаления просроченных сессий
async function cleanupExpiredSessions() {
  try {
    const now = new Date();
    const result = await pool.query(
      'DELETE FROM user_sessions WHERE expires_at <= $1 RETURNING session_id',
      [now]
    );
    
    if (result.rowCount > 0) {
      console.log(`🧹 Удалено просроченных сессий: ${result.rowCount}`);
    }
  } catch (error) {
    console.error('❌ Ошибка очистки сессий:', error);
  }
}

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
    
    const user = result.rows[0];
    
    // Создаем JWT токен
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Создаем сессию для пользователя
    const expiresAt = await createUserSession(user.user_id, token);
    
    console.log('✅ Пользователь зарегистрирован:', email);
    console.log(`🕐 Сессия действительна до: ${expiresAt.toLocaleString()}`);
    
    res.json({
      message: 'Пользователь зарегистрирован и сессия создана',
      token,
      user: {
        id: user.user_id,
        email: user.email,
        name: user.name
      },
      session: {
        expiresAt: expiresAt.toISOString(),
        duration: '24 часа'
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка регистрации:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

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
    
    // Проверяем, есть ли активная сессия
    const activeSession = await checkActiveSession(user.user_id);
    
    if (activeSession) {
      const sessionAge = Math.floor((new Date() - new Date(activeSession.created_at)) / 1000 / 60); // в минутах
      console.log(`⚠️ Пользователь ${email} уже имеет активную сессию (возраст: ${sessionAge} минут)`);
      
      return res.status(200).json({
        message: 'У вас уже есть активная сессия',
        warning: 'Вы уже вошли в систему с другого устройства или вкладки',
        session: {
          created: activeSession.created_at,
          expires: activeSession.expires_at,
          age_minutes: sessionAge
        },
        user: {
          id: user.user_id,
          email: user.email,
          name: user.name
        }
      });
    }
    
    // Очищаем просроченные сессии
    await cleanupExpiredSessions();
    
    // Создаем JWT токен
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );
    
    // Создаем новую сессию
    const expiresAt = await createUserSession(user.user_id, token);
    
    console.log('✅ Успешный вход:', email);
    console.log(`🕐 Новая сессия действительна до: ${expiresAt.toLocaleString()}`);
    
    res.json({
      message: 'Вход выполнен успешно',
      token,
      user: {
        id: user.user_id,
        email: user.email,
        name: user.name
      },
      session: {
        expiresAt: expiresAt.toISOString(),
        duration: '24 часа'
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка входа:', error);
    res.status(500).json({ error: 'Ошибка сервера' });
  }
});

// Middleware для проверки JWT токена с поддержкой сессий
function authenticateToken(req, res, next) {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

  if (!token) {
    return res.status(401).json({ error: 'Токен отсутствует' });
  }

  jwt.verify(token, process.env.JWT_SECRET, async (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Неверный или просроченный токен' });
    }
    
    // Проверяем, существует ли активная сессия для этого токена
    try {
      const now = new Date();
      const sessionResult = await pool.query(
        'SELECT * FROM user_sessions WHERE user_id = $1 AND expires_at > $2 ORDER BY created_at DESC LIMIT 1',
        [user.user_id, now]
      );
      
      if (sessionResult.rows.length === 0) {
        return res.status(403).json({ error: 'Сессия истекла. Пожалуйста, войдите снова.' });
      }
      
      // Проверяем хэш токена (опционально, для дополнительной безопасности)
      const session = sessionResult.rows[0];
      const isTokenValid = await bcrypt.compare(token, session.token_hash);
      
      if (!isTokenValid) {
        return res.status(403).json({ error: 'Недействительная сессия' });
      }
      
      req.user = user;
      next();
      
    } catch (error) {
      console.error('❌ Ошибка проверки сессии:', error);
      return res.status(500).json({ error: 'Ошибка проверки сессии' });
    }
  });
}


app.post('/api/resumes', authenticateToken, async (req, res) => {
  try {
    const { title, data } = req.body;
    
    // Валидация входных данных
    if (!title || title.trim() === '') {
      return res.status(400).json({ error: 'Название резюме обязательно' });
    }
    
    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Данные резюме должны быть в формате JSON' });
    }
    
    console.log('💾 Сохранение резюме для пользователя:', req.user.user_id);
    console.log('📝 Название резюме:', title);
    console.log('📊 Размер данных:', JSON.stringify(data).length, 'символов');
    
    // Проверяем, не превышает ли размер данных разумные пределы
    if (JSON.stringify(data).length > 100000) { // ~100KB
      return res.status(400).json({ error: 'Слишком большой объем данных резюме' });
    }
    
    const result = await pool.query(
      'INSERT INTO resumes (user_id, title, data) VALUES ($1, $2, $3) RETURNING *',
      [req.user.user_id, title, data]
    );
    
    console.log('✅ Резюме успешно сохранено. ID:', result.rows[0].resume_id);
    
    res.json({ 
      message: 'Резюме сохранено', 
      resume: result.rows[0],
      savedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Ошибка сохранения резюме:', error);
    
    // Более детализированные ошибки
    if (error.code === '23505') { // Ошибка уникальности
      res.status(400).json({ error: 'Резюме с таким названием уже существует' });
    } else if (error.code === '23503') { // Ошибка внешнего ключа
      res.status(400).json({ error: 'Пользователь не найден' });
    } else if (error.code === '22P02') { // Ошибка преобразования JSON
      res.status(400).json({ error: 'Неверный формат данных. Ожидается JSON.' });
    } else {
      res.status(500).json({ error: 'Ошибка сервера при сохранении резюме' });
    }
  }
});


app.get('/api/resumes', authenticateToken, async (req, res) => {
  try {
    console.log('📄 Получение резюме для пользователя:', req.user.user_id);
    
    // Добавляем пагинацию для больших объемов данных
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 20;
    const offset = (page - 1) * limit;
    
    // Получаем общее количество для пагинации
    const countResult = await pool.query(
      'SELECT COUNT(*) FROM resumes WHERE user_id = $1',
      [req.user.user_id]
    );
    
    const totalResumes = parseInt(countResult.rows[0].count);
    const totalPages = Math.ceil(totalResumes / limit);
    
    // Получаем резюме с пагинацией
    const result = await pool.query(
      'SELECT * FROM resumes WHERE user_id = $1 ORDER BY updated_at DESC LIMIT $2 OFFSET $3',
      [req.user.user_id, limit, offset]
    );
    
    console.log(`✅ Найдено резюме: ${result.rows.length} (всего: ${totalResumes})`);
    
    res.json({ 
      resumes: result.rows,
      pagination: {
        page,
        limit,
        total: totalResumes,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1
      },
      fetchedAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Ошибка получения резюме:', error);
    res.status(500).json({ error: 'Ошибка сервера при получении резюме' });
  }
});

// Новый эндпоинт для выхода (удаления сессии)
app.post('/api/logout', authenticateToken, async (req, res) => {
  try {
    await pool.query(
      'DELETE FROM user_sessions WHERE user_id = $1',
      [req.user.user_id]
    );
    
    console.log('👋 Пользователь вышел из системы:', req.user.user_id);
    
    res.json({ 
      message: 'Выход выполнен успешно. Все сессии удалены.',
      loggedOutAt: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Ошибка выхода:', error);
    res.status(500).json({ error: 'Ошибка сервера при выходе' });
  }
});

// Эндпоинт для проверки состояния сессии
app.get('/api/session/status', authenticateToken, async (req, res) => {
  try {
    const sessionResult = await pool.query(
      'SELECT created_at, expires_at FROM user_sessions WHERE user_id = $1 ORDER BY created_at DESC LIMIT 1',
      [req.user.user_id]
    );
    
    if (sessionResult.rows.length === 0) {
      return res.status(404).json({ error: 'Сессия не найдена' });
    }
    
    const session = sessionResult.rows[0];
    const now = new Date();
    const expiresAt = new Date(session.expires_at);
    const timeLeft = Math.floor((expiresAt - now) / 1000 / 60); // в минутах
    
    res.json({
      isActive: true,
      user: req.user,
      session: {
        created: session.created_at,
        expires: session.expires_at,
        timeLeftMinutes: Math.max(0, timeLeft),
        expiresSoon: timeLeft < 60 // менее часа осталось
      }
    });
    
  } catch (error) {
    console.error('❌ Ошибка проверки сессии:', error);
    res.status(500).json({ error: 'Ошибка проверки сессии' });
  }
});

// Тестовый endpoint для проверки работы
app.get('/api/status', async (req, res) => {
  try {
    // Проверяем подключение к БД
    const dbCheck = await pool.query('SELECT 1');
    const dbStatus = dbCheck ? '✅ Подключено' : '❌ Ошибка';
    
    // Получаем статистику
    const userCount = await pool.query('SELECT COUNT(*) FROM users');
    const resumeCount = await pool.query('SELECT COUNT(*) FROM resumes');
    const sessionCount = await pool.query('SELECT COUNT(*) FROM user_sessions');
    
    res.json({ 
      status: 'OK', 
      message: 'Сервер работает нормально',
      timestamp: new Date().toISOString(),
      database: dbStatus,
      statistics: {
        users: parseInt(userCount.rows[0].count),
        resumes: parseInt(resumeCount.rows[0].count),
        activeSessions: parseInt(sessionCount.rows[0].count)
      },
      endpoints: {
        register: 'POST /api/register',
        login: 'POST /api/login',
        logout: 'POST /api/logout',
        resumes: 'GET/POST /api/resumes',
        sessionStatus: 'GET /api/session/status'
      }
    });
  } catch (error) {
    res.status(500).json({ 
      status: 'ERROR', 
      message: 'Ошибка подключения к базе данных',
      error: error.message 
    });
  }
});

// Запуск сервера
app.listen(process.env.PORT, async () => {
  console.log('🚀 Запуск сервера...');
  console.log('📊 Подключение к базе данных...');
  
  try {
    await createTables();
    await checkConnectionToTables();
    
    // Запускаем периодическую очистку просроченных сессий (каждые 5 минут)
    setInterval(cleanupExpiredSessions, 5 * 60 * 1000);
    
    console.log(`✅ Сервер запущен на порту ${process.env.PORT}`);
    console.log(`🌐 Откройте в браузере: http://localhost:${process.env.PORT}`);
    console.log('\n📋 Доступные эндпоинты:');
    console.log(`   POST /api/register      - Регистрация пользователя`);
    console.log(`   POST /api/login         - Вход в систему`);
    console.log(`   POST /api/logout        - Выход из системы`);
    console.log(`   GET  /api/resumes       - Получение резюме пользователя`);
    console.log(`   POST /api/resumes       - Сохранение резюме`);
    console.log(`   GET  /api/session/status - Проверка состояния сессии`);
    console.log(`   GET  /api/status        - Проверка статуса сервера\n`);
    
  } catch (error) {
    console.error('❌ Критическая ошибка при запуске сервера:', error);
    process.exit(1);
  }
});