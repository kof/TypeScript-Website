define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.twoslashCompletions = exports.parsePrimitive = exports.extractTwoSlashCompilerOptions = void 0;
    const booleanConfigRegexp = /^\/\/\s?@(\w+)$/;
    // https://regex101.com/r/8B2Wwh/1
    const valuedConfigRegexp = /^\/\/\s?@(\w+):\s?(.+)$/;
    /**
     * This is a port of the twoslash bit which grabs compiler options
     * from the source code
     */
    const extractTwoSlashCompilerOptions = (ts) => {
        let optMap = new Map();
        if (!("optionDeclarations" in ts)) {
            console.error("Could not get compiler options from ts.optionDeclarations - skipping twoslash support.");
        }
        else {
            // @ts-ignore - optionDeclarations is not public API
            for (const opt of ts.optionDeclarations) {
                optMap.set(opt.name.toLowerCase(), opt);
            }
        }
        return (code) => {
            const codeLines = code.split("\n");
            const options = {};
            codeLines.forEach(_line => {
                let match;
                const line = _line.trim();
                if ((match = booleanConfigRegexp.exec(line))) {
                    if (optMap.has(match[1].toLowerCase())) {
                        options[match[1]] = true;
                        setOption(match[1], "true", options, optMap);
                    }
                }
                else if ((match = valuedConfigRegexp.exec(line))) {
                    if (optMap.has(match[1].toLowerCase())) {
                        setOption(match[1], match[2], options, optMap);
                    }
                }
            });
            return options;
        };
    };
    exports.extractTwoSlashCompilerOptions = extractTwoSlashCompilerOptions;
    function setOption(name, value, opts, optMap) {
        const opt = optMap.get(name.toLowerCase());
        if (!opt)
            return;
        switch (opt.type) {
            case "number":
            case "string":
            case "boolean":
                opts[opt.name] = parsePrimitive(value, opt.type);
                break;
            case "list":
                opts[opt.name] = value.split(",").map(v => parsePrimitive(v, opt.element.type));
                break;
            default:
                opts[opt.name] = opt.type.get(value.toLowerCase());
                if (opts[opt.name] === undefined) {
                    const keys = Array.from(opt.type.keys());
                    console.log(`Invalid value ${value} for ${opt.name}. Allowed values: ${keys.join(",")}`);
                }
        }
    }
    function parsePrimitive(value, type) {
        switch (type) {
            case "number":
                return +value;
            case "string":
                return value;
            case "boolean":
                return value.toLowerCase() === "true" || value.length === 0;
        }
        console.log(`Unknown primitive type ${type} with - ${value}`);
    }
    exports.parsePrimitive = parsePrimitive;
    // Function to generate autocompletion results
    const twoslashCompletions = (ts, monaco) => (model, position, _token) => {
        const result = [];
        // Split everything the user has typed on the current line up at each space, and only look at the last word
        const thisLine = model.getValueInRange({
            startLineNumber: position.lineNumber,
            startColumn: 0,
            endLineNumber: position.lineNumber,
            endColumn: position.column,
        });
        // Not a comment
        if (!thisLine.startsWith("//")) {
            return { suggestions: [] };
        }
        const words = thisLine.replace("\t", "").split(" ");
        // Not the right amount of
        if (words.length !== 2) {
            return { suggestions: [] };
        }
        const word = words[1];
        if (word.startsWith("-")) {
            return {
                suggestions: [
                    {
                        label: "---cut---",
                        kind: 14,
                        detail: "Twoslash split output",
                        insertText: "---cut---".replace(word, ""),
                    },
                ],
            };
        }
        // Not a @ at the first word
        if (!word.startsWith("@")) {
            return { suggestions: [] };
        }
        const knowns = [
            "noErrors",
            "errors",
            "showEmit",
            "showEmittedFile",
            "noStaticSemanticInfo",
            "emit",
            "noErrorValidation",
            "filename",
        ];
        // @ts-ignore - ts.optionDeclarations is private
        const optsNames = ts.optionDeclarations.map(o => o.name);
        knowns.concat(optsNames).forEach(name => {
            if (name.startsWith(word.slice(1))) {
                // somehow adding the range seems to not give autocomplete results?
                result.push({
                    label: name,
                    kind: 14,
                    detail: "Twoslash comment",
                    insertText: name,
                });
            }
        });
        return {
            suggestions: result,
        };
    };
    exports.twoslashCompletions = twoslashCompletions;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHdvc2xhc2hTdXBwb3J0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc2FuZGJveC9zcmMvdHdvc2xhc2hTdXBwb3J0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7SUFBQSxNQUFNLG1CQUFtQixHQUFHLGlCQUFpQixDQUFBO0lBRTdDLGtDQUFrQztJQUNsQyxNQUFNLGtCQUFrQixHQUFHLHlCQUF5QixDQUFBO0lBS3BEOzs7T0FHRztJQUVJLE1BQU0sOEJBQThCLEdBQUcsQ0FBQyxFQUFNLEVBQUUsRUFBRTtRQUN2RCxJQUFJLE1BQU0sR0FBRyxJQUFJLEdBQUcsRUFBZSxDQUFBO1FBRW5DLElBQUksQ0FBQyxDQUFDLG9CQUFvQixJQUFJLEVBQUUsQ0FBQyxFQUFFO1lBQ2pDLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0ZBQXdGLENBQUMsQ0FBQTtTQUN4RzthQUFNO1lBQ0wsb0RBQW9EO1lBQ3BELEtBQUssTUFBTSxHQUFHLElBQUksRUFBRSxDQUFDLGtCQUFrQixFQUFFO2dCQUN2QyxNQUFNLENBQUMsR0FBRyxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsV0FBVyxFQUFFLEVBQUUsR0FBRyxDQUFDLENBQUE7YUFDeEM7U0FDRjtRQUVELE9BQU8sQ0FBQyxJQUFZLEVBQUUsRUFBRTtZQUN0QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFBO1lBQ2xDLE1BQU0sT0FBTyxHQUFHLEVBQVMsQ0FBQTtZQUV6QixTQUFTLENBQUMsT0FBTyxDQUFDLEtBQUssQ0FBQyxFQUFFO2dCQUN4QixJQUFJLEtBQUssQ0FBQTtnQkFDVCxNQUFNLElBQUksR0FBRyxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUE7Z0JBQ3pCLElBQUksQ0FBQyxLQUFLLEdBQUcsbUJBQW1CLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxDQUFDLEVBQUU7b0JBQzVDLElBQUksTUFBTSxDQUFDLEdBQUcsQ0FBQyxLQUFL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LElBQUksQ0FBQyxVQUFVLENBQUMsR0FBRyxDQUFDLEVBQUU7WUFDekIsT0FBTyxFQUFFLFdBQVcsRUFBRSxFQUFFLEVBQUUsQ0FBQTtTQUMzQjtRQUVELE1BQU0sTUFBTSxHQUFHO1lBQ2IsVUFBVTtZQUNWLFFBQVE7WUFDUixVQUFVO1lBQ1YsaUJBQWlCO1lBQ2pCLHNCQUFzQjtZQUN0QixNQUFNO1lBQ04sbUJBQW1CO1lBQ25CLFVBQVU7U0FDWCxDQUFBO1FBQ0QsZ0RBQWdEO1FBQ2hELE1BQU0sU0FBUyxHQUFHLEVBQUUsQ0FBQyxrQkFBa0IsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEVBQUUsQ0FBQyxDQUFDLENBQUMsSUFBSSxDQUFDLENBQUE7UUFDeEQsTUFBTSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLEVBQUU7WUFDdEMsSUFBSSxJQUFJLENBQUMsVUFBVSxDQUFDLElBQUksQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtnQkFDbEMsbUVBQW1FO2dCQUNuRSxNQUFNLENBQUMsSUFBSSxDQUFDO29CQUNWLEtBQUssRUFBRSxJQUFJO29CQUNYLElBQUksRUFBRSxFQUFFO29CQUNSLE1BQU0sRUFBRSxrQkFBa0I7b0JBQzFCLFVBQVUsRUFBRSxJQUFJO2lCQUNWLENBQUMsQ0FBQTthQUNWO1FBQ0gsQ0FBQyxDQUFDLENBQUE7UUFFRixPQUFPO1lBQ0wsV0FBVyxFQUFFLE1BQU07U0FDcEIsQ0FBQTtJQUNILENBQUMsQ0FBQTtJQXpFWSxRQUFBLG1CQUFtQix1QkF5RS9CIiwic291cmNlc0NvbnRlbnQiOlsiY29uc3QgYm9vbGVhbkNvbmZpZ1JlZ2V4cCA9IC9eXFwvXFwvXFxzP0AoXFx3KykkL1xuXG4vLyBodHRwczovL3JlZ2V4MTAxLmNvbS9yLzhCMld3aC8xXG5jb25zdCB2YWx1ZWRDb25maWdSZWdleHAgPSAvXlxcL1xcL1xccz9AKFxcdyspOlxccz8oLispJC9cblxudHlwZSBUUyA9IHR5cGVvZiBpbXBvcnQoXCJ0eXBlc2NyaXB0XCIpXG50eXBlIENvbXBpbGVyT3B0aW9ucyA9IGltcG9ydChcInR5cGVzY3JpcHRcIikuQ29tcGlsZXJPcHRpb25zXG5cbi8qKlxuICogVGhpcyBpcyBhIHBvcnQgb2YgdGhlIHR3b3NsYXNoIGJpdCB3aGljaCBncmFicyBjb21waWxlciBvcHRpb25zXG4gKiBmcm9tIHRoZSBzb3VyY2UgY29kZVxuICovXG5cbmV4cG9ydCBjb25zdCBleHRyYWN0VHdvU2xhc2hDb21waWxlck9wdGlvbnMgPSAodHM6IFRTKSA9PiB7XG4gIGxldCBvcHRNYXAgPSBuZXcgTWFwPHN0cmluZywgYW55PigpXG5cbiAgaWYgKCEoXCJvcHRpb25EZWNsYXJhdGlvbnNcIiBpbiB0cykpIHtcbiAgICBjb25zb2xlLmVycm9yKFwiQ291bGQgbm90IGdldCBjb21waWxlciBvcHRpb25zIGZyb20gdHMub3B0aW9uRGVjbGFyYXRpb25zIC0gc2tpcHBpbmcgdHdvc2xhc2ggc3VwcG9ydC5cIilcbiAgfSBlbHNlIHtcbiAgICAvLyBAdHMtaWdub3JlIC0gb3B0aW9uRGVjbGFyYXRpb25zIGlzIG5vdCBwdWJsaWMgQVBJXG4gICAgZm9yIChjb25zdCBvcHQgb2YgdHMub3B0aW9uRGVjbGFyYXRpb25zKSB7XG4gICAgICBvcHRNYXAuc2V0KG9wdC5uYW1lLnRvTG93ZXJDYXNlKCksIG9wdClcbiAgICB9XG4gIH1cblxuICByZXR1cm4gKGNvZGU6IHN0cmluZykgPT4ge1xuICAgIGNvbnN0IGNvZGVMaW5lcyA9IGNvZGUuc3BsaXQoXCJcXG5cIilcbiAgICBjb25zdCBvcHRpb25zID0ge30gYXMgYW55XG5cbiAgICBjb2RlTGluZXMuZm9yRWFjaChfbGluZSA9PiB7XG4gICAgICBsZXQgbWF0Y2hcbiAgICAgIGNvbnN0IGxpbmUgPSBfbGluZS50cmltKClcbiAgICAgIGlmICgobWF0Y2ggPSBib29sZWFuQ29uZmlnUmVnZXhwLmV4ZWMobGluZSkpKSB7XG4gICAgICAgIGlmIChvcHRNYXAuaGFzKG1hdGNoWzFdLnRvTG93ZXJDYXNlKCkpKSB7XG4gICAgICAgICAgb3B0aW9uc1ttYXRjaFsxXV0gPSB0cnVlXG4gICAgICAgICAgc2V0T3B0aW9uKG1hdGNoWzFdLCBcInRydWVcIiwgb3B0aW9ucywgb3B0TWFwKVxuICAgICAgICB9XG4gICAgICB9IGVsc2UgaWYgKChtYXRjaCA9IHZhbHVlZENvbmZpZ1JlZ2V4cC5leGVjKGxpbmUpKSkge1xuICAgICAgICBpZiAob3B0TWFwLmhhcyhtYXRjaFsxXS50b0xvd2VyQ2FzZSgpKSkge1xuICAgICAgICAgIHNldE9wdGlvbihtYXRjaFsxXSwgbWF0Y2hbMl0sIG9wdGlvbnMsIG9wdE1hcClcbiAgICAgICAgfVxuICAgICAgfVxuICAgIH0pXG4gICAgcmV0dXJuIG9wdGlvbnNcbiAgfVxufVxuXG5mdW5jdGlvbiBzZXRPcHRpb24obmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nLCBvcHRzOiBDb21waWxlck9wdGlvbnMsIG9wdE1hcDogTWFwPHN0cmluZywgYW55Pikge1xuICBjb25zdCBvcHQgPSBvcHRNYXAuZ2V0KG5hbWUudG9Mb3dlckNhc2UoKSlcblxuICBpZiAoIW9wdCkgcmV0dXJuXG4gIHN3aXRjaCAob3B0LnR5cGUpIHtcbiAgICBjYXNlIFwibnVtYmVyXCI6XG4gICAgY2FzZSBcInN0cmluZ1wiOlxuICAgIGNhc2UgXCJib29sZWFuXCI6XG4gICAgICBvcHRzW29wdC5uYW1lXSA9IHBhcnNlUHJpbWl0aXZlKHZhbHVlLCBvcHQudHlwZSlcbiAgICAgIGJyZWFrXG5cbiAgICBjYXNlIFwibGlzdFwiOlxuICAgICAgb3B0c1tvcHQubmFtZV0gPSB2YWx1ZS5zcGxpdChcIixcIikubWFwKHYgPT4gcGFyc2VQcmltaXRpdmUodiwgb3B0LmVsZW1lbnQhLnR5cGUgYXMgc3RyaW5nKSlcbiAgICAgIGJyZWFrXG5cbiAgICBkZWZhdWx0OlxuICAgICAgb3B0c1tvcHQubmFtZV0gPSBvcHQudHlwZS5nZXQodmFsdWUudG9Mb3dlckNhc2UoKSlcblxuICAgICAgaWYgKG9wdHNbb3B0Lm5hbWVdID09PSB1bmRlZmluZWQpIHtcbiAgICAgICAgY29uc3Qga2V5cyA9IEFycmF5LmZyb20ob3B0LnR5cGUua2V5cygpIGFzIGFueSlcbiAgICAgICAgY29uc29sZS5sb2coYEludmFsaWQgdmFsdWUgJHt2YWx1ZX0gZm9yICR7b3B0Lm5hbWV9LiBBbGxvd2VkIHZhbHVlczogJHtrZXlzLmpvaW4oXCIsXCIpfWApXG4gICAgICB9XG4gIH1cbn1cblxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlUHJpbWl0aXZlKHZhbHVlOiBzdHJpbmcsIHR5cGU6IHN0cmluZyk6IGFueSB7XG4gIHN3aXRjaCAodHlwZSkge1xuICAgIGNhc2UgXCJudW1iZXJcIjpcbiAgICAgIHJldHVybiArdmFsdWVcbiAgICBjYXNlIFwic3RyaW5nXCI6XG4gICAgICByZXR1cm4gdmFsdWVcbiAgICBjYXNlIFwiYm9vbGVhblwiOlxuICAgICAgcmV0dXJuIHZhbHVlLnRvTG93ZXJDYXNlKCkgPT09IFwidHJ1ZVwiIHx8IHZhbHVlLmxlbmd0aCA9PT0gMFxuICB9XG4gIGNvbnNvbGUubG9nKGBVbmtub3duIHByaW1pdGl2ZSB0eXBlICR7dHlwZX0gd2l0aCAtICR7dmFsdWV9YClcbn1cblxuLy8gRnVuY3Rpb24gdG8gZ2VuZXJhdGUgYXV0b2NvbXBsZXRpb24gcmVzdWx0c1xuZXhwb3J0IGNvbnN0IHR3b3NsYXNoQ29tcGxldGlvbnMgPSAodHM6IFRTLCBtb25hY286IHR5cGVvZiBpbXBvcnQoXCJtb25hY28tZWRpdG9yXCIpKSA9PiAoXG4gIG1vZGVsOiBpbXBvcnQoXCJtb25hY28tZWRpdG9yXCIpLmVkaXRvci5JVGV4dE1vZGVsLFxuICBwb3NpdGlvbjogaW1wb3J0KFwibW9uYWNvLWVkaXRvclwiKS5Qb3NpdGlvbixcbiAgX3Rva2VuOiBhbnlcbik6IGltcG9ydChcIm1vbmFjby1lZGl0b3JcIikubGFuZ3VhZ2VzLkNvbXBsZXRpb25MaXN0ID0+IHtcbiAgY29uc3QgcmVzdWx0OiBpbXBvcnQoXCJtb25hY28tZWRpdG9yXCIpLmxhbmd1YWdlcy5Db21wbGV0aW9uSXRlbVtdID0gW11cblxuICAvLyBTcGxpdCBldmVyeXRoaW5nIHRoZSB1c2VyIGhhcyB0eXBlZCBvbiB0aGUgY3VycmVudCBsaW5lIHVwIGF0IGVhY2ggc3BhY2UsIGFuZCBvbmx5IGxvb2sgYXQgdGhlIGxhc3Qgd29yZFxuICBjb25zdCB0aGlzTGluZSA9IG1vZGVsLmdldFZhbHVlSW5SYW5nZSh7XG4gICAgc3RhcnRMaW5lTnVtYmVyOiBwb3NpdGlvbi5saW5lTnVtYmVyLFxuICAgIHN0YXJ0Q29sdW1uOiAwLFxuICAgIGVuZExpbmVOdW1iZXI6IHBvc2l0aW9uLmxpbmVOdW1iZXIsXG4gICAgZW5kQ29sdW1uOiBwb3NpdGlvbi5jb2x1bW4sXG4gIH0pXG5cbiAgLy8gTm90IGEgY29tbWVudFxuICBpZiAoIXRoaXNMaW5lLnN0YXJ0c1dpdGgoXCIvL1wiKSkge1xuICAgIHJldHVybiB7IHN1Z2dlc3Rpb25zOiBbXSB9XG4gIH1cblxuICBjb25zdCB3b3JkcyA9IHRoaXNMaW5lLnJlcGxhY2UoXCJcXHRcIiwgXCJcIikuc3BsaXQoXCIgXCIpXG5cbiAgLy8gTm90IHRoZSByaWdodCBhbW91bnQgb2ZcbiAgaWYgKHdvcmRzLmxlbmd0aCAhPT0gMikge1xuICAgIHJldHVybiB7IHN1Z2dlc3Rpb25zOiBbXSB9XG4gIH1cblxuICBjb25zdCB3b3JkID0gd29yZHNbMV1cbiAgaWYgKHdvcmQuc3RhcnRzV2l0aChcIi1cIikpIHtcbiAgICByZXR1cm4ge1xuICAgICAgc3VnZ2VzdGlvbnM6IFtcbiAgICAgICAge1xuICAgICAgICAgIGxhYmVsOiBcIi0tLWN1dC0tLVwiLFxuICAgICAgICAgIGtpbmQ6IDE0LFxuICAgICAgICAgIGRldGFpbDogXCJUd29zbGFzaCBzcGxpdCBvdXRwdXRcIixcbiAgICAgICAgICBpbnNlcnRUZXh0OiBcIi0tLWN1dC0tLVwiLnJlcGxhY2Uod29yZCwgXCJcIiksXG4gICAgICAgIH0gYXMgYW55LFxuICAgICAgXSxcbiAgICB9XG4gIH1cblxuICAvLyBOb3QgYSBAIGF0IHRoZSBmaXJzdCB3b3JkXG4gIGlmICghd29yZC5zdGFydHNXaXRoKFwiQFwiKSkge1xuICAgIHJldHVybiB7IHN1Z2dlc3Rpb25zOiBbXSB9XG4gIH1cblxuICBjb25zdCBrbm93bnMgPSBbXG4gICAgXCJub0Vycm9yc1wiLFxuICAgIFwiZXJyb3JzXCIsXG4gICAgXCJzaG93RW1pdFwiLFxuICAgIFwic2hvd0VtaXR0ZWRGaWxlXCIsXG4gICAgXCJub1N0YXRpY1NlbWFudGljSW5mb1wiLFxuICAgIFwiZW1pdFwiLFxuICAgIFwibm9FcnJvclZhbGlkYXRpb25cIixcbiAgICBcImZpbGVuYW1lXCIsXG4gIF1cbiAgLy8gQHRzLWlnbm9yZSAtIHRzLm9wdGlvbkRlY2xhcmF0aW9ucyBpcyBwcml2YXRlXG4gIGNvbnN0IG9wdHNOYW1lcyA9IHRzLm9wdGlvbkRlY2xhcmF0aW9ucy5tYXAobyA9PiBvLm5hbWUpXG4gIGtub3ducy5jb25jYXQob3B0c05hbWVzKS5mb3JFYWNoKG5hbWUgPT4ge1xuICAgIGlmIChuYW1lLnN0YXJ0c1dpdGgod29yZC5zbGljZSgxKSkpIHtcbiAgICAgIC8vIHNvbWVob3cgYWRkaW5nIHRoZSByYW5nZSBzZWVtcyB0byBub3QgZ2l2ZSBhdXRvY29tcGxldGUgcmVzdWx0cz9cbiAgICAgIHJlc3VsdC5wdXNoKHtcbiAgICAgICAgbGFiZWw6IG5hbWUsXG4gICAgICAgIGtpbmQ6IDE0LFxuICAgICAgICBkZXRhaWw6IFwiVHdvc2xhc2ggY29tbWVudFwiLFxuICAgICAgICBpbnNlcnRUZXh0OiBuYW1lLFxuICAgICAgfSBhcyBhbnkpXG4gICAgfVxuICB9KVxuXG4gIHJldHVybiB7XG4gICAgc3VnZ2VzdGlvbnM6IHJlc3VsdCxcbiAgfVxufVxuIl19