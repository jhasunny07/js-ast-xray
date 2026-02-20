import * as parser from "@babel/parser";
import traverse from "@babel/traverse";
import generate from "@babel/generator";
import * as t from "@babel/types";

export const processCode = (code: string) => {
  try {
    const ast = parser.parse(code, {
      sourceType: "module",
      plugins: ["jsx"],
    });

    traverse(ast, {
      // 1. Fixed Variable Tracking
      VariableDeclaration(path) {
        // Safety: Don't instrument if inside a loop head (like for(let i...))
        if (t.isFor(path.parent) || t.isForInStatement(path.parent) || t.isForOfStatement(path.parent)) return;

        const line = path.node.loc?.start.line || 0;
        path.node.declarations.forEach((decl) => {
          if (t.isIdentifier(decl.id)) {
            const name = decl.id.name;
            // Insert AFTER the declaration
            path.insertAfter(
              t.expressionStatement(
                t.callExpression(t.identifier("__track"), [
                  t.numericLiteral(line),
                  t.stringLiteral("VARIABLE_CHANGE"),
                  t.stringLiteral(name), // Pass name as string
                  t.identifier(name)     // Pass actual value
                ])
              )
            );
          }
        });
      },

      // 2. Fixed Function Entry/Exit (The Call Stack)
      // Use "enter" and "exit" to ensure we catch everything
  // Inside traverse(ast, { ... }) in lib/engine.ts

Function: {
  enter(path) {
    const node = path.node as any;
    const name = node.id?.name || "anonymous";
    const line = node.loc?.start.line || 0;
    const params = node.params.map((p: any) => p.name); // Get parameter names ['n', 'x']

    const body = path.get("body");
    if (body.isBlockStatement()) {
      body.unshiftContainer("body", 
        t.expressionStatement(
          t.callExpression(t.identifier("__track"), [
            t.numericLiteral(line),
            t.stringLiteral("ENTER_FUNCTION"),
            t.stringLiteral(name),
            // Pass an object mapping param names to their actual values
            t.objectExpression(
              params.map((p: string) => 
                t.objectProperty(t.identifier(p), t.identifier(p))
              )
            )
          ])
        )
      );
    }
  },
  // ... keep exit and ReturnStatement logic from previous step

        exit(path) {
          const line = path.node.loc?.end.line || 0;
          const body = path.get("body");
          if (body.isBlockStatement()) {
            body.pushContainer("body", 
              t.expressionStatement(
                t.callExpression(t.identifier("__track"), [
                  t.numericLiteral(line),
                  t.stringLiteral("EXIT_FUNCTION")
                ])
              )
            );
          }
        }
      },

      // 3. Track Console Logs
      CallExpression(path) {
        const { callee } = path.node;
        if (
          t.isMemberExpression(callee) &&
          t.isIdentifier(callee.object, { name: "console" }) &&
          t.isIdentifier(callee.property, { name: "log" })
        ) {
          const line = path.node.loc?.start.line || 0;
          const arg = path.node.arguments[0] || t.identifier("undefined");
          
          path.insertAfter(
            t.expressionStatement(
              t.callExpression(t.identifier("__track"), [
                t.numericLiteral(line),
                t.stringLiteral("CONSOLE_LOG"),
                t.stringLiteral("log"), // placeholder
                arg as any
              ])
            )
          );
        }
      }
    });

    // The runtime environment that actually executes the code
    const instrumented = `
      const __logs = [];
      const __memory = {};
      
      const __track = (line, type, label, value) => {
        if (type === "VARIABLE_CHANGE") {
          __memory[label] = value;
        }
        
        __logs.push({
          line,
          type,
          name: type === "ENTER_FUNCTION" ? label : undefined,
          value: type === "CONSOLE_LOG" ? value : undefined,
          memorySnapshot: JSON.parse(JSON.stringify(__memory)) // Deep copy
        });
      };

      try {
        ${generate(ast).code}
      } catch (err) {
        __logs.push({ line: 0, type: "ERROR", value: err.message });
      }
      
      return __logs;
    `;

    return {
      success: true,
      ast: parser.parse(code, { sourceType: "module" }), 
      instrumented
    };
  } catch (e: any) {
    return { success: false, error: e };
  }
};