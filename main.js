#!/usr/bin/env node

import { execSync } from "child_process";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { program } from "commander";
import figlet from "figlet";
import chalk from "chalk";
import inquirer from "inquirer";
import boxen from "boxen";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const checkQtVersion = (version) => {
  try {
    const command =
      process.platform === "win32"
        ? `where qmake && qmake -query QT_VERSION`
        : `command -v qmake && qmake -query QT_VERSION`;

    const stdout = execSync(command).toString().trim();
    const qtVersion = stdout.split("\n").pop();
    return qtVersion.startsWith(version);
  } catch {
    return false;
  }
};

const createBuildScript = (projectDir, projectName, makeTool) => {
  const isWindows = process.platform === "win32";
  const scriptExt = isWindows ? "bat" : "sh";
  const scriptName = `run.${scriptExt}`;
  const scriptContent = isWindows
    ? `@echo off
mkdir build
cd build
${makeTool === "cmake" ? "cmake .." : "qmake .."}
${makeTool === "cmake" ? "cmake --build . --config Release" : "mingw32-make"}
cd ..
.\\build\\Release\\${projectName}.exe
`
    : `#!/bin/bash
mkdir -p build
cd build
${makeTool === "cmake" ? "cmake .." : "qmake .."}
${makeTool === "cmake" ? "cmake --build . --config Release" : "make"}
cd ..
./build/${projectName}
`;

  const scriptPath = path.join(projectDir, scriptName);
  fs.writeFileSync(scriptPath, scriptContent);
  if (!isWindows) {
    fs.chmodSync(scriptPath, "755");
  }
};

const createProjectStructure = (
  projectName,
  qtVersion,
  makeTool,
  useWidgetUI
) => {
  const projectDir = path.join(process.cwd(), projectName);

  if (fs.existsSync(projectDir)) {
    throw new Error(
      `Folder '${projectName}' already exists. Please choose another name.`
    );
  }

  fs.mkdirSync(projectDir);
  ["headers", "src", useWidgetUI ? "ui" : null]
    .filter(Boolean)
    .forEach((dir) => fs.mkdirSync(path.join(projectDir, dir)));

  const files = [
    {
      path: "headers/widget.h",
      content: `
#ifndef WIDGET_H
#define WIDGET_H

#include <QWidget>
#include <QLabel>

class Widget : public QWidget {
    Q_OBJECT
public:
    explicit Widget(QWidget *parent = nullptr);
private:
    QLabel *titleLabel;
};

#endif // WIDGET_H
`,
    },
    {
      path: "src/widget.cpp",
      content: `
#include "../headers/widget.h"
#include <QVBoxLayout>

Widget::Widget(QWidget *parent) : QWidget(parent) {
    titleLabel = new QLabel("${projectName}", this);
    titleLabel->setAlignment(Qt::AlignCenter);
    
    QVBoxLayout *layout = new QVBoxLayout(this);
    layout->addWidget(titleLabel);
    setLayout(layout);
}
`,
    },
    {
      path: "src/main.cpp",
      content: `
#include <QApplication>
#include "../headers/widget.h"

int main(int argc, char *argv[]) {
    QApplication app(argc, argv);

    Widget widget;
    widget.setWindowTitle("Hello, Qt${qtVersion}!");
    widget.resize(400, 300);
    widget.show();

    return app.exec();
}
`,
    },
    {
      path: "README.md",
      content: `# ${projectName}

This is a Qt${qtVersion} application.

## Building and Running

### Automatic (using script)

Run the following command:

\`\`\`
${process.platform === "win32" ? ".\\run.bat" : "./run.sh"}
\`\`\`

### Manual

To build this project manually, use the following commands:

\`\`\`
mkdir build
cd build
${makeTool === "cmake" ? "cmake .." : "qmake .."}
${makeTool === "cmake" ? "cmake --build . --config Release" : "make"}
\`\`\`

To run the application:

\`\`\`
${
  process.platform === "win32" ? ".\\build\\Release\\" : "./build/"
}${projectName}${process.platform === "win32" ? ".exe" : ""}
\`\`\`
`,
    },
    {
      path: "LICENSE",
      content: "MIT License\n\nCopyright (c) 2024 Your Name\n",
    },
    makeTool === "cmake"
      ? {
          path: "CMakeLists.txt",
          content: `
cmake_minimum_required(VERSION 3.16)
project(${projectName} VERSION 1.0 LANGUAGES CXX)

set(CMAKE_AUTOMOC ON)
set(CMAKE_AUTORCC ON)
set(CMAKE_AUTOUIC ON)

set(CMAKE_CXX_STANDARD 17)
set(CMAKE_CXX_STANDARD_REQUIRED ON)

find_package(Qt${qtVersion} REQUIRED COMPONENTS Core Gui Widgets)

set(SOURCES
    src/main.cpp
    src/widget.cpp
)

set(HEADERS
    headers/widget.h
)

add_executable(\${PROJECT_NAME} \${SOURCES} \${HEADERS})

target_include_directories(\${PROJECT_NAME} PRIVATE headers)
target_link_libraries(\${PROJECT_NAME} PRIVATE Qt${qtVersion}::Core Qt${qtVersion}::Gui Qt${qtVersion}::Widgets)
`,
        }
      : {
          path: `${projectName}.pro`,
          content: `
QT += core gui widgets
CONFIG += c++17
TARGET = ${projectName}
TEMPLATE = app
SOURCES += src/main.cpp src/widget.cpp
HEADERS += headers/widget.h
INCLUDEPATH += headers
`,
        },
  ];

  files.forEach((file) =>
    fs.writeFileSync(path.join(projectDir, file.path), file.content.trim())
  );

  if (useWidgetUI) {
    const uiFilePath = path.join(projectDir, "ui/widget.ui");
    const uiFileContent = `
<?xml version="1.0"?>
<ui version="4.0">
 <class>Widget</class>
 <widget class="QWidget" name="Widget">
  <property name="windowTitle">
   <string>${projectName}</string>
  </property>
  <layout class="QVBoxLayout" name="verticalLayout">
   <item>
    <widget class="QLabel" name="titleLabel">
     <property name="text">
      <string>${projectName}</string>
     </property>
    </widget>
   </item>
  </layout>
 </widget>
 <connections/>
</ui>
`;
    fs.writeFileSync(uiFilePath, uiFileContent.trim());
  }

  createBuildScript(projectDir, projectName, makeTool);
};

const printHeader = () => {
  console.log(
    boxen("QT PROJECT CREATOR", {
      padding: 1,
      borderColor: "cyan",
      borderStyle: "round",
    })
  );
};

const promptUser = async () => {
  const questions = [
    {
      type: "list",
      name: "qtVersion",
      message: "Qt version:",
      choices: ["5", "6"],
      default: "6",
      loop: false,
    },
    {
      type: "list",
      name: "makeTool",
      message: "Build system:",
      choices: ["cmake", "qmake"],
      default: "cmake",
      loop: false,
    },
    {
      type: "confirm",
      name: "useWidgetUI",
      message: "Create a widget.ui file?",
      default: false,
    },
    {
      type: "input",
      name: "projectName",
      message: "Project name:",
      default: "hello-world-qt",
      validate: (input) =>
        !fs.existsSync(path.join(process.cwd(), input)) ||
        "Folder already exists. Please choose another name.",
    },
  ];

  const answers = {};
  for (const question of questions) {
    console.clear();
    printHeader();
    console.log(chalk.yellow("Press 'CTRL + C' to abort the process."));

    const answer = await inquirer.prompt({
      ...question,
      validate: async (input) => {
        if (input === "q") {
          console.log(chalk.red("Aborted by user."));
          process.exit(0);
        }
        return question.validate ? question.validate(input) : true;
      },
    });

    if (question.name === "qtVersion") {
      const isAvailable = await checkQtVersion(answer.qtVersion);
      if (!isAvailable) {
        console.error(
          chalk.red(`Qt${answer.qtVersion} is not installed or not in PATH.`)
        );
        process.exit(1);
      }
    }

    answers[question.name] = answer[question.name];
  }
  return answers;
};

const displayBuildAndRunInstructions = (projectName, makeTool) => {
  console.clear();
  console.log(
    boxen(
      `
-----------------------------------------------------
  Project Created successfully
-----------------------------------------------------
To build and run the app:
${chalk.italic.cyan(`cd ${projectName}`)}
${chalk.italic.cyan("mkdir build && cd build && qmake && make")}
${chalk.italic.cyan(
  `cd .. && ./build/${projectName}${process.platform === "win32" ? ".exe" : ""}`
)}
${chalk.bold.yellowBright("OR")}
Build and Run using script:
${chalk.italic.cyan(`cd ${projectName}`)}
${chalk.italic.cyan(`./run${process.platform === "win32" ? ".bat" : ".sh"}`)}
    `,
      {
        padding: 1,
        borderColor: "cyan",
        borderStyle: "round",
        textAlignment: "center",
      }
    )
  );
};

const main = async () => {
  program
    .version("1.0.0")
    .description("CLI tool to set up a Qt project structure")
    .option("--init", "Initialize a default hello-world-qt project with cmake");

  program.parse(process.argv);

  const options = program.opts();

  console.clear();
  printHeader();

  if (options.init) {
    console.log(chalk.cyan("Initializing project..."));

    const qtVersion = "6";
    if (!checkQtVersion(qtVersion)) {
      console.error(
        chalk.red(`Qt${qtVersion} is not installed or not in PATH.`)
      );
      process.exit(1);
    }
    const projectName = "hello-world-qt";
    createProjectStructure(projectName, qtVersion, "cmake", false);
    displayBuildAndRunInstructions(projectName, "cmake");
  } else {
    const { projectName, qtVersion, makeTool, useWidgetUI } =
      await promptUser();
    createProjectStructure(projectName, qtVersion, makeTool, useWidgetUI);
    displayBuildAndRunInstructions(projectName, makeTool);
  }
};

main().catch((err) => {
  console.error(chalk.red("An error occurred:"), err);
  process.exit(1);
});
