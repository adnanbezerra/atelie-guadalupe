import type { NextConfig } from "next";

const apiUrl = process.env.API_BASE_URL
    ? new URL(process.env.API_BASE_URL)
    : null;

const nextConfig: NextConfig = {
    output: "standalone",
    images: {
        remotePatterns: apiUrl
            ? [
                  {
                      protocol: apiUrl.protocol.replace(":", "") as
                          | "http"
                          | "https",
                      hostname: apiUrl.hostname,
                      port: apiUrl.port,
                      pathname: "/media/images/**",
                  },
              ]
            : [],
    },
};

export default nextConfig;
