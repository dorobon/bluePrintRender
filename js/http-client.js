window.HTTPClient = class HTTPClient {
    constructor() {
        this.modal = new bootstrap.Modal(document.getElementById('http-client-modal'));
        this.currentMetadata = {};
        this.setupEventListeners();
    }

    setMetadata(metadata) {
        this.currentMetadata = metadata;
    }

    setupEventListeners() {
        document.getElementById('add-header').addEventListener('click', () => {
            this.addHeaderRow();
        });

        document.getElementById('send-request').addEventListener('click', () => {
            this.sendRequest();
        });
    }

    openModal(action) {
        const baseUrl = this.currentMetadata.host || '';
        document.getElementById('request-url').value = baseUrl + action.url;
        
        // Limpiar y configurar headers
        const headersContainer = document.getElementById('headers-container');
        headersContainer.innerHTML = '';
        
        if (action.headers) {
            action.headers.forEach(header => {
                this.addHeaderRow(header.name, header.value);
            });
        }
        
        // Configurar body si existe
        const bodyInput = document.getElementById('request-body');
        if (action.requests && action.requests[0] && action.requests[0].body) {
            bodyInput.value = JSON.stringify(JSON.parse(action.requests[0].body), null, 2);
        } else {
            bodyInput.value = '';
        }
        
        this.modal.show();
    }

    addHeaderRow() {
        const container = document.getElementById('headers-container');
        const row = document.createElement('div');
        row.className = 'header-row';

        row.innerHTML = `
            <input type="text" class="form-control" placeholder="Nombre">
            <input type="text" class="form-control" placeholder="Valor">
            <span class="remove-header">❌</span>
        `;

        row.querySelector('.remove-header').addEventListener('click', () => {
            container.removeChild(row);
        });

        container.appendChild(row);
    }

    async sendRequest() {
        const startTime = performance.now();
        const url = document.getElementById('request-url').value;
        const body = document.getElementById('request-body').value;
        
        // Recopilar headers
        const headers = {};
        document.querySelectorAll('.header-row').forEach(row => {
            const inputs = row.querySelectorAll('input');
            const name = inputs[0].value.trim();
            const value = inputs[1].value.trim();
            if (name && value) {
                headers[name] = value;
            }
        });

        try {
            const response = await fetch(url, {
                method: 'GET', // Por ahora solo GET
                headers: headers,
                body: body || undefined
            });

            const endTime = performance.now();
            const responseTime = Math.round(endTime - startTime);

            // Crear sección de respuesta
            const responseData = await response.json();
            const responseHeaders = {};
            response.headers.forEach((value, name) => {
                responseHeaders[name] = value;
            });

            this.showResponse({
                status: response.status,
                statusText: response.statusText,
                headers: responseHeaders,
                body: responseData,
                time: responseTime
            });

            console.log('Response:', {
                status: response.status,
                headers: responseHeaders,
                body: responseData,
                time: responseTime
            });
        } catch (error) {
            console.error('Error:', error);
            this.showError(error);
        }
    }

    showResponse(response) {
        const modalBody = document.querySelector('.modal-body');
        
        // Eliminar sección de respuesta anterior si existe
        const existingResponse = modalBody.querySelector('.response-section');
        if (existingResponse) {
            existingResponse.remove();
        }

        const responseSection = document.createElement('div');
        responseSection.className = 'response-section';
        
        // Status
        const status = document.createElement('div');
        status.className = `response-status ${response.status < 400 ? 'success' : 'error'}`;
        status.textContent = `${response.status} ${response.statusText}`;
        responseSection.appendChild(status);

        // Metadata
        const metadata = document.createElement('div');
        metadata.className = 'response-metadata';
        
        const timeItem = document.createElement('div');
        timeItem.className = 'response-metadata-item';
        timeItem.innerHTML = `
            <span class="response-metadata-label">Tiempo de respuesta</span>
            <span class="response-metadata-value">${response.time}ms</span>
        `;
        metadata.appendChild(timeItem);

        const sizeItem = document.createElement('div');
        sizeItem.className = 'response-metadata-item';
        sizeItem.innerHTML = `
            <span class="response-metadata-label">Tamaño</span>
            <span class="response-metadata-value">${JSON.stringify(response.body).length} bytes</span>
        `;
        metadata.appendChild(sizeItem);

        responseSection.appendChild(metadata);

        // Headers
        const headers = document.createElement('div');
        headers.className = 'response-headers';
        headers.innerHTML = '<h6>Headers</h6>';
        const headersList = document.createElement('pre');
        headersList.textContent = JSON.stringify(response.headers, null, 2);
        headers.appendChild(headersList);
        responseSection.appendChild(headers);

        // Body
        const body = document.createElement('div');
        body.className = 'response-body';
        body.innerHTML = '<h6>Body</h6>';
        const bodyContent = document.createElement('pre');
        bodyContent.textContent = JSON.stringify(response.body, null, 2);
        body.appendChild(bodyContent);
        responseSection.appendChild(body);

        modalBody.appendChild(responseSection);
    }

    showError(error) {
        const modalBody = document.querySelector('.modal-body');
        
        const errorSection = document.createElement('div');
        errorSection.className = 'response-section';
        
        const errorStatus = document.createElement('div');
        errorStatus.className = 'response-status error';
        errorStatus.textContent = 'Error en la petición';
        
        const errorMessage = document.createElement('div');
        errorMessage.className = 'response-body';
        errorMessage.textContent = error.message;
        
        errorSection.appendChild(errorStatus);
        errorSection.appendChild(errorMessage);
        
        modalBody.appendChild(errorSection);
    }
} 