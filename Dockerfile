FROM node:20-slim AS frontend-build

RUN apt-get update && apt-get install -y python3 make g++ && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY package.json package-lock.json ./
ENV BACKEND_URL=http://localhost:5000
RUN npm ci

COPY . .
RUN npm run build

FROM python:3.11-slim

RUN apt-get update && apt-get install -y nodejs npm curl && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY --from=frontend-build /app/node_modules ./node_modules
COPY --from=frontend-build /app/.next ./.next
COPY --from=frontend-build /app/package.json ./
COPY --from=frontend-build /app/next.config.ts ./
COPY --from=frontend-build /app/tsconfig.json ./
COPY --from=frontend-build /app/postcss.config.mjs ./
COPY --from=frontend-build /app/app ./app
COPY --from=frontend-build /app/lib ./lib
COPY --from=frontend-build /app/components ./components
COPY --from=frontend-build /app/middleware.ts ./
COPY --from=frontend-build /app/public ./public
COPY --from=frontend-build /app/components.json ./
COPY .env.example .env.local

COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

COPY backend/ ./backend/

RUN mkdir -p backend/uploads backend/backups

EXPOSE 3000 5000

COPY start.sh ./start.sh
RUN chmod +x start.sh

CMD ["./start.sh"]
