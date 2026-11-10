import type { NextConfig } from "next";

// 이 앱은 로그인 정보를 브라우저에 두고 백엔드(API)에서 자료를 받아 오는 화면이라,
// 서버에서 미리 만드는 캐시 기능(cacheComponents)은 쓰지 않아요.
const nextConfig: NextConfig = {};

export default nextConfig;
