## EC2

- 이름: education-{본인이름}
- 인스턴스유형: t3.medium
- 키페어: education
- 네트워크 - 방화벽: education-security
- 스토리지: 10Gib
- 고급세부정보 - 구매옵션: 스팟 인스턴스

## docker 및 git 설치

```sh
sudo dnf update -y
sudo dnf install docker git -y
sudo systemctl enable --now docker
sudo usermod -aG docker ec2-user
docker version
```

## docker compose 설치

```sh
DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
mkdir -p $DOCKER_CONFIG/cli-plugins
curl -SL https://github.com/docker/compose/releases/download/v2.40.3/docker-compose-linux-x86_64 -o $DOCKER_CONFIG/cli-plugins/docker-compose
chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose
docker compose version
```
