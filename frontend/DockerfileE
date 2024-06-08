FROM busybox:1.35

# Set the working directory
WORKDIR /app

# Copy the source code
COPY src/ .

# Copy the entrypoint script
COPY entrypoint.sh /app/entrypoint.sh

# Set execute permission for the entrypoint script
RUN chmod +x /app/entrypoint.sh

# Expose port 3000 if needed
EXPOSE 3000

# Set the entrypoint script as the entry point
ENTRYPOINT ["/app/entrypoint.sh"]
