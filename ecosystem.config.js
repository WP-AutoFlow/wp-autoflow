module.exports = {
  apps: [
    {
      name: "wp-autoflow",
      script: "./dist/index.js",
      instances: 1,
      exec_mode: "fork",      
      watch: false,
      max_memory_restart: "1G",
      env: {
        NODE_ENV: "production",
        PORT: 3000
      }
    }
  ]
};