



# JS-XRAY: Visual AST & Runtime Debugger

**JS-XRAY** is a specialized developer tool that provides a "X-Ray" view of JavaScript execution. It parses code into an Abstract Syntax Tree (AST) and instrumentally executes it line-by-line to visualize how logic flows through the tree and how memory state changes in real-time.



## 🛠 Features
* **Live AST Visualization:** Converts source code into a navigable tree using a custom engine.
* **Synchronized Execution:** Highlights the active AST node as the code executes.
* **Real-time Memory Tracking:** A dedicated panel to watch variable assignments and value changes.
* **Interactive Controls:** Play, pause, and step through code execution like a professional debugger.
* **Dual-Theme Interface:** High-contrast Dark and Light modes.

---

## 🚫 Code Execution Constraints
To maintain a predictable visual timeline, the engine operates within a **Synchronous Sandbox**. The following code types will **NOT** work:

### 1. Asynchronous Operations
* **Unsupported:** `fetch()`, `setTimeout()`, `Promises`, `async/await`.
* **Reason:** The visualization is a linear sequence. Async code "jumps" outside of this timeline, making it impossible to map back to the AST tree without a complex event-loop simulator.

### 2. DOM Manipulation
* **Unsupported:** `document.querySelector()`, `alert()`, `window.addEventListener()`.
* **Reason:** This is a **Logic Engine**, not a browser emulator. There is no HTML document inside the sandbox.

### 3. External Modules
* **Unsupported:** `import` or `require` statements.
* **Reason:** All code must be self-contained. The engine does not have access to npm packages.

### 4. Deep Prototype Inheritance
* **Unsupported:** Legacy `__proto__` property tracking.
* **Reason:** The Memory Trace panel captures "Own Properties." It will not automatically "crawl" the prototype chain to show inherited properties unless they are explicitly accessed.

---

## ⚠️ Known Technical Limitations

| Limitation | Effect |
| :--- | :--- |
| **Circular References** | Objects referring to themselves will crash the Memory Snapshot. |
| **Infinite Loops** | A `while(true)` loop will freeze the browser tab. |
| **Hoisting** | The AST tree highlights the *physical* location of the code, not the logical "hoisted" position. |
| **Strict Mode** | The engine enforces strict parsing; missing semicolons or redeclaring `const` triggers a Syntax Error. |



---

## 📖 How it Works
1. **Parsing:** Source code is converted into a hierarchical "Node" tree.
2. **Instrumentation:** The engine injects "trackers" into your code before execution.
3. **Execution:** Instrumented code runs inside a `new Function()` sandbox.
4. **Visualization:** Results map back to the UI to update the **Logic Tree** and **Memory Trace**.

---

## 🚀 Getting Started
1. Clone the repository.
2. Install dependencies: `npm install`.
3. Run the development server: `npm run dev`.
4. Open `localhost:3000` and start debugging!