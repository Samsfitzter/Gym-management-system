# Gym Sync Agent Deployment Guide

This document outlines the deployment, configuration, and troubleshooting steps for the Gym Sync Agent on a client's machine using PM2.

## Requirements

* **Node.js version**: v22.21.1 (or compatible)
* **PM2 version**: 7.0.3 (or compatible)

## Initial Installation Steps

If you are setting up the agent on a new machine for the first time:

1. **Install Node dependencies**:
   Navigate to the `gym-sync-agent` folder in a terminal (Command Prompt or PowerShell as Administrator) and run:
   ```bash
   npm install
   ```

2. **Setup Environment Configuration**:
   Copy `.env.example` to `.env` and fill in the required client-specific database credentials and API keys.

3. **Install PM2 globally**:
   ```bash
   npm install -g pm2
   ```

4. **Install PM2 Windows Startup** (Required for Windows auto-start on boot):
   ```bash
   npm install -g pm2-windows-startup
   pm2-startup install
   ```
   *Note: If on a non-Windows OS, use `pm2 startup` instead.*

5. **Start the Agent with PM2**:
   ```bash
   pm2 start ecosystem.config.cjs
   ```

6. **Save the PM2 process list** (so it starts automatically after reboot):
   ```bash
   pm2 save
   ```

## Managing the Service

Here are the commands you will use to manage the agent:

* **Check process status**:
  ```bash
  pm2 status
  ```
  *(or `pm2 list`)*

* **View live logs**:
  ```bash
  pm2 logs gym-sync-agent
  ```

* **View explicit log files**:
  Out logs: `logs/out.log`
  Error logs: `logs/error.log`

* **Restart the agent**:
  ```bash
  pm2 restart gym-sync-agent
  ```

* **Stop the agent** (temporarily):
  ```bash
  pm2 stop gym-sync-agent
  ```

* **Remove the agent from PM2**:
  ```bash
  pm2 delete gym-sync-agent
  ```

* **Disable automatic startup** (if you no longer want PM2 to run on boot):
  ```bash
  pm2-startup uninstall
  ```

## Update Procedure

If you receive an updated version of the code:

1. Pull or copy the latest code into the `gym-sync-agent` directory.
2. Run `npm install` to install any new dependencies.
3. Run `pm2 restart gym-sync-agent` to apply the updates.

## Backup Procedure

*   **Codebase**: Back up the `gym-sync-agent` directory.
*   **Configuration**: Pay special attention to backing up the `.env` file as it contains all sensitive client credentials and is intentionally excluded from Git.

## Troubleshooting

1. **Process crashes frequently (status: errored)**:
   * Run `pm2 logs gym-sync-agent` or check `logs/error.log` for stack traces.
   * Ensure `.env` is correctly populated with the right database connections.
   * Ensure the local Hikvision or other biometric devices are accessible on the network.

2. **Agent is not starting on boot**:
   * Verify the `pm2-windows-startup` registry entry exists by re-running `pm2-startup install`.
   * Ensure you ran `pm2 save` after starting the agent! PM2 only resurrects processes that were saved.

3. **Replacing the `.env` file**:
   * Simply edit `.env` using a text editor (like Notepad).
   * Once saved, run `pm2 restart gym-sync-agent` so the environment variables are reloaded.
