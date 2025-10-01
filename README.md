# 일본어 문장 학습 애플리케이션

React와 TypeScript로 개발된 일본어 문장 학습 및 시험 애플리케이션입니다.

## 주요 기능

### 사용자 관리
- 회원가입, 로그인, 로그아웃
- 사용자 정보 수정 및 삭제
- JWT 토큰 기반 인증

### 문장 관리
- 일본어 문장과 한국어 뜻 등록
- 자동 후리가나 생성
- 주요 단어 추출 및 표시
- 날짜별 문장 목록 조회

### 시험 기능
- 등록된 문장으로 시험 진행
- 날짜 및 문장 수 선택 가능
- 실시간 점수 계산 (90점 이상 패스)
- 틀린 부분 시각적 표시
- 패스/실패 횟수 기록

## 기술 스택

### 프론트엔드
- React 19.1.1
- TypeScript
- React Router DOM
- Axios
- CSS3

### 백엔드
- Node.js
- Express.js
- SQLite (개발환경)
- PostgreSQL (프로덕션)
- JWT 인증
- bcryptjs 암호화

## 설치 및 실행

### 1. 의존성 설치
```bash
npm install
```

### 2. 개발 서버 실행
```bash
# 백엔드와 프론트엔드를 동시에 실행
npm run dev

# 또는 개별 실행
npm run server  # 백엔드 서버 (포트 5000)
npm start       # 프론트엔드 (포트 3000)
```

### 3. 프로덕션 빌드
```bash
npm run build
```

## 프로젝트 구조

```
jpsentence/
├── public/
├── src/
│   ├── components/          # React 컴포넌트
│   │   ├── Login.tsx
│   │   ├── Register.tsx
│   │   ├── Dashboard.tsx
│   │   ├── AddSentence.tsx
│   │   ├── SentenceList.tsx
│   │   ├── Test.tsx
│   │   ├── UserProfile.tsx
│   │   └── Navbar.tsx
│   ├── services/           # API 서비스
│   │   └── api.ts
│   ├── utils/              # 유틸리티 함수
│   │   └── japaneseUtils.js
│   ├── App.tsx
│   └── App.css
├── server.js               # Express 서버
├── jpsentence.db          # SQLite 데이터베이스 (자동 생성)
└── package.json
```

## API 엔드포인트

### 인증
- `POST /api/register` - 회원가입
- `POST /api/login` - 로그인

### 문장 관리
- `GET /api/sentences` - 문장 목록 조회
- `POST /api/sentences` - 문장 등록
- `GET /api/test-sentences` - 시험용 문장 조회
- `POST /api/test-result` - 시험 결과 저장

### 사용자 관리
- `PUT /api/user` - 사용자 정보 수정
- `DELETE /api/user` - 사용자 삭제

## 데이터베이스 스키마

### users 테이블
- id (INTEGER PRIMARY KEY)
- username (TEXT UNIQUE)
- email (TEXT UNIQUE)
- password (TEXT)
- created_at (DATETIME)

### sentences 테이블
- id (INTEGER PRIMARY KEY)
- user_id (INTEGER)
- japanese_text (TEXT)
- korean_meaning (TEXT)
- furigana (TEXT)
- key_words (TEXT)
- created_at (DATETIME)

### study_records 테이블
- id (INTEGER PRIMARY KEY)
- user_id (INTEGER)
- sentence_id (INTEGER)
- pass_count (INTEGER)
- fail_count (INTEGER)
- last_studied (DATETIME)

## 환경 변수

개발 환경에서는 SQLite를 사용하며, 프로덕션 환경에서는 PostgreSQL을 사용할 수 있습니다.

```env
# .env 파일 (선택사항)
JWT_SECRET=your-secret-key
PORT=5000
```

## 배포

### Railway 배포
1. Railway 계정 생성
2. PostgreSQL 데이터베이스 연결
3. 환경 변수 설정
4. GitHub 연동 후 자동 배포

### 환경 변수 설정
- `JWT_SECRET`: JWT 토큰 암호화 키
- `DATABASE_URL`: PostgreSQL 연결 문자열

## 개발자 정보

이 프로젝트는 일본어 학습을 위한 개인 프로젝트입니다.

## 라이선스

MIT License