# Start with the official Zcash image (Debian-based)
FROM electriccoinco/zcashd:latest

# Switch to root to install Node.js
USER root

# 1. Install Node.js and tools
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_18.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean

# 2. Setup App Directory
WORKDIR /app

# 3. Copy your project files
COPY package.json .
COPY server.js .

# 4. Install Node dependencies
RUN npm install

# 5. Copy the Startup Script (We will create this next)
COPY start.sh .
RUN chmod +x start.sh

# 6. Expose the API Port
EXPOSE 3001

# 7. Run the startup script
CMD ["./start.sh"]