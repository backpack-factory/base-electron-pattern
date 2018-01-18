'use strict'

process.env.NODE_ENV = 'production'

const chalk = require('chalk')
const del = require('del')

const doneLog = chalk.bgGreen.white(' DONE ') + ' '

module.exports = function (config, webpack) {
  del.sync(['build/*', '!build/icons', '!build/icons/icon.*'])
  console.log(`\n${doneLog}\n`)
  process.exit()
}
