# Railway 배포 가이드

## 1. Railway 웹사이트에서 배포

1. **Railway 웹사이트 접속**: https://railway.app
2. **GitHub 연동**: GitHub 계정으로 로그인
3. **새 프로젝트 생성**: "New Project" 클릭
4. **GitHub 저장소 연결**: `japansentence` 저장소 선택
5. **자동 배포**: Railway가 자동으로 감지하고 배포

## 2. 환경변수 설정

Railway 대시보드에서 다음 환경변수들을 설정해야 합니다:

### 필수 환경변수:
- `JWT_SECRET`: JWT 토큰 암호화를 위한 시크릿 키 (랜덤 문자열)
- `NODE_ENV`: `production`
- `PORT`: Railway가 자동으로 설정

### 자동 설정:
- `DATABASE_URL`: Railway가 PostgreSQL 데이터베이스 연결을 위해 자동 설정

## 3. PostgreSQL 데이터베이스 추가

1. Railway 대시보드에서 "Add Service" 클릭
2. "Database" 선택
3. "PostgreSQL" 선택
4. Railway가 자동으로 `DATABASE_URL` 환경변수 설정

## 4. 배포 확인

배포가 완료되면 Railway가 제공하는 URL로 접속하여 확인:
- 예: `https://your-app-name.railway.app`

## 5. 로그 확인

Railway 대시보드에서 실시간 로그를 확인할 수 있습니다.

## 6. 도메인 설정 (선택사항)

Railway에서 커스텀 도메인을 설정할 수 있습니다.
