const fs = require('fs');
const path = require('path');
const assert = require('assert');

const source = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');

assert(
    source.includes('const downloadInfoCache = new Map();'),
    'preview/download URL resolution should be cached by wallpaper id'
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
    /loadPreviewImage\(popover, preview\.url, \{ preserveExisting: true \}\)/.test(source),
    'full-resolution preview should replace the thumbnail without clearing the existing preview first'
);

assert(
    source.includes('whfd-preview-badge'),
    'thumbnail preview should show a lightweight badge while the original image is loading'
);

assert(
    /setPreviewBadge\(popover, '缩略图 · 加载原图\.\.\.'\)/.test(source),
    'thumbnail preview badge should explain that the original image is still loading'
);

assert(
    /clearPreviewBadge\(popover\)/.test(source),
    'preview badge should be removed after the full-resolution image is ready'
);
