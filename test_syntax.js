
try {
    new (require('vm').Script)(require('fs').readFileSync('C:/Users/aboha/Desktop/adminstrationsystem/test_script.js', 'utf8'));
    console.log("Syntax OK");
} catch (e) {
    console.error("Syntax Error:", e);
}
