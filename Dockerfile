# Use the official GCC image for a robust compilation environment
FROM gcc:latest

# Set the working directory inside the container
WORKDIR /app

# Copy all project files into the container workspace
COPY . .

# Compile the C backend files, include headers, link math library (-lm), and output binary 'server'
RUN gcc backend/src/*.c -Ibackend/include -o server -lm

# Render defaults web services to port 10000
EXPOSE 10000

# Execute the compiled C binary on container startup
CMD ["./server"]