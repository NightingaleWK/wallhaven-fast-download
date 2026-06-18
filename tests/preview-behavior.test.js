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
    /loadPreviewImage\(popover, preview\.url, \{[^}]*preserveExisting: true[^}]*\}\)/.test(source),
    'full-resolution preview should replace the thumbnail without clearing the existing preview first'
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
    /loadPreviewImage\(popover, thumbnailPreview\.url, \{ metaText: previewMetaText \}\)/.test(source)
        && /loadPreviewImage\(popover, preview\.url, \{[^}]*metaText: previewMetaText[^}]*\}\)/.test(source)
        && /appendPreviewMeta\(popover, options\.metaText\)/.test(source),
    'preview should append extracted metadata below both thumbnail and full-resolution preview images'
);

assert(
    /function setPreviewProgress\(/.test(source)
        && /function clearPreviewProgress\(/.test(source),
    'preview should have helpers for updating and clearing loading progress'
);

assert(
    /setPreviewProgress\(popover, '解析原图地址\.\.\.'\)/.test(source)
        && /setPreviewProgress\(popover, '加载原图中\.\.\.'\)/.test(source)
        && /加载较慢，仍在尝试/.test(source),
    'preview should show address resolution, image loading, and slow-loading states'
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
