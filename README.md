# Report Engine

A Flask-powered web application for building complex narrative scenarios and generating structured prompts for Large Language Models (LLMs).

![Report Engine Screenshot](placeholder.png)
*(Note: Replace `placeholder.png` with an actual screenshot of your application!)*

## About The Project

Report Engine is a tool designed for writers, investigators, game masters, and creators who need to track complex relationships between multiple characters, locations, and events. It provides a fluid, dynamic interface for building a timeline of events and then synthesizes this structured data into a high-quality, context-rich prompt ready to be used with any LLM.

The core philosophy is to empower iterative creation without losing work. The application features a robust auto-save system, named "snapshot" saving, and a "Recent Scenarios" browser, all powered by a Flask backend and a local SQLite database.

### Built With

*   [Flask](https://flask.palletsprojects.com/) - The core web framework.
*   [Flask-SQLAlchemy](https://flask-sqlalchemy.palletsprojects.com/) - For elegant database management.
*   [SQLite](https://www.sqlite.org/) - For simple, file-based database storage.
*   Vanilla JavaScript (ES6+) - For all dynamic frontend logic.
*   HTML5 & CSS3

## Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

You will need Python 3 and its package manager, pip, installed on your system.
*   [Python 3](https://www.python.org/downloads/)

### Installation

1.  **Clone the repo**
    ```sh
    git clone https://github.com/your_username/report-engine.git
    ```
2.  **Navigate to the project directory**
    ```sh
    cd report-engine
    ```
3.  **Create and activate a virtual environment (Recommended)**
    *   On Windows:
        ```sh
        python -m venv venv
        .\venv\Scripts\activate
        ```
    *   On macOS/Linux:
        ```sh
        python3 -m venv venv
        source venv/bin/activate
        ```
4.  **Install Python packages**
    ```sh
    pip install -r requirements.txt
    ```

### Usage

1.  **Run the Flask application**
    ```sh
    python app.py
    ```
2.  The server will start, and the first time it runs, it will create an `instance` folder and a `project.db` file to store your data.
3.  **Open your web browser** and navigate to:
    ```
    http://127.0.0.1:5000
    ```

## Roadmap

See the [open issues](https://github.com/your_username/report-engine/issues) for a full list of proposed features (and known issues). Key future ideas include:

-   [ ] User Accounts & Authentication
-   [ ] Direct, secure LLM API integration
-   [ ] Export reports as PDF or DOCX
-   [ ] Visual relationship graph between entities

## Contributing

Contributions are what make the open-source community such an amazing place to learn, inspire, and create. Any contributions you make are **greatly appreciated**.

If you have a suggestion that would make this better, please fork the repo and create a pull request. You can also simply open an issue with the tag "enhancement".
Don't forget to give the project a star! Thanks again!

1.  Fork the Project
2.  Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3.  Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4.  Push to the Branch (`git push origin feature/AmazingFeature`)
5.  Open a Pull Request

## License

Distributed under the MIT License. See `LICENSE` for more information.

## Acknowledgments

This project was built through a collaborative, iterative process. Thanks to all who provided feedback and guidance.
