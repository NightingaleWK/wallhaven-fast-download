const fs = require('fs');
const path = require('path');
const vm = require('vm');
const assert = require('assert');

const source = fs.readFileSync(path.join(__dirname, '..', 'main.js'), 'utf8');
const instrumentedSource = source.replace(
    /\n\}\)\(\);\s*$/,
    `
    globalThis.__whfdTest = {
        createPreviewTask,
        downloadFile,
        getCacheValue,
        requestPreviewBlob,
        setCacheValue,
    };
})();`
);

assert.notStrictEqual(instrumentedSource, source, 'test exports should be injected before the userscript closes');

const context = vm.createContext({
    Blob,
    URL,
    clearTimeout,
    console,
    document: {
        readyState: 'loading',
        addEventListener() { },
    },
    location: {
        origin: 'https://wallhaven.cc',
        pathname: '/latest',
    },
    performance,
    setTimeout,
});
vm.runInContext(instrumentedSource, context, { filename: 'main.js' });

const {
    createPreviewTask,
    downloadFile,
    getCacheValue,
    requestPreviewBlob,
    setCacheValue,
} = context.__whfdTest;

async function testPreviewTaskCleanup() {
    let cleanupCount = 0;
    let removeCount = 0;
    const task = createPreviewTask({}, {
        remove() {
            removeCount += 1;
        },
    });

    task.addCleanup(() => {
        cleanupCount += 1;
    });
    task.dispose();
    task.dispose();
    task.addCleanup(() => {
        cleanupCount += 1;
    });

    assert.strictEqual(cleanupCount, 2, 'registered and late cleanups should each run exactly once');
    assert.strictEqual(removeCount, 1, 'preview DOM should only be removed once');
}

async function testBoundedLruCache() {
    const cache = new Map();
    for (let index = 0; index < 120; index += 1) {
        setCacheValue(cache, `item-${index}`, index);
    }

    assert.strictEqual(getCacheValue(cache, 'item-0'), 0, 'cache reads should return stored values');
    setCacheValue(cache, 'item-120', 120);

    assert.strictEqual(cache.size, 120, 'cache should stay within its configured limit');
    assert.strictEqual(cache.has('item-0'), true, 'recently read entries should remain cached');
    assert.strictEqual(cache.has('item-1'), false, 'least-recently-used entries should be evicted first');
}

async function testDownloadTimeout() {
    context.GM_download = (details) => {
        setTimeout(details.ontimeout, 0);
        return { abort() { } };
    };

    await assert.rejects(
        downloadFile('https://w.wallhaven.cc/full/aa/wallhaven-aaaaaa.jpg', 'wallhaven-aaaaaa.jpg'),
        /下载超时/,
        'download timeout should reject instead of leaving the button pending forever'
    );
}

async function testPreviewRequestCancellation() {
    let abortCount = 0;
    let requestDetails = null;
    context.GM_xmlhttpRequest = (details) => {
        requestDetails = details;
        return {
            abort() {
                abortCount += 1;
                details.onabort();
            },
        };
    };

    const task = createPreviewTask({}, { remove() { } });
    const request = requestPreviewBlob('https://w.wallhaven.cc/full/aa/wallhaven-aaaaaa.jpg', () => { }, task);
    assert(requestDetails, 'preview request should start immediately');

    task.dispose();
    await assert.rejects(request, /原图请求已取消/);
    assert.strictEqual(abortCount, 1, 'disposing a preview should abort its active transfer exactly once');
}

(async () => {
    await testPreviewTaskCleanup();
    await testBoundedLruCache();
    await testDownloadTimeout();
    await testPreviewRequestCancellation();
})().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
