use serde::{Deserialize, Serialize};
use std::collections::HashMap;
use std::io::{BufRead, BufReader, Read};
use std::path::{Path, PathBuf};
use std::process::{Command, Stdio};
use std::sync::{Arc, Mutex};
use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_dialog::DialogExt;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct PathValidationResult {
    #[serde(rename = "isValid")]
    pub is_valid: bool,
    #[serde(rename = "canonicalPath")]
    pub canonical_path: Option<String>,
    #[serde(rename = "projectName")]
    pub project_name: Option<String>,
    #[serde(rename = "hasPackageJson")]
    pub has_package_json: bool,
    #[serde(rename = "hasTsConfig")]
    pub has_ts_config: bool,
    #[serde(rename = "hasPrisma")]
    pub has_prisma: bool,
    #[serde(rename = "isMonorepo")]
    pub is_monorepo: bool,
    #[serde(rename = "errorCode")]
    pub error_code: Option<String>,
    #[serde(rename = "errorMessage")]
    pub error_message: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RecentProjectEntry {
    pub path: String,
    pub name: String,
    #[serde(rename = "lastScanned")]
    pub last_scanned: String,
    #[serde(rename = "nodeCount")]
    pub node_count: usize,
    #[serde(rename = "isFixture")]
    pub is_fixture: Option<bool>,
    #[serde(rename = "fixtureId")]
    pub fixture_id: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanPlatformParams {
    #[serde(rename = "rootPath")]
    pub root_path: Option<String>,
    pub fixture: Option<String>,
    #[serde(rename = "projectName")]
    pub project_name: Option<String>,
    #[serde(rename = "useCache")]
    pub use_cache: Option<bool>,
    #[serde(rename = "maxFiles")]
    pub max_files: Option<usize>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ScanProgressEvent {
    #[serde(rename = "scanId")]
    pub scan_id: String,
    pub stage: String,
    pub message: String,
    pub percentage: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct OpenEditorResult {
    pub success: bool,
    pub url: Option<String>,
    pub error: Option<String>,
}

// Sidecar line output message types
#[derive(Debug, Deserialize)]
#[serde(tag = "type")]
#[allow(dead_code)]
enum SidecarOutput {
    #[serde(rename = "progress")]
    Progress {
        stage: Option<String>,
        message: Option<String>,
        percentage: Option<f64>,
    },
    #[serde(rename = "result")]
    Result { data: serde_json::Value },
    #[serde(rename = "error")]
    Error { error: String, code: Option<String> },
    #[serde(rename = "validation")]
    Validation { data: PathValidationResult },
}

pub struct ActiveScans {
    processes: Mutex<HashMap<String, u32>>,
}

impl Default for ActiveScans {
    fn default() -> Self {
        Self::new()
    }
}

impl ActiveScans {
    pub fn new() -> Self {
        Self {
            processes: Mutex::new(HashMap::new()),
        }
    }
}

pub fn get_stackfold_home_dir() -> PathBuf {
    if let Some(home) = dirs::home_dir() {
        home.join(".stackfold")
    } else {
        PathBuf::from(".stackfold")
    }
}

pub fn find_node_binary() -> Result<PathBuf, String> {
    // 1. Check if node is found directly in common binary paths
    let candidates = [
        "/opt/homebrew/bin/node",
        "/usr/local/bin/node",
        "/usr/bin/node",
    ];
    for c in &candidates {
        let p = PathBuf::from(c);
        if p.exists() && p.is_file() {
            return Ok(p);
        }
    }

    // 2. Check user home directories (.local/bin, .nvm, .fnm, .volta, .asdf, pnpm)
    if let Some(home) = dirs::home_dir() {
        let home_candidates = [
            home.join(".local/bin/node"),
            home.join(".nvm/current/bin/node"),
            home.join(".volta/bin/node"),
            home.join(".asdf/shims/node"),
            home.join(".local/share/pnpm/node"),
        ];
        for p in &home_candidates {
            if p.exists() && p.is_file() {
                return Ok(p.clone());
            }
        }

        // Check ~/.nvm/versions/node/*/bin/node
        let nvm_dir = home.join(".nvm/versions/node");
        if nvm_dir.exists() {
            if let Ok(entries) = std::fs::read_dir(nvm_dir) {
                for entry in entries.flatten() {
                    let node_path = entry.path().join("bin/node");
                    if node_path.exists() && node_path.is_file() {
                        return Ok(node_path);
                    }
                }
            }
        }
    }

    // 3. On Unix (macOS), query login shell which has the user's PATH configured
    #[cfg(unix)]
    {
        if let Ok(output) = Command::new("/bin/zsh")
            .args(["-l", "-c", "which node"])
            .output()
        {
            if output.status.success() {
                let path_str = String::from_utf8_lossy(&output.stdout).trim().to_string();
                if !path_str.is_empty() {
                    let p = PathBuf::from(&path_str);
                    if p.exists() && p.is_file() {
                        return Ok(p);
                    }
                }
            }
        }
    }

    // 4. Check system PATH environment variable
    if let Ok(path_var) = std::env::var("PATH") {
        for dir in std::env::split_paths(&path_var) {
            let candidate = dir.join(if cfg!(windows) { "node.exe" } else { "node" });
            if candidate.exists() && candidate.is_file() {
                return Ok(candidate);
            }
        }
    }

    Err("Node.js runtime not found. Please install Node.js (e.g. from nodejs.org or brew install node).".to_string())
}

pub fn find_scanner_sidecar() -> Result<PathBuf, String> {
    // 1. Check relative to current_exe in macOS app bundle
    // exe: /Applications/Stackfold.app/Contents/MacOS/stackfold-desktop
    // resources: /Applications/Stackfold.app/Contents/Resources/sidecar.cjs
    if let Ok(exe) = std::env::current_exe() {
        if let Some(macos_dir) = exe.parent() {
            if let Some(contents_dir) = macos_dir.parent() {
                let bundle_candidates = [
                    contents_dir.join("Resources/sidecar.cjs"),
                    contents_dir.join("Resources/_up_/_up_/_up_/packages/scanner/dist/sidecar.cjs"),
                    contents_dir.join("Resources/_up_/packages/scanner/dist/sidecar.cjs"),
                    contents_dir.join("Resources/packages/scanner/dist/sidecar.cjs"),
                ];
                for c in &bundle_candidates {
                    if c.exists() {
                        if let Ok(canon) = c.canonicalize() {
                            return Ok(canon);
                        }
                        return Ok(c.clone());
                    }
                }
            }
        }
    }

    // 2. Dev / monorepo candidates
    let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
    let candidates = vec![
        manifest_dir.join("../../../packages/scanner/dist/sidecar.cjs"),
        manifest_dir.join("../../packages/scanner/dist/sidecar.cjs"),
        manifest_dir.join("../scanner/dist/sidecar.cjs"),
        manifest_dir.join("sidecar/sidecar.cjs"),
        PathBuf::from("packages/scanner/dist/sidecar.cjs"),
    ];

    for candidate in candidates {
        if candidate.exists() {
            if let Ok(canon) = candidate.canonicalize() {
                return Ok(canon);
            }
            return Ok(candidate);
        }
    }

    Err("Scanner sidecar bundle not found at packages/scanner/dist/sidecar.cjs".to_string())
}

const FORBIDDEN_ROOTS: &[&str] = &[
    "/",
    "/System",
    "/private",
    "/etc",
    "/var",
    "/usr",
    "/bin",
    "/sbin",
    "C:\\",
    "C:\\Windows",
    "C:\\Program Files",
    "C:\\Program Files (x86)",
];

pub fn is_forbidden_root(canonical_path: &str) -> bool {
    let normalized = canonical_path.trim_end_matches('/');
    if normalized.is_empty() || normalized == "/" || normalized == "C:\\" {
        return true;
    }
    for root in FORBIDDEN_ROOTS {
        let clean_root = root.trim_end_matches('/');
        if normalized == clean_root || normalized.starts_with(&format!("{}/", clean_root)) {
            // Allow user home directories under /Users or /home even if / is forbidden
            if normalized.starts_with("/Users/") || normalized.starts_with("/home/") {
                return false;
            }
            return true;
        }
    }
    false
}

pub mod commands {
    use super::*;

    #[tauri::command]
    pub async fn select_repository_folder(app: AppHandle) -> Result<Option<String>, String> {
        let folder = app
            .dialog()
            .file()
            .set_title("Select Project Repository")
            .blocking_pick_folder();

        match folder {
            Some(path) => {
                let path_str = path.to_string();
                Ok(Some(path_str))
            }
            None => Ok(None),
        }
    }

    #[tauri::command]
    pub fn validate_repository_path(path: String) -> Result<PathValidationResult, String> {
        let trimmed = path.trim();
        if trimmed.is_empty() {
            return Ok(PathValidationResult {
                is_valid: false,
                canonical_path: None,
                project_name: None,
                has_package_json: false,
                has_ts_config: false,
                has_prisma: false,
                is_monorepo: false,
                error_code: Some("EMPTY_PATH".to_string()),
                error_message: Some("Path cannot be empty".to_string()),
            });
        }

        let p = Path::new(trimmed);
        if !p.exists() {
            return Ok(PathValidationResult {
                is_valid: false,
                canonical_path: None,
                project_name: None,
                has_package_json: false,
                has_ts_config: false,
                has_prisma: false,
                is_monorepo: false,
                error_code: Some("PATH_NOT_FOUND".to_string()),
                error_message: Some(format!("Directory not found: {}", trimmed)),
            });
        }

        let canonical = match p.canonicalize() {
            Ok(c) => c,
            Err(e) => {
                return Ok(PathValidationResult {
                    is_valid: false,
                    canonical_path: None,
                    project_name: None,
                    has_package_json: false,
                    has_ts_config: false,
                    has_prisma: false,
                    is_monorepo: false,
                    error_code: Some("CANONICALIZATION_FAILED".to_string()),
                    error_message: Some(e.to_string()),
                });
            }
        };

        if !canonical.is_dir() {
            return Ok(PathValidationResult {
                is_valid: false,
                canonical_path: None,
                project_name: None,
                has_package_json: false,
                has_ts_config: false,
                has_prisma: false,
                is_monorepo: false,
                error_code: Some("NOT_A_DIRECTORY".to_string()),
                error_message: Some("Selected path is a file, not a directory".to_string()),
            });
        }

        let canonical_str = canonical.to_string_lossy().to_string();

        if is_forbidden_root(&canonical_str) {
            return Ok(PathValidationResult {
                is_valid: false,
                canonical_path: None,
                project_name: None,
                has_package_json: false,
                has_ts_config: false,
                has_prisma: false,
                is_monorepo: false,
                error_code: Some("FORBIDDEN_SYSTEM_ROOT".to_string()),
                error_message: Some(
                    "Scanning system root or system directory is forbidden".to_string(),
                ),
            });
        }

        let has_package_json = canonical.join("package.json").exists();
        let has_ts_config = canonical.join("tsconfig.json").exists();
        let has_prisma = canonical.join("prisma/schema.prisma").exists()
            || canonical.join("schema.prisma").exists();
        let is_monorepo =
            canonical.join("pnpm-workspace.yaml").exists() || canonical.join("lerna.json").exists();

        let mut project_name = canonical
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "project".to_string());

        if has_package_json {
            if let Ok(content) = std::fs::read_to_string(canonical.join("package.json")) {
                if let Ok(val) = serde_json::from_str::<serde_json::Value>(&content) {
                    if let Some(name) = val.get("name").and_then(|n| n.as_str()) {
                        project_name = name.to_string();
                    }
                }
            }
        }

        Ok(PathValidationResult {
            is_valid: true,
            canonical_path: Some(canonical_str),
            project_name: Some(project_name),
            has_package_json,
            has_ts_config,
            has_prisma,
            is_monorepo,
            error_code: None,
            error_message: None,
        })
    }

    #[tauri::command]
    pub async fn execute_scan(
        app: AppHandle,
        params: ScanPlatformParams,
        scan_id: Option<String>,
    ) -> Result<serde_json::Value, String> {
        let sidecar_path = find_scanner_sidecar()?;
        let current_scan_id = scan_id.unwrap_or_else(|| "default-scan".to_string());

        let mut target_path = params.root_path.clone();

        if let Some(fixture) = &params.fixture {
            let manifest_dir = PathBuf::from(env!("CARGO_MANIFEST_DIR"));
            let fixture_path = manifest_dir.join(format!("../../fixtures/{}", fixture));
            if fixture_path.exists() {
                target_path = Some(
                    fixture_path
                        .canonicalize()
                        .unwrap()
                        .to_string_lossy()
                        .to_string(),
                );
            } else {
                return Err(format!("Unknown fixture '{}'", fixture));
            }
        }

        let resolved_path = match target_path {
            Some(p) => p,
            None => return Err("Either rootPath or fixture must be provided".to_string()),
        };

        // Re-validate path bounds
        let val = validate_repository_path(resolved_path.clone())?;
        if !val.is_valid || val.canonical_path.is_none() {
            return Err(val
                .error_message
                .unwrap_or_else(|| "Invalid repository path".to_string()));
        }

        let canonical_root = val.canonical_path.unwrap();
        let payload_json = serde_json::json!({
            "rootPath": canonical_root,
            "projectName": params.project_name.or(val.project_name),
            "useCache": params.use_cache.unwrap_or(false),
            "maxFiles": params.max_files.unwrap_or(15000)
        })
        .to_string();

        let node_bin = find_node_binary()?;

        let mut child = Command::new(&node_bin)
            .arg(&sidecar_path)
            .arg("scan")
            .arg(&payload_json)
            .stdout(Stdio::piped())
            .stderr(Stdio::piped())
            .spawn()
            .map_err(|e| format!("Failed to spawn scanner sidecar with Node binary '{:?}': {}", node_bin, e))?;

        let pid = child.id();
        if let Some(scans) = app.try_state::<Arc<ActiveScans>>() {
            let mut procs = scans.processes.lock().unwrap();
            procs.insert(current_scan_id.clone(), pid);
        }

        let stdout = child.stdout.take().ok_or("Failed to capture stdout")?;
        let reader = BufReader::new(stdout);

        let mut final_result: Option<serde_json::Value> = None;
        let mut scan_error: Option<String> = None;
        let mut total_bytes: usize = 0;
        const MAX_OUTPUT_BYTES: usize = 64 * 1024 * 1024; // 64 MB size boundary

        for line in reader.lines() {
            let line_str = match line {
                Ok(l) => l,
                Err(_) => continue,
            };

            total_bytes += line_str.len();
            if total_bytes > MAX_OUTPUT_BYTES {
                scan_error = Some("Scanner output exceeded 64MB memory limit".to_string());
                break;
            }

            if let Ok(output) = serde_json::from_str::<SidecarOutput>(&line_str) {
                match output {
                    SidecarOutput::Progress {
                        stage,
                        message,
                        percentage,
                    } => {
                        let _ = app.emit(
                            "scan://progress",
                            ScanProgressEvent {
                                scan_id: current_scan_id.clone(),
                                stage: stage.unwrap_or_else(|| "SCANNING".to_string()),
                                message: message.unwrap_or_default(),
                                percentage,
                            },
                        );
                    }
                    SidecarOutput::Result { data } => {
                        final_result = Some(data);
                    }
                    SidecarOutput::Error { error, .. } => {
                        scan_error = Some(error);
                    }
                    SidecarOutput::Validation { .. } => {}
                }
            }
        }

        let exit_status = child.wait();

        if let Some(scans) = app.try_state::<Arc<ActiveScans>>() {
            let mut procs = scans.processes.lock().unwrap();
            procs.remove(&current_scan_id);
        }

        if let Some(err) = scan_error {
            return Err(err);
        }

        if let Some(res) = final_result {
            return Ok(res);
        }

        let mut stderr_msg = String::new();
        if let Some(mut err_stream) = child.stderr.take() {
            let _ = err_stream.read_to_string(&mut stderr_msg);
        }

        let detail = if !stderr_msg.trim().is_empty() {
            format!(": {}", stderr_msg.trim())
        } else if let Ok(status) = exit_status {
            if !status.success() {
                format!(" (exit code: {:?})", status.code())
            } else {
                String::new()
            }
        } else {
            String::new()
        };

        Err(format!("Scanner process terminated without returning a result{}", detail))
    }

    #[tauri::command]
    pub fn cancel_scan(app: AppHandle, scan_id: Option<String>) -> Result<bool, String> {
        let current_scan_id = scan_id.unwrap_or_else(|| "default-scan".to_string());
        if let Some(scans) = app.try_state::<Arc<ActiveScans>>() {
            let mut procs = scans.processes.lock().unwrap();
            if let Some(pid) = procs.remove(&current_scan_id) {
                #[cfg(unix)]
                {
                    unsafe {
                        libc::kill(pid as i32, libc::SIGTERM);
                    }
                }
                #[cfg(windows)]
                {
                    let _ = Command::new("taskkill")
                        .args(["/F", "/PID", &pid.to_string()])
                        .output();
                }
                return Ok(true);
            }
        }
        Ok(false)
    }

    #[tauri::command]
    pub fn load_cached_scan(root_path: String) -> Result<Option<serde_json::Value>, String> {
        let cache_dir = get_stackfold_home_dir().join("cache");
        if !cache_dir.exists() {
            return Ok(None);
        }

        let files = match std::fs::read_dir(&cache_dir) {
            Ok(f) => f,
            Err(_) => return Ok(None),
        };

        for entry in files.flatten() {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Ok(content) = std::fs::read_to_string(&path) {
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                        if let Some(stored_root) = json.get("rootPath").and_then(|r| r.as_str()) {
                            if stored_root == root_path {
                                return Ok(Some(json));
                            }
                        }
                    }
                }
            }
        }
        Ok(None)
    }

    #[tauri::command]
    pub fn delete_cached_scan(root_path: String) -> Result<bool, String> {
        let cache_dir = get_stackfold_home_dir().join("cache");
        if !cache_dir.exists() {
            return Ok(false);
        }

        let files = match std::fs::read_dir(&cache_dir) {
            Ok(f) => f,
            Err(_) => return Ok(false),
        };

        let mut deleted = false;
        for entry in files.flatten() {
            let path = entry.path();
            if path.extension().and_then(|s| s.to_str()) == Some("json") {
                if let Ok(content) = std::fs::read_to_string(&path) {
                    if let Ok(json) = serde_json::from_str::<serde_json::Value>(&content) {
                        if let Some(stored_root) = json.get("rootPath").and_then(|r| r.as_str()) {
                            if stored_root == root_path {
                                let _ = std::fs::remove_file(path);
                                deleted = true;
                            }
                        }
                    }
                }
            }
        }
        Ok(deleted)
    }

    #[tauri::command]
    pub fn list_recent_projects() -> Result<Vec<RecentProjectEntry>, String> {
        let file_path = get_stackfold_home_dir().join("recent_projects.json");
        if !file_path.exists() {
            return Ok(Vec::new());
        }

        let content = std::fs::read_to_string(file_path).map_err(|e| e.to_string())?;
        let recents: Vec<RecentProjectEntry> = serde_json::from_str(&content).unwrap_or_default();
        Ok(recents)
    }

    #[tauri::command]
    pub fn save_recent_project(entry: RecentProjectEntry) -> Result<(), String> {
        let stackfold_dir = get_stackfold_home_dir();
        let _ = std::fs::create_dir_all(&stackfold_dir);
        let file_path = stackfold_dir.join("recent_projects.json");

        let mut recents = list_recent_projects().unwrap_or_default();
        recents.retain(|r| {
            r.path != entry.path && (entry.fixture_id.is_none() || r.fixture_id != entry.fixture_id)
        });
        recents.insert(0, entry);
        recents.truncate(10);

        let json = serde_json::to_string_pretty(&recents).map_err(|e| e.to_string())?;
        std::fs::write(file_path, json).map_err(|e| e.to_string())?;
        Ok(())
    }

    #[tauri::command]
    pub fn remove_recent_project(path: String) -> Result<(), String> {
        let file_path = get_stackfold_home_dir().join("recent_projects.json");
        if !file_path.exists() {
            return Ok(());
        }

        let mut recents = list_recent_projects().unwrap_or_default();
        recents.retain(|r| r.path != path && r.fixture_id.as_deref() != Some(&path));

        let json = serde_json::to_string_pretty(&recents).map_err(|e| e.to_string())?;
        std::fs::write(file_path, json).map_err(|e| e.to_string())?;
        Ok(())
    }

    #[tauri::command]
    pub fn open_in_editor(
        file_path: String,
        root_path: String,
        editor: Option<String>,
    ) -> Result<OpenEditorResult, String> {
        // Prevent path traversal escaping root
        if file_path.contains("..") || file_path.starts_with('/') || file_path.starts_with('\\') {
            return Ok(OpenEditorResult {
                success: false,
                url: None,
                error: Some("Path traversal with '..' or leading slashes is forbidden".to_string()),
            });
        }

        let clean_file = file_path.trim_start_matches('/');
        let clean_root = root_path.trim_end_matches('/');
        let full_path = format!("{}/{}", clean_root, clean_file);

        let editor_choice = editor.unwrap_or_else(|| "vscode".to_string());
        let url = match editor_choice.as_str() {
            "cursor" => format!("cursor://file/{}", full_path),
            "webstorm" => format!("webstorm://open?file={}", full_path),
            _ => format!("vscode://file/{}", full_path),
        };

        match open::that(&url) {
            Ok(_) => Ok(OpenEditorResult {
                success: true,
                url: Some(url),
                error: None,
            }),
            Err(e) => Ok(OpenEditorResult {
                success: false,
                url: Some(url),
                error: Some(e.to_string()),
            }),
        }
    }

    #[tauri::command]
    pub fn open_external_url(url: String) -> Result<(), String> {
        if !url.starts_with("http://") && !url.starts_with("https://") {
            return Err("Only HTTP/HTTPS URLs are allowed".to_string());
        }
        open::that(&url).map_err(|e| e.to_string())
    }

    #[tauri::command]
    pub fn set_window_title(app: AppHandle, title: String) -> Result<(), String> {
        if let Some(window) = app.get_webview_window("main") {
            let _ = window.set_title(&title);
        }
        Ok(())
    }
}

pub fn run() {
    let active_scans = Arc::new(ActiveScans::new());

    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_opener::init())
        .manage(active_scans)
        .invoke_handler(tauri::generate_handler![
            commands::select_repository_folder,
            commands::validate_repository_path,
            commands::execute_scan,
            commands::cancel_scan,
            commands::load_cached_scan,
            commands::delete_cached_scan,
            commands::list_recent_projects,
            commands::save_recent_project,
            commands::remove_recent_project,
            commands::open_in_editor,
            commands::open_external_url,
            commands::set_window_title
        ])
        .run(tauri::generate_context!())
        .expect("error while running Stackfold desktop application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_validate_repository_path_empty() {
        let res = commands::validate_repository_path("".to_string()).unwrap();
        assert!(!res.is_valid);
        assert_eq!(res.error_code, Some("EMPTY_PATH".to_string()));
    }

    #[test]
    fn test_validate_repository_path_nonexistent() {
        let res = commands::validate_repository_path("/path/that/does/not/exist/999".to_string())
            .unwrap();
        assert!(!res.is_valid);
        assert_eq!(res.error_code, Some("PATH_NOT_FOUND".to_string()));
    }

    #[test]
    fn test_validate_repository_path_forbidden_root() {
        let res = commands::validate_repository_path("/".to_string()).unwrap();
        assert!(!res.is_valid);
        assert_eq!(res.error_code, Some("FORBIDDEN_SYSTEM_ROOT".to_string()));

        let res_etc = commands::validate_repository_path("/etc".to_string()).unwrap();
        assert!(!res_etc.is_valid);
        assert_eq!(
            res_etc.error_code,
            Some("FORBIDDEN_SYSTEM_ROOT".to_string())
        );

        let res_var = commands::validate_repository_path("/var".to_string()).unwrap();
        assert!(!res_var.is_valid);
        assert_eq!(
            res_var.error_code,
            Some("FORBIDDEN_SYSTEM_ROOT".to_string())
        );
    }

    #[test]
    fn test_open_in_editor_traversal_rejection() {
        let res = commands::open_in_editor(
            "../secret/file.ts".to_string(),
            "/workspace".to_string(),
            None,
        )
        .unwrap();
        assert!(!res.success);
        assert!(res.error.unwrap().contains("Path traversal"));

        let res_slash =
            commands::open_in_editor("/etc/passwd".to_string(), "/workspace".to_string(), None)
                .unwrap();
        assert!(!res_slash.success);
        assert!(res_slash.error.unwrap().contains("Path traversal"));
    }

    #[test]
    fn test_open_external_url_security_filter() {
        let bad_url = commands::open_external_url("file:///etc/passwd".to_string());
        assert!(bad_url.is_err());
        assert_eq!(bad_url.unwrap_err(), "Only HTTP/HTTPS URLs are allowed");

        let bad_js = commands::open_external_url("javascript:alert(1)".to_string());
        assert!(bad_js.is_err());
    }

    #[test]
    fn test_recent_projects_save_and_list() {
        let test_entry = RecentProjectEntry {
            path: "/tmp/test-proj".to_string(),
            name: "test-proj".to_string(),
            last_scanned: "2026-08-23T12:00:00Z".to_string(),
            node_count: 10,
            is_fixture: Some(false),
            fixture_id: None,
        };

        let save_res = commands::save_recent_project(test_entry);
        assert!(save_res.is_ok());

        let list_res = commands::list_recent_projects().unwrap();
        assert!(list_res.iter().any(|r| r.path == "/tmp/test-proj"));

        let remove_res = commands::remove_recent_project("/tmp/test-proj".to_string());
        assert!(remove_res.is_ok());
    }

    #[test]
    fn test_find_node_binary() {
        let node = find_node_binary();
        assert!(node.is_ok(), "Node binary should be found on development/host system: {:?}", node.err());
        let p = node.unwrap();
        assert!(p.exists(), "Resolved node path must exist: {:?}", p);
    }

    #[test]
    fn test_find_scanner_sidecar() {
        let sidecar = find_scanner_sidecar();
        assert!(sidecar.is_ok(), "Sidecar must be found: {:?}", sidecar.err());
        let p = sidecar.unwrap();
        assert!(p.exists(), "Resolved sidecar path must exist: {:?}", p);
    }
}
