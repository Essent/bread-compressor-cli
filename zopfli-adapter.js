const zopfliAdapter = () => {
  try {
    const zopfli = require("node-zopfli");
    return zopfli;
  } catch (err) {
    const zopfli = require("@gfx/zopfli");
    return zopfli;
  }
};

module.exports = zopfliAdapter;
