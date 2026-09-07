const source = document.querySelector("#source");
const status = document.querySelector("#status");
const diagnostics = document.querySelector("#diagnostics");
const output = document.querySelector("#output");
const buttons = [...document.querySelectorAll("button[data-action]")];

let worker;
let ready = false;
let sequence = 0;
let pending;

function startWorker() {
    if (worker) worker.terminate();
    ready = false;
    setButtonsDisabled(true);
    status.textContent = "Loading compiler…";
    status.className = "status";

    worker = new Worker("./worker.js");
    worker.addEventListener("message", handleWorkerMessage);
    worker.addEventListener("error", (event) => {
        showWorkerFailure(
            event.message || "The compiler worker failed to start.",
        );
    });
}

function handleWorkerMessage(event) {
    const message = event.data;
    if (message.type === "ready") {
        ready = true;
        setButtonsDisabled(false);
        status.textContent = "Compiler ready";
        status.className = "status ready";
        return;
    }
    if (message.type === "fatal") {
        showWorkerFailure(message.message);
        return;
    }
    if (
        message.type !== "response" ||
        !pending ||
        message.response.id !== pending.id
    ) {
        return;
    }

    clearTimeout(pending.timeout);
    pending = undefined;
    setButtonsDisabled(false);
    presentResponse(message.response);
}

function send(action) {
    if (!ready || pending) return;

    const id = `request-${++sequence}`;
    const request = {
        id,
        action,
        entryFile: "Main.ga",
        files: { "Main.ga": source.value },
        includePrelude: true,
    };

    setButtonsDisabled(true);
    status.textContent = `${{ check: "Checking", run: "Running", format: "Formatting" }[action]}…`;
    status.className = "status working";
    pending = {
        id,
        timeout: setTimeout(() => {
            pending = undefined;
            showWorkerFailure(
                "Compilation exceeded 15 seconds; the compiler was restarted.",
            );
            startWorker();
        }, 15_000),
    };
    worker.postMessage({ type: "request", request });
}

function presentResponse(response) {
    renderDoc(response.diagnostics);

    if (response.formatted?.["Main.ga"] !== undefined) {
        source.value = response.formatted["Main.ga"];
    }

    if (response.output || response.value) {
        const parts = [];
        if (response.output) parts.push(response.output.trimEnd());
        if (response.value) parts.push(`Result: ${response.value}`);
        output.textContent = parts.join("\n");
    } else if (response.status === "ok") {
        output.textContent = "Operation completed successfully.";
    }

    if (response.status === "ok") {
        status.textContent = "Success";
        status.className = "status ready";
    } else if (response.status === "diagnostics") {
        status.textContent = "Needs attention";
        status.className = "status warning";
    } else {
        status.textContent = "Compiler error";
        status.className = "status error";
    }
}

function renderDoc(doc) {
    diagnostics.replaceChildren();
    const blocks = doc?.blocks ?? [];
    if (blocks.length === 0) {
        diagnostics.className = "diagnostics empty";
        diagnostics.textContent = "No diagnostics.";
        return;
    }

    diagnostics.className = "diagnostics";
    for (const block of blocks) {
        if (block.type === "heading") {
            let heading = undefined
            if (block.level === 1) {
                heading = document.createElement("h3")
                heading.className = "text-lg font-bold"
            } else {
                heading = document.createElement("h4")
                heading.className = "font-bold mt-4"
            }

            heading.textContent = block.content;
            diagnostics.append(heading);
        } else if (block.type === "line") {
            const line = document.createElement("div");
            line.className = "diagnostic-line";
            for (const span of block.spans ?? [])
                line.append(renderInline(span));
            diagnostics.append(line);
        } else if (block.type === "snippet") {
            diagnostics.append(renderSnippet(block));
        }
    }
}

function renderInline(span) {
    const element = document.createElement(
        span.type === "code" ? "code" : "span",
    );
    if (span.type === "location") {
        element.className = "location text-gray-400 mr-1";
        element.textContent = `${span.filename}:${span.line}:${span.col}`;
    } else {
        element.textContent = span.content ?? "";
        if (span.decoration)
            element.classList.add(`decoration-${span.decoration}`);
        if (span.role == "error")  {
            element.classList.add("text-red-500")
        } else if (span.role == "highlight") {
            element.classList.add("text-blue-500")
        }
    }
    return element;
}

function renderSnippet(block) {
    const figure = document.createElement("figure");
    figure.className = "snippet m-2";
    if (block.file) {
        const caption = document.createElement("span");
        caption.className = "inline-block bg-gray-300 text-gray-800 px-1 py-0.5";
        caption.textContent = block.file;
        figure.append(caption);
    }
    for (const sourceLine of block.lines ?? []) {
        const row = document.createElement("div");
        row.className = "snippet-line grid bg-gray-300 px-1";
        row.style.gridTemplateColumns = "20px 1fr";

        const gutter = document.createElement("span");
        gutter.className = "text-gray-400";
        gutter.textContent = String(sourceLine.lineNumber);
        const code = document.createElement("code");
        code.className = "font-mono"
        for (const span of sourceLine.spans ?? [])
            code.append(renderInline({ type: "code", ...span }));
        row.append(gutter, code);
        figure.append(row);
    }
    return figure;
}

function showWorkerFailure(message) {
    ready = false;
    if (pending) clearTimeout(pending.timeout);
    pending = undefined;
    setButtonsDisabled(true);
    status.textContent = "Worker unavailable";
    status.className = "status error";
    diagnostics.className = "diagnostics";
    diagnostics.textContent = message;
}

function setButtonsDisabled(disabled) {
    for (const button of buttons) button.disabled = disabled;
}

for (const button of buttons) {
    button.addEventListener("click", () => send(button.dataset.action));
}

startWorker();
