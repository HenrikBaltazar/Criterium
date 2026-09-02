FROM node:20-alpine AS builder

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

RUN npm ci

COPY . .

RUN npm run build

FROM node:20-alpine

RUN apk add --no-cache openssl

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma/

COPY --from=builder /app/dist ./dist
COPY --from=builder /app/src/public ./src/public
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 8080

RUN chown -R node:node /app

USER node

CMD ["node", "dist/index.js"]
