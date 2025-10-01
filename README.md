# 秀: 일본어 통문장 암기

일본어 문장을 암기하고 테스트할 수 있는 웹 애플리케이션입니다.

## 기능

- **사용자 인증**: 회원가입, 로그인, 프로필 관리
- **문장 관리**: 일본어 문장과 한국어 뜻 등록
- **학습 테스트**: 등록된 문장으로 테스트 진행
- **진도 추적**: 패스/실패 횟수 및 학습 통계

## 기술 스택

### Frontend
- React 19.1.1
- TypeScript
- React Router DOM
- Axios

### Backend
- Node.js
- Express
- PostgreSQL
- JWT 인증
- Winston 로깅

## 로컬 개발

### 필수 요구사항
- Node.js 16+
- PostgreSQL

### 설치 및 실행

1. 저장소 클론
```bash
git clone https://github.com/dongsoocloud/japansentence.git
cd japansentence
```

2. 의존성 설치
```bash
npm install
```

3. 환경 변수 설정
```bash
cp env.example .env
# .env 파일을 편집하여 데이터베이스 URL과 JWT 시크릿 설정
```

4. 개발 서버 실행
```bash
npm run dev
```

## Railway 배포

### 1. Railway CLI 설치
```bash
npm install -g @railway/cli
```

### 2. Railway 로그인
```bash
railway login
```

### 3. 프로젝트 초기화
```bash
railway init
```

### 4. PostgreSQL 데이터베이스 추가
```bash
railway add postgresql
```

### 5. 환경 변수 설정
```bash
railway variables set JWT_SECRET=your-super-secret-jwt-key-here
```

### 6. 배포
```bash
railway up
```

## 환경 변수

| 변수명 | 설명 | 기본값 |
|--------|------|--------|
| `DATABASE_URL` | PostgreSQL 연결 URL | - |
| `JWT_SECRET` | JWT 토큰 시크릿 키 | - |
| `PORT` | 서버 포트 | 5000 |
| `NODE_ENV` | 실행 환경 | development |

## API 엔드포인트

### 인증
- `POST /api/register` - 회원가입
- `POST /api/login` - 로그인

### 문장 관리
- `GET /api/sentences` - 문장 목록 조회
- `POST /api/sentences` - 문장 추가

### 테스트
- `POST /api/test-result` - 시험 결과 제출

## 제작자

김동수 (일본 클라우드 엔지니어)

## 라이선스

MIT License