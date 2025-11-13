FROM node:20-alpine

WORKDIR /app

COPY package.json .

RUN npm install

COPY app.js .

ENV TEST=Docker

CMD ["npm", "run", "dev"]