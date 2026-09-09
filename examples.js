const select = document.querySelector("#example-select");
const source = document.querySelector("#source");

const hello = `
message = "hello world"

main = print message
`.trim();

const example1 = `
y :: Int
y = 1 + True
`.trim();

const example2 = `
f b = if b then 1 else 'c'
`.trim();

const typeClass = `
class Square a where
  square :: a -> a

instance Square Int where
  square a = a * a

instance Square a => Square [a] where
  square [] = []
  square (a:as) = square a : square as

main = print (square [1..10])
`.trim();

const fib = `
fib 0 xs = xs
fib n (a:b:xs) = fib (n-1) (a+b:a:b:xs)

reverse [] = []
reverse (a:xs) = concat (reverse xs) [a]

concat [] bs = bs
concat (a:as) bs = a : (concat as bs)

main = print (reverse (fib 10 [1, 1]))
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
        case "type class":
            text = typeClass;
            break;
        case "fib":
            text = fib;
            break;
    }
    source.value = text;
}

select.addEventListener("change", setExample);
addEventListener("load", () =>
    setExample({ target: { value: "hello world" } }),
);
