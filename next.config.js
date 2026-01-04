/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone', // 用于 Docker 部署
  experimental: {
    serverComponentsExternalPackages: ['xlsx'],
  },
}

module.exports = nextConfig

