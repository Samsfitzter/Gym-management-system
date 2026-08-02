module.exports = {
  apps: [
    {
      name: "gym-sync-agent",
      script: "index.js",
      interpreter: "node",
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: "300M",
      restart_delay: 5000,
      out_file: "./logs/out.log",
      error_file: "./logs/error.log",
      merge_logs: true,
      // We are not enforcing env_production right away to allow testing with local environment.
      // In a real deployment on client's machine with a valid .env, you can use PM2 environment options.
      env: {
        // NODE_ENV can be set here or derived from the .env file.
        // We will leave it undefined here so dotenv and the OS environment variables dictate it.
      }
    }
  ]
};
