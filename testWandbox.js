const fetch = require('node-fetch');
async function test() {
    try {
        const res = await fetch("https://wandbox.org/api/compile.json", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                code: "#include <iostream>\nint main() { std::cout << \"hello\"; return 0; }",
                compiler: "gcc-head"
            })
        });
        const data = await res.json();
        console.log(JSON.stringify(data, null, 2));
    } catch(e) {
        console.error(e);
    }
}
test();
