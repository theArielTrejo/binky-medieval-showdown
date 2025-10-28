import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
    base: './',
    resolve: {
        alias: {
            'phaser-animated-tiles': path.resolve(
                __dirname,
                '../node_modules/phaser-animated-tiles/dist/AnimatedTiles.js'
            )
        }
    },
    build: {
        rollupOptions: {
            output: {
                manualChunks: {
                    phaser: ['phaser']
                }
            }
        },
    },
    server: {
        port: 8080
    }
});
