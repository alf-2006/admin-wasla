
export PATH="$HOME/.cargo/bin:$PATH"
rustup toolchain uninstall stable
rustup update stable
rustup default stable
cargo install reasonkit-think-mcp
hermes mcp add reasonkit-think --command reasonkit-think-mcp
