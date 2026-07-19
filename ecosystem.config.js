module.exports = {
  apps: [
    {
      name: "dd-backend",
      cwd: "./backend",
      script: "python",
      args: "-m uvicorn main:app --host 0.0.0.0 --port 8000",
      env: {
        PYTHONPATH: "./backend",
        PYTHONDONTWRITEBYTECODE: "1",
      },
      max_memory_restart: "300M",
      restart_delay: 5000,
      max_restarts: 10,
    },
    {
      name: "dd-frontend",
      script: "node",
      args: ".next/standalone/server.js",
      env: {
        NODE_ENV: "production",
        HOSTNAME: "0.0.0.0",
        PORT: 3000,
        BACKEND_URL: "http://127.0.0.1:8000",
      },
      max_memory_restart: "256M",
      restart_delay: 5000,
      max_restarts: 10,
    },
  ],
};
