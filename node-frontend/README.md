## 1. docker image build

```sh
docker build --target builder -t my-vue-app:latest -f Dockerfile .
```

## 2. docker run

```sh
docker run -d --name my-vue-app -p 5173:5173 -v $(pwd)/src:/app/src my-vue-app:latest npm run dev
```

## ▶️ 1. docker compose

```sh
docker compose -f docker-compose-local.yaml up -d
```

## 🌐 2. 결과 확인

브라우저에서:

http://localhost:5173
