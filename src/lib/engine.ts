import * as acorn from 'acorn';

export const processCode = (code: string) => {
  try {
    const ast = acorn.parse(code, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      locations: true,
    });

    // 1. Split code into lines so we can inject line numbers
    const lines = code.split('\n');
    const instrumentedLines = lines.map((lineContent, index) => {
      const lineNum = index + 1;
      // Inject a line tracker variable at the start of every line
      let l = `__line = ${lineNum}; ` + lineContent;

      // 2. Apply our trace replacements
      return l
        .replace(/(?<!\()(\bconst|let|var)\s+(\w+)\s*=\s*([^;)\n]+);?/g, 
          '$1 $2 = $3; trace("VAR_SET", { name: "$2", value: $2, line: __line });')
        .replace(/function\s+(\w+)\s*\(([^)]*)\)\s*\{/g, 
          'function $1($2) { trace("FUNC_CALL", { name: "$1", args: [$2], line: __line });')
        .replace(/console\.log\((.*)\);?/g, 
          'trace("CONSOLE_LOG", { value: $1, line: __line }); console.log($1);')
        .replace(/return\s+([^;}\n]+);?/g, 
          'const __ret = $1; trace("FUNC_RETURN", { value: __ret, line: __line }); return __ret;');
    });

    const finalCode = `
      const __logs = [];
      const __memory = {}; 
      let __line = 0; // Initialize the line tracker
      
      const trace = (type, data) => {
        if (type === "VAR_SET") __memory[data.name] = data.value;
        __logs.push({ 
          type, 
          ...data, 
          line: data.line || __line,
          memorySnapshot: JSON.parse(JSON.stringify(__memory)) 
        });
      };
      
      try {
        ${instrumentedLines.join('\n')}
      } catch (err) {
        throw err;
      }
      return __logs;
    `;

    return { success: true, ast, instrumented: finalCode, error: null };
  } catch (err: any) {
    return { 
      success: false, 
      error: {
        type: 'Syntax Error',
        message: err.message,
        line: err.loc?.line || 1,
        column: err.loc?.column || 0,
        hint: "Check for syntax typos or unclosed brackets."
      } 
    };
  }
};