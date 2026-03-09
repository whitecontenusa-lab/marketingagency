import { spawn } from 'child_process'
import * as os from 'os'
import * as path from 'path'
import * as fs from 'fs'

/**
 * Runs a prompt through the Claude CLI subprocess.
 * Uses the pre-authenticated claude installation on the host machine.
 * Deletes CLAUDECODE + CLAUDE_CODE_ENTRYPOINT to prevent nested-session errors.
 * Uses a unique temp directory per call so Claude starts a fresh conversation.
 */
export async function runClaudeSubprocess(
  prompt: string,
  timeoutMs: number = 120_000,
): Promise<string> {
  const spawnEnv = { ...process.env }
  delete spawnEnv['CLAUDECODE']
  delete spawnEnv['CLAUDE_CODE_ENTRYPOINT']

  // CLAUDE_HOME must point to the user profile where claude is authenticated.
  // On the self-hosted Windows machine this is C:\Users\geren.
  // Override via CLAUDE_HOME env var for portability.
  const claudeHome = process.env.CLAUDE_HOME ?? 'C:\\Users\\geren'
  spawnEnv['HOME'] = claudeHome
  spawnEnv['USERPROFILE'] = claudeHome
  spawnEnv['APPDATA'] = path.join(claudeHome, 'AppData', 'Roaming')
  spawnEnv['LOCALAPPDATA'] = path.join(claudeHome, 'AppData', 'Local')

  // Unique cwd per call — Claude tracks conversation history by cwd.
  // A fresh directory guarantees a new conversation, not a resumed one.
  const runDir = path.join(os.tmpdir(), `claude-run-${Date.now()}-${Math.random().toString(36).slice(2)}`)
  fs.mkdirSync(runDir, { recursive: true })

  return new Promise((resolve, reject) => {
    const proc = spawn('claude', ['--print', '--dangerously-skip-permissions'], {
      env: spawnEnv,
      shell: true,
      stdio: ['pipe', 'pipe', 'pipe'],
      cwd: runDir,
    })

    let stdout = ''
    let stderr = ''
    proc.stdout.on('data', (d: Buffer) => { stdout += d.toString() })
    proc.stderr.on('data', (d: Buffer) => { stderr += d.toString() })

    const timer = setTimeout(() => {
      proc.kill('SIGTERM')
      reject(new Error(`Claude subprocess timed out after ${timeoutMs}ms. stdout: ${stdout.length} chars. stderr: ${stderr.slice(0, 300)}`))
    }, timeoutMs)

    proc.on('close', (code: number) => {
      clearTimeout(timer)
      try { fs.rmSync(runDir, { recursive: true, force: true }) } catch { /* ignore */ }
      if (code !== 0 && !stdout) {
        reject(new Error(`Claude exited ${code}: ${stderr.slice(0, 300)}`))
      } else {
        resolve(stdout)
      }
    })

    proc.on('error', (err: Error) => {
      clearTimeout(timer)
      reject(err)
    })

    proc.stdin.write(prompt, 'utf8', () => proc.stdin.end())
  })
}
