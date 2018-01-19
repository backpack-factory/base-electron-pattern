const fs = require('fs')
const path = require('path')
const webpack = require('webpack')

const HtmlWebpackPlugin = require('html-webpack-plugin')
const CopyWebpackPlugin = require('copy-webpack-plugin')
const BabiliWebpackPlugin = require('babili-webpack-plugin')
const ExtractTextPlugin = require('extract-text-webpack-plugin')

const dependencies = require(resolveInput('package.json')).dependencies || []

function resolveInput (basePath) {
  const userPath = path.resolve(basePath)
  return !fs.existsSync(userPath)
    ? path.join(__dirname, basePath)
    : userPath
}

function resolveOutput (basePath) {
  return path.resolve(basePath)
}

module.exports = {
  webpackRenderer: {
    devtool: '#cheap-module-eval-source-map',
    entry: {
      renderer: resolveInput('src/renderer/main.js')
    },
    module: {
      rules: [{
        test: /\.css$/,
        use: ExtractTextPlugin.extract({
          fallback: 'style-loader',
          use: 'css-loader'
        })
      }, {
        test: /\.html$/,
        use: 'html-loader'
      }, {
        test: /\.(png|jpe?g|gif|svg)(\?.*)?$/,
        use: {
          loader: 'url-loader',
          query: { limit: 10000, name: 'imgs/[name]--[folder].[ext]' }
        }
      }, {
        test: /\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/,
        loader: 'url-loader',
        options: { limit: 10000, name: 'media/[name]--[folder].[ext]' }
      }, {
        test: /\.(woff2?|eot|ttf|otf)(\?.*)?$/,
        use: {
          loader: 'url-loader',
          query: { limit: 10000, name: 'fonts/[name]--[folder].[ext]' }
        }
      }]
    },
    plugins: [
      new ExtractTextPlugin('styles.css'),
      new HtmlWebpackPlugin({
        filename: 'index.html',
        template: resolveInput('src/index.ejs'),
        minify: {
          collapseWhitespace: true,
          removeAttributeQuotes: true,
          removeComments: true
        },
        nodeModules: process.env.NODE_ENV !== 'production'
          ? resolveInput('node_modules')
          : false
      }),
      new webpack.HotModuleReplacementPlugin()
    ],
    resolve: {
      extensions: ['.css', '.js', '.json'],
      alias: { '@': path.resolve('src/renderer') }
    },
    target: 'electron-renderer'
  },
  webpackMain: {
    entry: {
      main: resolveInput('src/main/index.js')
    },
    target: 'electron-main'
  },
  webpack: {
    externals: [
      ...Object.keys(dependencies || {})
    ],
    module: {
      rules: [{
        test: /\.js$/,
        use: 'babel-loader',
        exclude: /node_modules/
      }, {
        test: /\.node$/,
        use: 'node-loader'
      }]
    },
    node: {
      __dirname: process.env.NODE_ENV !== 'production',
      __filename: process.env.NODE_ENV !== 'production'
    },
    output: {
      filename: '[name].js',
      libraryTarget: 'commonjs2',
      path: resolveOutput('dist/electron')
    },
    plugins: [
      new webpack.NoEmitOnErrorsPlugin()
    ],
    resolve: {
      extensions: ['.js', '.json', '.node'],
      modules: []
    },
    resolveLoader: {
      extensions: ['.js', '.json', '.node'],
      modules: []
    }
  },
  updateConfig (config) {
    // Renderer & Main
    config.webpack.plugins.unshift(
      new webpack.DefinePlugin({
        'process.env.NODE_ENV': JSON.stringify(config.env),
        '__DEV__': config.env === 'development'
      })
    )
    if (config.env !== 'production') {
      config.webpack.plugins.push(
        new webpack.DefinePlugin({ '__static': `"${resolveOutput('static').replace(/\\/g, '\\\\')}"` })
      )
    }

    // Renderer
    if (config.env === 'production') {
      config.webpackRenderer.devtool = ''
      config.webpackRenderer.plugins.push(
        new BabiliWebpackPlugin(),
        new CopyWebpackPlugin([{
          from: resolveInput('static'),
          to: resolveOutput('dist/electron/static'),
          ignore: ['.*']
        }]),
        new webpack.LoaderOptionsPlugin({ minimize: true })
      )
    }

    // Main
    if (config.env === 'production') {
      config.webpackMain.plugins.push(
        new BabiliWebpackPlugin(),
      )
    }

    return config
  },
  scripts: {
    clean: require('./scripts/clean'),
    build: require('./scripts/build'),
    dev: require('./scripts/dev')
  }
}
