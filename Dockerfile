FROM node:22-alpine AS frontend-builder 
WORKDIR /app/client
COPY client/package*.json ./
RUN npm install
COPY client/ .
RUN npm run build

FROM node:22-alpine AS backend-builder
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /usr/src/app

RUN apk add --no-cache vips-dev build-base python3

COPY package*.json ./
RUN npm install --production

COPY --from=backend-builder /app/dist ./dist

COPY --from=frontend-builder /app/client/dist ./client/dist

ENV NODE_ENV=production
EXPOSE 3000

CMD ["node", "dist/index.js"]