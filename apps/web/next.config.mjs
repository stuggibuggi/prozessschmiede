/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@prozessschmiede/ui",
    "@prozessschmiede/types",
    "@prozessschmiede/config",
    "@prozessschmiede/bpmn"
  ]
};

export default nextConfig;

