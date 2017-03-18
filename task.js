'use strict';

var spawn = require('cross-spawn'),
    fs = require('fs-extra'),
    path = require('path'),
    glob = require('glob'),
    config = require('./config'),
    utils = require('./utils'),
    logger = require('./logger');

var webpack = require('webpack');
// 加载编码转换模块  
// var iconv = require('iconv-lite'); 

module.exports = {

    /**
     * init a new project with mock and test module (default is not initilized)
     * @param  {[Object]} args {test: false, mock: false}
     */
    init: function(args) {
        var mock = !!args.mock;
        var test = !!args.test;

        var initMods = () => {
            var folders = ['js'];
            var cpfiles = ['pack.default.js', 'index.html', 'index.js', 'js/main.js'];
            if (mock) {
                folders.push('mock');
                cpfiles.push('mock/mock.js');

                logger.info(' Add mock module. ');
            }
            if (test) {
                Array.prototype.push.apply(folders, ['test', 'test/mocha', 'test/phantom']);
                Array.prototype.push.apply(cpfiles, ['test/karma.conf.js', 'test/mocha/index.test.js', 'test/phantom/index.test.js']);

                logger.info(' Add test module. ');
            }

            folders.forEach((folder) => {
                try {
                    fs.statSync(folder);
                } catch ( err ) {
                    if (err) {
                        fs.mkdirSync(folder);
                    }
                }
            })

            cpfiles.forEach((file) => {
                fs.stat(file, (err, stats) => {
                    if (err) {
                        var origin = path.join(__dirname, 'default', file);
                        var dest = path.join(process.cwd(), file);
                        fs.createReadStream(origin).pipe(fs.createWriteStream(dest));
                    }
                })
            })

            logger.info(' init successfully. ');
        }

        var packageJson = path.join(process.cwd(), 'package.json');
        fs.stat(packageJson, (err) => {
            if (err) {
                spawn('npm', ['init'], {
                    stdio: 'inherit'
                }).on('close', (code) => {
                    logger.info('Add key kil in package.json for system configuration. ');

                    var pack = require(packageJson);
                    pack.kil = require('./default/package.default.js');
                    fs.writeFile('package.json', JSON.stringify(pack), function(err) {
                        if (err) {
                            logger.error(err);
                            process.exit(1);
                        }
                    });

                    initMods();
                });
            } else {
                initMods();
            }
        })
    },

    /**
     * load webpack config and start webpack dev server
     * @return {[type]} [description]
     */
    dev: function(args) {
        var pack_config = utils.loadWebpackCfg('dev', args);
        var compiler = webpack(pack_config);
        var WebpackDevServer = require('webpack-dev-server');
        var serverCfg = {
            hot: true,
            watchOptions: {
                poll: 1000
            },
            stats: {
                colors: true
            }
        }

        if (pack_config.devServer && pack_config.devServer.proxy) {
            var _proxy = pack_config.devServer.proxy;
            serverCfg.proxy = {};
            for(var key of Object.keys(_proxy)){
                var proxyConfig = _proxy[key];
                // if(proxyConfig.rewrite){
                //     proxyConfig.rewriteString = proxyConfig.rewrite;
                //     // proxyConfig.rewrite = function(req){
                //     //     req.url = req.url.replace(proxyConfig.rewriteString, '');
                //     // }

                //     proxyConfig.onProxyReq = function (proxyReq, req, res) {
                //         if(req.path.indexOf(proxyConfig.rewriteString) === 0) {
                //             proxyReq
                //         }
                //     }
                // }
                if(typeof(proxyConfig)=="object"){
                    proxyConfig.toProxy = true;
                    proxyConfig.changeOrigin = true;
                }
                serverCfg.proxy[key] = proxyConfig;
            }
        }

        if (config.getHtml5Mode()) {
            serverCfg.historyApiFallback = true;
        }

        logger.debug('webpack dev server start with config: ');
        logger.debug(serverCfg);

        new WebpackDevServer(compiler, serverCfg).listen(config.getPort(), '0.0.0.0', (err) => {
            if (err) {
                logger.error(err);
                process.exit(1);
            }

            logger.info('----------------------------------');
            logger.info(`Server listening at localhost:${config.getPort()}`);
            logger.info('----------------------------------');
        });
    },

    /**
     * do unit tests with mocha and endless tests with phantom
     * @param  {[Object]} args: {phantom: false, mocha: false}
     * @return {[type]}
     */
    test: function(args) {
        var mocha = !!args.mocha;
        var phantom = !!args.phantom;
        var server = !!args.server;

        var testPath = path.join(process.cwd(), 'test');
        fs.stat(testPath, (err) => {
            if (err) {
                logger.error(`can't find ${testPath}, have you ever ` + 'init test module'.to.bold.red.color + ' ? ');
                logger.error('try to use ' + 'kil init -t'.to.bold.red.color + ' to fix this issue. ');

                process.exit(1);
            }

            if (mocha) {
                var karmaBin = path.join(__dirname, 'node_modules/karma/bin/karma');
                var karmaConfPath = path.join(process.cwd(), 'test/karma.conf.js');

                var bins;
                if (server) {
                    bins = ['start', karmaConfPath, '--detached'];
                } else {
                    bins = ['start', karmaConfPath, '--detached', '--single-run'];
                }

                spawn(karmaBin, bins, {
                    stdio: 'inherit'
                }).on('close', (code) => {
                    logger.info(`mocha test finished with code : ${code}`);
                });
            }

            if (phantom) {
                var phantomBin = path.join(__dirname, 'node_modules/phantomjs/bin/phantomjs');
                var phantomEntry = path.join(process.cwd(), 'test/phantom/index.test.js');
                spawn(phantomBin, [phantomEntry], {
                    stdio: 'inherit',
                    cwd: __dirname
                }).on('close', (code) => {
                    logger.info(`phontom test finished with code : ${code}`);
                });
            }
        })
    },

    /**
     * use webpack and build bundle
     * @return {[type]} [description]
     */
    build: function(args, after) {
        var pack_config = utils.loadWebpackCfg('release', args);

        logger.info('start build project... ');
        // console.log(pack_config);
        var compiler = webpack(pack_config);
        if(!args.root)args.root="dist";
        compiler.run((err, stats) => {
            if (err) {
                logger.error(err);
            }
            var jsonStats = stats.toJson();
            if (jsonStats.errors.length > 0) {
                logger.error(jsonStats.errors);
            }
            if (jsonStats.warnings.length > 0) {
                logger.warn(jsonStats.warnings);
            }

            var conf = config.getConfig();
            if (conf.copy && conf.copy.length > 0) {
                conf.copy.forEach((key) => {
                    let files = glob.sync(key);
                    files.forEach((file) => {
                        fs.copySync(file, `${args.root}/${file}`);
                    })
                })
            }

            logger.info('build successfully. ');


            // var writeFile = function(file){
            //     var str = "<script>console.log('"+args.headVersion+"')</script>";  
            //     var arr = iconv.encode(str, 'utf8'); 
            //     fs.appendFile(file, arr, function(err){  
            //         if(err)  
            //             console.log("fail " + err);
            //     });  
            // }
            // let files = glob.sync(`${args.root}/index.html`);
            // files.forEach((file) => {
            //     writeFile(file);
            // })

            if (after && typeof after === "function") {
                after();
            }
        });
    },

    /**
     * use webpack and build bundle
     * @return {[type]} [description]
     */
    release: function(args) {
        var after = () => {
            logger.info('TODO package files.');
        // spawn('rm', ['dist/*.map'], {
        //     stdio: 'inherit'
        // }).on('close', (code) => {
        //     logger.info('finish package files');
        // });
        };
        this.build(args, after);
    }
}