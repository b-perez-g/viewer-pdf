var urlParams = new URLSearchParams(window.location.search);
var pdfUrl = urlParams.get('file');
var initialPageNum = parseInt(window.location.hash.split('=')[1]) || 1;
var pdfDoc = null,
    pageNum = initialPageNum,
    pageRendering = false,
    pageNumPending = null,
    scale = 1, 
    viewer = document.getElementById('viewer'),
    viewerContainer = document.getElementById('viewerContainer'),
    rotation = 0; 


function isPdfLoaded() {
    return pdfDoc !== null;
}

function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

function getScaleForContainer(page) {
    var containerWidth = viewerContainer.clientWidth; 
    var viewport = page.getViewport({ scale: 1 });
    var pageWidth = viewport.width + 25; 
    return containerWidth / pageWidth; 
}

function renderPage(num) {
    pageRendering = true;
    pdfDoc.getPage(num).then(function(page) {
        var scaleForContainer = getScaleForContainer(page); 
        var viewport = page.getViewport({ scale: scaleForContainer, rotation: rotation }); 

        var pageDiv = document.createElement('div');
        pageDiv.className = 'page';
        pageDiv.style.width = viewport.width + 'px';
        pageDiv.style.height = viewport.height + 'px';


        while (viewer.firstChild) {
            viewer.removeChild(viewer.firstChild);
        }
        viewer.appendChild(pageDiv);

        var canvas = document.createElement('canvas');
        var context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        pageDiv.appendChild(canvas);

        var renderContext = {
            canvasContext: context,
            viewport: viewport
        };
        var renderTask = page.render(renderContext);

        renderTask.promise.then(function() {
            pageRendering = false;
            if (pageNumPending !== null) {
                renderPage(pageNumPending);
                pageNumPending = null;
            }
        });

        var textLayerDiv = document.createElement('div');
        textLayerDiv.className = 'textLayer';
        pageDiv.appendChild(textLayerDiv);

        page.getTextContent().then(function(textContent) {
            pdfjsLib.renderTextLayer({
                textContent: textContent,
                container: textLayerDiv,
                viewport: viewport,
                textDivs: []
            });
        });
    });

    document.getElementById('pageNum').textContent = num;
}

function onPrevPage() {
    if (pageNum <= 1) {
        return;
    }
    pageNum--;
    queueRenderPage(pageNum);
    updateHash(pageNum);
}

function onNextPage() {
    if (pageNum >= pdfDoc.numPages) {
        return;
    }
    pageNum++;
    queueRenderPage(pageNum);
    updateHash(pageNum);
}

function updateHash(pageNum) {
    window.location.hash = `page=${pageNum}`;
}

function onWheelZoom(event) {
    if (event.ctrlKey) {
        event.preventDefault();
        if (event.deltaY < 0) {
            scale *= 1.1;
        } else {
            scale /= 1.1;
        }
        viewer.style.transform = `scale(${scale})`;
        viewer.style.transformOrigin = 'top left';
    }
}

function onHashChange() {
    var newPageNum = parseInt(window.location.hash.split('=')[1]) || 1;
    if (newPageNum !== pageNum) {
        pageNum = newPageNum;
        queueRenderPage(pageNum);
    }
}

function onRotateLeft() {
    rotation = (rotation - 90) % 360;
    if (rotation < 0) rotation += 360;
    queueRenderPage(pageNum);
}

function onRotateRight() {
    rotation = (rotation + 90) % 360;
    queueRenderPage(pageNum);
}

document.addEventListener("DOMContentLoaded", function() {
    document.getElementById('prevPage').addEventListener('click', onPrevPage);
    document.getElementById('nextPage').addEventListener('click', onNextPage);
    document.getElementById('rotateLeft').addEventListener('click', onRotateLeft);
    document.getElementById('rotateRight').addEventListener('click', onRotateRight);

    if (!isPdfLoaded()) {
        pdfjsLib.getDocument(pdfUrl).promise.then(function(pdfDoc_) {
            pdfDoc = pdfDoc_;
            document.getElementById('pageCount').textContent = pdfDoc.numPages;

            if (pdfDoc.numPages === 1) {
                document.getElementById('prevPage').disabled = true;
                document.getElementById('nextPage').disabled = true;
            } else {
                document.getElementById('prevPage').disabled = false;
                document.getElementById('nextPage').disabled = false;
            }

            renderPage(pageNum);
        }).catch(function(error) {
            console.error('Error loading PDF: ', error);
        });
    } else {
        renderPage(pageNum);
    }

    window.addEventListener('wheel', onWheelZoom, { passive: false });
});

window.addEventListener('hashchange', onHashChange);
