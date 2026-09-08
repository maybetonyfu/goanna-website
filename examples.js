const select = document.querySelector("#example-select");
const source = document.querySelector("#source");

const hello = `
message = "hello world"

main = print message
`.trim()

const example1 = `
y :: Int
y = 1 + True
`.trim();

const example2 = `
f b = if b then 1 else 'c'
`.trim();

function setExample(event) {
    let text = "";
    switch (event.target.value) {
        case "hello world":
            text = hello;
            break;

        case "simple type error":
            text = example1;
            break;
        case "conditional expression":
            text = example2;
            break;
    }
    source.value = text;
}

select.addEventListener("change", setExample);
addEventListener("load", () => setExample({target: {value: "hello world"}}));
