const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

// 환경에 따른 데이터베이스 설정
const isProduction = process.env.NODE_ENV === 'production';
const usePostgreSQL = process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgresql://');

let db, pool;

if (usePostgreSQL) {
  // PostgreSQL 사용 (Railway 배포 시)
  const { Pool } = require('pg');
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: isProduction ? { rejectUnauthorized: false } : false
  });
} else {
  // SQLite 사용 (로컬 개발 시) - 선택적 로드
  try {
    const Database = require('better-sqlite3');
    db = new Database('jpsentence.db');
  } catch (error) {
    console.error('SQLite를 사용할 수 없습니다. PostgreSQL을 사용하세요.');
    console.error('로컬 개발을 위해: npm install better-sqlite3');
    process.exit(1);
  }
}

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';
const path = require('path');

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
    if (usePostgreSQL) {
      // PostgreSQL 테이블 생성
      await pool.query(`
        CREATE TABLE IF NOT EXISTS users (
          id SERIAL PRIMARY KEY,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
      `);

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
    } else {
      // SQLite 테이블 생성
      db.exec(`
        CREATE TABLE IF NOT EXISTS users (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          username VARCHAR(50) UNIQUE NOT NULL,
          email VARCHAR(100) UNIQUE NOT NULL,
          password VARCHAR(255) NOT NULL,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      db.exec(`
        CREATE TABLE IF NOT EXISTS sentences (
          id INTEGER PRIMARY KEY AUTOINCREMENT,
          user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
          japanese_text TEXT NOT NULL,
          korean_meaning TEXT NOT NULL,
          pass_count INTEGER DEFAULT 0,
          fail_count INTEGER DEFAULT 0,
          last_studied DATETIME,
          created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
      `);

      // 기존 테이블에 컬럼 추가 (이미 존재하는 경우 무시됨)
      try {
        db.exec(`ALTER TABLE sentences ADD COLUMN pass_count INTEGER DEFAULT 0`);
      } catch (e) {
        // 컬럼이 이미 존재하는 경우 무시
      }
      
      try {
        db.exec(`ALTER TABLE sentences ADD COLUMN fail_count INTEGER DEFAULT 0`);
      } catch (e) {
        // 컬럼이 이미 존재하는 경우 무시
      }
      
      try {
        db.exec(`ALTER TABLE sentences ADD COLUMN last_studied DATETIME`);
      } catch (e) {
        // 컬럼이 이미 존재하는 경우 무시
      }
    }

    logger.info('데이터베이스 초기화 완료');
  } catch (error) {
    logger.error('데이터베이스 초기화 실패:', error);
    throw error;
  }
}

// 데이터베이스 쿼리 헬퍼 함수
async function queryDatabase(sql, params = []) {
  if (usePostgreSQL) {
    const result = await pool.query(sql, params);
    return result.rows;
  } else {
    const stmt = db.prepare(sql);
    if (sql.trim().toUpperCase().startsWith('SELECT')) {
      return stmt.all(params);
    } else {
      const result = stmt.run(params);
      return { insertId: result.lastInsertRowid, changes: result.changes };
    }
  }
}

// 미들웨어
app.use(cors());
app.use(express.json());

// React 앱을 정적 파일로 서빙 (프로덕션 환경에서)
if (process.env.NODE_ENV === 'production') {
  // React 빌드 파일 서빙
  const buildPath = path.join(__dirname, 'build');
  const fs = require('fs');
  
  console.log('Build path:', buildPath);
  console.log('Build directory exists:', fs.existsSync(buildPath));
  
  if (fs.existsSync(buildPath)) {
    const buildContents = fs.readdirSync(buildPath);
    console.log('Build directory contents:', buildContents);
    
    const indexPath = path.join(buildPath, 'index.html');
    console.log('index.html exists:', fs.existsSync(indexPath));
  }
  
  app.use(express.static(buildPath));
}

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
    const existingUser = await queryDatabase('SELECT id FROM users WHERE username = ?', [username]);
    if (existingUser.length > 0) {
      logger.warn('회원가입 실패: 사용자명 중복', { username, clientIP });
      return res.status(400).json({ error: '이미 사용 중인 사용자명입니다.' });
    }

    // 중복 이메일 확인
    const existingEmail = await queryDatabase('SELECT id FROM users WHERE email = ?', [email]);
    if (existingEmail.length > 0) {
      logger.warn('회원가입 실패: 이메일 중복', { email, clientIP });
      return res.status(400).json({ error: '이미 사용 중인 이메일입니다.' });
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 10);

    // 사용자 생성
    const result = await queryDatabase(
      'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
      [username, email, hashedPassword]
    );

    const userId = result.insertId || result[0]?.id;

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
    const result = await queryDatabase('SELECT * FROM users WHERE email = ?', [email]);
    const user = result[0];

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

    const result = await queryDatabase(
      'INSERT INTO sentences (user_id, japanese_text, korean_meaning) VALUES (?, ?, ?)',
      [req.user.userId, japaneseText, koreanMeaning]
    );

    const sentenceId = result.insertId || result[0]?.id;

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
    const result = await queryDatabase(
      'SELECT * FROM sentences WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.userId]
    );

    res.json(result);
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
  const clientIP = req.ip || req.connection.remoteAddress;
  
  try {
    const { sentenceId, passed, score } = req.body;

    logger.info('시험 결과 제출 시도', { 
      userId: req.user.userId, 
      sentenceId, 
      passed, 
      score,
      clientIP 
    });

    if (passed) {
      await queryDatabase(
        'UPDATE sentences SET pass_count = COALESCE(pass_count, 0) + 1, last_studied = datetime(\'now\') WHERE id = ? AND user_id = ?',
        [sentenceId, req.user.userId]
      );
    } else {
      await queryDatabase(
        'UPDATE sentences SET fail_count = COALESCE(fail_count, 0) + 1, last_studied = datetime(\'now\') WHERE id = ? AND user_id = ?',
        [sentenceId, req.user.userId]
      );
    }

    logger.info('시험 결과 저장 성공', { 
      userId: req.user.userId, 
      sentenceId, 
      passed,
      clientIP 
    });

    res.json({ message: '시험 결과가 저장되었습니다.' });
  } catch (error) {
    logger.error('시험 결과 저장 오류:', { 
      error: error.message, 
      stack: error.stack, 
      userId: req.user.userId,
      clientIP 
    });
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 문장 수정
app.put('/api/sentences/:id', authenticateToken, async (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  try {
    const { id } = req.params;
    const { japaneseText, koreanMeaning } = req.body;

    logger.info('문장 수정 시도', { 
      sentenceId: id,
      userId: req.user.userId, 
      japaneseText, 
      koreanMeaning, 
      clientIP 
    });

    if (!japaneseText || !koreanMeaning) {
      logger.warn('문장 수정 실패: 필수 필드 누락', { 
        sentenceId: id,
        japaneseText, 
        koreanMeaning, 
        clientIP 
      });
      return res.status(400).json({ error: '일본어 문장과 한국어 뜻을 모두 입력해주세요.' });
    }

    // 문장이 해당 사용자의 것인지 확인
    const checkResult = await queryDatabase(
      'SELECT id FROM sentences WHERE id = ? AND user_id = ?',
      [id, req.user.userId]
    );

    if (checkResult.length === 0) {
      logger.warn('문장 수정 실패: 권한 없음', { 
        sentenceId: id,
        userId: req.user.userId, 
        clientIP 
      });
      return res.status(404).json({ error: '문장을 찾을 수 없습니다.' });
    }

    // 문장 수정
    await queryDatabase(
      'UPDATE sentences SET japanese_text = ?, korean_meaning = ? WHERE id = ? AND user_id = ?',
      [japaneseText, koreanMeaning, id, req.user.userId]
    );

    logger.info('문장 수정 성공', { 
      sentenceId: id,
      userId: req.user.userId, 
      clientIP 
    });

    res.json({ message: '문장이 수정되었습니다.' });
  } catch (error) {
    logger.error('문장 수정 오류:', { 
      error: error.message, 
      stack: error.stack, 
      clientIP,
      body: req.body 
    });
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 시험 문장 조회
app.get('/api/test-sentences', authenticateToken, async (req, res) => {
  const clientIP = req.ip || req.connection.remoteAddress;
  
  try {
    const { count, date } = req.query;
    const sentenceCount = parseInt(count) || 5;
    const filterDate = date || null;

    logger.info('시험 문장 조회 시도', { 
      userId: req.user.userId, 
      count: sentenceCount,
      date: filterDate,
      clientIP 
    });

    let query, params;
    
    if (filterDate) {
      // 특정 날짜의 문장 조회
      query = 'SELECT * FROM sentences WHERE user_id = ? AND DATE(created_at) = ? ORDER BY RANDOM() LIMIT ?';
      params = [req.user.userId, filterDate, sentenceCount];
    } else {
      // 모든 문장에서 랜덤 조회
      query = 'SELECT * FROM sentences WHERE user_id = ? ORDER BY RANDOM() LIMIT ?';
      params = [req.user.userId, sentenceCount];
    }

    const result = await queryDatabase(query, params);

    if (result.length === 0) {
      logger.warn('시험 문장 없음', { 
        userId: req.user.userId, 
        count: sentenceCount,
        date: filterDate,
        clientIP 
      });
      return res.status(404).json({ error: '선택한 조건에 맞는 문장이 없습니다.' });
    }

    logger.info('시험 문장 조회 성공', { 
      userId: req.user.userId, 
      count: result.length,
      clientIP 
    });

    res.json(result);
  } catch (error) {
    logger.error('시험 문장 조회 오류:', { 
      error: error.message, 
      stack: error.stack, 
      clientIP 
    });
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 디버그 엔드포인트 (개발용)
app.get('/api/debug/users', async (req, res) => {
  try {
    const result = await queryDatabase('SELECT id, username, email, created_at FROM users');
    res.json(result);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// React 앱의 모든 라우트를 처리 (프로덕션 환경에서)
if (process.env.NODE_ENV === 'production') {
  app.get('*', (req, res) => {
    console.log('Handling request for:', req.path);
    const indexPath = path.join(__dirname, 'build', 'index.html');
    console.log('Looking for index.html at:', indexPath);
    
    if (require('fs').existsSync(indexPath)) {
      console.log('Serving index.html');
      res.sendFile(indexPath);
    } else {
      console.log('index.html not found, serving fallback');
      res.status(404).send(`
        <html>
          <head><title>Application Loading</title></head>
          <body>
            <h1>Application is starting up...</h1>
            <p>Please wait a moment and refresh the page.</p>
            <p>If this message persists, the React build may have failed.</p>
            <p>Build path: ${path.join(__dirname, 'build')}</p>
            <p>Index path: ${indexPath}</p>
          </body>
        </html>
      `);
    }
  });
}

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