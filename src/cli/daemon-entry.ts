import { startDaemon } from '../core/daemon.js'

startDaemon().catch(err => {
  console.error('Daemon failed to start:', err)
  process.exit(1)
})
