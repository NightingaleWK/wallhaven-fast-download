const fs = require('fs');
const path = require('path');
const assert = require('assert');

const source = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');

assert(
    source.includes('const successfulDownloadCache = new Map();'),
    'only successful preview/download URL resolution should be cached by wallpaper id'
);

assert(
    /function getDirectDownloadCandidates\(/.test(source)
        && /const extensions = \[preferredExtension, 'jpg', 'png', 'webp'\]/.test(source),
    'original image resolution should try deterministic CDN candidates before network metadata requests'
);

assert(
    /function requestWallpaperDetail\(/.test(source)
        && /url: `https:\/\/wallhaven\.cc\/w\/\$\{encodeURIComponent\(wallpaperId\)\}`/.test(source)
        && /detailDocument\.querySelector\('#wallpaper\[src\]'\)/.test(source),
    'failed direct candidates should fall back to the same original URL exposed by the detail page'
);

assert(
    /timeout: 8000/.test(source)
        && /ontimeout:/.test(source)
        && /requestWallpaperDetail\(wallpaperId, previewTask\)/.test(source)
        && /previewTask\.addCleanup/.test(source),
    'detail fallback should time out and be canceled with the active preview task'
);

assert(
    source.includes('// @noframes')
        && /if \(!isGridListingPage\(\)\) \{\s*return;\s*\}/.test(source),
    'the userscript should not initialize observers inside frames or non-listing pages'
);

assert(
    /cacheLimit: 120/.test(source)
        && /while \(cache\.size > CONFIG\.cacheLimit\)/.test(source),
    'page-lifetime caches should have a bounded LRU size'
);

assert(
    !source.includes('/api/v1/w/'),
    'hover preview should not consume the rate-limited wallpaper API'
);

assert(
    /function getThumbnailPreview\(/.test(source),
    'preview should have a helper for immediate thumbnail-based rendering'
);

assert(
    /showCardPreview[\s\S]*getThumbnailPreview[\s\S]*loadPreviewImage\(popover, thumbnailPreview\.url/.test(source),
    'hover preview should render the existing thumbnail before waiting for original image resolution'
);

assert(
    /loadPreviewBlob\(popover, download\.url, \{[^}]*preserveExisting: true[^}]*\}/.test(source),
    'full-resolution preview should replace the thumbnail without clearing the existing preview first'
);

assert(
    /responseType: 'blob'/.test(source)
        && /onprogress: \(event\)/.test(source)
        && /setPreviewTransferProgress\(/.test(source),
    'full-resolution preview should expose real byte transfer progress'
);

assert(
    /event\.loaded/.test(source)
        && /event\.total/.test(source)
        && /event\.lengthComputable/.test(source)
        && /now - lastUpdate < 100/.test(source),
    'preview progress should support both known and unknown response sizes'
);

assert(
    /URL\.createObjectURL\(blob\)/.test(source)
        && /URL\.revokeObjectURL\(objectUrl\)/.test(source)
        && /let revoked = false/.test(source),
    'preview Blob URLs should be released after image decoding'
);

assert(
    /function createPreviewTask\(/.test(source)
        && /previewTask\.dispose\(\)/.test(source)
        && /cleanups\.clear\(\)/.test(source),
    'leaving a card should dispose every resource owned by its preview task'
);

assert(
    /previewDecodeTimeout: 15000/.test(source)
        && /预览图片解码超时/.test(source)
        && /image\.removeAttribute\('src'\)/.test(source),
    'Blob image decoding should have a timeout and an active cancellation path'
);

assert(
    /downloadTimeout: 120000/.test(source)
        && /timeout: CONFIG\.downloadTimeout/.test(source)
        && /ontimeout: \(\) => finish\(reject, new Error\('下载超时'\)\)/.test(source)
        && /onabort: \(\) => finish\(reject, new Error\('下载已取消'\)\)/.test(source),
    'downloads should always leave the loading state after timeout or cancellation'
);

assert(
    /new MutationObserver\(\(mutations\)/.test(source)
        && /mutation\.addedNodes/.test(source)
        && /if \(!hasNewCard\) \{\s*return;/.test(source),
    'progress DOM updates should not trigger repeated full-card scans'
);

assert(
    /window\.addEventListener\('pagehide'/.test(source)
        && /observer\.disconnect\(\)/.test(source)
        && /successfulDownloadCache\.clear\(\)/.test(source),
    'page teardown should disconnect observers and clear retained cache state'
);

assert(
    source.includes('whfd-preview-badge'),
    'thumbnail preview should show a lightweight badge while the original image is loading'
);

assert(
    source.includes('whfd-preview-meta'),
    'preview should include a footer area for wallpaper metadata such as resolution'
);

assert(
    source.includes('whfd-preview-progress')
        && source.includes('whfd-preview-spinner'),
    'preview should include a loading progress area with a spinner'
);

assert(
    /function getPreviewMetaText\(/.test(source),
    'preview should extract resolution metadata from the hovered card'
);

assert(
    /card\.querySelector\('\.wall-res'\)/.test(source),
    'preview metadata should prefer Wallhaven card resolution text from .wall-res'
);

assert(
    /loadPreviewImage\(popover, thumbnailPreview\.url, \{[^}]*metaText: previewMetaText[^}]*\}\)/.test(source)
        && /loadPreviewBlob\(popover, download\.url, \{[^}]*metaText: previewMetaText[^}]*\}/.test(source)
        && /appendPreviewMeta\(popover, options\.metaText\)/.test(source),
    'preview should append extracted metadata below both thumbnail and full-resolution preview images'
);

assert(
    /function setPreviewProgress\(/.test(source)
        && /function clearPreviewProgress\(/.test(source),
    'preview should have helpers for updating and clearing loading progress'
);

assert(
    /setPreviewProgress\(popover, '加载原图中\.\.\.'\)/.test(source)
        && /正在从详情页获取原图地址/.test(source)
        && /加载较慢，仍在尝试/.test(source),
    'preview should show direct loading, detail fallback, and slow-loading states'
);

assert(
    /setPreviewBadge\(popover, '缩略图 · 加载原图\.\.\.'\)/.test(source),
    'thumbnail preview badge should explain that the original image is still loading'
);

assert(
    /clearPreviewBadge\(popover\)/.test(source),
    'preview badge should be removed after the full-resolution image is ready'
);

assert(
    /function setDownloadButtonState\(button, state\)/.test(source),
    'download button should have a state helper for lightweight loading and success feedback'
);

assert(
    /setDownloadButtonState\(button, 'loading'\)/.test(source),
    'clicking download should show a lightweight loading state'
);

assert(
    /setDownloadButtonState\(button, 'success'\)/.test(source),
    'successful download should briefly show a success check mark'
);

assert(
    /setTimeout\(\(\) => \{\s*if \(button\.dataset\.whfdState === 'success'\) \{\s*setDownloadButtonState\(button, 'idle'\)/.test(source),
    'successful download should reset to idle so users can download again'
);

assert(
    source.includes('.whfd-tool-group.is-download-active'),
    'download tool group should stay visible while download feedback is active'
);

assert(
    /if \(button\.parentElement\) \{\s*button\.parentElement\.classList\.toggle\('is-download-active', state === 'loading' \|\| state === 'success'\)/.test(source),
    'download active state should be scoped to the existing tool group'
);
