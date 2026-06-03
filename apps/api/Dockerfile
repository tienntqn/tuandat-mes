FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN apk add openssl libc6-compat
RUN npm install
COPY . .
RUN npx prisma generate
RUN npm run build
# Biên dịch seed.ts -> JS để chạy bằng node ở runtime (runner không có ts-node)
RUN npx tsc prisma/seed.ts --outDir prisma-dist --rootDir prisma --module commonjs --target es2019 --esModuleInterop --skipLibCheck

FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production
RUN apk add --no-cache openssl libc6-compat
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/prisma-dist ./prisma-dist
COPY prisma ./prisma

EXPOSE 3000
CMD ["sh", "-c", "npx prisma migrate deploy && node dist/src/main"]
