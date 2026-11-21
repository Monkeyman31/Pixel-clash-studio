use std::fs;
use std::path::{Path, PathBuf};
use std::sync::atomic::{AtomicBool, Ordering};
use std::time::UNIX_EPOCH;

use image::ImageEncoder;
use serde::{Deserialize, Serialize};
use tauri::{Emitter, Manager};

pub struct DesktopRuntimeState {
    pub has_unsaved: AtomicBool,
    pub force_close: AtomicBool,
    pub last_maximized: AtomicBool,
}

impl Default for DesktopRuntimeState {
    fn default() -> Self {
        Self {
            has_unsaved: AtomicBool::new(false),
            force_close: AtomicBool::new(false),
            last_maximized: AtomicBool::new(false),
        }
    }
}

#[derive(Debug, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenDialogFilter {
    pub name: String,
    pub extensions: Vec<String>,
}

#[derive(Debug, Deserialize, Default)]
#[serde(rename_all = "camelCase")]
pub struct OpenFileDialogOptions {
    pub title: Option<String>,
    pub multiple: Option<bool>,
    pub filters: Option<Vec<OpenDialogFilter>>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct DesktopOpenFilePayload {
    pub file_path: String,
    pub name: String,
    pub size: u64,
    pub last_modified: u64,
    pub bytes: Vec<u8>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct OpenFileDialogResponse {
    pub canceled: bool,
    pub error: Option<String>,
    pub files: Vec<DesktopOpenFilePayload>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct FileExistsResponse {
    pub exists: bool,
    pub size: Option<u64>,
    pub last_modified: Option<u64>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ReadFileResponse {
    pub exists: bool,
    pub file_path: Option<String>,
    pub name: Option<String>,
    pub size: Option<u64>,
    pub last_modified: Option<u64>,
    pub bytes: Option<Vec<u8>>,
    pub error: Option<String>,
}

#[derive(Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ClipboardImageReadResponse {
    pub has_image: bool,
    pub png_bytes: Option<Vec<u8>>,
    pub width: Option<usize>,
    pub height: Option<usize>,
    pub error: Option<String>,
}

fn modified_ms(meta: &fs::Metadata) -> u64 {
    meta.modified()
        .ok()
        .and_then(|t| t.duration_since(UNIX_EPOCH).ok())
        .map(|d| d.as_millis() as u64)
        .unwrap_or(0)
}

fn read_disk_file_payload(path: &Path) -> Result<DesktopOpenFilePayload, String> {
    let meta = fs::metadata(path).map_err(|e| e.to_string())?;
    if !meta.is_file() {
        return Err("La ruta no corresponde a un archivo válido.".to_string());
    }
    let bytes = fs::read(path).map_err(|e| e.to_string())?;
    let name = path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("archivo")
        .to_string();

    Ok(DesktopOpenFilePayload {
        file_path: path.to_string_lossy().to_string(),
        name,
        size: meta.len(),
        last_modified: modified_ms(&meta),
        bytes,
    })
}

#[tauri::command]
async fn open_file_dialog(options: Option<OpenFileDialogOptions>) -> OpenFileDialogResponse {
    let opts = options.unwrap_or_default();
    let title = opts
        .title
        .unwrap_or_else(|| "Abrir archivo en PixelClash Studio".to_string());
    let multiple = opts.multiple.unwrap_or(false);

    let mut dialog = rfd::AsyncFileDialog::new().set_title(&title);

    if let Some(custom_filters) = opts.filters {
        for f in custom_filters {
            let exts: Vec<&str> = f.extensions.iter().map(|s| s.as_str()).collect();
            dialog = dialog.add_filter(&f.name, &exts);
        }
    } else {
        dialog = dialog
            .add_filter(
                "Todos los formatos compatibles",
                &[
                    "pcs", "ase", "aseprite", "psd", "psb", "json", "png", "jpg", "jpeg", "webp", "gif",
                    "bmp", "tif", "tiff", "tga", "ico",
                ],
            )
            .add_filter(
                "Imágenes (PNG, JPG, WEBP, GIF, BMP, TIFF, TGA, ICO)",
                &["png", "jpg", "jpeg", "webp", "gif", "bmp", "tif", "tiff", "tga", "ico"],
            )
            .add_filter(
                "Pixel Art y Proyectos (PCS, ASE, ASEPRITE, PSD, PSB, JSON)",
                &["pcs", "ase", "aseprite", "psd", "psb", "json"],
            )
            .add_filter("Todos los archivos", &["*"]);
    }

    let picked_paths: Vec<PathBuf> = if multiple {
        match dialog.pick_files().await {
            Some(handles) => handles.into_iter().map(|h| h.path().to_path_buf()).collect(),
            None => Vec::new(),
        }
    } else {
        match dialog.pick_file().await {
            Some(handle) => vec![handle.path().to_path_buf()],
            None => Vec::new(),
        }
    };

    if picked_paths.is_empty() {
        return OpenFileDialogResponse {
            canceled: true,
            error: None,
            files: Vec::new(),
        };
    }

    let mut files = Vec::with_capacity(picked_paths.len());
    for path in picked_paths {
        match read_disk_file_payload(&path) {
            Ok(payload) => files.push(payload),
            Err(err) => {
                return OpenFileDialogResponse {
                    canceled: false,
                    error: Some(format!("No se pudo leer \"{}\": {}", path.display(), err)),
                    files: Vec::new(),
                };
            }
        }
    }

    OpenFileDialogResponse {
        canceled: false,
        error: None,
        files,
    }
}

#[tauri::command]
fn check_file_exists(file_path: String) -> FileExistsResponse {
    if file_path.trim().is_empty() {
        return FileExistsResponse {
            exists: false,
            size: None,
            last_modified: None,
        };
    }
    let path = Path::new(&file_path);
    match fs::metadata(path) {
        Ok(meta) if meta.is_file() => FileExistsResponse {
            exists: true,
            size: Some(meta.len()),
            last_modified: Some(modified_ms(&meta)),
        },
        _ => FileExistsResponse {
            exists: false,
            size: None,
            last_modified: None,
        },
    }
}

#[tauri::command]
fn read_file_at_path(file_path: String) -> ReadFileResponse {
    if file_path.trim().is_empty() {
        return ReadFileResponse {
            exists: false,
            file_path: None,
            name: None,
            size: None,
            last_modified: None,
            bytes: None,
            error: Some("Ruta de archivo inválida.".to_string()),
        };
    }
    let path = Path::new(&file_path);
    if !path.exists() {
        return ReadFileResponse {
            exists: false,
            file_path: None,
            name: None,
            size: None,
            last_modified: None,
            bytes: None,
            error: None,
        };
    }
    match read_disk_file_payload(path) {
        Ok(payload) => ReadFileResponse {
            exists: true,
            file_path: Some(payload.file_path),
            name: Some(payload.name),
            size: Some(payload.size),
            last_modified: Some(payload.last_modified),
            bytes: Some(payload.bytes),
            error: None,
        },
        Err(err) => ReadFileResponse {
            exists: false,
            file_path: None,
            name: None,
            size: None,
            last_modified: None,
            bytes: None,
            error: Some(err),
        },
    }
}

#[tauri::command]
fn read_clipboard_image() -> ClipboardImageReadResponse {
    let mut clipboard = match arboard::Clipboard::new() {
        Ok(cb) => cb,
        Err(err) => {
            return ClipboardImageReadResponse {
                has_image: false,
                png_bytes: None,
                width: None,
                height: None,
                error: Some(err.to_string()),
            }
        }
    };

    let img = match clipboard.get_image() {
        Ok(img) => img,
        Err(_) => {
            return ClipboardImageReadResponse {
                has_image: false,
                png_bytes: None,
                width: None,
                height: None,
                error: None,
            }
        }
    };

    if img.width == 0 || img.height == 0 || img.bytes.is_empty() {
        return ClipboardImageReadResponse {
            has_image: false,
            png_bytes: None,
            width: None,
            height: None,
            error: None,
        };
    }

    let mut png_bytes: Vec<u8> = Vec::new();
    let encoder = image::codecs::png::PngEncoder::new(&mut png_bytes);
    if let Err(err) = encoder.write_image(
        &img.bytes,
        img.width as u32,
        img.height as u32,
        image::ExtendedColorType::Rgba8,
    ) {
        return ClipboardImageReadResponse {
            has_image: false,
            png_bytes: None,
            width: None,
            height: None,
            error: Some(err.to_string()),
        };
    }

    ClipboardImageReadResponse {
        has_image: true,
        png_bytes: Some(png_bytes),
        width: Some(img.width),
        height: Some(img.height),
        error: None,
    }
}

#[tauri::command]
fn write_clipboard_image(png_bytes: Vec<u8>) -> serde_json::Value {
    if png_bytes.is_empty() {
        return serde_json::json!({ "ok": false, "error": "Buffer PNG vacío." });
    }

    let decoded = match image::load_from_memory_with_format(&png_bytes, image::ImageFormat::Png) {
        Ok(img) => img.to_rgba8(),
        Err(err) => {
            return serde_json::json!({ "ok": false, "error": err.to_string() });
        }
    };

    let width = decoded.width() as usize;
    let height = decoded.height() as usize;
    let rgba_raw = decoded.into_raw();

    let mut clipboard = match arboard::Clipboard::new() {
        Ok(cb) => cb,
        Err(err) => {
            return serde_json::json!({ "ok": false, "error": err.to_string() });
        }
    };

    let image_data = arboard::ImageData {
        width,
        height,
        bytes: std::borrow::Cow::Owned(rgba_raw),
    };

    match clipboard.set_image(image_data) {
        Ok(_) => serde_json::json!({ "ok": true }),
        Err(err) => serde_json::json!({ "ok": false, "error": err.to_string() }),
    }
}

#[tauri::command]
fn window_minimize(window: tauri::Window) -> serde_json::Value {
    let ok = window.minimize().is_ok();
    serde_json::json!({ "ok": ok })
}

#[tauri::command]
fn window_toggle_maximize(
    window: tauri::Window,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> serde_json::Value {
    let is_max = window.is_maximized().unwrap_or(false);
    if is_max {
        let _ = window.unmaximize();
    } else {
        let _ = window.maximize();
    }
    let next_max = window.is_maximized().unwrap_or(!is_max);
    state.last_maximized.store(next_max, Ordering::SeqCst);
    let _ = window.emit("desktop:window-maximize-change", next_max);
    serde_json::json!({ "maximized": next_max })
}

#[tauri::command]
fn window_is_maximized(window: tauri::Window) -> serde_json::Value {
    let maximized = window.is_maximized().unwrap_or(false);
    serde_json::json!({ "maximized": maximized })
}

#[tauri::command]
fn window_close(window: tauri::Window) -> serde_json::Value {
    let ok = window.close().is_ok();
    serde_json::json!({ "ok": ok })
}

#[tauri::command]
fn window_start_dragging(window: tauri::Window) -> serde_json::Value {
    let ok = window.start_dragging().is_ok();
    serde_json::json!({ "ok": ok })
}

#[tauri::command]
fn set_unsaved_state(
    has_unsaved: bool,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> serde_json::Value {
    state.has_unsaved.store(has_unsaved, Ordering::SeqCst);
    serde_json::json!({ "ok": true })
}

#[tauri::command]
fn confirm_app_close(
    app: tauri::AppHandle,
    state: tauri::State<'_, DesktopRuntimeState>,
) -> serde_json::Value {
    state.force_close.store(true, Ordering::SeqCst);
    if let Some(win) = app.get_webview_window("main") {
        let _ = win.close();
    } else {
        app.exit(0);
    }
    serde_json::json!({ "ok": true })
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .manage(DesktopRuntimeState::default())
        .invoke_handler(tauri::generate_handler![
            open_file_dialog,
            check_file_exists,
            read_file_at_path,
            read_clipboard_image,
            write_clipboard_image,
            window_minimize,
            window_toggle_maximize,
            window_is_maximized,
            window_close,
            window_start_dragging,
            set_unsaved_state,
            confirm_app_close,
        ])
        .on_window_event(|window, event| {
            let state = window.state::<DesktopRuntimeState>();
            match event {
                tauri::WindowEvent::CloseRequested { api, .. } => {
                    let has_unsaved = state.has_unsaved.load(Ordering::SeqCst);
                    let force_close = state.force_close.load(Ordering::SeqCst);
                    if has_unsaved && !force_close {
                        api.prevent_close();
                        let _ = window.emit("desktop:request-app-close", ());
                    }
                }
                tauri::WindowEvent::Resized(_) | tauri::WindowEvent::Moved(_) => {
                    if let Ok(is_max) = window.is_maximized() {
                        let prev = state.last_maximized.swap(is_max, Ordering::SeqCst);
                        if prev != is_max {
                            let _ = window.emit("desktop:window-maximize-change", is_max);
                        }
                    }
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error al iniciar el runtime nativo Rust (Tauri) de PixelClash Studio");
}
