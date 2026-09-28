import { defineConfig } from 'vite';
import { fileURLToPath } from 'node:url';
const wallet = fileURLToPath(new URL('./wallet.tsx', import.meta.url));
export default defineConfig({
    resolve: { alias: [{ find: '@vechain/dapp-kit-react', replacement: wallet }, { find: './useBeats', replacement: wallet }] },
    server: { host: '127.0.0.1', port: 4173, strictPort: true },
});
