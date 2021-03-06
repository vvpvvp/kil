#!/usr/bin/env node

require('colorful').colorful();

var program = require('commander');
var task = require('../task');
var logger = require('../logger');
var path = require('path');
var spawn = require('cross-spawn');
var exec = require('child_process').exec;

program
    .usage('[options]')
    .option('-S, --no-sourcemap', 'disable source map')
    .option('-U, --no-uglify', 'disable uglifyjs.')
    .option('-C, --no-clean', 'disable clean before a new build')
    .on('-h', printHelp)
    .on('--help', printHelp)
    .parse(process.argv);

function printHelp() {
    console.log('  Examples:'.to.bold.green.color);
    console.log();
    console.log('    kil build -S     disable source ');
    console.log();
}

var args = {
    sourcemap: program.sourcemap,
    clean: program.clean,
    uglify: program.uglify
}

logger.debug("kil build with options: ");
logger.debug(args);

var sh = "git log | head -n 1| grep 'commit' | awk '{print $2}'"
exec(sh,function(err,stdout,stderr){
    stdout = stdout||"";
    args.headVersion = stdout.replace(/\n/g,"").replace(/\r/g,"");
    if (program.clean) {
        var cleanScript = path.join(__dirname, '/kil-clean.js');
        spawn(cleanScript, {
            stdio: 'inherit'
        }).on('close', (code) => {
            task.build(args);
        });
    } else {
        task.build(args);
    }
});
