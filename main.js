// ==UserScript==
// @name                Wallhaven Fast Download
// @name:zh-CN          Wallhaven 快速下载
// @name:en             Wallhaven Fast Download
// @description         在 Wallhaven 网格浏览页悬停图片时显示原图下载按钮和自动预览，下载后自动标记为已看
// @description:zh-CN   在 Wallhaven 网格浏览页悬停图片时显示下载按钮并自动预览原图，下载后后台标记已看，避免重复下载
// @description:en      Adds download button and auto-preview on hover to Wallhaven grid pages. Marks wallpapers as seen after download to prevent duplicates.
// @author              NightingaleWK
// @namespace           https://github.com/NightingaleWK
// @homepageURL         https://github.com/NightingaleWK/wallhaven-fast-download
// @supportURL          https://github.com/NightingaleWK/wallhaven-fast-download/issues
// @license             MIT
// @match               https://wallhaven.cc/*
// @grant               GM_download
// @grant               GM_xmlhttpRequest
// @connect             wallhaven.cc
// @connect             w.wallhaven.cc
// @run-at              document-end
// @version             1.4.0
// ==/UserScript==

(function () {
    'use strict';

    const CONFIG = {
        listingSelector: '.thumb-listing-page',
        cardSelector: '.thumb-listing-page figure[data-wallpaper-id]',
        figureSelector: 'figure[data-wallpaper-id]',
        injectedAttr: 'data-whfd-injected',
        toolGroupClass: 'whfd-tool-group',
        buttonClass: 'whfd-download-button',
        toastId: 'whfd-toast',
        previewDelay: 50,
    };

    const STYLE_ID = 'whfd-style';
    const successfulDownloadCache = new Map();
    const detailInfoCache = new Map();
    let currentPreview = null;
    let previewTimeout = null;
    let hoveredCard = null;

    function injectStyles() {
        if (document.getElementById(STYLE_ID)) {
            return;
        }

        const style = document.createElement('style');
        style.id = STYLE_ID;
        style.textContent = `
            .whfd-card-target {
                position: relative;
            }

            .whfd-tool-group {
                position: absolute;
                top: 8px;
                left: 8px;
                z-index: 130;
                display: inline-flex;
                gap: 6px;
                opacity: 0;
                pointer-events: none;
                transform: translateY(-2px);
                transition: opacity 0.15s ease, transform 0.15s ease;
            }

            .whfd-download-button {
                display: inline-flex;
                align-items: center;
                justify-content: center;
                width: 30px;
                height: 30px;
                padding: 0;
                border: 1px solid rgba(255, 255, 255, 0.18);
                border-radius: 4px;
                background: rgba(17, 17, 17, 0.72);
                color: #fff;
                cursor: pointer;
                transition: background-color 0.15s ease, border-color 0.15s ease;
                font: inherit;
                font-size: 15px;
                line-height: 1;
                box-shadow: 0 2px 8px rgba(0, 0, 0, 0.35);
            }

            .thumb:hover > .whfd-tool-group,
            .thumb:focus > .whfd-tool-group,
            .thumb:focus-within > .whfd-tool-group,
            .whfd-tool-group:focus-within,
            .whfd-tool-group.is-download-active {
                opacity: 1;
                pointer-events: auto;
                transform: translateY(0);
            }

            .whfd-download-button:hover,
            .whfd-download-button:focus-visible {
                background: rgba(17, 17, 17, 0.92);
                border-color: rgba(255, 255, 255, 0.34);
                outline: none;
            }

            .whfd-download-button:disabled {
                cursor: wait;
                opacity: 0.68;
            }

            .whfd-download-button.is-loading {
                cursor: wait;
            }

            .whfd-download-button.is-success {
                background: rgba(35, 115, 65, 0.86);
                border-color: rgba(178, 255, 201, 0.42);
            }

            .whfd-preview-popover {
                position: absolute;
                top: 44px;
                left: 50%;
                z-index: 140;
                display: block;
                min-height: 72px;
                border: 1px solid rgba(255, 255, 255, 0.22);
                border-radius: 6px;
                background: rgba(10, 10, 10, 0.92);
                box-shadow: 0 8px 24px rgba(0, 0, 0, 0.46);
                color: #fff;
                transform: translateX(-50%);
                overflow: hidden;
            }

            .whfd-preview-popover img {
                position: static;
                display: block;
                width: 100%;
                height: auto;
                max-width: none;
                max-height: none;
            }

            .whfd-preview-meta {
                box-sizing: border-box;
                width: 100%;
                padding: 6px 8px;
                border-top: 1px solid rgba(255, 255, 255, 0.12);
                background: rgba(10, 10, 10, 0.92);
                color: rgba(255, 255, 255, 0.88);
                font-size: 12px;
                line-height: 1.35;
                text-align: center;
                white-space: nowrap;
            }

            .whfd-preview-progress {
                display: flex;
                align-items: center;
                justify-content: center;
                gap: 6px;
                box-sizing: border-box;
                width: 100%;
                padding: 7px 8px;
                border-top: 1px solid rgba(255, 255, 255, 0.1);
                background: rgba(10, 10, 10, 0.92);
                color: rgba(255, 255, 255, 0.82);
                font-size: 12px;
                line-height: 1.35;
                text-align: center;
            }

            .whfd-preview-spinner {
                flex: 0 0 auto;
                width: 12px;
                height: 12px;
                box-sizing: border-box;
                border: 2px solid rgba(255, 255, 255, 0.28);
                border-top-color: rgba(255, 255, 255, 0.9);
                border-radius: 50%;
                animation: whfd-spin 0.8s linear infinite;
            }

            @keyframes whfd-spin {
                to {
                    transform: rotate(360deg);
                }
            }

            .whfd-preview-status {
                box-sizing: border-box;
                width: 100%;
                padding: 12px;
                text-align: center;
                font-size: 13px;
                line-height: 1.4;
                color: rgba(255, 255, 255, 0.86);
            }

            .whfd-preview-badge {
                position: absolute;
                top: 6px;
                left: 6px;
                z-index: 1;
                max-width: calc(100% - 12px);
                box-sizing: border-box;
                padding: 3px 6px;
                border-radius: 4px;
                background: rgba(12, 12, 12, 0.62);
                color: rgba(255, 255, 255, 0.88);
                font-size: 11px;
                line-height: 1.35;
                pointer-events: none;
                white-space: nowrap;
            }

            .whfd-preview-popover.is-error {
                border-color: rgba(255, 111, 111, 0.42);
                background: rgba(88, 20, 20, 0.94);
            }

            #${CONFIG.toastId} {
                position: fixed;
                right: 16px;
                bottom: 16px;
                z-index: 99999;
                max-width: min(360px, calc(100vw - 32px));
                padding: 10px 12px;
                border-radius: 6px;
                background: rgba(20, 20, 20, 0.92);
                color: #fff;
                font-size: 13px;
                line-height: 1.4;
                opacity: 0;
                transform: translateY(8px);
                pointer-events: none;
                transition: opacity 0.18s ease, transform 0.18s ease;
                white-space: normal;
                word-break: break-word;
            }

            #${CONFIG.toastId}.is-visible {
                opacity: 1;
                transform: translateY(0);
            }

            #${CONFIG.toastId}.is-error {
                background: rgba(132, 25, 25, 0.94);
            }
        `;
        document.head.appendChild(style);
    }

    function ensureToast() {
        let toast = document.getElementById(CONFIG.toastId);
        if (!toast) {
            toast = document.createElement('div');
            toast.id = CONFIG.toastId;
            document.body.appendChild(toast);
        }
        return toast;
    }

    function showToast(message, isError = false) {
        const toast = ensureToast();
        toast.classList.toggle('is-error', Boolean(isError));
        toast.textContent = message;
        toast.classList.add('is-visible');

        clearTimeout(showToast.timer);
        showToast.timer = setTimeout(() => {
            toast.classList.remove('is-visible');
            toast.classList.remove('is-error');
        }, 2400);
    }

    function isGridListingPage() {
        if (/^\/w\/[^/]+/.test(location.pathname)) {
            return false;
        }
        return Boolean(document.querySelector(CONFIG.listingSelector));
    }

    function getWallpaperId(card) {
        const figure = getCardFigure(card);
        return figure && figure.dataset ? figure.dataset.wallpaperId || '' : '';
    }

    function getCardFigure(card) {
        if (card.matches && card.matches(CONFIG.figureSelector)) {
            return card;
        }

        return card.querySelector(CONFIG.figureSelector);
    }

    function findDirectChildByClass(parent, className) {
        return Array.from(parent.children).find((child) => child.classList.contains(className)) || null;
    }

    function getFileExtension(card) {
        if (card.querySelector('span.png')) {
            return 'png';
        }
        if (card.querySelector('span.webp')) {
            return 'webp';
        }
        return 'jpg';
    }

    function buildDirectDownload(wallpaperId, extension) {
        const prefix = wallpaperId.slice(0, 2);
        return {
            url: `https://w.wallhaven.cc/full/${prefix}/wallhaven-${wallpaperId}.${extension}`,
            name: `wallhaven-${wallpaperId}.${extension}`,
        };
    }

    function getDirectDownloadCandidates(card, wallpaperId) {
        const preferredExtension = getFileExtension(card);
        const extensions = [preferredExtension, 'jpg', 'png', 'webp'];

        return [...new Set(extensions)].map((extension) => buildDirectDownload(wallpaperId, extension));
    }

    function requestWallpaperDetail(wallpaperId) {
        return new Promise((resolve, reject) => {
            const xhr = typeof GM_xmlhttpRequest === 'function' ? GM_xmlhttpRequest : null;
            if (!xhr) {
                reject(new Error('GM_xmlhttpRequest is unavailable'));
                return;
            }

            xhr({
                method: 'GET',
                url: `https://wallhaven.cc/w/${encodeURIComponent(wallpaperId)}`,
                responseType: 'text',
                timeout: 8000,
                onload: (response) => {
                    if (response.status < 200 || response.status >= 300) {
                        reject(new Error(`详情页请求失败（${response.status}）`));
                        return;
                    }

                    try {
                        const documentText = response.responseText || response.response || '';
                        const detailDocument = new DOMParser().parseFromString(documentText, 'text/html');
                        const wallpaper = detailDocument.querySelector('#wallpaper[src]');
                        if (!wallpaper) {
                            reject(new Error('详情页中未找到原图地址'));
                            return;
                        }

                        const downloadUrl = new URL(wallpaper.getAttribute('src'), location.origin);
                        if (downloadUrl.hostname !== 'w.wallhaven.cc') {
                            reject(new Error('详情页返回了非预期的原图地址'));
                            return;
                        }
                        const fileName = decodeURIComponent(downloadUrl.pathname.split('/').pop() || `wallhaven-${wallpaperId}`);

                        resolve({
                            url: downloadUrl.href,
                            name: fileName,
                        });
                    } catch (error) {
                        reject(error);
                    }
                },
                onerror: () => {
                    reject(new Error('详情页请求失败'));
                },
                ontimeout: () => {
                    reject(new Error('详情页请求超时'));
                },
                onabort: () => {
                    reject(new Error('详情页请求已取消'));
                },
            });
        });
    }

    function fetchWallpaperDetail(wallpaperId) {
        if (detailInfoCache.has(wallpaperId)) {
            return detailInfoCache.get(wallpaperId);
        }

        const detailInfo = requestWallpaperDetail(wallpaperId)
            .catch((error) => {
                detailInfoCache.delete(wallpaperId);
                throw error;
            });
        detailInfoCache.set(wallpaperId, detailInfo);
        return detailInfo;
    }

    function getDownloadCandidates(card, wallpaperId) {
        const directCandidates = getDirectDownloadCandidates(card, wallpaperId);
        const cachedDownload = successfulDownloadCache.get(wallpaperId);
        if (!cachedDownload) {
            return directCandidates;
        }

        return [
            cachedDownload,
            ...directCandidates.filter((download) => download.url !== cachedDownload.url),
        ];
    }

    function downloadFile(url, name) {
        if (typeof GM_download !== 'function') {
            return Promise.reject(new Error('GM_download is unavailable'));
        }

        return new Promise((resolve, reject) => {
            GM_download({
                url,
                name,
                saveAs: false,
                onload: () => resolve(),
                onerror: (error) => {
                    const message = error && (error.error || error.message) ? (error.error || error.message) : 'Download failed';
                    reject(new Error(message));
                },
            });
        });
    }

    async function handleDownload(card, button) {
        const wallpaperId = getWallpaperId(card);
        if (!wallpaperId) {
            showToast('无法识别当前卡片的 Wallpaper ID', true);
            return;
        }

        setDownloadButtonState(button, 'loading');
        try {
            let completedDownload = null;
            const candidates = getDownloadCandidates(card, wallpaperId);

            for (const download of candidates) {
                try {
                    await downloadFile(download.url, download.name);
                    completedDownload = download;
                    break;
                } catch { }
            }

            if (!completedDownload) {
                const detailDownload = await fetchWallpaperDetail(wallpaperId);
                await downloadFile(detailDownload.url, detailDownload.name);
                completedDownload = detailDownload;
            }

            successfulDownloadCache.set(wallpaperId, completedDownload);
            triggerSeenTracking(wallpaperId);
            setDownloadButtonState(button, 'success');
            setTimeout(() => {
                if (button.dataset.whfdState === 'success') {
                    setDownloadButtonState(button, 'idle');
                }
            }, 1200);
        } catch (error) {
            successfulDownloadCache.delete(wallpaperId);
            showToast(`下载失败：${error.message}`, true);
            setDownloadButtonState(button, 'idle');
        }
    }

    function triggerSeenTracking(wallpaperId) {
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:1px;height:1px;';
        iframe.src = `https://wallhaven.cc/w/${encodeURIComponent(wallpaperId)}`;
        document.body.appendChild(iframe);

        setTimeout(() => {
            if (iframe.parentNode) {
                iframe.remove();
            }
        }, 5000);
    }

    function stopCardClick(event) {
        event.preventDefault();
        event.stopPropagation();
    }

    function closeCurrentPreview() {
        if (!currentPreview) {
            return;
        }

        currentPreview.popover.remove();
        currentPreview = null;
    }

    function getPreviewWidth(card, figure) {
        const thumbnail = figure.querySelector('img') || card.querySelector('img');
        const source = thumbnail || figure;
        const width = source.getBoundingClientRect().width || figure.getBoundingClientRect().width;

        return Math.max(120, Math.round(width * 1.2));
    }

    function getThumbnailPreview(card, figure) {
        const thumbnail = figure.querySelector('img') || card.querySelector('img');
        if (!thumbnail) {
            return null;
        }

        const url = thumbnail.currentSrc || thumbnail.src || thumbnail.dataset.src || thumbnail.dataset.original;
        if (!url) {
            return null;
        }

        return {
            url,
        };
    }

    function getPreviewMetaText(card) {
        const wallResolution = card.querySelector('.wall-res');
        const text = wallResolution ? wallResolution.textContent || '' : card.textContent || '';
        const resolution = text.match(/\b\d{3,5}\s*x\s*\d{3,5}\b/i);
        return resolution ? resolution[0].replace(/\s*x\s*/i, ' x ') : '';
    }

    function buildPreviewPopover(card, figure) {
        const popover = document.createElement('div');
        popover.className = 'whfd-preview-popover';
        popover.style.width = `${getPreviewWidth(card, figure)}px`;

        const status = document.createElement('div');
        status.className = 'whfd-preview-status';
        status.textContent = '预览加载中...';
        popover.appendChild(status);

        return popover;
    }

    function appendPreviewMeta(popover, text) {
        if (!text) {
            return;
        }

        const meta = document.createElement('div');
        meta.className = 'whfd-preview-meta';
        meta.textContent = text;
        popover.appendChild(meta);
    }

    function setPreviewProgress(popover, message) {
        let progress = findDirectChildByClass(popover, 'whfd-preview-progress');
        if (!progress) {
            progress = document.createElement('div');
            progress.className = 'whfd-preview-progress';

            const spinner = document.createElement('span');
            spinner.className = 'whfd-preview-spinner';
            spinner.setAttribute('aria-hidden', 'true');
            progress.appendChild(spinner);

            const text = document.createElement('span');
            text.className = 'whfd-preview-progress-text';
            progress.appendChild(text);

            popover.appendChild(progress);
        }

        const text = findDirectChildByClass(progress, 'whfd-preview-progress-text');
        if (text) {
            text.textContent = message;
        }
    }

    function clearPreviewProgress(popover) {
        const progress = findDirectChildByClass(popover, 'whfd-preview-progress');
        if (progress) {
            progress.remove();
        }
    }

    function showPreviewError(popover, message) {
        popover.classList.add('is-error');
        popover.replaceChildren();

        const status = document.createElement('div');
        status.className = 'whfd-preview-status';
        status.textContent = message;
        popover.appendChild(status);
    }

    function setPreviewBadge(popover, message) {
        let badge = findDirectChildByClass(popover, 'whfd-preview-badge');
        if (!badge) {
            badge = document.createElement('div');
            badge.className = 'whfd-preview-badge';
            popover.appendChild(badge);
        }
        badge.textContent = message;
    }

    function clearPreviewBadge(popover) {
        const badge = findDirectChildByClass(popover, 'whfd-preview-badge');
        if (badge) {
            badge.remove();
        }
    }

    function loadPreviewImage(popover, url, options = {}) {
        return new Promise((resolve, reject) => {
            const image = document.createElement('img');
            image.alt = '快速预览';
            image.decoding = 'async';

            image.addEventListener('load', () => {
                if (options.preserveExisting) {
                    popover.replaceChildren(image);
                    appendPreviewMeta(popover, options.metaText);
                }
                resolve();
            }, { once: true });

            image.addEventListener('error', () => {
                reject(new Error('预览图片加载失败'));
            }, { once: true });

            if (!options.preserveExisting) {
                popover.replaceChildren(image);
                appendPreviewMeta(popover, options.metaText);
            }
            image.src = url;
        });
    }

    function isCurrentPreview(card, popover) {
        return Boolean(
            currentPreview
            && currentPreview.card === card
            && currentPreview.popover === popover
        );
    }

    async function loadOriginalPreview(card, wallpaperId, popover, previewMetaText) {
        const candidates = getDownloadCandidates(card, wallpaperId);

        for (const download of candidates) {
            if (!isCurrentPreview(card, popover)) {
                return null;
            }

            try {
                await loadPreviewImage(popover, download.url, {
                    preserveExisting: true,
                    metaText: previewMetaText,
                });
                successfulDownloadCache.set(wallpaperId, download);
                return download;
            } catch { }
        }

        if (!isCurrentPreview(card, popover)) {
            return null;
        }

        setPreviewProgress(popover, '正在从详情页获取原图地址...');
        try {
            const detailDownload = await fetchWallpaperDetail(wallpaperId);
            if (!isCurrentPreview(card, popover)) {
                return null;
            }

            setPreviewProgress(popover, '加载详情页原图中...');
            await loadPreviewImage(popover, detailDownload.url, {
                preserveExisting: true,
                metaText: previewMetaText,
            });
            successfulDownloadCache.set(wallpaperId, detailDownload);
            return detailDownload;
        } catch (error) {
            successfulDownloadCache.delete(wallpaperId);
            throw error;
        }
    }

    async function showCardPreview(card) {
        const wallpaperId = getWallpaperId(card);
        if (!wallpaperId) {
            return;
        }

        const figure = getCardFigure(card);
        if (!figure) {
            return;
        }

        closeCurrentPreview();

        const popover = buildPreviewPopover(card, figure);
        figure.appendChild(popover);
        const previewMetaText = getPreviewMetaText(card);
        currentPreview = {
            card,
            popover,
        };

        const thumbnailPreview = getThumbnailPreview(card, figure);
        if (thumbnailPreview) {
            loadPreviewImage(popover, thumbnailPreview.url, { metaText: previewMetaText }).catch(() => { });
            setPreviewBadge(popover, '缩略图 · 加载原图...');
        }

        setPreviewProgress(popover, '加载原图中...');
        const slowTimer = setTimeout(() => {
            if (isCurrentPreview(card, popover)) {
                setPreviewProgress(popover, '加载较慢，仍在尝试...');
            }
        }, 3000);

        try {
            const preview = await loadOriginalPreview(card, wallpaperId, popover, previewMetaText);
            if (preview && isCurrentPreview(card, popover)) {
                clearPreviewBadge(popover);
                clearPreviewProgress(popover);
            }
        } catch (error) {
            if (isCurrentPreview(card, popover)) {
                showPreviewError(popover, error.message || '预览加载失败');
            }
        } finally {
            clearTimeout(slowTimer);
        }
    }

    function bindHoverPreview(card, figure) {
        figure.addEventListener('mouseenter', () => {
            hoveredCard = card;
            clearTimeout(previewTimeout);

            if (currentPreview && currentPreview.card === card) {
                return;
            }

            closeCurrentPreview();

            previewTimeout = setTimeout(() => {
                if (hoveredCard === card) {
                    showCardPreview(card);
                }
            }, CONFIG.previewDelay);
        });

        figure.addEventListener('mouseleave', () => {
            clearTimeout(previewTimeout);
            if (hoveredCard === card) {
                hoveredCard = null;
            }
            if (currentPreview && currentPreview.card === card) {
                closeCurrentPreview();
            }
        });
    }

    function buildDownloadButton(card) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = CONFIG.buttonClass;
        setDownloadButtonState(button, 'idle');

        button.addEventListener('click', (event) => {
            stopCardClick(event);
            handleDownload(card, button);
        });

        return button;
    }

    function setDownloadButtonState(button, state) {
        button.dataset.whfdState = state;
        button.classList.toggle('is-loading', state === 'loading');
        button.classList.toggle('is-success', state === 'success');
        if (button.parentElement) {
            button.parentElement.classList.toggle('is-download-active', state === 'loading' || state === 'success');
        }

        if (state === 'loading') {
            button.disabled = true;
            button.textContent = '…';
            button.title = '正在请求并下载原图';
            button.setAttribute('aria-label', '正在请求并下载原图');
            return;
        }

        if (state === 'success') {
            button.disabled = false;
            button.textContent = '✓';
            button.title = '下载成功，可再次点击下载';
            button.setAttribute('aria-label', '下载成功，可再次点击下载');
            return;
        }

        button.disabled = false;
        button.textContent = '↓';
        button.title = '快速下载原图';
        button.setAttribute('aria-label', '快速下载原图');
    }

    function buildToolGroup(card) {
        const group = document.createElement('div');
        group.className = CONFIG.toolGroupClass;
        const downloadButton = buildDownloadButton(card);
        group.appendChild(downloadButton);
        return group;
    }

    function injectCard(card) {
        const wallpaperId = getWallpaperId(card);
        if (!wallpaperId) {
            return;
        }

        const figure = getCardFigure(card);
        if (!figure) {
            return;
        }

        if (
            card.getAttribute(CONFIG.injectedAttr) === '1'
            && findDirectChildByClass(figure, CONFIG.toolGroupClass)
        ) {
            return;
        }

        const oldDownloadButton = findDirectChildByClass(figure, CONFIG.buttonClass);
        if (oldDownloadButton) {
            oldDownloadButton.remove();
        }

        const oldToolGroup = findDirectChildByClass(figure, CONFIG.toolGroupClass);
        if (oldToolGroup) {
            oldToolGroup.remove();
        }

        figure.classList.add('whfd-card-target');
        const toolGroup = buildToolGroup(card);
        figure.insertBefore(toolGroup, figure.firstChild);
        card.setAttribute(CONFIG.injectedAttr, '1');

        bindHoverPreview(card, figure);
    }

    function scanCards() {
        if (!isGridListingPage()) {
            return;
        }

        document.querySelectorAll(CONFIG.cardSelector).forEach(injectCard);
    }

    function startObserver() {
        const observer = new MutationObserver(() => {
            if (startObserver.scheduled) {
                return;
            }

            startObserver.scheduled = true;
            requestAnimationFrame(() => {
                startObserver.scheduled = false;
                scanCards();
            });
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
        });
    }

    function init() {
        injectStyles();
        scanCards();
        startObserver();
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init, { once: true });
    } else {
        init();
    }
})();
