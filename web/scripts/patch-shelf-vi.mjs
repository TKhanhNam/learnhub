import fs from 'node:fs'

const p = 'C:/HDV/learnhub/web/public/landing-pages/complete-shelf-v2.html'
let html = fs.readFileSync(p, 'utf8')

// 1) Safe parent books access (never throw during module eval)
html = html.replace(
  /const BOOKS = \(typeof window !== "undefined" && window\.parent && Array\.isArray\(window\.parent\.__LEARNHUB_SHELF_BOOKS__\) && window\.parent\.__LEARNHUB_SHELF_BOOKS__\.length\)\s*\?\s*window\.parent\.__LEARNHUB_SHELF_BOOKS__\s*:\s*\[/,
  `const BOOKS = (() => {
      try {
        const injected = window.parent && window.parent.__LEARNHUB_SHELF_BOOKS__;
        if (Array.isArray(injected) && injected.length) return injected;
      } catch (_) {}
      return [`,
)

// Fix closing: was `]);` for ternary — now need `]; })();`
if (html.includes('seed: 77\n      }\n    ]);')) {
  html = html.replace('seed: 77\n      }\n    ]);', 'seed: 77\n      }\n    ];\n    })();')
} else if (html.includes('    ]);\n\n    const COVER_ATLAS_DATA')) {
  html = html.replace('    ]);\n\n    const COVER_ATLAS_DATA', '    ];\n    })();\n\n    const COVER_ATLAS_DATA')
}

// 2) Don't hang forever on fonts / atlas decode
html = html.replace(
  `async function initialize() {
      const woodTexturePromise = woodTextureImage.decode().then(
        () => true,
        () => false
      );

      try {
        await document.fonts.load("600 82px Inter");
      } catch (error) {
        // The system sans-serif fallback keeps the interface usable offline.
      }

      try {
        await coverAtlasImage.decode();
        coverAtlasReady = true;
      } catch (error) {
        coverAtlasReady = false;
      }`,
  `async function initialize() {
      const withTimeout = (promise, ms) => Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms))
      ]);

      const woodTexturePromise = withTimeout(woodTextureImage.decode(), 2500).then(
        () => true,
        () => false
      );

      try {
        await withTimeout(document.fonts.load("600 82px Inter"), 2000);
      } catch (error) {
        // The system sans-serif fallback keeps the interface usable offline.
      }

      try {
        await withTimeout(coverAtlasImage.decode(), 4000);
        coverAtlasReady = true;
      } catch (error) {
        coverAtlasReady = false;
      }`,
)

// 3) Vietnamese UI chrome
const vi = [
  ['<title>Working Volumes — Seven Tools for Making</title>', '<title>Thư viện LearnHub — Kệ sách khóa học</title>'],
  ['aria-label="Collection"', 'aria-label="Bộ sưu tập"'],
  ['<strong>Working Volumes</strong>', '<strong>Thư viện LearnHub</strong>'],
  ['<span>Seven field guides for making</span>', '<span>Mỗi khóa học là một quyển sách</span>'],
  ['<span>Edition 02 · 2026</span>', '<span>Ấn bản LearnHub · 2026</span>'],
  ['>Volume 01</span>', '>Tập 01</span>'],
  ['>Open</button>', '>Xem mục lục</button>'],
  ['>Close</button>', '>Đóng</button>'],
  ['<dt>Binding</dt>', '<dt>Bìa</dt>'],
  ['<dt>Format</dt>', '<dt>Định dạng</dt>'],
  ['<dt>Theme</dt>', '<dt>Chủ đề</dt>'],
  ['<dt>Motif</dt>', '<dt>Họa tiết</dt>'],
  ['>Closed</strong>', '>Đã đóng</strong>'],
  ['>Open book</button>', '>Mở sách</button>'],
  ['>Reset view</button>', '>Đặt lại góc nhìn</button>'],
  ['>Working Volumes · Static catalog</p>', '>Thư viện LearnHub · Bản tĩnh</p>'],
  ['>Seven tools for making.</h2>', '>Mỗi khóa học là một quyển sách.</h2>'],
  ['The complete catalog remains readable while the interactive shelf is prepared.', 'Danh mục vẫn đọc được trong khi kệ sách tương tác đang được chuẩn bị.'],
  ['All bindings, motifs, descriptions, geometry, and cover artworks are original to this conceptual study.', 'Kệ sách 3D LearnHub — mỗi quyển tương ứng một khóa học trong hệ thống.'],
  ['Product names are used editorially and remain the property of their respective owners.', 'Vuốt để chọn · bấm «Xem mục lục» hoặc bấm đúp để đăng ký khóa học.'],
  ['<p>Binding the collection</p>', '<p>Đang xếp giá sách…</p>'],
  ['WebGL is unavailable in this browser. The complete static catalog remains available.', 'Trình duyệt không hỗ trợ WebGL. Đang hiện danh mục tĩnh.'],
  ['The interactive shelf could not be prepared. The complete static catalog remains available.', 'Không khởi tạo được kệ 3D. Đang hiện danh mục tĩnh.'],
  ['The 3D view paused after losing its graphics context. The complete static catalog remains available; reload to restore inspection.', 'Mất ngữ cảnh đồ họa 3D. Tải lại trang để khôi phục.'],
  ['The interactive shelf could not be prepared. The complete static catalog remains available.', 'Không chuẩn bị được kệ tương tác. Danh mục tĩnh vẫn dùng được.'],
]

for (const [from, to] of vi) {
  if (html.includes(from)) html = html.replaceAll(from, to)
}

// Dynamic JS strings that update Volume / Closed / Open book labels
html = html.replaceAll('`Volume ${', '`Tập ${')
html = html.replaceAll("'Volume '", "'Tập '")
html = html.replaceAll('"Volume "', '"Tập "')
html = html.replaceAll('textContent = "Closed"', 'textContent = "Đã đóng"')
html = html.replaceAll("textContent = 'Closed'", "textContent = 'Đã đóng'")
html = html.replaceAll('textContent = "Open book"', 'textContent = "Mở sách"')
html = html.replaceAll('textContent = "Close book"', 'textContent = "Đóng sách"')
html = html.replaceAll('>Previous</', '>Trước</')
html = html.replaceAll('>Next</', '>Sau</')
html = html.replaceAll('aria-label="Previous"', 'aria-label="Trước"')
html = html.replaceAll('aria-label="Next"', 'aria-label="Sau"')

// Show loading error if init hangs past 12s
if (!html.includes('learnhub-loading-watchdog')) {
  html = html.replace(
    'initialize().catch(() => {\n      showFallback("Không khởi tạo được kệ 3D. Đang hiện danh mục tĩnh.");\n    });',
    `const learnhubLoadingWatchdog = setTimeout(() => {
      if (!loading.hidden) {
        showFallback("Kệ 3D khởi động quá lâu. Đang hiện danh mục tĩnh — thử Chrome/Edge.");
      }
    }, 12000);
    initialize().then(() => clearTimeout(learnhubLoadingWatchdog)).catch(() => {
      clearTimeout(learnhubLoadingWatchdog);
      showFallback("Không khởi tạo được kệ 3D. Đang hiện danh mục tĩnh.");
    });
    // learnhub-loading-watchdog`,
  )
  // fallback if Vietnamese message not yet in catch
  if (!html.includes('learnhub-loading-watchdog')) {
    html = html.replace(
      'initialize().catch(() => {\n      showFallback("The interactive shelf could not be prepared. The complete static catalog remains available.");\n    });',
      `const learnhubLoadingWatchdog = setTimeout(() => {
      if (!loading.hidden) {
        showFallback("Kệ 3D khởi động quá lâu. Đang hiện danh mục tĩnh — thử Chrome/Edge.");
      }
    }, 12000);
    initialize().then(() => clearTimeout(learnhubLoadingWatchdog)).catch(() => {
      clearTimeout(learnhubLoadingWatchdog);
      showFallback("Không khởi tạo được kệ 3D. Đang hiện danh mục tĩnh.");
    });
    // learnhub-loading-watchdog`,
    )
  }
}

fs.writeFileSync(p, html)
console.log({
  booksIIFE: html.includes('return [') && html.includes('})();'),
  timeout: html.includes('withTimeout'),
  viLoading: html.includes('Đang xếp giá sách'),
  watchdog: html.includes('learnhub-loading-watchdog'),
})
