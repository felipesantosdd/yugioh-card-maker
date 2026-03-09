const path = require('path')
const HtmlWebpackPlugin = require('html-webpack-plugin')
const { VueLoaderPlugin } = require('vue-loader')
const CopyWebpackPlugin = require('copy-webpack-plugin')

module.exports = (_env, argv) => {
  const isProd = argv.mode === 'production'

  return {
    mode: isProd ? 'production' : 'development',
    target: 'web',
    entry: path.resolve(__dirname, 'src/renderer/main.js'),
    output: {
      path: path.resolve(__dirname, 'dist'),
      filename: 'js/[name].[contenthash:8].js',
      publicPath: isProd ? './' : '/',
      clean: true,
    },
    resolve: {
      extensions: ['.js', '.vue', '.json'],
      alias: {
        vue$: 'vue/dist/vue.esm.js',
        '@': path.resolve(__dirname, 'src/renderer'),
      },
    },
    module: {
      rules: [
        {
          test: /\.vue$/,
          loader: 'vue-loader',
        },
        {
          test: /\.js$/,
          loader: 'babel-loader',
          exclude: /node_modules/,
          options: {
            presets: [['@babel/preset-env', { targets: { electron: '28' } }]],
          },
        },
        {
          test: /\.css$/,
          use: ['style-loader', 'css-loader'],
        },
        {
          test: /\.(png|jpe?g|gif|svg|webp|ico)$/,
          type: 'asset/resource',
          generator: {
            filename: 'img/[name].[hash:8][ext]',
          },
        },
        {
          test: /\.(woff2?|eot|ttf|otf)$/,
          type: 'asset/resource',
          generator: {
            filename: 'fonts/[name].[hash:8][ext]',
          },
        },
      ],
    },
    plugins: [
      new VueLoaderPlugin(),
      new HtmlWebpackPlugin({
        template: path.resolve(__dirname, 'src/renderer/index.html'),
        filename: 'index.html',
      }),
      new CopyWebpackPlugin({
        patterns: [
          {
            from: path.resolve(__dirname, 'static'),
            to: path.resolve(__dirname, 'dist'),
            globOptions: {
              ignore: ['**/CNAME'],
            },
          },
        ],
      }),
    ],
    devServer: {
      port: 9080,
      hot: true,
      static: {
        directory: path.resolve(__dirname, 'static'),
      },
    },
    devtool: isProd ? false : 'eval-source-map',
  }
}
