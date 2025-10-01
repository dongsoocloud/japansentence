const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { Pool } = require('pg');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

// PostgreSQL 연결 설정
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

// 로거 설정
const logger = winston.createLogger({
  level: 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  transports: [
    // 콘솔 출력
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    }),
    // 일반 로그 파일
    new DailyRotateFile({
      filename: 'logs/application-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: 'info'
    }),
    // 에러 로그 파일
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      maxSize: '20m',
      maxFiles: '14d',
      level: 'error'
    })
  ]
});

// 데이터베이스 초기화
async function initializeDatabase() {
  try {
    // users 테이블 생성
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        username VARCHAR(50) UNIQUE NOT NULL,
        email VARCHAR(100) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // sentences 테이블 생성
    await pool.query(`
      CREATE TABLE IF NOT EXISTS sentences (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        japanese_text TEXT NOT NULL,
        korean_meaning TEXT NOT NULL,
        pass_count INTEGER DEFAULT 0,
        fail_count INTEGER DEFAULT 0,
        last_studied TIMESTAMP,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    logger.info('데이터베이스 초기화 완료');
  } catch (error) {
    logger.error('데이터베이스 초기화 실패:', error);
    throw error;
  }
}

// 미들웨어
app.use(cors());
app.use(express.json());

// JWT 토큰 인증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: '액세스 토큰이 필요합니다.' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: '유효하지 않은 토큰입니다.' });
    }
    req.user = user;
    next();
  });
};

// API 라우트

// 회원가입
app.post('/api/register', async (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  try {
    const { username, email, password } = req.body;

    // 필수 필드 검증
    if (!username || !email || !password) {
      logger.warn('회원가입 실패: 필수 필드 누락', { 
        username, 
        email, 
        clientIP,
        missingFields: {
          username: !username,
          email: !email,
          password: !password
        }
      });
      return res.status(400).json({ error: '사용자명, 이메일, 비밀번호를 모두 입력해주세요.' });
    }

    // 이메일 형식 검증
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      logger.warn('회원가입 실패: 잘못된 이메일 형식', { email, clientIP });
      return res.status(400).json({ error: '올바른 이메일 형식을 입력해주세요.' });
    }

    // 비밀번호 길이 검증
    if (password.length < 6) {
      logger.warn('회원가입 실패: 비밀번호 너무 짧음', { clientIP });
      return res.status(400).json({ error: '비밀번호는 6자 이상이어야 합니다.' });
    }

    // 중복 사용자명 확인
    const existingUser = await pool.query('SELECT id FROM users WHERE username = $1', [username]);
    if (existingUser.rows.length > 0) {
      logger.warn('회원가입 실패: 사용자명 중복', { username, clientIP });
      return res.status(400).json({ error: '이미 사용 중인 사용자명입니다.' });
    }

    // 중복 이메일 확인
    const existingEmail = await pool.query('SELECT id FROM users WHERE email = $1', [email]);
    if (existingEmail.rows.length > 0) {
      logger.warn('회원가입 실패: 이메일 중복', { email, clientIP });
      return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const result = await pool.query(
      'INSERT INTO users (username, email, password) VALUES ($1, $2, $3) RETURNING id',
      [username, email, hashedPassword]
    );

    const userId = result.rows[0].id;

    logger.info('회원가입 성공', { 
      userId, 
      username, 
      email, 
      clientIP,
      duration: Date.now() - req.startTime 
    });

    res.status(201).json({ message: '회원가입이 완료되었습니다.', userId });
  } catch (error) {
    logger.error('회원가입 오류:', { 
      error: error.message, 
      stack: error.stack, 
      clientIP,
      body: req.body 
    });
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 로그인
app.post('/api/login', async (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  try {
    const { email, password } = req.body;

    logger.info('로그인 시도', { 
      body: req.body, 
      bodyKeys: Object.keys(req.body), 
      clientIP,
      email,
      password: '[HIDDEN]',
      headers: req.headers
    });

    if (!email || !password) {
      logger.warn('로그인 실패: 필수 필드 누락', { 
        email, 
        clientIP,
        missingFields: {
          email: !email,
          password: !password
        }
      });
      return res.status(400).json({ error: '이메일과 비밀번호를 입력해주세요.' });
    }

    // 사용자 조회
    const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) {
      logger.warn('로그인 실패: 사용자 없음', { email, clientIP });
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // 비밀번호 확인
    const isValidPassword = await bcrypt.compare(password, user.password);
    if (!isValidPassword) {
      logger.warn('로그인 실패: 비밀번호 불일치', { email, clientIP });
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    // JWT 토큰 생성
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const startTime = Date.now();
    const duration = Date.now() - startTime;

    logger.info('로그인 성공', { 
      clientIP, 
      duration: `${duration}ms`, 
      email, 
      userId: user.id 
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    logger.error('로그인 오류:', { 
      error: error.message, 
      stack: error.stack, 
      clientIP,
      body: req.body 
    });
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 문장 추가
app.post('/api/sentences', authenticateToken, async (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  try {
    const { japaneseText, koreanMeaning } = req.body;

    logger.info('문장 등록 시도', { 
      userId: req.user.userId, 
      japaneseText, 
      koreanMeaning, 
      clientIP 
    });

    if (!japaneseText || !koreanMeaning) {
      logger.warn('문장 등록 실패: 필수 필드 누락', { 
        japaneseText, 
        koreanMeaning, 
        clientIP 
      });
      return res.status(400).json({ error: '일본어 문장과 한국어 뜻을 모두 입력해주세요.' });
    }

    const result = await pool.query(
      'INSERT INTO sentences (user_id, japanese_text, korean_meaning) VALUES ($1, $2, $3) RETURNING id',
      [req.user.userId, japaneseText, koreanMeaning]
    );

    const sentenceId = result.rows[0].id;

    logger.info('문장 등록 성공', { 
      sentenceId, 
      userId: req.user.userId, 
      clientIP 
    });

    res.status(201).json({ message: '문장이 등록되었습니다.', sentenceId });
  } catch (error) {
    logger.error('문장 등록 오류:', { 
      error: error.message, 
      stack: error.stack, 
      clientIP,
      body: req.body 
    });
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 문장 목록 조회
app.get('/api/sentences', authenticateToken, async (req, res) => {
  try {
    const result = await pool.query(
      'SELECT * FROM sentences WHERE user_id = $1 ORDER BY created_at DESC',
      [req.user.userId]
    );

    res.json(result.rows);
  } catch (error) {
    logger.error('문장 목록 조회 오류:', { 
      error: error.message, 
      stack: error.stack, 
      userId: req.user.userId 
    });
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 시험 결과 제출
app.post('/api/test-result', authenticateToken, async (req, res) => {
  try {
    const { sentenceId, passed } = req.body;

    if (passed) {
      await pool.query(
        'UPDATE sentences SET pass_count = pass_count + 1, last_studied = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
        [sentenceId, req.user.userId]
      );
    } else {
      await pool.query(
        'UPDATE sentences SET fail_count = fail_count + 1, last_studied = CURRENT_TIMESTAMP WHERE id = $1 AND user_id = $2',
        [sentenceId, req.user.userId]
      );
    }

    res.json({ message: '시험 결과가 저장되었습니다.' });
  } catch (error) {
    logger.error('시험 결과 저장 오류:', { 
      error: error.message, 
      stack: error.stack, 
      userId: req.user.userId 
    });
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 디버그 엔드포인트 (개발용)
app.get('/api/debug/users', async (req, res) => {
  try {
    const result = await pool.query('SELECT id, username, email, created_at FROM users');
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// 서버 시작
async function startServer() {
  try {
    await initializeDatabase();
    
    app.listen(PORT, () => {
      logger.info('서버 시작', { 
        environment: process.env.NODE_ENV || 'development', 
        port: PORT 
      });
      console.log(`Server running on port ${PORT}`);
      console.log(`Debug endpoint: http://localhost:${PORT}/api/debug/users`);
    });
  } catch (error) {
    logger.error('서버 시작 실패:', error);
    process.exit(1);
  }
}

startServer();