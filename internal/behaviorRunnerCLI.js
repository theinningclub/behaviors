const { Worker, MessageChannel } = require('worker_threads');
const cp = require('child_process');
const path = require('path');
const fs = require('fs-extra');
const EventEmitter = require('eventemitter3');
const { CRIExtra, Browser, Events } = require('chrome-remote-interface-extra');
const Collector = require('./collect');
const ColorPrinter = require('./colorPrinter');
const { makeInputOutputConfig } = require('./buildInfo');
const getConfigIfExistsOrDefault = require('./behaviorConfig');
const Build = require('./build');
const { Project } = require('ts-morph');
const { launch } = require('launch-chrome');
const rollup = require('rollup');
const nodeResolve = require('rollup-plugin-node-resolve');
const cleanup = require('rollup-plugin-cleanup');


function createRollupConfig(opts) {
  return `import resolve from '${opts.rollupResolve}';
import cleanup from '${opts.rollupCleanup}';

const { wrappers } = require('${opts.buildInfo}');

export default {
  input: '${opts.input}',
  output: {
    file: '${opts.output}',
    sourcemap: false,
    format: 'es',
    exports: 'none'
  },
  watch: { chokidar: {usePolling: true, }, clearScreen:  true },
  plugins: [
    resolve(),
    cleanup(),
    wrappers.setup
  ]
};

`;
}

class BehaviorRunner {

}

async function* autorun({ browser, behaviorP, pageURL }) {
  const page = await browser.newPage();
  const behavior = await fs.readFile(behaviorP, 'utf8');
  await page.goto(pageURL);

  await page.evaluateWithCliAPI(behavior);

  page.on(Events.Page.Error, error => {
    console.error('Page error', error);
  });

  page.on(Events.Page.Console, msg => {
    console.log('Console msg: ', msg.text());
  });

  const runnerHandle = await page.evaluateHandle(() => $WBBehaviorRunner$);
  let result;
  while (1) {
    result = await runnerHandle.callFnEval('step');
    if (result.done) break;
  }
  await runnerHandle.dispose();
  await page.close({ runBeforeUnload: true });
}


module.exports = async function runnerCLI(program) {
  if (program.args.length === 0) {
    program.outputHelp();
    return;
  }
  program.build = program.args[0];
  const config = await getConfigIfExistsOrDefault({
    config: program.config,
    build: program.args[0]
  });
  const { runnablePath, runnableDistPath } = await Build.createRunnerConfig(
    config
  );
  ColorPrinter.info('Generating build config');

  const inoutConf = makeInputOutputConfig(runnablePath, runnableDistPath);

  const watcher = rollup.watch({
    ...inoutConf.inConf,
    output: inoutConf.outConf,
    watch: {
      chokidar: {
        usePolling: process.platform !== 'darwin',
        alwaysStat: true
      }
    }
  });

  watcher.on('event', event => {
    switch (event.code) {
      case 'BUNDLE_START':
        ColorPrinter.info('Building behavior');
        break;
      case 'BUNDLE_END':
        ColorPrinter.info('Behavior built');
        break;
      case 'ERROR':
        ColorPrinter.error(event.error.toString(), '\n', event.error.frame);
        break;
      default:
        console.log(event);
        break;
    }
  });

  // const { webSocketDebuggerUrl } = await CRIExtra.Version();
  // const browser = await Browser.connect(webSocketDebuggerUrl);
  //
  // for await (const msg of autorun({
  //   browser,
  //   behaviorP: runnableDistPath,
  //   pageURL: program.page
  // })) {
  //   console.log(`done = ${result.done}, wait = ${result.wait}`);
  //   console.log(`message = ${result.msg}`);
  //   console.log();
  // }
  // await browser.close();
};
