export async function uploadToWorker(pngBytes, filename) {
    // 너 Worker 도메인으로 교체
    const WORKER_ORIGIN = "https://worklog-upload.parkappleeee.workers.dev";
  
    const res = await fetch(
      `${WORKER_ORIGIN}/upload?key=${encodeURIComponent(filename)}`,
      {
        method: "POST",
        headers: { "content-type": "image/png" },
        body: pngBytes, // Uint8Array 가능
      }
    );
  
    if (!res.ok) throw new Error(`upload failed: ${res.status}`);
    const data = await res.json();
    return data.publicUrl; // ✅ 이제 이 값은 Worker /file?... 형태
  }
  