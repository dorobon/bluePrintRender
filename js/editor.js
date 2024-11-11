window.APIEditor = class APIEditor {
    constructor() {
        this.editor = CodeMirror(document.getElementById('editor'), {
            mode: 'markdown',
            theme: 'monokai',
            lineNumbers: true,
            lineWrapping: true,
            indentUnit: 4,
            autoCloseBrackets: true,
            matchBrackets: true,
            extraKeys: {
                "Ctrl-S": function(cm) {
                    document.getElementById('save-doc').click();
                }
            }
        });

        this.setupEventListeners();
    }

    setupEventListeners() {
        this.editor.on('change', () => {
            this.updatePreview();
        });
    }

    updatePreview() {
        const content = this.editor.getValue();
        window.apiRenderer.render(content);
    }

    setValue(content) {
        this.editor.setValue(content);
    }

    getValue() {
        return this.editor.getValue();
    }
} 