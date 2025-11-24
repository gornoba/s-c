FROM node:22.12.0-alpine

WORKDIR /app

RUN apk add --no-cache curl

COPY package*.json .

RUN npm install

COPY tsconfig.json tsconfig.json
COPY nest-cli.json nest-cli.json
COPY src src

RUN npm run build

CMD ["npm", "run", "start:prod"]

HEALTHCHECK --interval=30s --timeout=30s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3000/healthcheck || exit 1