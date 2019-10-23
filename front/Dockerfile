FROM node:10-slim

WORKDIR /app

RUN npm install -g nodemon

COPY package*.json ./

RUN npm ci \
 && npm cache clean --force \
 && mv /app/node_modules /node_modules

COPY . .

ENV PORT 80
ENV SERVICE_PORT 5525

EXPOSE 80
EXPOSE 5525

CMD ["node", "server.js"]