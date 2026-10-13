# Use a lightweight Linux image with GCC installed
FROM gcc:latest

# Set the working directory inside the container
WORKDIR /app

# Copy all project files into the container
COPY . .

# Compile the C backend
RUN gcc backend/src/*.c -Ibackend/include -o server -lm

# Render requires web services to listen on port 10000 by default. 
# (Make sure your Mongoose server in main.c is listening on port 10000, or bind it dynamically)
EXPOSE 10000

# Run the compiled C binary when the container starts
CMD ["./server"]