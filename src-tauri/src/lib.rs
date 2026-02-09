use std::net::TcpStream;
use std::process::{Child, Command, Stdio};
use std::sync::Mutex;
use std::time::{Duration, Instant};
use tauri::path::BaseDirectory;
use tauri::{Manager, WebviewUrl, WebviewWindowBuilder};

struct BackendProcess {
  child: Mutex<Option<Child>>,
}

impl BackendProcess {
  fn new(child: Child) -> Self {
    Self {
      child: Mutex::new(Some(child)),
    }
  }
}

impl Drop for BackendProcess {
  fn drop(&mut self) {
    let Ok(mut guard) = self.child.lock() else {
      return;
    };

    let Some(mut child) = guard.take() else {
      return;
    };

    let _ = child.kill();
    let _ = child.wait();
  }
}

fn wait_for_server(host: &str, port: u16, timeout: Duration) -> bool {
  let deadline = Instant::now() + timeout;
  while Instant::now() < deadline {
    let addr = format!("{host}:{port}");
    if TcpStream::connect(addr).is_ok() {
      return true;
    }
    std::thread::sleep(Duration::from_millis(150));
  }
  false
}

fn start_backend(app: &tauri::AppHandle) -> Result<BackendProcess, Box<dyn std::error::Error>> {
  let dist_main = app
    .path()
    .resolve("dist/main.js", BaseDirectory::Resource)?;

  let dist_dir = dist_main
    .parent()
    .ok_or("dist directory not found")?;

  let resource_root = dist_dir
    .parent()
    .ok_or("resource root not found")?;

  let node_modules = resource_root.join("node_modules");
  let dist_main_arg = dist_main.clone();

  let mut child = Command::new("node")
    .arg(dist_main_arg)
    .arg("--hostname")
    .arg("127.0.0.1")
    .arg("--port")
    .arg("3000")
    .env("NODE_PATH", node_modules)
    .current_dir(resource_root)
    .stdout(Stdio::inherit())
    .stderr(Stdio::inherit())
    .spawn()?;

  if !wait_for_server("127.0.0.1", 3000, Duration::from_secs(10)) {
    let _ = child.kill();
    let _ = child.wait();
    return Err("backend did not start within timeout".into());
  }

  Ok(BackendProcess::new(child))
}

pub fn run() {
  tauri::Builder::default()
    .setup(|app| {
      let is_dev = cfg!(debug_assertions);
      if !is_dev {
        let backend = start_backend(app.handle())?;
        app.manage(backend);
      }

      let url = if is_dev {
        "http://localhost:3400"
      } else {
        "http://127.0.0.1:3000"
      };

      WebviewWindowBuilder::new(app, "main", WebviewUrl::External(url.parse()?))
        .title("Claude Code Viewer")
        .build()?;

      Ok(())
    })
    .run(tauri::generate_context!())
    .expect("error while running tauri application");
}
