## 🔨 1. Docker 이미지 빌드

프로젝트 루트에서:

```sh
docker build -t my-node-app .
```

my-node-app이라는 이미지가 생긴다.

## ▶️ 2. Docker 컨테이너 실행

```sh
docker run -d -p 3000:3000 --name my-node-container my-node-app
```

### 옵션 설명

- -d → 백그라운드 실행
- -p 3000:3000 → 호스트 3000포트 → 컨테이너 3000포트
- --name → 컨테이너 이름 지정
- my-node-app → 아까 빌드한 이미지 이름

## 🌐 3. 결과 확인

브라우저에서:

curl http://localhost:3000

## 4. docker compose

```sh
docker compose up -d
```
