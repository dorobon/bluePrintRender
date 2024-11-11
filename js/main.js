// Inicialización de la aplicación
window.addEventListener('DOMContentLoaded', () => {
    // Crear instancias de las clases principales
    window.apiEditor = new APIEditor();
    window.apiRenderer = new APIRenderer();
    window.httpClient = new HTTPClient();

    // Establecer la metadata en el cliente HTTP
    window.httpClient.setMetadata(window.apiRenderer.currentMetadata);

    // Configurar tema oscuro/claro
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('dark-theme');
        const icon = themeToggle.querySelector('i');
        icon.classList.toggle('bi-moon');
        icon.classList.toggle('bi-sun');
    });

    // Cargar ejemplo inicial
    const exampleDoc = `FORMAT: 1A
HOST: http://api.example.com

# API Example

## Question [/questions/{question_id}]

A Question object has the following attributes:

+ question
+ published_at - An ISO8601 date when the question was published.
+ url
+ choices - An array of Choice objects.

+ Parameters
    + question_id: 1 (required, number) - ID of the Question in form of an integer

### View a Questions Detail [GET]

+ Response 200 (application/json)

        {
            "question": "Favourite programming language?",
            "published_at": "2014-11-11T08:40:51.620Z",
            "url": "/questions/1",
            "choices": [
                {
                    "choice": "Swift",
                    "url": "/questions/1/choices/1",
                    "votes": 2048
                }, {
                    "choice": "Python",
                    "url": "/questions/1/choices/2",
                    "votes": 1024
                }
            ]
        }

### Create a New Question [POST]

You may create your own question using this action. It takes a JSON object containing a question and a collection of answers in the form of choices.

+ Request (application/json)

        {
            "question": "Favourite programming language?",
            "choices": [
                "Swift",
                "Python"
            ]
        }

+ Response 201 (application/json)

        {
            "question": "Favourite programming language?",
            "published_at": "2014-11-11T08:40:51.620Z",
            "url": "/questions/2",
            "choices": [
                {
                    "choice": "Swift",
                    "url": "/questions/2/choices/1",
                    "votes": 0
                }, {
                    "choice": "Python",
                    "url": "/questions/2/choices/2",
                    "votes": 0
                }
            ]
        }`;

    window.apiEditor.setValue(exampleDoc);
}); 