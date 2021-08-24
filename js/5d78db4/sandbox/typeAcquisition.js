var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
define(["require", "exports", "./vendor/lzstring.min"], function (require, exports, lzstring_min_1) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.detectNewImportsToAcquireTypeFor = exports.acquiredTypeDefs = void 0;
    lzstring_min_1 = __importDefault(lzstring_min_1);
    const globalishObj = typeof globalThis !== "undefined" ? globalThis : window || {};
    globalishObj.typeDefinitions = {};
    /**
     * Type Defs we've already got, and nulls when something has failed.
     * This is to make sure that it doesn't infinite loop.
     */
    exports.acquiredTypeDefs = globalishObj.typeDefinitions;
    const moduleJSONURL = (name) => 
    // prettier-ignore
    `https://ofcncog2cu-dsn.algolia.net/1/indexes/npm-search/${encodeURIComponent(name)}?attributes=types&x-algolia-agent=Algolia%20for%20vanilla%20JavaScript%20(lite)%203.27.1&x-algolia-application-id=OFCNCOG2CU&x-algolia-api-key=f54e21fa3a2a0160595bb058179bfb1e`;
    const unpkgURL = (name, path) => {
        if (!name) {
            const actualName = path.substring(0, path.indexOf("/"));
            const actualPath = path.substring(path.indexOf("/") + 1);
            return `https://www.unpkg.com/${encodeURIComponent(actualName)}/${encodeURIComponent(actualPath)}`;
        }
        return `https://www.unpkg.com/${encodeURIComponent(name)}/${encodeURIComponent(path)}`;
    };
    const packageJSONURL = (name) => unpkgURL(name, "package.json");
    const errorMsg = (msg, response, config) => {
        config.logger.error(`${msg} - will not try again in this session`, response.status, response.statusText, response);
    };
    /**
     * Grab any import/requires from inside the code and make a list of
     * its dependencies
     */
    const parseFileForModuleReferences = (sourceCode) => {
        // https://regex101.com/r/Jxa3KX/4
        const requirePattern = /(const|let|var)(.|\n)*? require\(('|")(.*)('|")\);?$/gm;
        // this handle ths 'from' imports  https://regex101.com/r/hdEpzO/4
        const es6Pattern = /(import|export)((?!from)(?!require)(.|\n))*?(from|require\()\s?('|")(.*)('|")\)?;?$/gm;
        // https://regex101.com/r/hdEpzO/8
        const es6ImportOnly = /import\s+?\(?('|")(.*)('|")\)?;?/gm;
        const foundModules = new Set();
        var match;
        while ((match = es6Pattern.exec(sourceCode)) !== null) {
            if (match[6])
                foundModules.add(match[6]);
        }
        while ((match = requirePattern.exec(sourceCode)) !== null) {
            if (match[5])
                foundModules.add(match[5]);
        }
        while ((match = es6ImportOnly.exec(sourceCode)) !== null) {
            if (match[2])
                foundModules.add(match[2]);
        }
        return Array.from(foundModules);
    };
    /** Converts some of the known global imports to node so that we grab the right info */
    const mapModuleNameToModule = (name) => {
        // in node repl:
        // > require("module").builtinModules
        const builtInNodeMods = [
            "assert",
            "async_hooks",
            "buffer",
            "child_process",
            "cluster",
            "console",
            "constants",
            "crypto",
            "dgram",
            "dns",
            "domain",
            "events",
            "fs",
            "fs/promises",
            "http",
            "http2",
            "https",
            "inspector",
            "module",
            "net",
            "os",
            "path",
            "perf_hooks",
            "process",
            "punycode",
            "querystring",
            "readline",
            "repl",
            "stream",
            "string_decoder",
            "sys",
            "timers",
            "tls",
            "trace_events",
            "tty",
            "url",
            "util",
            "v8",
            "vm",
            "wasi",
            "worker_threads",
            "zlib",
        ];
        if (builtInNodeMods.includes(name)) {
            return "node";
        }
        return name;
    };
    //** A really simple version of path.resolve */
    const mapRelativePath = (moduleDeclaration, currentPath) => {
        // https://stackoverflow.com/questions/14780350/convert-relative-path-to-absolute-using-javascript
        function absolute(base, relative) {
            if (!base)
                return relative;
            const stack = base.split("/");
            const parts = relative.split("/");
            stack.pop(); // remove current file name (or empty string)
            for (var i = 0; i < parts.length; i++) {
                if (parts[i] == ".")
                    continue;
                if (parts[i] == "..")
                    stack.pop();
                else
                    stack.push(parts[i]);
            }
            return stack.join("/");
        }
        return absolute(currentPath, moduleDeclaration);
    };
    const convertToModuleReferenceID = (outerModule, moduleDeclaration, currentPath) => {
        const modIsScopedPackageOnly = moduleDeclaration.indexOf("@") === 0 && moduleDeclaration.split("/").length === 2;
        const modIsPackageOnly = moduleDeclaration.indexOf("@") === -1 && moduleDeclaration.split("/").length === 1;
        const isPackageRootImport = modIsPackageOnly || modIsScopedPackageOnly;
        if (isPackageRootImport) {
            return moduleDeclaration;
        }
        else {
            return `${outerModule}-${mapRelativePath(moduleDeclaration, currentPath)}`;
        }
    };
    /**
     * Takes an initial module and the path for the root of the typings and grab it and start grabbing its
     * dependencies then add those the to runtime.
     */
    const addModuleToRuntime = (mod, path, config) => __awaiter(void 0, void 0, void 0, function* () {
        const isDeno = path && path.indexOf("https://") === 0;
        let actualMod = mod;
        let actualPath = path;
        if (!mod) {
            actualMod = path.substring(0, path.indexOf("/"));
            actualPath = path.substring(path.indexOf("/") + 1);
        }
        const dtsFileURL = isDeno ? path : unpkgURL(actualMod, actualPath);
        let content = yield getCachedDTSString(config, dtsFileURL);
        if (!content) {
            const isDeno = actualPath && actualPath.indexOf("https://") === 0;
            const indexPath = `${actualPath.replace(".d.ts", "")}/index.d.ts`;
            const dtsFileURL = isDeno ? actualPath : unpkgURL(actualMod, indexPath);
            content = yield getCachedDTSString(config, dtsFileURL);
            if (!content) {
                return errorMsg(`Could not get root d.ts file for the module '${actualMod}' at ${actualPath}`, {}, config);
            }
            if (!isDeno) {
                actualPath = indexPath;
            }
        }
        // Now look and grab dependent modules where you need the
        yield getDependenciesForModule(content, actualMod, actualPath, config);
        if (isDeno) {
            const wrapped = `declare module "${actualPath}" { ${content} }`;
            config.addLibraryToRuntime(wrapped, actualPath);
        }
        else {
            config.addLibraryToRuntime(content, `file:///node_modules/${actualMod}/${actualPath}`);
        }
    });
    /**
     * Takes a module import, then uses both the algolia API and the the package.json to derive
     * the root type def path.
     *
     * @param {string} packageName
     * @returns {Promise<{ mod: string, path: string, packageJSON: any }>}
     */
    const getModuleAndRootDefTypePath = (packageName, config) => __awaiter(void 0, void 0, void 0, function* () {
        const url = moduleJSONURL(packageName);
        const response = yield config.fetcher(url);
        if (!response.ok) {
            return errorMsg(`Could not get Algolia JSON for the module '${packageName}'`, response, config);
        }
        const responseJSON = yield response.json();
        if (!responseJSON) {
            return errorMsg(`Could the Algolia JSON was un-parsable for the module '${packageName}'`, response, config);
        }
        if (!responseJSON.types) {
            return config.logger.log(`There were no types for '${packageName}' - will not try again in this session`);
        }
        if (!responseJSON.types.ts) {
            return config.logger.log(`There were no types for '${packageName}' - will not try again in this session`);
        }
        exports.acquiredTypeDefs[packageName] = responseJSON;
        if (responseJSON.types.ts === "included") {
            const modPackageURL = packageJSONURL(packageName);
            const response = yield config.fetcher(modPackageURL);
            if (!response.ok) {
                return errorMsg(`Could not get Package JSON for the module '${packageName}'`, response, config);
            }
            const responseJSON = yield response.json();
            if (!responseJSON) {
                return errorMsg(`Could not get Package JSON for the module '${packageName}'`, response, config);
            }
            config.addLibraryToRuntime(JSON.stringify(responseJSON, null, "  "), `file:///node_modules/${packageName}/package.json`);
            // Get the path of the root d.ts file
            // non-inferred route
            let rootTypePath = responseJSON.typing || responseJSON.typings || responseJSON.types;
            // package main is custom
            if (!rootTypePath && typeof responseJSON.main === "string" && responseJSON.main.indexOf(".js") > 0) {
                rootTypePath = responseJSON.main.replace(/js$/, "d.ts");
            }
            // Final fallback, to have got here it must have passed in algolia
            if (!rootTypePath) {
                rootTypePath = "index.d.ts";
            }
            return { mod: packageName, path: rootTypePath, packageJSON: responseJSON };
        }
        else if (responseJSON.types.ts === "definitely-typed") {
            return { mod: responseJSON.types.definitelyTyped, path: "index.d.ts", packageJSON: responseJSON };
        }
        else {
            throw "This shouldn't happen";
        }
    });
    const getCachedDTSString = (config, url) => __awaiter(void 0, void 0, void 0, function* () {
        const cached = localStorage.getItem(url);
        if (cached) {
            const [dateString, text] = cached.split("-=-^-=-");
            const cachedDate = new Date(dateString);
            const now = new Date();
            const cacheTimeout = 604800000; // 1 week
            // const cacheTimeout = 60000 // 1 min
            if (now.getTime() - cachedDate.getTime() < cacheTimeout) {
                return lzstring_min_1.default.decompressFromUTF16(text);
            }
            else {
                config.logger.log("Skipping cache for ", url);
            }
        }
        const response = yield config.fetcher(url);
        if (!response.ok) {
            return errorMsg(`Could not get DTS response for the module at ${url}`, response, config);
        }
        // TODO: handle checking for a resolve to index.d.ts whens someone imports the folder
        let content = yield response.text();
        if (!content) {
            return errorMsg(`Could not get text for DTS response at ${url}`, response, config);
        }
        const now = new Date();
        const cacheContent = `${now.toISOString()}-=-^-=-${lzstring_min_1.default.compressToUTF16(content)}`;
        localStorage.setItem(url, cacheContent);
        return content;
    });
    const getReferenceDependencies = (sourceCode, mod, path, config) => __awaiter(void 0, void 0, void 0, function* () {
        var match;
        if (sourceCode.indexOf("reference path") > 0) {
            // https://regex101.com/r/DaOegw/1
            const referencePathExtractionPattern = /<reference path="(.*)" \/>/gm;
            while ((match = referencePathExtractionPattern.exec(sourceCode)) !== null) {
                const relativePath = match[1];
                if (relativePath) {
                    let newPath = mapRelativePath(relativePath, path);
                    if (newPath) {
                        const dtsRefURL = unpkgURL(mod, newPath);
                        const dtsReferenceResponseText = yield getCachedDTSString(config, dtsRefURL);
                        if (!dtsReferenceResponseText) {
                            return errorMsg(`Could not get root d.ts file for the module '${mod}' at ${path}`, {}, config);
                        }
                        yield getDependenciesForModule(dtsReferenceResponseText, mod, newPath, config);
                        const representationalPath = `file:///node_modules/${mod}/${newPath}`;
                        config.addLibraryToRuntime(dtsReferenceResponseText, representationalPath);
                    }
                }
            }
        }
    });
    /**
     * Pseudo in-browser type acquisition tool, uses a
     */
    const detectNewImportsToAcquireTypeFor = (sourceCode, userAddLibraryToRuntime, fetcher = fetch, playgroundConfig) => __awaiter(void 0, void 0, void 0, function* () {
        // Wrap the runtime func with our own side-effect for visibility
        const addLibraryToRuntime = (code, path) => {
            globalishObj.typeDefinitions[path] = code;
            userAddLibraryToRuntime(code, path);
        };
        // Basically start the recursion with an undefined module
        const config = { sourceCode, addLibraryToRuntime, fetcher, logger: playgroundConfig.logger };
        const results = getDependenciesForModule(sourceCode, undefined, "playground.ts", config);
        return results;
    });
    exports.detectNewImportsToAcquireTypeFor = detectNewImportsToAcquireTypeFor;
    /**
     * Looks at a JS/DTS file and recurses through all the dependencies.
     * It avoids
     */
    const getDependenciesForModule = (sourceCode, moduleName, path, config) => {
        // Get all the import/requires for the file
        const filteredModulesToLookAt = parseFileForModuleReferences(sourceCode);
        filteredModulesToLookAt.forEach((name) => __awaiter(void 0, void 0, void 0, function* () {
            // Support grabbing the hard-coded node modules if needed
            const moduleToDownload = mapModuleNameToModule(name);
            if (!moduleName && moduleToDownload.startsWith(".")) {
                return config.logger.log("[ATA] Can't resolve relative dependencies from the playground root");
            }
            const moduleID = convertToModuleReferenceID(moduleName, moduleToDownload, moduleName);
            if (exports.acquiredTypeDefs[moduleID] || exports.acquiredTypeDefs[moduleID] === null) {
                return;
            }
            config.logger.log(`[ATA] Looking at ${moduleToDownload}`);
            const modIsScopedPackageOnly = moduleToDownload.indexOf("@") === 0 && moduleToDownload.split("/").length === 2;
            const modIsPackageOnly = moduleToDownload.indexOf("@") === -1 && moduleToDownload.split("/").length === 1;
            const isPackageRootImport = modIsPackageOnly || modIsScopedPackageOnly;
            const isDenoModule = moduleToDownload.indexOf("https://") === 0;
            if (isPackageRootImport) {
                // So it doesn't run twice for a package
                exports.acquiredTypeDefs[moduleID] = null;
                // E.g. import danger from "danger"
                const packageDef = yield getModuleAndRootDefTypePath(moduleToDownload, config);
                if (packageDef) {
                    exports.acquiredTypeDefs[moduleID] = packageDef.packageJSON;
                    yield addModuleToRuntime(packageDef.mod, packageDef.path, config);
                }
            }
            else if (isDenoModule) {
                // E.g. import { serve } from "https://deno.land/std@v0.12/http/server.ts";
                yield addModuleToRuntime(moduleToDownload, moduleToDownload, config);
            }
            else {
                // E.g. import {Component} from "./MyThing"
                if (!moduleToDownload || !path)
                    throw `No outer module or path for a relative import: ${moduleToDownload}`;
                const absolutePathForModule = mapRelativePath(moduleToDownload, path);
                // So it doesn't run twice for a package
                exports.acquiredTypeDefs[moduleID] = null;
                const resolvedFilepath = absolutePathForModule.endsWith(".ts")
                    ? absolutePathForModule
                    : absolutePathForModule + ".d.ts";
                yield addModuleToRuntime(moduleName, resolvedFilepath, config);
            }
        }));
        // Also support the
        getReferenceDependencies(sourceCode, moduleName, path, config);
    };
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidHlwZUFjcXVpc2l0aW9uLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiLi4vLi4vLi4vLi4vc2FuZGJveC9zcmMvdHlwZUFjcXVpc2l0aW9uLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7O0lBR0EsTUFBTSxZQUFZLEdBQVEsT0FBTyxVQUFVLEtBQUssV0FBVyxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsQ0FBQyxDQUFDLE1BQU0sSUFBSSxFQUFFLENBQUE7SUFDdkYsWUFBWSxDQUFDLGVBQWUsR0FBRyxFQUFFLENBQUE7SUFFakM7OztPQUdHO0lBQ1UsUUFBQSxnQkFBZ0IsR0FBc0MsWUFBWSxDQUFDLGVBQWUsQ0FBQTtJQUkvRixNQUFNLGFBQWEsR0FBRyxDQUFDLElBQVksRUFBRSxFQUFFO0lBQ3JDLGtCQUFrQjtJQUNsQiwyREFBMkQsa0JBQWtCLENBQUMsSUFBSSxDQUFDLGlMQUFpTCxDQUFBO0lBRXRRLE1BQU0sUUFBUSxHQUFHLENBQUMsSUFBWSxFQUFFLElBQVksRUFBRSxFQUFFO1FBQzlDLElBQUksQ0FBQyxJQUFJLEVBQUU7WUFDVCxNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsU0FBUyxDQUFDLENBQUMsRUFBRSxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUE7WUFDdkQsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFNBQVMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFBO1lBQ3hELE9BQU8seUJBQXlCLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxJQUFJLGtCQUFrQixDQUFDLFVBQVUsQ0FBQyxFQUFFLENBQUE7U0FDbkc7UUFDRCxPQUFPLHlCQUF5QixrQkFBa0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxrQkFBa0IsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFBO0lBQ3hGLENBQUMsQ0FBQTtJQUVELE1BQU0sY0FBYyxHQUFHLENBQUMs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QTJCLENBQUMsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUE7Z0JBRTlFLElBQUksVUFBVSxFQUFFO29CQUNkLHdCQUFnQixDQUFDLFFBQVEsQ0FBQyxHQUFHLFVBQVUsQ0FBQyxXQUFXLENBQUE7b0JBQ25ELE1BQU0sa0JBQWtCLENBQUMsVUFBVSxDQUFDLEdBQUcsRUFBRSxVQUFVLENBQUMsSUFBSSxFQUFFLE1BQU0sQ0FBQyxDQUFBO2lCQUNsRTthQUNGO2lCQUFNLElBQUksWUFBWSxFQUFFO2dCQUN2QiwyRUFBMkU7Z0JBQzNFLE1BQU0sa0JBQWtCLENBQUMsZ0JBQWdCLEVBQUUsZ0JBQWdCLEVBQUUsTUFBTSxDQUFDLENBQUE7YUFDckU7aUJBQU07Z0JBQ0wsMkNBQTJDO2dCQUMzQyxJQUFJLENBQUMsZ0JBQWdCLElBQUksQ0FBQyxJQUFJO29CQUFFLE1BQU0sa0RBQWtELGdCQUFnQixFQUFFLENBQUE7Z0JBRTFHLE1BQU0scUJBQXFCLEdBQUcsZUFBZSxDQUFDLGdCQUFnQixFQUFFLElBQUksQ0FBQyxDQUFBO2dCQUVyRSx3Q0FBd0M7Z0JBQ3hDLHdCQUFnQixDQUFDLFFBQVEsQ0FBQyxHQUFHLElBQUksQ0FBQTtnQkFFakMsTUFBTSxnQkFBZ0IsR0FBRyxxQkFBcUIsQ0FBQyxRQUFRLENBQUMsS0FBSyxDQUFDO29CQUM1RCxDQUFDLENBQUMscUJBQXFCO29CQUN2QixDQUFDLENBQUMscUJBQXFCLEdBQUcsT0FBTyxDQUFBO2dCQUVuQyxNQUFNLGtCQUFrQixDQUFDLFVBQVcsRUFBRSxnQkFBZ0IsRUFBRSxNQUFNLENBQUMsQ0FBQTthQUNoRTtRQUNILENBQUMsQ0FBQSxDQUFDLENBQUE7UUFFRixtQkFBbUI7UUFDbkIsd0JBQXdCLENBQUMsVUFBVSxFQUFFLFVBQVcsRUFBRSxJQUFLLEVBQUUsTUFBTSxDQUFDLENBQUE7SUFDbEUsQ0FBQyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgU2FuZGJveENvbmZpZyB9IGZyb20gXCIuL1wiXG5pbXBvcnQgbHpzdHJpbmcgZnJvbSBcIi4vdmVuZG9yL2x6c3RyaW5nLm1pblwiXG5cbmNvbnN0IGdsb2JhbGlzaE9iajogYW55ID0gdHlwZW9mIGdsb2JhbFRoaXMgIT09IFwidW5kZWZpbmVkXCIgPyBnbG9iYWxUaGlzIDogd2luZG93IHx8IHt9XG5nbG9iYWxpc2hPYmoudHlwZURlZmluaXRpb25zID0ge31cblxuLyoqXG4gKiBUeXBlIERlZnMgd2UndmUgYWxyZWFkeSBnb3QsIGFuZCBudWxscyB3aGVuIHNvbWV0aGluZyBoYXMgZmFpbGVkLlxuICogVGhpcyBpcyB0byBtYWtlIHN1cmUgdGhhdCBpdCBkb2Vzbid0IGluZmluaXRlIGxvb3AuXG4gKi9cbmV4cG9ydCBjb25zdCBhY3F1aXJlZFR5cGVEZWZzOiB7IFtuYW1lOiBzdHJpbmddOiBzdHJpbmcgfCBudWxsIH0gPSBnbG9iYWxpc2hPYmoudHlwZURlZmluaXRpb25zXG5cbmV4cG9ydCB0eXBlIEFkZExpYlRvUnVudGltZUZ1bmMgPSAoY29kZTogc3RyaW5nLCBwYXRoOiBzdHJpbmcpID0+IHZvaWRcblxuY29uc3QgbW9kdWxlSlNPTlVSTCA9IChuYW1lOiBzdHJpbmcpID0+XG4gIC8vIHByZXR0aWVyLWlnbm9yZVxuICBgaHR0cHM6Ly9vZmNuY29nMmN1LWRzbi5hbGdvbGlhLm5ldC8xL2luZGV4ZXMvbnBtLXNlYXJjaC8ke2VuY29kZVVSSUNvbXBvbmVudChuYW1lKX0/YXR0cmlidXRlcz10eXBlcyZ4LWFsZ29saWEtYWdlbnQ9QWxnb2xpYSUyMGZvciUyMHZhbmlsbGElMjBKYXZhU2NyaXB0JTIwKGxpdGUpJTIwMy4yNy4xJngtYWxnb2xpYS1hcHBsaWNhdGlvbi1pZD1PRkNOQ09HMkNVJngtYWxnb2xpYS1hcGkta2V5PWY1NGUyMWZhM2EyYTAxNjA1OTViYjA1ODE3OWJmYjFlYFxuXG5jb25zdCB1bnBrZ1VSTCA9IChuYW1lOiBzdHJpbmcsIHBhdGg6IHN0cmluZykgPT4ge1xuICBpZiAoIW5hbWUpIHtcbiAgICBjb25zdCBhY3R1YWxOYW1lID0gcGF0aC5zdWJzdHJpbmcoMCwgcGF0aC5pbmRleE9mKFwiL1wiKSlcbiAgICBjb25zdCBhY3R1YWxQYXRoID0gcGF0aC5zdWJzdHJpbmcocGF0aC5pbmRleE9mKFwiL1wiKSArIDEpXG4gICAgcmV0dXJuIGBodHRwczovL3d3dy51bnBrZy5jb20vJHtlbmNvZGVVUklDb21wb25lbnQoYWN0dWFsTmFtZSl9LyR7ZW5jb2RlVVJJQ29tcG9uZW50KGFjdHVhbFBhdGgpfWBcbiAgfVxuICByZXR1cm4gYGh0dHBzOi8vd3d3LnVucGtnLmNvbS8ke2VuY29kZVVSSUNvbXBvbmVudChuYW1lKX0vJHtlbmNvZGVVUklDb21wb25lbnQocGF0aCl9YFxufVxuXG5jb25zdCBwYWNrYWdlSlNPTlVSTCA9IChuYW1lOiBzdHJpbmcpID0+IHVucGtnVVJMKG5hbWUsIFwicGFja2FnZS5qc29uXCIpXG5cbmNvbnN0IGVycm9yTXNnID0gKG1zZzogc3RyaW5nLCByZXNwb25zZTogYW55LCBjb25maWc6IEFUQUNvbmZpZykgPT4ge1xuICBjb25maWcubG9nZ2VyLmVycm9yKGAke21zZ30gLSB3aWxsIG5vdCB0cnkgYWdhaW4gaW4gdGhpcyBzZXNzaW9uYCwgcmVzcG9uc2Uuc3RhdHVzLCByZXNwb25zZS5zdGF0dXNUZXh0LCByZXNwb25zZSlcbn1cblxuLyoqXG4gKiBHcmFiIGFueSBpbXBvcnQvcmVxdWlyZXMgZnJvbSBpbnNpZGUgdGhlIGNvZGUgYW5kIG1ha2UgYSBsaXN0IG9mXG4gKiBpdHMgZGVwZW5kZW5jaWVzXG4gKi9cbmNvbnN0IHBhcnNlRmlsZUZvck1vZHVsZVJlZmVyZW5jZXMgPSAoc291cmNlQ29kZTogc3RyaW5nKSA9PiB7XG4gIC8vIGh0dHBzOi8vcmVnZXgxMDEuY29tL3IvSnhhM0tYLzRcbiAgY29uc3QgcmVxdWlyZVBhdHRlcm4gPSAvKGNvbnN0fGxldHx2YXIpKC58XFxuKSo/IHJlcXVpcmVcXCgoJ3xcIikoLiopKCd8XCIpXFwpOz8kL2dtXG4gIC8vIHRoaXMgaGFuZGxlIHRocyAnZnJvbScgaW1wb3J0cyAgaHR0cHM6Ly9yZWdleDEwMS5jb20vci9oZEVwek8vNFxuICBjb25zdCBlczZQYXR0ZXJuID0gLyhpbXBvcnR8ZXhwb3J0KSgoPyFmcm9tKSg/IXJlcXVpcmUpKC58XFxuKSkqPyhmcm9tfHJlcXVpcmVcXCgpXFxzPygnfFwiKSguKikoJ3xcIilcXCk/Oz8kL2dtXG4gIC8vIGh0dHBzOi8vcmVnZXgxMDEuY29tL3IvaGRFcHpPLzhcbiAgY29uc3QgZXM2SW1wb3J0T25seSA9IC9pbXBvcnRcXHMrP1xcKD8oJ3xcIikoLiopKCd8XCIpXFwpPzs/L2dtXG5cbiAgY29uc3QgZm91bmRNb2R1bGVzID0gbmV3IFNldDxzdHJpbmc+KClcbiAgdmFyIG1hdGNoXG5cbiAgd2hpbGUgKChtYXRjaCA9IGVzNlBhdHRlcm4uZXhlYyhzb3VyY2VDb2RlKSkgIT09IG51bGwpIHtcbiAgICBpZiAobWF0Y2hbNl0pIGZvdW5kTW9kdWxlcy5hZGQobWF0Y2hbNl0pXG4gIH1cblxuICB3aGlsZSAoKG1hdGNoID0gcmVxdWlyZVBhdHRlcm4uZXhlYyhzb3VyY2VDb2RlKSkgIT09IG51bGwpIHtcbiAgICBpZiAobWF0Y2hbNV0pIGZvdW5kTW9kdWxlcy5hZGQobWF0Y2hbNV0pXG4gIH1cblxuICB3aGlsZSAoKG1hdGNoID0gZXM2SW1wb3J0T25seS5leGVjKHNvdXJjZUNvZGUpKSAhPT0gbnVsbCkge1xuICAgIGlmIChtYXRjaFsyXSkgZm91bmRNb2R1bGVzLmFkZChtYXRjaFsyXSlcbiAgfVxuXG4gIHJldHVybiBBcnJheS5mcm9tKGZvdW5kTW9kdWxlcylcbn1cblxuLyoqIENvbnZlcnRzIHNvbWUgb2YgdGhlIGtub3duIGdsb2JhbCBpbXBvcnRzIHRvIG5vZGUgc28gdGhhdCB3ZSBncmFiIHRoZSByaWdodCBpbmZvICovXG5jb25zdCBtYXBNb2R1bGVOYW1lVG9Nb2R1bGUgPSAobmFtZTogc3RyaW5nKSA9PiB7XG4gIC8vIGluIG5vZGUgcmVwbDpcbiAgLy8gPiByZXF1aXJlKFwibW9kdWxlXCIpLmJ1aWx0aW5Nb2R1bGVzXG4gIGNvbnN0IGJ1aWx0SW5Ob2RlTW9kcyA9IFtcbiAgICBcImFzc2VydFwiLFxuICAgIFwiYXN5bmNfaG9va3NcIixcbiAgICBcImJ1ZmZlclwiLFxuICAgIFwiY2hpbGRfcHJvY2Vzc1wiLFxuICAgIFwiY2x1c3RlclwiLFxuICAgIFwiY29uc29sZVwiLFxuICAgIFwiY29uc3RhbnRzXCIsXG4gICAgXCJjcnlwdG9cIixcbiAgICBcImRncmFtXCIsXG4gICAgXCJkbnNcIixcbiAgICBcImRvbWFpblwiLFxuICAgIFwiZXZlbnRzXCIsXG4gICAgXCJmc1wiLFxuICAgIFwiZnMvcHJvbWlzZXNcIixcbiAgICBcImh0dHBcIixcbiAgICBcImh0dHAyXCIsXG4gICAgXCJodHRwc1wiLFxuICAgIFwiaW5zcGVjdG9yXCIsXG4gICAgXCJtb2R1bGVcIixcbiAgICBcIm5ldFwiLFxuICAgIFwib3NcIixcbiAgICBcInBhdGhcIixcbiAgICBcInBlcmZfaG9va3NcIixcbiAgICBcInByb2Nlc3NcIixcbiAgICBcInB1bnljb2RlXCIsXG4gICAgXCJxdWVyeXN0cmluZ1wiLFxuICAgIFwicmVhZGxpbmVcIixcbiAgICBcInJlcGxcIixcbiAgICBcInN0cmVhbVwiLFxuICAgIFwic3RyaW5nX2RlY29kZXJcIixcbiAgICBcInN5c1wiLFxuICAgIFwidGltZXJzXCIsXG4gICAgXCJ0bHNcIixcbiAgICBcInRyYWNlX2V2ZW50c1wiLFxuICAgIFwidHR5XCIsXG4gICAgXCJ1cmxcIixcbiAgICBcInV0aWxcIixcbiAgICBcInY4XCIsXG4gICAgXCJ2bVwiLFxuICAgIFwid2FzaVwiLFxuICAgIFwid29ya2VyX3RocmVhZHNcIixcbiAgICBcInpsaWJcIixcbiAgXVxuXG4gIGlmIChidWlsdEluTm9kZU1vZHMuaW5jbHVkZXMobmFtZSkpIHtcbiAgICByZXR1cm4gXCJub2RlXCJcbiAgfVxuICByZXR1cm4gbmFtZVxufVxuXG4vLyoqIEEgcmVhbGx5IHNpbXBsZSB2ZXJzaW9uIG9mIHBhdGgucmVzb2x2ZSAqL1xuY29uc3QgbWFwUmVsYXRpdmVQYXRoID0gKG1vZHVsZURlY2xhcmF0aW9uOiBzdHJpbmcsIGN1cnJlbnRQYXRoOiBzdHJpbmcpID0+IHtcbiAgLy8gaHR0cHM6Ly9zdGFja292ZXJmbG93LmNvbS9xdWVzdGlvbnMvMTQ3ODAzNTAvY29udmVydC1yZWxhdGl2ZS1wYXRoLXRvLWFic29sdXRlLXVzaW5nLWphdmFzY3JpcHRcbiAgZnVuY3Rpb24gYWJzb2x1dGUoYmFzZTogc3RyaW5nLCByZWxhdGl2ZTogc3RyaW5nKSB7XG4gICAgaWYgKCFiYXNlKSByZXR1cm4gcmVsYXRpdmVcblxuICAgIGNvbnN0IHN0YWNrID0gYmFzZS5zcGxpdChcIi9cIilcbiAgICBjb25zdCBwYXJ0cyA9IHJlbGF0aXZlLnNwbGl0KFwiL1wiKVxuICAgIHN0YWNrLnBvcCgpIC8vIHJlbW92ZSBjdXJyZW50IGZpbGUgbmFtZSAob3IgZW1wdHkgc3RyaW5nKVxuXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBwYXJ0cy5sZW5ndGg7IGkrKykge1xuICAgICAgaWYgKHBhcnRzW2ldID09IFwiLlwiKSBjb250aW51ZVxuICAgICAgaWYgKHBhcnRzW2ldID09IFwiLi5cIikgc3RhY2sucG9wKClcbiAgICAgIGVsc2Ugc3RhY2sucHVzaChwYXJ0c1tpXSlcbiAgICB9XG4gICAgcmV0dXJuIHN0YWNrLmpvaW4oXCIvXCIpXG4gIH1cblxuICByZXR1cm4gYWJzb2x1dGUoY3VycmVudFBhdGgsIG1vZHVsZURlY2xhcmF0aW9uKVxufVxuXG5jb25zdCBjb252ZXJ0VG9Nb2R1bGVSZWZlcmVuY2VJRCA9IChvdXRlck1vZHVsZTogc3RyaW5nLCBtb2R1bGVEZWNsYXJhdGlvbjogc3RyaW5nLCBjdXJyZW50UGF0aDogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IG1vZElzU2NvcGVkUGFja2FnZU9ubHkgPSBtb2R1bGVEZWNsYXJhdGlvbi5pbmRleE9mKFwiQFwiKSA9PT0gMCAmJiBtb2R1bGVEZWNsYXJhdGlvbi5zcGxpdChcIi9cIikubGVuZ3RoID09PSAyXG4gIGNvbnN0IG1vZElzUGFja2FnZU9ubHkgPSBtb2R1bGVEZWNsYXJhdGlvbi5pbmRleE9mKFwiQFwiKSA9PT0gLTEgJiYgbW9kdWxlRGVjbGFyYXRpb24uc3BsaXQoXCIvXCIpLmxlbmd0aCA9PT0gMVxuICBjb25zdCBpc1BhY2thZ2VSb290SW1wb3J0ID0gbW9kSXNQYWNrYWdlT25seSB8fCBtb2RJc1Njb3BlZFBhY2thZ2VPbmx5XG5cbiAgaWYgKGlzUGFja2FnZVJvb3RJbXBvcnQpIHtcbiAgICByZXR1cm4gbW9kdWxlRGVjbGFyYXRpb25cbiAgfSBlbHNlIHtcbiAgICByZXR1cm4gYCR7b3V0ZXJNb2R1bGV9LSR7bWFwUmVsYXRpdmVQYXRoKG1vZHVsZURlY2xhcmF0aW9uLCBjdXJyZW50UGF0aCl9YFxuICB9XG59XG5cbi8qKlxuICogVGFrZXMgYW4gaW5pdGlhbCBtb2R1bGUgYW5kIHRoZSBwYXRoIGZvciB0aGUgcm9vdCBvZiB0aGUgdHlwaW5ncyBhbmQgZ3JhYiBpdCBhbmQgc3RhcnQgZ3JhYmJpbmcgaXRzXG4gKiBkZXBlbmRlbmNpZXMgdGhlbiBhZGQgdGhvc2UgdGhlIHRvIHJ1bnRpbWUuXG4gKi9cbmNvbnN0IGFkZE1vZHVsZVRvUnVudGltZSA9IGFzeW5jIChtb2Q6IHN0cmluZywgcGF0aDogc3RyaW5nLCBjb25maWc6IEFUQUNvbmZpZykgPT4ge1xuICBjb25zdCBpc0Rlbm8gPSBwYXRoICYmIHBhdGguaW5kZXhPZihcImh0dHBzOi8vXCIpID09PSAwXG5cbiAgbGV0IGFjdHVhbE1vZCA9IG1vZFxuICBsZXQgYWN0dWFsUGF0aCA9IHBhdGhcblxuICBpZiAoIW1vZCkge1xuICAgIGFjdHVhbE1vZCA9IHBhdGguc3Vic3RyaW5nKDAsIHBhdGguaW5kZXhPZihcIi9cIikpXG4gICAgYWN0dWFsUGF0aCA9IHBhdGguc3Vic3RyaW5nKHBhdGguaW5kZXhPZihcIi9cIikgKyAxKVxuICB9XG5cbiAgY29uc3QgZHRzRmlsZVVSTCA9IGlzRGVubyA/IHBhdGggOiB1bnBrZ1VSTChhY3R1YWxNb2QsIGFjdHVhbFBhdGgpXG5cbiAgbGV0IGNvbnRlbnQgPSBhd2FpdCBnZXRDYWNoZWREVFNTdHJpbmcoY29uZmlnLCBkdHNGaWxlVVJMKVxuICBpZiAoIWNvbnRlbnQpIHtcbiAgICBjb25zdCBpc0Rlbm8gPSBhY3R1YWxQYXRoICYmIGFjdHVhbFBhdGguaW5kZXhPZihcImh0dHBzOi8vXCIpID09PSAwXG4gICAgY29uc3QgaW5kZXhQYXRoID0gYCR7YWN0dWFsUGF0aC5yZXBsYWNlKFwiLmQudHNcIiwgXCJcIil9L2luZGV4LmQudHNgXG5cbiAgICBjb25zdCBkdHNGaWxlVVJMID0gaXNEZW5vID8gYWN0dWFsUGF0aCA6IHVucGtnVVJMKGFjdHVhbE1vZCwgaW5kZXhQYXRoKVxuICAgIGNvbnRlbnQgPSBhd2FpdCBnZXRDYWNoZWREVFNTdHJpbmcoY29uZmlnLCBkdHNGaWxlVVJMKVxuXG4gICAgaWYgKCFjb250ZW50KSB7XG4gICAgICByZXR1cm4gZXJyb3JNc2coYENvdWxkIG5vdCBnZXQgcm9vdCBkLnRzIGZpbGUgZm9yIHRoZSBtb2R1bGUgJyR7YWN0dWFsTW9kfScgYXQgJHthY3R1YWxQYXRofWAsIHt9LCBjb25maWcpXG4gICAgfVxuXG4gICAgaWYgKCFpc0Rlbm8pIHtcbiAgICAgIGFjdHVhbFBhdGggPSBpbmRleFBhdGhcbiAgICB9XG4gIH1cblxuICAvLyBOb3cgbG9vayBhbmQgZ3JhYiBkZXBlbmRlbnQgbW9kdWxlcyB3aGVyZSB5b3UgbmVlZCB0aGVcbiAgYXdhaXQgZ2V0RGVwZW5kZW5jaWVzRm9yTW9kdWxlKGNvbnRlbnQsIGFjdHVhbE1vZCwgYWN0dWFsUGF0aCwgY29uZmlnKVxuXG4gIGlmIChpc0Rlbm8pIHtcbiAgICBjb25zdCB3cmFwcGVkID0gYGRlY2xhcmUgbW9kdWxlIFwiJHthY3R1YWxQYXRofVwiIHsgJHtjb250ZW50fSB9YFxuICAgIGNvbmZpZy5hZGRMaWJyYXJ5VG9SdW50aW1lKHdyYXBwZWQsIGFjdHVhbFBhdGgpXG4gIH0gZWxzZSB7XG4gICAgY29uZmlnLmFkZExpYnJhcnlUb1J1bnRpbWUoY29udGVudCwgYGZpbGU6Ly8vbm9kZV9tb2R1bGVzLyR7YWN0dWFsTW9kfS8ke2FjdHVhbFBhdGh9YClcbiAgfVxufVxuXG4vKipcbiAqIFRha2VzIGEgbW9kdWxlIGltcG9ydCwgdGhlbiB1c2VzIGJvdGggdGhlIGFsZ29saWEgQVBJIGFuZCB0aGUgdGhlIHBhY2thZ2UuanNvbiB0byBkZXJpdmVcbiAqIHRoZSByb290IHR5cGUgZGVmIHBhdGguXG4gKlxuICogQHBhcmFtIHtzdHJpbmd9IHBhY2thZ2VOYW1lXG4gKiBAcmV0dXJucyB7UHJvbWlzZTx7IG1vZDogc3RyaW5nLCBwYXRoOiBzdHJpbmcsIHBhY2thZ2VKU09OOiBhbnkgfT59XG4gKi9cbmNvbnN0IGdldE1vZHVsZUFuZFJvb3REZWZUeXBlUGF0aCA9IGFzeW5jIChwYWNrYWdlTmFtZTogc3RyaW5nLCBjb25maWc6IEFUQUNvbmZpZykgPT4ge1xuICBjb25zdCB1cmwgPSBtb2R1bGVKU09OVVJMKHBhY2thZ2VOYW1lKVxuXG4gIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgY29uZmlnLmZldGNoZXIodXJsKVxuICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgcmV0dXJuIGVycm9yTXNnKGBDb3VsZCBub3QgZ2V0IEFsZ29saWEgSlNPTiBmb3IgdGhlIG1vZHVsZSAnJHtwYWNrYWdlTmFtZX0nYCwgcmVzcG9uc2UsIGNvbmZpZylcbiAgfVxuXG4gIGNvbnN0IHJlc3BvbnNlSlNPTiA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKVxuICBpZiAoIXJlc3BvbnNlSlNPTikge1xuICAgIHJldHVybiBlcnJvck1zZyhgQ291bGQgdGhlIEFsZ29saWEgSlNPTiB3YXMgdW4tcGFyc2FibGUgZm9yIHRoZSBtb2R1bGUgJyR7cGFja2FnZU5hbWV9J2AsIHJlc3BvbnNlLCBjb25maWcpXG4gIH1cblxuICBpZiAoIXJlc3BvbnNlSlNPTi50eXBlcykge1xuICAgIHJldHVybiBjb25maWcubG9nZ2VyLmxvZyhgVGhlcmUgd2VyZSBubyB0eXBlcyBmb3IgJyR7cGFja2FnZU5hbWV9JyAtIHdpbGwgbm90IHRyeSBhZ2FpbiBpbiB0aGlzIHNlc3Npb25gKVxuICB9XG4gIGlmICghcmVzcG9uc2VKU09OLnR5cGVzLnRzKSB7XG4gICAgcmV0dXJuIGNvbmZpZy5sb2dnZXIubG9nKGBUaGVyZSB3ZXJlIG5vIHR5cGVzIGZvciAnJHtwYWNrYWdlTmFtZX0nIC0gd2lsbCBub3QgdHJ5IGFnYWluIGluIHRoaXMgc2Vzc2lvbmApXG4gIH1cblxuICBhY3F1aXJlZFR5cGVEZWZzW3BhY2thZ2VOYW1lXSA9IHJlc3BvbnNlSlNPTlxuXG4gIGlmIChyZXNwb25zZUpTT04udHlwZXMudHMgPT09IFwiaW5jbHVkZWRcIikge1xuICAgIGNvbnN0IG1vZFBhY2thZ2VVUkwgPSBwYWNrYWdlSlNPTlVSTChwYWNrYWdlTmFtZSlcblxuICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgY29uZmlnLmZldGNoZXIobW9kUGFja2FnZVVSTClcbiAgICBpZiAoIXJlc3BvbnNlLm9rKSB7XG4gICAgICByZXR1cm4gZXJyb3JNc2coYENvdWxkIG5vdCBnZXQgUGFja2FnZSBKU09OIGZvciB0aGUgbW9kdWxlICcke3BhY2thZ2VOYW1lfSdgLCByZXNwb25zZSwgY29uZmlnKVxuICAgIH1cblxuICAgIGNvbnN0IHJlc3BvbnNlSlNPTiA9IGF3YWl0IHJlc3BvbnNlLmpzb24oKVxuICAgIGlmICghcmVzcG9uc2VKU09OKSB7XG4gICAgICByZXR1cm4gZXJyb3JNc2coYENvdWxkIG5vdCBnZXQgUGFja2FnZSBKU09OIGZvciB0aGUgbW9kdWxlICcke3BhY2thZ2VOYW1lfSdgLCByZXNwb25zZSwgY29uZmlnKVxuICAgIH1cblxuICAgIGNvbmZpZy5hZGRMaWJyYXJ5VG9SdW50aW1lKFxuICAgICAgSlNPTi5zdHJpbmdpZnkocmVzcG9uc2VKU09OLCBudWxsLCBcIiAgXCIpLFxuICAgICAgYGZpbGU6Ly8vbm9kZV9tb2R1bGVzLyR7cGFja2FnZU5hbWV9L3BhY2thZ2UuanNvbmBcbiAgICApXG5cbiAgICAvLyBHZXQgdGhlIHBhdGggb2YgdGhlIHJvb3QgZC50cyBmaWxlXG5cbiAgICAvLyBub24taW5mZXJyZWQgcm91dGVcbiAgICBsZXQgcm9vdFR5cGVQYXRoID0gcmVzcG9uc2VKU09OLnR5cGluZyB8fCByZXNwb25zZUpTT04udHlwaW5ncyB8fCByZXNwb25zZUpTT04udHlwZXNcblxuICAgIC8vIHBhY2thZ2UgbWFpbiBpcyBjdXN0b21cbiAgICBpZiAoIXJvb3RUeXBlUGF0aCAmJiB0eXBlb2YgcmVzcG9uc2VKU09OLm1haW4gPT09IFwic3RyaW5nXCIgJiYgcmVzcG9uc2VKU09OLm1haW4uaW5kZXhPZihcIi5qc1wiKSA+IDApIHtcbiAgICAgIHJvb3RUeXBlUGF0aCA9IHJlc3BvbnNlSlNPTi5tYWluLnJlcGxhY2UoL2pzJC8sIFwiZC50c1wiKVxuICAgIH1cblxuICAgIC8vIEZpbmFsIGZhbGxiYWNrLCB0byBoYXZlIGdvdCBoZXJlIGl0IG11c3QgaGF2ZSBwYXNzZWQgaW4gYWxnb2xpYVxuICAgIGlmICghcm9vdFR5cGVQYXRoKSB7XG4gICAgICByb290VHlwZVBhdGggPSBcImluZGV4LmQudHNcIlxuICAgIH1cblxuICAgIHJldHVybiB7IG1vZDogcGFja2FnZU5hbWUsIHBhdGg6IHJvb3RUeXBlUGF0aCwgcGFja2FnZUpTT046IHJlc3BvbnNlSlNPTiB9XG4gIH0gZWxzZSBpZiAocmVzcG9uc2VKU09OLnR5cGVzLnRzID09PSBcImRlZmluaXRlbHktdHlwZWRcIikge1xuICAgIHJldHVybiB7IG1vZDogcmVzcG9uc2VKU09OLnR5cGVzLmRlZmluaXRlbHlUeXBlZCwgcGF0aDogXCJpbmRleC5kLnRzXCIsIHBhY2thZ2VKU09OOiByZXNwb25zZUpTT04gfVxuICB9IGVsc2Uge1xuICAgIHRocm93IFwiVGhpcyBzaG91bGRuJ3QgaGFwcGVuXCJcbiAgfVxufVxuXG5jb25zdCBnZXRDYWNoZWREVFNTdHJpbmcgPSBhc3luYyAoY29uZmlnOiBBVEFDb25maWcsIHVybDogc3RyaW5nKSA9PiB7XG4gIGNvbnN0IGNhY2hlZCA9IGxvY2FsU3RvcmFnZS5nZXRJdGVtKHVybClcbiAgaWYgKGNhY2hlZCkge1xuICAgIGNvbnN0IFtkYXRlU3RyaW5nLCB0ZXh0XSA9IGNhY2hlZC5zcGxpdChcIi09LV4tPS1cIilcbiAgICBjb25zdCBjYWNoZWREYXRlID0gbmV3IERhdGUoZGF0ZVN0cmluZylcbiAgICBjb25zdCBub3cgPSBuZXcgRGF0ZSgpXG5cbiAgICBjb25zdCBjYWNoZVRpbWVvdXQgPSA2MDQ4MDAwMDAgLy8gMSB3ZWVrXG4gICAgLy8gY29uc3QgY2FjaGVUaW1lb3V0ID0gNjAwMDAgLy8gMSBtaW5cblxuICAgIGlmIChub3cuZ2V0VGltZSgpIC0gY2FjaGVkRGF0ZS5nZXRUaW1lKCkgPCBjYWNoZVRpbWVvdXQpIHtcbiAgICAgIHJldHVybiBsenN0cmluZy5kZWNvbXByZXNzRnJvbVVURjE2KHRleHQpXG4gICAgfSBlbHNlIHtcbiAgICAgIGNvbmZpZy5sb2dnZXIubG9nKFwiU2tpcHBpbmcgY2FjaGUgZm9yIFwiLCB1cmwpXG4gICAgfVxuICB9XG5cbiAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBjb25maWcuZmV0Y2hlcih1cmwpXG4gIGlmICghcmVzcG9uc2Uub2spIHtcbiAgICByZXR1cm4gZXJyb3JNc2coYENvdWxkIG5vdCBnZXQgRFRTIHJlc3BvbnNlIGZvciB0aGUgbW9kdWxlIGF0ICR7dXJsfWAsIHJlc3BvbnNlLCBjb25maWcpXG4gIH1cblxuICAvLyBUT0RPOiBoYW5kbGUgY2hlY2tpbmcgZm9yIGEgcmVzb2x2ZSB0byBpbmRleC5kLnRzIHdoZW5zIHNvbWVvbmUgaW1wb3J0cyB0aGUgZm9sZGVyXG4gIGxldCBjb250ZW50ID0gYXdhaXQgcmVzcG9uc2UudGV4dCgpXG4gIGlmICghY29udGVudCkge1xuICAgIHJldHVybiBlcnJvck1zZyhgQ291bGQgbm90IGdldCB0ZXh0IGZvciBEVFMgcmVzcG9uc2UgYXQgJHt1cmx9YCwgcmVzcG9uc2UsIGNvbmZpZylcbiAgfVxuXG4gIGNvbnN0IG5vdyA9IG5ldyBEYXRlKClcbiAgY29uc3QgY2FjaGVDb250ZW50ID0gYCR7bm93LnRvSVNPU3RyaW5nKCl9LT0tXi09LSR7bHpzdHJpbmcuY29tcHJlc3NUb1VURjE2KGNvbnRlbnQpfWBcbiAgbG9jYWxTdG9yYWdlLnNldEl0ZW0odXJsLCBjYWNoZUNvbnRlbnQpXG4gIHJldHVybiBjb250ZW50XG59XG5cbmNvbnN0IGdldFJlZmVyZW5jZURlcGVuZGVuY2llcyA9IGFzeW5jIChzb3VyY2VDb2RlOiBzdHJpbmcsIG1vZDogc3RyaW5nLCBwYXRoOiBzdHJpbmcsIGNvbmZpZzogQVRBQ29uZmlnKSA9PiB7XG4gIHZhciBtYXRjaFxuICBpZiAoc291cmNlQ29kZS5pbmRleE9mKFwicmVmZXJlbmNlIHBhdGhcIikgPiAwKSB7XG4gICAgLy8gaHR0cHM6Ly9yZWdleDEwMS5jb20vci9EYU9lZ3cvMVxuICAgIGNvbnN0IHJlZmVyZW5jZVBhdGhFeHRyYWN0aW9uUGF0dGVybiA9IC88cmVmZXJlbmNlIHBhdGg9XCIoLiopXCIgXFwvPi9nbVxuICAgIHdoaWxlICgobWF0Y2ggPSByZWZlcmVuY2VQYXRoRXh0cmFjdGlvblBhdHRlcm4uZXhlYyhzb3VyY2VDb2RlKSkgIT09IG51bGwpIHtcbiAgICAgIGNvbnN0IHJlbGF0aXZlUGF0aCA9IG1hdGNoWzFdXG4gICAgICBpZiAocmVsYXRpdmVQYXRoKSB7XG4gICAgICAgIGxldCBuZXdQYXRoID0gbWFwUmVsYXRpdmVQYXRoKHJlbGF0aXZlUGF0aCwgcGF0aClcbiAgICAgICAgaWYgKG5ld1BhdGgpIHtcbiAgICAgICAgICBjb25zdCBkdHNSZWZVUkwgPSB1bnBrZ1VSTChtb2QsIG5ld1BhdGgpXG5cbiAgICAgICAgICBjb25zdCBkdHNSZWZlcmVuY2VSZXNwb25zZVRleHQgPSBhd2FpdCBnZXRDYWNoZWREVFNTdHJpbmcoY29uZmlnLCBkdHNSZWZVUkwpXG4gICAgICAgICAgaWYgKCFkdHNSZWZlcmVuY2VSZXNwb25zZVRleHQpIHtcbiAgICAgICAgICAgIHJldHVybiBlcnJvck1zZyhgQ291bGQgbm90IGdldCByb290IGQudHMgZmlsZSBmb3IgdGhlIG1vZHVsZSAnJHttb2R9JyBhdCAke3BhdGh9YCwge30sIGNvbmZpZylcbiAgICAgICAgICB9XG5cbiAgICAgICAgICBhd2FpdCBnZXREZXBlbmRlbmNpZXNGb3JNb2R1bGUoZHRzUmVmZXJlbmNlUmVzcG9uc2VUZXh0LCBtb2QsIG5ld1BhdGgsIGNvbmZpZylcbiAgICAgICAgICBjb25zdCByZXByZXNlbnRhdGlvbmFsUGF0aCA9IGBmaWxlOi8vL25vZGVfbW9kdWxlcy8ke21vZH0vJHtuZXdQYXRofWBcbiAgICAgICAgICBjb25maWcuYWRkTGlicmFyeVRvUnVudGltZShkdHNSZWZlcmVuY2VSZXNwb25zZVRleHQsIHJlcHJlc2VudGF0aW9uYWxQYXRoKVxuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9XG59XG5cbmludGVyZmFjZSBBVEFDb25maWcge1xuICBzb3VyY2VDb2RlOiBzdHJpbmdcbiAgYWRkTGlicmFyeVRvUnVudGltZTogQWRkTGliVG9SdW50aW1lRnVuY1xuICBmZXRjaGVyOiB0eXBlb2YgZmV0Y2hcbiAgbG9nZ2VyOiBTYW5kYm94Q29uZmlnW1wibG9nZ2VyXCJdXG59XG5cbi8qKlxuICogUHNldWRvIGluLWJyb3dzZXIgdHlwZSBhY3F1aXNpdGlvbiB0b29sLCB1c2VzIGFcbiAqL1xuZXhwb3J0IGNvbnN0IGRldGVjdE5ld0ltcG9ydHNUb0FjcXVpcmVUeXBlRm9yID0gYXN5bmMgKFxuICBzb3VyY2VDb2RlOiBzdHJpbmcsXG4gIHVzZXJBZGRMaWJyYXJ5VG9SdW50aW1lOiBBZGRMaWJUb1J1bnRpbWVGdW5jLFxuICBmZXRjaGVyID0gZmV0Y2gsXG4gIHBsYXlncm91bmRDb25maWc6IFNhbmRib3hDb25maWdcbikgPT4ge1xuICAvLyBXcmFwIHRoZSBydW50aW1lIGZ1bmMgd2l0aCBvdXIgb3duIHNpZGUtZWZmZWN0IGZvciB2aXNpYmlsaXR5XG4gIGNvbnN0IGFkZExpYnJhcnlUb1J1bnRpbWUgPSAoY29kZTogc3RyaW5nLCBwYXRoOiBzdHJpbmcpID0+IHtcbiAgICBnbG9iYWxpc2hPYmoudHlwZURlZmluaXRpb25zW3BhdGhdID0gY29kZVxuICAgIHVzZXJBZGRMaWJyYXJ5VG9SdW50aW1lKGNvZGUsIHBhdGgpXG4gIH1cblxuICAvLyBCYXNpY2FsbHkgc3RhcnQgdGhlIHJlY3Vyc2lvbiB3aXRoIGFuIHVuZGVmaW5lZCBtb2R1bGVcbiAgY29uc3QgY29uZmlnOiBBVEFDb25maWcgPSB7IHNvdXJjZUNvZGUsIGFkZExpYnJhcnlUb1J1bnRpbWUsIGZldGNoZXIsIGxvZ2dlcjogcGxheWdyb3VuZENvbmZpZy5sb2dnZXIgfVxuICBjb25zdCByZXN1bHRzID0gZ2V0RGVwZW5kZW5jaWVzRm9yTW9kdWxlKHNvdXJjZUNvZGUsIHVuZGVmaW5lZCwgXCJwbGF5Z3JvdW5kLnRzXCIsIGNvbmZpZylcbiAgcmV0dXJuIHJlc3VsdHNcbn1cblxuLyoqXG4gKiBMb29rcyBhdCBhIEpTL0RUUyBmaWxlIGFuZCByZWN1cnNlcyB0aHJvdWdoIGFsbCB0aGUgZGVwZW5kZW5jaWVzLlxuICogSXQgYXZvaWRzXG4gKi9cbmNvbnN0IGdldERlcGVuZGVuY2llc0Zvck1vZHVsZSA9IChcbiAgc291cmNlQ29kZTogc3RyaW5nLFxuICBtb2R1bGVOYW1lOiBzdHJpbmcgfCB1bmRlZmluZWQsXG4gIHBhdGg6IHN0cmluZyxcbiAgY29uZmlnOiBBVEFDb25maWdcbikgPT4ge1xuICAvLyBHZXQgYWxsIHRoZSBpbXBvcnQvcmVxdWlyZXMgZm9yIHRoZSBmaWxlXG4gIGNvbnN0IGZpbHRlcmVkTW9kdWxlc1RvTG9va0F0ID0gcGFyc2VGaWxlRm9yTW9kdWxlUmVmZXJlbmNlcyhzb3VyY2VDb2RlKVxuICBmaWx0ZXJlZE1vZHVsZXNUb0xvb2tBdC5mb3JFYWNoKGFzeW5jIG5hbWUgPT4ge1xuICAgIC8vIFN1cHBvcnQgZ3JhYmJpbmcgdGhlIGhhcmQtY29kZWQgbm9kZSBtb2R1bGVzIGlmIG5lZWRlZFxuICAgIGNvbnN0IG1vZHVsZVRvRG93bmxvYWQgPSBtYXBNb2R1bGVOYW1lVG9Nb2R1bGUobmFtZSlcblxuICAgIGlmICghbW9kdWxlTmFtZSAmJiBtb2R1bGVUb0Rvd25sb2FkLnN0YXJ0c1dpdGgoXCIuXCIpKSB7XG4gICAgICByZXR1cm4gY29uZmlnLmxvZ2dlci5sb2coXCJbQVRBXSBDYW4ndCByZXNvbHZlIHJlbGF0aXZlIGRlcGVuZGVuY2llcyBmcm9tIHRoZSBwbGF5Z3JvdW5kIHJvb3RcIilcbiAgICB9XG5cbiAgICBjb25zdCBtb2R1bGVJRCA9IGNvbnZlcnRUb01vZHVsZVJlZmVyZW5jZUlEKG1vZHVsZU5hbWUhLCBtb2R1bGVUb0Rvd25sb2FkLCBtb2R1bGVOYW1lISlcbiAgICBpZiAoYWNxdWlyZWRUeXBlRGVmc1ttb2R1bGVJRF0gfHwgYWNxdWlyZWRUeXBlRGVmc1ttb2R1bGVJRF0gPT09IG51bGwpIHtcbiAgICAgIHJldHVyblxuICAgIH1cblxuICAgIGNvbmZpZy5sb2dnZXIubG9nKGBbQVRBXSBMb29raW5nIGF0ICR7bW9kdWxlVG9Eb3dubG9hZH1gKVxuXG4gICAgY29uc3QgbW9kSXNTY29wZWRQYWNrYWdlT25seSA9IG1vZHVsZVRvRG93bmxvYWQuaW5kZXhPZihcIkBcIikgPT09IDAgJiYgbW9kdWxlVG9Eb3dubG9hZC5zcGxpdChcIi9cIikubGVuZ3RoID09PSAyXG4gICAgY29uc3QgbW9kSXNQYWNrYWdlT25seSA9IG1vZHVsZVRvRG93bmxvYWQuaW5kZXhPZihcIkBcIikgPT09IC0xICYmIG1vZHVsZVRvRG93bmxvYWQuc3BsaXQoXCIvXCIpLmxlbmd0aCA9PT0gMVxuICAgIGNvbnN0IGlzUGFja2FnZVJvb3RJbXBvcnQgPSBtb2RJc1BhY2thZ2VPbmx5IHx8IG1vZElzU2NvcGVkUGFja2FnZU9ubHlcbiAgICBjb25zdCBpc0Rlbm9Nb2R1bGUgPSBtb2R1bGVUb0Rvd25sb2FkLmluZGV4T2YoXCJodHRwczovL1wiKSA9PT0gMFxuXG4gICAgaWYgKGlzUGFja2FnZVJvb3RJbXBvcnQpIHtcbiAgICAgIC8vIFNvIGl0IGRvZXNuJ3QgcnVuIHR3aWNlIGZvciBhIHBhY2thZ2VcbiAgICAgIGFjcXVpcmVkVHlwZURlZnNbbW9kdWxlSURdID0gbnVsbFxuXG4gICAgICAvLyBFLmcuIGltcG9ydCBkYW5nZXIgZnJvbSBcImRhbmdlclwiXG4gICAgICBjb25zdCBwYWNrYWdlRGVmID0gYXdhaXQgZ2V0TW9kdWxlQW5kUm9vdERlZlR5cGVQYXRoKG1vZHVsZVRvRG93bmxvYWQsIGNvbmZpZylcblxuICAgICAgaWYgKHBhY2thZ2VEZWYpIHtcbiAgICAgICAgYWNxdWlyZWRUeXBlRGVmc1ttb2R1bGVJRF0gPSBwYWNrYWdlRGVmLnBhY2thZ2VKU09OXG4gICAgICAgIGF3YWl0IGFkZE1vZHVsZVRvUnVudGltZShwYWNrYWdlRGVmLm1vZCwgcGFja2FnZURlZi5wYXRoLCBjb25maWcpXG4gICAgICB9XG4gICAgfSBlbHNlIGlmIChpc0Rlbm9Nb2R1bGUpIHtcbiAgICAgIC8vIEUuZy4gaW1wb3J0IHsgc2VydmUgfSBmcm9tIFwiaHR0cHM6Ly9kZW5vLmxhbmQvc3RkQHYwLjEyL2h0dHAvc2VydmVyLnRzXCI7XG4gICAgICBhd2FpdCBhZGRNb2R1bGVUb1J1bnRpbWUobW9kdWxlVG9Eb3dubG9hZCwgbW9kdWxlVG9Eb3dubG9hZCwgY29uZmlnKVxuICAgIH0gZWxzZSB7XG4gICAgICAvLyBFLmcuIGltcG9ydCB7Q29tcG9uZW50fSBmcm9tIFwiLi9NeVRoaW5nXCJcbiAgICAgIGlmICghbW9kdWxlVG9Eb3dubG9hZCB8fCAhcGF0aCkgdGhyb3cgYE5vIG91dGVyIG1vZHVsZSBvciBwYXRoIGZvciBhIHJlbGF0aXZlIGltcG9ydDogJHttb2R1bGVUb0Rvd25sb2FkfWBcblxuICAgICAgY29uc3QgYWJzb2x1dGVQYXRoRm9yTW9kdWxlID0gbWFwUmVsYXRpdmVQYXRoKG1vZHVsZVRvRG93bmxvYWQsIHBhdGgpXG5cbiAgICAgIC8vIFNvIGl0IGRvZXNuJ3QgcnVuIHR3aWNlIGZvciBhIHBhY2thZ2VcbiAgICAgIGFjcXVpcmVkVHlwZURlZnNbbW9kdWxlSURdID0gbnVsbFxuXG4gICAgICBjb25zdCByZXNvbHZlZEZpbGVwYXRoID0gYWJzb2x1dGVQYXRoRm9yTW9kdWxlLmVuZHNXaXRoKFwiLnRzXCIpXG4gICAgICAgID8gYWJzb2x1dGVQYXRoRm9yTW9kdWxlXG4gICAgICAgIDogYWJzb2x1dGVQYXRoRm9yTW9kdWxlICsgXCIuZC50c1wiXG5cbiAgICAgIGF3YWl0IGFkZE1vZHVsZVRvUnVudGltZShtb2R1bGVOYW1lISwgcmVzb2x2ZWRGaWxlcGF0aCwgY29uZmlnKVxuICAgIH1cbiAgfSlcblxuICAvLyBBbHNvIHN1cHBvcnQgdGhlXG4gIGdldFJlZmVyZW5jZURlcGVuZGVuY2llcyhzb3VyY2VDb2RlLCBtb2R1bGVOYW1lISwgcGF0aCEsIGNvbmZpZylcbn1cbiJdfQ==