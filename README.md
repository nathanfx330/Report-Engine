# Report Engine

A Flask-based web application for organizing narrative data and building context-rich prompts for large language models (LLMs).

---

## About The Project

Report Engine is a tool for structuring complex information. It allows users to define entities (people, organizations), locations, and a sequence of events, then link them together. The primary output is a structured, context-aware prompt that can be used with large language models or for general-purpose reporting.

The application is entirely self-hosted and uses a local SQLite database for storage.

---

## Features

-   **Manage Core Elements:** Define and manage lists of entities (people, organizations) and locations.
-   **Construct Event Timelines:** Create event blocks that detail what happened, where, when, why, and who was involved.
-   **Link Entities to Events:** A searchable multi-select list allows for efficient linking of many entities to an event, with a visual summary of the current selection.
-   **Customizable Prompt Templates:** The application includes several default prompt templates. Users can also create, save, and manage their own custom templates. Default templates cannot be deleted.
-   **Session and Snapshot Management:** Work is auto-saved to a persistent session. Users can also save the current state as a named snapshot for later retrieval.
-   **Data Portability:** Scenarios can be exported to and imported from JSON files for backup or sharing.
-   **Local and Private:** Runs locally on your machine. No cloud services are used and no user data is tracked.

---

## Tech Stack

-   **Backend:** Flask, Flask-SQLAlchemy
-   **Database:** SQLite
-   **Frontend:** Vanilla JavaScript (ES6+), HTML5, CSS3

---

## Setup (Anaconda Workflow)

### Prerequisites

Install [Anaconda](https://www.anaconda.com/products/distribution) or [Miniconda](https://docs.conda.io/en/latest/miniconda.html).

### Install & Run

1.  **Clone the repository**

    ```bash
    git clone https://github.com/nathanfx330/Report-Engine.git
    cd Report-Engine
    ```

2.  **Create and activate a conda environment**

    ```bash
    conda create -n reportengine python=3.10
    conda activate reportengine
    ```

3.  **Install dependencies**

    ```bash
    pip install -r requirements.txt
    ```

4.  **Run the app**

    ```bash
    python app.py
    ```

5.  **Open your browser** to `http://127.0.0.1:5000`

On the first run, a `project.db` file will be created inside an `instance/` folder.

---

## Roadmap

-   LLM API integration to run prompts directly from the application.
-   A graph-based view to visualize relationships between entities and events.
-   Optional local user accounts to manage separate projects.

---

## Contributing

Issues and pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

---

## License

MIT License  
Copyright (c) 2025 nathanfx330

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the “Software”), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED “AS IS”, WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.
