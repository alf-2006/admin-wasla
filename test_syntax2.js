
try {
    new (require('vm').Script)(require('fs').readFileSync('C:/Users/aboha/Desktop/adminstrationsystem/test_syntax_html.js', 'utf8'));
    console.log("Embedded Syntax OK");
} catch (e) {
    console.error("Embedded Syntax Error:", e);
}
