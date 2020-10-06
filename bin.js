#!/usr/bin/env node

const compressor = require("./index");
const program = require("commander");

program
  .version("1.0.6")
  .usage("[options] <globs ...>")
  .option("-s, --stats", "Show statistics")
  .option(
    "-a, --algorithm <items>",
    'Comma separated list of compression algorithms. Supported values are "brotli" and "gzip". Default "brotli,gzip"',
    (items) => items.split(",")
  )
  .option("-n, --no-default-ignores", "Do not add default glob ignores")
  .option(
    "-l, --limit <value>",
    "Number of tasks running concurrently. Default is your total number of cores",
    parseInt
  )
  .option(
    "--zopfli-numiterations <value>",
    "Maximum amount of times to rerun forward and backward pass to optimize LZ77 compression cost. Good values: 10, 15 for small files, 5 for files over several MB in size or it will be too slow. Default 15",
    parseInt
  )
  .option(
    "--zopfli-blocksplittinglast <value>",
    'If "true", chooses the optimal block split points only after doing the iterative LZ77 compression. If "false", chooses the block split points first, then does iterative LZ77 on each individual block. If "both", first runs with false, then with true and keeps the smaller file. Default "false"'
  )
  .option(
    "--brotli-mode <value>",
    "0 = generic, 1 = text (default), 2 = font (WOFF2)",
    parseInt
  )
  .option("--brotli-quality <value>", "0 - 11. Default 11", parseInt)
  .option("--brotli-lgwin <value>", "Window size. Default 22", parseInt)
  .parse(process.argv);

compressor
  .compress(program, "gzip")
  .then(() => compressor.compress(program, "brotli"))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
