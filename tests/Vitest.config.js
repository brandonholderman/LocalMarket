import { defineConfig } from 'vitest/config'
// import dotenv from 'dotenv';
// dotenv.config({ path: resolve(process.cwd(), '.env.test') });

export default defineConfig ({
    test: {
        // envFile: '.env.test',
        pool: 'forks',
        poolOptions: {
            forks: { singleFork: true },
        },
        // env: {
        //     NODE_ENV: '.env.test',
        // },
        reporter: 'verbose',
    },
})