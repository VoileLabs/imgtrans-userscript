# Manga Translator Userscript

Userscript for <https://touhou.ai/imgtrans/>. (WIP)

More details about the service at original repository: <https://github.com/zyddnys/manga-image-translator>

## Usage

```bash
# build the wasm module, requires `wasm-pack` and `binaryen` to be installed
# building the script requires the wasm module, even if you're not building wasm_bg.js
# if the wasm module is changed, you need to update the wasm url in banner.js / rollup.config.js
$ cd wasm
$ wasm-pack build -t web
$ wasm2js pkg/wasm_bg.wasm -o pkg/wasm_bg.js
$ cd ..

# install dependencies
$ pnpm i

# build wasm_bg.js
$ pnpm build-wasm
# wasm_bg.js is now in dist

# build userscript
$ pnpm build
# imgtrans-userscript.user.js is now in dist
```
