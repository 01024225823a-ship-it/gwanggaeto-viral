import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async redirects() {
    // 서비스몰이 /customer/* 에서 루트로 옮겨졌다. 이전 주소로 들어와도 동작하도록 연결한다.
    return [
      { source: "/customer", destination: "/", permanent: false },
      { source: "/customer/dashboard", destination: "/", permanent: false },
      { source: "/customer/order", destination: "/services", permanent: false },
      { source: "/customer/:path*", destination: "/:path*", permanent: false },
    ];
  },
};

export default nextConfig;
