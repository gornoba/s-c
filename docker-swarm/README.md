# 1단계. Swarm 기본 개념 + 단일 노드 서비스

## 필요 개방 포트

| 용도                  | 프로토콜 | 포트 | 설명                                        |
| --------------------- | -------- | ---- | ------------------------------------------- |
| Swarm 클러스터 관리   | TCP      | 2377 | manager <-> worker 통신 (멀티 노드 때 필요) |
| gossip / 노드 간 상태 | TCP/UDP  | 7946 | 노드 간 상태/오버레이 네트워크 관리         |
| overlay 네트워크      | UDP      | 4789 | VXLAN(overlay network) 트래픽               |

## Manager에서 Swarm 초기화

```sh
docker swarm init --advertise-addr <내부 IP주소>
```

## Worker 노드 클러스터 합류

```sh
docker swarm join --token <token> <매니저 내부 IP주소>
```

## Manager에서 클러스터 상태 확인

```sh
docker node ls
```

## 멀티노드 서비스 생성

```sh
docker service create --name web-<본인이름> --replicas 2 --publish <맘에드는포트>:80 nginx
```

## 서비스상태확인

```sh
docker service ls
docker service ps web-<본인이름>
docker service rm web-<본인이름>
```

curl로 내부 아이피 접속 테스트

## 간단한 스케일링

```sh
docker service scale web=3
```

---

# 2단계: Overlay 네트워크 & 서비스 간 통신

Docker Swarm은 여러 노드(Manager/Worker)에 서비스가 흩어져 있게 되는데,
서비스끼리 통신하려면 서로 IP를 찾을 방법이 있어야 합니다.

## ✔ Overlay Network (VXLAN 기반 가상 네트워크)

여러 노드에 걸쳐 있는 전체 가상 네트워크
모든 노드가 하나의 LAN에 있는 것처럼 동작
서비스끼리 자유롭게 통신 가능

## ✔ 내장 DNS

각 서비스는 자동으로 service-name 이라는 DNS 이름을 갖는다.
예:
서비스 이름: api
다른 서비스에서 curl http://api:3000/health 가능
=> 직접 IP를 관리할 필요 없음.
=> 컨테이너 몇 개가 어디에서 도는지 몰라도 서비스명으로 호출 가능.

## 실습

```sh
docker network create -d overlay app-net
docker network ls
docker service create --name api --network app-net --replicas 2 hashicorp/http-echo -text="hello from api"
docker service create --name nginx-<본인이름> --network app-net --replicas 1 nginx
```

---

# 3단계: Volume · Config · Secrets

## Volume 실습: 간단한 DB 서비스 올려보기

① Volume 만들기

```sh
docker volume create pg-data
```

확인:

```sh
docker volume ls
```

② PostgreSQL을 Swarm 서비스로 생성

```sh
docker service create \
 --name postgres \
 --replicas 1 \
 --mount type=volume,source=pg-data,target=/var/lib/postgresql/data \
 -e POSTGRES_PASSWORD=mysecret \
 -p 5432:5432 \
 postgres:16
```

③ 상태 확인

```sh
docker service ps postgres
```

DB는 replicas=1이기 때문에 특정 노드에 고정됩니다.
노드가 죽으면 재배치 시 데이터가 없을 수 있으므로:

➡ 실제 환경에서는 “node.labels” 또는 “constraint” 를 써서 저장 노드를 고정해야 합니다.

## Config 실습 (환경 설정 파일 주입)

Swarm Config는 “민감하지 않은 설정 파일”을 서비스에 주입하는 기능입니다.
① Config 만들기

단순 ENV 내용 만들기:

```sh
echo "APP_ENV=production
APP_NAME=SwarmDemo
MESSAGE=HelloFromConfig" | docker config create app-config -
```

확인:

```sh
docker config ls
```

② Config를 사용하는 서비스 생성

간단한 busybox로 Config 파일을 서비스 내부에 넣어보기:

````sh
docker service create \
  --name web-config-test \
  --config source=app-config,target=/etc/app.env \
  busybox \
  sh -c "while true; do cat /etc/app.env; sleep 3; done"

--config source=app-config,target=/etc/app.env
→ Config 파일을 컨테이너 내부 /etc/app.env에 마운트
③ 동작 확인

로그 확인:
```sh
docker service logs -f web-config-test
````

출력 예:

```ini
APP_ENV=production
APP_NAME=SwarmDemo
MESSAGE=HelloFromConfig
```

## Secret 실습 (민감정보 관리)

Secret은 기본적으로 /run/secrets/<이름> 경로로 주입되며,
암호화된 상태로 Manager와 Worker에 전송됩니다.

① Secret 생성

예: DB 비밀번호

```sh
echo "p@ssw0rd1234" | docker secret create db_password -
```

확인:

```sh
docker secret ls
```

② Secret을 사용하는 테스트 서비스 생성

```sh
docker service create \
  --name secret-test \
  --secret db_password \
  alpine \
  sh -c "while true; do echo 'password:'; cat /run/secrets/db_password; sleep 3; done"
```

Secret은 자동으로 /run/secrets/db_password로 마운트됩니다.

③ 동작 확인

```sh
docker service logs -f secret-test
```

출력:

```sh
password:
p@ssw0rd1234
```

👉 암호값이 실제로 컨테이너 내부에 안전하게 전달되는 것을 확인.

## 업데이트 전략 (Rolling update, Rollback) & 헬스체크

Rolling update: 레플리카를 한 번에 다 바꾸지 않고, 일부씩 순차적으로 새 버전으로 교체
Rollback: 업데이트가 잘못됐을 때 이전 버전(이전 TaskSpec)으로 되돌리기
Healthcheck: 컨테이너가 “살아있다”가 아니라 “정상 동작 중”인지 판단하는 기준

## Rolling update 기본 개념

Swarm에서 서비스는 Task(컨테이너)들의 집합입니다.

```sh
docker service create \
  --name api \
  --replicas 3 \
  --publish 3000:3000 \
  my-api:1.0.0
```

## Rolling update 설정 옵션

서비스 생성 시:

```sh
docker service create \
  --name api \
  --replicas 3 \
  --publish 3000:3000 \
  --update-parallelism 1 \
  --update-delay 10s \
  --update-order start-first \
  my-api:1.0.0
```

혹은 업데이트 시:

```sh
docker service update \
  --image my-api:1.1.0 \
  --update-parallelism 1 \
  --update-delay 10s \
  --update-order start-first \
  api
```

옵션 의미:

- --update-parallelism 1
  - 한 번에 몇 개의 Task를 업데이트할지
  - 예: replicas=10, parallelism=2 → 두 개씩 바꾸며 5라운드 진행
- --update-delay 10s

  - 한 라운드와 다음 라운드 사이 대기 시간
  - 헬스체크 / 모니터링 보고 이상 없다고 확신할 시간을 준다고 보면 됨

- --update-order

  - stop-first (기본값): 기존 Task를 먼저 종료 후 새 Task 시작 → 순간적인 capacity 감소 가능

  - start-first: 새 Task를 먼저 올리고, 준비되면 기존 Task 종료 → 일시적으로 replica 수가 늘어나지만 다운타임 줄이는 데 유리

---

# 4단계: 배치 전략 (Constraints, Placement, Global/Replicated)

## 🎯 학습 목표

서비스가 어떤 노드에 배치될지 제어하는 방법을 이해한다.
Label 기반 제어 (Constraints)를 실습한다.
Placement 전략을 이용해 특정 노드에만 배치되게 한다.
Global 서비스와 Replicated 서비스의 차이를 정확히 체감한다.

## 1. 배치 전략이 필요한 이유

Swarm을 운영하다 보면 아래가 필요해진다.
DB는 SSD가 있는 노드에만 배포해야 함
로그 수집 에이전트는 모든 노드에 1개씩 돌려야 함
GPU가 있는 노드에만 ML 서버를 띄우고 싶음
특정 서비스는 “manager 그룹”에만 배포하고 싶음
특정 노드는 “작업 금지(drain)” 상태로 만들고 싶음
이 모든 걸 해결하는 기능이 Placement + Constraints + Global Mode 이다.

## 2. Constraints (제약 조건)

Constraints = 라벨 기반 배치 규칙
노드에 라벨을 달고, 서비스가 특정 라벨이 있는 노드에만 배치되도록 제한한다.

### 2-1) 노드에 라벨 부여

예시: worker1 노드에 role=api 라벨 추가

```sh
docker node update --label-add role=api worker1
```

다른 라벨도 가능:

```sh
docker node update --label-add disk=ssd worker2
docker node update --label-add gpu=true worker3
```

라벨 확인:

```sh
docker node inspect worker1 --pretty
```

### 2-2) Constraint를 이용한 서비스 배포

특정 노드에만 서비스 배치 (예: role=api)

```sh
docker service create \
  --name api \
  --replicas 2 \
  --constraint 'node.labels.role == api' \
  nginx
```

→ role=api 라벨이 있는 노드에만 배포됨.

### 2-3) 반대 조건도 가능

```sh
--constraint 'node.labels.role != db'
```

예:
모든 노드 중 “db 노드”만 제외하고 배포

## 3. Placement 전략

Swarm에는 Placement Preferences 라는 기능도 포함된다.
Placement 설정은 노드 선택 방법(우선순위) 을 정한다.

### 3-1) Spread 전략

예: 노드 라벨(“rack”) 기준으로 균등하게 분산

```sh
docker service create \
  --name web \
  --replicas 6 \
  --placement-pref 'spread=node.labels.rack' \
  nginx
```

결과:
rackA에 3개
rackB에 3개
rackC에 0개 → 이런 식으로 균등 분산
실제로 대규모 클러스터 운영 시 유용함.

### 3-2) node.role 기반 배치

Manager에만 배치하고 싶을 때:

```sh
--constraint 'node.role == manager'
```

Worker에만 배치하고 싶을 때:

```sh
--constraint 'node.role == worker'
```

### 3-3) Availability 상태 활용

노드를 Drain 시키면 배치하지 않도록 제한할 수 있음:
docker node update --availability drain worker1
이제 worker1에는 어떤 Task도 배치되지 않음.
이미 배치된 Task는 다른 노드로 이동됨.

## 4. Global 모드 vs. Replicated 모드

### 4-1) Replicated (일반 모드)

우리가 지금까지 써온 모드.
예:

```sh
docker service create --replicas 3 nginx
```

Task 개수를 사용자가 지정
Swarm이 어디에 배치할지 조절
스케일링 자유로움 (docker service scale)

### 4-2) Global (전 노드에 1개씩)

```sh
docker service create \
 --name node-exporter \
 --mode global \
 prom/node-exporter
```

클러스터의 모든 노드에 1개씩 배치
새로운 노드가 join하면 자동으로 해당 노드에도 배치
로그 수집 / 모니터링 agent / 보안 agent 등에 적합
이건 사용자가 replica 개수를 지정할 수 없다.
노드 수가 곧 replica 수.

# Stack 수준 배포 (docker stack deploy)

## config 준비

```sh
echo "DATABASE=eyJ0eXBlIjogInBvc3RncmVzIiwiaG9zdCI6ICJkYXRhYmFzZSIsInBvcnQiOiA1NDMyLCJ1c2VybmFtZSI6ICJwb3N0Z3JlcyIsInBhc3N3b3JkIjogImFiY2RlIiwiZGF0YWJhc2UiOiAicG9zdGdyZXMifQo=
REDIS=redis://cache:6379" | docker config create edu-config -

docker config ls
```

## secret 준비

```sh
echo -n 'abcde' | docker secret create edu_db_password -

docker secret ls
```

## label 준비

```sh
docker node update --label-add storage=true --label-add cache=true --label-add role=worker <node 이름>

docker node inspect --pretty <node 이름>
```

## 실행

```sh
docker stack deploy -c docker-compose.yaml <서비스명>
```
