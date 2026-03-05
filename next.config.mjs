import withPWA from '@ducanh2912/next-pwa';

const nextConfig = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development',
})({
  reactStrictMode: true,
  turbopack: {}, // silences the turbopack warning
});

export default nextConfig;