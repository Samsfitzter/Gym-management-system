# Gym Sync Agent

This is the standalone background service that bridges the local physical Hikvision device with your cloud-hosted Neon database.

## Setup Instructions

1. Install Node.js on the local reception computer if not already installed.
2. Open a terminal (PowerShell or Command Prompt) as Administrator.
3. Navigate to this directory: `cd C:\gym-management-system\gym-sync-agent`
4. Install dependencies: `npm install`
5. Install PM2 globally: `npm install -g pm2`

## Running as a Background Service

To ensure the sync agent runs silently in the background and **automatically starts when Windows boots**, use PM2:

1. Start the agent:
   ```bash
   pm2 start index.js --name "gym-sync-agent"
   ```
2. Save the current PM2 list to spawn on startup:
   ```bash
   pm2 save
   ```
3. Install the PM2 Windows startup script (run as Administrator):
   ```bash
   npm install pm2-windows-startup -g
   pm2-startup install
   ```

Now, the `gym-sync-agent` will automatically start processing biometric events every time the reception PC is turned on!

## Managing the Agent

- To view live logs: `pm2 logs gym-sync-agent`
- To stop the agent: `pm2 stop gym-sync-agent`
- To restart the agent: `pm2 restart gym-sync-agent`
