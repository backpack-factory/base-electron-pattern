'use strict'

const path = require('path')
const chalk = require('chalk')
const { merge } = require('lodash')
const electron = require('electron')
const { spawn } = require('child_process')
const WebpackDevServer = require('webpack-dev-server')

let electronProcess = null
let manualRestart = false

function logStats (proc, data) {
  let log = ''
  log += chalk.yellow.bold(`┏ ${proc} Process ${new Array((19 - proc.length) + 1).join('-')}`) + '\n\n'
  if (typeof data === 'object') {
    data
      .toString({ colors: true, chunks: false })
      .split(/\r?\n/).forEach(line => { log += '  ' + line + '\n' })
  } else {
    log += `  ${data}\n`
  }
  log += '\n' + chalk.yellow.bold(`┗ ${new Array(28 + 1).join('-')}`) + '\n'
  console.log(log)
}

function startRenderer (config, webpack) {
  return new Promise((resolve, reject) => {
    const compiler = webpack(config)
    compiler.plugin('done', stats => logStats('Renderer', stats))

    const server = new WebpackDevServer(compiler, {
      contentBase: path.join(__dirname, '../'),
      quiet: true,
      hot: true,
      before (app, ctx) {
        ctx.middleware.waitUntilValid(() => resolve())
      }
    })
    server.listen(9080)
  })
}

function startMain (config, webpack) {
  return new Promise((resolve, reject) => {
    const compiler = webpack(config)
    compiler.plugin('watch-run', (compilation, done) => {
      logStats('Main', chalk.white.bold('compiling...'))
      done()
    })
    compiler.watch({}, (err, stats) => {
      if (err) {
        console.log(err)
        return
      }
      logStats('Main', stats)
      if (electronProcess && electronProcess.kill) {
        manualRestart = true
        process.kill(electronProcess.pid)
        electronProcess = null
        startElectron()
        setTimeout(() => { manualRestart = false }, 5000)
      }
      resolve()
    })
  })
}

function startElectron (config, webpack) {
  electronProcess = spawn(electron, ['--inspect=5858', path.resolve('dist/electron/main.js')])
  electronProcess.stdout.on('data', data => electronLog(data, 'blue'))
  electronProcess.stderr.on('data', data => electronLog(data, 'red'))
  electronProcess.on('close', () => {
    if (!manualRestart) process.exit()
  })
}

function electronLog (data, color) {
  let log = ''
  data = data.toString().split(/\r?\n/)
  data.forEach(line => { log += `  ${line}\n` })
  if (/[0-9A-z]+/.test(log)) {
    console.log(chalk[color].bold('┏ Electron -------------------') + '\n' +
                                  '\n' + log +
                chalk[color].bold('┗ ----------------------------') + '\n')
  }
}

module.exports = function (config, webpack) {
  const nodeModules = config.paths.patterns.map(p => path.join(p, 'node_modules'))
  config.webpack.resolve.modules.push(...nodeModules)
  config.webpack.resolveLoader.modules.push(...nodeModules)

  console.log(chalk.blue('  getting ready...') + '\n')
  Promise.all([
    startRenderer(merge({}, config.webpack, config.webpackRenderer), webpack),
    startMain(merge({}, config.webpack, config.webpackMain), webpack)
  ])
    .then(() => startElectron(config, webpack))
    .catch(err => console.error(err))
}
