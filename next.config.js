/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    experimental: {
        turbo: {
            rules: {
                // Configurations spécifiques pour Turbopack
            },
        },
    },
    webpack: (config) => {
        config.resolve.alias = {
            ...config.resolve.alias,
            '@': require('path').resolve(__dirname, 'src'),
        };
        return config;
    },
    // Désactiver complètement les indicateurs de développement
    devIndicators: false
}

module.exports = nextConfig; 