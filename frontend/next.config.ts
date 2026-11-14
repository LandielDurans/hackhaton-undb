import type { NextConfig } from "next";

// O front-end chama /api/* no mesmo domínio; o Next encaminha para a API Spring Boot.
// Assim o cookie de sessão (HttpOnly, SameSite=Lax) funciona sem CORS.
const API_URL = process.env.API_URL ?? "http://localhost:8088";

const nextConfig: NextConfig = {
  output: "standalone",
  poweredByHeader: false,
  async rewrites() {
    return [{ source: "/api/:path*", destination: `${API_URL}/api/:path*` }];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
        ],
      },
    ];
  },
};

export default nextConfig;
