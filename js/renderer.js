window.APIRenderer = class APIRenderer {
    constructor() {
        this.previewContainer = document.getElementById('documentation-preview');
        this.currentMetadata = {};
    }

    render(content) {
        // Parsear el contenido APIB
        this.document = this.parseAPIBlueprint(content);
        
        // Limpiar el contenedor
        this.previewContainer.innerHTML = '';

        // Crear contenedor flex
        const flexContainer = document.createElement('div');
        flexContainer.className = 'documentation-flex-container';

        // Agregar menú de navegación
        flexContainer.appendChild(this.createNavigationMenu());

        // Crear contenedor para el contenido
        const contentContainer = document.createElement('div');
        contentContainer.className = 'documentation-content';

        // Renderizar metadata
        if (Object.keys(this.currentMetadata).length > 0) {
            this.renderMetadata(contentContainer);
        }

        // Renderizar cada sección
        this.document.sections.forEach((section, sectionIndex) => {
            const sectionElement = this.createSectionElement(section, sectionIndex);
            contentContainer.appendChild(sectionElement);
        });

        flexContainer.appendChild(contentContainer);
        this.previewContainer.appendChild(flexContainer);
    }

    parseAPIBlueprint(content) {
        const document = {
            metadata: {},
            sections: []
        };
        
        const lines = content.split('\n');
        let currentSection = null;
        let currentResource = null;
        let currentAction = null;
        let currentBlock = null;
        let blockContent = '';
        let isInCodeBlock = false;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i].trimRight();
            
            // Procesar metadata
            if (line.match(/^FORMAT: /)) {
                this.currentMetadata.format = line.substring(8).trim();
                continue;
            }
            if (line.match(/^HOST: /)) {
                this.currentMetadata.host = line.substring(6).trim();
                continue;
            }

            // Manejar bloques de código
            if (line.trim() === '') {
                if (currentBlock) {
                    this.processBlock(currentBlock, blockContent.trim(), currentAction || currentResource);
                    blockContent = '';
                    currentBlock = null;
                }
                continue;
            }

            // Detectar inicio/fin de bloques de código
            if (line.match(/^\s{8}/) && !isInCodeBlock) {
                isInCodeBlock = true;
                blockContent += line.substring(8) + '\n';
                continue;
            } else if (isInCodeBlock && !line.match(/^\s{8}/)) {
                isInCodeBlock = false;
                if (currentBlock) {
                    this.processBlock(currentBlock, blockContent.trim(), currentAction || currentResource);
                    blockContent = '';
                    currentBlock = null;
                }
            } else if (isInCodeBlock) {
                blockContent += line.substring(8) + '\n';
                continue;
            }

            // Procesar headers y secciones
            if (line.startsWith('# ')) {
                currentSection = this.createSection(line.substring(2));
                document.sections.push(currentSection);
                currentResource = null;
                currentAction = null;
            } else if (line.startsWith('## ')) {
                const resourceMatch = line.match(/^## (.+) \[([^\]]+)\]/);
                if (resourceMatch) {
                    currentResource = this.createResource(resourceMatch[1], resourceMatch[2]);
                    currentSection.resources = currentSection.resources || [];
                    currentSection.resources.push(currentResource);
                    currentAction = null;
                }
            } else if (line.startsWith('### ')) {
                const actionMatch = line.match(/^### (.+) \[(GET|POST|PUT|DELETE)\]/);
                if (actionMatch && currentResource) {
                    currentAction = this.createAction(actionMatch[1], actionMatch[2]);
                    currentResource.actions = currentResource.actions || [];
                    currentResource.actions.push(currentAction);
                }
            } else if (line.startsWith('+ ')) {
                currentBlock = 'parameters';
                blockContent = line + '\n';
            } else if (line.match(/^\+ Response/)) {
                currentBlock = 'response';
                blockContent = line + '\n';
            } else if (line.match(/^\+ Request/)) {
                currentBlock = 'request';
                blockContent = line + '\n';
            } else if (currentBlock) {
                blockContent += line + '\n';
            } else if (currentAction || currentResource) {
                // Acumular descripción
                const target = currentAction || currentResource;
                target.description = target.description || '';
                target.description += line + '\n';
            }
        }

        return document;
    }

    processBlock(type, content, target) {
        if (!target) return; // Evitar procesar si no hay target

        switch (type) {
            case 'parameters':
                if (!target.parameters) target.parameters = [];
                const params = this.parseParameters(content);
                if (params && params.length > 0) {
                    target.parameters = target.parameters.concat(params);
                }
                break;
            case 'response':
                if (!target.responses) target.responses = [];
                const response = this.parseResponse(content);
                if (response) {
                    target.responses.push(response);
                }
                break;
            case 'request':
                if (!target.requests) target.requests = [];
                const request = this.parseRequest(content);
                if (request) {
                    target.requests.push(request);
                }
                break;
        }
    }

    createSection(title) {
        return {
            title: title,
            resources: [],
            description: ''
        };
    }

    createResource(title, url) {
        return {
            title: title,
            url: url,
            actions: [],
            description: ''
        };
    }

    createAction(title, method) {
        return {
            title: title,
            method: method,
            description: '',
            parameters: [],
            requests: [],
            responses: []
        };
    }

    parseParameters(content) {
        const parameters = [];
        const lines = content.split('\n');
        let currentParam = null;

        lines.forEach(line => {
            // Detectar línea de parámetro
            const paramMatch = line.match(/^\s*\+ ([^:]+)(?:: ([^(]+))?\s*(\(([^)]+)\))?\s*(?:-\s*(.+))?$/);
            
            if (paramMatch) {
                // Usar nombres descriptivos en lugar de _
                const [fullMatch, name, defaultValue, attributesGroup, attributes, description] = paramMatch;
                
                // Procesar atributos (required, number, string, etc)
                const attrs = attributes ? attributes.split(',').map(a => a.trim()) : [];
                const isRequired = attrs.includes('required');
                const type = attrs.find(a => ['number', 'string', 'array', 'boolean', 'object'].includes(a)) || 'string';
                
                currentParam = {
                    name: name.trim(),
                    type: type,
                    required: isRequired,
                    defaultValue: defaultValue ? defaultValue.trim() : undefined,
                    description: description ? description.trim() : '',
                    attributes: attrs.filter(a => !['required', type].includes(a))
                };
                
                parameters.push(currentParam);
            } else if (currentParam && line.trim() && line.match(/^\s+/)) {
                // Líneas adicionales de descripción
                currentParam.description += ' ' + line.trim();
            }
        });

        return parameters;
    }

    parseResponse(content) {
        const response = {
            code: 200,
            contentType: 'application/json',
            headers: {},
            body: ''
        };

        const lines = content.split('\n');
        let isInBody = false;
        let bodyContent = '';

        lines.forEach(line => {
            if (line.startsWith('+ Response')) {
                const match = line.match(/\+ Response (\d+)(?:\s+\(([^)]+)\))?/);
                if (match) {
                    response.code = parseInt(match[1]);
                    if (match[2]) response.contentType = match[2];
                }
            } else if (line.match(/^\s*{\s*$/)) {
                isInBody = true;
                bodyContent = '{';
            } else if (isInBody) {
                bodyContent += '\n' + line;
                if (line.match(/^\s*}\s*$/)) {
                    isInBody = false;
                    response.body = bodyContent;
                }
            } else if (line.match(/^[\s\t]+[A-Za-z-]+:/)) {
                const [name, ...value] = line.split(':');
                response.headers[name.trim()] = value.join(':').trim();
            }
        });

        return response;
    }

    parseRequest(content) {
        const request = {
            contentType: 'application/json',
            headers: {},
            body: ''
        };

        const lines = content.split('\n');
        let isInBody = false;
        let bodyContent = '';

        lines.forEach(line => {
            if (line.startsWith('+ Request')) {
                const typeMatch = line.match(/\+ Request(?:\s+\(([^)]+)\))?/);
                if (typeMatch && typeMatch[1]) {
                    request.contentType = typeMatch[1];
                }
            } else if (line.match(/^\s*{\s*$/)) {
                isInBody = true;
                bodyContent = '{';
            } else if (isInBody) {
                bodyContent += '\n' + line;
                if (line.match(/^\s*}\s*$/)) {
                    isInBody = false;
                    request.body = bodyContent;
                }
            } else if (line.match(/^[\s\t]+[A-Za-z-]+:/)) {
                const [name, ...value] = line.split(':');
                request.headers[name.trim()] = value.join(':').trim();
            }
        });

        return request;
    }

    renderMetadata() {
        const metadataDiv = document.createElement('div');
        metadataDiv.className = 'api-metadata';
        
        if (this.currentMetadata.format) {
            const format = document.createElement('div');
            format.textContent = `Format: ${this.currentMetadata.format}`;
            metadataDiv.appendChild(format);
        }
        
        if (this.currentMetadata.host) {
            const host = document.createElement('div');
            host.textContent = `Host: ${this.currentMetadata.host}`;
            metadataDiv.appendChild(host);
        }

        this.previewContainer.appendChild(metadataDiv);
    }

    createSectionElement(section, sectionIndex) {
        const div = document.createElement('div');
        div.className = 'documentation-section';
        div.id = `section-${sectionIndex}`;

        const title = document.createElement('h2');
        title.textContent = section.title;
        div.appendChild(title);

        if (section.description) {
            const desc = document.createElement('div');
            desc.className = 'section-description';
            desc.innerHTML = marked.parse(section.description);
            div.appendChild(desc);
        }

        if (section.resources) {
            section.resources.forEach(resource => {
                div.appendChild(this.createResourceElement(resource, sectionIndex));
            });
        }

        return div;
    }

    createResourceElement(resource, sectionIndex, resourceIndex) {
        const div = document.createElement('div');
        div.className = 'resource-card';
        div.id = `resource-${sectionIndex}-${resourceIndex}`;

        const header = document.createElement('div');
        header.className = 'resource-header';
        header.innerHTML = `<h3>${resource.title}</h3><code>${resource.url}</code>`;
        div.appendChild(header);

        if (resource.description) {
            const desc = document.createElement('div');
            desc.className = 'resource-description';
            desc.innerHTML = marked.parse(resource.description);
            div.appendChild(desc);
        }

        if (resource.actions) {
            resource.actions.forEach(action => {
                div.appendChild(this.createActionElement(action, sectionIndex, resourceIndex));
            });
        }

        return div;
    }

    createActionElement(action, sectionIndex, resourceIndex, actionIndex) {
        const div = document.createElement('div');
        div.className = 'action-card';
        div.id = `action-${sectionIndex}-${resourceIndex}-${actionIndex}`;

        const header = document.createElement('div');
        header.className = 'action-header';
        const method = document.createElement('span');
        method.className = `method-badge method-${action.method.toLowerCase()}`;
        method.textContent = action.method;
        header.appendChild(method);
        header.innerHTML += `<span class="action-title">${action.title}</span>`;
        div.appendChild(header);

        if (action.description) {
            const desc = document.createElement('div');
            desc.className = 'action-description';
            desc.innerHTML = marked.parse(action.description);
            div.appendChild(desc);
        }

        // Renderizar parámetros, requests y responses
        if (action.parameters && action.parameters.length > 0) {
            div.appendChild(this.createParametersElement(action.parameters));
        }

        if (action.requests && action.requests.length > 0) {
            div.appendChild(this.createRequestsElement(action.requests));
        }

        if (action.responses && action.responses.length > 0) {
            div.appendChild(this.createResponsesElement(action.responses));
        }

        const tryButton = document.createElement('button');
        tryButton.className = 'btn btn-primary btn-sm';
        tryButton.textContent = 'Probar';
        tryButton.onclick = () => {
            window.httpClient.openModal(action);
        };
        div.appendChild(tryButton);

        return div;
    }

    createParametersElement(parameters) {
        const div = document.createElement('div');
        div.className = 'parameters-section';
        
        const title = document.createElement('h6');
        title.textContent = 'Parameters';
        div.appendChild(title);

        const table = document.createElement('table');
        table.className = 'table table-bordered';
        
        // Cabecera de la tabla
        const thead = document.createElement('thead');
        thead.innerHTML = `
            <tr>
                <th>Name</th>
                <th>Type</th>
                <th>Description</th>
                <th>Required</th>
                <th>Default</th>
            </tr>
        `;
        table.appendChild(thead);

        // Cuerpo de la tabla
        const tbody = document.createElement('tbody');
        parameters.forEach(param => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td><code>${param.name}</code></td>
                <td><code>${param.type}</code>${param.attributes.length ? '<br><small>' + param.attributes.join(', ') + '</small>' : ''}</td>
                <td>${param.description}</td>
                <td>${param.required ? '✓' : '–'}</td>
                <td>${param.defaultValue || '–'}</td>
            `;
            tbody.appendChild(tr);
        });
        table.appendChild(tbody);
        
        div.appendChild(table);
        return div;
    }

    createRequestsElement(requests) {
        const div = document.createElement('div');
        div.className = 'requests-section';
        
        const title = document.createElement('h6');
        title.textContent = 'Request';
        div.appendChild(title);

        requests.forEach(request => {
            const requestDiv = document.createElement('div');
            requestDiv.className = 'request-item';
            
            // Content Type
            const contentType = document.createElement('div');
            contentType.className = 'request-content-type';
            contentType.textContent = request.contentType;
            requestDiv.appendChild(contentType);

            // Headers si existen
            if (Object.keys(request.headers).length > 0) {
                const headersDiv = document.createElement('div');
                headersDiv.className = 'request-headers';
                headersDiv.innerHTML = '<h6>Headers</h6>';
                const headersPre = document.createElement('pre');
                headersPre.textContent = JSON.stringify(request.headers, null, 2);
                headersDiv.appendChild(headersPre);
                requestDiv.appendChild(headersDiv);
            }

            // Body si existe
            if (request.body) {
                const bodyDiv = document.createElement('div');
                bodyDiv.className = 'request-body';
                bodyDiv.innerHTML = '<h6>Body</h6>';
                const bodyPre = document.createElement('pre');
                const bodyCode = document.createElement('code');
                bodyCode.className = 'language-json';
                bodyCode.textContent = request.body;
                bodyPre.appendChild(bodyCode);
                bodyDiv.appendChild(bodyPre);
                requestDiv.appendChild(bodyDiv);
            }

            div.appendChild(requestDiv);
        });

        return div;
    }

    createResponsesElement(responses) {
        const div = document.createElement('div');
        div.className = 'responses-section';
        responses.forEach(response => {
            const responseDiv = document.createElement('div');
            responseDiv.className = 'response-item';
            responseDiv.innerHTML = `
                <div class="response-header">
                    <span class="response-code">Response ${response.code}</span>
                    <span class="response-type">${response.contentType}</span>
                </div>
                <pre><code class="language-json">${response.body}</code></pre>
            `;
            div.appendChild(responseDiv);
        });
        return div;
    }

    createNavigationMenu() {
        const nav = document.createElement('nav');
        nav.className = 'api-navigation';

        const ul = document.createElement('ul');
        ul.className = 'nav-list';

        this.document.sections.forEach((section, sectionIndex) => {
            const li = document.createElement('li');
            li.className = 'nav-section';
            
            const sectionLink = document.createElement('a');
            sectionLink.href = `#section-${sectionIndex}`;
            sectionLink.textContent = section.title;
            li.appendChild(sectionLink);

            if (section.resources && section.resources.length > 0) {
                const resourceList = document.createElement('ul');
                resourceList.className = 'nav-resources';

                section.resources.forEach((resource, resourceIndex) => {
                    const resourceLi = document.createElement('li');
                    resourceLi.className = 'nav-resource';
                    
                    const resourceLink = document.createElement('a');
                    resourceLink.href = `#resource-${sectionIndex}-${resourceIndex}`;
                    resourceLink.textContent = resource.title;
                    resourceLi.appendChild(resourceLink);

                    if (resource.actions && resource.actions.length > 0) {
                        const actionList = document.createElement('ul');
                        actionList.className = 'nav-actions';

                        resource.actions.forEach((action, actionIndex) => {
                            const actionLi = document.createElement('li');
                            actionLi.className = 'nav-action';
                            
                            const actionLink = document.createElement('a');
                            actionLink.href = `#action-${sectionIndex}-${resourceIndex}-${actionIndex}`;
                            const methodBadge = document.createElement('span');
                            methodBadge.className = `method-badge method-${action.method.toLowerCase()}`;
                            methodBadge.textContent = action.method;
                            actionLink.appendChild(methodBadge);
                            actionLink.appendChild(document.createTextNode(` ${action.title}`));
                            
                            actionLi.appendChild(actionLink);
                            actionList.appendChild(actionLi);
                        });

                        resourceLi.appendChild(actionList);
                    }

                    resourceList.appendChild(resourceLi);
                });

                li.appendChild(resourceList);
            }

            ul.appendChild(li);
        });

        nav.appendChild(ul);
        return nav;
    }

    openModal(action) {
        // Asegurarse de que this.currentMetadata esté definido
        const baseUrl = this.currentMetadata.host || '';
        document.getElementById('request-url').value = baseUrl + action.url;

        // ... resto del código sin cambios ...
    }
} 