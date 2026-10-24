//! Small, offline Chinese/English OCR based on PP-OCRv6 small ONNX models.
use base64::{engine::general_purpose::STANDARD, Engine};
use rapidocr_core::{
    config::PipelineConfig,
    model::{model_set_by_name, ModelCache, ModelDownloadMode},
    types::OcrLine,
    RapidOcr,
};
use tauri::{AppHandle, Manager};

const MAX_IMAGE_BYTES: usize = 12 * 1024 * 1024;
const MAX_PIXELS: u64 = 25_000_000;

#[tauri::command]
pub async fn recognize_image(app: AppHandle, image_base64: String) -> Result<String, String> {
    if image_base64.is_empty() || image_base64.len() > MAX_IMAGE_BYTES * 4 / 3 + 4 {
        return Err("Image is empty or exceeds 12 MB".into());
    }
    let bytes = STANDARD
        .decode(image_base64)
        .map_err(|_| "Invalid image data")?;
    if bytes.len() < 16 || bytes.len() > MAX_IMAGE_BYTES {
        return Err("Image is empty or exceeds 12 MB".into());
    }
    let format = image::guess_format(&bytes).map_err(|_| "Invalid image format")?;
    if !matches!(
        format,
        image::ImageFormat::Png | image::ImageFormat::Jpeg | image::ImageFormat::WebP
    ) {
        return Err("Use a PNG, JPEG or WebP image".into());
    }
    let cache_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| e.to_string())?
        .join("ocr-models");
    tauri::async_runtime::spawn_blocking(move || run_ocr(&bytes, cache_dir))
        .await
        .map_err(|e| e.to_string())?
}

fn run_ocr(bytes: &[u8], cache_dir: std::path::PathBuf) -> Result<String, String> {
    let reader = image::ImageReader::new(std::io::Cursor::new(bytes))
        .with_guessed_format()
        .map_err(|e| e.to_string())?;
    let (width, height) = reader.into_dimensions().map_err(|e| e.to_string())?;
    if u64::from(width) * u64::from(height) > MAX_PIXELS {
        return Err("Image dimensions are too large".into());
    }
    let image = image::load_from_memory(bytes)
        .map_err(|e| e.to_string())?
        .to_rgb8();
    let set = model_set_by_name("ppocrv6-small").ok_or("OCR model is unavailable")?;
    let cache = ModelCache::new(cache_dir);
    let pipeline = PipelineConfig::without_cls();
    cache
        .ensure_model_set_for_pipeline(set, pipeline, ModelDownloadMode::Missing)
        .map_err(|e| format!("Could not download the OCR model: {e}"))?;
    let mut engine = RapidOcr::new(cache.config_for(set).with_pipeline(pipeline))
        .map_err(|e| format!("Could not start OCR: {e}"))?;
    let output = engine
        .run_image(&image)
        .map_err(|e| format!("OCR failed: {e}"))?;
    let text = assemble_lines(output.lines);
    if text.is_empty() {
        Err("No text was found in this image".into())
    } else {
        Ok(text)
    }
}

fn assemble_lines(lines: Vec<OcrLine>) -> String {
    let mut rows: Vec<(f32, f32, String)> = Vec::new();
    for line in lines
        .into_iter()
        .filter(|line| !line.text.trim().is_empty())
    {
        let top = line
            .bbox
            .points
            .iter()
            .map(|p| p[1])
            .fold(f32::INFINITY, f32::min);
        let bottom = line
            .bbox
            .points
            .iter()
            .map(|p| p[1])
            .fold(f32::NEG_INFINITY, f32::max);
        let center = (top + bottom) / 2.0;
        let height = (bottom - top).max(1.0);
        let word = line.text.trim();
        if let Some(row) = rows.last_mut() {
            if (center - row.0).abs() <= height.min(row.1) * 0.5 {
                if row
                    .2
                    .chars()
                    .last()
                    .is_some_and(|c| c.is_ascii_alphanumeric())
                    || word
                        .chars()
                        .next()
                        .is_some_and(|c| c.is_ascii_alphanumeric())
                {
                    row.2.push(' ');
                }
                row.2.push_str(word);
                continue;
            }
        }
        rows.push((center, height, word.to_owned()));
    }
    rows.into_iter()
        .map(|(_, _, text)| text)
        .collect::<Vec<_>>()
        .join("\n")
}

#[cfg(test)]
mod tests {
    use super::run_ocr;

    // Manual integration gate: put a Chinese/English sample at this path and
    // run with --ignored. It intentionally does not download models in CI.
    #[test]
    #[ignore]
    fn recognizes_chinese_and_english() {
        let root = std::path::Path::new(env!("CARGO_MANIFEST_DIR")).join("target");
        let bytes = std::fs::read(root.join("ocr-sample.png")).expect("sample image");
        let text = run_ocr(&bytes, root.join("ocr-models-test")).expect("OCR should run");
        assert!(text.contains("你好世界"), "{text}");
        assert!(text.contains("Hello World"), "{text}");
    }
}
