const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const path = require('path');
const winston = require('winston');
const DailyRotateFile = require('winston-daily-rotate-file');

const app = express();
const PORT = process.env.PORT || 5000;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key';

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
      maxFiles: '14d'
    }),
    // 에러 로그 파일
    new DailyRotateFile({
      filename: 'logs/error-%DATE%.log',
      datePattern: 'YYYY-MM-DD',
      level: 'error',
      maxSize: '20m',
      maxFiles: '14d'
    })
  ]
});

// SQLite 데이터베이스 초기화
const db = new Database('jpsentence.db');

// 미들웨어
app.use(cors());
app.use(express.json());

// 데이터베이스 테이블 생성
const initDatabase = () => {
  // 사용자 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // 문장 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS sentences (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      japanese_text TEXT NOT NULL,
      korean_meaning TEXT NOT NULL,
      furigana TEXT,
      key_words TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users (id)
    )
  `);

  // 복습 기록 테이블
  db.exec(`
    CREATE TABLE IF NOT EXISTS study_records (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      sentence_id INTEGER NOT NULL,
      pass_count INTEGER DEFAULT 0,
      fail_count INTEGER DEFAULT 0,
      last_studied DATETIME,
      FOREIGN KEY (user_id) REFERENCES users (id),
      FOREIGN KEY (sentence_id) REFERENCES sentences (id)
    )
  `);
};

// JWT 토큰 검증 미들웨어
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid token' });
    }
    req.user = user;
    next();
  });
};

// 회원가입
app.post('/api/register', async (req, res) => {
  const startTime = Date.now();
  const { username, email, password } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress;
  
  try {
    logger.info('회원가입 시도', { 
      username, 
      email, 
      clientIP,
      timestamp: new Date().toISOString()
    });
    
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
      return res.status(400).json({ error: '모든 필드를 입력해주세요.' });
    }

    // 사용자명과 이메일 중복 체크
    const existingUser = db.prepare('SELECT * FROM users WHERE username = ? OR email = ?').get(username, email);
    if (existingUser) {
      if (existingUser.username === username) {
        logger.warn('회원가입 실패: 사용자명 중복', { 
          username, 
          email, 
          clientIP,
          existingUserId: existingUser.id
        });
        return res.status(400).json({ error: 'Username already exists' });
      }
      if (existingUser.email === email) {
        logger.warn('회원가입 실패: 이메일 중복', { 
          username, 
          email, 
          clientIP,
          existingUserId: existingUser.id
        });
        return res.status(400).json({ error: 'Email already exists' });
      }
    }

    // 비밀번호 해시화
    const hashedPassword = await bcrypt.hash(password, 10);

    const stmt = db.prepare('INSERT INTO users (username, email, password) VALUES (?, ?, ?)');
    const result = stmt.run(username, email, hashedPassword);

    const duration = Date.now() - startTime;
    logger.info('회원가입 성공', { 
      username, 
      email, 
      userId: result.lastInsertRowid,
      clientIP,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

    res.json({ 
      message: 'User created successfully',
      userId: result.lastInsertRowid 
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('회원가입 오류', { 
      username, 
      email, 
      clientIP,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
    
    console.error('Register error:', error);
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: '서버 오류가 발생했습니다.' });
    }
  }
});

// 로그인
app.post('/api/login', async (req, res) => {
  const startTime = Date.now();
  const { email, password } = req.body;
  const clientIP = req.ip || req.connection.remoteAddress;
  
  try {
    logger.info('로그인 시도', { 
      email, 
      password: password ? '[HIDDEN]' : '[MISSING]',
      clientIP,
      body: req.body,
      bodyKeys: Object.keys(req.body),
      headers: req.headers,
      timestamp: new Date().toISOString()
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

    const user = db.prepare('SELECT * FROM users WHERE email = ?').get(email);
    
    if (!user) {
      logger.warn('로그인 실패: 이메일 없음', { 
        email, 
        clientIP,
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const validPassword = await bcrypt.compare(password, user.password);
    
    if (!validPassword) {
      logger.warn('로그인 실패: 비밀번호 불일치', { 
        email, 
        userId: user.id,
        clientIP,
        timestamp: new Date().toISOString()
      });
      return res.status(401).json({ error: '이메일 또는 비밀번호가 올바르지 않습니다.' });
    }

    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    const duration = Date.now() - startTime;
    logger.info('로그인 성공', { 
      email, 
      userId: user.id,
      clientIP,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

    res.json({ 
      token,
      user: { id: user.id, username: user.username, email: user.email }
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('로그인 오류', { 
      email, 
      clientIP,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
    
    console.error('Login error:', error);
    res.status(500).json({ error: '서버 오류가 발생했습니다.' });
  }
});

// 문장 등록
app.post('/api/sentences', authenticateToken, async (req, res) => {
  const startTime = Date.now();
  const { japaneseText, koreanMeaning } = req.body;
  const userId = req.user.userId;
  const username = req.user.username;
  const clientIP = req.ip || req.connection.remoteAddress;
  
  try {
    logger.info('문장 등록 시도', { 
      userId, 
      username,
      japaneseText: japaneseText?.substring(0, 50) + (japaneseText?.length > 50 ? '...' : ''),
      koreanMeaning: koreanMeaning?.substring(0, 50) + (koreanMeaning?.length > 50 ? '...' : ''),
      clientIP,
      timestamp: new Date().toISOString()
    });

    if (!japaneseText || !koreanMeaning) {
      logger.warn('문장 등록 실패: 필수 필드 누락', { 
        userId, 
        username,
        clientIP,
        missingFields: {
          japaneseText: !japaneseText,
          koreanMeaning: !koreanMeaning
        }
      });
      return res.status(400).json({ error: '일본어 문장과 한국어 의미를 모두 입력해주세요.' });
    }

    const stmt = db.prepare(`
      INSERT INTO sentences (user_id, japanese_text, korean_meaning)
      VALUES (?, ?, ?)
    `);
    
    const result = stmt.run(userId, japaneseText, koreanMeaning);

    const duration = Date.now() - startTime;
    logger.info('문장 등록 성공', { 
      userId, 
      username,
      sentenceId: result.lastInsertRowid,
      japaneseText: japaneseText.substring(0, 50) + (japaneseText.length > 50 ? '...' : ''),
      koreanMeaning: koreanMeaning.substring(0, 50) + (koreanMeaning.length > 50 ? '...' : ''),
      clientIP,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });

    res.json({ 
      message: 'Sentence added successfully',
      sentenceId: result.lastInsertRowid 
    });
  } catch (error) {
    const duration = Date.now() - startTime;
    logger.error('문장 등록 오류', { 
      userId, 
      username,
      japaneseText: japaneseText?.substring(0, 50) + (japaneseText?.length > 50 ? '...' : ''),
      koreanMeaning: koreanMeaning?.substring(0, 50) + (koreanMeaning?.length > 50 ? '...' : ''),
      clientIP,
      error: error.message,
      stack: error.stack,
      duration: `${duration}ms`,
      timestamp: new Date().toISOString()
    });
    
    res.status(500).json({ error: 'Server error' });
  }
});

// 사용자의 문장 목록 조회
app.get('/api/sentences', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const { date } = req.query;

    let query = `
      SELECT s.*, sr.pass_count, sr.fail_count, sr.last_studied
      FROM sentences s
      LEFT JOIN study_records sr ON s.id = sr.sentence_id AND sr.user_id = ?
      WHERE s.user_id = ?
    `;
    let params = [userId, userId];

    if (date) {
      query += ' AND DATE(s.created_at) = ?';
      params.push(date);
    }

    query += ' ORDER BY s.created_at DESC';

    const sentences = db.prepare(query).all(...params);
    res.json(sentences);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 시험용 문장 선택
app.get('/api/test-sentences', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;
    const { count = 5, date } = req.query;

    let query = `
      SELECT s.*, COALESCE(sr.pass_count, 0) as pass_count, COALESCE(sr.fail_count, 0) as fail_count
      FROM sentences s
      LEFT JOIN study_records sr ON s.id = sr.sentence_id AND sr.user_id = ?
      WHERE s.user_id = ?
    `;
    let params = [userId, userId];

    if (date) {
      query += ' AND DATE(s.created_at) = ?';
      params.push(date);
    }

    query += ' ORDER BY (COALESCE(sr.pass_count, 0) + COALESCE(sr.fail_count, 0)) ASC, RANDOM() LIMIT ?';
    params.push(parseInt(count));

    const sentences = db.prepare(query).all(...params);
    res.json(sentences);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 시험 결과 저장
app.post('/api/test-result', authenticateToken, (req, res) => {
  try {
    const { sentenceId, passed, score } = req.body;
    const userId = req.user.userId;

    // 기존 기록 확인
    const existingRecord = db.prepare(`
      SELECT * FROM study_records 
      WHERE user_id = ? AND sentence_id = ?
    `).get(userId, sentenceId);

    if (existingRecord) {
      // 기존 기록 업데이트
      const stmt = db.prepare(`
        UPDATE study_records 
        SET pass_count = pass_count + ?, fail_count = fail_count + ?, last_studied = CURRENT_TIMESTAMP
        WHERE user_id = ? AND sentence_id = ?
      `);
      stmt.run(passed ? 1 : 0, passed ? 0 : 1, userId, sentenceId);
    } else {
      // 새 기록 생성
      const stmt = db.prepare(`
        INSERT INTO study_records (user_id, sentence_id, pass_count, fail_count, last_studied)
        VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)
      `);
      stmt.run(userId, sentenceId, passed ? 1 : 0, passed ? 0 : 1);
    }

    res.json({ message: 'Test result saved successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 사용자 정보 수정
app.put('/api/user', authenticateToken, async (req, res) => {
  try {
    const { username, email, password } = req.body;
    const userId = req.user.userId;

    let updateFields = [];
    let params = [];

    if (username) {
      updateFields.push('username = ?');
      params.push(username);
    }
    if (email) {
      updateFields.push('email = ?');
      params.push(email);
    }
    if (password) {
      const hashedPassword = await bcrypt.hash(password, 10);
      updateFields.push('password = ?');
      params.push(hashedPassword);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ error: 'No fields to update' });
    }

    params.push(userId);
    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE id = ?`;
    
    const stmt = db.prepare(query);
    stmt.run(...params);

    res.json({ message: 'User updated successfully' });
  } catch (error) {
    if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      res.status(400).json({ error: 'Username or email already exists' });
    } else {
      res.status(500).json({ error: 'Server error' });
    }
  }
});

// 사용자 삭제
app.delete('/api/user', authenticateToken, (req, res) => {
  try {
    const userId = req.user.userId;

    // 관련 데이터 삭제
    db.prepare('DELETE FROM study_records WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM sentences WHERE user_id = ?').run(userId);
    db.prepare('DELETE FROM users WHERE id = ?').run(userId);

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// 데이터베이스 초기화
initDatabase();

// 디버깅용 엔드포인트
app.get('/api/debug/users', (req, res) => {
  try {
    const users = db.prepare('SELECT id, username, email, created_at FROM users').all();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Debug endpoint: http://localhost:${PORT}/api/debug/users`);
  
  logger.info('서버 시작', {
    port: PORT,
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});
