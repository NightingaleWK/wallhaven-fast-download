// ==UserScript==
// @name                Wallhaven Fast Download
// @name:zh-CN          Wallhaven 快速下载
// @name:en             Wallhaven Fast Download
// @description         在 Wallhaven 网格浏览页悬停图片时显示原图下载和快速预览按钮
// @description:zh-CN   在 Wallhaven 网格浏览页悬停图片时显示原图下载和快速预览按钮，并通过脚本管理器下载文件
// @description:en      Adds hover download and quick preview buttons to Wallhaven grid pages and downloads wallpapers through the userscript manager
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
// @version             1.0.0
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
        previewButtonClass: 'whfd-preview-button',
        toastId: 'whfd-toast',
    };

    const STYLE_ID = 'whfd-style';
    let currentPreview = null;

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

            .whfd-download-button,
            .whfd-preview-button {
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
            .whfd-tool-group:focus-within {
                opacity: 1;
                pointer-events: auto;
                transform: translateY(0);
            }

            .whfd-download-button:hover,
            .whfd-preview-button:hover,
            .whfd-download-button:focus-visible,
            .whfd-preview-button:focus-visible {
                background: rgba(17, 17, 17, 0.92);
                border-color: rgba(255, 255, 255, 0.34);
                outline: none;
            }

            .whfd-download-button:disabled,
            .whfd-preview-button:disabled {
                cursor: wait;
                opacity: 0.68;
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

            .whfd-preview-status {
                box-sizing: border-box;
                width: 100%;
                padding: 12px;
                text-align: center;
                font-size: 13px;
                line-height: 1.4;
                color: rgba(255, 255, 255, 0.86);
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
        if (card.querySelector('span.png, .png')) {
            return 'png';
        }
        if (card.querySelector('span.webp, .webp')) {
            return 'webp';
        }
        return 'jpg';
    }

    function getFallbackDownload(card, wallpaperId) {
        const extension = getFileExtension(card);
        const prefix = wallpaperId.slice(0, 2);
        return {
            url: `https://w.wallhaven.cc/full/${prefix}/wallhaven-${wallpaperId}.${extension}`,
            name: `wallhaven-${wallpaperId}.${extension}`,
        };
    }

    function requestWallpaperInfo(wallpaperId) {
        return new Promise((resolve, reject) => {
            const xhr = typeof GM_xmlhttpRequest === 'function' ? GM_xmlhttpRequest : null;
            if (!xhr) {
                reject(new Error('GM_xmlhttpRequest is unavailable'));
                return;
            }

            xhr({
                method: 'GET',
                url: `https://wallhaven.cc/api/v1/w/${encodeURIComponent(wallpaperId)}`,
                responseType: 'json',
                onload: (response) => {
                    if (response.status < 200 || response.status >= 300) {
                        reject(new Error(`API request failed with status ${response.status}`));
                        return;
                    }

                    try {
                        let payload = response.response || response.responseText || {};
                        if (typeof payload === 'string') {
                            payload = JSON.parse(payload);
                        }
                        const wallpaper = payload && payload.data ? payload.data : null;
                        if (!wallpaper || !wallpaper.path) {
                            reject(new Error('Missing wallpaper path'));
                            return;
                        }

                        const downloadUrl = new URL(wallpaper.path, location.origin);
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
                    reject(new Error('API request failed'));
                },
            });
        });
    }

    async function fetchWallpaperInfo(wallpaperId) {
        return requestWallpaperInfo(wallpaperId);
    }

    async function resolveDownload(card, wallpaperId) {
        try {
            return await fetchWallpaperInfo(wallpaperId);
        } catch (error) {
            return getFallbackDownload(card, wallpaperId);
        }
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

        button.disabled = true;
        try {
            const download = await resolveDownload(card, wallpaperId);
            await downloadFile(download.url, download.name);
        } catch (error) {
            showToast(`下载失败：${error.message}`, true);
        } finally {
            button.disabled = false;
        }
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
        document.removeEventListener('click', handleDocumentPreviewClose, true);
    }

    function handleDocumentPreviewClose() {
        closeCurrentPreview();
    }

    function getPreviewWidth(card, figure) {
        const thumbnail = figure.querySelector('img') || card.querySelector('img');
        const source = thumbnail || figure;
        const width = source.getBoundingClientRect().width || figure.getBoundingClientRect().width;

        return Math.max(120, Math.round(width * 1.2));
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

    function showPreviewError(popover, message) {
        popover.classList.add('is-error');
        popover.replaceChildren();

        const status = document.createElement('div');
        status.className = 'whfd-preview-status';
        status.textContent = message;
        popover.appendChild(status);
    }

    function loadPreviewImage(popover, url) {
        return new Promise((resolve, reject) => {
            const image = document.createElement('img');
            image.alt = '快速预览';
            image.decoding = 'async';

            image.addEventListener('load', () => {
                popover.replaceChildren(image);
                resolve();
            }, { once: true });

            image.addEventListener('error', () => {
                reject(new Error('预览图片加载失败'));
            }, { once: true });

            image.src = url;
        });
    }

    async function handlePreview(card, button) {
        const wallpaperId = getWallpaperId(card);
        if (!wallpaperId) {
            showToast('无法识别当前卡片的 Wallpaper ID', true);
            return;
        }

        const figure = getCardFigure(card);
        if (!figure) {
            showToast('无法定位当前预览卡片', true);
            return;
        }

        closeCurrentPreview();

        const popover = buildPreviewPopover(card, figure);
        figure.appendChild(popover);
        currentPreview = {
            card,
            popover,
        };

        setTimeout(() => {
            if (currentPreview && currentPreview.popover === popover) {
                document.addEventListener('click', handleDocumentPreviewClose, true);
            }
        }, 0);

        button.disabled = true;
        try {
            const preview = await resolveDownload(card, wallpaperId);
            await loadPreviewImage(popover, preview.url);
        } catch (error) {
            showPreviewError(popover, error.message || '预览加载失败');
            showToast(`预览失败：${error.message}`, true);
        } finally {
            button.disabled = false;
        }
    }

    function buildDownloadButton(card) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = CONFIG.buttonClass;
        button.textContent = '↓';
        button.title = '快速下载原图';
        button.setAttribute('aria-label', '快速下载原图');

        button.addEventListener('click', (event) => {
            stopCardClick(event);
            handleDownload(card, button);
        });

        return button;
    }

    function buildPreviewButton(card) {
        const button = document.createElement('button');
        button.type = 'button';
        button.className = CONFIG.previewButtonClass;
        button.textContent = 'P';
        button.title = '快速预览原图';
        button.setAttribute('aria-label', '快速预览原图');

        button.addEventListener('click', (event) => {
            stopCardClick(event);
            handlePreview(card, button);
        });

        return button;
    }

    function buildToolGroup(card) {
        const group = document.createElement('div');
        group.className = CONFIG.toolGroupClass;
        const downloadButton = buildDownloadButton(card);
        const previewButton = buildPreviewButton(card);

        group.appendChild(downloadButton);
        group.appendChild(previewButton);

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
            && figure.querySelector(`.${CONFIG.previewButtonClass}`)
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
        if (!toolGroup.querySelector(`.${CONFIG.previewButtonClass}`)) {
            toolGroup.appendChild(buildPreviewButton(card));
        }
        card.setAttribute(CONFIG.injectedAttr, '1');
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
