# Base image that already includes all the Linux dependencies for Playwright/Chromium
FROM mcr.microsoft.com/playwright:v1.44.0-jammy

WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy the rest of your application code
COPY . .

# Build the Next.js application
RUN npm run build

# Expose the port Railway will map to
EXPOSE 3000

# Start the production Next.js server
CMD ["npm", "start"]
