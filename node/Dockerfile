FROM node:22.12.0-alpine

WORKDIR /app

COPY package*.json .

RUN npm install

COPY tsconfig.json tsconfig.json
COPY nest-cli.json nest-cli.json
COPY src src

RUN npm run build

CMD ["npm", "run", "start:dev"]