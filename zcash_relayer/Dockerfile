# Start with the official Zcash image
FROM electriccoinco/zcashd:latest

# Switch to root to install Node.js and manage files
USER root

# 1. Install Node.js 22 (Fixes the Starknet warning)
# Changed setup_18.x -> setup_22.x
RUN apt-get update && apt-get install -y \
    curl \
    gnupg \
    && curl -fsSL https://deb.nodesource.com/setup_22.x | bash - \
    && apt-get install -y nodejs \
    && apt-get clean

# 2. Fix the Zcash Directory Crash
# We manually create the config folder so Zcash doesn't fail when trying to touch the config file
RUN mkdir -p /root/.zcash && touch /root/.zcash/zcash.conf

# 3. Setup App Directory
WORKDIR /app

# 4. Copy Dependencies first (Better caching)
COPY package.json .

# 5. Install Node dependencies
RUN npm install

# 6. Copy the rest of the app
COPY server.js .
COPY start.sh .

# 7. Make script executable
RUN chmod +x start.sh

# 8. Reset Entrypoint
# This is CRITICAL. It stops the base image from running its own broken setup script.
ENTRYPOINT []

# 9. Expose the API Port
EXPOSE 3001

# 10. Run your startup script
CMD ["./start.sh"]