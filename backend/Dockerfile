# Backend Docker (Production)
# Multi-stage build with lint check in builder stage

FROM node:20-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci --only=production

COPY . .

RUN npm run lint

FROM node:20-alpine AS runtime

WORKDIR /app

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/src ./src
COPY --from=builder /app/sql ./sql
COPY --from=builder /app/package.json ./

RUN mkdir -p /app/uploads

ENV NODE_ENV=production
ENV PORT=5000

EXPOSE 5000

CMD ["node", "src/server.prod.js"]
