FROM node:20-bookworm-slim

WORKDIR /app

RUN apt-get update \
    && apt-get install -y --no-install-recommends python3 python3-numpy python3-sklearn \
    && rm -rf /var/lib/apt/lists/*

COPY server/package*.json ./

RUN npm install

COPY server/ ./
COPY vera_rag/ /vera_rag/

EXPOSE 5000

CMD ["npm", "start"]
