import { spawn } from 'node:child_process'

const args = [
  'db',
  'query',
  '--linked',
  '--file',
  'supabase/tests/rls.sql',
  '--output-format',
  'text',
  '--agent',
  'no',
]

const executable = process.platform === 'win32' ? 'supabase.exe' : 'supabase'
const child = spawn(executable, args, {
  cwd: process.cwd(),
  env: process.env,
  stdio: ['ignore', 'pipe', 'pipe'],
})

let output = ''

for (const stream of [child.stdout, child.stderr]) {
  stream.setEncoding('utf8')
  stream.on('data', (chunk) => {
    output += chunk
    process.stdout.write(chunk)
  })
}

child.on('error', (error) => {
  console.error(`Unable to start Supabase CLI: ${error.message}`)
  process.exitCode = 1
})

child.on('close', (code) => {
  const tapFailed = /(?:not ok|# Looks like|# No tests run|# Bad plan)/i.test(output)
  process.exitCode = code === 0 && !tapFailed ? 0 : 1
})
