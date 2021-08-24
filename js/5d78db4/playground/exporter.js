var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.createExporter = void 0;
    const createExporter = (sandbox, monaco, ui) => {
        function getScriptTargetText(option) {
            return monaco.languages.typescript.ScriptTarget[option];
        }
        function getJsxEmitText(option) {
            if (option === monaco.languages.typescript.JsxEmit.None) {
                return undefined;
            }
            return monaco.languages.typescript.JsxEmit[option].toLowerCase();
        }
        function getModuleKindText(option) {
            if (option === monaco.languages.typescript.ModuleKind.None) {
                return undefined;
            }
            return monaco.languages.typescript.ModuleKind[option];
        }
        function getModuleResolutionText(option) {
            return option === monaco.languages.typescript.ModuleResolutionKind.Classic ? "classic" : "node";
        }
        // These are the compiler's defaults, and we want a diff from
        // these before putting it in the issue
        const defaultCompilerOptionsForTSC = {
            esModuleInterop: false,
            strictNullChecks: false,
            strict: false,
            strictFunctionTypes: false,
            strictPropertyInitialization: false,
            strictBindCallApply: false,
            noImplicitAny: false,
            noImplicitThis: false,
            noImplicitReturns: false,
            checkJs: false,
            allowJs: false,
            experimentalDecorators: false,
            emitDecoratorMetadata: false,
        };
        function getValidCompilerOptions(options) {
            const { target: targetOption, jsx: jsxOption, module: moduleOption, moduleResolution: moduleResolutionOption } = options, restOptions = __rest(options, ["target", "jsx", "module", "moduleResolution"]);
            const targetText = getScriptTargetText(targetOption);
            const jsxText = getJsxEmitText(jsxOption);
            const moduleKindText = getModuleKindText(moduleOption);
            const moduleResolutionText = getModuleResolutionText(moduleResolutionOption);
            const opts = Object.assign(Object.assign(Object.assign(Object.assign(Object.assign({}, restOptions), (targetText && { target: targetText })), (jsxText && { jsx: jsxText })), (moduleKindText && { module: moduleKindText })), { moduleResolution: moduleResolutionText });
            const diffFromTSCDefaults = Object.entries(opts).reduce((acc, [key, value]) => {
                if (opts[key] && value != defaultCompilerOptionsForTSC[key]) {
                    // @ts-ignore
                    acc[key] = opts[key];
                }
                return acc;
            }, {});
            return diffFromTSCDefaults;
        }
        // Based on https://github.com/stackblitz/core/blob/master/sdk/src/generate.ts
        function createHiddenInput(name, value) {
            const input = document.createElement("input");
            input.type = "hidden";
            input.name = name;
            input.value = value;
            return input;
        }
        function createProjectForm(project) {
            const form = document.createElement("form");
            form.method = "POST";
            form.setAttribute("style", "display:none;");
            form.appendChild(createHiddenInput("project[title]", project.title));
            form.appendChild(createHiddenInput("project[description]", project.description));
            form.appendChild(createHiddenInput("project[template]", project.template));
            if (project.tags) {
                project.tags.forEach((tag) => {
                    form.appendChild(createHiddenInput("project[tags][]", tag));
                });
            }
            if (project.dependencies) {
                form.appendChild(createHiddenInput("project[dependencies]", JSON.stringify(project.dependencies)));
            }
            if (project.settings) {
                form.appendChild(createHiddenInput("project[settings]", JSON.stringify(project.settings)));
            }
            Object.keys(project.files).forEach(path => {
                form.appendChild(createHiddenInput(`project[files][${path}]`, project.files[path]));
            });
            return form;
        }
        const typescriptVersion = sandbox.ts.version;
        // prettier-ignore
        const stringifiedCompilerOptions = JSON.stringify({ compilerOptions: getValidCompilerOptions(sandbox.getCompilerOptions()) }, null, '  ');
        // TODO: pull deps
        function openProjectInStackBlitz() {
            const project = {
                title: "Playground Export - ",
                description: "123",
                template: "typescript",
                files: {
                    "index.ts": sandbox.getText(),
                    "tsconfig.json": stringifiedCompilerOptions,
                },
                dependencies: {
                    typescript: typescriptVersion,
                },
            };
            const form = createProjectForm(project);
            form.action = "https://stackblitz.com/run?view=editor";
            // https://github.com/stackblitz/core/blob/master/sdk/src/helpers.ts#L9
            // + buildProjectQuery(options);
            form.target = "_blank";
            document.body.appendChild(form);
            form.submit();
            document.body.removeChild(form);
        }
        function openInBugWorkbench() {
            const hash = `#code/${sandbox.lzstring.compressToEncodedURIComponent(sandbox.getText())}`;
            document.location.assign(`/dev/bug-workbench/${hash}`);
        }
        function openInTSAST() {
            const hash = `#code/${sandbox.lzstring.compressToEncodedURIComponent(sandbox.getText())}`;
            document.location.assign(`https://ts-ast-viewer.com/${hash}`);
        }
        function openProjectInCodeSandbox() {
            const files = {
                "package.json": {
                    content: {
                        name: "TypeScript Playground Export",
                        version: "0.0.0",
                        description: "TypeScript playground exported Sandbox",
                        dependencies: {
                            typescript: typescriptVersion,
                        },
                    },
                },
                "index.ts": {
                    content: sandbox.getText(),
                },
                "tsconfig.json": {
                    content: stringifiedCompilerOptions,
                },
            };
            // Using the v1 get API
            const parameters = sandbox.lzstring
                .compressToBase64(JSON.stringify({ files }))
                .replace(/\+/g, "-") // Convert '+' to '-'
                .replace(/\//g, "_") // Convert '/' to '_'
                .replace(/=+$/, ""); // Remove ending '='
            const url = `https://codesandbox.io/api/v1/sandboxes/define?view=editor&parameters=${parameters}`;
            document.location.assign(url);
            // Alternative using the http URL API, which uses POST. This has the trade-off where
            // the async nature of the call means that the redirect at the end triggers
            // popup security mechanisms in browsers because the function isn't blessed as
            // being a direct result of a user action.
            // fetch("https://codesandbox.io/api/v1/sandboxes/define?json=1", {
            //   method: "POST",
            //   body: JSON.stringify({ files }),
            //   headers: {
            //     Accept: "application/json",
            //     "Content-Type": "application/json"
            //   }
            // })
            // .then(x => x.json())
            // .then(data => {
            //   window.open('https://codesandbox.io/s/' + data.sandbox_id, '_blank');
            // });
        }
        function codify(code, ext) {
            return "```" + ext + "\n" + code + "\n```\n";
        }
        function makeMarkdown() {
            return __awaiter(this, void 0, void 0, function* () {
                const query = sandbox.createURLQueryWithCompilerOptions(sandbox);
                const fullURL = `${document.location.protocol}//${document.location.host}${document.location.pathname}${query}`;
                const jsSection = sandbox.config.filetype === "js"
                    ? ""
                    : `
<details><summary><b>Output</b></summary>

${codify(yield sandbox.getRunnableJS(), "ts")}

</details>
`;
                return `
${codify(sandbox.getText(), "ts")}

${jsSection}

<details><summary><b>Compiler Options</b></summary>

${codify(stringifiedCompilerOptions, "json")}

</details>

**Playground Link:** [Provided](${fullURL})
      `;
            });
        }
        function copyAsMarkdownIssue(e) {
            return __awaiter(this, void 0, void 0, function* () {
                e.persist();
                const markdown = yield makeMarkdown();
                ui.showModal(markdown, document.getElementById("exports-dropdown"), "Markdown Version of Playground Code for GitHub Issue", undefined, e);
                return false;
            });
        }
        function copyForChat(e) {
            const query = sandbox.createURLQueryWithCompilerOptions(sandbox);
            const fullURL = `${document.location.protocol}//${document.location.host}${document.location.pathname}${query}`;
            const chat = `[Playground Link](${fullURL})`;
            ui.showModal(chat, document.getElementById("exports-dropdown"), "Markdown for chat", undefined, e);
            return false;
        }
        function copyForChatWithPreview(e) {
            e.persist();
            const query = sandbox.createURLQueryWithCompilerOptions(sandbox);
            const fullURL = `${document.location.protocol}//${document.location.host}${document.location.pathname}${query}`;
            const ts = sandbox.getText();
            const preview = ts.length > 200 ? ts.substring(0, 200) + "..." : ts.substring(0, 200);
            const jsx = getJsxEmitText(sandbox.getCompilerOptions().jsx);
            const codeLanguage = jsx !== undefined ? "tsx" : "ts";
            const code = "```" + codeLanguage + "\n" + preview + "\n```\n";
            const chat = `${code}\n[Playground Link](${fullURL})`;
            ui.showModal(chat, document.getElementById("exports-dropdown"), "Markdown code", undefined, e);
            return false;
        }
        function exportAsTweet() {
            const query = sandbox.createURLQueryWithCompilerOptions(sandbox);
            const fullURL = `${document.location.protocol}//${document.location.host}${document.location.pathname}${query}`;
            document.location.assign(`http://www.twitter.com/share?url=${fullURL}`);
        }
        return {
            openProjectInStackBlitz,
            openProjectInCodeSandbox,
            copyAsMarkdownIssue,
            copyForChat,
            copyForChatWithPreview,
            openInTSAST,
            openInBugWorkbench,
            exportAsTweet,
        };
    };
    exports.createExporter = createExporter;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXhwb3J0ZXIuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wbGF5Z3JvdW5kL3NyYy9leHBvcnRlci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7SUFLTyxNQUFNLGNBQWMsR0FBRyxDQUFDLE9BQWdCLEVBQUUsTUFBc0MsRUFBRSxFQUFNLEVBQUUsRUFBRTtRQUNqRyxTQUFTLG1CQUFtQixDQUFDLE1BQVc7WUFDdEMsT0FBTyxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxZQUFZLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDekQsQ0FBQztRQUVELFNBQVMsY0FBYyxDQUFDLE1BQVc7WUFDakMsSUFBSSxNQUFNLEtBQUssTUFBTSxDQUFDLFNBQVMsQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLElBQUksRUFBRTtnQkFDdkQsT0FBTyxTQUFTLENBQUE7YUFDakI7WUFDRCxPQUFPLE1BQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQTtRQUNsRSxDQUFDO1FBRUQsU0FBUyxpQkFBaUIsQ0FBQyxNQUFXO1lBQ3BDLElBQUksTUFBTSxLQUFLLE1BQU0sQ0FBQyxTQUFTLENBQUMsVUFBVSxDQUFDLFVBQVUsQ0FBQyxJQUFJLEVBQUU7Z0JBQzFELE9BQU8sU0FBUyxDQUFBO2FBQ2pCO1lBQ0QsT0FBTyxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxVQUFVLENBQUMsTUFBTSxDQUFDLENBQUE7UUFDdkQsQ0FBQztRQUVELFNBQVMsdUJBQXVCLENBQUMsTUFBVztZQUMxQyxPQUFPLE1BQU0sS0FBSyxNQUFNLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLFNBQVMsQ0FBQyxDQUFDLENBQUMsTUFBTSxDQUFBO1FBQ2pHLENBQUM7UUFFRCw2REFBNkQ7UUFD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QW1TMUIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBVSSB9IGZyb20gXCIuL2NyZWF0ZVVJXCJcblxudHlwZSBTYW5kYm94ID0gaW1wb3J0KFwiQHR5cGVzY3JpcHQvc2FuZGJveFwiKS5TYW5kYm94XG50eXBlIENvbXBpbGVyT3B0aW9ucyA9IGltcG9ydChcIm1vbmFjby1lZGl0b3JcIikubGFuZ3VhZ2VzLnR5cGVzY3JpcHQuQ29tcGlsZXJPcHRpb25zXG5cbmV4cG9ydCBjb25zdCBjcmVhdGVFeHBvcnRlciA9IChzYW5kYm94OiBTYW5kYm94LCBtb25hY286IHR5cGVvZiBpbXBvcnQoXCJtb25hY28tZWRpdG9yXCIpLCB1aTogVUkpID0+IHtcbiAgZnVuY3Rpb24gZ2V0U2NyaXB0VGFyZ2V0VGV4dChvcHRpb246IGFueSkge1xuICAgIHJldHVybiBtb25hY28ubGFuZ3VhZ2VzLnR5cGVzY3JpcHQuU2NyaXB0VGFyZ2V0W29wdGlvbl1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldEpzeEVtaXRUZXh0KG9wdGlvbjogYW55KSB7XG4gICAgaWYgKG9wdGlvbiA9PT0gbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0LkpzeEVtaXQuTm9uZSkge1xuICAgICAgcmV0dXJuIHVuZGVmaW5lZFxuICAgIH1cbiAgICByZXR1cm4gbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0LkpzeEVtaXRbb3B0aW9uXS50b0xvd2VyQ2FzZSgpXG4gIH1cblxuICBmdW5jdGlvbiBnZXRNb2R1bGVLaW5kVGV4dChvcHRpb246IGFueSkge1xuICAgIGlmIChvcHRpb24gPT09IG1vbmFjby5sYW5ndWFnZXMudHlwZXNjcmlwdC5Nb2R1bGVLaW5kLk5vbmUpIHtcbiAgICAgIHJldHVybiB1bmRlZmluZWRcbiAgICB9XG4gICAgcmV0dXJuIG1vbmFjby5sYW5ndWFnZXMudHlwZXNjcmlwdC5Nb2R1bGVLaW5kW29wdGlvbl1cbiAgfVxuXG4gIGZ1bmN0aW9uIGdldE1vZHVsZVJlc29sdXRpb25UZXh0KG9wdGlvbjogYW55KSB7XG4gICAgcmV0dXJuIG9wdGlvbiA9PT0gbW9uYWNvLmxhbmd1YWdlcy50eXBlc2NyaXB0Lk1vZHVsZVJlc29sdXRpb25LaW5kLkNsYXNzaWMgPyBcImNsYXNzaWNcIiA6IFwibm9kZVwiXG4gIH1cblxuICAvLyBUaGVzZSBhcmUgdGhlIGNvbXBpbGVyJ3MgZGVmYXVsdHMsIGFuZCB3ZSB3YW50IGEgZGlmZiBmcm9tXG4gIC8vIHRoZXNlIGJlZm9yZSBwdXR0aW5nIGl0IGluIHRoZSBpc3N1ZVxuICBjb25zdCBkZWZhdWx0Q29tcGlsZXJPcHRpb25zRm9yVFNDOiBDb21waWxlck9wdGlvbnMgPSB7XG4gICAgZXNNb2R1bGVJbnRlcm9wOiBmYWxzZSxcbiAgICBzdHJpY3ROdWxsQ2hlY2tzOiBmYWxzZSxcbiAgICBzdHJpY3Q6IGZhbHNlLFxuICAgIHN0cmljdEZ1bmN0aW9uVHlwZXM6IGZhbHNlLFxuICAgIHN0cmljdFByb3BlcnR5SW5pdGlhbGl6YXRpb246IGZhbHNlLFxuICAgIHN0cmljdEJpbmRDYWxsQXBwbHk6IGZhbHNlLFxuICAgIG5vSW1wbGljaXRBbnk6IGZhbHNlLFxuICAgIG5vSW1wbGljaXRUaGlzOiBmYWxzZSxcbiAgICBub0ltcGxpY2l0UmV0dXJuczogZmFsc2UsXG4gICAgY2hlY2tKczogZmFsc2UsXG4gICAgYWxsb3dKczogZmFsc2UsXG4gICAgZXhwZXJpbWVudGFsRGVjb3JhdG9yczogZmFsc2UsXG4gICAgZW1pdERlY29yYXRvck1ldGFkYXRhOiBmYWxzZSxcbiAgfVxuXG4gIGZ1bmN0aW9uIGdldFZhbGlkQ29tcGlsZXJPcHRpb25zKG9wdGlvbnM6IENvbXBpbGVyT3B0aW9ucykge1xuICAgIGNvbnN0IHtcbiAgICAgIHRhcmdldDogdGFyZ2V0T3B0aW9uLFxuICAgICAganN4OiBqc3hPcHRpb24sXG4gICAgICBtb2R1bGU6IG1vZHVsZU9wdGlvbixcbiAgICAgIG1vZHVsZVJlc29sdXRpb246IG1vZHVsZVJlc29sdXRpb25PcHRpb24sXG4gICAgICAuLi5yZXN0T3B0aW9uc1xuICAgIH0gPSBvcHRpb25zXG5cbiAgICBjb25zdCB0YXJnZXRUZXh0ID0gZ2V0U2NyaXB0VGFyZ2V0VGV4dCh0YXJnZXRPcHRpb24pXG4gICAgY29uc3QganN4VGV4dCA9IGdldEpzeEVtaXRUZXh0KGpzeE9wdGlvbilcbiAgICBjb25zdCBtb2R1bGVLaW5kVGV4dCA9IGdldE1vZHVsZUtpbmRUZXh0KG1vZHVsZU9wdGlvbilcbiAgICBjb25zdCBtb2R1bGVSZXNvbHV0aW9uVGV4dCA9IGdldE1vZHVsZVJlc29sdXRpb25UZXh0KG1vZHVsZVJlc29sdXRpb25PcHRpb24pXG5cbiAgICBjb25zdCBvcHRzID0ge1xuICAgICAgLi4ucmVzdE9wdGlvbnMsXG4gICAgICAuLi4odGFyZ2V0VGV4dCAmJiB7IHRhcmdldDogdGFyZ2V0VGV4dCB9KSxcbiAgICAgIC4uLihqc3hUZXh0ICYmIHsganN4OiBqc3hUZXh0IH0pLFxuICAgICAgLi4uKG1vZHVsZUtpbmRUZXh0ICYmIHsgbW9kdWxlOiBtb2R1bGVLaW5kVGV4dCB9KSxcbiAgICAgIG1vZHVsZVJlc29sdXRpb246IG1vZHVsZVJlc29sdXRpb25UZXh0LFxuICAgIH1cblxuICAgIGNvbnN0IGRpZmZGcm9tVFNDRGVmYXVsdHMgPSBPYmplY3QuZW50cmllcyhvcHRzKS5yZWR1Y2UoKGFjYywgW2tleSwgdmFsdWVdKSA9PiB7XG4gICAgICBpZiAoKG9wdHMgYXMgYW55KVtrZXldICYmIHZhbHVlICE9IGRlZmF1bHRDb21waWxlck9wdGlvbnNGb3JUU0Nba2V5XSkge1xuICAgICAgICAvLyBAdHMtaWdub3JlXG4gICAgICAgIGFjY1trZXldID0gb3B0c1trZXldXG4gICAgICB9XG5cbiAgICAgIHJldHVybiBhY2NcbiAgICB9LCB7fSlcblxuICAgIHJldHVybiBkaWZmRnJvbVRTQ0RlZmF1bHRzXG4gIH1cblxuICAvLyBCYXNlZCBvbiBodHRwczovL2dpdGh1Yi5jb20vc3RhY2tibGl0ei9jb3JlL2Jsb2IvbWFzdGVyL3Nkay9zcmMvZ2VuZXJhdGUudHNcbiAgZnVuY3Rpb24gY3JlYXRlSGlkZGVuSW5wdXQobmFtZTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nKSB7XG4gICAgY29uc3QgaW5wdXQgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIilcbiAgICBpbnB1dC50eXBlID0gXCJoaWRkZW5cIlxuICAgIGlucHV0Lm5hbWUgPSBuYW1lXG4gICAgaW5wdXQudmFsdWUgPSB2YWx1ZVxuICAgIHJldHVybiBpbnB1dFxuICB9XG5cbiAgZnVuY3Rpb24gY3JlYXRlUHJvamVjdEZvcm0ocHJvamVjdDogYW55KSB7XG4gICAgY29uc3QgZm9ybSA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJmb3JtXCIpXG5cbiAgICBmb3JtLm1ldGhvZCA9IFwiUE9TVFwiXG4gICAgZm9ybS5zZXRBdHRyaWJ1dGUoXCJzdHlsZVwiLCBcImRpc3BsYXk6bm9uZTtcIilcblxuICAgIGZvcm0uYXBwZW5kQ2hpbGQoY3JlYXRlSGlkZGVuSW5wdXQoXCJwcm9qZWN0W3RpdGxlXVwiLCBwcm9qZWN0LnRpdGxlKSlcbiAgICBmb3JtLmFwcGVuZENoaWxkKGNyZWF0ZUhpZGRlbklucHV0KFwicHJvamVjdFtkZXNjcmlwdGlvbl1cIiwgcHJvamVjdC5kZXNjcmlwdGlvbikpXG4gICAgZm9ybS5hcHBlbmRDaGlsZChjcmVhdGVIaWRkZW5JbnB1dChcInByb2plY3RbdGVtcGxhdGVdXCIsIHByb2plY3QudGVtcGxhdGUpKVxuXG4gICAgaWYgKHByb2plY3QudGFncykge1xuICAgICAgcHJvamVjdC50YWdzLmZvckVhY2goKHRhZzogc3RyaW5nKSA9PiB7XG4gICAgICAgIGZvcm0uYXBwZW5kQ2hpbGQoY3JlYXRlSGlkZGVuSW5wdXQoXCJwcm9qZWN0W3RhZ3NdW11cIiwgdGFnKSlcbiAgICAgIH0pXG4gICAgfVxuXG4gICAgaWYgKHByb2plY3QuZGVwZW5kZW5jaWVzKSB7XG4gICAgICBmb3JtLmFwcGVuZENoaWxkKGNyZWF0ZUhpZGRlbklucHV0KFwicHJvamVjdFtkZXBlbmRlbmNpZXNdXCIsIEpTT04uc3RyaW5naWZ5KHByb2plY3QuZGVwZW5kZW5jaWVzKSkpXG4gICAgfVxuXG4gICAgaWYgKHByb2plY3Quc2V0dGluZ3MpIHtcbiAgICAgIGZvcm0uYXBwZW5kQ2hpbGQoY3JlYXRlSGlkZGVuSW5wdXQoXCJwcm9qZWN0W3NldHRpbmdzXVwiLCBKU09OLnN0cmluZ2lmeShwcm9qZWN0LnNldHRpbmdzKSkpXG4gICAgfVxuXG4gICAgT2JqZWN0LmtleXMocHJvamVjdC5maWxlcykuZm9yRWFjaChwYXRoID0+IHtcbiAgICAgIGZvcm0uYXBwZW5kQ2hpbGQoY3JlYXRlSGlkZGVuSW5wdXQoYHByb2plY3RbZmlsZXNdWyR7cGF0aH1dYCwgcHJvamVjdC5maWxlc1twYXRoXSkpXG4gICAgfSlcblxuICAgIHJldHVybiBmb3JtXG4gIH1cblxuICBjb25zdCB0eXBlc2NyaXB0VmVyc2lvbiA9IHNhbmRib3gudHMudmVyc2lvblxuICAvLyBwcmV0dGllci1pZ25vcmVcbiAgY29uc3Qgc3RyaW5naWZpZWRDb21waWxlck9wdGlvbnMgPSBKU09OLnN0cmluZ2lmeSh7IGNvbXBpbGVyT3B0aW9uczogZ2V0VmFsaWRDb21waWxlck9wdGlvbnMoc2FuZGJveC5nZXRDb21waWxlck9wdGlvbnMoKSkgfSwgbnVsbCwgJyAgJylcblxuICAvLyBUT0RPOiBwdWxsIGRlcHNcbiAgZnVuY3Rpb24gb3BlblByb2plY3RJblN0YWNrQmxpdHooKSB7XG4gICAgY29uc3QgcHJvamVjdCA9IHtcbiAgICAgIHRpdGxlOiBcIlBsYXlncm91bmQgRXhwb3J0IC0gXCIsXG4gICAgICBkZXNjcmlwdGlvbjogXCIxMjNcIixcbiAgICAgIHRlbXBsYXRlOiBcInR5cGVzY3JpcHRcIixcbiAgICAgIGZpbGVzOiB7XG4gICAgICAgIFwiaW5kZXgudHNcIjogc2FuZGJveC5nZXRUZXh0KCksXG4gICAgICAgIFwidHNjb25maWcuanNvblwiOiBzdHJpbmdpZmllZENvbXBpbGVyT3B0aW9ucyxcbiAgICAgIH0sXG4gICAgICBkZXBlbmRlbmNpZXM6IHtcbiAgICAgICAgdHlwZXNjcmlwdDogdHlwZXNjcmlwdFZlcnNpb24sXG4gICAgICB9LFxuICAgIH1cbiAgICBjb25zdCBmb3JtID0gY3JlYXRlUHJvamVjdEZvcm0ocHJvamVjdClcbiAgICBmb3JtLmFjdGlvbiA9IFwiaHR0cHM6Ly9zdGFja2JsaXR6LmNvbS9ydW4/dmlldz1lZGl0b3JcIlxuICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9zdGFja2JsaXR6L2NvcmUvYmxvYi9tYXN0ZXIvc2RrL3NyYy9oZWxwZXJzLnRzI0w5XG4gICAgLy8gKyBidWlsZFByb2plY3RRdWVyeShvcHRpb25zKTtcbiAgICBmb3JtLnRhcmdldCA9IFwiX2JsYW5rXCJcblxuICAgIGRvY3VtZW50LmJvZHkuYXBwZW5kQ2hpbGQoZm9ybSlcbiAgICBmb3JtLnN1Ym1pdCgpXG4gICAgZG9jdW1lbnQuYm9keS5yZW1vdmVDaGlsZChmb3JtKVxuICB9XG5cbiAgZnVuY3Rpb24gb3BlbkluQnVnV29ya2JlbmNoKCkge1xuICAgIGNvbnN0IGhhc2ggPSBgI2NvZGUvJHtzYW5kYm94Lmx6c3RyaW5nLmNvbXByZXNzVG9FbmNvZGVkVVJJQ29tcG9uZW50KHNhbmRib3guZ2V0VGV4dCgpKX1gXG4gICAgZG9jdW1lbnQubG9jYXRpb24uYXNzaWduKGAvZGV2L2J1Zy13b3JrYmVuY2gvJHtoYXNofWApXG4gIH1cblxuICBmdW5jdGlvbiBvcGVuSW5UU0FTVCgpIHtcbiAgICBjb25zdCBoYXNoID0gYCNjb2RlLyR7c2FuZGJveC5senN0cmluZy5jb21wcmVzc1RvRW5jb2RlZFVSSUNvbXBvbmVudChzYW5kYm94LmdldFRleHQoKSl9YFxuICAgIGRvY3VtZW50LmxvY2F0aW9uLmFzc2lnbihgaHR0cHM6Ly90cy1hc3Qtdmlld2VyLmNvbS8ke2hhc2h9YClcbiAgfVxuXG4gIGZ1bmN0aW9uIG9wZW5Qcm9qZWN0SW5Db2RlU2FuZGJveCgpIHtcbiAgICBjb25zdCBmaWxlcyA9IHtcbiAgICAgIFwicGFja2FnZS5qc29uXCI6IHtcbiAgICAgICAgY29udGVudDoge1xuICAgICAgICAgIG5hbWU6IFwiVHlwZVNjcmlwdCBQbGF5Z3JvdW5kIEV4cG9ydFwiLFxuICAgICAgICAgIHZlcnNpb246IFwiMC4wLjBcIixcbiAgICAgICAgICBkZXNjcmlwdGlvbjogXCJUeXBlU2NyaXB0IHBsYXlncm91bmQgZXhwb3J0ZWQgU2FuZGJveFwiLFxuICAgICAgICAgIGRlcGVuZGVuY2llczoge1xuICAgICAgICAgICAgdHlwZXNjcmlwdDogdHlwZXNjcmlwdFZlcnNpb24sXG4gICAgICAgICAgfSxcbiAgICAgICAgfSxcbiAgICAgIH0sXG4gICAgICBcImluZGV4LnRzXCI6IHtcbiAgICAgICAgY29udGVudDogc2FuZGJveC5nZXRUZXh0KCksXG4gICAgICB9LFxuICAgICAgXCJ0c2NvbmZpZy5qc29uXCI6IHtcbiAgICAgICAgY29udGVudDogc3RyaW5naWZpZWRDb21waWxlck9wdGlvbnMsXG4gICAgICB9LFxuICAgIH1cblxuICAgIC8vIFVzaW5nIHRoZSB2MSBnZXQgQVBJXG4gICAgY29uc3QgcGFyYW1ldGVycyA9IHNhbmRib3gubHpzdHJpbmdcbiAgICAgIC5jb21wcmVzc1RvQmFzZTY0KEpTT04uc3RyaW5naWZ5KHsgZmlsZXMgfSkpXG4gICAgICAucmVwbGFjZSgvXFwrL2csIFwiLVwiKSAvLyBDb252ZXJ0ICcrJyB0byAnLSdcbiAgICAgIC5yZXBsYWNlKC9cXC8vZywgXCJfXCIpIC8vIENvbnZlcnQgJy8nIHRvICdfJ1xuICAgICAgLnJlcGxhY2UoLz0rJC8sIFwiXCIpIC8vIFJlbW92ZSBlbmRpbmcgJz0nXG5cbiAgICBjb25zdCB1cmwgPSBgaHR0cHM6Ly9jb2Rlc2FuZGJveC5pby9hcGkvdjEvc2FuZGJveGVzL2RlZmluZT92aWV3PWVkaXRvciZwYXJhbWV0ZXJzPSR7cGFyYW1ldGVyc31gXG4gICAgZG9jdW1lbnQubG9jYXRpb24uYXNzaWduKHVybClcblxuICAgIC8vIEFsdGVybmF0aXZlIHVzaW5nIHRoZSBodHRwIFVSTCBBUEksIHdoaWNoIHVzZXMgUE9TVC4gVGhpcyBoYXMgdGhlIHRyYWRlLW9mZiB3aGVyZVxuICAgIC8vIHRoZSBhc3luYyBuYXR1cmUgb2YgdGhlIGNhbGwgbWVhbnMgdGhhdCB0aGUgcmVkaXJlY3QgYXQgdGhlIGVuZCB0cmlnZ2Vyc1xuICAgIC8vIHBvcHVwIHNlY3VyaXR5IG1lY2hhbmlzbXMgaW4gYnJvd3NlcnMgYmVjYXVzZSB0aGUgZnVuY3Rpb24gaXNuJ3QgYmxlc3NlZCBhc1xuICAgIC8vIGJlaW5nIGEgZGlyZWN0IHJlc3VsdCBvZiBhIHVzZXIgYWN0aW9uLlxuXG4gICAgLy8gZmV0Y2goXCJodHRwczovL2NvZGVzYW5kYm94LmlvL2FwaS92MS9zYW5kYm94ZXMvZGVmaW5lP2pzb249MVwiLCB7XG4gICAgLy8gICBtZXRob2Q6IFwiUE9TVFwiLFxuICAgIC8vICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBmaWxlcyB9KSxcbiAgICAvLyAgIGhlYWRlcnM6IHtcbiAgICAvLyAgICAgQWNjZXB0OiBcImFwcGxpY2F0aW9uL2pzb25cIixcbiAgICAvLyAgICAgXCJDb250ZW50LVR5cGVcIjogXCJhcHBsaWNhdGlvbi9qc29uXCJcbiAgICAvLyAgIH1cbiAgICAvLyB9KVxuICAgIC8vIC50aGVuKHggPT4geC5qc29uKCkpXG4gICAgLy8gLnRoZW4oZGF0YSA9PiB7XG4gICAgLy8gICB3aW5kb3cub3BlbignaHR0cHM6Ly9jb2Rlc2FuZGJveC5pby9zLycgKyBkYXRhLnNhbmRib3hfaWQsICdfYmxhbmsnKTtcbiAgICAvLyB9KTtcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvZGlmeShjb2RlOiBzdHJpbmcsIGV4dDogc3RyaW5nKSB7XG4gICAgcmV0dXJuIFwiYGBgXCIgKyBleHQgKyBcIlxcblwiICsgY29kZSArIFwiXFxuYGBgXFxuXCJcbiAgfVxuXG4gIGFzeW5jIGZ1bmN0aW9uIG1ha2VNYXJrZG93bigpIHtcbiAgICBjb25zdCBxdWVyeSA9IHNhbmRib3guY3JlYXRlVVJMUXVlcnlXaXRoQ29tcGlsZXJPcHRpb25zKHNhbmRib3gpXG4gICAgY29uc3QgZnVsbFVSTCA9IGAke2RvY3VtZW50LmxvY2F0aW9uLnByb3RvY29sfS8vJHtkb2N1bWVudC5sb2NhdGlvbi5ob3N0fSR7ZG9jdW1lbnQubG9jYXRpb24ucGF0aG5hbWV9JHtxdWVyeX1gXG4gICAgY29uc3QganNTZWN0aW9uID1cbiAgICAgIHNhbmRib3guY29uZmlnLmZpbGV0eXBlID09PSBcImpzXCJcbiAgICAgICAgPyBcIlwiXG4gICAgICAgIDogYFxuPGRldGFpbHM+PHN1bW1hcnk+PGI+T3V0cHV0PC9iPjwvc3VtbWFyeT5cblxuJHtjb2RpZnkoYXdhaXQgc2FuZGJveC5nZXRSdW5uYWJsZUpTKCksIFwidHNcIil9XG5cbjwvZGV0YWlscz5cbmBcblxuICAgIHJldHVybiBgXG4ke2NvZGlmeShzYW5kYm94LmdldFRleHQoKSwgXCJ0c1wiKX1cblxuJHtqc1NlY3Rpb259XG5cbjxkZXRhaWxzPjxzdW1tYXJ5PjxiPkNvbXBpbGVyIE9wdGlvbnM8L2I+PC9zdW1tYXJ5PlxuXG4ke2NvZGlmeShzdHJpbmdpZmllZENvbXBpbGVyT3B0aW9ucywgXCJqc29uXCIpfVxuXG48L2RldGFpbHM+XG5cbioqUGxheWdyb3VuZCBMaW5rOioqIFtQcm92aWRlZF0oJHtmdWxsVVJMfSlcbiAgICAgIGBcbiAgfVxuICBhc3luYyBmdW5jdGlvbiBjb3B5QXNNYXJrZG93bklzc3VlKGU6IFJlYWN0Lk1vdXNlRXZlbnQpIHtcbiAgICBlLnBlcnNpc3QoKVxuXG4gICAgY29uc3QgbWFya2Rvd24gPSBhd2FpdCBtYWtlTWFya2Rvd24oKVxuICAgIHVpLnNob3dNb2RhbChcbiAgICAgIG1hcmtkb3duLFxuICAgICAgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJleHBvcnRzLWRyb3Bkb3duXCIpISxcbiAgICAgIFwiTWFya2Rvd24gVmVyc2lvbiBvZiBQbGF5Z3JvdW5kIENvZGUgZm9yIEdpdEh1YiBJc3N1ZVwiLFxuICAgICAgdW5kZWZpbmVkLFxuICAgICAgZVxuICAgIClcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIGNvcHlGb3JDaGF0KGU6IFJlYWN0Lk1vdXNlRXZlbnQpIHtcbiAgICBjb25zdCBxdWVyeSA9IHNhbmRib3guY3JlYXRlVVJMUXVlcnlXaXRoQ29tcGlsZXJPcHRpb25zKHNhbmRib3gpXG4gICAgY29uc3QgZnVsbFVSTCA9IGAke2RvY3VtZW50LmxvY2F0aW9uLnByb3RvY29sfS8vJHtkb2N1bWVudC5sb2NhdGlvbi5ob3N0fSR7ZG9jdW1lbnQubG9jYXRpb24ucGF0aG5hbWV9JHtxdWVyeX1gXG4gICAgY29uc3QgY2hhdCA9IGBbUGxheWdyb3VuZCBMaW5rXSgke2Z1bGxVUkx9KWBcbiAgICB1aS5zaG93TW9kYWwoY2hhdCwgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJleHBvcnRzLWRyb3Bkb3duXCIpISwgXCJNYXJrZG93biBmb3IgY2hhdFwiLCB1bmRlZmluZWQsIGUpXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICBmdW5jdGlvbiBjb3B5Rm9yQ2hhdFdpdGhQcmV2aWV3KGU6IFJlYWN0Lk1vdXNlRXZlbnQpIHtcbiAgICBlLnBlcnNpc3QoKVxuXG4gICAgY29uc3QgcXVlcnkgPSBzYW5kYm94LmNyZWF0ZVVSTFF1ZXJ5V2l0aENvbXBpbGVyT3B0aW9ucyhzYW5kYm94KVxuICAgIGNvbnN0IGZ1bGxVUkwgPSBgJHtkb2N1bWVudC5sb2NhdGlvbi5wcm90b2NvbH0vLyR7ZG9jdW1lbnQubG9jYXRpb24uaG9zdH0ke2RvY3VtZW50LmxvY2F0aW9uLnBhdGhuYW1lfSR7cXVlcnl9YFxuXG4gICAgY29uc3QgdHMgPSBzYW5kYm94LmdldFRleHQoKVxuICAgIGNvbnN0IHByZXZpZXcgPSB0cy5sZW5ndGggPiAyMDAgPyB0cy5zdWJzdHJpbmcoMCwgMjAwKSArIFwiLi4uXCIgOiB0cy5zdWJzdHJpbmcoMCwgMjAwKVxuXG4gICAgY29uc3QganN4ID0gZ2V0SnN4RW1pdFRleHQoc2FuZGJveC5nZXRDb21waWxlck9wdGlvbnMoKS5qc3gpXG4gICAgY29uc3QgY29kZUxhbmd1YWdlID0ganN4ICE9PSB1bmRlZmluZWQgPyBcInRzeFwiIDogXCJ0c1wiXG4gICAgY29uc3QgY29kZSA9IFwiYGBgXCIgKyBjb2RlTGFuZ3VhZ2UgKyBcIlxcblwiICsgcHJldmlldyArIFwiXFxuYGBgXFxuXCJcbiAgICBjb25zdCBjaGF0ID0gYCR7Y29kZX1cXG5bUGxheWdyb3VuZCBMaW5rXSgke2Z1bGxVUkx9KWBcbiAgICB1aS5zaG93TW9kYWwoY2hhdCwgZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJleHBvcnRzLWRyb3Bkb3duXCIpISwgXCJNYXJrZG93biBjb2RlXCIsIHVuZGVmaW5lZCwgZSlcbiAgICByZXR1cm4gZmFsc2VcbiAgfVxuXG4gIGZ1bmN0aW9uIGV4cG9ydEFzVHdlZXQoKSB7XG4gICAgY29uc3QgcXVlcnkgPSBzYW5kYm94LmNyZWF0ZVVSTFF1ZXJ5V2l0aENvbXBpbGVyT3B0aW9ucyhzYW5kYm94KVxuICAgIGNvbnN0IGZ1bGxVUkwgPSBgJHtkb2N1bWVudC5sb2NhdGlvbi5wcm90b2NvbH0vLyR7ZG9jdW1lbnQubG9jYXRpb24uaG9zdH0ke2RvY3VtZW50LmxvY2F0aW9uLnBhdGhuYW1lfSR7cXVlcnl9YFxuXG4gICAgZG9jdW1lbnQubG9jYXRpb24uYXNzaWduKGBodHRwOi8vd3d3LnR3aXR0ZXIuY29tL3NoYXJlP3VybD0ke2Z1bGxVUkx9YClcbiAgfVxuXG4gIHJldHVybiB7XG4gICAgb3BlblByb2plY3RJblN0YWNrQmxpdHosXG4gICAgb3BlblByb2plY3RJbkNvZGVTYW5kYm94LFxuICAgIGNvcHlBc01hcmtkb3duSXNzdWUsXG4gICAgY29weUZvckNoYXQsXG4gICAgY29weUZvckNoYXRXaXRoUHJldmlldyxcbiAgICBvcGVuSW5UU0FTVCxcbiAgICBvcGVuSW5CdWdXb3JrYmVuY2gsXG4gICAgZXhwb3J0QXNUd2VldCxcbiAgfVxufVxuIl19