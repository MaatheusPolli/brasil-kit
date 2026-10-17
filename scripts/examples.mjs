// Roda os exemplos em modo offline (BRASILKIT_OFFLINE=1) de forma portável (Windows/Unix),
// sem depender da sintaxe `VAR=valor cmd` do shell.
import { spawnSync } from 'node:child_process';

const exemplos = ['examples/node-basico.ts', 'examples/com-cache-custom.ts'];
const env = { ...process.env, BRASILKIT_OFFLINE: '1' };

for (const arquivo of exemplos) {
  const resultado = spawnSync('npx', ['tsx', arquivo], { stdio: 'inherit', env, shell: true });
  if (resultado.status !== 0) {
    process.exit(resultado.status ?? 1);
  }
}
