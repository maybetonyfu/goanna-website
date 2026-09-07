let bootError;

try {
  importScripts("./dist/wasm_exec.js");
} catch (error) {
  bootError = `Load wasm_exec.js: ${error.message}`;
}

let ready;

if (!bootError) {
  ready = boot();
  ready.catch((error) => {
    self.postMessage({ type: "fatal", message: error.message });
  });
} else {
  self.postMessage({ type: "fatal", message: bootError });
}

self.onmessage = async (event) => {
  if (event.data?.type !== "request" || !ready) return;
  try {
    await ready;
    const encoded = globalThis.goannaCompile(JSON.stringify(event.data.request));
    self.postMessage({ type: "response", response: JSON.parse(encoded) });
  } catch (error) {
    self.postMessage({ type: "fatal", message: error.message });
  }
};

async function boot() {
  const go = new Go();
  const response = await fetch("./dist/goanna.wasm");
  let instance;
  try {
    ({ instance } = await WebAssembly.instantiateStreaming(response.clone(), go.importObject));
  } catch (_) {
    ({ instance } = await WebAssembly.instantiate(await response.arrayBuffer(), go.importObject));
  }

  const exited = go.run(instance);
  exited.then(() => {
    self.postMessage({ type: "fatal", message: "The Go compiler runtime exited unexpectedly." });
  });

  for (let attempt = 0; attempt < 100 && typeof globalThis.goannaCompile !== "function"; attempt++) {
    await new Promise((resolve) => setTimeout(resolve, 10));
  }
  if (typeof globalThis.goannaCompile !== "function") {
    throw new Error("The Go compiler did not register goannaCompile.");
  }
  self.postMessage({ type: "ready" });
}
