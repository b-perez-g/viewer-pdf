/** 
 * Verifica si el documento PDF ha sido cargado.
 * @returns {boolean} true si el PDF está cargado, false en caso contrario.
 */
function isPdfLoaded() {
    return pdfDoc !== null;
}

/** 
 * Agrega una página a la cola de renderizado.
 * Si ya se está renderizando una página, se agrega a la cola para ser procesada después.
 * @param {number} num - Número de la página a renderizar.
 */
function queueRenderPage(num) {
    if (pageRendering) {
        pageNumPending = num;
    } else {
        renderPage(num);
    }
}

/** 
 * Calcula la escala adecuada para ajustar la página al contenedor del visor.
 * @param {Object} page - Objeto de la página que se va a renderizar.
 * @returns {number} escala adecuada para el contenedor.
 */
function getScaleForContainer(page) {
    var containerWidth = viewerContainer.clientWidth;
    var viewport = page.getViewport({ scale: 1 });
    var pageWidth = viewport.width + 25;
    return containerWidth / pageWidth;
}

/** 
 * Renderiza una página del PDF en el visor.
 * @param {number} num - Número de la página que se va a renderizar.
 */
function renderPage(num) {
    pageRendering = true;
    pdfDoc.getPage(num).then(function(page) {
        var scaleForContainer = getScaleForContainer(page);
        var renderScale = scaleForContainer * 2.5;

        if (initialRender){
            scale = scale / 2.5;
            initialRender = false;
        }

        var viewport = page.getViewport({ scale: renderScale, rotation: rotation });
        viewer.style.transform = `scale(${scale})`;
        viewer.style.transformOrigin = 'top left';

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

/** 
 * Maneja la acción de ir a la página anterior.
 * Si ya está en la primera página, no hace nada.
 */
function onPrevPage() {
    if (pageNum <= 1) {
        return;
    }
    pageNum--;
    queueRenderPage(pageNum);
    updateHash(pageNum);
}

/** 
 * Maneja la acción de ir a la página siguiente.
 * Si ya está en la última página, no hace nada.
 */
function onNextPage() {
    if (pageNum >= pdfDoc.numPages) {
        return;
    }
    pageNum++;
    queueRenderPage(pageNum);
    updateHash(pageNum);
}

/** 
 * Actualiza el hash de la URL para reflejar la página actual.
 * @param {number} pageNum - Número de la página actual.
 */
function updateHash(pageNum) {
    window.location.hash = `page=${pageNum}`;
}

/** 
 * Maneja el zoom al usar la rueda del ratón con la tecla Ctrl presionada.
 * @param {Event} event - Evento de la rueda del ratón.
 */
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

/** 
 * Maneja el cambio en el hash de la URL y actualiza la página mostrada.
 */
function onHashChange() {
    var newPageNum = parseInt(window.location.hash.split('=')[1]) || 1;
    if (newPageNum !== pageNum) {
        pageNum = newPageNum;
        queueRenderPage(pageNum);
    }
}

/** 
 * Maneja la rotación de la página hacia la izquierda (90 grados).
 */
function onRotateLeft() {
    rotation = (rotation - 90) % 360;
    if (rotation < 0) rotation += 360;
    queueRenderPage(pageNum);
}

/** 
 * Maneja la rotación de la página hacia la derecha (90 grados).
 */
function onRotateRight() {
    rotation = (rotation + 90) % 360;
    queueRenderPage(pageNum);
}
