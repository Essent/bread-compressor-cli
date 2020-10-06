const fs = require("fs");
const path = require("path");
const globby = require("globby");
const promiseLimit = require("promise-limit");
const fork = require("child_process").fork;
const os = require("os");
const chalk = require("chalk");

module.exports = {
  compress,
};

/**
 *
 * @param {import('commander')} program
 */
function addDefaultIgnores(program) {
  if (program.defaultIgnores) {
    const globs = program.args.slice();
    for (const ignore of [
      "gz",
      "br",
      "zip",
      "png",
      "jpeg",
      "jpg",
      "woff",
      "woff2",
    ]) {
      globs.push("!*." + ignore);
      globs.push("!**/*." + ignore);
    }
    return globs;
  }
  return program.args;
}

/**
 *
 * @param {import('commander')} program
 * @param {'brotli'|'gzip'} algorithm
 */
async function compress(program, algorithm) {
  if (!program.args || program.args.length === 0) {
    program.help();
  }

  if (
    program.algorithm != null &&
    program.algorithm.indexOf(algorithm) === -1
  ) {
    return;
  }

  const globs = addDefaultIgnores(program);

  const paths = globby.sync([...globs], { onlyFiles: true });
  const start = Date.now();

  const limit = promiseLimit(program.limit ? program.limit : os.cpus().length);

  let results;
  if (algorithm === "brotli") {
    const options = {
      mode: program.brotliMode != null ? program.brotliMode : 1,
      quality: program.brotliQuality != null ? program.brotliQuality : 11,
      lgwin: program.brotliLgwin != null ? program.brotliLgwin : 22,
    };
    results = await Promise.all(
      paths.map((name) =>
        limit(() => {
          return new Promise(function (resolve) {
            const child = fork(path.resolve(__dirname, "brotli-compress.js"));

            child.send({ name: name, options: options });

            child.on("message", (message) => {
              child.kill();
              resolve(message);
            });
          });
        })
      )
    );
  } else {
    const options = {
      numiterations:
        program.zopfliNumiterations != null ? program.zopfliNumiterations : 15,
      zopfliBlocksplittinglast: program.zopfliBlocksplittinglast,
    };
    results = await Promise.all(
      paths.map((name) =>
        limit(() => {
          return new Promise(function (resolve) {
            const child = fork(path.resolve(__dirname, "gzip-compress.js"));

            child.send({ name: name, options: options });

            child.on("message", (message) => {
              child.kill();
              resolve(message);
            });
          });
        })
      )
    );
  }

  if (program.stats && results && results.length > 0) {
    const elapsedTime = (Date.now() - start) / 1000;
    const uncompressedSize = paths
      .map(fs.statSync)
      .map((stat) => stat.size)
      .reduce((prev, current) => prev + current);
    const compressedSize = results.reduce((prev, current) => prev + current);
    const ratio = ((compressedSize * 100) / uncompressedSize).toFixed(2);

    console.log(chalk.bold.blue(algorithm));
    console.log(chalk`Number of Files  : {bold ${paths.length}}`);
    console.log(
      chalk`Uncompressed     : {red.bold ${uncompressedSize.toLocaleString()}} Bytes`
    );
    console.log(
      chalk`Compressed       : {green.bold ${compressedSize.toLocaleString()}} Bytes`
    );
    console.log(chalk`Compression Ratio: {green.bold ${ratio}%}`);
    console.log(chalk`Compression Time : {bold ${elapsedTime}} s`);
    console.log();
  }

  return results;
}
