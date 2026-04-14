/** @type {import('next').NextConfig} */
const repoName = process.env.NEXT_PUBLIC_REPO_NAME || process.env.GITHUB_REPOSITORY?.split('/')[1] || 'CLI';
const normalizedBasePath = process.env.NEXT_PUBLIC_BASE_PATH || `/${repoName}`;

const nextConfig = {
  output: 'export',
  images: { unoptimized: true },
  trailingSlash: true,
  basePath: normalizedBasePath,
  assetPrefix: normalizedBasePath,
};

module.exports = nextConfig;
