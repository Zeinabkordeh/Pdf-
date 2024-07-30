import * as pdfjsLib from './node_modules/pdfjs-dist/build/pdf.mjs';

// Path to your PDF file
const pdfPath = 'pdfs/HHWWnew.pdf';

// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = './node_modules/pdfjs-dist/build/pdf.worker.mjs';

let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1;
let zoomScale = 2; // Scale factor for zoom

const viewer = document.getElementById('pdf-viewer');
const flipbook = document.createElement('div');
flipbook.id = 'flipbook';
flipbook.className = 'flipbook';
viewer.appendChild(flipbook);

const createPageContainer = (id) => {
    const pageContainer = document.createElement('div');
    pageContainer.className = 'page';
    pageContainer.id = id;
    flipbook.appendChild(pageContainer);
};

createPageContainer('page-1');
createPageContainer('page-2');

const canvasLeft = document.createElement('canvas');
canvasLeft.id = 'canvas-1';
document.getElementById('page-1').appendChild(canvasLeft);

const canvasRight = document.createElement('canvas');
canvasRight.id = 'canvas-2';
document.getElementById('page-2').appendChild(canvasRight);

function renderPage(num, scale) {
    pageRendering = true;
    const renderTasks = [];

    const renderPageToCanvas = (pageNum, canvasId, scale) => {
        return pdfDoc.getPage(pageNum).then((page) => {
            const canvas = document.getElementById(canvasId);
            const ctx = canvas.getContext('2d');
            const viewport = page.getViewport({ scale });
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const renderContext = {
                canvasContext: ctx,
                viewport: viewport,
            };

            return page.render(renderContext).promise;
        });
    };

    // Render left page
    renderTasks.push(renderPageToCanvas(num, 'canvas-1', scale));

    // Render right page if it exists
    if (num + 1 <= pdfDoc.numPages) {
        renderTasks.push(renderPageToCanvas(num + 1, 'canvas-2', scale));
    } else {
        // Clear the right canvas if there's no next page
        const canvasRight = document.getElementById('canvas-2');
        const ctxRight = canvasRight.getContext('2d');
        ctxRight.clearRect(0, 0, canvasRight.width, canvasRight.height);
    }

    Promise.all(renderTasks).then(() => {
        pageRendering = false;

        if (pageNumPending !== null) {
            renderPage(pageNumPending, scale);
            pageNumPending = null;
        }

        document.getElementById('loader').style.display = 'none';
        document.getElementById('page-controls').style.display = 'flex';
    });
}

function queueRenderPage(num, scale) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num, scale);
    }
}

function onPrevPage() {
    if (pageNum <= 1) {
        return;
    }
    pageNum -= 2;
    if (pageNum < 1) pageNum = 1;
    queueRenderPage(pageNum, scale);
}

function onNextPage() {
    if (pageNum + 1 >= pdfDoc.numPages) {
        return;
    }
    pageNum += 2;
    queueRenderPage(pageNum, scale);
}

function zoomIn(event) {
    const canvas = event.currentTarget.querySelector('canvas');
    canvas.style.transform = 'scale(2)';
    canvas.style.transformOrigin = `${event.offsetX}px ${event.offsetY}px`;
}

function zoomOut(event) {
    const canvas = event.currentTarget.querySelector('canvas');
    canvas.style.transform = 'scale(1)';
}

document.getElementById('prev-page').addEventListener('click', onPrevPage);
document.getElementById('next-page').addEventListener('click', onNextPage);
document.getElementById('first-page').addEventListener('click', () => queueRenderPage(1, scale));

document.querySelectorAll('.page').forEach(page => {
    page.addEventListener('mouseover', zoomIn);
    page.addEventListener('mousemove', zoomIn);
    page.addEventListener('mouseout', zoomOut);
});

pdfjsLib.getDocument(pdfPath).promise.then((pdfDoc_) => {
    pdfDoc = pdfDoc_;
    renderPage(pageNum, scale);
}).catch((error) => {
    console.error('Error loading PDF:', error);
    document.getElementById('loader').textContent = 'Error loading PDF';
});
