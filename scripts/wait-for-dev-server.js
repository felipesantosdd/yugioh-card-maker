const http = require('http')

const port = Number(process.env.DEV_SERVER_PORT || 9080)
const host = process.env.DEV_SERVER_HOST || '127.0.0.1'
const timeoutMs = Number(process.env.DEV_SERVER_TIMEOUT_MS || 120000)
const retryDelayMs = 500

function isServerReady() {
  return new Promise((resolve) => {
    const req = http.get(
      {
        host,
        port,
        path: '/',
        timeout: 2000,
      },
      (res) => {
        res.resume()
        resolve(res.statusCode >= 200 && res.statusCode < 500)
      }
    )

    req.on('error', () => resolve(false))
    req.on('timeout', () => {
      req.destroy()
      resolve(false)
    })
  })
}

async function waitForServer() {
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    if (await isServerReady()) {
      process.stdout.write(
        `[wait-for-dev-server] Server ready at http://${host}:${port}\n`
      )
      process.exit(0)
    }

    await new Promise((resolve) => setTimeout(resolve, retryDelayMs))
  }

  process.stderr.write(
    `[wait-for-dev-server] Timeout waiting for http://${host}:${port}\n`
  )
  process.exit(1)
}

waitForServer()
