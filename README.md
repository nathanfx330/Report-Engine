# Report Engine

A prompt engine that uses fact blocks. Flask-based web app for organizing narrative data—characters, events, and locations—into structured timelines and scenarios for building context-rich prompts for LLMs.
---

## About

**Report Engine** helps you keep track of layered stories, people, and events. Whether you're writing, investigating, or worldbuilding, it gives you a stable way to:

- Create and manage characters, locations, and events
- Build timelines and interlink elements
- Export everything into a structured format usable with LLMs or other tools

It autosaves, supports manual snapshots, and stores everything in a local SQLite database. No logins. No tracking. Runs on your machine.

---

## Tech Stack

- Flask – Python web framework
- Flask-SQLAlchemy – ORM for SQLite
- SQLite – File-based database
- Vanilla JavaScript (ES6+)
- HTML5 & CSS3

---

## Setup (Anaconda Workflow)

### Prerequisites

Install [Anaconda](https://www.anaconda.com/products/distribution) or [Miniconda](https://docs.conda.io/en/latest/miniconda.html).

### Install & Run

1. Clone the repository

    ```bash
    git clone https://github.com/nathanfx330/Report-Engine.git
    cd Report-Engine
    ```

2. Create and activate a conda environment

    ```bash
    conda create -n reportengine python=3.10
    conda activate reportengine
    ```

3. Install dependencies

    ```bash
    pip install -r requirements.txt
    ```

4. Run the app

    ```bash
    python app.py
    ```

5. Open your browser

    ```
    http://127.0.0.1:5000
    ```

On first run, a `project.db` file will be created inside an `instance/` folder.

---

## Roadmap

Planned features:

- [ ] Basic local user accounts (optional)
- [ ] LLM API integration
- [ ] Visual graph of character/event relationships

--i

Issues and suggestions are also welcome. No ceremony required.

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

