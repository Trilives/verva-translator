//! A minimal OpenAI-compatible SSE endpoint for tests.
//!
//! Real translations must never reach a paid provider from a test, but the
//! streaming path is worth exercising for real: request construction, the
//! HTTP/loopback policy, SSE framing and delta extraction all sit between the
//! frontend payload and the text the user sees. This serves that path over
//! loopback HTTP, which `validate_endpoint` permits precisely so local models
//! work.

use std::io::{BufRead, BufReader, Read, Write};
use std::net::{TcpListener, TcpStream};
use std::sync::mpsc::{channel, Receiver};
use std::thread;
use std::time::Duration;

pub(crate) struct MockProvider {
    pub base_url: String,
    requests: Receiver<String>,
    _handle: thread::JoinHandle<()>,
}

impl MockProvider {
    /// Serves one request, streaming `deltas` as SSE events with `gap` between
    /// them so a cancellation has something to interrupt.
    pub fn start(deltas: Vec<String>, gap: Duration) -> Self {
        let listener = TcpListener::bind("127.0.0.1:0").expect("bind loopback");
        let port = listener.local_addr().expect("addr").port();
        let (tx, requests) = channel();

        let handle = thread::spawn(move || {
            let Ok((stream, _)) = listener.accept() else {
                return;
            };
            if let Some(body) = read_request(&stream) {
                let _ = tx.send(body);
            }
            write_sse(stream, &deltas, gap);
        });

        Self {
            base_url: format!("http://127.0.0.1:{port}/v1"),
            requests,
            _handle: handle,
        }
    }

    /// The request body the adapter actually sent, once one has arrived.
    pub fn captured_request(&self) -> String {
        self.requests
            .recv_timeout(Duration::from_secs(5))
            .expect("adapter never sent a request")
    }
}

fn read_request(stream: &TcpStream) -> Option<String> {
    let mut reader = BufReader::new(stream.try_clone().ok()?);
    let mut length = 0usize;
    loop {
        let mut line = String::new();
        if reader.read_line(&mut line).ok()? == 0 {
            return None;
        }
        if line == "\r\n" {
            break;
        }
        if let Some(value) = line.to_ascii_lowercase().strip_prefix("content-length:") {
            length = value.trim().parse().unwrap_or(0);
        }
    }
    let mut body = vec![0u8; length];
    reader.read_exact(&mut body).ok()?;
    String::from_utf8(body).ok()
}

fn write_sse(mut stream: TcpStream, deltas: &[String], gap: Duration) {
    let header = "HTTP/1.1 200 OK\r\nContent-Type: text/event-stream\r\n\
                  Cache-Control: no-cache\r\nConnection: close\r\n\r\n";
    if stream.write_all(header.as_bytes()).is_err() {
        return;
    }
    let _ = stream.flush();

    for delta in deltas {
        let escaped = delta
            .replace('\\', "\\\\")
            .replace('"', "\\\"")
            .replace('\n', "\\n");
        let event =
            format!("data: {{\"choices\":[{{\"delta\":{{\"content\":\"{escaped}\"}}}}]}}\n\n");
        // A write failure means the client hung up, which is what cancellation
        // looks like from here.
        if stream.write_all(event.as_bytes()).is_err() || stream.flush().is_err() {
            return;
        }
        thread::sleep(gap);
    }
    let _ = stream.write_all(b"data: [DONE]\n\n");
    let _ = stream.flush();
}
