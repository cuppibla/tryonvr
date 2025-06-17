import type {NextConfig} from 'next';

const nextConfig: NextConfig = {
  /* config options here */
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'placehold.co',
        port: '',
        pathname: '/**',
      },
    ],
  },
  webpack: (config, { isServer }) => {
    // For WASM support with MediaPipe, though CDN is often used.
    // This might be needed if bundling WASM files locally.
    config.resolve.extensions.push('.wasm');
    config.module.rules.forEach((rule) => {
      (rule.oneOf || []).forEach((oneOf) => {
        if (oneOf.loader && oneOf.loader.indexOf('file-loader') >= 0) {
          oneOf.exclude.push(/\.wasm$/);
        }
      });
    });

    // Add rule for .wasm files
     config.module.rules.push({
       test: /\.wasm$/,
       type: "javascript/auto",
       loader: "file-loader",
       options: {
         publicPath: "/_next/static/wasm",
         outputPath: "static/wasm",
       },
     });

    return config;
  },
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb', // Or a reasonable limit for pose data
    },
  },
};

export default nextConfig;
