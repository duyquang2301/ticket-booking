FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm install

COPY . .

RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

COPY --from=build /app/package*.json ./

RUN npm install --production

COPY --from=build /app/dist /app/dist
COPY --from=build /app/src/bookings/redis /app/dist/bookings/redis

EXPOSE 3002

CMD ["npm", "run", "start:prod"]
