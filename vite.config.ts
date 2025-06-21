import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
    plugins: [react()],
    build: {
        lib: {
            entry: 'src/index.tsx',
            name: 'MultiTimezoneViewer',
            fileName: 'multi-timezone-viewer',
            formats: ['es', 'umd']
        },
        rollupOptions: {
            external: ['react', 'react-dom', 'luxon', '@vvo/tzdb'],
            output: {
                globals: {
                    react: 'React',
                    'react-dom': 'ReactDOM',
                }
            }
        }
    }
});
