
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
  experimental: {
    allowedDevOrigins: [
      // Cloud workstation URLs (HTTP and HTTPS)
      'https://3000-firebase-studio-1748924697940.cluster-zumahodzirciuujpqvsniawo3o.cloudworkstations.dev',
      'http://3000-firebase-studio-1748924697940.cluster-zumahodzirciuujpqvsniawo3o.cloudworkstations.dev',
      'https://6000-firebase-studio-1748924697940.cluster-zumahodzirciuujpqvsniawo3o.cloudworkstations.dev',
      'http://6000-firebase-studio-1748924697940.cluster-zumahodzirciuujpqvsniawo3o.cloudworkstations.dev',
      'https://9000-firebase-studio-1748924697940.cluster-zumahodzirciuujpqvsniawo3o.cloudworkstations.dev',
      'http://9000-firebase-studio-1748924697940.cluster-zumahodzirciuujpqvsniawo3o.cloudworkstations.dev',
      
      // Exact string from warning
      '3000-firebase-studio-1748924697940.cluster-zumahodzirciuujpqvsniawo3o.cloudworkstations.dev',

      // Common localhost origins
      'http://localhost:3000',
      'https://localhost:3000',

      // Local network IP (updated based on last user log)
      'http://10.88.0.4:3000',
    ],
  },
};

export default nextConfig;
