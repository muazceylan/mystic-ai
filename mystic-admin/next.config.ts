import type { NextConfig } from "next";

const BACKEND_URL = process.env.BACKEND_URL || 'http://localhost:8088';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:8081';
const NUMEROLOGY_SERVICE_URL = process.env.NUMEROLOGY_SERVICE_URL || 'http://localhost:8085';

const nextConfig: NextConfig = {
  async rewrites() {
    return [
      // Admin API → notification-service
      {
        source: '/api/admin/:path*',
        destination: `${BACKEND_URL}/api/admin/:path*`,
      },
      // Public CMS content → notification-service
      {
        source: '/api/v1/content/:path*',
        destination: `${BACKEND_URL}/api/v1/content/:path*`,
      },
      // App config → notification-service
      {
        source: '/api/v1/app-config',
        destination: `${BACKEND_URL}/api/v1/app-config`,
      },
      // Auth service admin user search
      {
        source: '/api/auth/admin/:path*',
        destination: `${AUTH_SERVICE_URL}/api/auth/admin/:path*`,
      },
      // Numerology admin APIs
      {
        source: '/api/numerology/:path*',
        destination: `${NUMEROLOGY_SERVICE_URL}/:path*`,
      },
      // Legacy numerology admin paths (backward compatibility)
      {
        source: '/admin/name-sources/:path*',
        destination: `${NUMEROLOGY_SERVICE_URL}/admin/name-sources/:path*`,
      },
      {
        source: '/admin/names/:path*',
        destination: `${NUMEROLOGY_SERVICE_URL}/admin/names/:path*`,
      },
    ];
  },
};

export default nextConfig;
