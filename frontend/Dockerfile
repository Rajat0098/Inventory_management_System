FROM node:20-slim

WORKDIR /app

COPY package*.json ./

# Install packages
RUN npm install

COPY . .

# Expose Vite port
EXPOSE 5173

# Run development server with host parameter to bind outside Docker container
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
