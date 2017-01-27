// import es5 modules
import * as minimist from 'minimist'
import * as RED from 'node-red'
import * as Express from 'yang-express'
import * as path from 'path'
import co from 'co'

var argv = minimist(process.argv.slice(2), {
  alias: {
    help: 'h',
    config: 'c',
    port: 'p',
    feature: 'f',
	settings: 's',
	verbose: 'v'
  },
  boolean: [ 'help' ],
  string: [ 'config', 'feature', 'settings' ]
});

if (argv['help'] === true) {
  var help;
  help  = `
    Usage: kos [options] modules...

    Options:
      -c, --config <filename>  Use <filename> to retrieve configuration data (default: uses 'config' directory)
      -f, --feature <name>     Enable one or more features: (restjson, openapi, etc.)
      -p, --port <number>      Run kos listening on <port>
  `
  console.info(help);
  process.exit();
}

// load configuration
let config = require('config')
if (argv['config']) {
  let configFile = path.resolve(argv['config']);
  config = config.util.parseFile(configFile);
}

RED.init(config);

// co(function* () {
//   yield RED.start()
  

// })
