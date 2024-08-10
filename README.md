# Qt Project Creator CLI

A command-line tool to quickly set up a Qt project with customizable options
written in javascript.

## Installation

Install the tool globally using npm:

```bash
npm install -g qt-project-creator
```

## Usage

Run the tool to create a new Qt project:

```bash
qt-project-creator
```

### Options

- Options:
  `--init:` Initializes a default "hello-world-qt" project with cmake.

### Example

To create a new Qt project interactively:

1. Run the CLI tool:

```bash
qt-project-creator
```

2. Follow the prompts to set up your project, including selecting Qt version, build system, and whether to include a `widget.ui` file.

## Project Structure

The tool creates the following structure:

```
|project-name/
│
├── headers/
│ └── widget.h
│
├── src/
│ ├── main.cpp
│ └── widget.cpp
│
├── ui/ # (Optional) Contains .ui files if selected
│ └── widget.ui
│
├── README.md
├── LICENSE
├── CMakeLists.txt # CMake build file (if cmake is selected)
└── project-name.pro # Qt project file (if qmake is selected)
```

## Build and Run

### Manual

#### To build and run the project manually:

```bash
cd <project-name>
mkdir build && cd build && qmake && make
cd .. && ./build/<project-name>
```

### Using script

#### To build and run using the generated script:

```bash
cd <project-name>
./run.sh  # On Windows use run.bat
```

## License

MIT License. See `LICENSE` for details.
