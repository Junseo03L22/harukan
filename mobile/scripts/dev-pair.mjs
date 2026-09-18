import { spawn } from 'node:child_process';
import { networkInterfaces } from 'node:os';
import { createService } from '../server/server.mjs';
import { resolve } from 'node:path';
const port = Number(process.env.PORT ?? 8787);
const service = createService({ dataFile: resolve('server/data/state.json') });
service.on('error', error => { console.error('연결 서버를 시작하지 못했어요:', error.message); process.exit(1); });
service.listen(port, '0.0.0.0', () => {
  console.log('\n마음사이 · 두 휴대폰 테스트\nPC와 휴대폰을 같은 Wi-Fi에 연결하세요.');
  for (const entries of Object.values(networkInterfaces())) for (const entry of entries ?? []) if (!entry.internal && entry.family === 'IPv4') console.log(`PC 연결 주소: http://${entry.address}:${port}`);
  const expo = spawn(process.execPath, ['node_modules/expo/bin/cli', 'start', '--lan'], { stdio: 'inherit', env: { ...process.env, EXPO_NO_TELEMETRY: '1' } });
  const stop = () => { expo.kill(); service.closeAllConnections(); service.close(); };
  process.on('SIGINT', stop); process.on('SIGTERM', stop); expo.on('exit', () => { service.closeAllConnections(); service.close(); });
});
