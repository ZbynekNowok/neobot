module.exports = {
  apps: [
    {
      name: "neobot",
      script: "server.js",
      cwd: "/home/vpsuser/neobot",
      instances: 1,
      exec_mode: "fork",

      watch: false,
      autorestart: true,
      max_memory_restart: "300M",
      restart_delay: 5000,
      max_restarts: 10,

      env: {
        NODE_ENV: "production",
        LLM_ENABLED: "true"
      },

      output: "/home/vpsuser/.pm2/logs/neobot-out.log",
      error: "/home/vpsuser/.pm2/logs/neobot-error.log",
      merge_logs: true,
      log_date_format: "YYYY-MM-DD HH:mm:ss"
    }
  ]
};
