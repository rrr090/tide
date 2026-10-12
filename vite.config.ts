import { defineConfig } from 'vite';

export default defineConfig({
base: './',
plugins: [],
build: {
target: 'es2022',
sourcemap: false,
},
});
