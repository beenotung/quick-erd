// Snowpack Configuration File
// See all supported options: https://www.snowpack.dev/reference/configuration

/** @type {import("snowpack").SnowpackUserConfig } */
export default {
  mount: {
    /* ... */
    'src/client': '/',
    'src/core': '/core',
    'lib/ionicons': '/icons',
  },
  plugins: [
    /* ... */
    '@snowpack/plugin-sass',
  ],
  packageOptions: {
    /* ... */
  },
  devOptions: {
    /* ... */
  },
  buildOptions: {
    /* ... */
  },
  optimize: {
    bundle: true,
    minify: true,
    target: 'es2018',
  },
}
