## 로컬에서 ECR에 PUSH하기 위한 과정

```sh
aws configure set aws_access_key_id "YOUR_ACCESS_KEY" --profile education
aws configure set aws_secret_access_key "YOUR_SECRET_KEY" --profile education
aws configure set region "ap-northeast-2" --profile education
aws configure set output "json" --profile education
```

## ECR에 docker image push

```sh
ecr get-login-password --region ap-northeast-2 --profile education | docker login --username AWS --password-stdin 003939337440.dkr.ecr.ap-northeast-2.amazonaws.com

docker build --platform=linux/amd64 -t education .

docker tag education:latest 003939337440.dkr.ecr.ap-northeast-2.amazonaws.com/education:{본인이름}

docker push 003939337440.dkr.ecr.ap-northeast-2.amazonaws.com/education:{본인이름}
```

## EC2

- 이름: education-{본인이름}
- 인스턴스유형: t3.medium
- 키페어: education
- 네트워크 - 방화벽: education-security
- 스토리지: 10Gib
- 고급세부정보 - IAM 인스턴스 프로파일: education
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

https://docs.docker.com/compose/install/linux/#install-the-plugin-manually

```sh
DOCKER_CONFIG=${DOCKER_CONFIG:-$HOME/.docker}
mkdir -p $DOCKER_CONFIG/cli-plugins
curl -SL https://github.com/docker/compose/releases/download/v2.40.3/docker-compose-linux-x86_64 -o $DOCKER_CONFIG/cli-plugins/docker-compose
chmod +x $DOCKER_CONFIG/cli-plugins/docker-compose
docker compose version
```

## EC2에서 docker compose 실행

```sh
ecr get-login-password --region ap-northeast-2 | docker login --username AWS --password-stdin 003939337440.dkr.ecr.ap-northeast-2.amazonaws.com

docker compose up -f docker-compose-ec2.yml up -d
```
