import * as pdfjsLib from './node_modules/pdfjs-dist/build/pdf.mjs';

// Initialize PDF.js
pdfjsLib.GlobalWorkerOptions.workerSrc = './node_modules/pdfjs-dist/build/pdf.worker.mjs';

let pdfPath = 'pdfs/HHWWnew.pdf';

let pdfDoc = null;
let pageNum = 1;
let pageRendering = false;
let pageNumPending = null;
let scale = 1;
let zoomScale = 3; // Scale factor for zoom
let currentPdfPath = 'pdfs/HHWWnew.pdf'; // Default PDF path

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

const magnifier = document.createElement('div');
magnifier.id = 'magnifier';
magnifier.className = 'magnifier';
document.body.appendChild(magnifier);

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
    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;
    const zoomedArea = document.getElementById('magnifier');
    zoomedArea.style.backgroundImage = `url(${canvas.toDataURL()})`;
    zoomedArea.style.backgroundSize = `${canvas.width * zoomScale}px ${canvas.height * zoomScale}px`;
    zoomedArea.style.backgroundPosition = `-${x * zoomScale}px -${y * zoomScale}px`;
    zoomedArea.style.display = 'block';
    zoomedArea.style.left = `${event.clientX + 10}px`;
    zoomedArea.style.top = `${event.clientY + 10}px`;
}

function hideZoom() {
    const zoomedArea = document.getElementById('magnifier');
    zoomedArea.style.display = 'none';
}

document.getElementById('prev-page').addEventListener('click', onPrevPage);
document.getElementById('next-page').addEventListener('click', onNextPage);
document.getElementById('first-page').addEventListener('click', () => queueRenderPage(1, scale));

document.querySelectorAll('.page').forEach(page => {
    page.addEventListener('mousemove', zoomIn);
    page.addEventListener('mouseout', hideZoom);
});

function loadPdf(pdfPath) {
    pageNum = 1; // Reset to the first page
    pdfjsLib.getDocument(pdfPath).promise.then((pdfDoc_) => {
        pdfDoc = pdfDoc_;
        renderPage(pageNum, scale);
    }).catch((error) => {
        console.error('Error loading PDF:', error);
        document.getElementById('loader').textContent = 'Error loading PDF';
    });
}

document.querySelectorAll('.pdf-button').forEach(button => {
    button.addEventListener('click', (event) => {
        currentPdfPath = event.target.dataset.pdf;
        loadPdf(currentPdfPath);
    });
});

// Load the initial PDF
loadPdf(currentPdfPath);

document.getElementById('pdf-select').addEventListener('change', (event) => {
    pdfPath = event.target.value;
    loadPdf(pdfPath);
});
