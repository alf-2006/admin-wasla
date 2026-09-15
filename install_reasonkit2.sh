
export PATH="$HOME/.cargo/bin:$PATH"
rustup default stable-x86_64-pc-windows-gnu
cargo install reasonkit-think-mcp
yes | hermes mcp add reasonkit-think --command "C:/Users/aboha/.cargo/bin/reasonkit-think-mcp.exe"
