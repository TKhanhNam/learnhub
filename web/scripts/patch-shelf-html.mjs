import fs from 'node:fs'

const p = 'C:/HDV/learnhub/web/public/landing-pages/complete-shelf-v2.html'
let html = fs.readFileSync(p, 'utf8')

html = html
  .replaceAll(
    'https://cdn.jsdelivr.net/npm/three@0.165.0/build/three.module.js',
    '/vendor/three/build/three.module.js',
  )
  .replaceAll(
    'https://cdn.jsdelivr.net/npm/three@0.165.0/examples/jsm/',
    '/vendor/three/examples/jsm/',
  )
  .replace('powerPreference: "high-performance"', 'powerPreference: "default"')
  .replaceAll(
    'COVER_CROPS[BOOKS.indexOf(book)]',
    'COVER_CROPS[BOOKS.indexOf(book) % COVER_CROPS.length]',
  )

if (!html.includes('__LEARNHUB_SHELF_BOOKS__')) {
  const marker = 'const BOOKS = ['
  const i = html.indexOf(marker)
  if (i < 0) throw new Error('BOOKS missing')
  const inject = `const BOOKS = (typeof window !== "undefined" && window.parent && Array.isArray(window.parent.__LEARNHUB_SHELF_BOOKS__) && window.parent.__LEARNHUB_SHELF_BOOKS__.length)
      ? window.parent.__LEARNHUB_SHELF_BOOKS__
      : [`
  html = html.slice(0, i) + inject + html.slice(i + marker.length)
  const cover = html.indexOf('const COVER_ATLAS_DATA', i)
  const close = html.lastIndexOf('];', cover)
  if (close < 0) throw new Error('BOOKS close missing')
  html = html.slice(0, close) + ']);' + html.slice(close + 2)
}

// LearnHub bridge + softer WebGL messaging
if (!html.includes('learnhubNotify')) {
  const marker = 'window.addEventListener("beforeunload", disposeExperience, { once: true });'
  const bridge = `${marker}
    function learnhubNotify(extra) {
      try {
        if (typeof selectedIndex !== "number" || !BOOKS[selectedIndex]) return;
        const book = BOOKS[selectedIndex];
        parent.postMessage({
          type: "learnhub-shelf-select",
          id: book.id,
          slug: book.slug || book.id,
          title: book.title,
          courseId: book.courseId,
          price: book.price,
          ...extra
        }, "*");
      } catch (_) {}
    }
    setInterval(() => learnhubNotify({}), 500);
    document.getElementById("inspect")?.addEventListener("click", () => learnhubNotify({ openToc: true }));
    canvas?.addEventListener("dblclick", () => learnhubNotify({ openToc: true }));
`
  if (html.includes(marker)) html = html.replace(marker, bridge)
}

fs.writeFileSync(p, html)
console.log({
  parentBooks: html.includes('__LEARNHUB_SHELF_BOOKS__'),
  localThree: html.includes('/vendor/three/build/three.module.js'),
  bridge: html.includes('learnhubNotify'),
  len: html.length,
})
