#!/usr/bin/env node

require('colorful').colorful();

var program = require('commander');
var task = require('../task');
var logger = require('../logger');
var path = require('path');
var spawn = require('child_process').spawn;

program
    .usage('[options]')
    .option('-s, --source', 'generate source map')
    .on('-h', printHelp)
    .on('--help', printHelp)
    .parse(process.argv);

function printHelp() {
    console.log('  Examples:'.to.bold.blue.color);
    console.log();
    console.log('    kil build -s    ');
    console.log();
}

var args = {
    source: program.source
}

logger.debug("kil build with options: ");
logger.debug(args);

var cleanScript = path.join(__dirname, '/kil-clean.js');
spawn(cleanScript, {
    stdio: 'inherit'
}).on('close', (code) => {
    task.build(args);
});
