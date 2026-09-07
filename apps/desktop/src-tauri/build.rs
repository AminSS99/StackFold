fn main() {
    println!("cargo:rerun-if-changed=../../web/out");
    tauri_build::build()
}
