## docker network

```sh
docker network create nestjs-network
```

## docker build

```sh
docker build -t my-nestjs-app:latest -f Dockerfile .
```

## docker run

```sh
docker run -d --name database --network nestjs-network -e POSTGRES_PASSWORD=abcde -v $(pwd)/postgres-data:/var/lib/postgresql/data -p 5432:5432 postgres:17-alpine


docker run -d --name cache --network nestjs-network -p 6379:6379 redis:alpine


docker run -d --name my-nestjs-app --network nestjs-network -p 3000:3000 -v $(pwd)/src:/app/src my-nestjs-app:late
```

## 🔨 1. docker compose

```sh
docker compose up -d
```

## 🌐 2. 결과 확인

브라우저에서:

curl http://localhost:3000
