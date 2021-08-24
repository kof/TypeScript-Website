define(["require", "exports"], function (require, exports) {
    "use strict";
    Object.defineProperty(exports, "__esModule", { value: true });
    exports.activatePlugin = exports.createTabForPlugin = exports.createPluginContainer = exports.createTabBar = exports.setupSidebarToggle = exports.createSidebar = exports.sidebarHidden = exports.createDragBar = void 0;
    const createDragBar = () => {
        const sidebar = document.createElement("div");
        sidebar.className = "playground-dragbar";
        let left, right;
        const drag = (e) => {
            if (left && right) {
                // Get how far right the mouse is from the right
                const rightX = right.getBoundingClientRect().right;
                const offset = rightX - e.pageX;
                const screenClampLeft = window.innerWidth - 320;
                const clampedOffset = Math.min(Math.max(offset, 280), screenClampLeft);
                // Set the widths
                left.style.width = `calc(100% - ${clampedOffset}px)`;
                right.style.width = `${clampedOffset}px`;
                right.style.flexBasis = `${clampedOffset}px`;
                right.style.maxWidth = `${clampedOffset}px`;
                // Save the x coordinate of the
                if (window.localStorage) {
                    window.localStorage.setItem("dragbar-x", "" + clampedOffset);
                    window.localStorage.setItem("dragbar-window-width", "" + window.innerWidth);
                }
                // @ts-ignore - I know what I'm doing
                window.sandbox.editor.layout();
                // Don't allow selection
                e.stopPropagation();
                e.cancelBubble = true;
            }
        };
        sidebar.addEventListener("mousedown", e => {
            var _a;
            left = document.getElementById("editor-container");
            right = (_a = sidebar.parentElement) === null || _a === void 0 ? void 0 : _a.getElementsByClassName("playground-sidebar").item(0);
            // Handle dragging all over the screen
            document.addEventListener("mousemove", drag);
            // Remove it when you lt go anywhere
            document.addEventListener("mouseup", () => {
                document.removeEventListener("mousemove", drag);
                document.body.style.userSelect = "auto";
            });
            // Don't allow the drag to select text accidentally
            document.body.style.userSelect = "none";
            e.stopPropagation();
            e.cancelBubble = true;
        });
        return sidebar;
    };
    exports.createDragBar = createDragBar;
    const sidebarHidden = () => !!window.localStorage.getItem("sidebar-hidden");
    exports.sidebarHidden = sidebarHidden;
    const createSidebar = () => {
        const sidebar = document.createElement("div");
        sidebar.className = "playground-sidebar";
        // Start with the sidebar hidden on small screens
        const isTinyScreen = window.innerWidth < 800;
        // This is independent of the sizing below so that you keep the same sized sidebar
        if (isTinyScreen || (0, exports.sidebarHidden)()) {
            sidebar.style.display = "none";
        }
        if (window.localStorage && window.localStorage.getItem("dragbar-x")) {
            // Don't restore the x pos if the window isn't the same size
            if (window.innerWidth === Number(window.localStorage.getItem("dragbar-window-width"))) {
                // Set the dragger to the previous x pos
                let width = window.localStorage.getItem("dragbar-x");
                if (isTinyScreen) {
                    width = String(Math.min(Number(width), 280));
                }
                sidebar.style.width = `${width}px`;
                sidebar.style.flexBasis = `${width}px`;
                sidebar.style.maxWidth = `${width}px`;
                const left = document.getElementById("editor-container");
                left.style.width = `calc(100% - ${width}px)`;
            }
        }
        return sidebar;
    };
    exports.createSidebar = createSidebar;
    const toggleIconWhenOpen = "&#x21E5;";
    const toggleIconWhenClosed = "&#x21E4;";
    const setupSidebarToggle = () => {
        const toggle = document.getElementById("sidebar-toggle");
        const updateToggle = () => {
            const sidebar = window.document.querySelector(".playground-sidebar");
            const sidebarShowing = sidebar.style.display !== "none";
            toggle.innerHTML = sidebarShowing ? toggleIconWhenOpen : toggleIconWhenClosed;
            toggle.setAttribute("aria-label", sidebarShowing ? "Hide Sidebar" : "Show Sidebar");
        };
        toggle.onclick = () => {
            const sidebar = window.document.querySelector(".playground-sidebar");
            const newState = sidebar.style.display !== "none";
            if (newState) {
                localStorage.setItem("sidebar-hidden", "true");
                sidebar.style.display = "none";
            }
            else {
                localStorage.removeItem("sidebar-hidden");
                sidebar.style.display = "block";
            }
            updateToggle();
            // @ts-ignore - I know what I'm doing
            window.sandbox.editor.layout();
            return false;
        };
        // Ensure its set up at the start
        updateToggle();
    };
    exports.setupSidebarToggle = setupSidebarToggle;
    const createTabBar = () => {
        const tabBar = document.createElement("div");
        tabBar.classList.add("playground-plugin-tabview");
        tabBar.id = "playground-plugin-tabbar";
        tabBar.setAttribute("aria-label", "Tabs for plugins");
        tabBar.setAttribute("role", "tablist");
        /** Support left/right in the tab bar for accessibility */
        let tabFocus = 0;
        tabBar.addEventListener("keydown", e => {
            const tabs = document.querySelectorAll('.playground-plugin-tabview [role="tab"]');
            // Move right
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
                tabs[tabFocus].setAttribute("tabindex", "-1");
                if (e.key === "ArrowRight") {
                    tabFocus++;
                    // If we're at the end, go to the start
                    if (tabFocus >= tabs.length) {
                        tabFocus = 0;
                    }
                    // Move left
                }
                else if (e.key === "ArrowLeft") {
                    tabFocus--;
                    // If we're at the start, move to the end
                    if (tabFocus < 0) {
                        tabFocus = tabs.length - 1;
                    }
                }
                tabs[tabFocus].setAttribute("tabindex", "0");
                tabs[tabFocus].focus();
            }
        });
        return tabBar;
    };
    exports.createTabBar = createTabBar;
    const createPluginContainer = () => {
        const container = document.createElement("div");
        container.setAttribute("role", "tabpanel");
        container.classList.add("playground-plugin-container");
        return container;
    };
    exports.createPluginContainer = createPluginContainer;
    const createTabForPlugin = (plugin) => {
        const element = document.createElement("button");
        element.setAttribute("role", "tab");
        element.setAttribute("aria-selected", "false");
        element.id = "playground-plugin-tab-" + plugin.id;
        element.textContent = plugin.displayName;
        return element;
    };
    exports.createTabForPlugin = createTabForPlugin;
    const activatePlugin = (plugin, previousPlugin, sandbox, tabBar, container) => {
        let newPluginTab, oldPluginTab;
        // @ts-ignore - This works at runtime
        for (const tab of tabBar.children) {
            if (tab.id === `playground-plugin-tab-${plugin.id}`)
                newPluginTab = tab;
            if (previousPlugin && tab.id === `playground-plugin-tab-${previousPlugin.id}`)
                oldPluginTab = tab;
        }
        // @ts-ignore
        if (!newPluginTab)
            throw new Error("Could not get a tab for the plugin: " + plugin.displayName);
        // Tell the old plugin it's getting the boot
        // @ts-ignore
        if (previousPlugin && oldPluginTab) {
            if (previousPlugin.willUnmount)
                previousPlugin.willUnmount(sandbox, container);
            oldPluginTab.classList.remove("active");
            oldPluginTab.setAttribute("aria-selected", "false");
            oldPluginTab.removeAttribute("tabindex");
        }
        // Wipe the sidebar
        while (container.firstChild) {
            container.removeChild(container.firstChild);
        }
        // Start booting up the new plugin
        newPluginTab.classList.add("active");
        newPluginTab.setAttribute("aria-selected", "true");
        newPluginTab.setAttribute("tabindex", "0");
        // Tell the new plugin to start doing some work
        if (plugin.willMount)
            plugin.willMount(sandbox, container);
        if (plugin.modelChanged)
            plugin.modelChanged(sandbox, sandbox.getModel(), container);
        if (plugin.modelChangedDebounce)
            plugin.modelChangedDebounce(sandbox, sandbox.getModel(), container);
        if (plugin.didMount)
            plugin.didMount(sandbox, container);
        // Let the previous plugin do any slow work after it's all done
        if (previousPlugin && previousPlugin.didUnmount)
            previousPlugin.didUnmount(sandbox, container);
    };
    exports.activatePlugin = activatePlugin;
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiY3JlYXRlRWxlbWVudHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyIuLi8uLi8uLi8uLi9wbGF5Z3JvdW5kL3NyYy9jcmVhdGVFbGVtZW50cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7O0lBSU8sTUFBTSxhQUFhLEdBQUcsR0FBRyxFQUFFO1FBQ2hDLE1BQU0sT0FBTyxHQUFHLFFBQVEsQ0FBQyxhQUFhLENBQUMsS0FBSyxDQUFDLENBQUE7UUFDN0MsT0FBTyxDQUFDLFNBQVMsR0FBRyxvQkFBb0IsQ0FBQTtRQUV4QyxJQUFJLElBQWlCLEVBQUUsS0FBa0IsQ0FBQTtRQUN6QyxNQUFNLElBQUksR0FBRyxDQUFDLENBQWEsRUFBRSxFQUFFO1lBQzdCLElBQUksSUFBSSxJQUFJLEtBQUssRUFBRTtnQkFDakIsZ0RBQWdEO2dCQUNoRCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMscUJBQXFCLEVBQUUsQ0FBQyxLQUFLLENBQUE7Z0JBQ2xELE1BQU0sTUFBTSxHQUFHLE1BQU0sR0FBRyxDQUFDLENBQUMsS0FBSyxDQUFBO2dCQUMvQixNQUFNLGVBQWUsR0FBRyxNQUFNLENBQUMsVUFBVSxHQUFHLEdBQUcsQ0FBQTtnQkFDL0MsTUFBTSxhQUFhLEdBQUcsSUFBSSxDQUFDLEdBQUcsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDLE1BQU0sRUFBRSxHQUFHLENBQUMsRUFBRSxlQUFlLENBQUMsQ0FBQTtnQkFFdEUsaUJBQWlCO2dCQUNqQixJQUFJLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxlQUFlLGFBQWEsS0FBSyxDQUFBO2dCQUNwRCxLQUFLLENBQUMsS0FBSyxDQUFDLEtBQUssR0FBRyxHQUFHLGFBQWEsSUFBSSxDQUFBO2dCQUN4QyxLQUFLLENBQUMsS0FBSyxDQUFDLFNBQVMsR0FBRyxHQUFHLGFBQWEsSUFBSSxDQUFBO2dCQUM1QyxLQUFLLENBQUMsS0FBSyxDQUFDLFFBQVEsR0FBRyxHQUFHLGFBQWEsSUFBSSxDQUFBO2dCQUUzQywr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QUUsRUFBRSxTQUFTLENBQUMsQ0FBQTtRQUNwRyxJQUFJLE1BQU0sQ0FBQyxRQUFRO1lBQUUsTUFBTSxDQUFDLFFBQVEsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUE7UUFFeEQsK0RBQStEO1FBQy9ELElBQUksY0FBYyxJQUFJLGNBQWMsQ0FBQyxVQUFVO1lBQUUsY0FBYyxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsU0FBUyxDQUFDLENBQUE7SUFDaEcsQ0FBQyxDQUFBO0lBNUNZLFFBQUEsY0FBYyxrQkE0QzFCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUGxheWdyb3VuZFBsdWdpbiB9IGZyb20gXCIuXCJcblxudHlwZSBTYW5kYm94ID0gaW1wb3J0KFwiQHR5cGVzY3JpcHQvc2FuZGJveFwiKS5TYW5kYm94XG5cbmV4cG9ydCBjb25zdCBjcmVhdGVEcmFnQmFyID0gKCkgPT4ge1xuICBjb25zdCBzaWRlYmFyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICBzaWRlYmFyLmNsYXNzTmFtZSA9IFwicGxheWdyb3VuZC1kcmFnYmFyXCJcblxuICBsZXQgbGVmdDogSFRNTEVsZW1lbnQsIHJpZ2h0OiBIVE1MRWxlbWVudFxuICBjb25zdCBkcmFnID0gKGU6IE1vdXNlRXZlbnQpID0+IHtcbiAgICBpZiAobGVmdCAmJiByaWdodCkge1xuICAgICAgLy8gR2V0IGhvdyBmYXIgcmlnaHQgdGhlIG1vdXNlIGlzIGZyb20gdGhlIHJpZ2h0XG4gICAgICBjb25zdCByaWdodFggPSByaWdodC5nZXRCb3VuZGluZ0NsaWVudFJlY3QoKS5yaWdodFxuICAgICAgY29uc3Qgb2Zmc2V0ID0gcmlnaHRYIC0gZS5wYWdlWFxuICAgICAgY29uc3Qgc2NyZWVuQ2xhbXBMZWZ0ID0gd2luZG93LmlubmVyV2lkdGggLSAzMjBcbiAgICAgIGNvbnN0IGNsYW1wZWRPZmZzZXQgPSBNYXRoLm1pbihNYXRoLm1heChvZmZzZXQsIDI4MCksIHNjcmVlbkNsYW1wTGVmdClcblxuICAgICAgLy8gU2V0IHRoZSB3aWR0aHNcbiAgICAgIGxlZnQuc3R5bGUud2lkdGggPSBgY2FsYygxMDAlIC0gJHtjbGFtcGVkT2Zmc2V0fXB4KWBcbiAgICAgIHJpZ2h0LnN0eWxlLndpZHRoID0gYCR7Y2xhbXBlZE9mZnNldH1weGBcbiAgICAgIHJpZ2h0LnN0eWxlLmZsZXhCYXNpcyA9IGAke2NsYW1wZWRPZmZzZXR9cHhgXG4gICAgICByaWdodC5zdHlsZS5tYXhXaWR0aCA9IGAke2NsYW1wZWRPZmZzZXR9cHhgXG5cbiAgICAgIC8vIFNhdmUgdGhlIHggY29vcmRpbmF0ZSBvZiB0aGVcbiAgICAgIGlmICh3aW5kb3cubG9jYWxTdG9yYWdlKSB7XG4gICAgICAgIHdpbmRvdy5sb2NhbFN0b3JhZ2Uuc2V0SXRlbShcImRyYWdiYXIteFwiLCBcIlwiICsgY2xhbXBlZE9mZnNldClcbiAgICAgICAgd2luZG93LmxvY2FsU3RvcmFnZS5zZXRJdGVtKFwiZHJhZ2Jhci13aW5kb3ctd2lkdGhcIiwgXCJcIiArIHdpbmRvdy5pbm5lcldpZHRoKVxuICAgICAgfVxuXG4gICAgICAvLyBAdHMtaWdub3JlIC0gSSBrbm93IHdoYXQgSSdtIGRvaW5nXG4gICAgICB3aW5kb3cuc2FuZGJveC5lZGl0b3IubGF5b3V0KClcblxuICAgICAgLy8gRG9uJ3QgYWxsb3cgc2VsZWN0aW9uXG4gICAgICBlLnN0b3BQcm9wYWdhdGlvbigpXG4gICAgICBlLmNhbmNlbEJ1YmJsZSA9IHRydWVcbiAgICB9XG4gIH1cblxuICBzaWRlYmFyLmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZWRvd25cIiwgZSA9PiB7XG4gICAgbGVmdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZWRpdG9yLWNvbnRhaW5lclwiKSFcbiAgICByaWdodCA9IHNpZGViYXIucGFyZW50RWxlbWVudD8uZ2V0RWxlbWVudHNCeUNsYXNzTmFtZShcInBsYXlncm91bmQtc2lkZWJhclwiKS5pdGVtKDApISBhcyBhbnlcbiAgICAvLyBIYW5kbGUgZHJhZ2dpbmcgYWxsIG92ZXIgdGhlIHNjcmVlblxuICAgIGRvY3VtZW50LmFkZEV2ZW50TGlzdGVuZXIoXCJtb3VzZW1vdmVcIiwgZHJhZylcbiAgICAvLyBSZW1vdmUgaXQgd2hlbiB5b3UgbHQgZ28gYW55d2hlcmVcbiAgICBkb2N1bWVudC5hZGRFdmVudExpc3RlbmVyKFwibW91c2V1cFwiLCAoKSA9PiB7XG4gICAgICBkb2N1bWVudC5yZW1vdmVFdmVudExpc3RlbmVyKFwibW91c2Vtb3ZlXCIsIGRyYWcpXG4gICAgICBkb2N1bWVudC5ib2R5LnN0eWxlLnVzZXJTZWxlY3QgPSBcImF1dG9cIlxuICAgIH0pXG5cbiAgICAvLyBEb24ndCBhbGxvdyB0aGUgZHJhZyB0byBzZWxlY3QgdGV4dCBhY2NpZGVudGFsbHlcbiAgICBkb2N1bWVudC5ib2R5LnN0eWxlLnVzZXJTZWxlY3QgPSBcIm5vbmVcIlxuICAgIGUuc3RvcFByb3BhZ2F0aW9uKClcbiAgICBlLmNhbmNlbEJ1YmJsZSA9IHRydWVcbiAgfSlcblxuICByZXR1cm4gc2lkZWJhclxufVxuXG5leHBvcnQgY29uc3Qgc2lkZWJhckhpZGRlbiA9ICgpID0+ICEhd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKFwic2lkZWJhci1oaWRkZW5cIilcblxuZXhwb3J0IGNvbnN0IGNyZWF0ZVNpZGViYXIgPSAoKSA9PiB7XG4gIGNvbnN0IHNpZGViYXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG4gIHNpZGViYXIuY2xhc3NOYW1lID0gXCJwbGF5Z3JvdW5kLXNpZGViYXJcIlxuXG4gIC8vIFN0YXJ0IHdpdGggdGhlIHNpZGViYXIgaGlkZGVuIG9uIHNtYWxsIHNjcmVlbnNcbiAgY29uc3QgaXNUaW55U2NyZWVuID0gd2luZG93LmlubmVyV2lkdGggPCA4MDBcblxuICAvLyBUaGlzIGlzIGluZGVwZW5kZW50IG9mIHRoZSBzaXppbmcgYmVsb3cgc28gdGhhdCB5b3Uga2VlcCB0aGUgc2FtZSBzaXplZCBzaWRlYmFyXG4gIGlmIChpc1RpbnlTY3JlZW4gfHwgc2lkZWJhckhpZGRlbigpKSB7XG4gICAgc2lkZWJhci5zdHlsZS5kaXNwbGF5ID0gXCJub25lXCJcbiAgfVxuXG4gIGlmICh3aW5kb3cubG9jYWxTdG9yYWdlICYmIHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImRyYWdiYXIteFwiKSkge1xuICAgIC8vIERvbid0IHJlc3RvcmUgdGhlIHggcG9zIGlmIHRoZSB3aW5kb3cgaXNuJ3QgdGhlIHNhbWUgc2l6ZVxuICAgIGlmICh3aW5kb3cuaW5uZXJXaWR0aCA9PT0gTnVtYmVyKHdpbmRvdy5sb2NhbFN0b3JhZ2UuZ2V0SXRlbShcImRyYWdiYXItd2luZG93LXdpZHRoXCIpKSkge1xuICAgICAgLy8gU2V0IHRoZSBkcmFnZ2VyIHRvIHRoZSBwcmV2aW91cyB4IHBvc1xuICAgICAgbGV0IHdpZHRoID0gd2luZG93LmxvY2FsU3RvcmFnZS5nZXRJdGVtKFwiZHJhZ2Jhci14XCIpXG5cbiAgICAgIGlmIChpc1RpbnlTY3JlZW4pIHtcbiAgICAgICAgd2lkdGggPSBTdHJpbmcoTWF0aC5taW4oTnVtYmVyKHdpZHRoKSwgMjgwKSlcbiAgICAgIH1cblxuICAgICAgc2lkZWJhci5zdHlsZS53aWR0aCA9IGAke3dpZHRofXB4YFxuICAgICAgc2lkZWJhci5zdHlsZS5mbGV4QmFzaXMgPSBgJHt3aWR0aH1weGBcbiAgICAgIHNpZGViYXIuc3R5bGUubWF4V2lkdGggPSBgJHt3aWR0aH1weGBcblxuICAgICAgY29uc3QgbGVmdCA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKFwiZWRpdG9yLWNvbnRhaW5lclwiKSFcbiAgICAgIGxlZnQuc3R5bGUud2lkdGggPSBgY2FsYygxMDAlIC0gJHt3aWR0aH1weClgXG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHNpZGViYXJcbn1cblxuY29uc3QgdG9nZ2xlSWNvbldoZW5PcGVuID0gXCImI3gyMUU1O1wiXG5jb25zdCB0b2dnbGVJY29uV2hlbkNsb3NlZCA9IFwiJiN4MjFFNDtcIlxuXG5leHBvcnQgY29uc3Qgc2V0dXBTaWRlYmFyVG9nZ2xlID0gKCkgPT4ge1xuICBjb25zdCB0b2dnbGUgPSBkb2N1bWVudC5nZXRFbGVtZW50QnlJZChcInNpZGViYXItdG9nZ2xlXCIpIVxuXG4gIGNvbnN0IHVwZGF0ZVRvZ2dsZSA9ICgpID0+IHtcbiAgICBjb25zdCBzaWRlYmFyID0gd2luZG93LmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIucGxheWdyb3VuZC1zaWRlYmFyXCIpIGFzIEhUTUxEaXZFbGVtZW50XG4gICAgY29uc3Qgc2lkZWJhclNob3dpbmcgPSBzaWRlYmFyLnN0eWxlLmRpc3BsYXkgIT09IFwibm9uZVwiXG5cbiAgICB0b2dnbGUuaW5uZXJIVE1MID0gc2lkZWJhclNob3dpbmcgPyB0b2dnbGVJY29uV2hlbk9wZW4gOiB0b2dnbGVJY29uV2hlbkNsb3NlZFxuICAgIHRvZ2dsZS5zZXRBdHRyaWJ1dGUoXCJhcmlhLWxhYmVsXCIsIHNpZGViYXJTaG93aW5nID8gXCJIaWRlIFNpZGViYXJcIiA6IFwiU2hvdyBTaWRlYmFyXCIpXG4gIH1cblxuICB0b2dnbGUub25jbGljayA9ICgpID0+IHtcbiAgICBjb25zdCBzaWRlYmFyID0gd2luZG93LmRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoXCIucGxheWdyb3VuZC1zaWRlYmFyXCIpIGFzIEhUTUxEaXZFbGVtZW50XG4gICAgY29uc3QgbmV3U3RhdGUgPSBzaWRlYmFyLnN0eWxlLmRpc3BsYXkgIT09IFwibm9uZVwiXG5cbiAgICBpZiAobmV3U3RhdGUpIHtcbiAgICAgIGxvY2FsU3RvcmFnZS5zZXRJdGVtKFwic2lkZWJhci1oaWRkZW5cIiwgXCJ0cnVlXCIpXG4gICAgICBzaWRlYmFyLnN0eWxlLmRpc3BsYXkgPSBcIm5vbmVcIlxuICAgIH0gZWxzZSB7XG4gICAgICBsb2NhbFN0b3JhZ2UucmVtb3ZlSXRlbShcInNpZGViYXItaGlkZGVuXCIpXG4gICAgICBzaWRlYmFyLnN0eWxlLmRpc3BsYXkgPSBcImJsb2NrXCJcbiAgICB9XG5cbiAgICB1cGRhdGVUb2dnbGUoKVxuXG4gICAgLy8gQHRzLWlnbm9yZSAtIEkga25vdyB3aGF0IEknbSBkb2luZ1xuICAgIHdpbmRvdy5zYW5kYm94LmVkaXRvci5sYXlvdXQoKVxuXG4gICAgcmV0dXJuIGZhbHNlXG4gIH1cblxuICAvLyBFbnN1cmUgaXRzIHNldCB1cCBhdCB0aGUgc3RhcnRcbiAgdXBkYXRlVG9nZ2xlKClcbn1cblxuZXhwb3J0IGNvbnN0IGNyZWF0ZVRhYkJhciA9ICgpID0+IHtcbiAgY29uc3QgdGFiQmFyID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImRpdlwiKVxuICB0YWJCYXIuY2xhc3NMaXN0LmFkZChcInBsYXlncm91bmQtcGx1Z2luLXRhYnZpZXdcIilcbiAgdGFiQmFyLmlkID0gXCJwbGF5Z3JvdW5kLXBsdWdpbi10YWJiYXJcIlxuICB0YWJCYXIuc2V0QXR0cmlidXRlKFwiYXJpYS1sYWJlbFwiLCBcIlRhYnMgZm9yIHBsdWdpbnNcIilcbiAgdGFiQmFyLnNldEF0dHJpYnV0ZShcInJvbGVcIiwgXCJ0YWJsaXN0XCIpXG5cbiAgLyoqIFN1cHBvcnQgbGVmdC9yaWdodCBpbiB0aGUgdGFiIGJhciBmb3IgYWNjZXNzaWJpbGl0eSAqL1xuICBsZXQgdGFiRm9jdXMgPSAwXG4gIHRhYkJhci5hZGRFdmVudExpc3RlbmVyKFwia2V5ZG93blwiLCBlID0+IHtcbiAgICBjb25zdCB0YWJzID0gZG9jdW1lbnQucXVlcnlTZWxlY3RvckFsbCgnLnBsYXlncm91bmQtcGx1Z2luLXRhYnZpZXcgW3JvbGU9XCJ0YWJcIl0nKVxuICAgIC8vIE1vdmUgcmlnaHRcbiAgICBpZiAoZS5rZXkgPT09IFwiQXJyb3dSaWdodFwiIHx8IGUua2V5ID09PSBcIkFycm93TGVmdFwiKSB7XG4gICAgICB0YWJzW3RhYkZvY3VzXS5zZXRBdHRyaWJ1dGUoXCJ0YWJpbmRleFwiLCBcIi0xXCIpXG4gICAgICBpZiAoZS5rZXkgPT09IFwiQXJyb3dSaWdodFwiKSB7XG4gICAgICAgIHRhYkZvY3VzKytcbiAgICAgICAgLy8gSWYgd2UncmUgYXQgdGhlIGVuZCwgZ28gdG8gdGhlIHN0YXJ0XG4gICAgICAgIGlmICh0YWJGb2N1cyA+PSB0YWJzLmxlbmd0aCkge1xuICAgICAgICAgIHRhYkZvY3VzID0gMFxuICAgICAgICB9XG4gICAgICAgIC8vIE1vdmUgbGVmdFxuICAgICAgfSBlbHNlIGlmIChlLmtleSA9PT0gXCJBcnJvd0xlZnRcIikge1xuICAgICAgICB0YWJGb2N1cy0tXG4gICAgICAgIC8vIElmIHdlJ3JlIGF0IHRoZSBzdGFydCwgbW92ZSB0byB0aGUgZW5kXG4gICAgICAgIGlmICh0YWJGb2N1cyA8IDApIHtcbiAgICAgICAgICB0YWJGb2N1cyA9IHRhYnMubGVuZ3RoIC0gMVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHRhYnNbdGFiRm9jdXNdLnNldEF0dHJpYnV0ZShcInRhYmluZGV4XCIsIFwiMFwiKVxuICAgICAgOyh0YWJzW3RhYkZvY3VzXSBhcyBhbnkpLmZvY3VzKClcbiAgICB9XG4gIH0pXG5cbiAgcmV0dXJuIHRhYkJhclxufVxuXG5leHBvcnQgY29uc3QgY3JlYXRlUGx1Z2luQ29udGFpbmVyID0gKCkgPT4ge1xuICBjb25zdCBjb250YWluZXIgPSBkb2N1bWVudC5jcmVhdGVFbGVtZW50KFwiZGl2XCIpXG4gIGNvbnRhaW5lci5zZXRBdHRyaWJ1dGUoXCJyb2xlXCIsIFwidGFicGFuZWxcIilcbiAgY29udGFpbmVyLmNsYXNzTGlzdC5hZGQoXCJwbGF5Z3JvdW5kLXBsdWdpbi1jb250YWluZXJcIilcbiAgcmV0dXJuIGNvbnRhaW5lclxufVxuXG5leHBvcnQgY29uc3QgY3JlYXRlVGFiRm9yUGx1Z2luID0gKHBsdWdpbjogUGxheWdyb3VuZFBsdWdpbikgPT4ge1xuICBjb25zdCBlbGVtZW50ID0gZG9jdW1lbnQuY3JlYXRlRWxlbWVudChcImJ1dHRvblwiKVxuICBlbGVtZW50LnNldEF0dHJpYnV0ZShcInJvbGVcIiwgXCJ0YWJcIilcbiAgZWxlbWVudC5zZXRBdHRyaWJ1dGUoXCJhcmlhLXNlbGVjdGVkXCIsIFwiZmFsc2VcIilcbiAgZWxlbWVudC5pZCA9IFwicGxheWdyb3VuZC1wbHVnaW4tdGFiLVwiICsgcGx1Z2luLmlkXG4gIGVsZW1lbnQudGV4dENvbnRlbnQgPSBwbHVnaW4uZGlzcGxheU5hbWVcbiAgcmV0dXJuIGVsZW1lbnRcbn1cblxuZXhwb3J0IGNvbnN0IGFjdGl2YXRlUGx1Z2luID0gKFxuICBwbHVnaW46IFBsYXlncm91bmRQbHVnaW4sXG4gIHByZXZpb3VzUGx1Z2luOiBQbGF5Z3JvdW5kUGx1Z2luIHwgdW5kZWZpbmVkLFxuICBzYW5kYm94OiBTYW5kYm94LFxuICB0YWJCYXI6IEhUTUxEaXZFbGVtZW50LFxuICBjb250YWluZXI6IEhUTUxEaXZFbGVtZW50XG4pID0+IHtcbiAgbGV0IG5ld1BsdWdpblRhYjogRWxlbWVudCwgb2xkUGx1Z2luVGFiOiBFbGVtZW50XG4gIC8vIEB0cy1pZ25vcmUgLSBUaGlzIHdvcmtzIGF0IHJ1bnRpbWVcbiAgZm9yIChjb25zdCB0YWIgb2YgdGFiQmFyLmNoaWxkcmVuKSB7XG4gICAgaWYgKHRhYi5pZCA9PT0gYHBsYXlncm91bmQtcGx1Z2luLXRhYi0ke3BsdWdpbi5pZH1gKSBuZXdQbHVnaW5UYWIgPSB0YWJcbiAgICBpZiAocHJldmlvdXNQbHVnaW4gJiYgdGFiLmlkID09PSBgcGxheWdyb3VuZC1wbHVnaW4tdGFiLSR7cHJldmlvdXNQbHVnaW4uaWR9YCkgb2xkUGx1Z2luVGFiID0gdGFiXG4gIH1cblxuICAvLyBAdHMtaWdub3JlXG4gIGlmICghbmV3UGx1Z2luVGFiKSB0aHJvdyBuZXcgRXJyb3IoXCJDb3VsZCBub3QgZ2V0IGEgdGFiIGZvciB0aGUgcGx1Z2luOiBcIiArIHBsdWdpbi5kaXNwbGF5TmFtZSlcblxuICAvLyBUZWxsIHRoZSBvbGQgcGx1Z2luIGl0J3MgZ2V0dGluZyB0aGUgYm9vdFxuICAvLyBAdHMtaWdub3JlXG4gIGlmIChwcmV2aW91c1BsdWdpbiAmJiBvbGRQbHVnaW5UYWIpIHtcbiAgICBpZiAocHJldmlvdXNQbHVnaW4ud2lsbFVubW91bnQpIHByZXZpb3VzUGx1Z2luLndpbGxVbm1vdW50KHNhbmRib3gsIGNvbnRhaW5lcilcbiAgICBvbGRQbHVnaW5UYWIuY2xhc3NMaXN0LnJlbW92ZShcImFjdGl2ZVwiKVxuICAgIG9sZFBsdWdpblRhYi5zZXRBdHRyaWJ1dGUoXCJhcmlhLXNlbGVjdGVkXCIsIFwiZmFsc2VcIilcbiAgICBvbGRQbHVnaW5UYWIucmVtb3ZlQXR0cmlidXRlKFwidGFiaW5kZXhcIilcbiAgfVxuXG4gIC8vIFdpcGUgdGhlIHNpZGViYXJcbiAgd2hpbGUgKGNvbnRhaW5lci5maXJzdENoaWxkKSB7XG4gICAgY29udGFpbmVyLnJlbW92ZUNoaWxkKGNvbnRhaW5lci5maXJzdENoaWxkKVxuICB9XG5cbiAgLy8gU3RhcnQgYm9vdGluZyB1cCB0aGUgbmV3IHBsdWdpblxuICBuZXdQbHVnaW5UYWIuY2xhc3NMaXN0LmFkZChcImFjdGl2ZVwiKVxuICBuZXdQbHVnaW5UYWIuc2V0QXR0cmlidXRlKFwiYXJpYS1zZWxlY3RlZFwiLCBcInRydWVcIilcbiAgbmV3UGx1Z2luVGFiLnNldEF0dHJpYnV0ZShcInRhYmluZGV4XCIsIFwiMFwiKVxuXG4gIC8vIFRlbGwgdGhlIG5ldyBwbHVnaW4gdG8gc3RhcnQgZG9pbmcgc29tZSB3b3JrXG4gIGlmIChwbHVnaW4ud2lsbE1vdW50KSBwbHVnaW4ud2lsbE1vdW50KHNhbmRib3gsIGNvbnRhaW5lcilcbiAgaWYgKHBsdWdpbi5tb2RlbENoYW5nZWQpIHBsdWdpbi5tb2RlbENoYW5nZWQoc2FuZGJveCwgc2FuZGJveC5nZXRNb2RlbCgpLCBjb250YWluZXIpXG4gIGlmIChwbHVnaW4ubW9kZWxDaGFuZ2VkRGVib3VuY2UpIHBsdWdpbi5tb2RlbENoYW5nZWREZWJvdW5jZShzYW5kYm94LCBzYW5kYm94LmdldE1vZGVsKCksIGNvbnRhaW5lcilcbiAgaWYgKHBsdWdpbi5kaWRNb3VudCkgcGx1Z2luLmRpZE1vdW50KHNhbmRib3gsIGNvbnRhaW5lcilcblxuICAvLyBMZXQgdGhlIHByZXZpb3VzIHBsdWdpbiBkbyBhbnkgc2xvdyB3b3JrIGFmdGVyIGl0J3MgYWxsIGRvbmVcbiAgaWYgKHByZXZpb3VzUGx1Z2luICYmIHByZXZpb3VzUGx1Z2luLmRpZFVubW91bnQpIHByZXZpb3VzUGx1Z2luLmRpZFVubW91bnQoc2FuZGJveCwgY29udGFpbmVyKVxufVxuIl19