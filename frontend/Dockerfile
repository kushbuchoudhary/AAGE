FROM node:20-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY public/ ./public/
COPY src/ ./src/
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Create entrypoint script to handle environment variables
RUN printf '#!/bin/sh\n\
set -e\n\
BACKEND_URL=${BACKEND_URL:-http://localhost:5000}\n\
sed -i "s|{{BACKEND_URL}}|$BACKEND_URL|g" /etc/nginx/conf.d/default.conf\n\
nginx -g "daemon off;"\n' > /entrypoint.sh && chmod +x /entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["/entrypoint.sh"]
