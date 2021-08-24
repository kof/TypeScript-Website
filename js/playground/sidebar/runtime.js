define(["require", "exports", "../createUI", "../localizeWithFallback"], function (require, exports, createUI_1, localizeWithFallback_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.runWithCustomLogs = exports.clearLogs = exports.runPlugin = void 0;
    let allLogs = [];
    let addedClearAction = false;
    const cancelButtonSVG = `
<svg width="13" height="13" viewBox="0 0 13 13" fill="none" xmlns="http://www.w3.org/2000/svg">
<circle cx="6" cy="7" r="5" stroke-width="2"/>
<line x1="0.707107" y1="1.29289" x2="11.7071" y2="12.2929" stroke-width="2"/>
</svg>
`;
    const runPlugin = (i, utils) => {
        const plugin = {
            id: "logs",
            displayName: i("play_sidebar_logs"),
            willMount: (sandbox, container) => {
                const ui = (0, createUI_1.createUI)();
                const clearLogsAction = {
                    id: "clear-logs-play",
                    label: "Clear Playground Logs",
                    keybindings: [sandbox.monaco.KeyMod.CtrlCmd | sandbox.monaco.KeyCode.KEY_K],
                    contextMenuGroupId: "run",
                    contextMenuOrder: 1.5,
                    run: function () {
                        (0, exports.clearLogs)();
                        ui.flashInfo(i("play_clear_logs"));
                    },
                };
                if (!addedClearAction) {
                    sandbox.editor.addAction(clearLogsAction);
                    addedClearAction = true;
                }
                const errorUL = document.createElement("div");
                errorUL.id = "log-container";
                container.appendChild(errorUL);
                const logs = document.createElement("div");
                logs.id = "log";
                logs.innerHTML = allLogs.join("<hr />");
                errorUL.appendChild(logs);
                const logToolsContainer = document.createElement("div");
                logToolsContainer.id = "log-tools";
                container.appendChild(logToolsContainer);
                const clearLogsButton = document.createElement("div");
                clearLogsButton.id = "clear-logs-button";
                clearLogsButton.innerHTML = cancelButtonSVG;
                clearLogsButton.onclick = e => {
                    e.preventDefault();
                    clearLogsAction.run();
                    const filterTextBox = document.getElementById("filter-logs");
                    filterTextBox.value = "";
                };
                logToolsContainer.appendChild(clearLogsButton);
                const filterTextBox = document.createElement("input");
                filterTextBox.id = "filter-logs";
                filterTextBox.placeholder = i("play_sidebar_tools_filter_placeholder");
                filterTextBox.addEventListener("input", (e) => {
                    const inputText = e.target.value;
                    const eleLog = document.getElementById("log");
                    eleLog.innerHTML = allLogs
                        .filter(log => {
                        const userLoggedText = log.substring(log.indexOf(":") + 1, log.indexOf("&nbsp;<br>"));
                        return userLoggedText.includes(inputText);
                    })
                        .join("<hr />");
                    if (inputText === "") {
                        const logContainer = document.getElementById("log-container");
                        logContainer.scrollTop = logContainer.scrollHeight;
                    }
                });
                logToolsContainer.appendChild(filterTextBox);
                if (allLogs.length === 0) {
                    const noErrorsMessage = document.createElement("div");
                    noErrorsMessage.id = "empty-message-container";
                    container.appendChild(noErrorsMessage);
                    const message = document.createElement("div");
                    message.textContent = (0, localizeWithFallback_1.localize)("play_sidebar_logs_no_logs", "No logs");
                    message.classList.add("empty-plugin-message");
                    noErrorsMessage.appendChild(message);
                    errorUL.style.display = "none";
                    logToolsContainer.style.display = "none";
                }
            },
        };
        return plugin;
    };
    exports.runPlugin = runPlugin;
    const clearLogs = () => {
        allLogs = [];
        const logs = document.getElementById("log");
        if (logs) {
            logs.textContent = "";
        }
    };
    exports.clearLogs = clearLogs;
    const runWithCustomLogs = (closure, i) => {
        const noLogs = document.getElementById("empty-message-container");
        const logContainer = document.getElementById("log-container");
        const logToolsContainer = document.getElementById("log-tools");
        if (noLogs) {
            noLogs.style.display = "none";
            logContainer.style.display = "block";
            logToolsContainer.style.display = "flex";
        }
        rewireLoggingToElement(() => document.getElementById("log"), () => document.getElementById("log-container"), closure, true, i);
    };
    exports.runWithCustomLogs = runWithCustomLogs;
    // Thanks SO: https://stackoverflow.com/questions/20256760/javascript-console-log-to-html/35449256#35449256
    function rewireLoggingToElement(eleLocator, eleOverflowLocator, closure, autoScroll, i) {
        const rawConsole = console;
        closure.then(js => {
            const replace = {};
            bindLoggingFunc(replace, rawConsole, "log", "LOG");
            bindLoggingFunc(replace, rawConsole, "debug", "DBG");
            bindLoggingFunc(replace, rawConsole, "warn", "WRN");
            bindLoggingFunc(replace, rawConsole, "error", "ERR");
            replace["clear"] = exports.clearLogs;
            const console = Object.assign({}, rawConsole, replace);
            try {
                const safeJS = sanitizeJS(js);
                eval(safeJS);
            }
            catch (error) {
                console.error(i("play_run_js_fail"));
                console.error(error);
                if (error instanceof SyntaxError && /\bexport\b/u.test(error.message)) {
                    console.warn('Tip: Change the Module setting to "CommonJS" in TS Config settings to allow top-level exports to work in the Playground');
                }
            }
        });
        function bindLoggingFunc(obj, raw, name, id) {
            obj[name] = function (...objs) {
                const output = produceOutput(objs);
                const eleLog = eleLocator();
                const prefix = `[<span class="log-${name}">${id}</span>]: `;
                const eleContainerLog = eleOverflowLocator();
                allLogs.push(`${prefix}${output}<br>`);
                eleLog.innerHTML = allLogs.join("<hr />");
                if (autoScroll && eleContainerLog) {
                    eleContainerLog.scrollTop = eleContainerLog.scrollHeight;
                }
                raw[name](...objs);
            };
        }
        const objectToText = (arg) => {
            const isObj = typeof arg === "object";
            let textRep = "";
            if (arg && arg.stack && arg.message) {
                // special case for err
                textRep = arg.message;
            }
            else if (arg === null) {
                textRep = "<span class='literal'>null</span>";
            }
            else if (arg === undefined) {
                textRep = "<span class='literal'>undefined</span>";
            }
            else if (typeof arg === "symbol") {
                textRep = `<span class='literal'>${String(arg)}</span>`;
            }
            else if (Array.isArray(arg)) {
                textRep = "[" + arg.map(objectToText).join("<span class='comma'>, </span>") + "]";
            }
            else if (arg instanceof Set) {
                const setIter = [...arg];
                textRep = `Set (${arg.size}) {` + setIter.map(objectToText).join("<span class='comma'>, </span>") + "}";
            }
            else if (arg instanceof Map) {
                const mapIter = [...arg.entries()];
                textRep =
                    `Map (${arg.size}) {` +
                        mapIter.map(([k, v]) => `${objectToText(k)} => ${objectToText(v)}`).join("<span class='comma'>, </span>") +
                        "}";
            }
            else if (typeof arg === "string") {
                textRep = '"' + arg + '"';
            }
            else if (isObj) {
                const name = arg.constructor && arg.constructor.name;
                // No one needs to know an obj is an obj
                const nameWithoutObject = name && name === "Object" ? "" : name;
                const prefix = nameWithoutObject ? `${nameWithoutObject}: ` : "";
                // JSON.stringify omits any keys with a value of undefined. To get around this, we replace undefined with the text __undefined__ and then do a global replace using regex back to keyword undefined
                textRep =
                    prefix +
                        JSON.stringify(arg, (_, value) => (value === undefined ? "__undefined__" : value), 2).replace(/"__undefined__"/g, "undefined");
            }
            else {
                textRep = String(arg);
            }
            return textRep;
        };
        function produceOutput(args) {
            return args.reduce((output, arg, index) => {
                const textRep = objectToText(arg);
                const showComma = index !== args.length - 1;
                const comma = showComma ? "<span class='comma'>, </span>" : "";
                return output + textRep + comma + "&nbsp;";
            }, "");
        }
    }
    // The reflect-metadata runtime is available, so allow that to go through
    function sanitizeJS(code) {
        return code.replace(`import "reflect-metadata"`, "").replace(`require("reflect-metadata")`, "");
    }
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicnVudGltZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIi4uLy4uLy4uLy4uLy4uL3BsYXlncm91bmQvc3JjL3NpZGViYXIvcnVudGltZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0lBS0EsSUFBSSxPQUFPLEdBQWEsRUFBRSxDQUFBO0lBQzFCLElBQUksZ0JBQWdCLEdBQUcsS0FBSyxDQUFBO0lBQzVCLE1BQU0sZUFBZSxHQUFHOzs7OztDQUt2QixDQUFBO0lBRU0sTUFBTSxTQUFTLEdBQWtCLENBQUMsQ0FBQyxFQUFFLEtBQUssRUFBRSxFQUFFO1FBQ25ELE1BQU0sTUFBTSxHQUFxQjtZQUMvQixFQUFFLEVBQUUsTUFBTTtZQUNWLFdBQVcsRUFBRSxDQUFDLENBQUMsbUJBQW1CLENBQUM7WUFDbkMsU0FBUyxFQUFFLENBQUMsT0FBTyxFQUFFLFNBQVMsRUFBRSxFQUFFO2dCQUNoQyxNQUFNLEVBQUUsR0FBRyxJQUFBLG1CQUFRLEdBQUUsQ0FBQTtnQkFFckIsTUFBTSxlQUFlLEdBQUc7b0JBQ3RCLEVBQUUsRUFBRSxpQkFBaUI7b0JBQ3JCLEtBQUssRUFBRSx1QkFBdUI7b0JBQzlCLFdBQVcsRUFBRSxDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsTUFBTSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsTUFBTSxDQUFDLE9BQU8sQ0FBQyxLQUFLLENBQUM7b0JBRTNFLGtCQUFrQixFQUFFLEtBQUs7b0JBQ3pCLGdCQUFnQixFQUFFLEdBQUc7b0JBRXJCLEdBQUcsRUFBRTt3QkFDSCxJQUFBLGlCQUFTLEdBQUUsQ0FBQTt3QkFDWCxFQUFFLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQyxpQkFBaUIsQ0FBQyxDQUFDLENBQUE7b0JBQ3BDLENBQUM7aUJBQ0YsQ0FBQTtnQkFFRCxJQUFJLENBQUMsZ0JBQWdCLEVBQUU7b0JBQ3JCLE9BQU8sQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLGVBQWUsQ0FBQyxDQUFBO29CQUN6QyxnQkFBZ0IsR0FB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QTthQUNKO2lCQUFNO2dCQUNMLE9BQU8sR0FBRyxNQUFNLENBQUMsR0FBRyxDQUFDLENBQUE7YUFDdEI7WUFDRCxPQUFPLE9BQU8sQ0FBQTtRQUNoQixDQUFDLENBQUE7UUFFRCxTQUFTLGFBQWEsQ0FBQyxJQUFXO1lBQ2hDLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxDQUFDLE1BQVcsRUFBRSxHQUFRLEVBQUUsS0FBSyxFQUFFLEVBQUU7Z0JBQ2xELE1BQU0sT0FBTyxHQUFHLFlBQVksQ0FBQyxHQUFHLENBQUMsQ0FBQTtnQkFDakMsTUFBTSxTQUFTLEdBQUcsS0FBSyxLQUFLLElBQUksQ0FBQyxNQUFNLEdBQUcsQ0FBQyxDQUFBO2dCQUMzQyxNQUFNLEtBQUssR0FBRyxTQUFTLENBQUMsQ0FBQyxDQUFDLCtCQUErQixDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUE7Z0JBQzlELE9BQU8sTUFBTSxHQUFHLE9BQU8sR0FBRyxLQUFLLEdBQUcsUUFBUSxDQUFBO1lBQzVDLENBQUMsRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUNSLENBQUM7SUFDSCxDQUFDO0lBRUQseUVBQXlFO0lBQ3pFLFNBQVMsVUFBVSxDQUFDLElBQVk7UUFDOUIsT0FBTyxJQUFJLENBQUMsT0FBTyxDQUFDLDJCQUEyQixFQUFFLEVBQUUsQ0FBQyxDQUFDLE9BQU8sQ0FBQyw2QkFBNkIsRUFBRSxFQUFFLENBQUMsQ0FBQTtJQUNqRyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU2FuZGJveCB9IGZyb20gXCJ0eXBlc2NyaXB0bGFuZy1vcmcvc3RhdGljL2pzL3NhbmRib3hcIlxuaW1wb3J0IHsgUGxheWdyb3VuZFBsdWdpbiwgUGx1Z2luRmFjdG9yeSB9IGZyb20gXCIuLlwiXG5pbXBvcnQgeyBjcmVhdGVVSSwgVUkgfSBmcm9tIFwiLi4vY3JlYXRlVUlcIlxuaW1wb3J0IHsgbG9jYWxpemUgfSBmcm9tIFwiLi4vbG9jYWxpemVXaXRoRmFsbGJhY2tcIlxuXG5sZXQgYWxsTG9nczogc3RyaW5nW10gPSBbXVxubGV0IGFkZGVkQ2xlYXJBY3Rpb24gPSBmYWxzZVxuY29uc3QgY2FuY2VsQnV0dG9uU1ZHID0gYFxuPHN2ZyB3aWR0aD1cIjEzXCIgaGVpZ2h0PVwiMTNcIiB2aWV3Qm94PVwiMCAwIDEzIDEzXCIgZmlsbD1cIm5vbmVcIiB4bWxucz1cImh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnXCI+XG48Y2lyY2xlIGN4PVwiNlwiIGN5PVwiN1wiIHI9XCI1XCIgc3Ryb2tlLXdpZHRoPVwiMlwiLz5cbjxsaW5lIHgxPVwiMC43MDcxMDdcIiB5MT1cIjEuMjkyODlcIiB4Mj1cIjExLjcwNzFcIiB5Mj1cIjEyLjI5MjlcIiBzdHJva2Utd2lkdGg9XCIyXCIvPlxuPC9zdmc+XG5gXG5cbmV4cG9ydCBjb25zdCBydW5QbHVnaW46IFBsdWdpbkZhY3RvcnkgPSAoaSwgdXRpbHMpID0+IHtcbiAgY29uc3QgcGx1Z2luOiBQbGF5Z3JvdW5kUGx1Z2luID0ge1xuICAgIGlkOiBcImxvZ3NcIixcbiAgICBkaXNwbGF5TmFtZTogaShcInBsYXlfc2lkZWJhcl9sb2dzXCIpLFxuICAgIHdpbGxNb3VudDogKHNhbmRib3gsIGNvbnRhaW5lcikgPT4ge1xuICAgICAgY29uc3QgdWkgPSBjcmVhdGVVSSgpXG5cbiAgICAgIGNvbnN0IGNsZWFyTG9nc0FjdGlvbiA9IHtcbiAgICAgICAgaWQ6IFwiY2xlYXItbG9ncy1wbGF5XCIsXG4gICAgICAgIGxhYmVsOiBcIkNsZWFyIFBsYXlncm91bmQgTG9nc1wiLFxuICAgICAgICBrZXliaW5kaW5nczogW3NhbmRib3gubW9uYWNvLktleU1vZC5DdHJsQ21kIHwgc2FuZGJveC5tb25hY28uS2V5Q29kZS5LRVlfS10sXG5cbiAgICAgICAgY29udGV4dE1lbnVHcm91cElkOiBcInJ1blwiLFxuICAgICAgICBjb250ZXh0TWVudU9yZGVyOiAxLjUsXG5cbiAgICAgICAgcnVuOiBmdW5jdGlvbiAoKSB7XG4gICAgICAgICAgY2xlYXJMb2dzKClcbiAgICAgICAgICB1aS5mbGFzaEluZm8oaShcInBsYXlfY2xlYXJfbG9nc1wiKSlcbiAgICAgICAgfSxcbiAgICAgIH1cblxuICAgICAgaWYgKCFhZGRlZENsZWFyQWN0aW9uKSB7XG4gICAgICAgIHNhbmRib3guZWRpdG9yLmFkZEFjdGlvbihjbGVhckxvZ3NBY3Rpb24pXG4gICAgICAgIGFkZGVkQ2xlYXJBY3Rpb24gPSB0cnVlXG4gICAgICB9XG5cbiAgICAgIGNvbnN0IGVycm9yVUwgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG4gICAgICBlcnJvclVMLmlkID0gXCJsb2ctY29udGFpbmVyXCJcbiAgICAgIGNvbnRhaW5lci5hcHBlbmRDaGlsZChlcnJvclVMKVxuXG4gICAgICBjb25zdCBsb2dzID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgICAgbG9ncy5pZCA9IFwibG9nXCJcbiAgICAgIGxvZ3MuaW5uZXJIVE1MID0gYWxsTG9ncy5qb2luKFwiPGhyIC8+XCIpXG4gICAgICBlcnJvclVMLmFwcGVuZENoaWxkKGxvZ3MpXG5cbiAgICAgIGNvbnN0IGxvZ1Rvb2xzQ29udGFpbmVyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgICAgbG9nVG9vbHNDb250YWluZXIuaWQgPSBcImxvZy10b29sc1wiXG4gICAgICBjb250YWluZXIuYXBwZW5kQ2hpbGQobG9nVG9vbHNDb250YWluZXIpXG5cbiAgICAgIGNvbnN0IGNsZWFyTG9nc0J1dHRvbiA9IGRvY3VtZW50LmNyZWF0ZUVsZW1lbnQoXCJkaXZcIilcbiAgICAgIGNsZWFyTG9nc0J1dHRvbi5pZCA9IFwiY2xlYXItbG9ncy1idXR0b25cIlxuICAgICAgY2xlYXJMb2dzQnV0dG9uLmlubmVySFRNTCA9IGNhbmNlbEJ1dHRvblNWR1xuICAgICAgY2xlYXJMb2dzQnV0dG9uLm9uY2xpY2sgPSBlID0+IHtcbiAgICAgICAgZS5wcmV2ZW50RGVmYXVsdCgpXG4gICAgICAgIGNsZWFyTG9nc0FjdGlvbi5ydW4oKVxuXG4gICAgICAgIGNvbnN0IGZpbHRlclRleHRCb3g6IGFueSA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZmlsdGVyLWxvZ3NcIilcbiAgICAgICAgZmlsdGVyVGV4dEJveCEudmFsdWUgPSBcIlwiXG4gICAgICB9XG4gICAgICBsb2dUb29sc0NvbnRhaW5lci5hcHBlbmRDaGlsZChjbGVhckxvZ3NCdXR0b24pXG5cbiAgICAgIGNvbnN0IGZpbHRlclRleHRCb3ggPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiaW5wdXRcIilcbiAgICAgIGZpbHRlclRleHRCb3guaWQgPSBcImZpbHRlci1sb2dzXCJcbiAgICAgIGZpbHRlclRleHRCb3gucGxhY2Vob2xkZXIgPSBpKFwicGxheV9zaWRlYmFyX3Rvb2xzX2ZpbHRlcl9wbGFjZWhvbGRlclwiKVxuICAgICAgZmlsdGVyVGV4dEJveC5hZGRFdmVudExpc3RlbmVyKFwiaW5wdXRcIiwgKGU6IGFueSkgPT4ge1xuICAgICAgICBjb25zdCBpbnB1dFRleHQgPSBlLnRhcmdldC52YWx1ZVxuXG4gICAgICAgIGNvbnN0IGVsZUxvZyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibG9nXCIpIVxuICAgICAgICBlbGVMb2cuaW5uZXJIVE1MID0gYWxsTG9nc1xuICAgICAgICAgIC5maWx0ZXIobG9nID0+IHtcbiAgICAgICAgICAgIGNvbnN0IHVzZXJMb2dnZWRUZXh0ID0gbG9nLnN1YnN0cmluZyhsb2cuaW5kZXhPZihcIjpcIikgKyAxLCBsb2cuaW5kZXhPZihcIiZuYnNwOzxicj5cIikpXG4gICAgICAgICAgICByZXR1cm4gdXNlckxvZ2dlZFRleHQuaW5jbHVkZXMoaW5wdXRUZXh0KVxuICAgICAgICAgIH0pXG4gICAgICAgICAgLmpvaW4oXCI8aHIgLz5cIilcblxuICAgICAgICBpZiAoaW5wdXRUZXh0ID09PSBcIlwiKSB7XG4gICAgICAgICAgY29uc3QgbG9nQ29udGFpbmVyID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsb2ctY29udGFpbmVyXCIpIVxuICAgICAgICAgIGxvZ0NvbnRhaW5lci5zY3JvbGxUb3AgPSBsb2dDb250YWluZXIuc2Nyb2xsSGVpZ2h0XG4gICAgICAgIH1cbiAgICAgIH0pXG4gICAgICBsb2dUb29sc0NvbnRhaW5lci5hcHBlbmRDaGlsZChmaWx0ZXJUZXh0Qm94KVxuXG4gICAgICBpZiAoYWxsTG9ncy5sZW5ndGggPT09IDApIHtcbiAgICAgICAgY29uc3Qgbm9FcnJvcnNNZXNzYWdlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgICAgICBub0Vycm9yc01lc3NhZ2UuaWQgPSBcImVtcHR5LW1lc3NhZ2UtY29udGFpbmVyXCJcbiAgICAgICAgY29udGFpbmVyLmFwcGVuZENoaWxkKG5vRXJyb3JzTWVzc2FnZSlcblxuICAgICAgICBjb25zdCBtZXNzYWdlID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICAgICAgICBtZXNzYWdlLnRleHRDb250ZW50ID0gbG9jYWxpemUoXCJwbGF5X3NpZGViYXJfbG9nc19ub19sb2dzXCIsIFwiTm8gbG9nc1wiKVxuICAgICAgICBtZXNzYWdlLmNsYXNzTGlzdC5hZGQoXCJlbXB0eS1wbHVnaW4tbWVzc2FnZVwiKVxuICAgICAgICBub0Vycm9yc01lc3NhZ2UuYXBwZW5kQ2hpbGQobWVzc2FnZSlcblxuICAgICAgICBlcnJvclVMLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIlxuICAgICAgICBsb2dUb29sc0NvbnRhaW5lci5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCJcbiAgICAgIH1cbiAgICB9LFxuICB9XG5cbiAgcmV0dXJuIHBsdWdpblxufVxuXG5leHBvcnQgY29uc3QgY2xlYXJMb2dzID0gKCkgPT4ge1xuICBhbGxMb2dzID0gW11cbiAgY29uc3QgbG9ncyA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibG9nXCIpXG4gIGlmIChsb2dzKSB7XG4gICAgbG9ncy50ZXh0Q29udGVudCA9IFwiXCJcbiAgfVxufVxuXG5leHBvcnQgY29uc3QgcnVuV2l0aEN1c3RvbUxvZ3MgPSAoY2xvc3VyZTogUHJvbWlzZTxzdHJpbmc+LCBpOiBGdW5jdGlvbikgPT4ge1xuICBjb25zdCBub0xvZ3MgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImVtcHR5LW1lc3NhZ2UtY29udGFpbmVyXCIpXG4gIGNvbnN0IGxvZ0NvbnRhaW5lciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwibG9nLWNvbnRhaW5lclwiKSFcbiAgY29uc3QgbG9nVG9vbHNDb250YWluZXIgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxvZy10b29sc1wiKSFcbiAgaWYgKG5vTG9ncykge1xuICAgIG5vTG9ncy5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCJcbiAgICBsb2dDb250YWluZXIuc3R5bGUuZGlzcGxheSA9IFwiYmxvY2tcIlxuICAgIGxvZ1Rvb2xzQ29udGFpbmVyLnN0eWxlLmRpc3BsYXkgPSBcImZsZXhcIlxuICB9XG5cbiAgcmV3aXJlTG9nZ2luZ1RvRWxlbWVudChcbiAgICAoKSA9PiBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcImxvZ1wiKSEsXG4gICAgKCkgPT4gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoXCJsb2ctY29udGFpbmVyXCIpISxcbiAgICBjbG9zdXJlLFxuICAgIHRydWUsXG4gICAgaVxuICApXG59XG5cbi8vIFRoYW5rcyBTTzogaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMjAyNTY3NjAvamF2YXNjcmlwdC1jb25zb2xlLWxvZy10by1odG1sLzM1NDQ5MjU2IzM1NDQ5MjU2XG5cbmZ1bmN0aW9uIHJld2lyZUxvZ2dpbmdUb0VsZW1lbnQoXG4gIGVsZUxvY2F0b3I6ICgpID0+IEVsZW1lbnQsXG4gIGVsZU92ZXJmbG93TG9jYXRvcjogKCkgPT4gRWxlbWVudCxcbiAgY2xvc3VyZTogUHJvbWlzZTxzdHJpbmc+LFxuICBhdXRvU2Nyb2xsOiBib29sZWFuLFxuICBpOiBGdW5jdGlvblxuKSB7XG4gIGNvbnN0IHJhd0NvbnNvbGUgPSBjb25zb2xlXG5cbiAgY2xvc3VyZS50aGVuKGpzID0+IHtcbiAgICBjb25zdCByZXBsYWNlID0ge30gYXMgYW55XG4gICAgYmluZExvZ2dpbmdGdW5jKHJlcGxhY2UsIHJhd0NvbnNvbGUsIFwibG9nXCIsIFwiTE9HXCIpXG4gICAgYmluZExvZ2dpbmdGdW5jKHJlcGxhY2UsIHJhd0NvbnNvbGUsIFwiZGVidWdcIiwgXCJEQkdcIilcbiAgICBiaW5kTG9nZ2luZ0Z1bmMocmVwbGFjZSwgcmF3Q29uc29sZSwgXCJ3YXJuXCIsIFwiV1JOXCIpXG4gICAgYmluZExvZ2dpbmdGdW5jKHJlcGxhY2UsIHJhd0NvbnNvbGUsIFwiZXJyb3JcIiwgXCJFUlJcIilcbiAgICByZXBsYWNlW1wiY2xlYXJcIl0gPSBjbGVhckxvZ3NcbiAgICBjb25zdCBjb25zb2xlID0gT2JqZWN0LmFzc2lnbih7fSwgcmF3Q29uc29sZSwgcmVwbGFjZSlcbiAgICB0cnkge1xuICAgICAgY29uc3Qgc2FmZUpTID0gc2FuaXRpemVKUyhqcylcbiAgICAgIGV2YWwoc2FmZUpTKVxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XG4gICAgICBjb25zb2xlLmVycm9yKGkoXCJwbGF5X3J1bl9qc19mYWlsXCIpKVxuICAgICAgY29uc29sZS5lcnJvcihlcnJvcilcblxuICAgICAgaWYgKGVycm9yIGluc3RhbmNlb2YgU3ludGF4RXJyb3IgJiYgL1xcYmV4cG9ydFxcYi91LnRlc3QoZXJyb3IubWVzc2FnZSkpIHtcbiAgICAgICAgY29uc29sZS53YXJuKFxuICAgICAgICAgICdUaXA6IENoYW5nZSB0aGUgTW9kdWxlIHNldHRpbmcgdG8gXCJDb21tb25KU1wiIGluIFRTIENvbmZpZyBzZXR0aW5ncyB0byBhbGxvdyB0b3AtbGV2ZWwgZXhwb3J0cyB0byB3b3JrIGluIHRoZSBQbGF5Z3JvdW5kJ1xuICAgICAgICApXG4gICAgICB9XG4gICAgfVxuICB9KVxuXG4gIGZ1bmN0aW9uIGJpbmRMb2dnaW5nRnVuYyhvYmo6IGFueSwgcmF3OiBhbnksIG5hbWU6IHN0cmluZywgaWQ6IHN0cmluZykge1xuICAgIG9ialtuYW1lXSA9IGZ1bmN0aW9uICguLi5vYmpzOiBhbnlbXSkge1xuICAgICAgY29uc3Qgb3V0cHV0ID0gcHJvZHVjZU91dHB1dChvYmpzKVxuICAgICAgY29uc3QgZWxlTG9nID0gZWxlTG9jYXRvcigpXG4gICAgICBjb25zdCBwcmVmaXggPSBgWzxzcGFuIGNsYXNzPVwibG9nLSR7bmFtZX1cIj4ke2lkfTwvc3Bhbj5dOiBgXG4gICAgICBjb25zdCBlbGVDb250YWluZXJMb2cgPSBlbGVPdmVyZmxvd0xvY2F0b3IoKVxuICAgICAgYWxsTG9ncy5wdXNoKGAke3ByZWZpeH0ke291dHB1dH08YnI+YClcbiAgICAgIGVsZUxvZy5pbm5lckhUTUwgPSBhbGxMb2dzLmpvaW4oXCI8aHIgLz5cIilcbiAgICAgIGlmIChhdXRvU2Nyb2xsICYmIGVsZUNvbnRhaW5lckxvZykge1xuICAgICAgICBlbGVDb250YWluZXJMb2cuc2Nyb2xsVG9wID0gZWxlQ29udGFpbmVyTG9nLnNjcm9sbEhlaWdodFxuICAgICAgfVxuICAgICAgcmF3W25hbWVdKC4uLm9ianMpXG4gICAgfVxuICB9XG5cbiAgY29uc3Qgb2JqZWN0VG9UZXh0ID0gKGFyZzogYW55KTogc3RyaW5nID0+IHtcbiAgICBjb25zdCBpc09iaiA9IHR5cGVvZiBhcmcgPT09IFwib2JqZWN0XCJcbiAgICBsZXQgdGV4dFJlcCA9IFwiXCJcbiAgICBpZiAoYXJnICYmIGFyZy5zdGFjayAmJiBhcmcubWVzc2FnZSkge1xuICAgICAgLy8gc3BlY2lhbCBjYXNlIGZvciBlcnJcbiAgICAgIHRleHRSZXAgPSBhcmcubWVzc2FnZVxuICAgIH0gZWxzZSBpZiAoYXJnID09PSBudWxsKSB7XG4gICAgICB0ZXh0UmVwID0gXCI8c3BhbiBjbGFzcz0nbGl0ZXJhbCc+bnVsbDwvc3Bhbj5cIlxuICAgIH0gZWxzZSBpZiAoYXJnID09PSB1bmRlZmluZWQpIHtcbiAgICAgIHRleHRSZXAgPSBcIjxzcGFuIGNsYXNzPSdsaXRlcmFsJz51bmRlZmluZWQ8L3NwYW4+XCJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBhcmcgPT09IFwic3ltYm9sXCIpIHtcbiAgICAgIHRleHRSZXAgPSBgPHNwYW4gY2xhc3M9J2xpdGVyYWwnPiR7U3RyaW5nKGFyZyl9PC9zcGFuPmBcbiAgICB9IGVsc2UgaWYgKEFycmF5LmlzQXJyYXkoYXJnKSkge1xuICAgICAgdGV4dFJlcCA9IFwiW1wiICsgYXJnLm1hcChvYmplY3RUb1RleHQpLmpvaW4oXCI8c3BhbiBjbGFzcz0nY29tbWEnPiwgPC9zcGFuPlwiKSArIFwiXVwiXG4gICAgfSBlbHNlIGlmIChhcmcgaW5zdGFuY2VvZiBTZXQpIHtcbiAgICAgIGNvbnN0IHNldEl0ZXIgPSBbLi4uYXJnXVxuICAgICAgdGV4dFJlcCA9IGBTZXQgKCR7YXJnLnNpemV9KSB7YCArIHNldEl0ZXIubWFwKG9iamVjdFRvVGV4dCkuam9pbihcIjxzcGFuIGNsYXNzPSdjb21tYSc+LCA8L3NwYW4+XCIpICsgXCJ9XCJcbiAgICB9IGVsc2UgaWYgKGFyZyBpbnN0YW5jZW9mIE1hcCkge1xuICAgICAgY29uc3QgbWFwSXRlciA9IFsuLi5hcmcuZW50cmllcygpXVxuICAgICAgdGV4dFJlcCA9XG4gICAgICAgIGBNYXAgKCR7YXJnLnNpemV9KSB7YCArXG4gICAgICAgIG1hcEl0ZXIubWFwKChbaywgdl0pID0+IGAke29iamVjdFRvVGV4dChrKX0gPT4gJHtvYmplY3RUb1RleHQodil9YCkuam9pbihcIjxzcGFuIGNsYXNzPSdjb21tYSc+LCA8L3NwYW4+XCIpICtcbiAgICAgICAgXCJ9XCJcbiAgICB9IGVsc2UgaWYgKHR5cGVvZiBhcmcgPT09IFwic3RyaW5nXCIpIHtcbiAgICAgIHRleHRSZXAgPSAnXCInICsgYXJnICsgJ1wiJ1xuICAgIH0gZWxzZSBpZiAoaXNPYmopIHtcbiAgICAgIGNvbnN0IG5hbWUgPSBhcmcuY29uc3RydWN0b3IgJiYgYXJnLmNvbnN0cnVjdG9yLm5hbWVcbiAgICAgIC8vIE5vIG9uZSBuZWVkcyB0byBrbm93IGFuIG9iaiBpcyBhbiBvYmpcbiAgICAgIGNvbnN0IG5hbWVXaXRob3V0T2JqZWN0ID0gbmFtZSAmJiBuYW1lID09PSBcIk9iamVjdFwiID8gXCJcIiA6IG5hbWVcbiAgICAgIGNvbnN0IHByZWZpeCA9IG5hbWVXaXRob3V0T2JqZWN0ID8gYCR7bmFtZVdpdGhvdXRPYmplY3R9OiBgIDogXCJcIlxuXG4gICAgICAvLyBKU09OLnN0cmluZ2lmeSBvbWl0cyBhbnkga2V5cyB3aXRoIGEgdmFsdWUgb2YgdW5kZWZpbmVkLiBUbyBnZXQgYXJvdW5kIHRoaXMsIHdlIHJlcGxhY2UgdW5kZWZpbmVkIHdpdGggdGhlIHRleHQgX191bmRlZmluZWRfXyBhbmQgdGhlbiBkbyBhIGdsb2JhbCByZXBsYWNlIHVzaW5nIHJlZ2V4IGJhY2sgdG8ga2V5d29yZCB1bmRlZmluZWRcbiAgICAgIHRleHRSZXAgPVxuICAgICAgICBwcmVmaXggK1xuICAgICAgICBKU09OLnN0cmluZ2lmeShhcmcsIChfLCB2YWx1ZSkgPT4gKHZhbHVlID09PSB1bmRlZmluZWQgPyBcIl9fdW5kZWZpbmVkX19cIiA6IHZhbHVlKSwgMikucmVwbGFjZShcbiAgICAgICAgICAvXCJfX3VuZGVmaW5lZF9fXCIvZyxcbiAgICAgICAgICBcInVuZGVmaW5lZFwiXG4gICAgICAgIClcbiAgICB9IGVsc2Uge1xuICAgICAgdGV4dFJlcCA9IFN0cmluZyhhcmcpXG4gICAgfVxuICAgIHJldHVybiB0ZXh0UmVwXG4gIH1cblxuICBmdW5jdGlvbiBwcm9kdWNlT3V0cHV0KGFyZ3M6IGFueVtdKSB7XG4gICAgcmV0dXJuIGFyZ3MucmVkdWNlKChvdXRwdXQ6IGFueSwgYXJnOiBhbnksIGluZGV4KSA9PiB7XG4gICAgICBjb25zdCB0ZXh0UmVwID0gb2JqZWN0VG9UZXh0KGFyZylcbiAgICAgIGNvbnN0IHNob3dDb21tYSA9IGluZGV4ICE9PSBhcmdzLmxlbmd0aCAtIDFcbiAgICAgIGNvbnN0IGNvbW1hID0gc2hvd0NvbW1hID8gXCI8c3BhbiBjbGFzcz0nY29tbWEnPiwgPC9zcGFuPlwiIDogXCJcIlxuICAgICAgcmV0dXJuIG91dHB1dCArIHRleHRSZXAgKyBjb21tYSArIFwiJm5ic3A7XCJcbiAgICB9LCBcIlwiKVxuICB9XG59XG5cbi8vIFRoZSByZWZsZWN0LW1ldGFkYXRhIHJ1bnRpbWUgaXMgYXZhaWxhYmxlLCBzbyBhbGxvdyB0aGF0IHRvIGdvIHRocm91Z2hcbmZ1bmN0aW9uIHNhbml0aXplSlMoY29kZTogc3RyaW5nKSB7XG4gIHJldHVybiBjb2RlLnJlcGxhY2UoYGltcG9ydCBcInJlZmxlY3QtbWV0YWRhdGFcImAsIFwiXCIpLnJlcGxhY2UoYHJlcXVpcmUoXCJyZWZsZWN0LW1ldGFkYXRhXCIpYCwgXCJcIilcbn1cbiJdfQ==