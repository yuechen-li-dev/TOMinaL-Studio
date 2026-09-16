use serde::Deserialize;
use std::{fs, path::{Component, Path, PathBuf}};

const MAX_PROJECT_BYTES: u64 = 32 * 1024 * 1024;
const MAX_ARTIFACT_BYTES: usize = 128 * 1024 * 1024;

#[derive(Deserialize)]
#[serde(rename_all = "camelCase")]
struct ArtifactFile {
  file: String,
  content: String,
}

fn validate_artifact_file_name(file: &str) -> Result<(), String> {
  let mut components = Path::new(file).components();
  match (components.next(), components.next()) {
    (Some(Component::Normal(_)), None) if !file.trim().is_empty() => Ok(()),
    _ => Err(format!("Artifact file name is not a single safe path component: {file}")),
  }
}

#[tauri::command]
fn read_text_file(path: String) -> Result<String, String> {
  let path = PathBuf::from(path);
  let metadata = fs::metadata(&path).map_err(|error| format!("Could not inspect project file: {error}"))?;
  if !metadata.is_file() || metadata.len() > MAX_PROJECT_BYTES {
    return Err("Project file is not a regular UTF-8 file within the 32 MiB limit.".into());
  }
  fs::read_to_string(path).map_err(|error| format!("Could not read project file: {error}"))
}

#[tauri::command]
fn write_text_file(path: String, contents: String) -> Result<(), String> {
  if contents.len() as u64 > MAX_PROJECT_BYTES {
    return Err("Project file exceeds the 32 MiB limit.".into());
  }
  let path = PathBuf::from(path);
  if let Some(parent) = path.parent() {
    fs::create_dir_all(parent).map_err(|error| format!("Could not create project directory: {error}"))?;
  }
  fs::write(path, contents).map_err(|error| format!("Could not save project file: {error}"))
}

#[tauri::command]
fn write_artifact_folder(directory: String, project_id: String, artifacts: Vec<ArtifactFile>) -> Result<String, String> {
  if artifacts.is_empty() || artifacts.len() > 64 {
    return Err("Artifact package must contain between 1 and 64 files.".into());
  }
  if artifacts.iter().map(|artifact| artifact.content.len()).sum::<usize>() > MAX_ARTIFACT_BYTES {
    return Err("Artifact package exceeds the 128 MiB limit.".into());
  }
  for artifact in &artifacts { validate_artifact_file_name(&artifact.file)?; }
  validate_artifact_file_name(&project_id)?;
  let target = PathBuf::from(directory).join(format!("{project_id}-artifacts"));
  fs::create_dir_all(&target).map_err(|error| format!("Could not create artifact folder: {error}"))?;
  for artifact in artifacts {
    fs::write(target.join(artifact.file), artifact.content).map_err(|error| format!("Could not write artifact: {error}"))?;
  }
  Ok(target.to_string_lossy().into_owned())
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
  tauri::Builder::default()
    .plugin(tauri_plugin_dialog::init())
    .setup(|app| {
      if cfg!(debug_assertions) {
        app.handle().plugin(tauri_plugin_log::Builder::default().level(log::LevelFilter::Info).build())?;
      }
      Ok(())
    })
    .invoke_handler(tauri::generate_handler![read_text_file, write_text_file, write_artifact_folder])
    .run(tauri::generate_context!())
    .expect("error while running TOMinaL Studio");
}

#[cfg(test)]
mod tests {
  use super::{read_text_file, validate_artifact_file_name, write_artifact_folder, write_text_file, ArtifactFile};
  use std::{fs, process};

  #[test]
  fn artifact_names_are_single_safe_components() {
    assert!(validate_artifact_file_name("tominal.lock.toml").is_ok());
    assert!(validate_artifact_file_name("../escape.txt").is_err());
    assert!(validate_artifact_file_name("nested/file.txt").is_err());
    assert!(validate_artifact_file_name("").is_err());
  }

  #[test]
  fn project_and_artifact_commands_write_the_selected_locations() {
    let root = std::env::temp_dir().join(format!("tominal-desktop-x1-{}", process::id()));
    let project_path = root.join("controller-chassis.tominal.json");
    write_text_file(project_path.to_string_lossy().into_owned(), "{\"formatVersion\":\"1\"}".into()).unwrap();
    assert_eq!(read_text_file(project_path.to_string_lossy().into_owned()).unwrap(), "{\"formatVersion\":\"1\"}");

    let exported = write_artifact_folder(
      root.to_string_lossy().into_owned(),
      "controller-chassis".into(),
      vec![ArtifactFile { file: "tominal.lock.toml".into(), content: "format_version = \"1\"\n".into() }],
    ).unwrap();
    assert_eq!(fs::read_to_string(std::path::Path::new(&exported).join("tominal.lock.toml")).unwrap(), "format_version = \"1\"\n");
    fs::remove_dir_all(root).unwrap();
  }
}
