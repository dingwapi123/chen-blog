import { execFile } from 'node:child_process'
import { readFile, rename, unlink, writeFile } from 'node:fs/promises'
import { createRequire } from 'node:module'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)
const require = createRequire(import.meta.url)
const repositoryRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const outputPath = resolve(repositoryRoot, 'packages/database-types/src/index.ts')
const temporaryPath = `${outputPath}.${process.pid}.${Date.now()}.tmp`
const projectId = 'bpmmrasmlzgoalklakpn'
const supabaseCliPath = resolve(dirname(require.resolve('supabase/package.json')), 'dist/supabase.js')

function validateGeneratedTypes(source) {
  const requiredMarkers = [
    'export type Json =',
    'export type Database = {',
    'export const Constants =',
  ]

  if (source.length < 500 || requiredMarkers.some(marker => !source.includes(marker))) {
    throw new Error('Supabase CLI returned an incomplete or unexpected TypeScript schema.')
  }
}

try {
  const { stdout } = await execFileAsync(
    process.execPath,
    [supabaseCliPath, 'gen', 'types', 'typescript', '--project-id', projectId],
    {
      cwd: repositoryRoot,
      encoding: 'utf8',
      maxBuffer: 10 * 1024 * 1024,
    },
  )

  const generatedTypes = stdout.endsWith('\n') ? stdout : `${stdout}\n`
  validateGeneratedTypes(generatedTypes)

  await writeFile(temporaryPath, generatedTypes, { encoding: 'utf8', flag: 'wx' })
  validateGeneratedTypes(await readFile(temporaryPath, 'utf8'))
  await rename(temporaryPath, outputPath)

  console.log(`Generated database types at ${outputPath}`)
}
catch (error) {
  await unlink(temporaryPath).catch(() => undefined)
  console.error('Database type generation failed; the existing type file was left unchanged.')
  throw error
}
