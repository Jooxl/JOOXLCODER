const fetch = require('node-fetch');
// If node-fetch isn't available, we can just use native fetch if node >= 18
async function test() {
    const res = await fetch("https://emkc.org/api/v2/piston/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            language: "c++",
            version: "10.2.0",
            files: [{ content: "#include <iostream>\nint main() { std::cout << \"hello\"; return 0; }" }]
        })
    });
    const data = await res.json();
    console.log(JSON.stringify(data, null, 2));
}
test();
