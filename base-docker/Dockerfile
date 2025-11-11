FROM node:20-alpine

WORKDIR /app

COPY package.json .
COPY app.js .

RUN npm install

ENV TEST=Docker

CMD ["node", "app.js"]